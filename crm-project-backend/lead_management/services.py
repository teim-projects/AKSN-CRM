import logging
from django.db import transaction
from .models import Customer, LeadStatus, CustomerStatus

logger = logging.getLogger(__name__)

def resolve_lead_products(lead):
    """
    Resolve lead product_interested IDs or names to a structured list of dicts.
    """
    from product_management.models import Product

    resolved_products = []
    raw_lead_prods = lead.product_interested or []
    if not isinstance(raw_lead_prods, list):
        raw_lead_prods = [raw_lead_prods]

    for p_item in raw_lead_prods:
        if isinstance(p_item, dict):
            p_name = p_item.get("product") or p_item.get("name") or p_item.get("product_name") or ""
            if str(p_name).strip().isdigit():
                p_obj = Product.objects.filter(id=int(str(p_name).strip())).first()
                if p_obj:
                    p_name = p_obj.name
            if p_name and not str(p_name).strip().isdigit():
                p_copy = dict(p_item)
                p_copy["product"] = p_name
                resolved_products.append(p_copy)
        elif isinstance(p_item, (int, float)) or (isinstance(p_item, str) and p_item.strip().isdigit()):
            p_obj = Product.objects.filter(id=int(str(p_item).strip())).first()
            if p_obj:
                resolved_products.append({
                    "product": p_obj.name,
                    "value": float(lead.amount) if lead.amount else None
                })
        elif isinstance(p_item, str) and p_item.strip() and not p_item.strip().isdigit():
            resolved_products.append({
                "product": p_item.strip(),
                "value": float(lead.amount) if lead.amount else None
            })
    return resolved_products


@transaction.atomic
def auto_convert_lead_to_customer(lead):
    """
    Automatically converts or links a lead to a Customer when status is close_win.
    Also synchronizes all follow-ups of the lead to close_win.
    """
    if not lead:
        return None

    # If lead already converted and linked to a customer
    if lead.converted_to_customer:
        customer = lead.converted_to_customer
        lead_updates = []
        if not lead.is_converted:
            lead.is_converted = True
            lead_updates.append("is_converted")
        if lead.status != LeadStatus.CLOSE_WIN:
            lead.status = LeadStatus.CLOSE_WIN
            lead_updates.append("status")
        if lead_updates:
            lead_updates.append("updated_at")
            lead.save(update_fields=lead_updates)
        lead.followups.all().update(status=LeadStatus.CLOSE_WIN)
        return customer

    resolved_products = resolve_lead_products(lead)

    # Check if a customer already exists with this mobile number
    existing_customer = None
    clean_mobile = str(lead.mobile_number or "").strip()
    if clean_mobile:
        existing_customer = Customer.objects.filter(contact_number=clean_mobile).first()

    if existing_customer:
        updated_fields = ["lead"]
        existing_customer.lead = lead
        if not existing_customer.sales_executive and lead.assigned_executive:
            existing_customer.sales_executive = lead.assigned_executive
            updated_fields.append("sales_executive")
        if (not existing_customer.project_value or existing_customer.project_value == 0) and lead.amount:
            existing_customer.project_value = lead.amount
            updated_fields.append("project_value")
        if not existing_customer.billing_address and lead.address:
            existing_customer.billing_address = lead.address
            updated_fields.append("billing_address")
        if not existing_customer.industry_category and lead.industry_type:
            existing_customer.industry_category = lead.industry_type
            updated_fields.append("industry_category")
        if not getattr(existing_customer, "lead_source", None) and lead.lead_source:
            existing_customer.lead_source = lead.lead_source
            updated_fields.append("lead_source")
        if resolved_products and (not existing_customer.product_purchased or len(existing_customer.product_purchased) == 0):
            existing_customer.product_purchased = resolved_products
            updated_fields.append("product_purchased")
        existing_customer.save(update_fields=updated_fields)

        lead.converted_to_customer = existing_customer
        lead.is_converted = True
        lead.status = LeadStatus.CLOSE_WIN
        lead.save(update_fields=["converted_to_customer", "is_converted", "status", "updated_at"])
        lead.followups.all().update(status=LeadStatus.CLOSE_WIN)
        return existing_customer

    # Create new customer from lead
    company_name = (lead.company_name or "").strip()
    contact_person = (lead.contact_person or "").strip()
    customer_name = company_name or contact_person or f"Lead #{lead.id}"

    # Validate email
    email_val = (lead.email_address or "").strip() or None
    if email_val and ("@" not in email_val or "." not in email_val):
        email_val = None

    customer = Customer.objects.create(
        lead=lead,
        name=customer_name,
        contact_person=contact_person,
        contact_number=clean_mobile,
        email=email_val,
        city=lead.city or "",
        state=lead.state or "",
        industry_category=lead.industry_type or "",
        lead_source=lead.lead_source or "",
        product_purchased=resolved_products,
        gst_number=lead.gst_number or "",
        pan_number=lead.pan_number or "",
        msme_number=lead.msme_number or "",
        project_value=lead.amount if lead.amount else None,
        sales_executive=lead.assigned_executive,
        website=lead.linkedin_profile_url or "",
        customer_status=CustomerStatus.PROSPECT,
        billing_address=lead.address or "",
    )

    lead.converted_to_customer = customer
    lead.is_converted = True
    lead.status = LeadStatus.CLOSE_WIN
    lead.save(update_fields=["converted_to_customer", "is_converted", "status", "updated_at"])
    lead.followups.all().update(status=LeadStatus.CLOSE_WIN)

    logger.info(f"Auto-converted Lead #{lead.id} to Customer #{customer.id} ({customer.customer_code})")
    return customer
