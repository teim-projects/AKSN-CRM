from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

User = get_user_model()

# =====================================================
# TERMS & CONDITIONS MODELS (Standalone)
# =====================================================

class TermCategory(models.Model):
    """Category for Terms & Conditions (e.g., Payment Terms, AMC Warranty)"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='term_categories_created'
    )
    
    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = "Term Category"
        verbose_name_plural = "Term Categories"
    
    def __str__(self):
        return self.name
    
    @property
    def terms_count(self):
        return self.terms.filter(is_active=True).count()


class TermsConditions(models.Model):
    """Individual terms under categories"""
    category = models.ForeignKey(
        TermCategory,
        on_delete=models.CASCADE,
        related_name='terms'
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='terms_conditions_created'
    )
    
    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = "Term & Condition"
        verbose_name_plural = "Terms & Conditions"
        unique_together = ['category', 'name']
    
class BillingDetail(models.Model):
    """Company Banking & Billing Details Master (Bank, IFSC, Account, UPI, QR Code)"""
    ACCOUNT_TYPE_CHOICES = (
        ("Current", "Current Account"),
        ("Savings", "Savings Account"),
        ("CC", "Cash Credit (CC)"),
        ("OD", "Overdraft (OD)"),
    )

    account_holder_name = models.CharField(max_length=255, verbose_name="Account Holder Name")
    bank_name = models.CharField(max_length=255, verbose_name="Bank Name")
    account_number = models.CharField(max_length=50, verbose_name="Account Number")
    account_type = models.CharField(max_length=50, choices=ACCOUNT_TYPE_CHOICES, default="Current", verbose_name="Account Type")
    ifsc_code = models.CharField(max_length=20, verbose_name="IFSC Code")
    branch_name = models.CharField(max_length=255, blank=True, null=True, verbose_name="Branch Name")
    
    upi_id = models.CharField(max_length=100, blank=True, null=True, verbose_name="UPI ID")
    qr_code = models.ImageField(upload_to="billing/qr_codes/", blank=True, null=True, verbose_name="QR Code Image")
    
    swift_code = models.CharField(max_length=30, blank=True, null=True, verbose_name="SWIFT / BIC Code")
    company_name = models.CharField(max_length=255, blank=True, null=True, verbose_name="Beneficiary / Company Name")
    gst_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="GSTIN")
    pan_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="PAN Number")
    notes = models.TextField(blank=True, null=True, verbose_name="Payment Instructions / Notes")
    
    is_default = models.BooleanField(default=False, verbose_name="Is Primary / Default")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='billing_details_created'
    )

    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name = "Billing Detail"
        verbose_name_plural = "Billing Details"

    def __str__(self):
        return f"{self.bank_name} - {self.account_number} ({self.account_holder_name})"

    def save(self, *args, **kwargs):
        if self.is_default:
            # When this is marked default, unset default on other billing details
            BillingDetail.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        elif not self.pk and not BillingDetail.objects.filter(is_default=True).exists():
            # If creating first record and none is default, set it as default
            self.is_default = True
        super().save(*args, **kwargs)



class Quotation(models.Model):
    # Quotation Number: AKSN-001, AKSN-002, etc.
    quotation_no = models.CharField(max_length=50, unique=True)
    
    # ✅ Only lead field - removed customer
    lead = models.ForeignKey(
        "lead_management.lead_management",
        on_delete=models.PROTECT,
        related_name="quotations",
        null=True,
        blank=True
    )
    
    # Direct lead fields (can be edited independently)
    company_name = models.CharField(max_length=255, verbose_name="Company Name", null=True, blank=True)
    contact_person = models.CharField(max_length=200, verbose_name="Contact Person", null=True, blank=True)
    mobile_number = models.CharField(max_length=20, verbose_name="Mobile Number", null=True, blank=True)
    email_address = models.EmailField(blank=True, null=True, verbose_name="Email Address")
    linkedin_profile_url = models.URLField(max_length=500, blank=True, null=True, verbose_name="LinkedIn Profile URL")
    state = models.CharField(max_length=100, blank=True, null=True, verbose_name="State")
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name="City")
    industry_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="Industry Type")
    
    # ✅ NEW FIELDS
    gst_number = models.CharField(max_length=15, blank=True, null=True, verbose_name="GST Number")
    pan_number = models.CharField(max_length=10, blank=True, null=True, verbose_name="PAN Number")
    msme_number = models.CharField(max_length=20, blank=True, null=True, verbose_name="MSME Number")
    address = models.TextField(blank=True, null=True, verbose_name="Address")
    terms_and_conditions = models.JSONField(blank=True, null=True, default=list, verbose_name="Terms & Conditions")
    is_finalized = models.BooleanField(default=False, verbose_name="Is Finalized")
    is_dropped = models.BooleanField(default=False, verbose_name="Is Dropped")
    
    # Quotation Details
    billing_detail = models.ForeignKey(
        "BillingDetail",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotations",
        verbose_name="Billing Detail"
    )
    subject = models.CharField(max_length=255, verbose_name="Subject", null=True, blank=True)
    quotation_date = models.DateField(auto_now_add=True, verbose_name="Quotation Date")
    
    # GST Type
    GST_TYPE_CHOICES = (
        ("CGST_SGST", "CGST + SGST"),
        ("IGST", "IGST"),
    )
    gst_type = models.CharField(
        max_length=20,
        choices=GST_TYPE_CHOICES,
        default="CGST_SGST",
        verbose_name="GST Type"
    )
    
    # Quotation For Location (Ahilyanagar or Pune) - Mandatory
    QUOTATION_FOR_CHOICES = (
        ("Ahilyanagar", "Ahilyanagar"),
        ("Pune", "Pune"),
    )
    quotation_for = models.CharField(
        max_length=50,
        choices=QUOTATION_FOR_CHOICES,
        default="Pune",
        verbose_name="Quotation For"
    )
    
    # Thank You Note
    thank_you_note = models.TextField(max_length=400, verbose_name="Thank You Note", null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotations_created'
    )
    
    def __str__(self):
        return self.quotation_no
    
    def generate_quotation_no(self):
        """Generate quotation number starting from AKSN-9001"""
        START_NUMBER = 9001
        max_number = 0
        for q_no in Quotation.objects.exclude(quotation_no='').values_list('quotation_no', flat=True):
            if q_no:
                try:
                    num = int(q_no.split('-')[-1])
                    if num > max_number:
                        max_number = num
                except (ValueError, IndexError):
                    continue

        if max_number < START_NUMBER:
            new_number = START_NUMBER
        else:
            new_number = max_number + 1

        return f"AKSN-{str(new_number).zfill(4)}"
    
    def save(self, *args, **kwargs):
        if not self.quotation_no:
            self.quotation_no = self.generate_quotation_no()
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-created_at']




class QuotationVersion(models.Model):
    quotation = models.ForeignKey(
        Quotation,
        related_name="versions",
        on_delete=models.CASCADE
    )
    
    version_no = models.CharField(max_length=100, verbose_name="Version Number")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    is_finalized = models.BooleanField(default=False, verbose_name="Is Finalized")
    
    # GST Type for this version
    gst_type = models.CharField(
        max_length=20,
        choices=Quotation.GST_TYPE_CHOICES,
        default="CGST_SGST",
        verbose_name="GST Type"
    )
    
    # Totals
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    terms_and_conditions = models.JSONField(blank=True, null=True, default=list, verbose_name="Terms & Conditions")
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quotation_versions_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    def generate_version_no(self):
        """Generate version number like AKSN-001-R1"""
        versions = QuotationVersion.objects.filter(quotation=self.quotation)
        count = versions.count() + 1
        return f"{self.quotation.quotation_no}-R{count}"
    
    def save(self, *args, **kwargs):
        if not self.version_no:
            self.version_no = self.generate_version_no()
        super().save(*args, **kwargs)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["quotation", "version_no"],
                name="unique_quotation_version"
            )
        ]
        ordering = ['-created_at']


class QuotationItem(models.Model):
    quotation_version = models.ForeignKey(
        QuotationVersion,
        related_name="items",
        on_delete=models.CASCADE
    )
    
    # Product information (snapshot from product master)
    product_id = models.IntegerField(null=True, blank=True, verbose_name="Product ID")
    product_name = models.CharField(max_length=255, verbose_name="Product Name")
    product_code = models.CharField(max_length=50, blank=True, null=True, verbose_name="Product Code")
    category = models.CharField(max_length=100, blank=True, null=True, verbose_name="Category")
    hsn_sac_code = models.CharField(max_length=20, blank=True, null=True, verbose_name="HSN/SAC Code")
    
    # Item details (editable in quotation)
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    quantity = models.DecimalField(
    max_digits=10, 
    decimal_places=2, 
    default=1,
    validators=[MinValueValidator(Decimal('0.01'))],  # ✅ Use Decimal
    verbose_name="Quantity"
)
    unit = models.CharField(max_length=20, default="NOS", verbose_name="Unit")
    unit_price = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Unit Price"
    )
    gst_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=18,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="GST %"
    )
    
    # Calculated fields
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        self.base_amount = self.quantity * self.unit_price
        self.gst_amount = (self.base_amount * self.gst_percentage) / 100
        self.total_with_gst = self.base_amount + self.gst_amount
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.product_name} - {self.quantity} {self.unit}"