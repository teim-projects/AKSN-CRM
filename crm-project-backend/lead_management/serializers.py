from rest_framework import serializers
from .models import (
    lead_management, LeadFollowUp, LeadFAQ, 
    LeadFollowUpFAQAnswer, Customer, LeadSource, IndustryType, 
    Priority, PipelineStage, LeadStatus, Project
)
from api.serializers import CustomUserDetailsSerializer
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()
class CustomerSerializer(serializers.ModelSerializer):
    sales_executive_details = CustomUserDetailsSerializer(
        source="sales_executive",
        read_only=True
    )
    customer_status_display = serializers.CharField(
        source="get_customer_status_display",
        read_only=True
    )
    payment_terms_display = serializers.CharField(
        source="get_payment_terms_display",
        read_only=True
    )
    industry_category_display = serializers.CharField(
        source="get_industry_category_display",
        read_only=True
    )
    has_project = serializers.SerializerMethodField()

    def get_has_project(self, obj):
        return obj.projects.exists()

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ('id', 'customer_code', 'created_at', 'updated_at')

    def validate_contact_number(self, value):
        if value:
            value = value.strip()
            qs = Customer.objects.filter(contact_number=value)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError(
                    "Customer with this contact number already exists."
                )
        return value


class LeadFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadFAQ
        fields = ["id", "question", "is_active", "sort_order"]


class LeadFollowUpFAQAnswerSerializer(serializers.ModelSerializer):
    faq_question = serializers.CharField(source="faq.question", read_only=True)

    class Meta:
        model = LeadFollowUpFAQAnswer
        fields = ["id", "faq", "faq_question", "answer"]
        read_only_fields = ["id", "faq_question"]


class LeadFollowUpSerializer(serializers.ModelSerializer):
    faq_answers = LeadFollowUpFAQAnswerSerializer(many=True, required=False)
    lead_company_name = serializers.CharField(
        source="lead.company_name",
        read_only=True
    )
    # Display fields
    followup_mode_display = serializers.CharField(
        source="get_followup_mode_display", 
        read_only=True
    )
    client_response_display = serializers.CharField(
        source="get_client_response_display", 
        read_only=True
    )
    decision_maker_contacted_display = serializers.CharField(
        source="get_decision_maker_contacted_display", 
        read_only=True
    )
    budget_status_display = serializers.CharField(
        source="get_budget_status_display", 
        read_only=True
    )
    timeline_urgency_display = serializers.CharField(
        source="get_timeline_urgency_display", 
        read_only=True
    )
    pain_point_urgency_display = serializers.CharField(
        source="get_pain_point_urgency_display", 
        read_only=True
    )
    next_followup_mode_display = serializers.CharField(
        source="get_next_followup_mode_display", 
        read_only=True
    )
    current_stage_display = serializers.CharField(
        source="get_current_stage_display", 
        read_only=True
    )
    move_to_stage_display = serializers.CharField(
        source="get_move_to_stage_display", 
        read_only=True
    )

    class Meta:
        model = LeadFollowUp
        fields = [
            "id",
            "followup_number",
            "lead",
            "lead_company_name",
            # Follow-up Details
            "followup_date",
            "followup_time",
            "followup_mode",
            "followup_mode_display",
            # Stage & Response
            "current_stage",
            "current_stage_display",
            "move_to_stage",
            "move_to_stage_display",
            "client_response",
            "client_response_display",
            # Discussion Notes
            "discussion_summary",
            "commitment_client",
            "commitment_us",
            # Qualifying Questions
            "decision_maker_contacted",
            "decision_maker_contacted_display",
            "timeline_urgency",
            "timeline_urgency_display",
            "pain_point_urgency",
            "pain_point_urgency_display",
            "budget_status",
            "budget_status_display",
            "competition",
            "number_of_users",
            "competitors_list",
            # Next Follow-up
            "next_followup_date",
            "next_followup_mode",
            "next_followup_mode_display",
            "additional_remarks",
            "ready_to_send_quotation",
            "products_interested",
            "amount",
            # System fields
            "status",
            "created_by",
            "created_at",
            "faq_answers",
        ]
        read_only_fields = ["id", "followup_number", "created_by", "created_at"]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        faq_data = validated_data.pop("faq_answers", [])
        
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
            
        followup = LeadFollowUp.objects.create(**validated_data)
        
        # ✅ Update lead's products if provided
        if followup.products_interested is not None:
            lead = followup.lead
            lead.product_interested = followup.products_interested
            lead.save(update_fields=['product_interested'])
        
        for item in faq_data:
            LeadFollowUpFAQAnswer.objects.create(followup=followup, **item)
        
        return followup

    @transaction.atomic
    def update(self, instance, validated_data):
        faq_data = validated_data.pop("faq_answers", None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # ✅ Update lead's products if provided
        if instance.products_interested is not None:
            lead = instance.lead
            lead.product_interested = instance.products_interested
            lead.save(update_fields=['product_interested'])
        
        if faq_data is not None:
            instance.faq_answers.all().delete()
            for item in faq_data:
                LeadFollowUpFAQAnswer.objects.create(followup=instance, **item)
        
        return instance



class LeadSerializer(serializers.ModelSerializer):
    assigned_executive_details = CustomUserDetailsSerializer(
        source="assigned_executive", 
        read_only=True
    )
    created_by_details = CustomUserDetailsSerializer(
        source="created_by", 
        read_only=True
    )
    followups = LeadFollowUpSerializer(many=True, read_only=True)
    ready_to_send_quotation = serializers.SerializerMethodField()

    def get_ready_to_send_quotation(self, obj):
        has_ready_followup = obj.followups.filter(ready_to_send_quotation=True).exists()
        if not has_ready_followup:
            return False

        from quotation.models import Quotation

        if obj.quotations.exists():
            return False

        if obj.mobile_number:
            digits = "".join(filter(str.isdigit, str(obj.mobile_number)))
            if digits:
                for q in Quotation.objects.exclude(mobile_number__isnull=True).exclude(mobile_number=""):
                    q_digits = "".join(filter(str.isdigit, str(q.mobile_number)))
                    if q_digits and (q_digits == digits or (len(digits) >= 10 and len(q_digits) >= 10 and digits[-10:] == q_digits[-10:])):
                        return False

        return True

    # Display fields - now just return the value directly
    lead_source_display = serializers.CharField(source="lead_source", read_only=True)
    industry_type_display = serializers.CharField(source="industry_type", read_only=True)
    priority_display = serializers.CharField(
        source="get_priority_display", 
        read_only=True
    )
    pipeline_stage_display = serializers.CharField(
        source="get_pipeline_stage_display", 
        read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", 
        read_only=True
    )

    class Meta:
        model = lead_management
        fields = [
            "id",
            "enquiry_date",
            "company_name",
            "mobile_number",
            "linkedin_profile_url",
            "state",
            "product_interested",
            "amount",
            "expected_closure_date",
            "lead_source",
            "lead_source_display",
            "contact_person",
            "email_address",
            "city",
            "industry_type",
            "industry_type_display",
            "expected_budget",
            "priority",
            "priority_display",
            "assigned_executive",
            "assigned_executive_details",
            "followup_date",
            "last_followup_date",
            "pipeline_stage",
            "pipeline_stage_display",
            "is_tally_user",
            "tally_number",
            "requirement_details",
            "remarks",
            "status",
            "status_display",
            "gst_number",
            "pan_number",
            "msme_number",
            "address",
            "created_by",
            "created_by_details",
            "created_at",
            "updated_at",
            "converted_to_customer",
            "is_converted",
            "ready_to_send_quotation",
            "followups",
        ]
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def validate_mobile_number(self, value):
        if not value:
            return value

        digits = "".join(filter(str.isdigit, str(value)))
        if not digits:
            return value

        qs = lead_management.objects.exclude(mobile_number__isnull=True).exclude(mobile_number="")
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        for existing_lead in qs:
            existing_digits = "".join(filter(str.isdigit, str(existing_lead.mobile_number)))
            if existing_digits:
                if existing_digits == digits or (
                    len(digits) >= 10 and len(existing_digits) >= 10 and digits[-10:] == existing_digits[-10:]
                ):
                    comp_info = f" (Company: {existing_lead.company_name})" if existing_lead.company_name else ""
                    raise serializers.ValidationError(
                        f"A lead with mobile number '{value}' already exists{comp_info}."
                    )

        return value

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        lead = lead_management.objects.create(**validated_data)
        return lead

    @transaction.atomic
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProjectSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source="customer", read_only=True)
    project_executive_details = CustomUserDetailsSerializer(
        source="project_executive",
        read_only=True
    )
    created_by_details = CustomUserDetailsSerializer(
        source="created_by",
        read_only=True
    )
    project_stage_display = serializers.CharField(
        source="get_project_stage_display",
        read_only=True
    )
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True
    )

    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ('id', 'project_code', 'created_at', 'updated_at')

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated and "created_by" not in validated_data:
            validated_data["created_by"] = request.user
        project = Project.objects.create(**validated_data)
        return project

    @transaction.atomic
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance