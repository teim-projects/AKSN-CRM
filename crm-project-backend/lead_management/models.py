from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

User = get_user_model()


class LeadSource(models.TextChoices):
    WEBSITE = 'website', 'Website'
    REFERRAL = 'referral', 'Referral'
    COLD_CALL = 'cold_call', 'Cold Call'
    SOCIAL_MEDIA = 'social_media', 'Social Media'
    EMAIL_CAMPAIGN = 'email_campaign', 'Email Campaign'
    EXHIBITION = 'exhibition', 'Exhibition'
    OTHER = 'other', 'Other'


class IndustryType(models.TextChoices):
    IT_SERVICES = 'it_services', 'IT Services'
    MANUFACTURING = 'manufacturing', 'Manufacturing'
    BANKING = 'banking', 'Banking'
    AUTOMOTIVE = 'automotive', 'Automotive'
    HEALTHCARE = 'healthcare', 'Healthcare'
    EDUCATION = 'education', 'Education'
    REAL_ESTATE = 'real_estate', 'Real Estate'
    OTHER = 'other', 'Other'


class Priority(models.TextChoices):
    CRITICAL = 'critical', 'Critical'
    HIGH = 'high', 'High'
    MEDIUM = 'medium', 'Medium'
    LOW = 'low', 'Low'


class PipelineStage(models.TextChoices):
    NEW_LEAD = 'new_lead', 'New Lead'
    CONTACTED = 'contacted', 'Contacted'
    REQUIREMENT_GATHERING = 'requirement_gathering', 'Requirement Gathering'
    DEMO_SCHEDULED = 'demo_scheduled', 'Demo Scheduled'
    DEMO_COMPLETED = 'demo_completed', 'Demo Completed'
    PROPOSAL_SENT = 'proposal_sent', 'Proposal Sent'
    NEGOTIATION = 'negotiation', 'Negotiation'


class LeadStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    CLOSED = 'closed', 'Closed'
    IN_PROCESS = 'in_process', 'In Process'


class CustomerStatus(models.TextChoices):
    PROSPECT = 'prospect', 'Prospect'
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'
    ON_HOLD = 'on_hold', 'On Hold'


class PaymentTerms(models.TextChoices):
    ADVANCE = 'advance', 'Advance'
    PARTIAL = 'partial', 'Partial'
    CREDIT = 'credit', 'Credit'
    MILESTONE = 'milestone', 'Milestone'
    UPON_COMPLETION = 'upon_completion', 'Upon Completion'


class Customer(models.Model):
    # Customer Code (auto-generated)
    customer_code = models.CharField(max_length=20, unique=True, blank=True, null=True, verbose_name="Customer Code")
    
    # COMPANY INFORMATION
    name = models.CharField(max_length=200, verbose_name="Company Name")
    contact_person = models.CharField(max_length=200, blank=True, null=True, verbose_name="Contact Person")
    designation = models.CharField(max_length=100, blank=True, null=True, verbose_name="Designation")
    contact_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Mobile")
    email = models.EmailField(blank=True, null=True, verbose_name="Email")
    website = models.URLField(max_length=500, blank=True, null=True, verbose_name="Website")
    industry_category = models.CharField(
        max_length=50, 
        choices=IndustryType.choices, 
        blank=True, 
        null=True,
        verbose_name="Industry Category"
    )
    gst_number = models.CharField(max_length=15, blank=True, null=True, verbose_name="GST Number")
    pan_number = models.CharField(max_length=10, blank=True, null=True, verbose_name="PAN Number")
    msme_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="MSME Number")  # ✅ NEW
    
    # COMMERCIAL DETAILS
    product_purchased = models.JSONField(blank=True, null=True, default=list, verbose_name="Product Purchased")
    service_package = models.JSONField(blank=True, null=True, default=list, verbose_name="Service Package")
    payment_terms = models.CharField(
        max_length=50,
        choices=PaymentTerms.choices,
        blank=True,
        null=True,
        verbose_name="Payment Terms"
    )
    project_value = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True, verbose_name="Project Value")
    sales_executive = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='customer_sales',
        verbose_name="Sales Executive"
    )
    amc_start_date = models.DateField(blank=True, null=True, verbose_name="AMC Start Date")
    amc_end_date = models.DateField(blank=True, null=True, verbose_name="AMC End Date")
    customer_status = models.CharField(
        max_length=50,
        choices=CustomerStatus.choices,
        default=CustomerStatus.PROSPECT,
        verbose_name="Customer Status"
    )
    
    # ADDRESS (Only Billing Address - no site address as per screenshot)
    billing_address = models.TextField(blank=True, verbose_name="Billing Address")
    city = models.CharField(max_length=100, blank=True, verbose_name="City")
    state = models.CharField(max_length=100, blank=True, verbose_name="State")
    pin_code = models.CharField(max_length=10, blank=True, null=True, verbose_name="Pincode")
    
    # System fields
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def generate_customer_code(self):
        """Generate a unique customer code like C001, C002, etc."""
        last_customer = Customer.objects.all().order_by('-id').first()
        if last_customer and last_customer.customer_code:
            try:
                last_number = int(last_customer.customer_code[1:])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = 1
        else:
            new_number = 1
        return f"C{new_number:03d}"

    def save(self, *args, **kwargs):
        if not self.customer_code:
            self.customer_code = self.generate_customer_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer_code} - {self.name}"

    class Meta:
        ordering = ['customer_code']


class lead_management(models.Model):
    # Basic Information (matching Lead form fields)
    enquiry_date = models.DateField(blank=True, null=True, verbose_name="Lead Date")
    company_name = models.CharField(max_length=255, blank=True, null=True, verbose_name="Company Name")
    mobile_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Mobile Number")
    linkedin_profile_url = models.URLField(max_length=500, blank=True, null=True, verbose_name="LinkedIn Profile URL")
    state = models.CharField(max_length=100, blank=True, null=True, verbose_name="State")
    product_interested = models.JSONField(blank=True, null=True, default=list, verbose_name="Product Interested")
    expected_closure_date = models.DateField(blank=True, null=True, verbose_name="Expected Closure Date")
    lead_source = models.CharField(max_length=50, blank=True, null=True, verbose_name="Lead Source")
    contact_person = models.CharField(max_length=200, blank=True, null=True, verbose_name="Contact Person")
    email_address = models.EmailField(blank=True, null=True, verbose_name="Email Address")
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name="City")
    industry_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="Industry Type")
    expected_budget = models.CharField(max_length=100, blank=True, null=True, verbose_name="Expected Budget")
    priority = models.CharField(max_length=50, choices=Priority.choices, blank=True, null=True, verbose_name="Priority")
    
    # ✅ NEW FIELDS
    gst_number = models.CharField(max_length=15, blank=True, null=True, verbose_name="GST Number")
    pan_number = models.CharField(max_length=10, blank=True, null=True, verbose_name="PAN Number")
    msme_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="MSME Number")

    # Pipeline Information (matching Lead form)
    assigned_executive = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='assigned_leads',
        verbose_name="Assigned Executive"
    )
    followup_date = models.DateField(blank=True, null=True, verbose_name="Follow-up Date")
    pipeline_stage = models.CharField(
        max_length=50, 
        choices=PipelineStage.choices, 
        default=PipelineStage.NEW_LEAD,
        verbose_name="Pipeline Stage"
    )
    is_tally_user = models.CharField(max_length=10, blank=True, null=True, verbose_name="Is Tally User")

    # Requirements & Notes
    requirement_details = models.TextField(blank=True, null=True, verbose_name="Requirement Details")
    remarks = models.TextField(blank=True, null=True, verbose_name="Remarks")

    # System fields
    status = models.CharField(
        max_length=50,
        choices=LeadStatus.choices,
        default=LeadStatus.OPEN,
        verbose_name="Status"
    )
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='lead_created',
        verbose_name="Created By"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    # Lead Qualifying Questions
    is_qualified = models.BooleanField(default=False, verbose_name="Is Qualified")
    qualifying_answers = models.JSONField(blank=True, null=True, default=dict, verbose_name="Qualifying Answers")

    # Relation to Customer (for conversion)
    converted_to_customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='converted_from_lead',
        verbose_name="Converted To Customer"
    )
    is_converted = models.BooleanField(default=False, verbose_name="Is Converted")

    def __str__(self):
        return f"Lead #{self.pk} - {self.company_name or 'No Company'}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Lead"
        verbose_name_plural = "Leads"




class LeadFollowUp(models.Model):
    # Follow-up Modes
    class FollowUpMode(models.TextChoices):
        CALL = 'call', 'Call'
        WHATSAPP = 'whatsapp', 'WhatsApp'
        EMAIL = 'email', 'Email'
        VIDEO_CALL = 'video_call', 'Video Call'
        IN_PERSON = 'in_person', 'In-Person'
        DEMO = 'demo', 'Demo'
        SITE_VISIT = 'site_visit', 'Site Visit'

    # Client Response
    class ClientResponse(models.TextChoices):
        VERY_POSITIVE = 'very_positive', 'Very Positive'
        POSITIVE = 'positive', 'Positive'
        NEUTRAL = 'neutral', 'Neutral'
        NEGATIVE = 'negative', 'Negative'
        NO_RESPONSE = 'no_response', 'No Response'
        CALL_BACK_LATER = 'call_back_later', 'Call Back Later'

    # Decision Maker Contacted
    class DecisionMakerContacted(models.TextChoices):
        YES_FINAL = 'yes_final', 'Yes — Final Decision Maker'
        YES_INFLUENCER = 'yes_influencer', 'Yes — Influencer / Recommender'
        NO_NEED_HIGHER = 'no_need_higher', 'No — Need to Reach Higher'

    # Budget Status
    class BudgetStatus(models.TextChoices):
        APPROVED = 'approved', 'Budget Approved'
        ALLOCATED = 'allocated', 'Budget Allocated (not approved)'
        UNDER_DISCUSSION = 'under_discussion', 'Budget Under Discussion'
        NO_BUDGET = 'no_budget', 'No Budget Yet'
        NOT_DISCLOSED = 'not_disclosed', 'Not Disclosed'

    # Timeline / Urgency
    class TimelineUrgency(models.TextChoices):
        IMMEDIATE = 'immediate', 'Immediate (within 1 month)'
        SHORT_TERM = 'short_term', 'Short-term (1–3 months)'
        MID_TERM = 'mid_term', 'Mid-term (3–6 months)'
        LONG_TERM = 'long_term', 'Long-term (6+ months)'
        NO_CLEAR = 'no_clear', 'No Clear Timeline'

    # Pain Point Urgency
    class PainPointUrgency(models.TextChoices):
        CRITICAL = 'critical', 'Critical — Impacting Business'
        MODERATE = 'moderate', 'Moderate — Manageable but needs fix'
        LOW = 'low', 'Low — Nice to have'

    # Pipeline Stages (extended)
    class PipelineStageExtended(models.TextChoices):
        NEW_LEAD = 'new_lead', 'New Lead'
        CONTACTED = 'contacted', 'Contacted'
        REQUIREMENT_GATHERING = 'requirement_gathering', 'Requirement Gathering'
        DEMO_SCHEDULED = 'demo_scheduled', 'Demo Scheduled'
        DEMO_COMPLETED = 'demo_completed', 'Demo Completed'
        PROPOSAL_SENT = 'proposal_sent', 'Proposal Sent'
        NEGOTIATION = 'negotiation', 'Negotiation'
        WON = 'won', 'Won'
        LOST = 'lost', 'Lost'
        ON_HOLD = 'on_hold', 'On Hold'

    lead = models.ForeignKey(
        lead_management,
        on_delete=models.CASCADE,
        related_name='followups'
    )
    
    # Follow-up Number (per lead)
    followup_number = models.CharField(
        max_length=20, 
        blank=True, 
        null=True, 
        verbose_name="Follow-up Number"
    )
    
    # Follow-up Details
    followup_date = models.DateField(verbose_name="Follow-up Date")
    followup_time = models.TimeField(blank=True, null=True, verbose_name="Follow-up Time")
    followup_mode = models.CharField(
        max_length=50,
        choices=FollowUpMode.choices,
        blank=True,
        null=True,
        verbose_name="Follow-up Mode"
    )
    
    # Stage & Response
    current_stage = models.CharField(
        max_length=50,
        choices=PipelineStageExtended.choices,
        default=PipelineStageExtended.NEW_LEAD,
        verbose_name="Current Stage"
    )
    move_to_stage = models.CharField(
        max_length=50,
        choices=PipelineStageExtended.choices,
        blank=True,
        null=True,
        verbose_name="Move to Next Stage"
    )
    client_response = models.CharField(
        max_length=50,
        choices=ClientResponse.choices,
        blank=True,
        null=True,
        verbose_name="Client Response"
    )
    
    # Discussion Notes
    discussion_summary = models.TextField(blank=True, null=True, verbose_name="Discussion Summary")
    commitment_client = models.TextField(blank=True, null=True, verbose_name="Commitment by Client")
    commitment_us = models.TextField(blank=True, null=True, verbose_name="Commitment by Us")
    products_interested = models.JSONField(
        blank=True, 
        null=True, 
        default=list, 
        verbose_name="Products Interested"
    )
    
    # Qualifying Questions
    decision_maker_contacted = models.CharField(
        max_length=50,
        choices=DecisionMakerContacted.choices,
        blank=True,
        null=True,
        verbose_name="Decision Maker Contacted"
    )
    timeline_urgency = models.CharField(
        max_length=50,
        choices=TimelineUrgency.choices,
        blank=True,
        null=True,
        verbose_name="Timeline / Urgency"
    )
    pain_point_urgency = models.CharField(
        max_length=50,
        choices=PainPointUrgency.choices,
        blank=True,
        null=True,
        verbose_name="Pain Point / Problem Urgency"
    )
    budget_status = models.CharField(
        max_length=50,
        choices=BudgetStatus.choices,
        blank=True,
        null=True,
        verbose_name="Budget Status"
    )
    competition = models.TextField(blank=True, null=True, verbose_name="Competition (Other Vendors Evaluated)")
    number_of_users = models.CharField(max_length=50, blank=True, null=True, verbose_name="Number of Users (Confirmed)")
    competitors_list = models.TextField(blank=True, null=True, verbose_name="e.g. SAP, Zoho, Tally, None")
    
    # Next Follow-up Planning
    next_followup_date = models.DateField(blank=True, null=True, verbose_name="Next Follow-up Date")
    next_followup_mode = models.CharField(
        max_length=50,
        choices=FollowUpMode.choices,
        blank=True,
        null=True,
        verbose_name="Next Follow-up Mode"
    )
    additional_remarks = models.TextField(blank=True, null=True, verbose_name="Additional Remarks")
    
    # Quotation
    ready_to_send_quotation = models.BooleanField(default=False, verbose_name="Ready to send a quotation")
    
    # System fields
    status = models.CharField(
        max_length=50,
        choices=LeadStatus.choices,
        default=LeadStatus.OPEN,
        verbose_name="Status"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lead_followups_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def generate_followup_number(self):
        """Generate a unique follow-up number per lead like F001, F002, etc."""
        # Get all followups for this lead
        lead_followups = LeadFollowUp.objects.filter(lead=self.lead).order_by('-id')
        
        if lead_followups.exists():
            # Get the latest followup number for this lead
            last_followup = lead_followups.first()
            if last_followup and last_followup.followup_number:
                try:
                    last_number = int(last_followup.followup_number[1:])
                    new_number = last_number + 1
                except (ValueError, IndexError):
                    new_number = 1
            else:
                new_number = 1
        else:
            new_number = 1
            
        return f"F{new_number:03d}"

    def save(self, *args, **kwargs):
        if not self.followup_number:
            self.followup_number = self.generate_followup_number()
        super().save(*args, **kwargs)
        
        # Update lead
        lead = self.lead
        lead.status = self.status
        lead.followup_date = self.next_followup_date or self.followup_date
        
        if self.additional_remarks:
            lead.remarks = self.additional_remarks
            
        # Update pipeline stage if move_to_stage is set
        if self.move_to_stage:
            lead.pipeline_stage = self.move_to_stage
            
        # ✅ NEW: Update lead products if provided
        if self.products_interested is not None:
            lead.product_interested = self.products_interested
            lead.save(update_fields=["status", "followup_date", "remarks", "pipeline_stage", "product_interested"])
        else:
            lead.save(update_fields=["status", "followup_date", "remarks"])

    def __str__(self):
        return f"{self.followup_number} - {self.lead.company_name} - {self.followup_date}"

class LeadFAQ(models.Model):
    question = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.question


class LeadFollowUpFAQAnswer(models.Model):
    followup = models.ForeignKey(
        LeadFollowUp,
        on_delete=models.CASCADE,
        related_name='faq_answers'
    )
    faq = models.ForeignKey(
        LeadFAQ,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    answer = models.TextField(blank=True)

    class Meta:
        unique_together = ('followup', 'faq')

    def __str__(self):
        return f"Q: {self.faq.question} | Lead #{self.followup.lead_id}"