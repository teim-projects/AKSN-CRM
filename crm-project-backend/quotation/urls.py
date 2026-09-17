from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    QuotationViewSet, 
    thank_you_suggestions, 
    subject_suggestions,
    TermCategoryViewSet,
    TermsConditionsViewSet,
    BillingDetailViewSet,
)

router = DefaultRouter()

# Register ViewSets
router.register(r'quotation', QuotationViewSet, basename='quotation')
router.register(r'term-categories', TermCategoryViewSet, basename='term-categories')
router.register(r'terms', TermsConditionsViewSet, basename='terms')
router.register(r'billing-details', BillingDetailViewSet, basename='billing-details')

urlpatterns = [
    # Suggestions endpoints
    path('thank-you-suggestions/', thank_you_suggestions, name='thank_you_suggestions'),
    path('subject-suggestions/', subject_suggestions, name='subject_suggestions'),
]

# Include router URLs
urlpatterns += router.urls