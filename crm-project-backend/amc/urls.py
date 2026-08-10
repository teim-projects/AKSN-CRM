from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AMCContractViewSet

router = DefaultRouter()
router.register(r'contracts', AMCContractViewSet, basename='amc-contract')
router.register(r'', AMCContractViewSet, basename='amc')

urlpatterns = router.urls
