from celery import shared_task, group, chord
from langchain_core.messages import HumanMessage
from langchain_core.prompts import PromptTemplate
from langgraph.graph import START, END, StateGraph
from graph.agents.composer import composer_node
from graph.agents.enhancer import enhancer_node
from graph.agents.reviewer import reviewer_node
from graph.agents.supervisor import supervisor_node
from graph.main import supervisor_routing
from graph.states import MessagesState
from graph.utils import CsvChunker


@shared_task
def process_single_chunk_task(chunk, chunk_index, schema_dict):
    """Process a single chunk of data and return enhanced results."""
    try:
        # Compile graph inside task for thread safety
        graph = StateGraph(MessagesState)
        graph.add_node("supervisor", supervisor_node)
        graph.add_node("composer", composer_node)
        graph.add_node("enhancer", enhancer_node)
        graph.add_node("reviewer", reviewer_node)

        graph.add_edge(START, "supervisor")
        graph.add_conditional_edges("supervisor", supervisor_routing, {
            "composer": "composer",
            "enhancer": "enhancer"
        })

        graph.add_edge("enhancer", "reviewer")
        graph.add_edge("reviewer", "supervisor")
        graph.add_edge("composer", END)

        compiled_graph = graph.compile()

        prompt_template = PromptTemplate.from_template("""You are an expert Data Supervisor and Enrichment Agent. Your primary function is to ingest raw data of any type and transform it into a pristine, fully populated output based strictly on a provided Target Schema.

        ## CORE OBJECTIVES

        1.  **Data Hygiene & Standardization:**
            - Analyze the input data for grammatical errors, typo inconsistencies, and formatting issues.
            - Standardize values (e.g., casing, date formats, category names) to ensure uniformity.
            - Repair structural inconsistencies within the existing data.

        2.  **Gap Analysis & Enrichment (CRITICAL):**
            - Compare the `Input Data` against the `Target Output Schema`.
            - **Missing Values:** If a field exists in the input but is empty/null, use context or available tools to fill it.
            - **New Fields:** If the `Target Output Schema` dictates fields that do *not* exist in the input, you are authorized and required to perform research, inference, or calculation to generate this data.

        ## OPERATIONAL LOGIC

        **Step 1: Parse Schema**
        Identify every field required in the Target Output Schema and its expected data type.

        **Step 2: Clean Existing**
        Fix grammar, capitalization (e.g., Title Case for names), and unified terminology (e.g., mapping 'ML', 'A.I.' -> 'AI') in the provided data.

        **Step 3: Bridge the Gap**
        For every field in the Target Schema:
        - If present in Input: Clean and map it.
        - If present but empty: Research/Infer the missing value.
        - If missing from Input entirely: Research/Generate the data point from scratch to satisfy the schema.

        ## CONSTRAINTS & GUARDRAILS

        - **Strict Adherence to Output Format:**
            - **No Unsolicited Additions:** Do NOT add new columns or parameters if they are not specified in the output format.
            - **Preservation of Data:** Do NOT delete existing columns or parameters if they are not specified in the output format (preserve original data structure unless the schema implies a strict transformation that excludes them).

        - **Data Integrity:**
            - When filling missing data (enrichment), prioritize high-confidence, real-world data.
            - If data cannot be found after a search, return `null` rather than hallucinating false information.

                Here is the raw data:{chunk}
                
                Output format:
                {output_format}
                """).format(chunk=chunk, output_format=schema_dict)
        
        result = compiled_graph.invoke({
            "messages": [
                HumanMessage(prompt_template),
            ],  
            "review_count": 0,
            "schema": schema_dict,
        })
        
        enhanced_data_list = result.get("composed_data", [])
        
        if not enhanced_data_list:
            return {"chunk_index": chunk_index, "success": False, "data": None, "error": "No data returned from graph"}
        
        if isinstance(enhanced_data_list, list):
            enhanced_data_list = [
                item.model_dump() if hasattr(item, 'model_dump') 
                else dict(item) if hasattr(item, '__dict__') 
                else item 
                for item in enhanced_data_list
            ]
            return {"chunk_index": chunk_index, "success": True, "data": enhanced_data_list, "error": None}
        else:
            return {"chunk_index": chunk_index, "success": False, "data": None, "error": "Enhanced data is not a list"}
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        return {"chunk_index": chunk_index, "success": False, "data": None, "error": error_msg}


@shared_task
def process_enhancement_coordinator(enhanced_data_id, original_data_list, schema_dict):
    """
    Coordinator task that chunks data and dispatches parallel chunk processing tasks.
    Uses Celery group and chord pattern to process chunks in parallel and collect results.
    """
    try:
        chunked_data = CsvChunker(original_data_list, 10).chunk()
        total_chunks = len(chunked_data)
        
        if total_chunks == 0:
            from models.enhanced_data import EnhancedData
            enhanced_data_obj = EnhancedData.objects.get(id=enhanced_data_id)
            enhanced_data_obj.status = "failed"
            enhanced_data_obj.save()
            return
        
        chunk_tasks = group(
            process_single_chunk_task.s(chunk, chunk_index, schema_dict)
            for chunk_index, chunk in enumerate(chunked_data)
        )
        
        chord(chunk_tasks)(collect_chunk_results.s(enhanced_data_id, total_chunks))
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            from models.enhanced_data import EnhancedData
            enhanced_data_obj = EnhancedData.objects.get(id=enhanced_data_id)
            enhanced_data_obj.status = "failed"
            enhanced_data_obj.save()
        except:
            pass


@shared_task
def collect_chunk_results(chunk_results, enhanced_data_id, total_chunks):
    """
    Collector task that combines results from all chunk processing tasks.
    Implements Strategy C: Best effort - saves all successful chunks, only fails if ALL chunks fail.
    
    Args:
        chunk_results: List of results from all chunk tasks (passed by Celery chord)
        enhanced_data_id: ID of the EnhancedData object to update
        total_chunks: Total number of chunks that were processed
    """
    try:
        from models.enhanced_data import EnhancedData
        
        enhanced_data_obj = EnhancedData.objects.get(id=enhanced_data_id)
        
        sorted_results = sorted(
            chunk_results,
            key=lambda x: x.get("chunk_index", 0) if isinstance(x, dict) else 0
        )
        
        combined_enhanced_data = []
        successful_chunks = 0
        failed_chunks = 0
        
        for result in sorted_results:
            if result and isinstance(result, dict):
                if result.get("success") and result.get("data"):
                    combined_enhanced_data.extend(result["data"])
                    successful_chunks += 1
                else:
                    failed_chunks += 1
                    error = result.get("error", "Unknown error")
                    chunk_idx = result.get("chunk_index", "unknown")
                    print(f"Chunk {chunk_idx} failed: {error}")
        
        if not combined_enhanced_data:
            enhanced_data_obj.status = "failed"
            enhanced_data_obj.save()
            print(f"Enhancement failed: All {total_chunks} chunks failed")
            return
        
        enhanced_data_obj.data = combined_enhanced_data
        enhanced_data_obj.status = "complete"
        enhanced_data_obj.save()
        
        print(f"Enhancement complete: {successful_chunks}/{total_chunks} chunks successful, {failed_chunks} failed")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            from models.enhanced_data import EnhancedData
            enhanced_data_obj = EnhancedData.objects.get(id=enhanced_data_id)
            enhanced_data_obj.status = "failed"
            enhanced_data_obj.save()
        except:
            pass
