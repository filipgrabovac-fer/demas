from rest_framework import serializers
from models.enhanced_data import EnhancedData
from models.original_data import OriginalData

class OriginalDataSerializer(serializers.ModelSerializer):
    schema = serializers.DictField(
        child=serializers.ChoiceField(
            choices=["int", "str", "bool", "float"],
            help_text="Type must be one of: 'int', 'str', 'bool', 'float'"
        ),
        required=False,
        allow_null=True,
        help_text="Schema definition mapping field names to types (e.g., {'id': 'int', 'name': 'str'})"
    )
    
    class Meta:
        model = OriginalData
        fields = '__all__'


class EnhancedDataSerializer(serializers.ModelSerializer):
    status = serializers.CharField(default="pending", required=False)
    
    class Meta:
        model = EnhancedData
        fields = '__all__'

class SchemaFieldSerializer(serializers.Serializer):
    type = serializers.ChoiceField(
        choices=["int", "str", "bool", "float"],
        help_text="Type must be one of: 'int', 'str', 'bool', 'float'"
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Description of what this field should contain"
    )


class EnhancedDataEnhanceRequestSerializer(serializers.Serializer):
    original_data_id = serializers.IntegerField(
        help_text="ID of the OriginalData instance to enhance"
    )
    schema = serializers.DictField(
        child=SchemaFieldSerializer(),
        help_text="Schema definition mapping field names to field specs with type and description (e.g., {'id': {'type': 'int', 'description': 'User ID'}})"
    )