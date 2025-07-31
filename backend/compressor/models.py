from django.db import models
import uuid

class CompressedImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_image = models.ImageField(upload_to='originals/')
    compressed_image = models.ImageField(upload_to='compressed/')
    original_size = models.IntegerField()
    compressed_size = models.IntegerField()
    compression_ratio = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image {self.id} - {self.compression_ratio:.2f}% reduction"