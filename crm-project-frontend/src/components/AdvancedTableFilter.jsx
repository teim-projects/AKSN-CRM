import { useEffect, useState } from "react";

// Helper to identify if a field or label represents serial number (Sr. No.)
export const isSrNoField = (key, label) => {
  const k = String(key || "").toLowerCase().trim();
  const l = (typeof label === "string" ? label : "").toLowerCase().trim();
  return (
    k === "sr" ||
    k === "sr_no" ||
    k === "srno" ||
    k === "serial_no" ||
    k === "sno" ||
    k === "s_no" ||
    k === "sr." ||
    k.startsWith("sr_") ||
    k.startsWith("sr.") ||
    l.includes("sr.no") ||
    l.includes("sr. no") ||
    l.includes("sr no") ||
    l.includes("serial no") ||
    l === "sr" ||
    l === "sr.no." ||
    l === "sr."
  );
};

// Helper to extract filterable string/number value from an item
export const getFilterableValue = (item, field) => {
  if (!item || !field) return "";

  // 1. Specific handler for Sales / Project Executive / Support Coordinator / Assign To / Service Engineer
  if (
    field === "sales_executive" ||
    field === "sales_executive_details" ||
    field === "sales_executive_name" ||
    field === "project_executive" ||
    field === "project_executive_details" ||
    field === "project_executive_name" ||
    field === "support_coordinator" ||
    field === "support_coordinator_details" ||
    field === "support_coordinator_name" ||
    field === "coordinator" ||
    field === "contract_coordinator" ||
    field === "service_engineer" ||
    field === "service_engineer_details" ||
    field === "assign_to" ||
    field === "assigned_to" ||
    field === "assigned_executive" ||
    field === "executive"
  ) {
    const exec =
      item.support_coordinator_details ||
      item.project_executive_details ||
      item.sales_executive_details ||
      item.assigned_executive_details ||
      item.service_engineer_details;
    if (exec) {
      const parts = [
        exec.full_name,
        exec.first_name,
        exec.last_name,
        exec.name,
        exec.username,
        exec.email,
      ].filter(Boolean);
      return parts.join(" ");
    }
    if (item.support_coordinator && typeof item.support_coordinator === "object") {
      const parts = [
        item.support_coordinator.full_name,
        item.support_coordinator.first_name,
        item.support_coordinator.last_name,
        item.support_coordinator.name,
        item.support_coordinator.username,
      ].filter(Boolean);
      return parts.join(" ");
    }
    if (item.project_executive && typeof item.project_executive === "object") {
      const parts = [
        item.project_executive.full_name,
        item.project_executive.first_name,
        item.project_executive.last_name,
        item.project_executive.name,
        item.project_executive.username,
      ].filter(Boolean);
      return parts.join(" ");
    }
    if (item.sales_executive && typeof item.sales_executive === "object") {
      const parts = [
        item.sales_executive.full_name,
        item.sales_executive.first_name,
        item.sales_executive.last_name,
        item.sales_executive.name,
      ].filter(Boolean);
      return parts.join(" ");
    }
    if (item.assigned_executive && typeof item.assigned_executive === "object") {
      const parts = [
        item.assigned_executive.full_name,
        item.assigned_executive.first_name,
        item.assigned_executive.last_name,
        item.assigned_executive.name,
      ].filter(Boolean);
      return parts.join(" ");
    }
    return (
      item.support_coordinator_name ||
      item.project_executive_name ||
      item.sales_executive_name ||
      item.assign_to ||
      item.assigned_to ||
      (typeof item.support_coordinator === "string" ? item.support_coordinator : "") ||
      (typeof item.project_executive === "string" ? item.project_executive : "") ||
      (typeof item.sales_executive === "string" ? item.sales_executive : "") ||
      (item.support_coordinator !== null && item.support_coordinator !== undefined ? String(item.support_coordinator) : "") ||
      (item.project_executive !== null && item.project_executive !== undefined ? String(item.project_executive) : "") ||
      (item.sales_executive !== null && item.sales_executive !== undefined ? String(item.sales_executive) : "") ||
      (item.assigned_executive !== null && item.assigned_executive !== undefined ? String(item.assigned_executive) : "")
    );
  }

  // 2. Specific handler for Customer / Client
  if (
    field === "customer" ||
    field === "customer_name" ||
    field === "customer_details" ||
    field === "client" ||
    field === "client_name"
  ) {
    const cust = item.customer_details || item.customer;
    if (cust && typeof cust === "object") {
      const parts = [
        cust.company_name,
        cust.name,
        cust.contact_person,
        cust.phone,
        cust.mobile,
        cust.email,
      ].filter(Boolean);
      return parts.join(" ");
    }
    return (
      item.customer_name ||
      item.company_name ||
      item.name ||
      item.contact_person ||
      (item.customer !== null && item.customer !== undefined ? String(item.customer) : "")
    );
  }

  // 3. Specific handler for Project / Project Code
  if (
    field === "project" ||
    field === "project_code" ||
    field === "project_details" ||
    field === "project_name"
  ) {
    const proj = item.project_details || item.project;
    if (proj && typeof proj === "object") {
      const parts = [
        proj.project_code,
        proj.name,
        proj.title,
        proj.code,
      ].filter(Boolean);
      return parts.join(" ");
    }
    const idStr = item.id ? `#${item.id}` : "";
    return [
      item.project_code,
      item.project_name,
      item.name,
      idStr,
      typeof item.project === "string" ? item.project : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  // 4. Specific handler for AMC Dates / AMC Period / Period
  if (
    field === "amc_dates" ||
    field === "amc_date" ||
    field === "period" ||
    field === "contract_period" ||
    field === "amc_period" ||
    field === "amc_start_date" ||
    field === "amc_end_date"
  ) {
    const start = item.amc_start_date || item.start_date || "";
    const end = item.amc_end_date || item.end_date || "";
    if (field === "amc_start_date") return start;
    if (field === "amc_end_date") return end;
    return `${start} ${end}`.trim();
  }

  // 5. Specific handler for Products
  if (field === "product" || field === "products" || field === "product_name" || field === "product_interested") {
    const pVal = item.product ?? item.product_name ?? item.product_interested ?? item.products;
    if (Array.isArray(pVal)) {
      return pVal
        .map((p) => (typeof p === "object" ? p.name || p.product_name || p.product : String(p)))
        .join(" ");
    }
    if (pVal && typeof pVal === "object") {
      return pVal.name || pVal.product_name || pVal.product || "";
    }
    return item.product_name || item.product || (typeof pVal === "string" ? pVal : "");
  }

  // 6. Specific handler for Date
  if (field === "date") {
    return (
      item.date ||
      item.enquiry_date ||
      item.created_at ||
      item.quotation_date ||
      item.start_date ||
      item.date_created ||
      ""
    );
  }

  // 7. Specific handler for Followup Date
  if (
    field === "followup_date" ||
    field === "next_followup_date" ||
    field === "effective_followup_date"
  ) {
    return (
      item.followup_date ||
      item.effective_followup_date ||
      item.next_followup_date ||
      ""
    );
  }

  // 8. Contact person
  if (field === "contact" || field === "contact_person") {
    return item.contact_person || item.contact || item.customer_name || "";
  }

  // 9. Mobile
  if (field === "mobile" || field === "mobile_number" || field === "contact_number") {
    return item.contact_number || item.mobile_number || item.mobile || item.phone || "";
  }

  // 10. Company
  if (field === "company_name" || field === "company" || field === "name") {
    return item.name || item.company_name || item.company || "";
  }

  // 11. Total Amount / Revenue
  if (field === "total_amount" || field === "grand_total" || field === "amount") {
    if (item.versions && item.versions.length > 0) {
      const v = item.versions.find((x) => x.is_active) || item.versions[0];
      return v?.grand_total || v?.total_amount || item.amount || "";
    }
    return item.total_amount || item.grand_total || item.amount || "";
  }

  const val = item[field];
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    return val.full_name || val.name || val.label || "";
  }
  return val;
};

// Helper to check if string looks like a date
export const isDateValue = (val) => {
  if (!val || typeof val !== "string") return false;
  return (
    /^\d{4}-\d{2}-\d{2}/.test(val) ||
    /^\d{2}-\d{2}-\d{4}/.test(val) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val) ||
    (!isNaN(Date.parse(val)) && /\d{4}/.test(val))
  );
};

// Flexible Date Matcher that matches DD-MM-YYYY, DD-MM-YY, YYYY-MM-DD, and partials like "15-" or "15-03"
export const matchDate = (rawVal, rawSearch) => {
  if (!rawVal || !rawSearch) return false;
  const strVal = String(rawVal).trim();
  const search = String(rawSearch).trim().toLowerCase();

  // 1. Direct string match
  if (strVal.toLowerCase().includes(search)) return true;

  // 2. Parse Date
  const d = new Date(strVal);
  if (isNaN(d.getTime())) return false;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  const shortYear = year.slice(-2);
  const daySingle = String(d.getDate());
  const monthSingle = String(d.getMonth() + 1);

  const monthShort = d.toLocaleString("en-US", { month: "short" }).toLowerCase();
  const monthLong = d.toLocaleString("en-US", { month: "long" }).toLowerCase();

  // Generated format representations
  const formats = [
    `${day}-${month}-${year}`,
    `${day}-${monthSingle}-${year}`,
    `${daySingle}-${month}-${year}`,
    `${daySingle}-${monthSingle}-${year}`,
    `${day}-${month}-${shortYear}`,
    `${day}-${monthSingle}-${shortYear}`,
    `${daySingle}-${monthSingle}-${shortYear}`,
    `${day}/${month}/${year}`,
    `${day}/${monthSingle}/${year}`,
    `${daySingle}/${month}/${year}`,
    `${daySingle}/${monthSingle}/${year}`,
    `${year}-${month}-${day}`,
    `${year}/${month}/${day}`,
    `${day} ${monthShort} ${year}`,
    `${day} ${monthLong} ${year}`,
    `${monthShort} ${year}`,
    `${monthLong} ${year}`,
    `${month}-${year}`,
    `${month}/${year}`,
  ];

  for (const fmt of formats) {
    if (fmt.toLowerCase().includes(search)) return true;
  }

  // Test startsWith for partial typing (e.g. "15-", "15-03", "15/03")
  const dmyFull = `${day}-${month}-${year}`.toLowerCase();
  if (dmyFull.startsWith(search)) return true;

  const dmySlash = `${day}/${month}/${year}`.toLowerCase();
  if (dmySlash.startsWith(search)) return true;

  const ymdFull = `${year}-${month}-${day}`.toLowerCase();
  if (ymdFull.startsWith(search)) return true;

  // Test digits without separators (e.g. "1503" or "15032026")
  const searchDigits = search.replace(/[-/.\s]/g, "");
  if (searchDigits.length >= 2) {
    const normDmy = `${day}${month}${year}`;
    const normYmd = `${year}${month}${day}`;
    if (normDmy.includes(searchDigits) || normYmd.includes(searchDigits)) return true;
  }

  return false;
};

export default function AdvancedTableFilter({
  data = [],
  onFilter,
  setItemsPerPage,
  columns = [], // Optional: pass table columns to use specific fields
}) {
  const [filters, setFilters] = useState([
    {
      field: "",
      value: "",
    },
  ]);

  const [sortOrder, setSortOrder] = useState("");

  // Hidden technical / metadata fields + SR NO EXCLUSION FOR ALL PAGES
  const hiddenFields = [
    "id",
    "password",
    "role",
    "school",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "converted_to_customer",
    "is_converted",
    "followups",
    "sr",
    "sr_no",
    "srno",
    "serial_no",
    "sno",
    "s_no",
  ];

  // Detect fields from data
  const allFields = new Set();

  if (data && data.length > 0) {
    const firstItem = data[0];
    Object.keys(firstItem).forEach((key) => {
      const value = firstItem[key];
      const isSimpleValue =
        typeof value !== "object" ||
        value === null ||
        value instanceof Date;

      if (!hiddenFields.includes(key) && !isSrNoField(key) && isSimpleValue) {
        allFields.add(key);
      }
    });
  }

  // Filter columns: strictly exclude Sr. No. and technical fields
  const fields =
    columns.length > 0
      ? columns
        .filter((col) => {
          const key = col.key;
          const label = typeof col.label === "string" ? col.label : "";
          if (hiddenFields.includes(key)) return false;
          if (isSrNoField(key, label)) return false;
          return true;
        })
        .map((col) => col.key)
      : [...allFields].filter(
        (key) => !hiddenFields.includes(key) && !isSrNoField(key)
      );

  // Filter actions
  const addFilterRow = () => {
    setFilters([
      ...filters,
      {
        field: "",
        value: "",
      },
    ]);
  };

  const removeFilterRow = (index) => {
    const updated = [...filters];
    updated.splice(index, 1);
    setFilters(updated);
  };

  const handleFilterChange = (index, key, value) => {
    const updated = [...filters];
    updated[index][key] = value;
    setFilters(updated);
  };

  const clearAllFilters = () => {
    setFilters([{ field: "", value: "" }]);
    setSortOrder("");
  };

  // Apply filters engine
  useEffect(() => {
    let filteredData = [...data];

    filters.forEach((filter) => {
      if (filter.field && filter.value !== undefined && filter.value !== "") {
        const searchVal = String(filter.value).trim().toLowerCase();

        filteredData = filteredData.filter((item) => {
          const rawVal = getFilterableValue(item, filter.field);
          if (rawVal === null || rawVal === undefined || rawVal === "") return false;

          const isAmcPeriod =
            filter.field === "amc_dates" ||
            filter.field === "amc_date" ||
            filter.field === "period" ||
            filter.field === "contract_period" ||
            filter.field === "amc_period";

          if (isAmcPeriod) {
            const startDate = item.amc_start_date || item.start_date;
            const endDate = item.amc_end_date || item.end_date;
            const matchStart = startDate ? matchDate(startDate, searchVal) : false;
            const matchEnd = endDate ? matchDate(endDate, searchVal) : false;
            const matchRaw = String(rawVal).toLowerCase().includes(searchVal);
            return matchStart || matchEnd || matchRaw;
          }

          const isDateField =
            filter.field.includes("date") ||
            filter.field === "created_at" ||
            filter.field === "updated_at";

          if (isDateField || isDateValue(String(rawVal))) {
            return matchDate(rawVal, searchVal);
          }

          return String(rawVal).toLowerCase().includes(searchVal);
        });
      }
    });

    // Handle sorting
    if (sortOrder === "asc") {
      filteredData.sort((a, b) => {
        const firstKey = Object.keys(a)[0];
        const valA = a[firstKey] ?? "";
        const valB = b[firstKey] ?? "";
        return String(valA).localeCompare(String(valB));
      });
    }

    if (sortOrder === "desc") {
      filteredData.sort((a, b) => {
        const firstKey = Object.keys(b)[0];
        const valA = a[firstKey] ?? "";
        const valB = b[firstKey] ?? "";
        return String(valB).localeCompare(String(valA));
      });
    }

    onFilter(filteredData);
  }, [data, filters, sortOrder, onFilter]);

  // Get field label for display
  const getFieldLabel = (field) => {
    if (columns && columns.length > 0) {
      const col = columns.find((c) => c.key === field);
      if (col && typeof col.label === "string" && col.label.trim()) {
        return col.label;
      }
    }

    const labelMap = {
      support_coordinator: "Coordinator",
      coordinator: "Coordinator",
      contract_coordinator: "Contract Coordinator",
      project_code: "Project Code",
      project_executive: "Executive",
      amc_dates: "AMC Period",
      customer: "Customer",
      sales_executive: "Sales Executive",
      assign_to: "Assign To",
      assigned_to: "Assign To",
      assigned_executive: "Assign To",
      date: "Date",
      enquiry_date: "Enquiry Date",
      followup_date: "Follow-up Date",
      effective_followup_date: "Effective Follow-up Date",
      next_followup_date: "Next Follow-up Date",
      company_name: "Company Name",
      contact_person: "Contact Person",
      mobile_number: "Mobile Number",
      email_address: "Email",
      lead_source: "Lead Source",
      pipeline_stage: "Pipeline Stage",
      followup_count: "Total Follow-ups",
      status: "Status",
      priority: "Priority",
      expected_closure_date: "Expected Closure Date",
      city: "City",
      state: "State",
      industry_type: "Industry Type",
      expected_budget: "Expected Budget",
      is_tally_user: "Tally User",
      is_converted: "Converted",
      total_amount: "Total Amount",
      grand_total: "Grand Total",
      quotation_no: "Quotation No",
      quotation_date: "Quotation Date",
      quotation_for: "Quotation For",
    };

    if (labelMap[field]) return labelMap[field];

    return field
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div style={styles.sidebarLayout}>
      {/* FILTER CONDITION CARDS LAYER */}
      <div style={styles.sectionBlock}>
        <label style={styles.sectionLabel}>MATCH CONDITIONS</label>

        {filters.map((filter, index) => (
          <div key={index} style={styles.filterCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIndex}>Condition #{index + 1}</span>
              {filters.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFilterRow(index)}
                  style={styles.removeLink}
                >
                  Remove
                </button>
              )}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.fieldLabel}>Search Column Target</label>
              <select
                value={filter.field}
                onChange={(e) => handleFilterChange(index, "field", e.target.value)}
                style={styles.selectInput}
              >
                <option value="">Select Target Field...</option>
                {fields.map((field) => (
                  <option key={field} value={field}>
                    {getFieldLabel(field)}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.fieldLabel}>Value Query Selector</label>
              {filter.field.includes("is_") || filter.field.includes("_status") ? (
                <select
                  value={filter.value}
                  onChange={(e) => handleFilterChange(index, "value", e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="">Choose State...</option>
                  <option value="true">Yes / Active</option>
                  <option value="false">No / Inactive</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={
                    filter.field.includes("date") ||
                    filter.field === "date" ||
                    filter.field === "amc_dates" ||
                    filter.field === "period"
                      ? "e.g. 15-03-2026 or 2026-03-15"
                      : "Type search terms..."
                  }
                  value={filter.value}
                  onChange={(e) => handleFilterChange(index, "value", e.target.value)}
                  style={styles.textField}
                />
              )}
            </div>
          </div>
        ))}

        <button type="button" onClick={addFilterRow} style={styles.addRuleBtn}>
          ➕ Add Filter Rule
        </button>
      </div>

      <hr style={styles.divider} />

      {/* SORTING SECTION */}
      <div style={styles.sectionBlock}>
        <div style={styles.inputGroup}>
          <label style={styles.sectionLabel}>ALPHABETICAL SORTING</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={styles.selectInput}
          >
            <option value="">Default Listing Order</option>
            <option value="asc">A → Z (Ascending)</option>
            <option value="desc">Z → A (Descending)</option>
          </select>
        </div>
      </div>

      {/* ITEMS PER PAGE */}
      <div style={styles.sectionBlock}>
        <div style={styles.inputGroup}>
          <label style={styles.sectionLabel}>ITEMS SHOWN PER PAGE</label>
          <select
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            style={styles.selectInput}
            defaultValue={10}
          >
            <option value={5}>5 Rows per page</option>
            <option value={10}>10 Rows per page</option>
            <option value={20}>20 Rows per page</option>
            <option value={50}>50 Rows per page</option>
          </select>
        </div>
      </div>

      {/* RESET BUTTON */}
      <button type="button" onClick={clearAllFilters} style={styles.resetBtn}>
        Clear Active Filters
      </button>
    </div>
  );
}

const styles = {
  sidebarLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    width: "100%",
    boxSizing: "border-box",
  },
  sectionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: "0.08em",
    marginBottom: "4px",
  },
  filterCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px dashed #e2e8f0",
    paddingBottom: "8px",
  },
  cardIndex: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#94a3b8",
  },
  removeLink: {
    background: "none",
    border: "none",
    color: "#ef4444",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  fieldLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
  },
  selectInput: {
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: "13px",
    fontWeight: "500",
    outline: "none",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  textField: {
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  addRuleBtn: {
    background: "transparent",
    color: "#6080E8",
    border: "1px dashed #6080E8",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    textAlign: "center",
    marginTop: "4px",
    transition: "all 0.2s ease",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #e2e8f0",
    margin: "8px 0",
  },
  resetBtn: {
    background: "transparent",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    textAlign: "center",
    marginTop: "10px",
    transition: "background 0.2s",
  },
};