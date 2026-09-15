import secrets
import string
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from django.views import View
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.pagination import PageNumberPagination

from .models import TallyIntegration, TallySyncJob, TallySyncLog, TallyInvoice, TallyInvoiceItem
from .serializers import (
    TallyIntegrationSerializer,
    TallyInvoiceListSerializer,
    TallyInvoiceDetailSerializer,
    TallySyncLogSerializer,
    ConnectorPairRequestSerializer,
    ConnectorHeartbeatSerializer,
)
from .authentication import TallyConnectorAuthentication


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def generate_pairing_code_str():
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(secrets.choice(chars) for _ in range(4))
    part2 = ''.join(secrets.choice(chars) for _ in range(4))
    return f"TALLY-{part1}-{part2}"


def get_or_create_integration_for_user(user):
    """
    Returns the active TallyIntegration.
    Ensures a single canonical integration record exists and cleans up historical duplicates.
    """
    integrations = list(TallyIntegration.objects.all())
    if not integrations:
        return TallyIntegration.objects.create(
            created_by=user,
            status='disconnected'
        )

    primary = integrations[0]
    if not primary.created_by and user:
        primary.created_by = user
        primary.save(update_fields=['created_by'])

    if len(integrations) > 1:
        for extra in integrations[1:]:
            extra.invoices.all().update(integration=primary)
            extra.sync_jobs.all().update(integration=primary)
            extra.sync_logs.all().update(integration=primary)
            extra.delete()

    return primary


# ==========================================
# CRM FRONTEND USER VIEWS (JWT AUTH)
# ==========================================

class TallyStatusView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        integration = get_or_create_integration_for_user(request.user)

        # Dynamic heartbeat timeout check:
        # The Windows connector sends heartbeats every 10 seconds.
        # If the connector process (terminal or TallyConnector.exe) is closed, heartbeats stop.
        # If no heartbeat has arrived in 25 seconds, mark the status as disconnected.
        if integration.auth_token:
            is_stale = False
            if not integration.last_connected_at:
                is_stale = True
            else:
                elapsed = (timezone.now() - integration.last_connected_at).total_seconds()
                if elapsed > 25:
                    is_stale = True

            if is_stale and integration.status != 'disconnected':
                integration.status = 'disconnected'
                integration.last_error = 'Windows connector is not running. Please launch TallyConnector.exe on your PC.'
                integration.save(update_fields=['status', 'last_error'])

        serializer = TallyIntegrationSerializer(integration)
        return Response(serializer.data)


class GeneratePairingCodeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        integration = get_or_create_integration_for_user(request.user)
        code = generate_pairing_code_str()
        expires = timezone.now() + timedelta(minutes=15)

        integration.pairing_code = code
        integration.pairing_code_expires_at = expires
        integration.status = 'pairing'
        integration.last_error = ''
        integration.save()

        return Response({
            'pairing_code': code,
            'expires_at': expires.isoformat(),
            'message': 'Pairing code generated. Enter this code into your Windows Tally Connector within 15 minutes.'
        })


class SelectCompanyView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        integration = get_or_create_integration_for_user(request.user)
        company_name = request.data.get('company_name', '').strip()
        company_identifier = request.data.get('company_identifier', '').strip()

        if not company_name:
            return Response({'error': 'Company name is required'}, status=status.HTTP_400_BAD_REQUEST)

        integration.tally_company_name = company_name
        integration.tally_company_identifier = company_identifier or company_name
        integration.save()

        return Response({
            'message': f'Company "{company_name}" selected successfully',
            'integration': TallyIntegrationSerializer(integration).data
        })


class TriggerSyncNowView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        integration = get_or_create_integration_for_user(request.user)
        if integration.status != 'connected':
            return Response({
                'error': f'Cannot sync: Tally connector is {integration.status}. Make sure the connector is running and paired.'
            }, status=status.HTTP_400_BAD_REQUEST)

        job = TallySyncJob.objects.create(
            integration=integration,
            job_type='full_sync',
            status='pending'
        )

        return Response({
            'message': 'Manual synchronization triggered. The connector will fetch invoices on next poll.',
            'job_id': str(job.id)
        })


class TallyInvoiceListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        integration = get_or_create_integration_for_user(request.user)
        queryset = TallyInvoice.objects.filter(integration=integration)

        # Filters
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(voucher_number__icontains=search) |
                Q(party_name__icontains=search) |
                Q(gstin__icontains=search)
            )

        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        voucher_type = request.query_params.get('voucher_type')
        if voucher_type:
            queryset = queryset.filter(voucher_type__iexact=voucher_type)

        company = request.query_params.get('company', '').strip()
        if company:
            queryset = queryset.filter(
                Q(tally_company_identifier__iexact=company) |
                Q(tally_company_identifier__icontains=company)
            )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = TallyInvoiceListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class TallyInvoiceDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            invoice = TallyInvoice.objects.get(pk=pk)
        except TallyInvoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TallyInvoiceDetailSerializer(invoice)
        return Response(serializer.data)


class TallySyncHistoryView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        integration = get_or_create_integration_for_user(request.user)
        queryset = TallySyncLog.objects.filter(integration=integration)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = TallySyncLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class TallyDisconnectView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        integration = get_or_create_integration_for_user(request.user)
        integration.status = 'disconnected'
        integration.auth_token = None
        integration.pairing_code = ''
        integration.pairing_code_expires_at = None
        integration.connector_name = ''
        integration.connector_id = ''
        integration.available_companies = []
        integration.tally_company_name = ''
        integration.tally_company_identifier = ''
        integration.last_error = 'User disconnected integration.'
        integration.save()

        return Response({'message': 'Tally connector disconnected successfully'})


# ==========================================
# WINDOWS CONNECTOR VIEWS
# ==========================================

class ConnectorPairView(APIView):
    """
    Public pairing endpoint called by Windows connector with code TALLY-XXXX-XXXX.
    Returns auth token on success.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ConnectorPairRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pairing_code = serializer.validated_data['pairing_code'].strip().upper()
        connector_name = serializer.validated_data.get('connector_name', 'Windows PC')
        connector_id = serializer.validated_data.get('connector_id', '')

        try:
            integration = TallyIntegration.objects.get(pairing_code=pairing_code)
        except TallyIntegration.DoesNotExist:
            return Response({
                'error': 'Invalid pairing code. Please generate a new pairing code from CRM.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not integration.is_pairing_valid():
            return Response({
                'error': 'Pairing code has expired. Please generate a new code in the CRM.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate secure auth token
        token = secrets.token_urlsafe(48)
        integration.auth_token = token
        integration.connector_name = connector_name
        integration.connector_id = connector_id or secrets.token_hex(8)
        integration.status = 'connected'
        integration.pairing_code = ''
        integration.pairing_code_expires_at = None
        integration.last_connected_at = timezone.now()
        integration.last_error = ''
        # Clear out any previous connector/machine's company state to guarantee a clean slate
        integration.available_companies = []
        integration.tally_company_name = ''
        integration.tally_company_identifier = ''
        integration.save()

        return Response({
            'message': 'Pairing successful',
            'auth_token': token,
            'integration_id': str(integration.id),
            'connector_name': integration.connector_name,
            'selected_company': '',
            'selected_company_identifier': ''
        })


class ConnectorHeartbeatView(APIView):
    """
    Called periodically by Windows connector.
    Updates local status and checks if CRM has queued any pending jobs.
    """
    authentication_classes = [TallyConnectorAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        integration = getattr(request, 'tally_integration', None)
        if not integration:
            return Response({'error': 'Unauthorized connector'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = ConnectorHeartbeatSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        is_tally_online = data['is_tally_online']
        tally_version = data.get('tally_version', '')
        companies = data.get('companies', [])
        current_company = data.get('current_company', '')
        company_identifier = data.get('company_identifier', '')
        error_message = data.get('error_message', '')

        integration.last_connected_at = timezone.now()
        if is_tally_online:
            integration.status = 'connected'
            if error_message:
                integration.last_error = error_message
            else:
                integration.last_error = ''
        else:
            integration.status = 'offline'
            integration.last_error = error_message or 'TallyPrime is not running or unreachable on client machine.'

        if tally_version:
            integration.tally_version = tally_version
        if companies:
            real_companies = [c for c in companies if c.get('name') not in ('Active Tally Company', 'Default Company')]
            if real_companies:
                # Directly reflect the companies currently open on the connected machine
                # (Do NOT merge with historical companies from other machines/sessions)
                integration.available_companies = real_companies

                valid_names = [c.get('name') for c in real_companies]
                # If no company is selected, or if the previously selected company is not present on this machine,
                # default to the first available company from this machine.
                if not integration.tally_company_name or integration.tally_company_name not in valid_names:
                    integration.tally_company_name = real_companies[0].get('name', '')
                    integration.tally_company_identifier = real_companies[0].get('identifier', integration.tally_company_name)

        integration.save()

        # Check for pending sync jobs
        pending_job = integration.sync_jobs.filter(status='pending').order_by('created_at').first()
        job_info = None
        if pending_job:
            pending_job.status = 'in_progress'
            pending_job.save(update_fields=['status', 'updated_at'])
            job_info = {
                'job_id': str(pending_job.id),
                'job_type': pending_job.job_type,
                'target_company': integration.tally_company_name,
                'company_identifier': integration.tally_company_identifier
            }

        return Response({
            'status': 'acknowledged',
            'integration_status': integration.status,
            'selected_company': integration.tally_company_name,
            'selected_company_identifier': integration.tally_company_identifier,
            'pending_job': job_info
        })


class ConnectorUploadInvoicesView(APIView):
    """
    Ingests invoice data uploaded by the Windows connector.
    Handles duplicate prevention and field updating.
    """
    authentication_classes = [TallyConnectorAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        integration = getattr(request, 'tally_integration', None)
        if not integration:
            return Response({'error': 'Unauthorized connector'}, status=status.HTTP_401_UNAUTHORIZED)

        job_id = request.data.get('job_id')
        company_name = request.data.get('company_name', integration.tally_company_name)
        company_identifier = request.data.get('company_identifier', integration.tally_company_identifier or company_name)
        invoices_data = request.data.get('invoices', [])

        sync_log = TallySyncLog.objects.create(
            integration=integration,
            sync_type='manual' if job_id else 'automatic',
            status='running',
            records_processed=len(invoices_data)
        )

        created_count = 0
        updated_count = 0
        failed_count = 0
        errors = []

        for inv in invoices_data:
            try:
                tally_guid = str(inv.get('tally_guid') or inv.get('voucher_number') or '').strip()
                if not tally_guid:
                    failed_count += 1
                    errors.append(f"Missing GUID/Voucher Number: {inv}")
                    continue

                # Clean fields safely
                voucher_number = str(inv.get('voucher_number') or 'UNKNOWN').strip()
                voucher_type = str(inv.get('voucher_type') or 'Sales').strip()
                inv_date = inv.get('date') or None
                party_name = str(inv.get('party_name') or 'Cash / Unknown Party').strip()
                party_ledger_id = str(inv.get('party_ledger_id') or '').strip()
                gstin = str(inv.get('gstin') or '').strip()
                state_val = str(inv.get('state') or '').strip()
                billing_addr = str(inv.get('billing_address') or '').strip()
                shipping_addr = str(inv.get('shipping_address') or '').strip()
                ref_no = str(inv.get('reference_number') or '').strip()
                ref_date = inv.get('reference_date') or None
                narration = str(inv.get('narration') or '').strip()
                tally_alter_id = str(inv.get('tally_alter_id') or '').strip()

                subtotal = float(inv.get('subtotal') or 0.0)
                cgst = float(inv.get('cgst_amount') or 0.0)
                sgst = float(inv.get('sgst_amount') or 0.0)
                igst = float(inv.get('igst_amount') or 0.0)
                cess = float(inv.get('cess_amount') or 0.0)
                total_tax = float(inv.get('total_tax') or (cgst + sgst + igst + cess))
                total_amount = float(inv.get('total_amount') or (subtotal + total_tax))
                currency = str(inv.get('currency') or 'INR').strip()
                raw_data = inv.get('raw_data') or {}

                with transaction.atomic():
                    # Check if already exists for this integration + company + guid
                    invoice_obj, was_created = TallyInvoice.objects.update_or_create(
                        integration=integration,
                        tally_company_identifier=company_identifier,
                        tally_guid=tally_guid,
                        defaults={
                            'tally_alter_id': tally_alter_id,
                            'voucher_number': voucher_number,
                            'voucher_type': voucher_type,
                            'date': inv_date,
                            'party_name': party_name,
                            'party_ledger_id': party_ledger_id,
                            'gstin': gstin,
                            'state': state_val,
                            'billing_address': billing_addr,
                            'shipping_address': shipping_addr,
                            'reference_number': ref_no,
                            'reference_date': ref_date,
                            'subtotal': subtotal,
                            'cgst_amount': cgst,
                            'sgst_amount': sgst,
                            'igst_amount': igst,
                            'cess_amount': cess,
                            'total_tax': total_tax,
                            'total_amount': total_amount,
                            'currency': currency,
                            'narration': narration,
                            'sync_status': 'synced',
                            'raw_data': raw_data,
                        }
                    )

                    # Update line items: Clear previous items and rebuild to match exact current state
                    invoice_obj.items.all().delete()
                    items_data = inv.get('items', [])
                    items_to_create = []
                    for it in items_data:
                        items_to_create.append(
                            TallyInvoiceItem(
                                invoice=invoice_obj,
                                item_name=str(it.get('item_name') or 'Item').strip(),
                                item_description=str(it.get('item_description') or '').strip(),
                                hsn_code=str(it.get('hsn_code') or '').strip(),
                                quantity=float(it.get('quantity') or 0.0),
                                unit=str(it.get('unit') or 'Nos').strip(),
                                rate=float(it.get('rate') or 0.0),
                                discount_percent=float(it.get('discount_percent') or 0.0),
                                discount_amount=float(it.get('discount_amount') or 0.0),
                                taxable_amount=float(it.get('taxable_amount') or 0.0),
                                cgst_rate=float(it.get('cgst_rate') or 0.0),
                                cgst_amount=float(it.get('cgst_amount') or 0.0),
                                sgst_rate=float(it.get('sgst_rate') or 0.0),
                                sgst_amount=float(it.get('sgst_amount') or 0.0),
                                igst_rate=float(it.get('igst_rate') or 0.0),
                                igst_amount=float(it.get('igst_amount') or 0.0),
                                cess_amount=float(it.get('cess_amount') or 0.0),
                                total_amount=float(it.get('total_amount') or 0.0),
                                ledger_name=str(it.get('ledger_name') or '').strip(),
                            )
                        )
                    if items_to_create:
                        TallyInvoiceItem.objects.bulk_create(items_to_create)

                if was_created:
                    created_count += 1
                else:
                    updated_count += 1

            except Exception as e:
                failed_count += 1
                errors.append(f"Voucher {inv.get('voucher_number')}: {str(e)}")

        # Finish sync log
        sync_log.records_created = created_count
        sync_log.records_updated = updated_count
        sync_log.records_failed = failed_count
        sync_log.error_details = "\n".join(errors[:20])
        sync_log.status = 'success' if failed_count == 0 else ('partial' if (created_count + updated_count) > 0 else 'failed')
        sync_log.completed_at = timezone.now()
        sync_log.save()

        # Update integration
        integration.last_sync_at = timezone.now()
        if company_name and not integration.tally_company_name:
            integration.tally_company_name = company_name
            integration.tally_company_identifier = company_identifier
        integration.save(update_fields=['last_sync_at', 'tally_company_name', 'tally_company_identifier'])

        # Update sync job if provided
        if job_id:
            TallySyncJob.objects.filter(id=job_id).update(status='completed', updated_at=timezone.now())

        return Response({
            'status': 'success',
            'processed': len(invoices_data),
            'created': created_count,
            'updated': updated_count,
            'failed': failed_count,
            'sync_log_id': sync_log.id
        })


class DownloadConnectorView(View):
    def get(self, request, *args, **kwargs):
        import os
        from django.conf import settings
        from django.http import FileResponse, Http404

        want_exe = request.GET.get('format', '').lower() in ('exe', 'binary') or request.GET.get('type', '').lower() == 'exe'
        if want_exe:
            candidate_paths = [
                os.path.join(str(settings.BASE_DIR.parent), 'connector', 'dist', 'TallyConnector.exe'),
                os.path.join(str(settings.BASE_DIR), 'connector', 'dist', 'TallyConnector.exe'),
                os.path.join(str(settings.BASE_DIR.parent), 'crm-project-frontend', 'public', 'connector', 'TallyConnector.exe'),
                os.path.join(str(settings.BASE_DIR.parent), 'crm-project-frontend', 'dist', 'connector', 'TallyConnector.exe'),
            ]
            for cp in candidate_paths:
                if os.path.exists(cp):
                    return FileResponse(open(cp, 'rb'), as_attachment=True, filename='TallyConnector.exe', content_type='application/vnd.microsoft.portable-executable')
            raise Http404("TallyConnector.exe executable not found on server")

        candidate_py_paths = [
            os.path.join(str(settings.BASE_DIR.parent), 'connector', 'tally_connector.py'),
            os.path.join(str(settings.BASE_DIR), 'connector', 'tally_connector.py'),
            os.path.join(str(settings.BASE_DIR.parent), 'crm-project-frontend', 'public', 'connector', 'tally_connector.py'),
        ]
        for cp in candidate_py_paths:
            if os.path.exists(cp):
                return FileResponse(open(cp, 'rb'), as_attachment=True, filename='tally_connector.py', content_type='text/x-python')

        raise Http404("Connector script not found")


class ClearTestDataView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        integration = get_or_create_integration_for_user(request.user)
        deleted_invs, _ = TallyInvoice.objects.filter(integration=integration).delete()
        TallySyncLog.objects.filter(integration=integration).delete()
        TallySyncJob.objects.filter(integration=integration).delete()
        return Response({
            'message': f'Cleared {deleted_invs} invoice records and sync history successfully.'
        })
