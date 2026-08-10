from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CustomerViewsets, LeadViewSet, LeadFollowUpViewSet, LeadFAQViewSet, ProjectViewSet, PublicMetricsView

router = DefaultRouter()
router.register(r'customer', CustomerViewsets, basename='customer')
router.register(r'lead', LeadViewSet, basename='lead')
router.register(r'lead-followups', LeadFollowUpViewSet, basename='lead-followup')
router.register(r'lead-faqs', LeadFAQViewSet, basename='lead-faq')
router.register(r'projects', ProjectViewSet, basename='project')

urlpatterns = [
    path('public-metrics/', PublicMetricsView.as_view(), name='public-metrics'),
]

urlpatterns += router.urls