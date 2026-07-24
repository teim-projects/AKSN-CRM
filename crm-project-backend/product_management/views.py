from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import uuid
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.annotate(product_count=Count('products'))
    serializer_class = CategorySerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['is_active']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'product_code', 'hsn_sac_code']
    filterset_fields = ['is_active', 'is_service', 'status', 'category']
    ordering_fields = ['name', 'unit_price', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def upload_product_image(request):
    """Upload product image"""
    if 'image' not in request.FILES:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    image = request.FILES['image']
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if image.content_type not in allowed_types:
        return Response({'error': 'Invalid image type. Allowed: JPEG, PNG, GIF, WEBP'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (max 5MB)
    if image.size > 5 * 1024 * 1024:
        return Response({'error': 'Image size too large. Max 5MB allowed'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Generate unique filename
    ext = os.path.splitext(image.name)[1]
    filename = f"products/{uuid.uuid4().hex}{ext}"
    
    # Save file
    saved_path = default_storage.save(filename, ContentFile(image.read()))
    
    # Return the URL
    url = request.build_absolute_uri(default_storage.url(saved_path))
    
    return Response({'image_url': url}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def product_search_all(request):
    """Simple product search for dropdowns"""
    search_query = request.GET.get('search', '').strip()
    queryset = Product.objects.filter(is_active=True).select_related('category')
    
    if search_query:
        queryset = queryset.filter(
            Q(name__icontains=search_query) |
            Q(product_code__icontains=search_query) |
            Q(category__name__icontains=search_query)
        )
    
    queryset = queryset[:50]
    
    results = [{
        'id': product.id,
        'product_code': product.product_code,
        'display_text': f"{product.name} - {product.product_code}",
        'name': product.name,
        'category': product.category.name if product.category else None,
        'unit_price': product.unit_price,
        'price_with_gst': product.get_price_with_gst()
    } for product in queryset]
    
    return Response(results)