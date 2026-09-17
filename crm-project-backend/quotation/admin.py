from django.contrib import admin
from .models import BillingDetail, Quotation, QuotationVersion, TermCategory, TermsConditions

@admin.register(BillingDetail)
class BillingDetailAdmin(admin.ModelAdmin):
    list_display = ('bank_name', 'account_holder_name', 'account_number', 'account_type', 'ifsc_code', 'upi_id', 'is_default', 'is_active', 'created_at')
    list_filter = ('is_default', 'is_active', 'account_type')
    search_fields = ('bank_name', 'account_holder_name', 'account_number', 'ifsc_code', 'upi_id')
