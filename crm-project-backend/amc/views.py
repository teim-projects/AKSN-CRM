from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
from .models import AMCContract, AMCStatus, AMCCycle
from .serializers import AMCContractSerializer


class AMCContractViewSet(viewsets.ModelViewSet):
    queryset = AMCContract.objects.all().order_by('-updated_at', '-created_at')
    serializer_class = AMCContractSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, OrderingFilter]
    filterset_fields = ['customer', 'project', 'support_coordinator', 'status', 'amc_type', 'payment_frequency']
    search_fields = ['contract_id', 'customer__company_name', 'customer__name', 'product', 'project__project_code']
    ordering_fields = ['created_at', 'start_date', 'end_date', 'annual_value', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        # Synchronize cycle dates and active statuses for fetched contracts
        for amc in qs[:50]:
            amc.sync_active_cycle_data()
        return qs

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        amc = self.get_object()
        if amc.status == AMCStatus.INACTIVE:
            amc.status = AMCStatus.ACTIVE
            for c in amc.cycles.all():
                if c.status == AMCStatus.INACTIVE:
                    c.status = AMCStatus.ACTIVE
                    c.save(update_fields=['status'])
        else:
            amc.status = AMCStatus.INACTIVE
            for c in amc.cycles.all():
                c.status = AMCStatus.INACTIVE
                c.save(update_fields=['status'])
        amc.save()
        amc.sync_active_cycle_data()
        serializer = self.get_serializer(amc)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='renew')
    def renew_contract(self, request, pk=None):
        amc = self.get_object()
        new_start_date = request.data.get("new_start_date")
        new_end_date = request.data.get("new_end_date")
        new_annual_value = request.data.get("new_annual_value", amc.annual_value)
        payment_frequency = request.data.get("payment_frequency", amc.payment_frequency)
        remarks = request.data.get("remarks", "")

        if not new_start_date or not new_end_date:
            return Response(
                {"error": "Both new_start_date and new_end_date are required for renewal."},
                status=status.HTTP_400_BAD_REQUEST
            )

        start_date_obj = parse_date(str(new_start_date)) if isinstance(new_start_date, str) else new_start_date
        end_date_obj = parse_date(str(new_end_date)) if isinstance(new_end_date, str) else new_end_date

        if not start_date_obj or not end_date_obj:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        today = timezone.now().date()
        if start_date_obj > today:
            cycle_status = AMCStatus.SCHEDULED
        elif (end_date_obj - today).days <= 30 and end_date_obj >= today:
            cycle_status = AMCStatus.EXPIRING_SOON
        elif end_date_obj < today:
            cycle_status = AMCStatus.EXPIRED
        else:
            cycle_status = AMCStatus.ACTIVE

        with transaction.atomic():
            last_cycle = amc.cycles.order_by('-cycle_number').first()
            next_cycle_num = (last_cycle.cycle_number + 1) if last_cycle else 1

            AMCCycle.objects.create(
                amc_contract=amc,
                cycle_number=next_cycle_num,
                start_date=start_date_obj,
                end_date=end_date_obj,
                annual_value=new_annual_value,
                payment_frequency=payment_frequency,
                status=cycle_status,
                remarks=remarks,
                created_by=request.user if request.user.is_authenticated else None
            )

            amc.sync_active_cycle_data()

        serializer = self.get_serializer(amc)
        return Response(serializer.data, status=status.HTTP_200_OK)


