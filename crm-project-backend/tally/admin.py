from django.contrib import admin
from .models import TallyIntegration, TallySyncJob, TallySyncLog, TallyInvoice, TallyInvoiceItem


class TallyInvoiceItemInline(admin.TabularInline):
    model = TallyInvoiceItem
    extra = 0
    readonly_fields = ('item_name', 'hsn_code', 'quantity', 'unit', 'rate', 'taxable_amount', 'total_amount')


@admin.register(TallyIntegration)
class TallyIntegrationAdmin(admin.ModelAdmin):
    list_display = ('id', 'tally_company_name', 'connector_name', 'status', 'last_connected_at', 'last_sync_at')
    list_filter = ('status', 'created_at')
    search_fields = ('tally_company_name', 'connector_name', 'pairing_code', 'auth_token')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(TallySyncJob)
class TallySyncJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'integration', 'job_type', 'status', 'created_at')
    list_filter = ('job_type', 'status')


@admin.register(TallySyncLog)
class TallySyncLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'integration', 'sync_type', 'status', 'records_processed', 'records_created', 'records_updated', 'started_at')
    list_filter = ('status', 'sync_type')


@admin.register(TallyInvoice)
class TallyInvoiceAdmin(admin.ModelAdmin):
    list_display = ('voucher_number', 'date', 'party_name', 'total_amount', 'voucher_type', 'sync_status', 'integration')
    list_filter = ('voucher_type', 'sync_status', 'date')
    search_fields = ('voucher_number', 'party_name', 'gstin', 'tally_guid')
    inlines = [TallyInvoiceItemInline]
    readonly_fields = ('created_at', 'updated_at')
