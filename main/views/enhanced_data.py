import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from langchain_core.messages import HumanMessage
from langchain_core.prompts import PromptTemplate
from langgraph.graph import START, END, StateGraph
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import status
from graph.agents.composer import ComposerResponse, composer_node
from graph.agents.enhancer import enhancer_node
from graph.agents.reviewer import reviewer_node
from graph.agents.supervisor import supervisor_node
from graph.main import supervisor_routing
from graph.output_formats import build_dynamic_model
from graph.states import MessagesState
from graph.utils import CsvChunker
from main.serializers import EnhancedDataEnhanceRequestSerializer, EnhancedDataSerializer
from models.enhanced_data import EnhancedData

from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiExample

from models.original_data import OriginalData

class EnhancedDataView(viewsets.ModelViewSet):
    queryset = EnhancedData.objects.all()
    serializer_class = EnhancedDataSerializer
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            error_msg = str(e)
            if "status" in error_msg.lower() or "column" in error_msg.lower():
                return Response({
                    "error": "Database migration required. Please run: python manage.py makemigrations && python manage.py migrate"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            import traceback
            traceback.print_exc()
            return Response({"error": error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _process_single_chunk(self, chunk, chunk_index, schema_dict, compiled_graph, enhanced_data_id):
        """Process a single chunk of data and return enhanced results."""
        try:
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

    @extend_schema(
        request=EnhancedDataEnhanceRequestSerializer,
        examples=[
            OpenApiExample(
                "Example Request",
                value={
                    "original_data_id": 1,
                    "schema": {
                        "id": "int",
                        "company_name": "str",
                        "industry": "str",
                        "ceo": "str",
                        "founded_year": "int",
                        "age": "int",
                        "ceo_net_worth": "int"
                    }
                },
                request_only=True
            )
        ]
    )
    def _process_enhancement(self, enhanced_data_id, original_data_list, schema_dict):
        try:
            enhanced_data_obj = EnhancedData.objects.get(id=enhanced_data_id)
            
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

            chunked_data = CsvChunker(original_data_list, 10).chunk()
            total_chunks = len(chunked_data)

            chunk_results = [None] * total_chunks
            successful_chunks = 0
            failed_chunks = 0

            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_chunk = {
                    executor.submit(
                        self._process_single_chunk,
                        chunk,
                        chunk_index,
                        schema_dict,
                        compiled_graph,
                        enhanced_data_id
                    ): chunk_index
                    for chunk_index, chunk in enumerate(chunked_data)
                }

                for future in as_completed(future_to_chunk):
                    chunk_index = future_to_chunk[future]
                    try:
                        result = future.result()
                        chunk_results[chunk_index] = result
                        
                        if result["success"]:
                            successful_chunks += 1
                        else:
                            failed_chunks += 1
                            print(f"Chunk {chunk_index} failed: {result.get('error', 'Unknown error')}")
                    except Exception as e:
                        failed_chunks += 1
                        chunk_results[chunk_index] = {
                            "chunk_index": chunk_index,
                            "success": False,
                            "data": None,
                            "error": str(e)
                        }
                        print(f"Chunk {chunk_index} raised exception: {str(e)}")

            combined_enhanced_data = []
            for result in chunk_results:
                if result and result["success"] and result["data"]:
                    combined_enhanced_data.extend(result["data"])

            if not combined_enhanced_data:
                enhanced_data_obj.status = "failed"
                enhanced_data_obj.save()
                return

            enhanced_data_obj.data = combined_enhanced_data
            enhanced_data_obj.status = "complete"
            enhanced_data_obj.save()
            
            print(f"Enhancement complete: {successful_chunks}/{total_chunks} chunks successful, {failed_chunks} failed")
        except Exception as e:
            import traceback
            traceback.print_exc()
            try:
                enhanced_data_obj = EnhancedData.objects.get(id=enhanced_data_id)
                enhanced_data_obj.status = "failed"
                enhanced_data_obj.save()
            except:
                pass

    @action(detail=False, methods=['post'], url_path="enhance")
    def enhance(self, request):
        original_data_id = request.data.get("original_data_id")
        if not original_data_id:
            return Response({"error": "original_data_id field is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            original_data = OriginalData.objects.get(id=original_data_id)
        except OriginalData.DoesNotExist:
            return Response({"error": f"OriginalData with id {original_data_id} not found"}, status=status.HTTP_404_NOT_FOUND)
        
        original_data_list = original_data.data
        if not original_data_list:
            return Response({"error": "OriginalData contains no data"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(original_data_list, list):
            return Response({"error": "OriginalData.data must be an array"}, status=status.HTTP_400_BAD_REQUEST)

        schema_dict = request.data.get("schema")
        if not schema_dict:
            return Response({"error": "schema field is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(schema_dict, dict):
            return Response({"error": "schema must be a dictionary/object"}, status=status.HTTP_400_BAD_REQUEST)
        
        enhanced_data_obj = EnhancedData.objects.create(
            data=[],
            status="pending",
            original_data=original_data
        )
        
        thread = threading.Thread(
            target=self._process_enhancement,
            args=(enhanced_data_obj.id, original_data_list, schema_dict)
        )
        thread.daemon = True
        thread.start()
        
        return Response(EnhancedDataSerializer(enhanced_data_obj).data, status=status.HTTP_202_ACCEPTED)