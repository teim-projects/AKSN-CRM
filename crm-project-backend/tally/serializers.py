from rest_framework import serializers
from .models import TallyIntegration, TallySyncJob, TallySyncLog, TallyInvoice, TallyInvoiceItem


class TallyInvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TallyInvoiceItem
        fields = [
            'id', 'item_name', 'item_description', 'hsn_code',
            'quantity', 'unit', 'rate', 'discount_percent',
            'discount_amount', 'taxable_amount',
            'cgst_rate', 'cgst_amount', 'sgst_rate', 'sgst_amount',
            'igst_rate', 'igst_amount', 'cess_amount',
            'total_amount', 'ledger_name'
        ]


class TallyInvoiceListSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = TallyInvoice
        fields = [
            'id', 'voucher_number', 'voucher_type', 'date',
            'party_name', 'gstin', 'state', 'subtotal',
            'total_tax', 'total_amount', 'currency',
            'sync_status', 'created_at', 'items_count'
        ]


class TallyInvoiceDetailSerializer(serializers.ModelSerializer):
    items = TallyInvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = TallyInvoice
        fields = [
            'id', 'tally_company_identifier', 'tally_guid', 'tally_alter_id',
            'voucher_number', 'voucher_type', 'date',
            'party_name', 'party_ledger_id', 'gstin', 'state',
            'billing_address', 'shipping_address',
            'reference_number', 'reference_date',
            'subtotal', 'cgst_amount', 'sgst_amount', 'igst_amount', 'cess_amount',
            'total_tax', 'total_amount', 'currency', 'narration',
            'sync_status', 'raw_data', 'created_at', 'updated_at',
            'items'
        ]


class TallyIntegrationSerializer(serializers.ModelSerializer):
    total_invoices = serializers.SerializerMethodField()
    is_paired = serializers.SerializerMethodField()

    class Meta:
        model = TallyIntegration
        fields = [
            'id', 'connector_id', 'connector_name', 'status',
            'pairing_code', 'pairing_code_expires_at',
            'tally_company_name', 'tally_company_identifier',
            'available_companies', 'tally_version', 'tally_host',
            'last_connected_at', 'last_sync_at', 'last_error',
            'created_at', 'updated_at', 'total_invoices', 'is_paired'
        ]
        read_only_fields = ['id', 'auth_token', 'created_at', 'updated_at']

    def get_total_invoices(self, obj):
        return obj.invoices.count()

    def get_is_paired(self, obj):
        return bool(obj.auth_token)


class TallySyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TallySyncLog
        fields = '__all__'


class ConnectorPairRequestSerializer(serializers.Serializer):
    pairing_code = serializers.CharField(max_length=50, required=True)
    connector_name = serializers.CharField(max_length=255, required=False, default='Windows PC')
    connector_id = serializers.CharField(max_length=100, required=False, default='')


class ConnectorHeartbeatSerializer(serializers.Serializer):
    is_tally_online = serializers.BooleanField(required=True)
    tally_version = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    companies = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    current_company = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    company_identifier = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    error_message = serializers.CharField(required=False, allow_blank=True, default='')
