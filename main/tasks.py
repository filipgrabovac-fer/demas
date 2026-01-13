from celery import shared_task, group, chord
from langchain_core.messages import HumanMessage
from langchain_core.prompts import PromptTemplate
from langgraph.graph import START, END, StateGraph
from graph.agents.composer import ComposerResponse, composer_node
from graph.agents.enhancer import enhancer_node
from graph.agents.reviewer import reviewer_node
from graph.agents.supervisor import supervisor_node
from graph.main import supervisor_routing
from graph.states import MessagesState
from graph.utils import CsvChunker


@shared_task
def process_single_chunk_task(chunk, chunk_index, schema_dict, enhanced_data_id):
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

        prompt_template = PromptTemplate.from_template("""I have a raw dataset of tech companies that needs cleaning and enrichment.

                1. Data Cleaning:
                Fix inconsistent capitalization in the company_name column (use Title Case, e.g., 'OpenAI').
                Standardize the industry column: map terms like 'Artificial Intelligence' or 'ML' to a single category: 'AI'.

                2. Enrichment:
                Search for and fill in any missing values in the ceo column using current real-world data. 

                ## IMPORTANT
                - don't add new columns or parameters if not specified in the output format
                - don't delete existing columns or parameters if not specified in the output format

                Here is the raw data:{chunk}
                
                Output format:
                {output_format}
                """).format(chunk=chunk, output_format=ComposerResponse.model_json_schema())
        
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
        # Chunk the data (10 records per chunk)
        chunked_data = CsvChunker(original_data_list, 10).chunk()
        total_chunks = len(chunked_data)
        
        if total_chunks == 0:
            # No data to process
            from models.enhanced_data import EnhancedData
            enhanced_data_obj = EnhancedData.objects.get(id=enhanced_data_id)
            enhanced_data_obj.status = "failed"
            enhanced_data_obj.save()
            return
        
        # Create a group of chunk processing tasks
        # Each task processes one chunk in parallel
        chunk_tasks = group(
            process_single_chunk_task.s(chunk, chunk_index, schema_dict, enhanced_data_id)
            for chunk_index, chunk in enumerate(chunked_data)
        )
        
        # Use chord to run collector after all chunks complete
        # The collector will receive results from all chunk tasks
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
        
        # Sort results by chunk_index to maintain original data order
        # Results from chord may not be in order (they complete at different times)
        sorted_results = sorted(
            chunk_results,
            key=lambda x: x.get("chunk_index", 0) if isinstance(x, dict) else 0
        )
        
        # Combine successful chunks
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
        
        # Strategy C: Only fail if ALL chunks failed
        if not combined_enhanced_data:
            enhanced_data_obj.status = "failed"
            enhanced_data_obj.save()
            print(f"Enhancement failed: All {total_chunks} chunks failed")
            return
        
        # Save combined results
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
