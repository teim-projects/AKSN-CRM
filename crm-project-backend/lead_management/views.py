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
        from product_management.models import Product

        def resolve_prod_name(raw_name):
            if not raw_name:
                return ""
            s_name = str(raw_name).strip()
            if s_name.isdigit():
                p_obj = Product.objects.filter(id=int(s_name)).first()
                if p_obj:
                    return p_obj.name
            return s_name

        normalized_products = []
        if isinstance(products_data, list) and len(products_data) > 0:
            for item in products_data:
                if isinstance(item, dict):
                    prod_name = resolve_prod_name(item.get("product") or item.get("name") or item.get("product_name") or "")
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
                    name_resolved = resolve_prod_name(item.strip())
                    normalized_products.append({
                        "name": name_resolved,
                        "amc_start_date": customer.amc_start_date,
                        "amc_end_date": customer.amc_end_date,
                        "value": None
                    })
                elif isinstance(item, (int, float)):
                    name_resolved = resolve_prod_name(item)
                    normalized_products.append({
                        "name": name_resolved,
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

        prod_val = serializer.validated_data.get('product')
        if prod_val and isinstance(prod_val, list):
            from product_management.models import Product
            resolved = []
            for item in prod_val:
                s_item = str(item).strip()
                if s_item.isdigit():
                    p_obj = Product.objects.filter(id=int(s_item)).first()
                    resolved.append(p_obj.name if p_obj else s_item)
                else:
                    resolved.append(item)
            serializer.validated_data['product'] = resolved

        serializer.save(**kwargs)

    def perform_update(self, serializer):
        prod_val = serializer.validated_data.get('product')
        if prod_val and isinstance(prod_val, list):
            from product_management.models import Product
            resolved = []
            for item in prod_val:
                s_item = str(item).strip()
                if s_item.isdigit():
                    p_obj = Product.objects.filter(id=int(s_item)).first()
                    resolved.append(p_obj.name if p_obj else s_item)
                else:
                    resolved.append(item)
            serializer.validated_data['product'] = resolved
        serializer.save()


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

    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request):
        """Generate and stream a styled Excel (.xlsx) template for lead import."""
        import io
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from django.http import HttpResponse

        wb = openpyxl.Workbook()
        
        # 1. Main Data Sheet
        ws = wb.active
        ws.title = "Lead Import Template"
        ws.views.sheetView[0].showGridLines = True

        headers = [
            ("Company Name *", 26, "Acme Corporation"),
            ("Contact Person", 22, "John Doe"),
            ("Mobile Number *", 20, "9876543210"),
            ("Email Address", 26, "john@acme.com"),
            ("City", 18, "Mumbai"),
            ("State", 18, "Maharashtra"),
            ("Address", 32, "123 Business Park, Andheri East"),
            ("Lead Source", 20, "Website"),
            ("Industry Type", 20, "Manufacturing"),
            ("Priority", 16, "High"),
            ("Pipeline Stage", 22, "New Lead"),
            ("Expected Budget", 20, "50,000 - 1,00,000"),
            ("Amount", 16, "75000"),
            ("Expected Closure Date", 22, "2026-10-15"),
            ("Next Followup Date", 22, "2026-09-20"),
            ("Enquiry Date", 18, "2026-09-10"),
            ("GST Number", 20, "27AAPFU0939F1ZV"),
            ("PAN Number", 18, "AAPFU0939F"),
            ("MSME Number", 22, "UDYAM-MH-01-0012345"),
            ("Is Tally User", 16, "Yes"),
            ("Tally Number", 18, "TALLY-98213"),
            ("Requirement Details", 36, "Looking for 15 HP Rotary Screw Air Compressor"),
            ("Remarks", 32, "Met at industrial exhibition, requested quote"),
        ]

        # Styling definitions
        header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        sample_font = Font(name="Calibri", size=10, color="334155")
        sample_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        sample_align = Alignment(horizontal="left", vertical="center")

        # Row 1: Headers
        ws.row_dimensions[1].height = 28
        ws.row_dimensions[2].height = 22

        for col_idx, (col_title, col_width, sample_val) in enumerate(headers, 1):
            col_letter = openpyxl.utils.get_column_letter(col_idx)
            ws.column_dimensions[col_letter].width = col_width

            # Header cell
            cell = ws.cell(row=1, column=col_idx, value=col_title)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_align
            cell.border = thin_border

            # Sample row cell
            sample_cell = ws.cell(row=2, column=col_idx, value=sample_val)
            sample_cell.font = sample_font
            sample_cell.fill = sample_fill
            sample_cell.alignment = sample_align
            sample_cell.border = thin_border

        # 2. Instructions Sheet
        ws_info = wb.create_sheet(title="Instructions & Options")
        ws_info.views.sheetView[0].showGridLines = True
        ws_info.column_dimensions['A'].width = 24
        ws_info.column_dimensions['B'].width = 60

        info_headers = ["Field Name", "Accepted Values / Format Details"]
        for c_idx, h in enumerate(info_headers, 1):
            c = ws_info.cell(row=1, column=c_idx, value=h)
            c.font = header_font
            c.fill = header_fill
            c.alignment = header_align
            c.border = thin_border
        ws_info.row_dimensions[1].height = 26

        instructions = [
            ("Company Name *", "Required if Contact Person is not provided. Name of the client company/organization."),
            ("Contact Person", "Required if Company Name is not provided. Primary person to contact."),
            ("Mobile Number *", "MANDATORY. 10-digit mobile number (e.g. 9876543210). Must be unique."),
            ("Email Address", "Optional. Valid email address (e.g. name@domain.com)."),
            ("Lead Source", "Accepted: Website, Referral, Cold Call, Social Media, Email Campaign, Exhibition, Other"),
            ("Industry Type", "Accepted: IT Services, Manufacturing, Banking, Automotive, Healthcare, Education, Real Estate, Other"),
            ("Priority", "Accepted: Critical, High, Medium, Low (default: Medium)"),
            ("Pipeline Stage", "Accepted: New Lead, Contacted, Requirement Gathering, Demo Scheduled, Demo Completed, Proposal Sent, Negotiation (default: New Lead)"),
            ("Dates", "Format: YYYY-MM-DD (e.g. 2026-09-10) or DD-MM-YYYY (e.g. 10-09-2026)"),
            ("Amount", "Numeric value without currency symbols (e.g. 75000 or 150000.50)"),
            ("Is Tally User", "Yes or No"),
            ("Notes on Importing", "Rows with duplicate mobile numbers already in the CRM will be skipped and reported in the summary."),
        ]

        for r_idx, (field, desc) in enumerate(instructions, 2):
            ws_info.row_dimensions[r_idx].height = 22
            c1 = ws_info.cell(row=r_idx, column=1, value=field)
            c1.font = Font(name="Calibri", size=10, bold=True, color="1E293B")
            c1.border = thin_border
            c1.alignment = Alignment(vertical="center")

            c2 = ws_info.cell(row=r_idx, column=2, value=desc)
            c2.font = sample_font
            c2.border = thin_border
            c2.alignment = Alignment(vertical="center")

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="lead_import_template.xlsx"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    @action(detail=False, methods=['post'], url_path='import-leads')
    def import_leads(self, request):
        """Bulk import leads from an uploaded .xlsx, .xls, or .csv file."""
        import csv
        import datetime
        import openpyxl
        from .models import LeadSource, IndustryType, Priority, PipelineStage, LeadStatus

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {"error": "No file uploaded. Please select an Excel (.xlsx, .xls) or CSV file."},
                status=status.HTTP_400_BAD_REQUEST
            )

        filename = uploaded_file.name.lower()
        rows_data = []

        # Parse Excel or CSV
        try:
            if filename.endswith(('.xlsx', '.xlsm', '.xltx')):
                wb = openpyxl.load_workbook(uploaded_file, data_only=True)
                ws = wb.active
                raw_rows = list(ws.iter_rows(values_only=True))
                if not raw_rows:
                    return Response({"error": "The uploaded spreadsheet is empty."}, status=status.HTTP_400_BAD_REQUEST)
                
                headers = [str(cell or "").strip() for cell in raw_rows[0]]
                for row in raw_rows[1:]:
                    if any(cell is not None and str(cell).strip() != "" for cell in row):
                        row_dict = {}
                        for idx, h in enumerate(headers):
                            if h and idx < len(row):
                                row_dict[h] = row[idx]
                        rows_data.append(row_dict)

            elif filename.endswith('.csv'):
                content = uploaded_file.read().decode('utf-8-sig', errors='replace').splitlines()
                reader = csv.DictReader(content)
                for row in reader:
                    if any(v and str(v).strip() for v in row.values()):
                        rows_data.append(row)
            else:
                return Response(
                    {"error": "Unsupported file format. Please upload an Excel (.xlsx) or CSV (.csv) file."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"error": f"Failed to read file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not rows_data:
            return Response(
                {"error": "No data rows found in the uploaded file."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Header normalization map
        HEADER_MAPPING = {
            'company name': 'company_name',
            'company': 'company_name',
            'company_name': 'company_name',
            'contact person': 'contact_person',
            'contact_person': 'contact_person',
            'contact name': 'contact_person',
            'name': 'contact_person',
            'mobile': 'mobile_number',
            'mobile number': 'mobile_number',
            'mobile_number': 'mobile_number',
            'contact number': 'mobile_number',
            'phone': 'mobile_number',
            'phone number': 'mobile_number',
            'email': 'email_address',
            'email address': 'email_address',
            'email_address': 'email_address',
            'city': 'city',
            'state': 'state',
            'address': 'address',
            'lead source': 'lead_source',
            'source': 'lead_source',
            'lead_source': 'lead_source',
            'industry': 'industry_type',
            'industry type': 'industry_type',
            'industry_type': 'industry_type',
            'priority': 'priority',
            'stage': 'pipeline_stage',
            'pipeline stage': 'pipeline_stage',
            'pipeline_stage': 'pipeline_stage',
            'budget': 'expected_budget',
            'expected budget': 'expected_budget',
            'expected_budget': 'expected_budget',
            'amount': 'amount',
            'value': 'amount',
            'closure date': 'expected_closure_date',
            'expected closure date': 'expected_closure_date',
            'expected_closure_date': 'expected_closure_date',
            'followup date': 'followup_date',
            'next followup date': 'followup_date',
            'followup_date': 'followup_date',
            'enquiry date': 'enquiry_date',
            'lead date': 'enquiry_date',
            'date': 'enquiry_date',
            'enquiry_date': 'enquiry_date',
            'gst': 'gst_number',
            'gst number': 'gst_number',
            'gst_number': 'gst_number',
            'pan': 'pan_number',
            'pan number': 'pan_number',
            'pan_number': 'pan_number',
            'msme': 'msme_number',
            'msme number': 'msme_number',
            'msme_number': 'msme_number',
            'is tally user': 'is_tally_user',
            'is_tally_user': 'is_tally_user',
            'tally user': 'is_tally_user',
            'tally number': 'tally_number',
            'tally_number': 'tally_number',
            'requirement': 'requirement_details',
            'requirement details': 'requirement_details',
            'requirement_details': 'requirement_details',
            'remarks': 'remarks',
            'remark': 'remarks',
            'notes': 'remarks',
        }

        # Date parser helper
        def parse_date(val):
            if not val:
                return None
            if isinstance(val, (datetime.date, datetime.datetime)):
                return val.date() if isinstance(val, datetime.datetime) else val
            val_str = str(val).strip()
            if not val_str:
                return None
            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d', '%d.%m.%Y'):
                try:
                    return datetime.datetime.strptime(val_str, fmt).date()
                except (ValueError, TypeError):
                    pass
            return None

        # Choice normalizer helper
        def normalize_choice(val, choices_enum, default=None):
            if not val:
                return default
            val_norm = str(val).strip().lower().replace('-', '_').replace(' ', '_')
            for k, label in choices_enum.choices:
                if val_norm == k.lower() or val_norm == label.lower().replace('-', '_').replace(' ', '_'):
                    return k
            return default

        # Pre-fetch existing mobile numbers in database for fast duplicate lookup
        existing_leads = (
            lead_management.objects
            .exclude(mobile_number__isnull=True)
            .exclude(mobile_number="")
            .select_related('assigned_executive', 'created_by')
        )
        existing_mobile_map = {}
        for l in existing_leads:
            digs = "".join(filter(str.isdigit, str(l.mobile_number or "")))
            if digs:
                t_digs = digs[-10:] if len(digs) >= 10 else digs
                if t_digs not in existing_mobile_map:
                    user_info = l.assigned_executive or l.created_by
                    owner_name = f"{getattr(user_info, 'first_name', '')} {getattr(user_info, 'last_name', '')}".strip() if user_info else ""
                    if not owner_name and user_info and getattr(user_info, 'email', None):
                        owner_name = user_info.email
                    existing_mobile_map[t_digs] = {
                        "lead_id": l.id,
                        "company_name": l.company_name or "",
                        "owner_name": owner_name or "Staff"
                    }

        batch_mobile_set = set()
        leads_to_create = []
        errors = []

        user = request.user
        default_assigned = user if not is_admin_or_subadmin(user) else None

        for idx, row in enumerate(rows_data, 1):
            row_num = idx + 1  # 1-based, considering header is row 1
            
            # Normalize row keys
            norm_data = {}
            for k, v in row.items():
                clean_k = str(k).strip().rstrip('*').strip().lower()
                field_name = HEADER_MAPPING.get(clean_k)
                if field_name:
                    norm_data[field_name] = v

            comp_name = str(norm_data.get('company_name') or "").strip()
            contact_p = str(norm_data.get('contact_person') or "").strip()
            mobile_raw = str(norm_data.get('mobile_number') or "").strip()

            # Skip sample row if exact match
            if comp_name.lower() == "acme corporation" and mobile_raw == "9876543210":
                continue

            # Validate Required Fields: either company name or contact person, and mobile
            if not comp_name and not contact_p:
                errors.append({
                    "row": row_num,
                    "company_name": comp_name or "-",
                    "mobile_number": mobile_raw or "-",
                    "error": "Either Company Name or Contact Person is required."
                })
                continue

            # Validate Mobile
            digits = "".join(filter(str.isdigit, mobile_raw))
            if not digits or len(digits) < 10:
                errors.append({
                    "row": row_num,
                    "company_name": comp_name or contact_p,
                    "mobile_number": mobile_raw or "-",
                    "error": "Valid 10-digit Mobile Number is required."
                })
                continue

            target_10 = digits[-10:]

            # Check duplicate against existing DB
            if target_10 in existing_mobile_map:
                dup_info = existing_mobile_map[target_10]
                errors.append({
                    "row": row_num,
                    "company_name": comp_name or contact_p,
                    "mobile_number": mobile_raw,
                    "error": f"Mobile already exists in CRM (assigned to {dup_info['owner_name']})."
                })
                continue

            # Check duplicate within this import file batch
            if target_10 in batch_mobile_set:
                errors.append({
                    "row": row_num,
                    "company_name": comp_name or contact_p,
                    "mobile_number": mobile_raw,
                    "error": "Duplicate mobile number within this uploaded file."
                })
                continue

            batch_mobile_set.add(target_10)

            # Amount parsing
            amount_val = 0.00
            if norm_data.get('amount'):
                try:
                    clean_amt = "".join(c for c in str(norm_data.get('amount')) if c.isdigit() or c == '.')
                    amount_val = float(clean_amt) if clean_amt else 0.00
                except (ValueError, TypeError):
                    amount_val = 0.00

            # Dates
            enquiry_d = parse_date(norm_data.get('enquiry_date')) or timezone.localdate()
            followup_d = parse_date(norm_data.get('followup_date'))
            closure_d = parse_date(norm_data.get('expected_closure_date'))

            # Choices
            src_val = normalize_choice(norm_data.get('lead_source'), LeadSource, default=str(norm_data.get('lead_source') or "").strip().lower() or 'other')
            ind_val = normalize_choice(norm_data.get('industry_type'), IndustryType, default=str(norm_data.get('industry_type') or "").strip().lower() or 'other')
            prio_val = normalize_choice(norm_data.get('priority'), Priority, default='medium')
            stage_val = normalize_choice(norm_data.get('pipeline_stage'), PipelineStage, default='new_lead')

            lead_inst = lead_management(
                company_name=comp_name or contact_p,
                contact_person=contact_p,
                mobile_number=target_10,
                email_address=str(norm_data.get('email_address') or "").strip() or None,
                city=str(norm_data.get('city') or "").strip() or None,
                state=str(norm_data.get('state') or "").strip() or None,
                address=str(norm_data.get('address') or "").strip() or None,
                lead_source=src_val,
                industry_type=ind_val,
                priority=prio_val,
                pipeline_stage=stage_val,
                status=LeadStatus.OPEN,
                expected_budget=str(norm_data.get('expected_budget') or "").strip() or None,
                amount=amount_val,
                expected_closure_date=closure_d,
                followup_date=followup_d,
                enquiry_date=enquiry_d,
                gst_number=str(norm_data.get('gst_number') or "").strip() or None,
                pan_number=str(norm_data.get('pan_number') or "").strip() or None,
                msme_number=str(norm_data.get('msme_number') or "").strip() or None,
                is_tally_user=str(norm_data.get('is_tally_user') or "").strip() or None,
                tally_number=str(norm_data.get('tally_number') or "").strip() or None,
                requirement_details=str(norm_data.get('requirement_details') or "").strip() or None,
                remarks=str(norm_data.get('remarks') or "").strip() or None,
                created_by=user,
                assigned_executive=default_assigned,
            )
            leads_to_create.append(lead_inst)

        # Bulk save
        if leads_to_create:
            with transaction.atomic():
                lead_management.objects.bulk_create(leads_to_create)

        return Response({
            "success": True,
            "message": f"Successfully imported {len(leads_to_create)} lead(s)." if leads_to_create else "No leads were imported.",
            "total_rows": len(rows_data),
            "imported_count": len(leads_to_create),
            "failed_count": len(errors),
            "errors": errors
        }, status=status.HTTP_200_OK if leads_to_create or not errors else status.HTTP_400_BAD_REQUEST)

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
    
        # Resolve product_interested IDs to actual Product names
        from product_management.models import Product

        resolved_products = []
        raw_lead_prods = lead.product_interested or []
        if not isinstance(raw_lead_prods, list):
            raw_lead_prods = [raw_lead_prods]

        for p_item in raw_lead_prods:
            if isinstance(p_item, dict):
                p_name = p_item.get("product") or p_item.get("name") or p_item.get("product_name") or ""
                if str(p_name).strip().isdigit():
                    p_obj = Product.objects.filter(id=int(str(p_name).strip())).first()
                    if p_obj:
                        p_name = p_obj.name
                if p_name:
                    p_copy = dict(p_item)
                    p_copy["product"] = p_name
                    resolved_products.append(p_copy)
            elif isinstance(p_item, (int, float)) or (isinstance(p_item, str) and p_item.strip().isdigit()):
                p_obj = Product.objects.filter(id=int(str(p_item).strip())).first()
                prod_title = p_obj.name if p_obj else str(p_item)
                resolved_products.append({
                    "product": prod_title,
                    "value": float(lead.amount) if lead.amount else None
                })
            elif isinstance(p_item, str) and p_item.strip():
                resolved_products.append({
                    "product": p_item.strip(),
                    "value": float(lead.amount) if lead.amount else None
                })

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
            if resolved_products and (not existing_customer.product_purchased or len(existing_customer.product_purchased) == 0):
                existing_customer.product_purchased = resolved_products
                updated_fields.append("product_purchased")
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
            "product_purchased": resolved_products,
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