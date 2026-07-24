from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CategoryViewSet, product_search_all, upload_product_image 

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'categories', CategoryViewSet, basename='categories')

urlpatterns = [
    path('', include(router.urls)),
    path('product-search-all/', product_search_all, name='product_search_all'),
    path('upload-image/', upload_product_image, name='upload_product_image'),
]