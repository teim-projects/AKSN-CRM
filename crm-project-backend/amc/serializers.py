from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from lead_management.serializers import CustomerSerializer, ProjectSerializer
from api.serializers import CustomUserDetailsSerializer
from .models import AMCContract, AMCCycle, AMCStatus

User = get_user_model()


class AMCCycleSerializer(serializers.ModelSerializer):
    created_by_details = CustomUserDetailsSerializer(source="created_by", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_frequency_display = serializers.CharField(source="get_payment_frequency_display", read_only=True)

    class Meta:
        model = AMCCycle
        fields = "__all__"


def _resolve_amc_product_name(val):
    if not val:
        return ""
    val_str = str(val).strip()
    if val_str.isdigit():
        from product_management.models import Product
        p_obj = Product.objects.filter(id=int(val_str)).first()
        return p_obj.name if p_obj else ""
    if val_str.lower() in ("product", "null", "undefined", "none"):
        return ""
    return val_str


class AMCContractSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source="customer", read_only=True)
    project_details = ProjectSerializer(source="project", read_only=True)
    support_coordinator_details = CustomUserDetailsSerializer(
        source="support_coordinator",
        read_only=True
    )
    created_by_details = CustomUserDetailsSerializer(
        source="created_by",
        read_only=True
    )
    cycles = AMCCycleSerializer(many=True, read_only=True)
    amc_type_display = serializers.CharField(source="get_amc_type_display", read_only=True)
    payment_frequency_display = serializers.CharField(source="get_payment_frequency_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AMCContract
        fields = "__all__"
        read_only_fields = ('id', 'contract_id', 'created_at', 'updated_at')

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        if user and "created_by" not in validated_data:
            validated_data["created_by"] = user

        if "product" in validated_data:
            validated_data["product"] = _resolve_amc_product_name(validated_data["product"])

        start_date = validated_data.get("start_date")
        end_date = validated_data.get("end_date")
        annual_value = validated_data.get("annual_value", 0.00)
        payment_frequency = validated_data.get("payment_frequency", "quarterly")

        amc = AMCContract.objects.create(**validated_data)

        # Create initial Cycle #1
        if start_date and end_date:
            today = timezone.now().date()
            if start_date > today:
                st = AMCStatus.SCHEDULED
            elif (end_date - today).days <= 30 and end_date >= today:
                st = AMCStatus.EXPIRING_SOON
            elif end_date < today:
                st = AMCStatus.EXPIRED
            else:
                st = AMCStatus.ACTIVE

            AMCCycle.objects.create(
                amc_contract=amc,
                cycle_number=1,
                start_date=start_date,
                end_date=end_date,
                annual_value=annual_value,
                payment_frequency=payment_frequency,
                status=st,
                remarks="Initial Contract Cycle",
                created_by=user
            )
            amc.sync_active_cycle_data()

        return amc

    @transaction.atomic
    def update(self, instance, validated_data):
        if "product" in validated_data:
            validated_data["product"] = _resolve_amc_product_name(validated_data["product"])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update active cycle if dates/annual value changed on header
        active_cycle = instance.cycles.filter(status__in=[AMCStatus.ACTIVE, AMCStatus.EXPIRING_SOON, AMCStatus.SCHEDULED]).order_by('-cycle_number').first()
        if active_cycle:
            if "start_date" in validated_data and validated_data["start_date"]:
                active_cycle.start_date = validated_data["start_date"]
            if "end_date" in validated_data and validated_data["end_date"]:
                active_cycle.end_date = validated_data["end_date"]
            if "annual_value" in validated_data:
                active_cycle.annual_value = validated_data["annual_value"]
            if "payment_frequency" in validated_data:
                active_cycle.payment_frequency = validated_data["payment_frequency"]
            active_cycle.save()

        instance.sync_active_cycle_data()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.product:
            data["product"] = _resolve_amc_product_name(instance.product)
        return data


