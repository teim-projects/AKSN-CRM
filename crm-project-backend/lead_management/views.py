from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status, filters
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from .models import lead_management, LeadFAQ, LeadFollowUp, Customer, Project, LeadStatus
from .serializers import LeadSerializer, LeadFollowUpSerializer, LeadFAQSerializer, CustomerSerializer, ProjectSerializer
from django.db.models import Q, Case, When, Value, IntegerField
from django.utils import timezone
from .filters import LeadFilter
from rest_framework.decorators import action
from django.db import transaction
from api.permissions import is_admin_or_subadmin


class CustomerViewsets(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'name', '=email', 'secondary_email', 'contact_number',
        'poc_name', 'poc_contact_number', 'land_line_no',
        'city', 'state', 'site_city', 'site_state', 'pin_code'
    ]

    def get_queryset(self):
        user = self.request.user
        queryset = Customer.objects.all().order_by('-created_at')
        if not is_admin_or_subadmin(user):
            queryset = queryset.filter(
                Q(sales_executive=user) |
                Q(lead__assigned_executive=user) |
                Q(lead__created_by=user)
            )
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {}
        if not is_admin_or_subadmin(user) and 'sales_executive' not in serializer.validated_data:
            kwargs['sales_executive'] = user
        customer = serializer.save(**kwargs)

        if customer.lead:
            lead = customer.lead
            lead.status = LeadStatus.CLOSE_WIN
            lead.is_converted = True
            lead.converted_to_customer = customer
            lead.save(update_fields=['status', 'is_converted', 'converted_to_customer', 'updated_at'])

    @action(detail=True, methods=['post'], url_path='convert-to-project')
    @transaction.atomic
    def convert_to_project(self, request, pk=None):
        customer = self.get_object()

        executive = customer.sales_executive
        if not executive and customer.lead and customer.lead.assigned_executive:
            executive = customer.lead.assigned_executive

        products_data = customer.product_purchased or []
        if not products_data and customer.lead and customer.lead.product_interested:
            products_data = customer.lead.product_interested

        scope = ""
        if customer.lead:
            scope = customer.lead.requirement_details or customer.lead.remarks or ""

        project_val = customer.project_value
        if (not project_val or project_val == 0) and customer.lead and customer.lead.amount:
            project_val = customer.lead.amount

        # Normalize product entries into list of dicts with AMC dates and individual product values
        normalized_products = []
        if isinstance(products_data, list) and len(products_data) > 0:
            for item in products_data:
                if isinstance(item, dict):
                    prod_name = item.get("product") or item.get("name") or item.get("product_name") or ""
                    start_d = item.get("amc_start_date") or customer.amc_start_date
                    end_d = item.get("amc_end_date") or customer.amc_end_date
                    prod_val = item.get("value") or item.get("price") or item.get("project_value")
                    if prod_name:
                        normalized_products.append({
                            "name": prod_name,
                            "amc_start_date": start_d,
                            "amc_end_date": end_d,
                            "value": prod_val
                        })
                elif isinstance(item, str) and item.strip():
                    normalized_products.append({
                        "name": item.strip(),
                        "amc_start_date": customer.amc_start_date,
                        "amc_end_date": customer.amc_end_date,
                        "value": None
                    })
                elif isinstance(item, (int, float)):
                    normalized_products.append({
                        "name": str(item),
                        "amc_start_date": customer.amc_start_date,
                        "amc_end_date": customer.amc_end_date,
                        "value": None
                    })

        if not normalized_products:
            normalized_products = [{
                "name": None,
                "amc_start_date": customer.amc_start_date,
                "amc_end_date": customer.amc_end_date,
                "value": None
            }]

        created_projects = []
        already_existing_projects = []

        for prod_item in normalized_products:
            prod_name = prod_item["name"]
            prod_list = [prod_name] if prod_name else []

            # Check if project already exists for this customer & product
            existing = None
            if prod_name:
                for p in Project.objects.filter(customer=customer):
                    if p.product and (prod_name in p.product or prod_name == p.product):
                        existing = p
                        break
            else:
                existing = Project.objects.filter(customer=customer).first()

            if existing:
                already_existing_projects.append(existing)
                continue

            # Product specific value or fallback to customer total project value
            p_val = prod_item.get("value")
            if p_val is not None and p_val != "":
                try:
                    product_project_val = float(p_val)
                except (ValueError, TypeError):
                    product_project_val = float(project_val) if project_val else 0.0
            else:
                product_project_val = float(project_val) if project_val else 0.0

            project_data = {
                "customer": customer.id,
                "product": prod_list,
                "project_executive": executive.id if executive else None,
                "project_value": product_project_val,
                "project_scope_requirements": scope,
                "start_date": timezone.now().date(),
                "amc_start_date": prod_item["amc_start_date"],
                "amc_end_date": prod_item["amc_end_date"],
                "project_stage": "requirement_analysis",
                "priority": "medium",
            }

            serializer = ProjectSerializer(data=project_data, context={'request': request})
            if serializer.is_valid():
                project = serializer.save()
                created_projects.append(project)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not created_projects and already_existing_projects:
            first_p = already_existing_projects[0]
            return Response({
                "message": f"Projects already exist for this customer ({len(already_existing_projects)} project(s))",
                "project_id": first_p.id,
                "project_code": first_p.project_code,
                "total_projects": len(already_existing_projects)
            }, status=status.HTTP_200_OK)

        res_status = status.HTTP_201_CREATED if created_projects else status.HTTP_200_OK
        return Response({
            "message": f"Successfully created {len(created_projects)} project(s) for customer",
            "created_count": len(created_projects),
            "project_id": created_projects[0].id if created_projects else None,
            "project_code": created_projects[0].project_code if created_projects else None,
            "projects": [{"id": p.id, "project_code": p.project_code, "product": p.product} for p in created_projects]
        }, status=res_status)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, OrderingFilter]
    filterset_fields = ['customer', 'project_executive', 'project_stage', 'priority']
    search_fields = ['project_code', 'customer__company_name', 'customer__name', 'project_scope_requirements']
    ordering_fields = ['created_at', 'start_date', 'expected_to_go_live', 'project_value', 'priority']

    def get_queryset(self):
        user = self.request.user
        queryset = Project.objects.all().order_by('-created_at')
        if not is_admin_or_subadmin(user):
            queryset = queryset.filter(
                Q(project_executive=user) |
                Q(created_by=user) |
                Q(customer__sales_executive=user) |
                Q(customer__lead__assigned_executive=user) |
                Q(customer__lead__created_by=user)
            )
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        kwargs = {'created_by': user}
        if not is_admin_or_subadmin(user) and not serializer.validated_data.get('project_executive'):
            kwargs['project_executive'] = user
        serializer.save(**kwargs)


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
        kwargs = {'created_by': user}
        if not is_admin_or_subadmin(user) and not serializer.validated_data.get('assigned_executive'):
            kwargs['assigned_executive'] = user
        serializer.save(**kwargs)

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

        if not is_admin_or_subadmin(user):
            queryset = queryset.filter(Q(assigned_executive=user) | Q(created_by=user))

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

    @action(detail=False, methods=['get'], url_path='check-mobile')
    def check_mobile(self, request):
        mobile = request.query_params.get("mobile", "").strip()
        lead_id = request.query_params.get("lead_id")

        if not mobile:
            return Response(
                {"error": "Mobile number is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        digits = "".join(filter(str.isdigit, str(mobile)))
        if len(digits) < 10:
            return Response({
                "exists": False,
                "message": "Enter at least 10 digits to verify mobile number."
            }, status=status.HTTP_200_OK)

        target_digits = digits[-10:]

        qs = (
            lead_management.objects
            .exclude(mobile_number__isnull=True)
            .exclude(mobile_number="")
            .select_related('created_by', 'assigned_executive')
        )
        if lead_id:
            try:
                qs = qs.exclude(pk=int(lead_id))
            except (ValueError, TypeError):
                pass

        matching_lead = None
        for l in qs:
            l_digits = "".join(filter(str.isdigit, str(l.mobile_number or "")))
            if l_digits:
                if l_digits == digits or (len(l_digits) >= 10 and l_digits[-10:] == target_digits):
                    matching_lead = l
                    break

        if matching_lead:
            assigned_user = matching_lead.assigned_executive
            creator = matching_lead.created_by
            target_user = assigned_user or creator

            first_last = f"{getattr(target_user, 'first_name', '')} {getattr(target_user, 'last_name', '')}".strip() if target_user else ""
            person_name = first_last if first_last else (getattr(target_user, 'email', '') if target_user and getattr(target_user, 'email', '') else "Staff")
            person_email = getattr(target_user, 'email', '') if target_user and getattr(target_user, 'email', '') else "No email"
            comp_name = matching_lead.company_name or ""

            if assigned_user:
                message = f"This lead is already assigned to {person_name} ({person_email})."
            else:
                message = f"This lead has already been added by {person_name} ({person_email})."

            return Response({
                "exists": True,
                "lead_id": matching_lead.id,
                "company_name": comp_name,
                "contact_person": matching_lead.contact_person or "",
                "assigned_to_name": person_name,
                "assigned_to_email": person_email,
                "added_by_name": person_name,
                "added_by_email": person_email,
                "message": message
            }, status=status.HTTP_200_OK)

        return Response({
            "exists": False,
            "message": "Mobile number is available."
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
            if not existing_customer.industry_category and lead.industry_type:
                existing_customer.industry_category = lead.industry_type
                updated_fields.append("industry_category")
            if not getattr(existing_customer, "lead_source", None) and lead.lead_source:
                existing_customer.lead_source = lead.lead_source
                updated_fields.append("lead_source")
            existing_customer.save(update_fields=updated_fields)
            
            lead.converted_to_customer = existing_customer
            lead.is_converted = True
            lead.status = LeadStatus.CLOSE_WIN
            lead.save(update_fields=["converted_to_customer", "is_converted", "status", "updated_at"])
            
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
            "contact_person": lead.contact_person or "",
            "contact_number": lead.mobile_number or "",
            "email": lead.email_address or None,
            "city": lead.city or "",
            "state": lead.state or "",
            "industry_category": lead.industry_type or "",
            "lead_source": lead.lead_source or "",
            "product_purchased": lead.product_interested or [],
            # ✅ Auto-map new fields
            "gst_number": lead.gst_number or "",
            "pan_number": lead.pan_number or "",
            "msme_number": lead.msme_number or "",
            "project_value": float(lead.amount) if lead.amount else None,
            "sales_executive": lead.assigned_executive_id,
            "designation": "",
            "website": lead.linkedin_profile_url or "",
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
            lead.status = LeadStatus.CLOSE_WIN
            lead.save(update_fields=["converted_to_customer", "is_converted", "status", "updated_at"])
            
            return Response({
                "message": "Lead converted to customer successfully",
                "customer_id": customer.id,
                "customer_code": customer.customer_code,
                "customer_name": customer.name
            }, status=status.HTTP_201_CREATED)
        else:
            error_details = customer_serializer.errors
            first_err = ""
            for field, errs in error_details.items():
                err_text = ", ".join([str(e) for e in errs]) if isinstance(errs, list) else str(errs)
                first_err = f"{field}: {err_text}"
                break
            return Response(
                {
                    "error": f"Failed to create customer ({first_err})" if first_err else "Failed to create customer",
                    "details": error_details
                },
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
        user = self.request.user
        qs = (
            LeadFollowUp.objects
            .select_related("lead", "created_by")
            .prefetch_related("faq_answers__faq")
        )
        if not is_admin_or_subadmin(user):
            qs = qs.filter(
                Q(created_by=user) |
                Q(lead__assigned_executive=user) |
                Q(lead__created_by=user)
            )
        lead_id = self.request.query_params.get("lead")
        if lead_id:
            qs = qs.filter(lead_id=lead_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PublicMetricsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        total_leads = lead_management.objects.count()
        total_customers = Customer.objects.count()
        total_projects = Project.objects.count()

        if total_leads > 0:
            conversion_rate = round((total_customers / total_leads) * 100, 1)
        else:
            conversion_rate = 0.0

        return Response({
            "total_leads": total_leads,
            "total_customers": total_customers,
            "total_projects": total_projects,
            "conversion_rate": f"{conversion_rate}%",
            "conversion_rate_value": conversion_rate,
        }, status=status.HTTP_200_OK)