from django.db import models

class OriginalData(models.Model):
    data = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'main'

    def __str__(self):
        return self.data