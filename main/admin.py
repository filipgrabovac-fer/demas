from models.enhanced_data import EnhancedData
from models.original_data import OriginalData
from django.contrib import admin

# Register your models here.

admin.site.register(OriginalData)
admin.site.register(EnhancedData)