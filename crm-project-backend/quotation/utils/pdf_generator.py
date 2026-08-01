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

        formatted_items.append({
            'sr': idx,
            'product_name': item.product_name,
            'product_code': item.product_code or '',
            'hsn_sac_code': item.hsn_sac_code or '',
            'description': item.description or item.product_name,
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

    return {
        'quotation': quotation,
        'version': version,
        'quotation_no': quotation.quotation_no,
        'version_no': version.version_no,
        'quotation_date': quotation.quotation_date or version.created_at,
        'company_name': company_name,
        'contact_person': contact_person,
        'mobile_number': mobile_number,
        'email_address': email_address,
        'address': address,
        'city': city,
        'state': state,
        'gst_number': gst_number,
        'subject': quotation.subject or '-',
        'thank_you_note': quotation.thank_you_note or '',
        'quotation_items': formatted_items,
        'terms_list': raw_terms,
        'subtotal': subtotal,
        'gst_amount': gst_amount,
        'gst_percentage': gst_percentage,
        'grand_total': grand_total,
        'total_quantity': total_quantity,
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
        
        fast_fetcher = lambda url, *args, **kwargs: {'string': b'', 'mime_type': 'text/plain'}
        pdf = HTML(
            string=html_string,
            url_fetcher=fast_fetcher
        ).write_pdf()
        return pdf
    except Exception as e:
        logger.error(f"Error generating quotation PDF: {str(e)}", exc_info=True)
        raise
