from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import status
from main.serializers import EnhancedDataEnhanceRequestSerializer, EnhancedDataSerializer
from main.tasks import process_enhancement_coordinator
from models.enhanced_data import EnhancedData
from models.original_data import OriginalData
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiExample

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


    @extend_schema(
        request=EnhancedDataEnhanceRequestSerializer,
        responses={202: None},
        description="Enhance the original data",
        examples=[
            OpenApiExample(
                name="Enhance the original data",
                value={
                    "original_data_id": 1,
                    "schema": {"name": "str", "age": "int"}
                }
            )
        ]
    )
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
        
        # Create EnhancedData object with pending status
        enhanced_data_obj = EnhancedData.objects.create(
            data=[],
            status="pending",
            original_data=original_data
        )
        
        # Dispatch the coordinator task
        process_enhancement_coordinator.delay(
            enhanced_data_obj.id,
            original_data_list,
            schema_dict
        )
        
        return Response(EnhancedDataSerializer(enhanced_data_obj).data, status=status.HTTP_202_ACCEPTED)