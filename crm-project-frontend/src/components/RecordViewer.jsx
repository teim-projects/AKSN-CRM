import React from "react";

export default function RecordViewer({
  isOpen,
  onClose,
  record,
  title = "Record Details",
}) {
  if (!isOpen || !record) return null;

  // Fields to hide - these are internal/system fields
  const hiddenFields = [
    "id",
    "password",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "created_by_details",
    "updated_by_details",
  ];

  // Serializer display fields to skip (these are derived from model fields)
  const displayFieldsToSkip = [
    // Lead display fields
    "lead_source_display",
    "industry_type_display",
    "priority_display",
    "pipeline_stage_display",
    "status_display",

    // Customer display fields
    "customer_status_display",
    "payment_terms_display",
    "industry_category_display",
    "sales_executive_details",
    "assigned_executive_details",

    // Follow-up display fields
    "followup_mode_display",
    "client_response_display",
    "decision_maker_contacted_display",
    "budget_status_display",
    "timeline_urgency_display",
    "pain_point_urgency_display",
    "next_followup_mode_display",
    "current_stage_display",
    "move_to_stage_display",

    // Product display fields
    "category_details",
    "category_name",

    // Related fields that are not actual model fields
    "followups",
    "faq_answers",
    "converted_to_customer",
  ];

  const formatLabel = (text) => {
    // Special formatting for common fields
    const labelMap = {
      'company_name': 'Company Name',
      'contact_person': 'Contact Person',
      'mobile_number': 'Mobile Number',
      'email_address': 'Email Address',
      'enquiry_date': 'Enquiry Date',
      'followup_date': 'Follow-up Date',
      'expected_closure_date': 'Expected Closure Date',
      'assigned_executive': 'Assigned Executive',
      'pipeline_stage': 'Pipeline Stage',
      'is_tally_user': 'Is Tally User',
      'requirement_details': 'Requirement Details',
      'product_interested': 'Product Interested',
      'product_purchased': 'Product Purchased',
      'service_package': 'Service Package',
      'billing_address': 'Billing Address',
      'gst_number': 'GST Number',
      'pan_number': 'PAN Number',
      'customer_code': 'Customer Code',
      'lead': 'Lead ID',
      'lead_id': 'Lead ID',
      'industry_category': 'Industry Category',
      'project_value': 'Project Value',
      'payment_terms': 'Payment Terms',
      'amc_start_date': 'AMC Start Date',
      'amc_end_date': 'AMC End Date',
      'customer_status': 'Customer Status',
      'lead_source': 'Lead Source',
      'expected_budget': 'Expected Budget',
      'amount': 'Amount (₹)',
      'linkedin_profile_url': 'LinkedIn Profile URL',
      'is_converted': 'Is Converted',
      'discussion_summary': 'Discussion Summary',
      'commitment_client': 'Commitment by Client',
      'commitment_us': 'Commitment by Us',
      'decision_maker_contacted': 'Decision Maker Contacted',
      'timeline_urgency': 'Timeline / Urgency',
      'pain_point_urgency': 'Pain Point / Problem Urgency',
      'budget_status': 'Budget Status',
      'competition': 'Competition',
      'number_of_users': 'Number of Users',
      'competitors_list': 'Competitors List',
      'next_followup_date': 'Next Follow-up Date',
      'next_followup_mode': 'Next Follow-up Mode',
      'additional_remarks': 'Additional Remarks',
      'ready_to_send_quotation': 'Ready to Send Quotation',
      'followup_number': 'Follow-up Number',
      'product_code': 'Product Code',
      'unit_price': 'Unit Price',
      'hsn_sac_code': 'HSN / SAC Code',
      'gst_percentage': 'GST Percentage',
      'is_service': 'Is Service',
      'product_image_url': 'Product Image URL',
    };

    if (labelMap[text]) return labelMap[text];

    return text
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatValue = (value, key) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    // Handle nested objects or arrays
    if (typeof value === "object") {
      try {
        if (Array.isArray(value)) {
          if (value.length === 0) return "—";
          // Check if array contains objects with name property
          if (typeof value[0] === "object" && value[0] !== null) {
            if (value[0].name) {
              return value.map(item => item.name).join(", ");
            }
            return JSON.stringify(value, null, 2);
          }
          return value.join(", ");
        }
        // Check if object has name property
        if (value !== null && value.name) {
          return value.name;
        }
        return JSON.stringify(value, null, 2);
      } catch {
        return "[Complex Data Object]";
      }
    }

    // Format date strings
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch {
        return value;
      }
    }

    // Format time strings
    if (typeof value === "string" && /^\d{2}:\d{2}:\d{2}$/.test(value)) {
      try {
        const [hours, minutes] = value.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
      } catch {
        return value;
      }
    }

    // Format currency
    if (typeof value === "number" && !isNaN(value) && value.toString().includes('.')) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value);
    }

    // Format description text as bracketed comma-separated points
    if (key === "description" && typeof value === "string" && value.trim()) {
      const raw = value.trim();
      const parts = raw.split(".");
      const bullets = [];
      parts.forEach((p) => {
        const cleaned = p.replace(/\s+/g, " ").trim();
        if (cleaned) bullets.push(cleaned + ".");
      });
      if (!raw.endsWith(".") && bullets.length > 0) {
        bullets[bullets.length - 1] = bullets[bullets.length - 1].replace(/\.$/, "");
      }
      return bullets.length > 0 ? `[ ${bullets.join(", ")} ]` : raw;
    }

    return String(value);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    if (!status) return "bg-gray-100 text-gray-600";
    const s = String(status).toLowerCase();
    if (s === "open" || s === "active" || s === "very_positive") return "bg-emerald-100 text-emerald-700";
    if (s === "closed" || s === "inactive" || s === "negative") return "bg-red-100 text-red-700";
    if (s === "in_process" || s === "pending" || s === "neutral") return "bg-yellow-100 text-yellow-700";
    if (s === "prospect") return "bg-blue-100 text-blue-700";
    if (s === "on_hold") return "bg-orange-100 text-orange-700";
    if (s === "positive") return "bg-green-100 text-green-700";
    if (s === "no_response") return "bg-gray-100 text-gray-600";
    if (s === "call_back_later") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  // Check if a field should be displayed as a status badge
  const isStatusField = (key) => {
    const statusKeys = [
      "status",
      "customer_status",
      "lead_status",
      "pipeline_stage",
      "payment_terms",
      "client_response",
      "followup_mode",
      "is_service",
      "priority"
    ];
    return statusKeys.some(sk => key === sk || key.includes(sk));
  };

  // Check if a field is a URL
  const isUrlField = (key) => {
    const urlKeys = ["url", "website", "linkedin", "profile_url", "image_url"];
    return urlKeys.some(uk => key.includes(uk));
  };

  // Check if a field is an email
  const isEmailField = (key) => {
    return key.includes("email");
  };

  // Check if a field is a phone number
  const isPhoneField = (key) => {
    const phoneKeys = ["phone", "mobile", "contact", "number"];
    return phoneKeys.some(pk => key.includes(pk));
  };

  // Filter out display fields and hidden fields
  const getDisplayFields = () => {
    return Object.entries(record)
      .filter(([key]) => {
        // Skip hidden fields
        if (hiddenFields.includes(key)) return false;
        // Skip display fields (serializer fields)
        if (displayFieldsToSkip.includes(key)) return false;
        // Skip fields that end with _display (like status_display)
        if (key.endsWith('_display')) return false;
        // Skip fields that end with _details (like assigned_executive_details)
        if (key.endsWith('_details') || key.endsWith('_details_display')) return false;
        return true;
      });
  };

  const displayFields = getDisplayFields();

  return (
    <>
      {/* Overlay */}
      <div
        style={styles.overlay}
        onClick={onClose}
      />

      {/* Drawer */}
      <div style={styles.drawer}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{title}</h2>
            <p style={styles.subtitle}>
              Complete Record Information
            </p>
          </div>

          <button
            onClick={onClose}
            style={styles.closeBtn}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {displayFields.length === 0 ? (
            <div style={styles.emptyState}>
              No fields available to display.
            </div>
          ) : (
            displayFields.map(([key, value]) => {
              const isStatus = isStatusField(key);
              const isUrl = isUrlField(key);
              const isEmail = isEmailField(key);
              const isPhone = isPhoneField(key);
              const formattedValue = formatValue(value, key);

              return (
                <div
                  key={key}
                  style={styles.fieldCard}
                >
                  <div style={styles.label}>
                    {formatLabel(key)}
                  </div>

                  <div style={styles.value}>
                    {isStatus ? (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}
                      >
                        {formattedValue}
                      </span>
                    ) : isUrl && value ? (
                      <a
                        href={value.startsWith('http') ? value : `https://${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                      >
                        {value}
                      </a>
                    ) : isEmail && value ? (
                      <a
                        href={`mailto:${value}`}
                        style={styles.link}
                      >
                        {value}
                      </a>
                    ) : isPhone && value ? (
                      <a
                        href={`tel:${value}`}
                        style={styles.link}
                      >
                        {value}
                      </a>
                    ) : (
                      <span style={styles.valueText}>
                        {formattedValue}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={onClose}
            style={styles.closeButton}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 1999,
  },

  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "450px",
    maxWidth: "100%",
    height: "100vh",
    background: "#ffffff",
    borderLeft: "1px solid #e2e8f0",
    zIndex: 2000,
    overflowY: "auto",
    boxShadow: "-25px 0 50px -12px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    background: "#ffffff",
    zIndex: 10,
    flexShrink: 0,
  },

  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
  },

  subtitle: {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
  },

  closeBtn: {
    border: "none",
    background: "none",
    fontSize: "28px",
    cursor: "pointer",
    color: "#94a3b8",
    lineHeight: "1",
    padding: "0 4px",
    transition: "color 0.2s",
  },

  content: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
    overflowY: "auto",
  },

  fieldCard: {
    padding: "14px 16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    transition: "border-color 0.2s",
  },

  label: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },

  value: {
    fontSize: "14px",
    color: "#1e293b",
    fontWeight: "500",
    wordBreak: "break-word",
  },

  valueText: {
    fontSize: "14px",
    color: "#1e293b",
    fontWeight: "500",
  },

  link: {
    color: "#3b82f6",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    wordBreak: "break-all",
    transition: "color 0.2s",
  },

  emptyState: {
    padding: "40px 20px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "14px",
  },

  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    background: "#ffffff",
    flexShrink: 0,
    display: "flex",
    justifyContent: "flex-end",
  },

  closeButton: {
    padding: "8px 20px",
    background: "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
};