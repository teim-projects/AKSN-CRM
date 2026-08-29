import React, { useEffect, useState, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { RxCross2 } from "react-icons/rx"; 
import { CitySelect, StateSelect } from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";
import { GetState, GetCity } from "react-country-state-city";
import CreatableSelect from "react-select/creatable";
import { useUserRole } from "../../hooks/useAuth";

export default function AddCustomerForm({
  open,
  onClose,
  onSuccess,
  baseApi,
  customer = null
}) {
  const BASE_API = baseApi;
  const { userInfo } = useUserRole(BASE_API);
  const isAdmin = userInfo?.is_superuser || ["admin", "sub-admin", "subadmin"].includes(userInfo?.role?.name?.toLowerCase());
  const API_URL = `${BASE_API}/lead/customer/`;
  const LEAD_API_URL = `${BASE_API}/lead/lead/`;
  const PRODUCT_API_URL = `${BASE_API}/product/products/`;
  const STAFF_API_URL = `${BASE_API}/auth/staff/all/`;

  const [formData, setFormData] = useState({
    customer_code: "",
    name: "",
    contact_person: "",
    designation: "",
    contact_number: "",
    email: "",
    website: "",
    industry_category: "",
    gst_number: "",
    pan_number: "",
    msme_number: "", // ✅ NEW
    product_purchased: [],
    service_package: [],
    payment_terms: "",
    project_value: "",
    sales_executive: "",
    amc_start_date: "",
    amc_end_date: "",
    customer_status: "prospect",
    billing_address: "",
    city: "",
    state: "",
    pin_code: "",
    lead: "",
  });

  const [loading, setLoading] = useState(false);
  const [leadLookup, setLeadLookup] = useState("");
  const [loadingLead, setLoadingLead] = useState(false);
  const [leadFound, setLeadFound] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  
  const INDIA_ID = 101;
  const [cityid, setCityid] = useState(null);
  const [stateid, setStateid] = useState(0);

  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [hasAmc, setHasAmc] = useState(false);

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

  const paymentTermsOptions = [
    { id: "advance", name: "Advance" },
    { id: "partial", name: "Partial" },
    { id: "credit", name: "Credit" },
    { id: "milestone", name: "Milestone" },
    { id: "upon_completion", name: "Upon Completion" },
  ];

  const customerStatusOptions = [
    { id: "prospect", name: "Prospect" },
    { id: "active", name: "Active" },
    { id: "inactive", name: "Inactive" },
    { id: "on_hold", name: "On Hold" },
  ];

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  // Fetch Staff
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoadingStaff(true);

    fetch(STAFF_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  }, [open, STAFF_API_URL, token]);

  // Fetch Products (all products)
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoadingProducts(true);

    fetch(PRODUCT_API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        // Filter services (is_service = true)
        const serviceItems = items.filter(item => item.is_service === true);
        setServices(serviceItems);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch products:", err);
          setProducts([]);
          setServices([]);
        }
      })
      .finally(() => {
        setLoadingProducts(false);
        setLoadingServices(false);
      });

    return () => controller.abort();
  }, [open, PRODUCT_API_URL, token]);

  // Load customer data when editing
  useEffect(() => {
    if (!customer || !open) return;

    setFormData({
      customer_code: customer.customer_code || "",
      name: customer.name || "",
      contact_person: customer.contact_person || "",
      designation: customer.designation || "",
      contact_number: customer.contact_number || "",
      email: customer.email || "",
      website: customer.website || "",
      industry_category: customer.industry_category || "",
      gst_number: customer.gst_number || "",
      pan_number: customer.pan_number || customer.pan || "",
      msme_number: customer.msme_number || "", // ✅ NEW
      product_purchased: Array.isArray(customer.product_purchased) ? customer.product_purchased : [],
      service_package: Array.isArray(customer.service_package) ? customer.service_package : [],
      payment_terms: customer.payment_terms || "",
      project_value: customer.project_value || "",
      sales_executive: customer.sales_executive || "",
      amc_start_date: customer.amc_start_date || "",
      amc_end_date: customer.amc_end_date || "",
      customer_status: customer.customer_status || "prospect",
      billing_address: customer.billing_address || customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      pin_code: customer.pin_code || "",
      lead: customer.lead || "",
    });

    const prods = Array.isArray(customer.product_purchased) ? customer.product_purchased : [];
    const hasExistingAmc = Boolean(
      customer.amc_start_date ||
      customer.amc_end_date ||
      prods.some(p => typeof p === 'object' && p !== null && (p.amc_start_date || p.amc_end_date))
    );
    setHasAmc(hasExistingAmc);

    // Load states and cities
    GetState(INDIA_ID).then((states) => {
      const matchedState = states.find(
        s => s.name.toLowerCase() === customer.state?.toLowerCase()
      );

      if (matchedState) {
        setStateid(matchedState.id);
        setFormData(prev => ({ ...prev, state: matchedState.name }));

        GetCity(INDIA_ID, matchedState.id).then((cities) => {
          const matchedCity = cities.find(
            c => c.name.toLowerCase() === customer.city?.toLowerCase()
          );
          if (matchedCity) {
            setCityid(matchedCity.id);
            setFormData(prev => ({ ...prev, city: matchedCity.name }));
          }
        });
      }
    });
  }, [customer, open]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setHasAmc(false);
      setFormData({
        customer_code: "",
        name: "",
        contact_person: "",
        designation: "",
        contact_number: "",
        email: "",
        website: "",
        industry_category: "",
        gst_number: "",
        pan_number: "",
        msme_number: "", // ✅ NEW
        product_purchased: [],
        service_package: [],
        payment_terms: "",
        project_value: "",
        sales_executive: !isAdmin && userInfo?.id ? userInfo.id : "",
        amc_start_date: "",
        amc_end_date: "",
        customer_status: "prospect",
        billing_address: "",
        city: "",
        state: "",
        pin_code: "",
      });
      setLeadLookup("");
      setLeadFound(null);
      setCityid(null);
      setStateid(0);
    }
  }, [open, isAdmin, userInfo]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Lead Lookup
  const handleLeadLookup = async () => {
    if (!leadLookup.trim()) {
      Swal.fire({ icon: "warning", title: "Please enter a Lead ID or Mobile Number" });
      return;
    }

    setLoadingLead(true);
    try {
      const searchQuery = leadLookup.trim();
      let response;
      
      response = await fetch(`${LEAD_API_URL}?search=${searchQuery}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      let data = await response.json();
      let leads = Array.isArray(data) ? data : data.results || [];

      if (leads.length === 0 && !isNaN(searchQuery)) {
        response = await fetch(`${LEAD_API_URL}${searchQuery}/`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (response.ok) {
          const leadData = await response.json();
          leads = [leadData];
        }
      }

      if (leads.length === 0) {
        Swal.fire({ 
          icon: "info", 
          title: "No Lead Found", 
          text: "No lead found with this ID or mobile number" 
        });
        setLeadFound(null);
        return;
      }

      const lead = leads[0];
      setLeadFound(lead);

      setFormData(prev => ({
        ...prev,
        name: lead.company_name || prev.name,
        contact_person: lead.contact_person || prev.contact_person,
        contact_number: lead.mobile_number || prev.contact_number,
        email: lead.email_address || prev.email,
        city: lead.city || prev.city,
        state: lead.state || prev.state,
        industry_category: lead.industry_type || prev.industry_category,
        product_purchased: lead.product_interested || prev.product_purchased,
        lead: lead.id,
        // ✅ Auto-map new fields
        gst_number: lead.gst_number || prev.gst_number,
        pan_number: lead.pan_number || prev.pan_number,
        msme_number: lead.msme_number || prev.msme_number,
      }));

      Swal.fire({
        icon: "success",
        title: "Lead Found",
        text: `Lead: ${lead.company_name || lead.contact_person}`,
        timer: 1500,
        showConfirmButton: false
      });

    } catch (err) {
      console.error("Lead lookup error:", err);
      Swal.fire({ 
        icon: "error", 
        title: "Error", 
        text: "Failed to lookup lead" 
      });
    } finally {
      setLoadingLead(false);
    }
  };

  const validate = () => {
    if (!formData.name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Company Name is required" });
      return false;
    }
    
    if (formData.contact_number && formData.contact_number.toString().trim()) {
      const cleanNumber = formData.contact_number.toString().replace(/\D/g, "");
      if (cleanNumber.length !== 10) {
        Swal.fire({ icon: "error", title: "Validation", text: "Mobile number must be exactly 10 digits" });
        return false;
      }
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Swal.fire({ icon: "error", title: "Validation", text: "Email is invalid" });
      return false;
    }

    if (formData.gst_number && formData.gst_number.trim()) {
      const gstTrimmed = formData.gst_number.trim().toUpperCase();
      if (gstTrimmed.length !== 15) {
        Swal.fire({ icon: "error", title: "Validation", text: "GST number must be exactly 15 characters" });
        return false;
      }
      
      const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
      if (!gstPattern.test(gstTrimmed)) {
        Swal.fire({ 
          icon: "error", 
          title: "GST Validation", 
          text: "Invalid GST format. Expected format: 22AAAAA0000A1Z5" 
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person?.trim() || "",
        designation: formData.designation?.trim() || "",
        contact_number: formData.contact_number?.toString() || "",
        email: formData.email ? String(formData.email).trim() : "",
        website: formData.website?.trim() || "",
        industry_category: formData.industry_category || "",
        gst_number: formData.gst_number?.trim().toUpperCase() || "",
        pan_number: formData.pan_number?.trim().toUpperCase() || "",
        msme_number: formData.msme_number?.trim() || "", // ✅ NEW
        product_purchased: formData.product_purchased || [],
        service_package: formData.service_package || [],
        payment_terms: formData.payment_terms || "",
        project_value: formData.project_value || null,
        sales_executive: formData.sales_executive || null,
        amc_start_date: formData.amc_start_date || null,
        amc_end_date: formData.amc_end_date || null,
        customer_status: formData.customer_status || "prospect",
        billing_address: formData.billing_address?.trim() || "",
        city: formData.city?.trim() || "",
        state: formData.state?.trim() || "",
        pin_code: formData.pin_code?.toString().trim() || "",
        lead: formData.lead || null,
      };

      const url = customer ? `${API_URL}${customer.id}/` : API_URL;
      const method = customer ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      let data;
      try { data = await res.json(); } catch (e) { data = {}; }

      if (!res.ok) {
        let errorMessage = "";
        if (data) {
          if (typeof data === "object") {
            errorMessage = Object.entries(data)
              .map(([field, messages]) => {
                const msg = Array.isArray(messages) ? messages.join(", ") : messages;
                return `${field}: ${msg}`;
              })
              .join("\n");
          } else {
            errorMessage = data.detail || "Something went wrong";
          }
        } else {
          errorMessage = `${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // After successfully creating/updating customer, check if there's a lead with same mobile number
      // and mark it as converted if not already
      if (formData.contact_number && !customer) {
        try {
          const leadRes = await fetch(`${LEAD_API_URL}?search=${formData.contact_number}`, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          
          if (leadRes.ok) {
            const leadData = await leadRes.json();
            const leads = Array.isArray(leadData) ? leadData : leadData.results || [];
            
            if (leads.length > 0) {
              const lead = leads[0];
              if (!lead.is_converted) {
                const updateLeadRes = await fetch(`${LEAD_API_URL}${lead.id}/`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({
                    converted_to_customer: data.id,
                    is_converted: true
                  })
                });
                
                if (updateLeadRes.ok) {
                  console.log(`Lead ${lead.id} marked as converted to customer ${data.id}`);
                }
              }
            }
          }
        } catch (err) {
          console.error("Error linking lead to customer:", err);
        }
      }

      Swal.fire({
        icon: "success",
        text: customer ? "Customer updated successfully" : "Customer added successfully",
        timer: 1200,
        showConfirmButton: false
      });

      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to save customer" });
    } finally {
      setLoading(false);
    }
  };

  // Product options for react-select
  const productSelectOptions = products
    .filter(p => p.is_service !== true)
    .map((p) => ({
      value: p.name || String(p.id),
      label: p.name,
    }));

  // Service options for react-select (only is_service = true)
  const serviceSelectOptions = services
    .filter(s => s.is_service === true)
    .map((s) => ({
      value: s.name || String(s.id),
      label: s.name,
    }));

  const getSelectedProductList = () => {
    const raw = formData.product_purchased || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (typeof item === "object" && item !== null) {
        return {
          product: item.product || item.name || item.product_name || "",
          value: item.value !== undefined && item.value !== null ? item.value : (item.price !== undefined ? item.price : (item.project_value !== undefined ? item.project_value : "")),
          amc_start_date: item.amc_start_date || formData.amc_start_date || "",
          amc_end_date: item.amc_end_date || formData.amc_end_date || "",
        };
      }
      return {
        product: String(item),
        value: "",
        amc_start_date: formData.amc_start_date || "",
        amc_end_date: formData.amc_end_date || "",
      };
    }).filter(p => p.product);
  };

  const handleProductAmcChange = (productName, field, value) => {
    const currentList = getSelectedProductList();
    const updated = currentList.map((p) => {
      if (p.product === productName) {
        return { ...p, [field]: value };
      }
      return p;
    });

    let extraUpdates = {};
    if (field === "value") {
      const calcTotal = updated.reduce((sum, item) => {
        const num = parseFloat(item.value);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
      if (calcTotal > 0) {
        extraUpdates.project_value = String(calcTotal);
      }
    }

    setFormData((prev) => ({
      ...prev,
      ...extraUpdates,
      product_purchased: updated,
    }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 overflow-y-auto p-4 animate-fade-in">
        <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-3xl w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden">

          {/* HEADER */}
          <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {customer ? "Edit Customer" : "Add New Customer"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {customer ? `Code: ${customer.customer_code || 'N/A'}` : "Create new customer record"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RxCross2 size={18} />
            </button>
          </div>

          {/* FORM BODY */}
          <div className="p-6 overflow-y-auto flex-1 text-slate-800 scrollbar-thin">
            <form className="space-y-6" onSubmit={handleSubmit}>

              {/* Lead Lookup Section */}
              {!customer && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-xs font-semibold text-blue-700 mb-2">
                    Lookup Lead
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={leadLookup}
                      onChange={(e) => setLeadLookup(e.target.value)}
                      placeholder="Enter Lead ID or Mobile Number"
                      className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleLeadLookup}
                      disabled={loadingLead}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingLead ? "Searching..." : "Search"}
                    </button>
                  </div>
                  {leadFound && (
                    <div className="mt-2 text-xs text-green-700">
                      ✓ Lead found: {leadFound.company_name || leadFound.contact_person}
                    </div>
                  )}
                </div>
              )}

              {/* COMPANY INFORMATION */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 pb-1 border-b border-slate-200">
                  COMPANY INFORMATION
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Customer Code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                      value={formData.customer_code || "Auto-generated"} 
                      disabled
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      name="name"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      value={formData.name} 
                      onChange={handleChange} 
                      placeholder="Company name" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Contact Person <span className="text-red-500">*</span>
                    </label>
                    <input 
                      name="contact_person"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      value={formData.contact_person} 
                      onChange={handleChange} 
                      placeholder="Primary contact name" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Designation</label>
                    <input 
                      name="designation"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      value={formData.designation} 
                      onChange={handleChange} 
                      placeholder="e.g. CTO, IT Manager" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Mobile <span className="text-red-500">*</span>
                    </label>
                    <input 
                      name="contact_number"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.contact_number} 
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Email</label>
                    <input 
                      name="email"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      type="email"
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="contact@company.com" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Website</label>
                    <input 
                      name="website"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      type="url"
                      value={formData.website} 
                      onChange={handleChange} 
                      placeholder="www.company.com" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Industry Category</label>
                    <select
                      name="industry_category"
                      value={formData.industry_category}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select Industry</option>
                      {industryOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">GST Number</label>
                    <input 
                      name="gst_number"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      value={formData.gst_number} 
                      onChange={handleChange}
                      maxLength={15}
                      placeholder="29AAGCM0000A1ZP"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">PAN Number</label>
                    <input 
                      name="pan_number"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      value={formData.pan_number} 
                      onChange={handleChange}
                      maxLength={10}
                      placeholder="AAGCM0000A"
                    />
                  </div>

                  {/* ✅ MSME Number Field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">MSME Number</label>
                    <input 
                      name="msme_number"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      value={formData.msme_number} 
                      onChange={handleChange}
                      placeholder="UDYAM-XX-XX-XXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* COMMERCIAL DETAILS */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 pb-1 border-b border-slate-200">
                  COMMERCIAL DETAILS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Product Purchased</label>
                    <CreatableSelect
                      isMulti
                      options={productSelectOptions}
                      value={getSelectedProductList().map((p) => {
                        const match = productSelectOptions.find((opt) => String(opt.value) === String(p.product) || opt.label === p.product);
                        return match || { value: p.product, label: p.product };
                      })}
                      onChange={(selectedOptions) => {
                        const selectedValues = selectedOptions ? selectedOptions.map((opt) => opt.value || opt.label) : [];
                        const currentList = getSelectedProductList();
                        const updatedList = selectedValues.map((val) => {
                          const existing = currentList.find((p) => p.product === val || String(p.product) === String(val));
                          if (existing) return existing;
                          return {
                            product: val,
                            amc_start_date: formData.amc_start_date || "",
                            amc_end_date: formData.amc_end_date || "",
                          };
                        });
                        setFormData(prev => ({
                          ...prev,
                          product_purchased: updatedList
                        }));
                      }}
                      placeholder="Select products..."
                      className="text-sm"
                      isLoading={loadingProducts}
                      noOptionsMessage={() => loadingProducts ? "Loading products..." : "No products found"}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Service Package</label>
                    <CreatableSelect
                      isMulti
                      options={serviceSelectOptions}
                      value={serviceSelectOptions.filter(option =>
                        (formData.service_package || []).includes(option.value)
                      )}
                      onChange={(selectedOptions) => {
                        const values = selectedOptions
                          ? selectedOptions.map((opt) => opt.value)
                          : [];
                        setFormData(prev => ({
                          ...prev,
                          service_package: values
                        }));
                      }}
                      placeholder="Select services..."
                      className="text-sm"
                      isLoading={loadingServices}
                      noOptionsMessage={() => loadingServices ? "Loading services..." : "No services found"}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Payment Terms</label>
                    <select
                      name="payment_terms"
                      value={formData.payment_terms}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select Payment Terms</option>
                      {paymentTermsOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Project Value</label>
                    <input 
                      name="project_value"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      type="number"
                      value={formData.project_value} 
                      onChange={handleChange} 
                      placeholder="Amount" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Sales Executive
                      {!isAdmin && (
                        <span className="text-[11px] text-blue-600 font-normal ml-1.5">(Auto-mapped to your logged-in account)</span>
                      )}
                    </label>
                    <select
                      name="sales_executive"
                      value={formData.sales_executive}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-600 cursor-pointer disabled:cursor-not-allowed"
                      disabled={loadingStaff || (!isAdmin && Boolean(formData.sales_executive))}
                    >
                      <option value="">Select Executive</option>
                      {staffOptions.map((staff) => (
                        <option key={staff.id} value={staff.id}>
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
                    <label className="block text-xs font-semibold text-slate-600">Customer Status</label>
                    <select
                      name="customer_status"
                      value={formData.customer_status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      {customerStatusOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PER-PRODUCT INDIVIDUAL VALUES */}
                  {getSelectedProductList().length > 0 && (
                    <div className="col-span-full p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Per-Product Values (₹)
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Values entered auto-sum into Total Project Value
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {getSelectedProductList().map((prodItem, idx) => (
                          <div key={idx} className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                            <label className="block text-[11px] font-semibold text-slate-700 truncate" title={prodItem.product}>
                              {prodItem.product}
                            </label>
                            <input
                              type="number"
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                              placeholder="Product Value (₹)"
                              value={prodItem.value || ""}
                              onChange={(e) => handleProductAmcChange(prodItem.product, "value", e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AMC ON/OFF TOGGLE SWITCH */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl my-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Has AMC for Products?</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Turn ON to configure AMC Start & End dates for purchased products
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasAmc((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden ${
                    hasAmc ? "bg-blue-600" : "bg-slate-300"
                  }`}
                  title={hasAmc ? "Disable AMC Dates" : "Enable AMC Dates"}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      hasAmc ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* PER-PRODUCT AMC DETAILS (VISIBLE ONLY WHEN AMC TOGGLE IS ON) */}
              {hasAmc && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 pb-1 border-b border-slate-200">
                    PER-PRODUCT AMC DETAILS
                  </h4>
                  {getSelectedProductList().length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      Select product(s) in Commercial Details above to configure individual AMC dates.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getSelectedProductList().map((prodItem, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-blue-600 rounded-full block"></span>
                            Product: <span className="text-blue-700 font-semibold">{prodItem.product}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                AMC Start Date
                              </label>
                              <input
                                type="date"
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                                value={prodItem.amc_start_date || ""}
                                onChange={(e) => handleProductAmcChange(prodItem.product, "amc_start_date", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                AMC End Date
                              </label>
                              <input
                                type="date"
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                                value={prodItem.amc_end_date || ""}
                                onChange={(e) => handleProductAmcChange(prodItem.product, "amc_end_date", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ADDRESS */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 pb-1 border-b border-slate-200">
                  ADDRESS
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Billing Address</label>
                    <textarea 
                      name="billing_address"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      value={formData.billing_address} 
                      onChange={handleChange} 
                      rows={2} 
                      placeholder="Full billing address" 
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600">City</label>
                      <div className="input-like-select text-sm mt-0.5">
                        <CitySelect
                          key={`city-billing-${stateid}`}
                          countryid={INDIA_ID}
                          stateid={stateid}
                          defaultValue={customer && cityid ? { id: cityid, name: formData.city } : null}
                          onChange={(e) => {
                            setCityid(e.id);
                            setFormData(prev => ({ ...prev, city: e.name }));
                          }}
                          placeHolder="Select City"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600">State</label>
                      <div className="input-like-select text-sm mt-0.5">
                        <StateSelect
                          countryid={INDIA_ID}
                          defaultValue={customer && stateid ? { id: stateid, name: formData.state } : null}
                          onChange={(e) => {
                            setStateid(e.id);
                            setFormData(prev => ({ ...prev, state: e.name, city: "" }));
                            setCityid(0);
                          }}
                          placeHolder="Select State"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600">Pin Code</label>
                      <input
                        name="pin_code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                        value={formData.pin_code}
                        onChange={handleChange}
                        placeholder="6-digit PIN"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                  disabled={loading}
                >
                  {loading ? (customer ? "Updating..." : "Saving...") : (customer ? "Update Customer" : "Create Customer")}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      <style>
        {`
          .input-like-select .rsc-select-container {
            width: 100% !important;
          }
          
          .input-like-select .rsc-select-input {
            width: 100% !important;
            padding: 0.5rem 0.75rem !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 0.5rem !important;
            font-size: 0.875rem !important;
            background-color: #fff !important;
            color: #1e293b !important;
            padding-right: 0.75rem !important;
          }
          
          .input-like-select .rsc-select-input:focus {
            outline: none !important;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 1px #3b82f6 !important;
          }
          
          .input-like-select svg {
            display: none !important;
          }
        `}
      </style>
    </>
  );
}