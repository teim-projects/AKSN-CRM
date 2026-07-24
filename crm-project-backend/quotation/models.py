from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

# Create your models here.
class Quotation(models.Model):
    quotation_no = models.CharField(max_length=50, unique=True)

    customer = models.ForeignKey(
        "lead_management.Customer",
        on_delete=models.PROTECT,
        related_name="quotations"
    )

    # Removed branch and site fields

    subject = models.CharField(max_length=255)
    site_name = models.CharField(max_length=255, blank=True, null=True)
    thank_you_note = models.TextField(max_length=400)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.quotation_no


class QuotationVersion(models.Model):
    GST_TYPE_CHOICES = (
        ("CGST_SGST", "CGST + SGST"),
        ("IGST", "IGST"),
    )

    quotation = models.ForeignKey(
        Quotation,
        related_name="versions",
        on_delete=models.CASCADE
    )

    version_no = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    gst_type = models.CharField(
        max_length=20,
        choices=GST_TYPE_CHOICES,
        default="CGST_SGST"
    )

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["quotation", "version_no"],
                name="unique_quotation_version"
            )
        ]


class QuotationHighSideItem(models.Model):
    quotation_version = models.ForeignKey(
        QuotationVersion,
        related_name="high_side_items",
        on_delete=models.CASCADE
    )

    # Store product data as JSON snapshot - NO FOREIGN KEY
    product_data = models.JSONField(default=dict)  # Stores: {id, name, sku, price, category, hsn, gst_percentage}
    
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    unit = models.CharField(max_length=20, default="NOS")

    mathadi_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transportation_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True, null=True)
    hsn_sac = models.CharField(max_length=50, null=True, blank=True)

    # Calculated fields
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.product_data.get('sku', 'N/A')} - {self.quantity}"


class QuotationLowSideItem(models.Model):
    quotation_version = models.ForeignKey(
        QuotationVersion,
        related_name="low_side_items",
        on_delete=models.CASCADE
    )

    # Store item data as JSON snapshot - NO FOREIGN KEY
    item_data = models.JSONField(default=dict)  # Stores: {id, item_code, name, description, material_type, item_type, etc.}

    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default="NOS") 
    hsn_sac = models.CharField(max_length=50, null=True, blank=True)
    mathadi_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True, null=True)

    # Calculated fields
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.item_data.get('item_code', 'N/A')} - {self.quantity}"


class ServiceMaster(models.Model):
    SERVICE_TYPES = [
        ('MATERIAL', 'Material Based'),
        ('LABOR', 'Labor Only'),
    ]
    
    category = models.CharField(max_length=200)
    subcategory = models.CharField(max_length=200, blank=True, null=True)
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True, null=True)
    service_type = models.CharField(max_length=10, choices=SERVICE_TYPES, default='LABOR')
    items = models.JSONField(default=list, blank=True)  # Store item snapshots as JSON
    unit = models.CharField(max_length=50, blank=True, null=True)
    labor_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sequence = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['sequence', 'name']
    
    def __str__(self):
        return self.name


class QuotationServiceItem(models.Model):
    quotation_version = models.ForeignKey('QuotationVersion', on_delete=models.CASCADE, related_name='service_items')
    service = models.ForeignKey(ServiceMaster, on_delete=models.CASCADE)
    
    # Quantities and pricing
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=50)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    
    # Calculated amounts (same as high/low side items)
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    mathadi_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transportation_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        self.base_amount = self.quantity * self.unit_price
        self.gst_amount = (self.base_amount * self.gst_percentage) / 100
        self.total_with_gst = self.base_amount + self.gst_amount + self.mathadi_charges + self.transportation_charges
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.service.name} - {self.quantity} {self.unit}"