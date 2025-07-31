from rest_framework import serializers
from .models import CompressedImage

class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()

class CompressedImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompressedImage
        fields = '__all__'