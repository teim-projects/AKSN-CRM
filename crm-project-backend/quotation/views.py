from rest_framework import viewsets, status, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from .models import Quotation, QuotationVersion, TermCategory, TermsConditions
import logging
from .serializers import (
    QuotationSerializer, QuotationCreateSerializer,
    TermCategorySerializer, TermCategoryCreateSerializer,
    TermsConditionsSerializer, TermsConditionsCreateSerializer
)

from .models import Quotation, QuotationVersion
from .serializers import QuotationSerializer, QuotationCreateSerializer

logger = logging.getLogger(__name__)



# =====================================================
# TERMS & CONDITIONS VIEWS
# =====================================================

class TermCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['is_active']
    
    def get_queryset(self):
        return TermCategory.objects.all().prefetch_related('terms')
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'update':
            return TermCategoryCreateSerializer
        return TermCategorySerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TermsConditionsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['category', 'is_active', 'is_default']
    
    def get_queryset(self):
        return TermsConditions.objects.all().select_related('category')
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'update':
            return TermsConditionsCreateSerializer
        return TermsConditionsSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)



@api_view(['GET'])
def thank_you_suggestions(request):
    """Get thank you note suggestions based on search term"""
    search = request.GET.get('search', '')
    
    if len(search) < 2:
        return Response([])
    
    notes = Quotation.objects.filter(
        thank_you_note__icontains=search,
        thank_you_note__isnull=False
    ).exclude(thank_you_note='').values_list('thank_you_note', flat=True).distinct()[:10]
    
    return Response([{'id': i, 'text': note} for i, note in enumerate(notes)])


@api_view(['GET'])
def subject_suggestions(request):
    """Get subject suggestions based on search term"""
    search = request.GET.get('search', '').strip()
    
    if not search or len(search) < 2:
        return Response([])
    
    quotations = Quotation.objects.filter(
        subject__icontains=search
    ).values('id', 'subject').distinct()[:10]
    
    return Response([{'id': q['id'], 'text': q['subject']} for q in quotations])


class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = [
        "quotation_no",
        "lead__company_name",
        "lead__contact_person",
        "lead__mobile_number",
        "company_name",
        "contact_person",
        "mobile_number",
        "email_address",
        "subject",
    ]
    filterset_fields = ['gst_type']

    def get_queryset(self):
        return Quotation.objects.all().select_related('lead').prefetch_related(
            'versions',
            'versions__items'
        ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'update':
            return QuotationCreateSerializer
        return QuotationSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'], url_path='latest-version')
    def latest_version(self, request, pk=None):
        """Get the latest active version of a quotation"""
        quotation = self.get_object()
        version = quotation.versions.filter(is_active=True).first()
        if not version:
            return Response(
                {"message": "No active version found"},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(quotation)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], url_path='version/(?P<version_id>[^/.]+)/delete')
    def delete_version(self, request, pk=None, version_id=None):
        """Delete a specific version of a quotation"""
        quotation = self.get_object()
        version = get_object_or_404(
            QuotationVersion,
            pk=version_id,
            quotation=quotation
        )

        was_active = version.is_active
        version.delete()

        remaining_versions = quotation.versions.order_by("-created_at")

        if not remaining_versions.exists():
            quotation.delete()
            return Response({"message": "Quotation deleted (last version removed)"})

        if was_active:
            latest = remaining_versions.first()
            latest.is_active = True
            latest.save(update_fields=["is_active"])

        return Response({"message": "Version deleted"})