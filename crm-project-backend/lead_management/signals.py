from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Customer, lead_management

@receiver(post_save, sender=Customer)
def link_lead_to_customer(sender, instance, created, **kwargs):
    """When a customer is created, check if a lead exists with the same mobile number and link them"""
    if created and instance.contact_number:
        try:
            # Find lead with this mobile number that is not converted
            lead = lead_management.objects.filter(
                mobile_number=instance.contact_number,
                is_converted=False
            ).first()
            
            if lead:
                lead.converted_to_customer = instance
                lead.is_converted = True
                lead.save()
                print(f"Lead {lead.id} linked to customer {instance.id}")
        except Exception as e:
            print(f"Error linking lead to customer: {e}")