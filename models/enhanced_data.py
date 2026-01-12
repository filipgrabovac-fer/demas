from models.original_data import OriginalData
from django.db import models

class EnhancedData(models.Model):
    data = models.JSONField(
        help_text="Array of objects representing the enhanced data"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    original_data = models.ForeignKey(OriginalData, on_delete=models.CASCADE)

    class Meta:
        app_label = 'main'

    def __str__(self):
        return str(self.data) if self.data else "Empty data"