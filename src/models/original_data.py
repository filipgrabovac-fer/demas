from django.db import models

class OriginalData(models.Model):
    data = models.JSONField(default=list)
    schema = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="Schema definition mapping field names to types (e.g., {'id': 'int', 'name': 'str'})"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'main'

    def __str__(self):
        return self.data