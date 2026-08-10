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
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"



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
    
    # Quotation Details
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
        """Generate quotation number like AKSN-001"""
        last = Quotation.objects.all().order_by('-id').first()
        if last and last.quotation_no:
            try:
                last_number = int(last.quotation_no.split('-')[-1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = 1
        else:
            new_number = 1
        return f"AKSN-{str(new_number).zfill(3)}"
    
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