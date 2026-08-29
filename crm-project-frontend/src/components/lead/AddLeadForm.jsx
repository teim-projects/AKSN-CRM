import React, { useEffect, useMemo, useState } from "react";
import { RxCross2 } from "react-icons/rx";
import Swal from "sweetalert2";
import { useUserRole } from '../../hooks/useAuth';
import { State, City } from "country-state-city";
import Select from "react-select";

export default function AddLeadForm({
  open,
  onClose,
  onSuccess,
  baseApi,
  token = "",
  lead = null,
}) {
  const states = useMemo(() => State.getStatesOfCountry("IN"), []);
  const API_URL = `${baseApi.replace(/\/$/, "")}/lead/lead/`;
  const PRODUCT_API_URL = `${baseApi.replace(/\/$/, "")}/product/products/`;
  const STAFF_API_URL = `${baseApi.replace(/\/$/, "")}/auth/staff/all/`;
  const { userRole, userInfo } = useUserRole(baseApi);
  const isAdmin = userInfo?.is_superuser || ["admin", "sub-admin", "subadmin"].includes(userInfo?.role?.name?.toLowerCase());
  const [step, setStep] = useState(1);
  const [convertingToCustomer, setConvertingToCustomer] = useState(false);
  const [showOtherLeadSource, setShowOtherLeadSource] = useState(false);
  const [showOtherIndustry, setShowOtherIndustry] = useState(false);

  const [formData, setFormData] = useState({
    enquiry_date: "",
    company_name: "",
    mobile_number: "",
    linkedin_profile_url: "",
    state: "",
    product_interested: [],
    expected_closure_date: "",
    lead_source: "",
    lead_source_other: "",
    contact_person: "",
    email_address: "",
    city: "",
    industry_type: "",
    industry_type_other: "",
    expected_budget: "",
    priority: "",
    assigned_executive: "",
    followup_date: "",
    pipeline_stage: "new_lead",
    status: "open",
    is_tally_user: "",
    tally_number: "",
    requirement_details: "",
    remarks: "",
    amount: "",
    // ✅ NEW FIELDS
    gst_number: "",
    pan_number: "",
    msme_number: "",
    address: "",
  });

  const cities = useMemo(() => {
    if (!formData.state) return [];
    const selectedState = states.find(state => state.name === formData.state);
    return selectedState ? City.getCitiesOfState("IN", selectedState.isoCode) : [];
  }, [formData.state, states]);

  const [products, setProducts] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileError, setMobileError] = useState("");

  const authToken = useMemo(() =>
    token ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    "",
    [token]
  );

  // Lead Source Options
  const leadSourceOptions = [
    { id: "website", name: "Website" },
    { id: "referral", name: "Referral" },
    { id: "cold_call", name: "Cold Call" },
    { id: "social_media", name: "Social Media" },
    { id: "email_campaign", name: "Email Campaign" },
    { id: "exhibition", name: "Exhibition" },
    { id: "other", name: "Other" },
  ];

  // Industry Type Options
  const industryOptions = [
    { id: "it_services", name: "IT Services" },
    { id: "manufacturing", name: "Manufacturing" },
    { id: "banking", name: "Banking" },
    { id: "automotive", name: "Automotive" },
    { id: "healthcare", name: "Healthcare" },
    { id: "education", name: "Education" },
    { id: "real_estate", name: "Real Estate" },
    { id: "other", name: "Other" },
  ];

  const priorityOptions = [
    { id: "critical", name: "Critical" },
    { id: "high", name: "High" },
    { id: "medium", name: "Medium" },
    { id: "low", name: "Low" },
  ];

  const pipelineOptions = [
    { id: "new_lead", name: "New Lead" },
    { id: "contacted", name: "Contacted" },
    { id: "requirement_gathering", name: "Requirement Gathering" },
    { id: "demo_scheduled", name: "Demo Scheduled" },
    { id: "demo_completed", name: "Demo Completed" },
    { id: "proposal_sent", name: "Proposal Sent" },
    { id: "negotiation", name: "Negotiation" },
  ];

  const statusOptions = [
    { id: "open", name: "Open" },
    { id: "close_win", name: "Close Win" },
    { id: "close_loss", name: "Close Loss" },
  ];

  // Reset form when opened or lead changes
  useEffect(() => {
    if (!open) return;

    setStep(1);
    setShowOtherLeadSource(false);
    setShowOtherIndustry(false);

    // Fetch products
    const controller = new AbortController();
    setLoadingProducts(true);

    fetch(PRODUCT_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} ${txt}`);
        }
        return res.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.results ?? [];
        setProducts(items);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch products:", err);
          setProducts([]);
        }
      })
      .finally(() => setLoadingProducts(false));

    return () => controller.abort();
  }, [open, PRODUCT_API_URL, authToken]);

  // Fetch staff separately
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoadingStaff(true);

    fetch(STAFF_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} ${txt}`);
        }
        return res.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.results ?? [];
        setStaffOptions(
          items.map((u) => ({
            id: u.id,
            name: `${u.first_name} ${u.last_name}`.trim() || u.email || u.mobile_no,
            email: u.email,
            mobile: u.mobile_no,
          }))
        );
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch staff:", err);
          setStaffOptions([]);
        }
      })
      .finally(() => setLoadingStaff(false));

    return () => controller.abort();
  }, [open, STAFF_API_URL, authToken]);

  // Set form data when lead changes
  useEffect(() => {
    if (!open) return;

    if (lead) {
      const isLeadSourceOther = lead.lead_source && !leadSourceOptions.some(opt => opt.id === lead.lead_source);
      const isIndustryOther = lead.industry_type && !industryOptions.some(opt => opt.id === lead.industry_type);

      setFormData({
        enquiry_date: lead.enquiry_date || "",
        company_name: lead.company_name || "",
        mobile_number: lead.mobile_number || "",
        linkedin_profile_url: lead.linkedin_profile_url || "",
        state: lead.state || "",
        product_interested: Array.isArray(lead.product_interested) 
          ? lead.product_interested 
          : lead.product_interested 
            ? [lead.product_interested] 
            : [],
        expected_closure_date: lead.expected_closure_date || "",
        lead_source: isLeadSourceOther ? "other" : (lead.lead_source || ""),
        lead_source_other: isLeadSourceOther ? lead.lead_source : "",
        contact_person: lead.contact_person || "",
        email_address: lead.email_address || "",
        city: lead.city || "",
        industry_type: isIndustryOther ? "other" : (lead.industry_type || ""),
        industry_type_other: isIndustryOther ? lead.industry_type : "",
        expected_budget: lead.expected_budget || "",
        priority: lead.priority || "",
        assigned_executive: lead.assigned_executive || "",
        followup_date: lead.followup_date || "",
        pipeline_stage: lead.pipeline_stage || "new_lead",
        status: lead.status || "open",
        is_tally_user: lead.is_tally_user || "",
        tally_number: lead.tally_number || "",
        requirement_details: lead.requirement_details || "",
        remarks: lead.remarks || "",
        amount: lead.amount !== undefined && lead.amount !== null ? String(lead.amount) : "",
        // ✅ NEW FIELDS
        gst_number: lead.gst_number || "",
        pan_number: lead.pan_number || "",
        msme_number: lead.msme_number || "",
        address: lead.address || "",
      });

      setShowOtherLeadSource(isLeadSourceOther);
      setShowOtherIndustry(isIndustryOther);
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      setFormData({
        enquiry_date: todayStr,
        company_name: "",
        mobile_number: "",
        linkedin_profile_url: "",
        state: "",
        product_interested: [],
        expected_closure_date: "",
        lead_source: "",
        lead_source_other: "",
        contact_person: "",
        email_address: "",
        city: "",
        industry_type: "",
        industry_type_other: "",
        expected_budget: "",
        priority: "",
        assigned_executive: !isAdmin && userInfo?.id ? userInfo.id : "",
        followup_date: "",
        pipeline_stage: "new_lead",
        status: "open",
        is_tally_user: "",
        tally_number: "",
        requirement_details: "",
        remarks: "",
        amount: "",
        // ✅ NEW FIELDS
        gst_number: "",
        pan_number: "",
        msme_number: "",
        address: "",
      });

      setShowOtherLeadSource(false);
      setShowOtherIndustry(false);
    }
  }, [open, lead, isAdmin, userInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, selected) => {
    setFormData((prev) => ({ ...prev, [name]: selected ? selected.value : "" }));
  };

  const handleMultiSelectChange = (name, selected) => {
    const values = selected ? selected.map((opt) => opt.value) : [];
    setFormData((prev) => {
      const updated = { ...prev, [name]: values };
      if (name === "product_interested") {
        let total = 0;
        values.forEach((val) => {
          const prod = products.find(
            (p) => p.id === val || p.id === Number(val) || p.name === val
          );
          if (prod && prod.unit_price) {
            total += parseFloat(prod.unit_price) || 0;
          }
        });
        updated.amount = total > 0 ? total.toFixed(2) : "";
      }
      return updated;
    });
  };

  const clearError = (e) => {
    e.target.classList.remove("input-error");
  };

  const showError = (field, message) => {
    Swal.fire({
      icon: "error",
      title: "Validation",
      text: message,
    });

    const el = document.querySelector(`[name="${field}"]`);
    if (el) {
      el.classList.add("input-error");
    }
  };

  const checkDuplicateMobile = async (numToTest) => {
    const rawVal = numToTest !== undefined ? numToTest : formData.mobile_number;
    if (!rawVal) {
      setMobileError("");
      return false;
    }
    const digits = rawVal.replace(/\D/g, '');
    if (digits.length < 10) {
      setMobileError("");
      return false;
    }

    try {
      const res = await fetch(`${API_URL}?search=${encodeURIComponent(digits)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
        
        const duplicate = results.find((l) => {
          if (lead?.id && String(l.id) === String(lead.id)) return false;
          const lDigits = (l.mobile_number || "").replace(/\D/g, '');
          return lDigits && (lDigits === digits || (digits.length >= 10 && lDigits.length >= 10 && digits.slice(-10) === lDigits.slice(-10)));
        });

        if (duplicate) {
          const compMsg = duplicate.company_name ? ` (Company: ${duplicate.company_name})` : '';
          const msg = `A lead with this mobile number already exists${compMsg}.`;
          setMobileError(msg);
          return true;
        }
      }
    } catch (err) {
      console.error("Error checking duplicate mobile number:", err);
    }
    setMobileError("");
    return false;
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    if (!formData.enquiry_date) {
      showError("enquiry_date", "Lead Date is required");
      return false;
    }
    if (!formData.company_name.trim()) {
      showError("company_name", "Company Name is required");
      return false;
    }
    if (!formData.mobile_number.trim()) {
      showError("mobile_number", "Mobile Number is required");
      return false;
    }
    if (!/^\d{10}$/.test(formData.mobile_number.replace(/\s/g, ''))) {
      showError("mobile_number", "Please enter a valid 10-digit mobile number");
      return false;
    }
    if (mobileError) {
      showError("mobile_number", mobileError);
      return false;
    }
    if (formData.email_address && !emailRegex.test(formData.email_address)) {
      showError("email_address", "Please enter a valid email address");
      return false;
    }
    const leadSourceValue = formData.lead_source === "other" ? formData.lead_source_other : formData.lead_source;
    if (!leadSourceValue || !leadSourceValue.trim()) {
      showError("lead_source", "Lead Source is required");
      return false;
    }
    if (!formData.contact_person.trim()) {
      showError("contact_person", "Contact Person is required");
      return false;
    }
    if (!formData.priority) {
      showError("priority", "Priority is required");
      return false;
    }
    return true;
  };

  const validateStep1 = () => {
    if (!formData.company_name.trim()) {
      showError("company_name", "Company Name is required");
      return false;
    }
    if (!formData.mobile_number.trim()) {
      showError("mobile_number", "Mobile Number is required");
      return false;
    }
    if (!/^\d{10}$/.test(formData.mobile_number.replace(/\s/g, ''))) {
      showError("mobile_number", "Please enter a valid 10-digit mobile number");
      return false;
    }
    if (mobileError) {
      showError("mobile_number", mobileError);
      return false;
    }
    if (formData.email_address && !emailRegex.test(formData.email_address)) {
      showError("email_address", "Please enter a valid email address");
      return false;
    }
    const leadSourceValue = formData.lead_source === "other" ? formData.lead_source_other : formData.lead_source;
    if (!leadSourceValue || !leadSourceValue.trim()) {
      showError("lead_source", "Lead Source is required");
      return false;
    }
    if (!formData.contact_person.trim()) {
      showError("contact_person", "Contact Person is required");
      return false;
    }
    if (!formData.priority) {
      showError("priority", "Priority is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return null;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch {
          return null;
        }
      };

      let leadSourceValue = formData.lead_source;
      if (leadSourceValue === "other") {
        leadSourceValue = formData.lead_source_other || "other";
      }

      let industryTypeValue = formData.industry_type;
      if (industryTypeValue === "other") {
        industryTypeValue = formData.industry_type_other || "other";
      }

      const payload = {
        enquiry_date: formatDate(formData.enquiry_date),
        company_name: formData.company_name,
        mobile_number: formData.mobile_number,
        linkedin_profile_url: formData.linkedin_profile_url || "",
        state: formData.state || "",
        product_interested: formData.product_interested || [],
        amount: formData.amount !== "" && formData.amount !== null ? parseFloat(formData.amount) : 0.00,
        expected_closure_date: formatDate(formData.expected_closure_date),
        lead_source: leadSourceValue,
        contact_person: formData.contact_person,
        email_address: formData.email_address || "",
        city: formData.city || "",
        industry_type: industryTypeValue,
        expected_budget: formData.expected_budget || "",
        priority: formData.priority,
        assigned_executive: formData.assigned_executive || null,
        followup_date: formatDate(formData.followup_date),
        pipeline_stage: formData.pipeline_stage || "new_lead",
        is_tally_user: formData.is_tally_user || "",
        tally_number: formData.is_tally_user === "yes" ? (formData.tally_number || "") : "",
        requirement_details: formData.requirement_details || "",
        remarks: formData.remarks || "",
        status: "open",
        // ✅ NEW FIELDS
        gst_number: formData.gst_number || "",
        pan_number: formData.pan_number || "",
        msme_number: formData.msme_number || "",
        address: formData.address || "",
      };

      const url = lead ? `${API_URL}${lead.id}/` : API_URL;
      const method = lead ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data && typeof data === 'object') {
          const errorMessages = Object.entries(data)
            .map(([field, messages]) => {
              const msg = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${msg}`;
            })
            .join('\n');
          throw new Error(errorMessages || 'Validation failed');
        }
        const msg = data?.detail || JSON.stringify(data) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      Swal.fire({
        icon: "success",
        text: lead ? "Lead updated successfully" : "Lead added successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      window.dispatchEvent(
        new CustomEvent("newNotification", {
          detail: {
            title: lead ? "Lead Record Updated" : "New Lead Added",
            description: `Lead ${lead ? "updated" : "created"} for ${formData.company_name || formData.contact_person || "Client"}.`,
            type: "leads",
            badge: lead ? "Updated" : "New Lead",
          },
        })
      );

      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to save lead",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToCustomer = async () => {
    if (!lead || !lead.id) return;
    
    const result = await Swal.fire({
      title: "Convert to Customer?",
      text: "This will create a customer record from this lead data.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Convert",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    setConvertingToCustomer(true);
    try {
      const response = await fetch(`${API_URL}${lead.id}/convert-to-customer/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to convert lead");
      }

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: data.message || "Lead converted to customer successfully",
        timer: 2000,
        showConfirmButton: false
      });

      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Conversion Failed",
        text: err.message
      });
    } finally {
      setConvertingToCustomer(false);
    }
  };

  const handleNext = async (e) => {
    e.preventDefault();
    const isDup = await checkDuplicateMobile();
    if (isDup) {
      showError("mobile_number", mobileError || "A lead with this mobile number already exists.");
      return;
    }
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleLeadSourceChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, lead_source: value }));
    setShowOtherLeadSource(value === "other");
    if (value !== "other") {
      setFormData(prev => ({ ...prev, lead_source_other: "" }));
    }
  };

  const handleIndustryChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, industry_type: value }));
    setShowOtherIndustry(value === "other");
    if (value !== "other") {
      setFormData(prev => ({ ...prev, industry_type_other: "" }));
    }
  };

  const productSelectOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  if (!open) return null;

  return (
    <>
      <style>
        {`
          .input-error {
            border: 1px solid #ef4444 !important;
          }
        `}
      </style>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden">
          
          {/* Header Bar */}
          <div className="bg-white px-6 pt-6 pb-2 flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {lead ? "Edit Lead" : "Add New Lead"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Manage pipeline details and lead attributes</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
            >
              <RxCross2 size={18} />
            </button>
          </div>

          {/* Form Main Body */}
          <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
            <form className="space-y-4 text-slate-800" onSubmit={handleSubmit}>
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Lead Date *
                    </label>
                    <input
                      type="date"
                      name="enquiry_date"
                      value={formData.enquiry_date}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Company Name *
                    </label>
                    <input
                      name="company_name"
                      type="text"
                      placeholder="e.g. Infosys Ltd"
                      value={formData.company_name}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Mobile Number *
                    </label>
                    <input
                      name="mobile_number"
                      type="text"
                      placeholder="+91 98765 43210"
                      value={formData.mobile_number}
                      onBlur={(e) => checkDuplicateMobile(e.target.value)}
                      onChange={(e) => {
                        clearError(e);
                        setMobileError("");
                        handleChange(e);
                      }}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white ${
                        mobileError ? "border-rose-500 bg-rose-50/50" : "border-slate-200"
                      }`}
                    />
                    {mobileError && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <span>⚠️</span> {mobileError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      LinkedIn Profile URL
                    </label>
                    <input
                      name="linkedin_profile_url"
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={formData.linkedin_profile_url}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      State
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                        setFormData(prev => ({ ...prev, city: "" }));
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state.isoCode} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Product Interested *
                    </label>
                    <Select
                      isMulti
                      options={productSelectOptions}
                      value={productSelectOptions.filter(option =>
                        (formData.product_interested || []).includes(option.value)
                      )}
                      onChange={(selected) => handleMultiSelectChange('product_interested', selected)}
                      placeholder="Select products..."
                      className="text-sm mt-0.5"
                      isLoading={loadingProducts}
                      noOptionsMessage={() => loadingProducts ? "Loading products..." : "No products found"}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '38px',
                          borderColor: '#e2e8f0',
                          borderRadius: '0.5rem',
                          '&:hover': { borderColor: '#e2e8f0' },
                        }),
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Amount (₹)
                    </label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Expected Closure Date
                    </label>
                    <input
                      type="date"
                      name="expected_closure_date"
                      value={formData.expected_closure_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Lead Source *
                    </label>
                    <select
                      name="lead_source"
                      value={formData.lead_source}
                      onChange={handleLeadSourceChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                    >
                      <option value="">Select Lead Source</option>
                      {leadSourceOptions.map(opt => (
                        <option value={opt.id} key={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showOtherLeadSource && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600">
                        Specify Other Lead Source *
                      </label>
                      <input
                        name="lead_source_other"
                        type="text"
                        placeholder="Enter custom lead source"
                        value={formData.lead_source_other}
                        onChange={(e) => {
                          clearError(e);
                          handleChange(e);
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Contact Person *
                    </label>
                    <input
                      name="contact_person"
                      type="text"
                      placeholder="Full name"
                      value={formData.contact_person}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email_address"
                      placeholder="contact@company.com"
                      value={formData.email_address}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      City
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      disabled={!formData.state}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 h-[38px]"
                    >
                      <option value="">
                        {!formData.state ? "Select State First" : "Select City"}
                      </option>
                      {cities.map((city) => (
                        <option value={city.name} key={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Industry Type
                    </label>
                    <select
                      name="industry_type"
                      value={formData.industry_type}
                      onChange={handleIndustryChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                    >
                      <option value="">Select Industry</option>
                      {industryOptions.map(opt => (
                        <option value={opt.id} key={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showOtherIndustry && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600">
                        Specify Other Industry Type
                      </label>
                      <input
                        name="industry_type_other"
                        type="text"
                        placeholder="Enter custom industry type"
                        value={formData.industry_type_other}
                        onChange={(e) => {
                          clearError(e);
                          handleChange(e);
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Expected Budget
                    </label>
                    <input
                      name="expected_budget"
                      type="text"
                      placeholder="Enter expected budget"
                      value={formData.expected_budget}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Priority *
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                    >
                      <option value="">Select Priority</option>
                      {priorityOptions.map(opt => (
                        <option value={opt.id} key={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ✅ NEW FIELDS - GST, PAN, MSME */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      GST Number
                    </label>
                    <input
                      name="gst_number"
                      type="text"
                      placeholder="29AAGCM0000A1ZP"
                      value={formData.gst_number}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      PAN Number
                    </label>
                    <input
                      name="pan_number"
                      type="text"
                      placeholder="AAGCM0000A"
                      value={formData.pan_number}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      maxLength={10}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      MSME Number
                    </label>
                    <input
                      name="msme_number"
                      type="text"
                      placeholder="UDYAM-XX-XX-XXXXXXX"
                      value={formData.msme_number}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      Address
                    </label>
                    <textarea
                      name="address"
                      rows={2}
                      placeholder="Enter full address details..."
                      value={formData.address}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Assigned Executive *
                      {!isAdmin && (
                        <span className="text-[11px] text-blue-600 font-normal ml-1.5">(Auto-mapped to your logged-in account)</span>
                      )}
                    </label>
                    <select
                      name="assigned_executive"
                      value={formData.assigned_executive}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px] disabled:bg-slate-50 disabled:text-slate-600 cursor-pointer disabled:cursor-not-allowed"
                      disabled={loadingStaff || (!isAdmin && Boolean(formData.assigned_executive))}
                    >
                      <option value="">{loadingStaff ? "Loading staff..." : "Select Executive"}</option>
                      {staffOptions.map((staff) => (
                        <option value={staff.id} key={staff.id}>
                          {staff.name} {staff.email && `(${staff.email})`}
                        </option>
                      ))}
                      {!isAdmin && userInfo?.id && !staffOptions.some(s => String(s.id) === String(userInfo.id)) && (
                        <option value={userInfo.id}>
                          {userInfo.full_name || userInfo.first_name || userInfo.email || "My Account"}
                        </option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      name="followup_date"
                      value={formData.followup_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Pipeline Stage
                    </label>
                    <select
                      name="pipeline_stage"
                      value={formData.pipeline_stage}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                    >
                      {pipelineOptions.map(opt => (
                        <option value={opt.id} key={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                    >
                      {statusOptions.map(opt => (
                        <option value={opt.id} key={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      Is the company a Tally user? *
                    </label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="radio"
                          name="is_tally_user"
                          value="yes"
                          checked={formData.is_tally_user === "yes"}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="radio"
                          name="is_tally_user"
                          value="no"
                          checked={formData.is_tally_user === "no"}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        No
                      </label>
                    </div>
                  </div>

                  {formData.is_tally_user === "yes" && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600">
                        Tally Serial / License Number
                      </label>
                      <input
                        type="text"
                        name="tally_number"
                        value={formData.tally_number || ""}
                        onChange={handleChange}
                        placeholder="Enter Tally serial number (e.g. 745892103)..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      Requirement Details
                    </label>
                    <textarea
                      name="requirement_details"
                      placeholder="Describe the client's requirements, pain points, and expectations..."
                      value={formData.requirement_details}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      Remarks
                    </label>
                    <textarea
                      name="remarks"
                      placeholder="Any additional notes..."
                      value={formData.remarks}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons Panel */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-6">
                {step === 2 ? (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    Cancel
                  </button>

                  {lead && !lead.is_converted && step === 2 && (
                    <button
                      type="button"
                      onClick={handleConvertToCustomer}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm shadow-green-500/10"
                      disabled={convertingToCustomer}
                    >
                      {convertingToCustomer ? "Converting..." : "Convert to Customer"}
                    </button>
                  )}

                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/10"
                    >
                      {loading ? (lead ? "Updating..." : "Saving...") : lead ? "Update Record" : "Submit Entry"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}