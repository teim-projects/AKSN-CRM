import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Select from "react-select";
import { RxCross2 } from "react-icons/rx";
import { MdDelete } from "react-icons/md";

const BASE_API = import.meta.env.VITE_BASE_API_URL;

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function AddQuotation({ id, onBack }) {
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [versionName, setVersionName] = useState("");

  const [formData, setFormData] = useState({
    lead: "",
    company_name: "",
    contact_person: "",
    mobile_number: "",
    email_address: "",
    linkedin_profile_url: "",
    state: "",
    city: "",
    industry_type: "",
    gst_number: "",
    pan_number: "",
    msme_number: "",
    subject: "",
    gst_type: "CGST_SGST",
    thank_you_note: "",
  });

  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Single mobile number search
  const [searchingLead, setSearchingLead] = useState(false);
  const [leadFound, setLeadFound] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load quotation for edit
  useEffect(() => {
    if (!isEdit) return;

    const loadQuotation = async () => {
      try {
        const res = await api.get(`quotation/quotation/${id}/`);
        const q = res.data;

        const active = q.versions?.find((v) => v.is_active);
        if (active) {
          setVersionName(active.version_no);
        }

        const mobile = q.mobile_number || "";
        
        setFormData({
          lead: q.lead || "",
          company_name: q.company_name || "",
          contact_person: q.contact_person || "",
          mobile_number: mobile,
          email_address: q.email_address || "",
          linkedin_profile_url: q.linkedin_profile_url || "",
          state: q.state || "",
          city: q.city || "",
          industry_type: q.industry_type || "",
          gst_number: q.gst_number || "",      
          pan_number: q.pan_number || "",      
          msme_number: q.msme_number || "",
          subject: q.subject || "",
          gst_type: q.gst_type || "CGST_SGST",
          thank_you_note: q.thank_you_note || "",
        });

        if (active?.items) {
          setItems(
            active.items.map((item) => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_code: item.product_code,
              category: item.category,
              hsn_sac_code: item.hsn_sac_code,
              description: item.description || "",
              quantity: parseFloat(item.quantity) || 1,
              unit: item.unit || "NOS",
              unit_price: parseFloat(item.unit_price) || 0,
              gst_percentage: parseFloat(item.gst_percentage) || 18,
            }))
          );
        }

        // ✅ Auto-search for lead after loading data
        if (mobile && mobile.length >= 10) {
          await searchLeadByMobile(mobile);
        }
        setIsInitialLoad(false);

      } catch (err) {
        console.error("Error loading quotation:", err);
        Swal.fire({ icon: "error", title: "Error", text: "Failed to load quotation" });
        setIsInitialLoad(false);
      }
    };

    loadQuotation();
  }, [id, isEdit]);

  // Load products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await api.get(`product/products/`);
        const products = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setAvailableProducts(products);
      } catch (err) {
        console.error("Error loading products:", err);
        setAvailableProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Search lead by mobile number
  const searchLeadByMobile = useCallback(async (mobile) => {
    if (!mobile || mobile.length < 10) {
      setLeadFound(null);
      setFormData((prev) => ({
        ...prev,
        lead: "",
        company_name: "",
        contact_person: "",
        email_address: "",
        linkedin_profile_url: "",
        state: "",
        city: "",
        industry_type: "",
      }));
      return;
    }

    setSearchingLead(true);
    try {
      const res = await api.get(`lead/lead/?search=${mobile}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      
      // Find exact match by mobile number
      const lead = data.find(l => l.mobile_number === mobile);
      
      if (lead) {
        setLeadFound(lead);
        setFormData((prev) => ({
          ...prev,
          lead: lead.id,
          company_name: lead.company_name || "",
          contact_person: lead.contact_person || "",
          mobile_number: lead.mobile_number || "",
          email_address: lead.email_address || "",
          linkedin_profile_url: lead.linkedin_profile_url || "",
          gst_number: lead.gst_number || "",      
          pan_number: lead.pan_number || "",      
          msme_number: lead.msme_number || "", 
          state: lead.state || "",
          city: lead.city || "",
          industry_type: lead.industry_type || "",
        }));
      } else {
        setLeadFound(null);
        // Don't clear form data if we're editing and already have data
        if (!isEdit) {
          setFormData((prev) => ({
            ...prev,
            lead: "",
            company_name: "",
            contact_person: "",
            email_address: "",
            linkedin_profile_url: "",
            state: "",
            city: "",
            industry_type: "",
          }));
        }
      }
    } catch (err) {
      console.error("Error searching lead:", err);
      setLeadFound(null);
    } finally {
      setSearchingLead(false);
    }
  }, [isEdit]);

  // Debounced mobile search
  const debouncedMobileSearch = useCallback(
    debounce((mobile) => {
      searchLeadByMobile(mobile);
    }, 500),
    [searchLeadByMobile]
  );

  // Handle mobile number change
  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, mobile_number: value }));
    if (value.length >= 10) {
      debouncedMobileSearch(value);
    } else if (value.length < 10 && value.length > 0) {
      setLeadFound(null);
    }
  };

  // Add product
  const addProduct = (product) => {
    if (items.some((item) => item.product_id === product.id)) {
      Swal.fire({
        icon: "info",
        title: "Product Already Added",
        text: "This product is already in the quotation",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        product_code: product.product_code || "",
        category: product.category?.name || "",
        hsn_sac_code: product.hsn_sac_code || "",
        description: product.description || "",
        quantity: 1,
        unit: "NOS",
        unit_price: parseFloat(product.unit_price) || 0,
        gst_percentage: parseFloat(product.gst_percentage) || 18,
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  const calculateTotals = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;
    let grandTotal = 0;

    items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const gst = parseFloat(item.gst_percentage) || 18;

      const base = qty * price;
      const gstAmount = (base * gst) / 100;
      const total = base + gstAmount;

      subtotal += base;
      totalGst += gstAmount;
      grandTotal += total;
    });

    return { subtotal, totalGst, grandTotal };
  }, [items]);

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company_name || !formData.company_name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Company Name is required" });
      return;
    }
    if (!formData.contact_person || !formData.contact_person.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Contact Person is required" });
      return;
    }
    if (!formData.mobile_number || !formData.mobile_number.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Mobile Number is required" });
      return;
    }
    if (!formData.subject || !formData.subject.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Subject is required" });
      return;
    }
    if (!formData.thank_you_note || !formData.thank_you_note.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Thank You Note is required" });
      return;
    }
    if (items.length === 0) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please add at least one product" });
      return;
    }

    setLoading(true);

    const payload = {
      lead: formData.lead || null,
      
      company_name: formData.company_name,
      contact_person: formData.contact_person,
      mobile_number: formData.mobile_number,
      email_address: formData.email_address || "",
      linkedin_profile_url: formData.linkedin_profile_url || "",
      gst_number: formData.gst_number || "",
      pan_number: formData.pan_number || "",
      msme_number: formData.msme_number || "",
      state: formData.state || "",
      city: formData.city || "",
      industry_type: formData.industry_type || "",
      subject: formData.subject,
      gst_type: formData.gst_type,
      thank_you_note: formData.thank_you_note,
      items: items.map((item) => ({
        product_id: item.product_id || null,
        product_name: item.product_name,
        product_code: item.product_code || "",
        category: item.category || "",
        hsn_sac_code: item.hsn_sac_code || "",
        description: item.description || "",
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || "NOS",
        unit_price: parseFloat(item.unit_price) || 0,
        gst_percentage: parseFloat(item.gst_percentage) || 18,
      })),
    };

    try {
      if (isEdit) {
        await api.put(`quotation/quotation/${id}/`, payload);
      } else {
        await api.post("quotation/quotation/", payload);
      }

      Swal.fire({
        icon: "success",
        text: isEdit ? "Quotation updated successfully" : "Quotation created successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      onBack && onBack();
    } catch (err) {
      console.error("Error saving quotation:", err);
      let errorMsg = "Failed to save quotation";
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === "object") {
          const errors = Object.entries(data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
            .join("\n");
          errorMsg = errors || errorMsg;
        } else if (typeof data === "string") {
          errorMsg = data;
        }
      }
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const productOptions = useMemo(() => {
    return availableProducts.map((p) => ({
      value: p.id,
      label: p.name,
      product: p,
    }));
  }, [availableProducts]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-4xl w-full mx-auto my-6 relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white px-6 pt-6 pb-2 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isEdit
                ? versionName
                  ? `${versionName} - Edit Quotation`
                  : "Edit Quotation"
                : "Add New Quotation"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure quotation items and commercial pricing terms</p>
          </div>
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
          >
            <RxCross2 size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          <form onSubmit={handleSubmit} className="space-y-6 text-slate-800">
            {/* Lead Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                Lead Information
              </h4>

              {/* Mobile Number Search - Single field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter mobile number to fetch lead data..."
                    value={formData.mobile_number}
                    onChange={handleMobileChange}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    maxLength={10}
                  />
                  {searchingLead && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    </div>
                  )}
                  {leadFound && formData.mobile_number && (
                    <div className="absolute right-3 top-2.5 text-emerald-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {leadFound && (
                  <p className="text-[10px] text-emerald-600 font-medium">
                    ✓ Lead found: {leadFound.company_name || "No Company"} 
                    {leadFound.contact_person && ` • ${leadFound.contact_person}`}
                  </p>
                )}
                {!leadFound && formData.mobile_number && formData.mobile_number.length >= 10 && !searchingLead && !isInitialLoad && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    ⚠ No lead found with this number. You can manually enter details below.
                  </p>
                )}
              </div>

              {/* Fields - Auto-populated or manually editable */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Company Name *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="Company Name"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Contact Person *</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contact_person: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="Contact Person"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Email Address</label>
                  <input
                    type="email"
                    value={formData.email_address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email_address: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="contact@company.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={formData.linkedin_profile_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, linkedin_profile_url: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="State"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="City"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Industry Type</label>
                  <input
                    type="text"
                    value={formData.industry_type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, industry_type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="Industry Type"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">GST Number</label>
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gst_number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="29AAGCM0000A1ZP"
                    maxLength={15}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">PAN Number</label>
                  <input
                    type="text"
                    value={formData.pan_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pan_number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="AAGCM0000A"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">MSME Number</label>
                  <input
                    type="text"
                    value={formData.msme_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, msme_number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="UDYAM-XX-XX-XXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Quotation Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                Quotation Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600">Subject *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="Quotation Subject"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">GST Type *</label>
                  <select
                    value={formData.gst_type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gst_type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                  >
                    <option value="CGST_SGST">CGST + SGST</option>
                    <option value="IGST">IGST</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600">Thank You Note *</label>
                  <textarea
                    value={formData.thank_you_note}
                    onChange={(e) => setFormData((prev) => ({ ...prev, thank_you_note: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                    rows={2}
                    placeholder="Thank you note..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                Line Items *
              </h4>

              <div className="space-y-1">
                <Select
                  options={productOptions}
                  placeholder={loadingProducts ? "Loading products..." : "Search and select product..."}
                  isLoading={loadingProducts}
                  isClearable
                  onChange={(selected) => {
                    if (selected) {
                      addProduct(selected.product);
                    }
                  }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: "38px",
                      borderColor: "#e2e8f0",
                      borderRadius: "0.5rem",
                      "&:hover": { borderColor: "#e2e8f0" },
                    }),
                  }}
                />
              </div>

              {items.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200/80 rounded-lg shadow-2xs">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">HSN/SAC</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-center">GST %</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => {
                        const baseAmount = (item.quantity || 0) * (item.unit_price || 0);
                        const gstAmount = (baseAmount * (item.gst_percentage || 18)) / 100;
                        const total = baseAmount + gstAmount;

                        return (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-slate-400 font-medium">{index + 1}</td>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-900">{item.product_name}</div>
                              <div className="text-[10px] text-slate-400">{item.product_code}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-600">{item.hsn_sac_code || "-"}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 border border-slate-200 rounded text-center bg-white"
                                min="0.01"
                                step="0.01"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-slate-200 rounded text-right bg-white"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                value={item.gst_percentage}
                                onChange={(e) => updateItem(index, "gst_percentage", parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 border border-slate-200 rounded text-center bg-white"
                                min="0"
                                max="100"
                                step="0.01"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                              ₹{total.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              >
                                <MdDelete size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-medium">
                      <tr>
                        <td colSpan="6" className="px-3 py-1.5 text-right text-slate-600">Subtotal:</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                          ₹{calculateTotals.subtotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan="6" className="px-3 py-1.5 text-right text-slate-600">
                          GST ({formData.gst_type === "CGST_SGST" ? "CGST + SGST" : "IGST"}):
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                          ₹{calculateTotals.totalGst.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="border-t border-slate-200 font-bold text-slate-900">
                        <td colSpan="6" className="px-3 py-2 text-right">Grand Total:</td>
                        <td className="px-3 py-2 text-right text-blue-600 text-sm">
                          ₹{calculateTotals.grandTotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg">
                  No line items attached. Search and select products above.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/10"
              >
                {loading ? "Saving..." : isEdit ? "Update Quotation" : "Create Quotation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}