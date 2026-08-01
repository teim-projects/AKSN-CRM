from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status, filters
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from .models import lead_management, LeadFAQ, LeadFollowUp, Customer, Project
from .serializers import LeadSerializer, LeadFollowUpSerializer, LeadFAQSerializer, CustomerSerializer, ProjectSerializer
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

    @action(detail=True, methods=['post'], url_path='convert-to-project')
    @transaction.atomic
    def convert_to_project(self, request, pk=None):
        customer = self.get_object()
        
        # Check if project already exists for this customer
        existing_project = Project.objects.filter(customer=customer).first()
        if existing_project:
            return Response({
                "message": "Project already exists for this customer",
                "project_id": existing_project.id,
                "project_code": existing_project.project_code,
            }, status=status.HTTP_200_OK)

        executive = customer.sales_executive
        if not executive and customer.lead and customer.lead.assigned_executive:
            executive = customer.lead.assigned_executive

        products = customer.product_purchased or []
        if not products and customer.lead and customer.lead.product_interested:
            products = customer.lead.product_interested

        scope = ""
        if customer.lead:
            scope = customer.lead.requirement_details or customer.lead.remarks or ""

        project_val = customer.project_value
        if (not project_val or project_val == 0) and customer.lead and customer.lead.amount:
            project_val = customer.lead.amount

        project_data = {
            "customer": customer.id,
            "product": products,
            "project_executive": executive.id if executive else None,
            "project_value": float(project_val) if project_val else 0.0,
            "project_scope_requirements": scope,
            "start_date": timezone.now().date(),
            "project_stage": "requirement_analysis",
            "priority": "medium",
        }

        serializer = ProjectSerializer(data=project_data, context={'request': request})
        if serializer.is_valid():
            project = serializer.save()
            return Response({
                "message": "Customer converted to Project successfully",
                "project_id": project.id,
                "project_code": project.project_code,
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')
    serializer_class = ProjectSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, OrderingFilter]
    filterset_fields = ['customer', 'project_executive', 'project_stage', 'priority']
    search_fields = ['project_code', 'customer__company_name', 'customer__name', 'project_scope_requirements']
    ordering_fields = ['created_at', 'start_date', 'expected_to_go_live', 'project_value', 'priority']


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
            updated_fields = ["lead"]
            existing_customer.lead = lead
            if not existing_customer.sales_executive and lead.assigned_executive:
                existing_customer.sales_executive = lead.assigned_executive
                updated_fields.append("sales_executive")
            if (not existing_customer.project_value or existing_customer.project_value == 0) and lead.amount:
                existing_customer.project_value = lead.amount
                updated_fields.append("project_value")
            if not existing_customer.billing_address and lead.address:
                existing_customer.billing_address = lead.address
                updated_fields.append("billing_address")
            existing_customer.save(update_fields=updated_fields)
            
            lead.converted_to_customer = existing_customer
            lead.is_converted = True
            lead.save()
            
            return Response({
                "message": "Lead linked to existing customer successfully",
                "customer_id": existing_customer.id,
                "customer_code": existing_customer.customer_code,
                "customer_name": existing_customer.name
            }, status=status.HTTP_200_OK)
    
        # Create new customer from lead data - map all fields
        customer_data = {
            "lead": lead.id,
            "name": lead.company_name or lead.contact_person or "Unknown",
            "contact_person": lead.contact_person,
            "contact_number": lead.mobile_number,
            "email": lead.email_address,
            "city": lead.city,
            "state": lead.state,
            "industry_category": lead.industry_type,
            "product_purchased": lead.product_interested,
            # ✅ Auto-map new fields
            "gst_number": lead.gst_number or "",
            "pan_number": lead.pan_number or "",
            "msme_number": lead.msme_number or "",
            "project_value": float(lead.amount) if lead.amount else None,
            "sales_executive": lead.assigned_executive_id,
            "designation": "",
            "website": "",
            "service_package": [],
            "payment_terms": "",
            "amc_start_date": None,
            "amc_end_date": None,
            "customer_status": "prospect",
            "billing_address": lead.address or "",
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