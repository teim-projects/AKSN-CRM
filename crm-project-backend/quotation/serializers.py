from rest_framework import serializers
from django.db import transaction
from decimal import Decimal

from .models import (
    Quotation,
    QuotationVersion,
    QuotationItem
)


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = "__all__"
        read_only_fields = ("quotation_version", "base_amount", "gst_amount", "total_with_gst")


class QuotationVersionSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True)
    version_label = serializers.SerializerMethodField()

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


class QuotationSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(
        source="lead.company_name", read_only=True
    )
    lead_contact = serializers.CharField(
        source="lead.mobile_number", read_only=True
    )
    versions = QuotationVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Quotation
        fields = "__all__"
        read_only_fields = ("quotation_no", "created_by", "created_at", "updated_at")

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
        validated_data.pop('created_by', None)

        # Create quotation
        quotation = Quotation.objects.create(
            **validated_data,
            created_by=request.user if request else None
        )

        # Create version
        version = QuotationVersion.objects.create(
            quotation=quotation,
            gst_type=validated_data.get("gst_type", "CGST_SGST"),
            is_active=True,
            created_by=request.user if request else None
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
        validated_data.pop('created_by', None)

        # Update quotation fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
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
            is_active=True,
            created_by=request.user if request else None
        )

        # Calculate totals and create items
        self.calculate_totals(new_version, items_data)

        return instance


# Serializer for creating with items
# Serializer for creating with items
class QuotationCreateSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, write_only=True)

    class Meta:
        model = Quotation
        fields = "__all__"
        read_only_fields = ("quotation_no", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context.get("request")
        items_data = validated_data.pop("items", [])
        
        if not items_data:
            raise serializers.ValidationError({"items": "At least one item is required"})

        # ✅ Remove created_by from validated_data if it exists
        validated_data.pop('created_by', None)

        quotation = Quotation.objects.create(
            **validated_data,
            created_by=request.user if request else None
        )

        version = QuotationVersion.objects.create(
            quotation=quotation,
            gst_type=validated_data.get("gst_type", "CGST_SGST"),
            is_active=True,
            created_by=request.user if request else None
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
        validated_data.pop('created_by', None)

        # Update quotation fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
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
            is_active=True,
            created_by=request.user if request else None
        )

        # Calculate totals and create items
        self.calculate_totals(new_version, items_data)

        return instance

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