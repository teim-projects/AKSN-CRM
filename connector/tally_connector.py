"""
Tally Connector - Windows Application
Bridges local TallyPrime (port 9000) with the cloud Django CRM API over HTTPS.
No CRM business logic or Customer mapping lives here; this is purely a secure data bridge.
"""

import os
import sys
import json
import time
import re
import socket
import argparse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Safe directory resolution for standalone PyInstaller .exe and script execution
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CONFIG_FILE = os.path.join(BASE_DIR, "connector_config.json")

DEFAULT_SERVER_URL = "http://127.0.0.1:8000"
DEFAULT_TALLY_URL = "http://localhost:9000"


def safe_exit(code=0):
    """
    Prevents the console window from closing instantly when launched by double-clicking in Windows Explorer.
    """
    if len(sys.argv) <= 1:
        try:
            print()
            input("Press Enter to exit...")
        except Exception:
            pass
    sys.exit(code)


class TallyConnector:
    def __init__(self, server_url=None, tally_url=None):
        self.config = self.load_config()
        raw_server = (server_url or self.config.get("server_url") or DEFAULT_SERVER_URL).rstrip("/")
        if not raw_server.startswith("http://") and not raw_server.startswith("https://"):
            raw_server = f"http://{raw_server}"
        self.server_url = raw_server

        raw_tally = (tally_url or self.config.get("tally_url") or DEFAULT_TALLY_URL).rstrip("/")
        if not raw_tally.startswith("http://") and not raw_tally.startswith("https://"):
            raw_tally = f"http://{raw_tally}"
        self.tally_url = raw_tally

        self.auth_token = self.config.get("auth_token")
        self.connector_name = self.config.get("connector_name", socket.gethostname())
        self.selected_company = self.config.get("selected_company", "")
        self.selected_company_identifier = self.config.get("selected_company_identifier", "")
        self.mock_mode = False

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[!] Warning: Could not read config file: {e}")
        return {}

    def save_config(self):
        data = {
            "server_url": self.server_url,
            "tally_url": self.tally_url,
            "auth_token": self.auth_token,
            "connector_name": self.connector_name,
            "selected_company": self.selected_company,
            "selected_company_identifier": self.selected_company_identifier,
        }
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"[✓] Configuration saved to {CONFIG_FILE}")
        except Exception as e:
            print(f"[!] Warning: Could not write config file: {e}")

    # ==========================================
    # HTTP UTILITIES
    # ==========================================

    def _make_crm_request(self, endpoint, method="GET", payload=None):
        url = f"{self.server_url}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.auth_token:
            headers["X-Tally-Token"] = self.auth_token
            headers["Authorization"] = f"Bearer {self.auth_token}"

        data_bytes = None
        if payload is not None:
            data_bytes = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                status_code = resp.getcode()
                body = resp.read().decode("utf-8")
                return status_code, json.loads(body) if body else {}
        except urllib.error.HTTPError as he:
            body = he.read().decode("utf-8") if he.fp else ""
            try:
                err_data = json.loads(body)
            except Exception:
                err_data = {"error": body or str(he)}
            return he.code, err_data
        except urllib.error.URLError as ue:
            return 0, {"error": f"Connection failed to CRM server {self.server_url}: {ue.reason}"}
        except Exception as ex:
            return 0, {"error": f"Unexpected request error: {ex}"}

    def _query_tally_xml(self, xml_payload):
        if self.mock_mode:
            return True, "<ENVELOPE>MOCK</ENVELOPE>"

        headers = {
            "Content-Type": "text/xml;charset=utf-8",
            "Content-Length": str(len(xml_payload.encode("utf-8"))),
        }
        req = urllib.request.Request(
            self.tally_url,
            data=xml_payload.encode("utf-8"),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                xml_response = resp.read().decode("utf-8", errors="replace")
                return True, xml_response
        except urllib.error.URLError as ue:
            return False, f"Could not connect to Tally at {self.tally_url}: {ue.reason}"
        except Exception as ex:
            return False, f"Tally XML error: {ex}"

    # ==========================================
    # PAIRING WORKFLOW
    # ==========================================

    def pair(self, pairing_code=None):
        if not pairing_code:
            pairing_code = input("\nEnter pairing code generated from CRM (e.g. TALLY-XXXX-XXXX): ").strip()

        pairing_code = pairing_code.upper().strip()
        if not pairing_code:
            print("[!] Pairing code cannot be empty.")
            return False

        print(f"[*] Pairing with CRM at {self.server_url} using code: {pairing_code}...")

        payload = {
            "pairing_code": pairing_code,
            "connector_name": self.connector_name,
            "connector_id": socket.gethostname(),
        }

        status_code, resp = self._make_crm_request("/api/tally/connector/pair/", method="POST", payload=payload)
        if status_code == 200:
            self.auth_token = resp.get("auth_token")
            self.selected_company = resp.get("selected_company", "")
            self.selected_company_identifier = resp.get("selected_company_identifier", "")
            self.save_config()
            print(f"[✓] Pairing SUCCESSFUL! Token received.")
            return True
        else:
            err_msg = resp.get('error') or resp
            print(f"[✗] Pairing FAILED (HTTP {status_code}): {err_msg}")
            if "Connection failed to CRM server" in str(err_msg) and len(sys.argv) <= 1:
                print(f"\n[!] Could not contact CRM server at {self.server_url}.")
                change = input(f"Enter correct CRM Server URL (or press Enter to keep {self.server_url}): ").strip()
                if change:
                    if not change.startswith("http://") and not change.startswith("https://"):
                        change = f"http://{change}"
                    self.server_url = change.rstrip("/")
                    self.save_config()
                    return self.pair(pairing_code)
            return False

    # ==========================================
    # TALLY DATA EXTRACTION
    # ==========================================

    def check_tally_connection(self):
        """
        Tests if local Tally is running and queries active companies.
        """
        if self.mock_mode:
            return True, "TallyPrime 4.1 (Mock Demo Mode)", [
                {"name": "ABC Industries Pvt Ltd", "identifier": "ABC-IND-001", "starting_from": "2026-04-01"},
                {"name": "Krishna Air Components", "identifier": "KAC-IND-002", "starting_from": "2026-04-01"}
            ], ""

        # TDL Collection Request for open companies
        xml_req = """<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>CompanyColl</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="CompanyColl">
            <TYPE>Company</TYPE>
            <FETCH>NAME,GUID,STARTINGFROM</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

        success, response = self._query_tally_xml(xml_req)
        if not success:
            return False, "", [], response

        companies = []
        try:
            clean_resp = re.sub(r'&#\d+;', '', response)
            root = ET.fromstring(clean_resp)
            for comp in root.iter("COMPANY"):
                name = comp.attrib.get("NAME") or comp.findtext("NAME") or comp.text or ""
                name = name.strip()
                if name and name not in [c["name"] for c in companies] and not name.isdigit():
                    companies.append({
                        "name": name,
                        "identifier": name,
                        "starting_from": comp.findtext("STARTINGFROM") or ""
                    })
        except Exception as e:
            return True, "TallyPrime Local", [{"name": "Default Company", "identifier": "DEFAULT"}], ""

        if not companies:
            companies = [{"name": "Active Tally Company", "identifier": "ACTIVE_DEFAULT"}]

        return True, "TallyPrime 4.x", companies, ""

    def fetch_invoices_from_tally(self, company_name=None):
        """
        Fetches sales vouchers from TallyPrime via XML or mock data generator.
        """
        if self.mock_mode:
            return self._generate_mock_invoices()

        target_company = (company_name or self.selected_company or "").strip()
        escaped_company = (
            target_company
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        ) if target_company else ""

        company_header = f"<SVCURRENTCOMPANY>{escaped_company}</SVCURRENTCOMPANY>" if escaped_company else ""

        # Request Sales vouchers collection from Tally with full historical date range
        xml_req = f"""<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>VoucherColl</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>19900101</SVFROMDATE>
        <SVTODATE>20991231</SVTODATE>
        {company_header}
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="VoucherColl">
            <TYPE>Voucher</TYPE>
            <FETCH>*,ALLLEDGERENTRIES.*,ALLINVENTORYENTRIES.*</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""

        success, response = self._query_tally_xml(xml_req)
        invoices = []
        if success:
            invoices = self._parse_tally_vouchers_xml(response)

        # If 0 invoices with company header, try querying active company directly as fallback
        if not invoices and company_header:
            print(f"[*] 0 vouchers found with company '{target_company}'. Retrying query on active Tally company...")
            fallback_req = xml_req.replace(company_header, "")
            fb_success, fb_response = self._query_tally_xml(fallback_req)
            if fb_success:
                fb_invoices = self._parse_tally_vouchers_xml(fb_response)
                if fb_invoices:
                    print(f"[*] Retrieved {len(fb_invoices)} vouchers from active company!")
                    return fb_invoices

        return invoices

    def _parse_tally_vouchers_xml(self, xml_content):
        """
        Parses raw Tally XML vouchers into structured dictionary list.
        """
        invoices = []
        try:
            # Clean Tally internal non-standard XML entities
            clean_xml = re.sub(r'&#\d+;', '', xml_content)
            clean_xml = re.sub(r'&#x[0-9a-fA-F]+;', '', clean_xml)
            root = ET.fromstring(clean_xml)

            # Find all VOUCHER nodes
            for voucher in root.iter("VOUCHER"):
                v_type = (voucher.findtext("VOUCHERTYPENAME") or "Sales").strip()
                parent_type = (voucher.findtext("PERSISTEDVIEW") or "").strip()
                is_inv_flag = (voucher.findtext("ISINVOICE") or "").strip().lower()

                v_type_lower = v_type.lower()
                parent_type_lower = parent_type.lower()

                # Skip obvious non-sales types (Receipt, Payment, Contra, Journal, Purchase)
                non_sales = ["purchase", "payment", "receipt", "contra", "journal", "debit note"]
                if any(ns in v_type_lower for ns in non_sales):
                    if "sales" not in v_type_lower and "invoice" not in v_type_lower:
                        continue

                is_sales = (
                    "sales" in v_type_lower or
                    "invoice" in v_type_lower or
                    "sales" in parent_type_lower or
                    is_inv_flag in ("yes", "1", "true")
                )
                if not is_sales:
                    continue

                guid = voucher.findtext("GUID") or voucher.findtext("MASTERID") or voucher.findtext("VOUCHERNUMBER")
                if not guid:
                    continue

                v_num = voucher.findtext("VOUCHERNUMBER") or guid
                date_str = voucher.findtext("DATE")
                formatted_date = None
                if date_str and len(date_str) == 8 and date_str.isdigit():
                    formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

                party_name = voucher.findtext("PARTYLEDGERNAME") or voucher.findtext("PARTYNAME") or "Unknown Party"
                party_gstin = voucher.findtext("PARTYGSTIN") or voucher.findtext("CMPGSTIN") or ""
                state_name = voucher.findtext("STATENAME") or voucher.findtext("PLACEOFSUPPLY") or ""
                narration = voucher.findtext("NARRATION") or ""
                ref_num = voucher.findtext("REFERENCE") or ""
                alter_id = voucher.findtext("ALTERID") or ""

                # Parse items & inventory
                items = []
                subtotal = 0.0
                cgst_tot = 0.0
                sgst_tot = 0.0
                igst_tot = 0.0
                ledger_credit_total = 0.0
                party_debit_amount = 0.0

                # Check inventory entries
                inv_nodes = list(voucher.iter("ALLINVENTORYENTRIES.LIST")) + list(voucher.iter("INVENTORYENTRIES.LIST"))
                for inv_entry in inv_nodes:
                    stock_name = inv_entry.findtext("STOCKITEMNAME") or "Item"
                    billed_qty = inv_entry.findtext("BILLEDQTY") or inv_entry.findtext("ACTUALQTY") or "1"
                    qty_num = 1.0
                    unit = "Nos"
                    qty_parts = billed_qty.strip().split()
                    if qty_parts:
                        try:
                            qty_num = float(qty_parts[0])
                            if len(qty_parts) > 1:
                                unit = qty_parts[1]
                        except Exception:
                            qty_num = 1.0

                    rate_text = inv_entry.findtext("RATE") or "0"
                    rate_num = 0.0
                    try:
                        rate_num = float(rate_text.split("/")[0].replace(",", "").strip())
                    except Exception:
                        rate_num = 0.0

                    amount_text = inv_entry.findtext("AMOUNT") or "0"
                    try:
                        amount_num = abs(float(amount_text.replace(",", "").strip())) if amount_text else 0.0
                    except Exception:
                        amount_num = 0.0

                    subtotal += amount_num
                    items.append({
                        "item_name": stock_name,
                        "item_description": "",
                        "hsn_code": "",
                        "quantity": qty_num,
                        "unit": unit,
                        "rate": rate_num or (amount_num / qty_num if qty_num else 0.0),
                        "discount_percent": 0.0,
                        "discount_amount": 0.0,
                        "taxable_amount": amount_num,
                        "cgst_rate": 0.0,
                        "cgst_amount": 0.0,
                        "sgst_rate": 0.0,
                        "sgst_amount": 0.0,
                        "igst_rate": 0.0,
                        "igst_amount": 0.0,
                        "cess_amount": 0.0,
                        "total_amount": amount_num,
                        "ledger_name": "Sales Accounts",
                    })

                # Parse ledger entries for tax and sales amounts
                led_nodes = list(voucher.iter("ALLLEDGERENTRIES.LIST")) + list(voucher.iter("LEDGERENTRIES.LIST"))
                for led_entry in led_nodes:
                    led_name = (led_entry.findtext("LEDGERNAME") or "").strip()
                    led_name_upper = led_name.upper()
                    led_amt_text = led_entry.findtext("AMOUNT") or "0"
                    try:
                        raw_amt = float(led_amt_text.replace(",", "").strip())
                    except Exception:
                        raw_amt = 0.0

                    abs_amt = abs(raw_amt)

                    if "CGST" in led_name_upper:
                        cgst_tot += abs_amt
                    elif "SGST" in led_name_upper:
                        sgst_tot += abs_amt
                    elif "IGST" in led_name_upper:
                        igst_tot += abs_amt
                    elif raw_amt > 0:
                        ledger_credit_total += abs_amt
                    elif raw_amt < 0:
                        party_debit_amount += abs_amt

                total_tax = cgst_tot + sgst_tot + igst_tot

                if subtotal <= 0.0 and ledger_credit_total > 0.0:
                    subtotal = ledger_credit_total
                elif subtotal <= 0.0 and party_debit_amount > 0.0:
                    subtotal = max(0.0, party_debit_amount - total_tax)

                grand_total = subtotal + total_tax
                if grand_total <= 0.0 and party_debit_amount > 0.0:
                    grand_total = party_debit_amount

                # Fallback if no inventory items were recorded
                if not items and grand_total > 0.0:
                    items.append({
                        "item_name": f"Sales Voucher #{v_num}",
                        "item_description": narration or "Sales entry",
                        "hsn_code": "",
                        "quantity": 1.0,
                        "unit": "Nos",
                        "rate": round(subtotal or grand_total, 2),
                        "discount_percent": 0.0,
                        "discount_amount": 0.0,
                        "taxable_amount": round(subtotal or grand_total, 2),
                        "cgst_rate": 0.0,
                        "cgst_amount": round(cgst_tot, 2),
                        "sgst_rate": 0.0,
                        "sgst_amount": round(sgst_tot, 2),
                        "igst_rate": 0.0,
                        "igst_amount": round(igst_tot, 2),
                        "cess_amount": 0.0,
                        "total_amount": round(grand_total, 2),
                        "ledger_name": "Sales Accounts",
                    })

                invoices.append({
                    "tally_guid": guid,
                    "tally_alter_id": alter_id,
                    "voucher_number": str(v_num),
                    "voucher_type": v_type,
                    "date": formatted_date,
                    "party_name": party_name,
                    "party_ledger_id": "",
                    "gstin": party_gstin,
                    "state": state_name,
                    "billing_address": "",
                    "shipping_address": "",
                    "reference_number": ref_num,
                    "reference_date": None,
                    "subtotal": round(subtotal, 2),
                    "cgst_amount": round(cgst_tot, 2),
                    "sgst_amount": round(sgst_tot, 2),
                    "igst_amount": round(igst_tot, 2),
                    "cess_amount": 0.0,
                    "total_tax": round(total_tax, 2),
                    "total_amount": round(grand_total, 2),
                    "currency": "INR",
                    "narration": narration,
                    "items": items,
                    "raw_data": {"tally_guid": guid, "alter_id": alter_id},
                })
        except Exception as e:
            print(f"[!] Error parsing Tally XML: {e}")

        return invoices

    def _generate_mock_invoices(self):
        """
        Realistic Indian GST test sales invoices for testing without live TallyPrime.
        """
        return [
            {
                "tally_guid": "TALLY-GUID-1001-ABC",
                "tally_alter_id": "1001",
                "voucher_number": "INV-2026-1001",
                "voucher_type": "Sales",
                "date": "2026-09-10",
                "party_name": "ABC Industries Pvt Ltd",
                "party_ledger_id": "LEDGER-ABC-01",
                "gstin": "27AABCA1234F1Z9",
                "state": "Maharashtra",
                "billing_address": "Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093",
                "shipping_address": "Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093",
                "reference_number": "PO-2026-789",
                "subtotal": 100000.00,
                "cgst_amount": 9000.00,
                "sgst_amount": 9000.00,
                "igst_amount": 0.00,
                "cess_amount": 0.00,
                "total_tax": 18000.00,
                "total_amount": 118000.00,
                "currency": "INR",
                "narration": "Sales of industrial air filtration units with 18% GST",
                "items": [
                    {
                        "item_name": "Air Filter HEPA H14",
                        "item_description": "High efficiency particulate air filter 610x610x292mm",
                        "hsn_code": "842139",
                        "quantity": 5.000,
                        "unit": "Nos",
                        "rate": 12000.00,
                        "discount_percent": 0.00,
                        "discount_amount": 0.00,
                        "taxable_amount": 60000.00,
                        "cgst_rate": 9.00,
                        "cgst_amount": 5400.00,
                        "sgst_rate": 9.00,
                        "sgst_amount": 5400.00,
                        "igst_rate": 0.00,
                        "igst_amount": 0.00,
                        "cess_amount": 0.00,
                        "total_amount": 70800.00,
                        "ledger_name": "Sales Accounts"
                    },
                    {
                        "item_name": "Pre-Filter Carbon Panel",
                        "item_description": "Washable metallic panel filter",
                        "hsn_code": "842139",
                        "quantity": 10.000,
                        "unit": "Nos",
                        "rate": 4000.00,
                        "discount_percent": 0.00,
                        "discount_amount": 0.00,
                        "taxable_amount": 40000.00,
                        "cgst_rate": 9.00,
                        "cgst_amount": 3600.00,
                        "sgst_rate": 9.00,
                        "sgst_amount": 3600.00,
                        "igst_rate": 0.00,
                        "igst_amount": 0.00,
                        "cess_amount": 0.00,
                        "total_amount": 47200.00,
                        "ledger_name": "Sales Accounts"
                    }
                ],
                "raw_data": {"generator": "Tally Connector Mock Generator"}
            },
            {
                "tally_guid": "TALLY-GUID-1002-XYZ",
                "tally_alter_id": "1002",
                "voucher_number": "INV-2026-1002",
                "voucher_type": "Sales",
                "date": "2026-09-11",
                "party_name": "XYZ Traders & Engineering",
                "party_ledger_id": "LEDGER-XYZ-02",
                "gstin": "24AAXYZ9876C1ZQ",
                "state": "Gujarat",
                "billing_address": "GIDC Estate, Phase II, Vatva, Ahmedabad, Gujarat 382445",
                "shipping_address": "GIDC Estate, Phase II, Vatva, Ahmedabad, Gujarat 382445",
                "reference_number": "XYZ-ORD-5541",
                "subtotal": 75000.00,
                "cgst_amount": 0.00,
                "sgst_amount": 0.00,
                "igst_amount": 13500.00,
                "cess_amount": 0.00,
                "total_tax": 13500.00,
                "total_amount": 88500.00,
                "currency": "INR",
                "narration": "Interstate supply to Gujarat with 18% IGST",
                "items": [
                    {
                        "item_name": "Centrifugal Blower 3HP",
                        "item_description": "Industrial backward curved blower 1440 RPM",
                        "hsn_code": "841459",
                        "quantity": 1.000,
                        "unit": "Set",
                        "rate": 75000.00,
                        "discount_percent": 0.00,
                        "discount_amount": 0.00,
                        "taxable_amount": 75000.00,
                        "cgst_rate": 0.00,
                        "cgst_amount": 0.00,
                        "sgst_rate": 0.00,
                        "sgst_amount": 0.00,
                        "igst_rate": 18.00,
                        "igst_amount": 13500.00,
                        "cess_amount": 0.00,
                        "total_amount": 88500.00,
                        "ledger_name": "Interstate Sales"
                    }
                ],
                "raw_data": {"generator": "Tally Connector Mock Generator"}
            },
            {
                "tally_guid": "TALLY-GUID-1003-SUN",
                "tally_alter_id": "1003",
                "voucher_number": "INV-2026-1003",
                "voucher_type": "Sales",
                "date": "2026-09-12",
                "party_name": "Sunrise Pharma Tech",
                "party_ledger_id": "LEDGER-SUN-03",
                "gstin": "27AABCS5544K1ZS",
                "state": "Maharashtra",
                "billing_address": "Tech Park, Hinjewadi Phase 3, Pune 411057",
                "shipping_address": "Tech Park, Hinjewadi Phase 3, Pune 411057",
                "reference_number": "PO-SUN-109",
                "subtotal": 45000.00,
                "cgst_amount": 4050.00,
                "sgst_amount": 4050.00,
                "igst_amount": 0.00,
                "cess_amount": 0.00,
                "total_tax": 8100.00,
                "total_amount": 53100.00,
                "currency": "INR",
                "narration": "Pharma cleanroom replacement air intake units",
                "items": [
                    {
                        "item_name": "Cleanroom Intake Diffuser 2x2",
                        "item_description": "Powder coated aluminum diffuser with damper",
                        "hsn_code": "842139",
                        "quantity": 15.000,
                        "unit": "Nos",
                        "rate": 3000.00,
                        "discount_percent": 0.00,
                        "discount_amount": 0.00,
                        "taxable_amount": 45000.00,
                        "cgst_rate": 9.00,
                        "cgst_amount": 4050.00,
                        "sgst_rate": 9.00,
                        "sgst_amount": 4050.00,
                        "igst_rate": 0.00,
                        "igst_amount": 0.00,
                        "cess_amount": 0.00,
                        "total_amount": 53100.00,
                        "ledger_name": "Sales Accounts"
                    }
                ],
                "raw_data": {"generator": "Tally Connector Mock Generator"}
            }
        ]

    # ==========================================
    # SYNC EXECUTION
    # ==========================================

    def perform_sync(self, job_id=None, company_name=None):
        target_company = (company_name or self.selected_company or "").strip()
        print(f"\n[*] Starting invoice synchronization from Tally for company: '{target_company}'...")
        invoices = self.fetch_invoices_from_tally(target_company)
        print(f"[*] Retrieved {len(invoices)} invoices from Tally.")
        if not invoices:
            print(f"[!] Note: 0 invoices found. Please verify '{target_company}' is open in TallyPrime (Alt + F3) and has Sales vouchers.")

        payload = {
            "job_id": job_id,
            "company_name": target_company,
            "company_identifier": self.selected_company_identifier or target_company,
            "invoices": invoices,
        }

        print(f"[*] Uploading sync batch to Django CRM ({self.server_url})...")
        status_code, resp = self._make_crm_request("/api/tally/connector/invoices/", method="POST", payload=payload)

        if status_code == 200:
            print(f"[✓] Sync SUCCESSFUL! Processed: {resp.get('processed')}, Created: {resp.get('created')}, Updated: {resp.get('updated')}, Failed: {resp.get('failed')}")
        else:
            print(f"[✗] Sync failed (HTTP {status_code}): {resp.get('error') or resp}")

    # ==========================================
    # DAEMON LOOP
    # ==========================================

    def run_daemon(self, interval=10):
        print("\n=======================================================")
        print("  TALLY CONNECTOR RUNNING (Windows Service Mode)")
        print(f"  Server URL:  {self.server_url}")
        print(f"  Tally URL:   {self.tally_url}")
        print(f"  Connector:   {self.connector_name}")
        print(f"  Mock Mode:   {self.mock_mode}")
        print("=======================================================\n")

        if not self.auth_token:
            print("[!] No auth token found. Connector must be paired first.")
            if not self.pair():
                print("[!] Exiting due to unpaired state.")
                safe_exit(1)

        while True:
            try:
                # 1. Check local Tally
                is_online, tally_ver, companies, err = self.check_tally_connection()
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                if is_online:
                    print(f"[{now_str}] Tally ONLINE ({tally_ver}). Companies: {[c['name'] for c in companies]}")
                else:
                    print(f"[{now_str}] Tally OFFLINE: {err}")

                # 2. Send Heartbeat to CRM
                hb_payload = {
                    "is_tally_online": is_online,
                    "tally_version": tally_ver,
                    "companies": companies,
                    "current_company": self.selected_company or "",
                    "company_identifier": self.selected_company_identifier or "",
                    "error_message": err,
                }

                code, resp = self._make_crm_request("/api/tally/connector/heartbeat/", method="POST", payload=hb_payload)
                if code == 200:
                    # Update selected company from CRM server's choice
                    server_company = resp.get("selected_company")
                    if server_company and server_company != self.selected_company:
                        print(f"[*] Synchronizing company changed to: {server_company}")
                        self.selected_company = server_company
                        self.selected_company_identifier = resp.get("selected_company_identifier") or server_company
                        self.save_config()

                    # Check for pending sync jobs
                    pending_job = resp.get("pending_job")
                    if pending_job:
                        job_target = pending_job.get("target_company") or self.selected_company
                        print(f"[*] Received pending sync job {pending_job.get('job_id')} from CRM for company: '{job_target}'!")
                        self.perform_sync(job_id=pending_job.get("job_id"), company_name=job_target)
                elif code == 401:
                    print("[!] Authorization error: Token rejected by CRM server. Re-pairing may be required.")
                else:
                    print(f"[!] Heartbeat warning (HTTP {code}): {resp.get('error') or resp}")

            except KeyboardInterrupt:
                print("\n[!] Connector stopped by user.")
                safe_exit(0)
            except Exception as e:
                print(f"[!] Daemon loop exception: {e}")

            time.sleep(interval)


def main():
    # Preprocess sys.argv to gracefully handle accidental flags like `--TALLY-XXXX-XXXX`
    extracted_code = None
    cleaned_argv = []
    for arg in sys.argv[1:]:
        upper = arg.upper().strip()
        if upper.startswith("--TALLY-") or upper.startswith("-TALLY-"):
            extracted_code = upper.lstrip("-")
        elif upper.startswith("TALLY-") and not upper.startswith("--"):
            extracted_code = upper
        else:
            cleaned_argv.append(arg)

    parser = argparse.ArgumentParser(description="TallyPrime Windows Connector for Django CRM")
    parser.add_argument("code", nargs="?", help="Optional pairing code (e.g. TALLY-XXXX-XXXX)")
    parser.add_argument("--server", help="Django CRM server URL (default: http://127.0.0.1:8000)")
    parser.add_argument("--tally", help="Local Tally HTTP URL (default: http://localhost:9000)")
    parser.add_argument("--pair", help="Pairing code generated from CRM (e.g. TALLY-XXXX-XXXX)")
    parser.add_argument("--sync", action="store_true", help="Perform one-off invoice sync and exit")
    parser.add_argument("--daemon", action="store_true", help="Run in continuous background polling mode")
    parser.add_argument("--mock", action="store_true", help="Run in mock demo mode with synthetic Tally vouchers")
    parser.add_argument("--interval", type=int, default=10, help="Heartbeat polling interval in seconds")

    args = parser.parse_args(cleaned_argv)

    pair_code = args.pair or args.code or extracted_code

    connector = TallyConnector(server_url=args.server, tally_url=args.tally)
    if args.mock:
        connector.mock_mode = True
        print("[*] Mock mode ENABLED. Synthetic GST invoices will be used for testing.")

    # Explicit pair flag or positional code passed
    if pair_code:
        success = connector.pair(pair_code)
        if not success:
            safe_exit(1)
        if args.sync:
            connector.perform_sync()
            safe_exit(0)
        else:
            connector.run_daemon(interval=args.interval)
        return

    # One-off sync requested
    if args.sync:
        if not connector.auth_token:
            print("[!] Cannot sync: connector is not paired yet. Run with --pair <code> first.")
            safe_exit(1)
        connector.perform_sync()
        safe_exit(0)
        return

    # Interactive startup banner
    print("\n=======================================================")
    print("        TallyPrime Windows Connector for CRM           ")
    print("=======================================================")
    print(f"  Server URL : {connector.server_url}")
    print(f"  Tally URL  : {connector.tally_url}")
    print(f"  Machine    : {connector.connector_name}")
    print("=======================================================\n")

    # If already paired, run daemon immediately
    if connector.auth_token:
        print("[✓] Connector is paired with CRM.")
        connector.run_daemon(interval=args.interval)
        return

    # If not paired, interactively prompt the user
    while not connector.auth_token:
        print("Connector is not paired yet.")
        print("To pair, open your CRM in the browser, navigate to:")
        print("  -> Settings > Integrations > Tally > Connect Tally")
        print("and copy the pairing code (e.g. TALLY-7F82-91KD).\n")

        user_input = input("Enter Pairing Code [or 'q' to quit]: ").strip()
        if not user_input or user_input.lower() == 'q':
            print("\n[!] Setup cancelled.")
            safe_exit(0)

        if connector.pair(user_input):
            print("\n[✓] Successfully paired!")
            connector.run_daemon(interval=args.interval)
            return

        print("\n[!] Pairing was not successful.")
        retry = input("Would you like to try again? (Y/n): ").strip().lower()
        if retry in ('n', 'no'):
            safe_exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[!] Connector closed by user.")
        safe_exit(0)
    except Exception as exc:
        print(f"\n[!] Unexpected Error: {exc}")
        import traceback
        traceback.print_exc()
        safe_exit(1)
