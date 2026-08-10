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

from django.http import HttpResponse
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
    search = request.GET.get('search', '').strip()
    
    query = Quotation.objects.filter(
        thank_you_note__isnull=False
    ).exclude(thank_you_note='')

    if search:
        query = query.filter(thank_you_note__icontains=search)
    
    notes = query.values_list('thank_you_note', flat=True).distinct()[:15]
    
    return Response([{'id': i, 'text': note} for i, note in enumerate(notes)])


@api_view(['GET'])
def subject_suggestions(request):
    """Get subject suggestions based on search term"""
    search = request.GET.get('search', '').strip()
    
    query = Quotation.objects.filter(
        subject__isnull=False
    ).exclude(subject='')

    if search:
        query = query.filter(subject__icontains=search)

    subjects = query.values_list('subject', flat=True).distinct()[:15]
    
    return Response([{'id': i, 'text': subj} for i, subj in enumerate(subjects)])


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

    @action(detail=True, methods=['post'], url_path='finalize')
    def finalize(self, request, pk=None):
        """Finalize the active version of a quotation"""
        quotation = self.get_object()
        active_version = quotation.versions.filter(is_active=True).first()
        if not active_version:
            return Response(
                {"error": "No active version found to finalize."},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_status = not active_version.is_finalized
        quotation.versions.update(is_finalized=False)
        active_version.is_finalized = new_status
        active_version.save(update_fields=['is_finalized'])
        quotation.is_finalized = new_status
        quotation.save(update_fields=['is_finalized'])

        return Response({
            "message": "Quotation version marked as final." if new_status else "Quotation finalization removed.",
            "is_finalized": new_status,
            "version_id": active_version.id
        })

    @action(detail=True, methods=['post'], url_path='version/(?P<version_id>[^/.]+)/finalize')
    def finalize_version(self, request, pk=None, version_id=None):
        """Finalize a specific version of a quotation (active version only)"""
        quotation = self.get_object()
        version = get_object_or_404(
            QuotationVersion,
            pk=version_id,
            quotation=quotation
        )

        if not version.is_active:
            return Response(
                {"error": "Archived versions cannot be finalized."},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_status = not version.is_finalized
        quotation.versions.update(is_finalized=False)
        version.is_finalized = new_status
        version.save(update_fields=['is_finalized'])
        quotation.is_finalized = new_status
        quotation.save(update_fields=['is_finalized'])

        return Response({
            "message": "Version marked as final." if new_status else "Version finalization removed.",
            "is_finalized": new_status,
            "version_id": version.id
        })

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        """Generate and stream Quotation PDF using WeasyPrint"""
        quotation = self.get_object()
        version_id = request.query_params.get('version_id')
        if version_id:
            version = get_object_or_404(QuotationVersion, id=version_id, quotation=quotation)
        else:
            version = quotation.versions.filter(is_active=True).first() or quotation.versions.first()
            
        if not version:
            return Response({"error": "No version found for this quotation"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            from .utils.pdf_generator import generate_quotation_pdf
            pdf_bytes = generate_quotation_pdf(quotation, version)
            disposition = request.query_params.get('disposition', 'inline')
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"Quotation_{quotation.quotation_no}.pdf"
            response['Content-Disposition'] = f'{disposition}; filename="{filename}"'
            return response
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)