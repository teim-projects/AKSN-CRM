from rest_framework import serializers
from django.db import transaction
import random
from datetime import datetime

from .models import (
    Quotation,
    QuotationVersion,
    QuotationHighSideItem,
    QuotationLowSideItem,
)
from .models import ServiceMaster, QuotationServiceItem

# =====================================================
# HIGH SIDE SERIALIZER - Decoupled
# =====================================================
class QuotationHighSideItemSerializer(serializers.ModelSerializer):
    # Read from product_data JSON
    product_id = serializers.IntegerField(source="product_data.id", read_only=True)
    product_name = serializers.CharField(source="product_data.name", read_only=True)
    product_sku = serializers.CharField(source="product_data.sku", read_only=True)
    product_category = serializers.CharField(source="product_data.category", read_only=True)

    class Meta:
        model = QuotationHighSideItem
        fields = "__all__"
        read_only_fields = ("quotation_version", "base_amount", "gst_amount", "total_with_gst")


# =====================================================
# LOW SIDE SERIALIZER - Decoupled
# =====================================================
class QuotationLowSideItemSerializer(serializers.ModelSerializer):
    # Read from item_data JSON
    item_code = serializers.CharField(source="item_data.item_code", read_only=True)
    item_name = serializers.CharField(source="item_data.name", read_only=True)

    class Meta:
        model = QuotationLowSideItem
        fields = "__all__"
        read_only_fields = ("quotation_version", "base_amount", "gst_amount", "total_with_gst")


# =====================================================
# VERSION SERIALIZER
# =====================================================
class QuotationVersionSerializer(serializers.ModelSerializer):
    high_side_items = QuotationHighSideItemSerializer(many=True)
    low_side_items = QuotationLowSideItemSerializer(many=True)
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
        return f"{obj.quotation.quotation_no}-R{obj.version_no}"    


# =====================================================
# MAIN QUOTATION SERIALIZER
# =====================================================
class QuotationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.name", read_only=True
    )
    customer_contact = serializers.CharField(
        source="customer.contact_number", read_only=True
    )
    
    # Removed branch and site fields

    versions = QuotationVersionSerializer(many=True)
    
    # Removed terms_conditions fields

    class Meta:
        model = Quotation
        fields = "__all__"
        read_only_fields = ("quotation_no",)

    # =====================================================
    # 🔥 CORE CALCULATION ENGINE
    # =====================================================
    def calculate_totals(self, version, high_items, low_items):
        version_subtotal = 0
        version_gst_total = 0
    
        # =============================
        # HIGH SIDE
        # =============================
        for item in high_items:
            qty = item["quantity"]
            price = item["unit_price"]
            gst_percent = item.get("gst_percent", 0)
            mathadi = item.get("mathadi_charges", 0)
            transport = item.get("transportation_charges", 0)
    
            base_amount = qty * price
            gst_value = (base_amount * gst_percent) / 100
            total_with_gst = base_amount + gst_value + mathadi + transport
    
            version_subtotal += base_amount + mathadi + transport
            version_gst_total += gst_value
    
            QuotationHighSideItem.objects.create(
                quotation_version=version,
                base_amount=base_amount,
                gst_amount=gst_value,
                total_with_gst=total_with_gst,
                **item
            )
    
        # =============================
        # LOW SIDE
        # =============================
        for item in low_items:
            qty = item["quantity"]
            price = item["unit_price"]
            gst_percent = item.get("gst_percent", 0)
            mathadi = item.get("mathadi_charges", 0)
    
            base_amount = qty * price
            gst_value = (base_amount * gst_percent) / 100
            total_with_gst = base_amount + gst_value + mathadi
    
            version_subtotal += base_amount + mathadi
            version_gst_total += gst_value
    
            QuotationLowSideItem.objects.create(
                quotation_version=version,
                base_amount=base_amount,
                gst_amount=gst_value,
                total_with_gst=total_with_gst,
                **item
            )
    
        # =============================
        # GST SPLIT
        # =============================
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

    # =====================================================
    # CREATE
    # =====================================================
    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        versions_data = validated_data.pop("versions")
        # Removed terms_conditions
    
        version_data = versions_data[0]
        high_items = version_data.pop("high_side_items")
        low_items = version_data.pop("low_side_items")
        
        # Validate that we have at least one item
        if not high_items and not low_items:
            raise serializers.ValidationError("At least one item is required")
    
        # ======================================
        # STEP 1️⃣ CREATE QUOTATION FIRST
        # ======================================
        quotation = Quotation.objects.create(
            quotation_no="TEMP",
            **validated_data
        )
        
        # Removed terms_conditions set
    
        # ======================================
        # STEP 2️⃣ BUILD NUMBER USING DB ID
        # ======================================
        now = datetime.now()
        year = str(now.year)[-2:]
        month = str(now.month).zfill(2)
        
        # Try to get AC type from first high side item if exists
        ac_code = "GEN"
        if high_items and high_items[0].get("product_data"):
            product_name = high_items[0]["product_data"].get("name", "")
            ac_code = product_name[:3].upper() if product_name else "GEN"
    
        quotation_no = f"KA/{ac_code}/{year}/{month}{quotation.id}"
        quotation.quotation_no = quotation_no
        quotation.save(update_fields=["quotation_no"])
    
        # ======================================
        # CREATE VERSION
        # ======================================
        version_no = f"{quotation.quotation_no}-R1"
        
        version = QuotationVersion.objects.create(
            quotation=quotation,
            version_no=version_no,
            is_active=True,
            created_by=request.user if request else None,
            **version_data
        )        
        
        self.calculate_totals(version, high_items, low_items)
    
        return quotation
    
    # =====================================================
    # UPDATE (CREATE NEW VERSION)
    # =====================================================
    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        versions_data = validated_data.pop("versions")
        # Removed terms_conditions
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Removed terms_conditions update
        
        old_version = instance.versions.filter(is_active=True).first()
        
        if old_version:
            old_version.is_active = False
            old_version.save()
            
            current_r = int(old_version.version_no.split("-R")[-1])
            next_r = current_r + 1
        else:
            next_r = 1
        
        new_version_no = f"{instance.quotation_no}-R{next_r}"

        version_data = versions_data[0]
        high_items = version_data.pop("high_side_items")
        low_items = version_data.pop("low_side_items")

        new_version = QuotationVersion.objects.create(
            quotation=instance,
            version_no=new_version_no,
            is_active=True,
            created_by=request.user if request else None,
            **version_data
        )

        self.calculate_totals(new_version, high_items, low_items)

        return instance


class ServiceMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceMaster
        fields = '__all__'


class QuotationServiceItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_type = serializers.CharField(source='service.service_type', read_only=True)
    category_name = serializers.CharField(source='service.category', read_only=True)
    subcategory_name = serializers.CharField(source='service.subcategory', read_only=True)
    
    class Meta:
        model = QuotationServiceItem
        fields = '__all__'
        read_only_fields = ['base_amount', 'gst_amount', 'total_with_gst']


class QuotationServiceItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationServiceItem
        fields = ['quotation_version', 'service', 'quantity', 'unit_price', 'description', 'gst_percentage', 'mathadi_charges', 'transportation_charges']
    
    def create(self, validated_data):
        service = validated_data['service']
        validated_data['unit'] = service.unit
        return super().create(validated_data)