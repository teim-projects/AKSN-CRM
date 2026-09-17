from rest_framework import serializers
from django.db import transaction
from decimal import Decimal

from .models import (
    Quotation,
    QuotationVersion,
    QuotationItem,
    TermCategory,
    TermsConditions,
    BillingDetail,
)



class TermsConditionsSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = TermsConditions
        fields = [
            'id', 'name', 'description', 'category', 'category_name',
            'is_default', 'is_active', 'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TermCategorySerializer(serializers.ModelSerializer):
    terms = TermsConditionsSerializer(many=True, read_only=True)
    terms_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TermCategory
        fields = [
            'id', 'name', 'description', 'is_active', 'sort_order',
            'terms', 'terms_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TermCategoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TermCategory
        fields = ['id', 'name', 'description', 'is_active', 'sort_order']


class TermsConditionsCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TermsConditions
        fields = ['id', 'name', 'description', 'category', 'is_default', 'is_active', 'sort_order']


class BillingDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = BillingDetail
        fields = [
            'id', 'account_holder_name', 'bank_name', 'account_number',
            'account_type', 'ifsc_code', 'branch_name', 'upi_id',
            'qr_code', 'qr_code_url', 'swift_code', 'company_name',
            'gst_number', 'pan_number', 'notes', 'is_default', 'is_active',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return name if name else (obj.created_by.email or str(obj.created_by))
        return None

    def get_qr_code_url(self, obj):
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None







def filter_active_terms(raw_terms):
    """
    Ensure any term deleted or deactivated in TermsConditions/TermCategory
    is excluded from terms_and_conditions, and update to the latest master name & description.
    """
    if not raw_terms or not isinstance(raw_terms, list):
        return []

    active_terms_qs = TermsConditions.objects.filter(is_active=True, category__is_active=True).select_related('category')
    active_by_id = {t.id: t for t in active_terms_qs}
    active_by_name = {t.name.strip().lower(): t for t in active_terms_qs}

    valid_terms = []
    for term in raw_terms:
        if not isinstance(term, dict):
            continue
        term_id = term.get('id')
        term_name = str(term.get('name') or '').strip()
        
        matched_obj = None
        if term_id is not None:
            try:
                matched_obj = active_by_id.get(int(term_id))
            except (ValueError, TypeError):
                pass
        if not matched_obj and term_name:
            matched_obj = active_by_name.get(term_name.lower())

        if matched_obj:
            valid_terms.append({
                'id': matched_obj.id,
                'category_id': matched_obj.category_id,
                'category_name': matched_obj.category.name if matched_obj.category else term.get('category_name', ''),
                'name': matched_obj.name,
                'description': matched_obj.description if matched_obj.description else term.get('description', ''),
            })
    return valid_terms


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = "__all__"
        read_only_fields = ("quotation_version", "base_amount", "gst_amount", "total_with_gst")


class QuotationVersionSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True)
    version_label = serializers.SerializerMethodField()
    quotation_for = serializers.CharField(source="quotation.quotation_for", read_only=True)

    class Meta:
        model = QuotationVersion
        fields = "__all__"
        read_only_fields = (
            "quotation",
            "version_no",
            "is_active",
            "created_by",
            "subtotal",
            "cgst_amount",
            "sgst_amount",
            "igst_amount",
            "gst_amount",
            "total_amount",
            "grand_total",
        )

    def get_version_label(self, obj):
        return obj.version_no

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'terms_and_conditions' in data:
            data['terms_and_conditions'] = filter_active_terms(data.get('terms_and_conditions'))
        return data


class QuotationSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(
        source="lead.company_name", read_only=True
    )
    lead_contact = serializers.CharField(
        source="lead.mobile_number", read_only=True
    )
    lead_email = serializers.CharField(
        source="lead.email_address", read_only=True
    )
    billing_detail_info = BillingDetailSerializer(source="billing_detail", read_only=True)
    versions = QuotationVersionSerializer(many=True, read_only=True)
    quotation_for = serializers.ChoiceField(
        choices=Quotation.QUOTATION_FOR_CHOICES,
        required=True,
        error_messages={
            "required": "Quotation For (Ahilyanagar or Pune) is mandatory.",
            "invalid_choice": "Select a valid location: Ahilyanagar or Pune."
        }
    )

    class Meta:
        model = Quotation
        fields = "__all__"
        read_only_fields = ("quotation_no", "created_by", "created_at", "updated_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'terms_and_conditions' in data:
            data['terms_and_conditions'] = filter_active_terms(data.get('terms_and_conditions'))
        return data

    def calculate_totals(self, version, items_data):
        """Calculate all totals for the version"""
        version_subtotal = 0
        version_gst_total = 0

        for item_data in items_data:
            qty = Decimal(str(item_data.get("quantity", 1)))
            price = Decimal(str(item_data.get("unit_price", 0)))
            gst_percent = Decimal(str(item_data.get("gst_percentage", 18)))

            base_amount = qty * price
            gst_value = (base_amount * gst_percent) / 100
            total_with_gst = base_amount + gst_value

            version_subtotal += base_amount
            version_gst_total += gst_value

            # Create the item with calculated values
            QuotationItem.objects.create(
                quotation_version=version,
                base_amount=base_amount,
                gst_amount=gst_value,
                total_with_gst=total_with_gst,
                **item_data
            )

        # GST Split
        if version.gst_type == "CGST_SGST":
            version.cgst_amount = version_gst_total / 2
            version.sgst_amount = version_gst_total / 2
            version.igst_amount = 0
        else:
            version.igst_amount = version_gst_total
            version.cgst_amount = 0
            version.sgst_amount = 0

        version.subtotal = version_subtotal
        version.gst_amount = version_gst_total
        version.total_amount = version_subtotal + version_gst_total
        version.grand_total = version.total_amount
        version.save()

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        items_data = validated_data.pop("items", [])
        
        # Validate at least one item
        if not items_data:
            raise serializers.ValidationError({"items": "At least one item is required"})

        # ✅ Remove created_by from validated_data if it exists
        user = validated_data.pop('created_by', None) or (request.user if request else None)

        # Create quotation
        quotation = Quotation.objects.create(
            **validated_data,
            created_by=user
        )

        # Create version
        version = QuotationVersion.objects.create(
            quotation=quotation,
            gst_type=validated_data.get("gst_type", "CGST_SGST"),
            terms_and_conditions=validated_data.get("terms_and_conditions", []),
            is_active=True,
            created_by=user
        )

        # Calculate totals and create items
        self.calculate_totals(version, items_data)

        return quotation

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        items_data = validated_data.pop("items", [])
        
        if not items_data:
            raise serializers.ValidationError({"items": "At least one item is required"})

        # ✅ Remove created_by from validated_data if it exists
        user = validated_data.pop('created_by', None) or (request.user if request else None)

        # Update quotation fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.is_finalized = False
        instance.save()

        # Deactivate old version
        old_version = instance.versions.filter(is_active=True).first()
        if old_version:
            old_version.is_active = False
            old_version.save()

        # Create new version
        new_version = QuotationVersion.objects.create(
            quotation=instance,
            gst_type=validated_data.get("gst_type", instance.gst_type),
            terms_and_conditions=instance.terms_and_conditions,
            is_active=True,
            created_by=user
        )

        # Calculate totals and create items
        self.calculate_totals(new_version, items_data)

        return instance


# Serializer for creating with items
class QuotationCreateSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, write_only=True)
    quotation_for = serializers.ChoiceField(
        choices=Quotation.QUOTATION_FOR_CHOICES,
        required=True,
        error_messages={
            "required": "Quotation For (Ahilyanagar or Pune) is mandatory.",
            "invalid_choice": "Select a valid location: Ahilyanagar or Pune."
        }
    )

    class Meta:
        model = Quotation
        fields = "__all__"
        read_only_fields = ("quotation_no", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context.get("request")
        items_data = validated_data.pop("items", [])
        
        if not items_data:
            raise serializers.ValidationError({"items": "At least one item is required"})

        # ✅ Auto-fallback contact info from lead if missing
        lead_obj = validated_data.get('lead')
        if lead_obj:
            if not validated_data.get('email_address') and getattr(lead_obj, 'email_address', None):
                validated_data['email_address'] = lead_obj.email_address
            if not validated_data.get('mobile_number') and getattr(lead_obj, 'mobile_number', None):
                validated_data['mobile_number'] = lead_obj.mobile_number
            if not validated_data.get('contact_person') and getattr(lead_obj, 'contact_person', None):
                validated_data['contact_person'] = lead_obj.contact_person

        user = validated_data.pop('created_by', None) or (request.user if request else None)

        quotation = Quotation.objects.create(
            **validated_data,
            created_by=user
        )

        version = QuotationVersion.objects.create(
            quotation=quotation,
            gst_type=validated_data.get("gst_type", "CGST_SGST"),
            terms_and_conditions=validated_data.get("terms_and_conditions", []),
            is_active=True,
            created_by=user
        )

        # Calculate totals and create items
        self.calculate_totals(version, items_data)

        return quotation

    def update(self, instance, validated_data):
        """✅ ADD THIS METHOD - Creates new version on update"""
        request = self.context.get("request")
        items_data = validated_data.pop("items", [])
        
        if not items_data:
            raise serializers.ValidationError({"items": "At least one item is required"})

        # ✅ Remove created_by from validated_data if it exists
        user = validated_data.pop('created_by', None) or (request.user if request else None)

        # Update quotation fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.is_finalized = False
        instance.save()

        # Deactivate old version
        old_version = instance.versions.filter(is_active=True).first()
        if old_version:
            old_version.is_active = False
            old_version.save()

        # Create new version
        new_version = QuotationVersion.objects.create(
            quotation=instance,
            gst_type=validated_data.get("gst_type", instance.gst_type),
            terms_and_conditions=instance.terms_and_conditions,
            is_active=True,
            created_by=user
        )

        # Calculate totals and create items
        self.calculate_totals(new_version, items_data)

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'terms_and_conditions' in data:
            data['terms_and_conditions'] = filter_active_terms(data.get('terms_and_conditions'))
        return data

    def calculate_totals(self, version, items_data):
        """Calculate all totals for the version"""
        version_subtotal = 0
        version_gst_total = 0

        for item_data in items_data:
            qty = Decimal(str(item_data.get("quantity", 1)))
            price = Decimal(str(item_data.get("unit_price", 0)))
            gst_percent = Decimal(str(item_data.get("gst_percentage", 18)))

            base_amount = qty * price
            gst_value = (base_amount * gst_percent) / 100
            total_with_gst = base_amount + gst_value

            version_subtotal += base_amount
            version_gst_total += gst_value

            # Create the item with calculated values
            QuotationItem.objects.create(
                quotation_version=version,
                base_amount=base_amount,
                gst_amount=gst_value,
                total_with_gst=total_with_gst,
                **item_data
            )

        # GST Split
        if version.gst_type == "CGST_SGST":
            version.cgst_amount = version_gst_total / 2
            version.sgst_amount = version_gst_total / 2
            version.igst_amount = 0
        else:
            version.igst_amount = version_gst_total
            version.cgst_amount = 0
            version.sgst_amount = 0

        version.subtotal = version_subtotal
        version.gst_amount = version_gst_total
        version.total_amount = version_subtotal + version_gst_total
        version.grand_total = version.total_amount
        version.save()