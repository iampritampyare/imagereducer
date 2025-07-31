from django.shortcuts import render

# Create your views here.
import os
import io
from PIL import Image
from django.http import JsonResponse, HttpResponse
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import CompressedImage
from .serializers import ImageUploadSerializer, CompressedImageSerializer
import json

def compress_image(image, target_size_mb=2):
    """
    Compress image to target size (default 2MB)
    """
    target_size_bytes = target_size_mb * 1024 * 1024
    
    # Open image
    img = Image.open(image)
    
    # Convert to RGB if necessary
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    
    # Start with quality 95
    quality = 95
    
    while quality > 10:
        # Create a BytesIO object to hold the compressed image
        compressed_io = io.BytesIO()
        
        # Save with current quality
        img.save(compressed_io, format='JPEG', quality=quality, optimize=True)
        
        # Check size
        compressed_size = compressed_io.tell()
        
        if compressed_size <= target_size_bytes:
            compressed_io.seek(0)
            return compressed_io, compressed_size
        
        # Reduce quality
        quality -= 5
    
    # If still too large, resize the image
    width, height = img.size
    while quality <= 10:
        # Reduce dimensions by 10%
        new_width = int(width * 0.9)
        new_height = int(height * 0.9)
        
        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        compressed_io = io.BytesIO()
        resized_img.save(compressed_io, format='JPEG', quality=50, optimize=True)
        
        compressed_size = compressed_io.tell()
        
        if compressed_size <= target_size_bytes:
            compressed_io.seek(0)
            return compressed_io, compressed_size
        
        width, height = new_width, new_height
        img = resized_img
    
    # Final fallback - return with lowest quality
    compressed_io = io.BytesIO()
    img.save(compressed_io, format='JPEG', quality=10, optimize=True)
    compressed_io.seek(0)
    return compressed_io, compressed_io.tell()





@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def compress_image_view(request):
    serializer = ImageUploadSerializer(data=request.data)
    
    if serializer.is_valid():
        uploaded_image = serializer.validated_data['image']
        
        try:
            # Get original size
            original_size = uploaded_image.size
            
            # Compress the image
            compressed_io, compressed_size = compress_image(uploaded_image)
            
            # Create CompressedImage instance
            compressed_image = CompressedImage()
            compressed_image.original_image = uploaded_image
            compressed_image.original_size = original_size
            compressed_image.compressed_size = compressed_size
            
            # Calculate compression ratio
            compression_ratio = ((original_size - compressed_size) / original_size) * 100
            compressed_image.compression_ratio = compression_ratio
            
            # Save compressed image
            compressed_filename = f"compressed_{uploaded_image.name.split('.')[0]}.jpg"
            compressed_image.compressed_image.save(
                compressed_filename,
                ContentFile(compressed_io.getvalue()),
                save=False
            )
            
            compressed_image.save()
            
            # Serialize and return
            response_serializer = CompressedImageSerializer(compressed_image)
            if not response_serializer.data:
                return Response({
                    'success': False,
                    'error': 'Empty response from serializer'
                }, status=500)
                
            try:
                json.dumps(response_serializer.data)
            except Exception as e:
                print("❌ Serializer returned invalid JSON", e)
            
            return Response({
                'success': True,
                'data': response_serializer.data,
                'message': f'Image compressed successfully! Reduced by {compression_ratio:.1f}%'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def download_compressed_image(request, image_id):
    try:
        compressed_image = CompressedImage.objects.get(id=image_id)
        
        # Open the compressed image file
        image_file = compressed_image.compressed_image
        
        response = HttpResponse(image_file.read(), content_type='image/jpeg')
        response['Content-Disposition'] = f'attachment; filename="compressed_{image_id}.jpg"'
        
        return response
        
    except CompressedImage.DoesNotExist:
        return JsonResponse({'error': 'Image not found'}, status=404)
