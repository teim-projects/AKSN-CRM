import React, { useState, useEffect } from "react";
import { RxCross2 } from "react-icons/rx";
import Swal from "sweetalert2";

export function getRecordEmail(record = {}) {
  if (!record) return "";
  return (
    record.email_address ||
    record.email ||
    record.customer_email ||
    record.lead_email ||
    record.lead?.email_address ||
    record.lead?.email ||
    record.lead_details?.email_address ||
    record.lead_details?.email ||
    record.customer?.email ||
    record.customer?.email_address ||
    record.customer_details?.email ||
    record.customer_details?.email_address ||
    record.primary_email ||
    record.secondary_email ||
    record.client_email ||
    ""
  );
}

export function getRecordPhone(record = {}) {
  if (!record) return "";
  return (
    record.mobile_number ||
    record.contact_number ||
    record.phone ||
    record.mobile ||
    record.phone_number ||
    record.customer_mobile ||
    record.lead_contact ||
    record.lead?.mobile_number ||
    record.lead?.phone ||
    record.lead_details?.mobile_number ||
    record.lead_details?.phone ||
    record.customer?.mobile_number ||
    record.customer?.contact_number ||
    record.customer?.phone ||
    record.customer_details?.mobile_number ||
    record.customer_details?.contact_number ||
    ""
  );
}

export function replacePlaceholders(templateText, record = {}) {
  if (!templateText) return "";

  const contactPerson =
    record.contact_person ||
    record.customer_name ||
    record.name ||
    record.client_name ||
    record.customer?.name ||
    record.customer?.contact_person ||
    record.lead_name ||
    "";

  const executiveName =
    record.assigned_executive_details?.full_name ||
    record.assigned_executive_details?.first_name ||
    record.sales_executive_details?.full_name ||
    record.sales_executive_details?.first_name ||
    record.executive_name ||
    record.created_by_details?.full_name ||
    record.created_by?.full_name ||
    "";

  let finalExecutive = executiveName;
  if (!finalExecutive) {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        finalExecutive = u.full_name || u.first_name || u.username || "";
      }
    } catch (e) {}
  }
  if (!finalExecutive) finalExecutive = "AKSN Infotech";

  const companyName =
    record.company_name ||
    record.company ||
    record.customer?.company_name ||
    "AKSN Infotech";

  const mobileNumber = getRecordPhone(record);
  const email = getRecordEmail(record);

  const siteName =
    record.site_name ||
    record.site ||
    record.site_address ||
    record.address ||
    "";

  const quotationNo =
    record.quotation_number ||
    record.quotation_no ||
    record.quote_no ||
    (record.id ? `QT-${record.id}` : "");

  const amountVal =
    record.total_amount ??
    record.amount ??
    record.contract_amount ??
    record.value;

  const amount =
    amountVal !== undefined && amountVal !== null && amountVal !== ""
      ? `₹${Number(amountVal).toLocaleString("en-IN")}`
      : "";

  const followupDate =
    record.followup_date ||
    record.follow_up_date ||
    record.next_followup_date ||
    "";

  const projectName =
    record.project_name ||
    record.title ||
    record.name ||
    "";

  const amcNo =
    record.contract_number ||
    record.amc_number ||
    record.amc_no ||
    (record.id ? `AMC-${record.id}` : "");

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const map = {
    "{contact_person}": contactPerson,
    "{customer_name}": contactPerson,
    "{executive_name}": finalExecutive,
    "{company_name}": companyName,
    "{mobile_number}": mobileNumber,
    "{email}": email,
    "{site_name}": siteName,
    "{quotation_no}": quotationNo,
    "{amount}": amount,
    "{followup_date}": followupDate,
    "{project_name}": projectName,
    "{amc_no}": amcNo,
    "{date}": today,
  };

  let result = templateText;
  Object.keys(map).forEach((placeholder) => {
    const val = map[placeholder] || "";
    result = result.split(placeholder).join(val);
  });

  return result;
}

export default function SendMessageModal({
  isOpen,
  onClose,
  category = "lead",
  recordData = {},
  initialChannel = "email",
  onSuccess,
}) {
  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [channel, setChannel] = useState(initialChannel || "email");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientMobile, setRecipientMobile] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachQuotationPdf, setAttachQuotationPdf] = useState(true);
  const [sending, setSending] = useState(false);

  // Extract recipient details on open
  useEffect(() => {
    if (isOpen && recordData) {
      let email = getRecordEmail(recordData);
      let mobile = getRecordPhone(recordData);

      setRecipientEmail(email);
      setRecipientMobile(mobile);
      setSelectedTemplateId("");
      setSubject("");
      setBody("");
      setAttachQuotationPdf(category === "quotation");
      setChannel(initialChannel || "email");

      // Asynchronous fallback: If email or mobile missing, auto-fetch from linked lead or customer
      const token = localStorage.getItem("access") || localStorage.getItem("token") || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if ((!email || !mobile) && (recordData.lead || recordData.customer || recordData.customer_id)) {
        const fetchLinkedInfo = async () => {
          try {
            // Check linked lead
            const leadId = typeof recordData.lead === "object" ? recordData.lead?.id : recordData.lead;
            if (leadId && (!email || !mobile)) {
              const res = await fetch(`${baseApi}/lead_management/lead_management/${leadId}/`, { headers });
              if (res.ok) {
                const lead = await res.json();
                if (!email && (lead.email_address || lead.email)) {
                  email = lead.email_address || lead.email;
                  setRecipientEmail(email);
                }
                if (!mobile && (lead.mobile_number || lead.contact_number || lead.phone)) {
                  mobile = lead.mobile_number || lead.contact_number || lead.phone;
                  setRecipientMobile(mobile);
                }
              }
            }

            // Check linked customer
            const custId = typeof recordData.customer === "object" ? recordData.customer?.id : (recordData.customer || recordData.customer_id);
            if (custId && (!email || !mobile)) {
              const res = await fetch(`${baseApi}/lead_management/customer/${custId}/`, { headers });
              if (res.ok) {
                const cust = await res.json();
                if (!email && (cust.email || cust.email_address)) {
                  email = cust.email || cust.email_address;
                  setRecipientEmail(email);
                }
                if (!mobile && (cust.contact_number || cust.mobile_number || cust.phone)) {
                  mobile = cust.contact_number || cust.mobile_number || cust.phone;
                  setRecipientMobile(mobile);
                }
              }
            }
          } catch (e) {
            console.error("Auto-fetch linked contact error:", e);
          }
        };
        fetchLinkedInfo();
      }

      fetchTemplates();
    }
  }, [isOpen, category, recordData, initialChannel]);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const token = localStorage.getItem("access") || localStorage.getItem("token") || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(
        `${baseApi}/templates/message-templates/?category=${category}&is_active=true`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setTemplates(list);

        const matching = list.filter((t) => t.channel === channel);
        if (matching.length > 0) {
          applyTemplate(matching[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (template) => {
    if (!template) return;
    setSelectedTemplateId(template.id);
    setChannel(template.channel);
    setSubject(replacePlaceholders(template.subject || "", recordData));
    setBody(replacePlaceholders(template.body || "", recordData));
  };

  const handleTemplateSelect = (e) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    const found = templates.find((t) => String(t.id) === String(id));
    if (found) {
      applyTemplate(found);
    }
  };

  const handleChannelSwitch = (newChannel) => {
    setChannel(newChannel);
    const matching = templates.filter((t) => t.channel === newChannel);
    if (matching.length > 0) {
      applyTemplate(matching[0]);
    } else {
      setSelectedTemplateId("");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (channel === "email") {
      if (!recipientEmail.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Missing Email",
          text: "Please provide a valid recipient email address.",
        });
        return;
      }
      if (!subject.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Missing Subject",
          text: "Please enter a subject line.",
        });
        return;
      }
      if (!body.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Missing Content",
          text: "Please enter the message body.",
        });
        return;
      }

      try {
        setSending(true);
        const token = localStorage.getItem("access") || localStorage.getItem("token") || "";
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const payload = {
          to_email: recipientEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          message: body.trim(),
          category: category,
          record_id: recordData?.id || null,
          quotation_id: category === "quotation" ? recordData?.id : null,
          attach_quotation_pdf: category === "quotation" && attachQuotationPdf,
        };

        const res = await fetch(`${baseApi}/templates/send-email/`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && (data.success || data.status === "success")) {
          Swal.fire({
            icon: "success",
            title: "Email Sent Successfully",
            text: `Dispatched to ${recipientEmail}`,
            timer: 2000,
            showConfirmButton: false,
          });
          if (onSuccess) onSuccess();
          onClose();
        } else {
          Swal.fire({
            icon: "error",
            title: "Failed to Send",
            text: data.error || data.message || "An unexpected error occurred while sending email.",
          });
        }
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.message || "Failed to reach server.",
        });
      } finally {
        setSending(false);
      }
    } else {
      // WhatsApp channel
      if (!recipientMobile.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Missing Mobile",
          text: "Please provide a recipient mobile number for WhatsApp.",
        });
        return;
      }

      const cleanPhone = recipientMobile.replace(/[^0-9]/g, "");
      const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(body)}`;

      window.open(url, "_blank");

      Swal.fire({
        icon: "success",
        title: "WhatsApp Opened",
        text: "The formatted message has been opened in WhatsApp Web.",
        timer: 1800,
        showConfirmButton: false,
      });

      if (onSuccess) onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentChannelTemplates = templates.filter((t) => t.channel === channel);
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header Bar - Exactly Matching AddLeadForm.jsx */}
        <div className="bg-white px-6 pt-6 pb-2 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Send Communication ({categoryLabel})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an automated template or compose your message
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
            title="Close"
          >
            <RxCross2 size={18} />
          </button>
        </div>

        {/* Form Main Body */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          <form className="space-y-4 text-slate-800" onSubmit={handleSend}>
            
            {/* Channel Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="block text-xs font-semibold text-slate-600">
                Communication Channel
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChannelSwitch("email")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    channel === "email"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/10"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelSwitch("whatsapp")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    channel === "whatsapp"
                      ? "bg-green-600 text-white shadow-sm shadow-green-500/10"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Select Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={handleTemplateSelect}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Choose a template to auto-fill --</option>
                {currentChannelTemplates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Field */}
            {channel === "email" ? (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Recipient Mobile Number *
                </label>
                <input
                  type="text"
                  value={recipientMobile}
                  onChange={(e) => setRecipientMobile(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            )}

            {/* Subject Field (Email Only) */}
            {channel === "email" && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            )}

            {/* Message Body Field */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Message Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Compose your message or select a template above..."
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white leading-relaxed resize-y"
              />
            </div>

            {/* PDF Attachment Option (Quotation) */}
            {category === "quotation" && channel === "email" && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="attachPdf"
                  checked={attachQuotationPdf}
                  onChange={(e) => setAttachQuotationPdf(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="attachPdf" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Attach Generated Quotation PDF (rendered via WeasyPrint)
                </label>
              </div>
            )}

            {/* Footer Buttons - Matching AddLeadForm.jsx */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className={`px-5 py-2 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 ${
                  channel === "whatsapp"
                    ? "bg-green-600 hover:bg-green-700 shadow-green-500/10"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10"
                }`}
              >
                {sending
                  ? "Sending..."
                  : channel === "whatsapp"
                  ? "Open in WhatsApp"
                  : "Send Email"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
