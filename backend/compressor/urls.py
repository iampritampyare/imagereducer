from django.urls import path
from . import views

urlpatterns = [
    path('api/compress/', views.compress_image_view, name='compress_image'),
    path('api/download/<uuid:image_id>/', views.download_compressed_image, name='download_compressed'),
] 