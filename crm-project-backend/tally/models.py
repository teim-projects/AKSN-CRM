import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class TallyIntegration(models.Model):
    STATUS_CHOICES = (
        ('disconnected', 'Disconnected'),
        ('pairing', 'Pairing Pending'),
        ('connected', 'Connected'),
        ('offline', 'Offline'),
        ('error', 'Error'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tally_integrations'
    )
    connector_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    connector_name = models.CharField(max_length=255, blank=True, default='')
    pairing_code = models.CharField(max_length=50, blank=True, default='', db_index=True)
    pairing_code_expires_at = models.DateTimeField(null=True, blank=True)
    auth_token = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='disconnected')

    tally_company_name = models.CharField(max_length=255, blank=True, default='')
    tally_company_identifier = models.CharField(max_length=255, blank=True, default='', db_index=True)
    available_companies = models.JSONField(default=list, blank=True, help_text="List of detected Tally companies")
    tally_version = models.CharField(max_length=100, blank=True, default='')
    tally_host = models.CharField(max_length=255, default='http://localhost:9000')

    last_connected_at = models.DateTimeField(null=True, blank=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default='')
    last_checkpoint = models.CharField(max_length=100, blank=True, default='', help_text="Checkpoint AlterID or sync timestamp")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Tally Integration'
        verbose_name_plural = 'Tally Integrations'

    def __str__(self):
        name = self.tally_company_name or self.connector_name or str(self.id)
        return f"{name} ({self.get_status_display()})"

    def is_pairing_valid(self):
        if not self.pairing_code or not self.pairing_code_expires_at:
            return False
        return timezone.now() < self.pairing_code_expires_at


class TallySyncJob(models.Model):
    JOB_TYPES = (
        ('full_sync', 'Full Sync'),
        ('date_range_sync', 'Date Range Sync'),
        ('incremental_sync', 'Incremental Sync'),
        ('company_refresh', 'Company Refresh'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    integration = models.ForeignKey(
        TallyIntegration,
        on_delete=models.CASCADE,
        related_name='sync_jobs'
    )
    job_type = models.CharField(max_length=50, choices=JOB_TYPES, default='full_sync')
    start_date = models.DateField(null=True, blank=True, help_text="Voucher date range start filter")
    end_date = models.DateField(null=True, blank=True, help_text="Voucher date range end filter")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        range_str = f" [{self.start_date} to {self.end_date}]" if (self.start_date or self.end_date) else ""
        return f"Job {self.job_type}{range_str} - {self.status} ({self.created_at})"


class TallySyncLog(models.Model):
    SYNC_TYPES = (
        ('manual', 'Manual'),
        ('automatic', 'Automatic'),
        ('scheduled', 'Scheduled'),
    )
    STATUS_CHOICES = (
        ('running', 'Running'),
        ('success', 'Success'),
        ('partial', 'Partial Success'),
        ('failed', 'Failed'),
    )

    integration = models.ForeignKey(
        TallyIntegration,
        on_delete=models.CASCADE,
        related_name='sync_logs'
    )
    sync_type = models.CharField(max_length=50, choices=SYNC_TYPES, default='manual')
    start_date = models.DateField(null=True, blank=True, help_text="Sync date range start")
    end_date = models.DateField(null=True, blank=True, help_text="Sync date range end")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='running')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    records_processed = models.IntegerField(default=0)
    records_created = models.IntegerField(default=0)
    records_updated = models.IntegerField(default=0)
    records_failed = models.IntegerField(default=0)
    error_details = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Tally Sync Log'
        verbose_name_plural = 'Tally Sync Logs'

    def __str__(self):
        return f"SyncLog {self.integration} [{self.status}] at {self.started_at}"


class TallyInvoice(models.Model):
    integration = models.ForeignKey(
        TallyIntegration,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    tally_company_identifier = models.CharField(max_length=255, db_index=True)
    tally_guid = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Unique Tally GUID / Voucher Master ID"
    )
    tally_alter_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    voucher_number = models.CharField(max_length=150, db_index=True)
    voucher_type = models.CharField(max_length=100, default='Sales')
    date = models.DateField(null=True, blank=True, db_index=True)

    # Party details - Phase 1: STRICTLY RAW STRINGS, NO CRM CUSTOMER FK
    party_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Party name as received from Tally"
    )
    party_ledger_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Tally Ledger GUID for Phase 2 mapping"
    )
    gstin = models.CharField(max_length=50, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    billing_address = models.TextField(blank=True, default='')
    shipping_address = models.TextField(blank=True, default='')

    reference_number = models.CharField(max_length=150, blank=True, default='')
    reference_date = models.DateField(null=True, blank=True)

    # Financial breakdown
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    cgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    cess_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_tax = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=20, default='INR')

    narration = models.TextField(blank=True, default='')
    sync_status = models.CharField(max_length=50, default='synced')
    raw_data = models.JSONField(default=dict, blank=True, help_text="Full raw invoice data for audit/debugging")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = 'Tally Invoice'
        verbose_name_plural = 'Tally Invoices'
        constraints = [
            models.UniqueConstraint(
                fields=['integration', 'tally_company_identifier', 'tally_guid'],
                name='unique_tally_invoice_per_company'
            )
        ]

    def __str__(self):
        return f"{self.voucher_number} - {self.party_name} ({self.total_amount})"


class TallyInvoiceItem(models.Model):
    invoice = models.ForeignKey(
        TallyInvoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    item_name = models.CharField(max_length=255)
    item_description = models.TextField(blank=True, default='')
    hsn_code = models.CharField(max_length=50, blank=True, default='')
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0.000)
    unit = models.CharField(max_length=50, blank=True, default='Nos')
    rate = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    discount_percent = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    taxable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    cgst_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    cgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    sgst_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    igst_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    igst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    cess_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    ledger_name = models.CharField(max_length=255, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'Tally Invoice Item'
        verbose_name_plural = 'Tally Invoice Items'

    def __str__(self):
        return f"{self.item_name} x {self.quantity} {self.unit} ({self.total_amount})"
