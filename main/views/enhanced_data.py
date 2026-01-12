import json
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
from main.serializers import EnhancedDataEnhanceRequestSerializer, EnhancedDataSerializer, OriginalDataSerializer
from models.enhanced_data import EnhancedData

from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiExample

from models.original_data import OriginalData

class EnhancedDataView(viewsets.ModelViewSet):
    queryset = EnhancedData.objects.all()
    serializer_class = EnhancedDataSerializer

    @extend_schema(
        request=EnhancedDataEnhanceRequestSerializer,
        examples=[
            OpenApiExample(
                "Example Request",
                value={
                    "original_data": [
                        {
                            "id": 1,
                            "company_name": "Trek Bicycles",
                            "industry": "Bicycle Manufacturing",
                            "ceo": "John Burke",
                            "founded_year": 1976
                        },
                        {
                            "id": 2,
                            "company_name": "Specialized",
                            "industry": "Bicycle Manufacturing",
                            "ceo": "Mike Sinyard",
                            "founded_year": 1974
                        }
                    ],
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
    @action(detail=False, methods=['post'], url_path="enhance")
    def enhance(self, request):
        original_data_list = request.data.get("original_data")
        original_data_serializer = OriginalDataSerializer(data={"data": original_data_list})
        if original_data_serializer.is_valid():
            original_data = original_data_serializer.save()
        else:
            return Response({"error": original_data_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            schema_dict = request.data.get("schema")
            if not schema_dict:
                return Response({"error": "schema field is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if not isinstance(schema_dict, dict):
                return Response({"error": "schema must be a dictionary/object"}, status=status.HTTP_400_BAD_REQUEST)
            
            original_data_list = request.data.get("original_data")
            if not original_data_list:
                return Response({"error": "original_data field is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if not isinstance(original_data_list, list):
                return Response({"error": "original_data must be an array"}, status=status.HTTP_400_BAD_REQUEST)
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
                """).format(chunk=chunked_data[0], output_format=ComposerResponse.model_json_schema())
            result = compiled_graph.invoke({
                "messages": [
                    HumanMessage(prompt_template),
                ],  
                "review_count": 0,
                "schema": schema_dict,
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            enhanced_data_list = result.get("composed_data", [])
            
            if not enhanced_data_list:
                return Response({"error": "No composed_data found in result"}, status=status.HTTP_400_BAD_REQUEST)
            
            if isinstance(enhanced_data_list, list):
                enhanced_data_list = [
                    item.model_dump() if hasattr(item, 'model_dump') 
                    else dict(item) if hasattr(item, '__dict__') 
                    else item 
                    for item in enhanced_data_list
                ]
            else:
                return Response({"error": "composed_data must be an array"}, status=status.HTTP_400_BAD_REQUEST)
            
            enhanced_data_serializer = EnhancedDataSerializer(data={
                "data": enhanced_data_list,
                "original_data": original_data.id
            })
            
            if enhanced_data_serializer.is_valid():
                enhanced_data_obj = enhanced_data_serializer.save()
                return Response(EnhancedDataSerializer(enhanced_data_obj).data, status=status.HTTP_200_OK)
            else:
                return Response({"error": enhanced_data_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            