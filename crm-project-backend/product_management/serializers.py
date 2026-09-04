from rest_framework import serializers
from .models import Product, Category

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_active', 'product_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    price_with_gst = serializers.DecimalField(
        source='get_price_with_gst', 
        read_only=True, 
        max_digits=12, 
        decimal_places=2
    )
    product_code = serializers.CharField(
        max_length=50, 
        required=False, 
        allow_blank=True
    )
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'product_code', 'category', 'category_name',
            'unit_price', 'hsn_sac_code', 'status', 'description',
            'product_image_url', 'gst_type', 'gst_percentage',
            'is_active', 'is_service', 'extra_attributes',
            'price_with_gst', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_product_code(self, value):
        if value and value.strip():
            val = value.strip()
            qs = Product.objects.filter(product_code__iexact=val)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError(f"Product code '{val}' is already in use.")
            return val
        return ""

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Unit price cannot be negative")
        return value