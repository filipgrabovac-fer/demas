from rest_framework import viewsets
from main.serializers import OriginalDataSerializer
from models.original_data import OriginalData


class OriginalDataView(viewsets.ModelViewSet):
    queryset = OriginalData.objects.all()
    serializer_class = OriginalDataSerializer