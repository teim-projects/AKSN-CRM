# quotation/utils/pdf_generator.py
from django.template.loader import render_to_string
from decimal import Decimal
from django.conf import settings
import logging

try:
    from weasyprint import HTML
except Exception:  # pragma: no cover
    HTML = None

logger = logging.getLogger(__name__)


def get_user_display_name(user_obj):
    if not user_obj:
        return "-"
    fname = getattr(user_obj, 'first_name', '') or ''
    lname = getattr(user_obj, 'last_name', '') or ''
    full_name = f"{fname} {lname}".strip() or getattr(user_obj, 'username', '') or getattr(user_obj, 'email', '')
    mobile = getattr(user_obj, 'mobile_no', '') or getattr(user_obj, 'mobile_number', '') or getattr(user_obj, 'phone', '')
    if mobile:
        return f"{full_name} ({mobile})"
    return full_name


def parse_description_bullets(text):
    if not text or not str(text).strip():
        return []
    raw = str(text).strip()
    parts = raw.split('.')
    bullets = []
    for p in parts:
        cleaned = ' '.join(p.split())
        if cleaned:
            bullets.append(cleaned + '.')
    if not raw.endswith('.') and bullets:
        bullets[-1] = bullets[-1].rstrip('.')
    return bullets


def _build_quotation_pdf_context(quotation, version):
    items = list(version.items.all())
    
    formatted_items = []
    total_quantity = Decimal('0')
    subtotal = Decimal('0')
    gst_total = Decimal('0')

    for idx, item in enumerate(items, 1):
        qty = Decimal(str(item.quantity or 0))
        rate = Decimal(str(item.unit_price or 0))
        base = Decimal(str(item.base_amount or (qty * rate)))
        gst_amt = Decimal(str(item.gst_amount or 0))
        total_item = Decimal(str(item.total_with_gst or (base + gst_amt)))

        total_quantity += qty
        subtotal += base
        gst_total += gst_amt

        item_desc = (item.description or '').strip()
        if not item_desc and item.product_id:
            try:
                from product_management.models import Product
                prod = Product.objects.filter(id=item.product_id).first()
                if prod and prod.description:
                    item_desc = prod.description.strip()
            except Exception:
                pass

        description_bullets = parse_description_bullets(item_desc)

        formatted_items.append({
            'sr': idx,
            'product_name': item.product_name,
            'product_code': item.product_code or '',
            'hsn_sac_code': item.hsn_sac_code or '',
            'description': item_desc,
            'description_bullets': description_bullets,
            'quantity': qty,
            'unit': item.unit or 'NOS',
            'unit_price': rate,
            'gst_percentage': item.gst_percentage,
            'base_amount': base,
            'gst_amount': gst_amt,
            'total_with_gst': total_item,
        })

    gst_amount = version.gst_amount or gst_total
    subtotal = version.subtotal or subtotal
    grand_total = version.grand_total or (subtotal + gst_amount)

    if subtotal and gst_amount:
        gst_percentage = (gst_amount / subtotal) * Decimal('100')
    else:
        gst_percentage = Decimal('18')

    # Selected Terms & Conditions
    raw_terms = version.terms_and_conditions or quotation.terms_and_conditions or []

    # Lead Fallbacks for Client Information
    lead = quotation.lead
    company_name = quotation.company_name or (lead.company_name if lead else '-')
    contact_person = quotation.contact_person or (lead.contact_person if lead else '-')
    mobile_number = quotation.mobile_number or (lead.mobile_number if lead else '-')
    email_address = quotation.email_address or (lead.email_address if lead else '-')
    address = quotation.address or (lead.address if lead else '')
    city = quotation.city or (lead.city if lead else '')
    state = quotation.state or (lead.state if lead else '')
    gst_number = quotation.gst_number or (lead.gst_number if lead else '')

    # Assigned Executive from Lead (First Name, Last Name, Number)
    assigned_executive_str = "-"
    if lead and getattr(lead, 'assigned_executive', None):
        exec_obj = lead.assigned_executive
        assigned_executive_str = get_user_display_name(exec_obj)
    elif getattr(quotation, 'created_by', None):
        c_user = quotation.created_by
        assigned_executive_str = get_user_display_name(c_user)

    # Encode logo base64 (Checking local static and user downloads folder)
    import os, base64
    logo_base64 = ""
    candidate_logo_paths = [
        os.path.join(settings.BASE_DIR, 'static', 'images', 'aksn-logo.png'),
        os.path.join(settings.BASE_DIR, 'static', 'images', 'aksn-logo.avif'),
        r"S:\installers\Downloads\aksn-logo.png",
        r"S:\installers\Downloads\aksn-logo.avif",
    ]

    for lpath in candidate_logo_paths:
        if os.path.exists(lpath):
            try:
                with open(lpath, 'rb') as lf:
                    ldata = lf.read()
                    lfmt = 'png' if lpath.endswith('.png') else 'avif'
                    logo_base64 = f"data:image/{lfmt};base64," + base64.b64encode(ldata).decode('utf-8')
                    break
            except Exception as err:
                logger.error(f"Error encoding logo from {lpath}: {err}")

    q_date = quotation.quotation_date or (version.created_at.date() if hasattr(version.created_at, 'date') else version.created_at)

    return {
        'quotation': quotation,
        'version': version,
        'quotation_no': quotation.quotation_no,
        'version_no': version.version_no,
        'quotation_date': q_date,
        'company_name': company_name,
        'contact_person': contact_person,
        'mobile_number': mobile_number,
        'email_address': email_address,
        'address': address,
        'city': city,
        'state': state,
        'gst_number': gst_number,
        'subject': quotation.subject or 'Quotation for Products & Services',
        'assigned_executive': assigned_executive_str,
        'thank_you_note': quotation.thank_you_note or '',
        'quotation_items': formatted_items,
        'terms_list': raw_terms,
        'subtotal': subtotal,
        'gst_amount': gst_amount,
        'sgst_amount': (gst_amount / Decimal('2')) if gst_amount else Decimal('0'),
        'cgst_amount': (gst_amount / Decimal('2')) if gst_amount else Decimal('0'),
        'gst_percentage': gst_percentage,
        'grand_total': grand_total,
        'total_quantity': total_quantity,
        'logo_base64': logo_base64,
        'company_address': "AKSN Infotech Office No:-10B, 2nd Floor, Prestige Point Behind Telephone Exchange, Bajirao Road, 283, Shukrawar Peth, PUNE 411002 India GSTIN: 27AAXFA5487A1Z4",
    }


def generate_quotation_pdf(quotation, version, base_url=None):
    """
    Generate quotation PDF using WeasyPrint with full A4 HTML template (optimized).
    """
    try:
        if HTML is None:
            raise RuntimeError(
                "WeasyPrint is unavailable on this system. Please check system libraries."
            )
        context = _build_quotation_pdf_context(quotation, version)
        html_string = render_to_string('pdf/quotation.html', context)
        
        from weasyprint import default_url_fetcher
        def safe_url_fetcher(url, *args, **kwargs):
            if url.startswith('data:'):
                return default_url_fetcher(url, *args, **kwargs)
            return {'string': b'', 'mime_type': 'text/plain'}

        pdf = HTML(
            string=html_string,
            url_fetcher=safe_url_fetcher
        ).write_pdf()
        return pdf
    except Exception as e:
        logger.error(f"Error generating quotation PDF: {str(e)}", exc_info=True)
        raise
