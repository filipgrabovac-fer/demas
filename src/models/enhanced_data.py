from models.original_data import OriginalData
from django.db import models

class EnhancedData(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("complete", "Complete"),
        ("failed", "Failed"),
    ]
    
    data = models.JSONField(
        help_text="Array of objects representing the enhanced data",
        default=list
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Status of the enhancement process"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    original_data = models.ForeignKey(OriginalData, on_delete=models.CASCADE)

    class Meta:
        app_label = 'main'

    def __str__(self):
        return str(self.data) if self.data else "Empty data"