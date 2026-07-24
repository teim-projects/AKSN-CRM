from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status, filters
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from .models import lead_management, LeadFAQ, LeadFollowUp, Customer
from .serializers import LeadSerializer, LeadFollowUpSerializer, LeadFAQSerializer, CustomerSerializer
from django.db.models import Q, Case, When, Value, IntegerField
from django.utils import timezone
from .filters import LeadFilter
from rest_framework.decorators import action
from django.db import transaction


class CustomerViewsets(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'name', '=email', 'secondary_email', 'contact_number',
        'poc_name', 'poc_contact_number', 'land_line_no',
        'city', 'state', 'site_city', 'site_state', 'pin_code'
    ]


class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, OrderingFilter]
    filterset_class = LeadFilter

    ordering_fields = [
        "created_at",
        "followup_date",
        "company_name",
        "status",
        "priority",
    ]

    filterset_fields = ['assigned_executive', 'status', 'followup_date', 'priority', 'pipeline_stage', 'lead_source']
    search_fields = [
        'company_name',
        'contact_person',
        'mobile_number',
        'email_address',
        'city',
        'state',
    ]

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(created_by=user)

    def get_queryset(self):
        user = self.request.user
        today = timezone.localdate()

        queryset = (
            lead_management.objects
            .select_related('assigned_executive', 'created_by', 'converted_to_customer')
            .prefetch_related('followups')
            .annotate(
                followup_priority=Case(
                    When(followup_date=today, then=Value(3)),
                    When(followup_date__gt=today, then=Value(2)),
                    When(followup_date__isnull=True, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
            .order_by(
                "-followup_priority",
                "-followup_date",
                "-created_at"
            )
        )

        if getattr(user, 'role', None) and user.role.name.lower() == "sales":
            queryset = queryset.filter(assigned_executive=user)

        lead_source = self.request.query_params.get("lead_source")
        if lead_source:
            queryset = queryset.filter(lead_source=lead_source)

        return queryset

    @action(detail=False, methods=['get'], url_path='latest-lead-by-mobile')
    def latest_lead_by_mobile(self, request):
        mobile = request.query_params.get("mobile")

        if not mobile:
            return Response(
                {"error": "Mobile number is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        lead = (
            lead_management.objects
            .filter(mobile_number=mobile)
            .order_by("-created_at", "-id")
            .first()
        )

        if not lead:
            return Response(
                {"message": "No lead found for this mobile number"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "company_name": lead.company_name,
            "contact_person": lead.contact_person,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='convert-to-customer')
    @transaction.atomic
    def convert_to_customer(self, request, pk=None):
        lead = self.get_object()
        
        if lead.is_converted:
            return Response(
                {"error": "This lead has already been converted to a customer"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
        # Check if customer already exists with this mobile number
        existing_customer = None
        if lead.mobile_number:
            existing_customer = Customer.objects.filter(
                contact_number=lead.mobile_number
            ).first()
    
        if existing_customer:
            lead.converted_to_customer = existing_customer
            lead.is_converted = True
            lead.save()
            
            return Response({
                "message": "Lead linked to existing customer successfully",
                "customer_id": existing_customer.id,
                "customer_code": existing_customer.customer_code,
                "customer_name": existing_customer.name
            }, status=status.HTTP_200_OK)
    
        # Create new customer from lead data - map only matching fields
        customer_data = {
            "name": lead.company_name or lead.contact_person or "Unknown",
            "contact_person": lead.contact_person,
            "contact_number": lead.mobile_number,
            "email": lead.email_address,
            "city": lead.city,
            "state": lead.state,
            "industry_category": lead.industry_type,
            "product_purchased": lead.product_interested,
            # These fields need to be added manually after conversion
            "designation": "",
            "website": "",
            "gst_number": "",
            "pan_number": "",
            "service_package": [],
            "payment_terms": "",
            "project_value": None,
            "sales_executive": None,
            "amc_start_date": None,
            "amc_end_date": None,
            "customer_status": "prospect",
            "billing_address": "",
            "pin_code": "",
        }
    
        customer_serializer = CustomerSerializer(data=customer_data)
        
        if customer_serializer.is_valid():
            customer = customer_serializer.save()
            
            lead.converted_to_customer = customer
            lead.is_converted = True
            lead.save()
            
            return Response({
                "message": "Lead converted to customer successfully",
                "customer_id": customer.id,
                "customer_code": customer.customer_code,
                "customer_name": customer.name
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {"error": "Failed to create customer", "details": customer_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )


class LeadFAQViewSet(viewsets.ModelViewSet):
    queryset = LeadFAQ.objects.all().order_by("sort_order", "id")
    serializer_class = LeadFAQSerializer
    permission_classes = [IsAuthenticated]


class LeadFollowUpViewSet(viewsets.ModelViewSet):
    serializer_class = LeadFollowUpSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            LeadFollowUp.objects
            .select_related("lead", "created_by")
            .prefetch_related("faq_answers__faq")
        )
        lead_id = self.request.query_params.get("lead")
        if lead_id:
            qs = qs.filter(lead_id=lead_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)