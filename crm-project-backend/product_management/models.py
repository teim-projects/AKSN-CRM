from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Category(models.Model):
    """Product Category Model"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

class Product(models.Model):
    # Fields from screenshot
    name = models.CharField(max_length=255, verbose_name="Product / Service Name")
    product_code = models.CharField(max_length=50, unique=True, blank=True, verbose_name="Product Code")
    category = models.ForeignKey(
        Category, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='products',
        verbose_name="Category"
    )
    unit_price = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0.00,
        validators=[MinValueValidator(0)],
        verbose_name="Unit Price (₮)"
    )
    hsn_sac_code = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        verbose_name="HSN / SAC Code"
    )
    
    # Status
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('DRAFT', 'Draft'),
        ('DISCONTINUED', 'Discontinued'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    description = models.TextField(blank=True, null=True, verbose_name="Product Description")
    product_image_url = models.URLField(
        max_length=500, 
        blank=True, 
        null=True,
        verbose_name="Product Image URL",
        help_text="Leave blank for auto icon"
    )
    
    # Additional fields (keeping for compatibility)
    gst_type = models.CharField(max_length=20, choices=[
        ('GST', 'GST'),
        ('IGST', 'IGST'),
        ('CGST_SGST', 'CGST + SGST'),
        ('EXEMPT', 'Exempt'),
        ('NIL', 'Nil Rated'),
    ], default='GST')
    gst_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=18.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    is_active = models.BooleanField(default=True)
    is_service = models.BooleanField(default=False)
    extra_attributes = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.product_code:
            self.product_code = self.generate_product_code()
        super().save(*args, **kwargs)
    
    def generate_product_code(self):
        """Generate product code from name"""
        base = self.name[:3].upper()
        import uuid
        return f"{base}-{uuid.uuid4().hex[:6].upper()}"
    
    def get_price_with_gst(self):
        """Calculate price including GST"""
        return self.unit_price + (self.unit_price * self.gst_percentage / 100)
    
    def __str__(self):
        return f"{self.name} ({self.product_code})"
    
    class Meta:
        ordering = ['name']