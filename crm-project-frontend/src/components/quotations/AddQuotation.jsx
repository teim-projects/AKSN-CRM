import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Select from "react-select";
import { State, City } from "country-state-city";
import { RxCross2 } from "react-icons/rx";
import { MdDelete, MdArrowForward, MdArrowBack, MdCheckCircle, MdExpandMore, MdChevronRight } from "react-icons/md";

const BASE_API = import.meta.env.VITE_BASE_API_URL;

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function AddQuotation({ id, leadData, onBack }) {
  const isEdit = !!id;

  // Step 1: Quotation Details & Items, Step 2: Terms & Conditions
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [versionName, setVersionName] = useState("");

  const states = useMemo(() => State.getStatesOfCountry("IN"), []);

  const [formData, setFormData] = useState({
    lead: "",
    company_name: "",
    contact_person: "",
    mobile_number: "",
    email_address: "",
    linkedin_profile_url: "",
    state: "",
    city: "",
    address: "",
    industry_type: "",
    gst_number: "",
    pan_number: "",
    msme_number: "",
    subject: "",
    quotation_for: "",
    gst_type: "CGST_SGST",
    thank_you_note: "",
  });

  const cities = useMemo(() => {
    if (!formData.state) return [];
    const selectedState = states.find((s) => s.name === formData.state);
    return selectedState ? City.getCitiesOfState("IN", selectedState.isoCode) : [];
  }, [formData.state, states]);

  const [items, setItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Single mobile number search
  const [searchingLead, setSearchingLead] = useState(false);
  const [leadFound, setLeadFound] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Terms & Conditions states
  const [termCategories, setTermCategories] = useState([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState([]);
  // ✅ Closed by default ({})
  const [openCategories, setOpenCategories] = useState({});

  // Auto-suggestions states for Subject & Thank You Note
  const [subjectSuggestions, setSubjectSuggestions] = useState([]);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  const [thankYouSuggestions, setThankYouSuggestions] = useState([]);
  const [showThankYouDropdown, setShowThankYouDropdown] = useState(false);

  const fetchSubjectSuggestions = async (searchTerm = "") => {
    try {
      const res = await api.get(`quotation/subject-suggestions/?search=${encodeURIComponent(searchTerm)}`);
      const list = Array.isArray(res.data) ? res.data.map(item => item.text || item) : [];
      setSubjectSuggestions(list);
    } catch (err) {
      console.error("Error fetching subject suggestions:", err);
      setSubjectSuggestions([]);
    }
  };

  const fetchThankYouSuggestions = async (searchTerm = "") => {
    try {
      const res = await api.get(`quotation/thank-you-suggestions/?search=${encodeURIComponent(searchTerm)}`);
      const list = Array.isArray(res.data) ? res.data.map(item => item.text || item) : [];
      setThankYouSuggestions(list);
    } catch (err) {
      console.error("Error fetching thank you note suggestions:", err);
      setThankYouSuggestions([]);
    }
  };

  // Fetch Term Categories & Terms from backend
  useEffect(() => {
    const fetchTermCategories = async () => {
      setLoadingTerms(true);
      try {
        const res = await api.get(`quotation/term-categories/`);
        const cats = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setTermCategories(cats);

        // All categories closed by default
        setOpenCategories({});

        // Auto-select default terms for new quotation
        if (!isEdit) {
          const defaults = [];
          cats.forEach((cat) => {
            if (cat.terms && Array.isArray(cat.terms)) {
              cat.terms.forEach((term) => {
                const isDef = term.is_default === true || term.is_default === "true" || term.is_default == 1;
                if (isDef && term.is_active !== false) {
                  defaults.push({
                    id: term.id,
                    category_id: cat.id,
                    category_name: cat.name,
                    name: term.name,
                    description: term.description,
                  });
                }
              });
            }
          });
          setSelectedTerms(defaults);
        }
      } catch (err) {
        console.error("Error loading term categories:", err);
        setTermCategories([]);
      } finally {
        setLoadingTerms(false);
      }
    };

    fetchTermCategories();
  }, [isEdit]);

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
          quotation_no: q.quotation_no || q.quotation_number || "",
          quotation_number: q.quotation_number || q.quotation_no || "",
          lead: q.lead || "",
          company_name: q.company_name || "",
          contact_person: q.contact_person || "",
          mobile_number: mobile,
          email_address: q.email_address || "",
          linkedin_profile_url: q.linkedin_profile_url || "",
          state: q.state || "",
          city: q.city || "",
          address: q.address || "",
          industry_type: q.industry_type || "",
          gst_number: q.gst_number || "",
          pan_number: q.pan_number || "",
          msme_number: q.msme_number || "",
          subject: q.subject || "",
          quotation_for: q.quotation_for || "",
          gst_type: q.gst_type || "CGST_SGST",
          thank_you_note: q.thank_you_note || "",
        });

        // Set terms & conditions if existing
        if (q.terms_and_conditions && Array.isArray(q.terms_and_conditions) && q.terms_and_conditions.length > 0) {
          setSelectedTerms(q.terms_and_conditions);
        } else if (active?.terms_and_conditions && Array.isArray(active.terms_and_conditions)) {
          setSelectedTerms(active.terms_and_conditions);
        }

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

        // Auto-search for lead after loading data
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

  // Auto-populate form data when leadData is passed from Lead table action
  useEffect(() => {
    if (isEdit || !leadData) return;

    setLeadFound(leadData);
    setFormData((prev) => ({
      ...prev,
      lead: leadData.id || prev.lead,
      company_name: leadData.company_name || "",
      contact_person: leadData.contact_person || "",
      mobile_number: leadData.mobile_number || "",
      email_address: leadData.email_address || "",
      linkedin_profile_url: leadData.linkedin_profile_url || "",
      gst_number: leadData.gst_number || "",
      pan_number: leadData.pan_number || "",
      msme_number: leadData.msme_number || "",
      state: leadData.state || "",
      city: leadData.city || "",
      address: leadData.address || "",
      industry_type: leadData.industry_type || "",
      subject: leadData.company_name ? `Quotation for ${leadData.company_name}` : prev.subject,
    }));

    // Auto-map lead's interested products into quotation items
    const prods = leadData.product_interested || leadData.product_interested_list || [];
    if (Array.isArray(prods) && prods.length > 0) {
      const mappedItems = prods.map((p, idx) => {
        let prodName = "";
        let prodVal = typeof p === "object" && p !== null ? (p?.value || p?.price || p?.amount || 0) : (leadData.amount || 0);

        if (typeof p === "object" && p !== null) {
          prodName = p?.product || p?.name || p?.product_name || "";
        } else {
          prodName = String(p || "").trim();
        }

        // If prodName is numeric ID or matches product, resolve from availableProducts
        if (availableProducts && availableProducts.length > 0) {
          const match = availableProducts.find(
            (pr) => String(pr.id) === String(prodName) || String(pr.id) === String(p) || pr.name === prodName
          );
          if (match) {
            prodName = match.name || match.product_name || prodName;
            if (!prodVal && match.unit_price) prodVal = match.unit_price;
          }
        }

        // If prodName is still numeric or empty, fallback
        if (!prodName || /^\d+$/.test(prodName)) {
          prodName = `Item ${idx + 1}`;
        }

        return {
          id: Date.now() + idx,
          product_name: prodName,
          description: "",
          qty: 1,
          rate: parseFloat(prodVal) || 0,
          amount: parseFloat(prodVal) || 0,
        };
      });
      setItems(mappedItems);
    }
  }, [isEdit, leadData, availableProducts]);

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
  const searchLeadByMobile = useCallback(
    async (mobile) => {
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
          address: "",
          industry_type: "",
        }));
        return;
      }

      setSearchingLead(true);
      try {
        const res = await api.get(`lead/lead/?search=${mobile}`);
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];

        const lead = data.find((l) => l.mobile_number === mobile);

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
            address: lead.address || "",
            industry_type: lead.industry_type || "",
          }));
        } else {
          setLeadFound(null);
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
              address: "",
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
    },
    [isEdit]
  );

  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  const debouncedMobileSearch = useCallback(
    debounce((mobile) => {
      searchLeadByMobile(mobile);
    }, 500),
    [searchLeadByMobile]
  );

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
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

  // Terms & Conditions helper functions
  const toggleCategoryAccordion = (catId) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const isTermSelected = (termId, catName, termName) => {
    return selectedTerms.some(
      (st) =>
        st.id === termId ||
        (st.id !== undefined && termId !== undefined && Number(st.id) === Number(termId)) ||
        (st.category_name === catName && st.name === termName)
    );
  };

  const toggleTerm = (term, category) => {
    const selected = isTermSelected(term.id, category.name, term.name);
    if (selected) {
      setSelectedTerms((prev) =>
        prev.filter(
          (st) => !(st.id === term.id || (st.category_name === category.name && st.name === term.name))
        )
      );
    } else {
      setSelectedTerms((prev) => [
        ...prev,
        {
          id: term.id,
          category_id: category.id,
          category_name: category.name,
          name: term.name,
          description: term.description,
        },
      ]);
    }
  };

  const toggleAllCategoryTerms = (category) => {
    const activeTerms = (category.terms || []).filter((t) => t.is_active);
    const allSelected = activeTerms.every((t) => isTermSelected(t.id, category.name, t.name));

    if (allSelected) {
      setSelectedTerms((prev) =>
        prev.filter((st) => !(st.category_id === category.id || st.category_name === category.name))
      );
    } else {
      const existingOtherCats = selectedTerms.filter(
        (st) => !(st.category_id === category.id || st.category_name === category.name)
      );
      const newCatTerms = activeTerms.map((t) => ({
        id: t.id,
        category_id: category.id,
        category_name: category.name,
        name: t.name,
        description: t.description,
      }));
      setSelectedTerms([...existingOtherCats, ...newCatTerms]);
    }
  };

  const updateTermDescription = (termId, catName, termName, newDesc) => {
    setSelectedTerms((prev) =>
      prev.map((st) => {
        if (st.id === termId || (st.category_name === catName && st.name === termName)) {
          return { ...st, description: newDesc };
        }
        return st;
      })
    );
  };

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

  // Next step validation
  const handleNextStep = () => {
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
    if (!formData.quotation_for || !formData.quotation_for.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please select where this quotation is for (Ahilyanagar or Pune)" });
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

    setStep(2);
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please add at least one product" });
      setStep(1);
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
      address: formData.address || "",
      industry_type: formData.industry_type || "",
      subject: formData.subject,
      quotation_for: formData.quotation_for,
      gst_type: formData.gst_type,
      thank_you_note: formData.thank_you_note,
      terms_and_conditions: selectedTerms,
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
      let savedQuotationId = id;
      let resObj = null;
      if (isEdit) {
        resObj = await api.put(`quotation/quotation/${id}/`, payload);
        savedQuotationId = resObj.data?.id || id;
      } else {
        resObj = await api.post("quotation/quotation/", payload);
        savedQuotationId = resObj.data?.id || id;
      }

      Swal.fire({
        icon: "success",
        text: isEdit ? "Quotation version updated successfully" : "Quotation created successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      const qNumberStr =
        resObj.data?.quotation_no ||
        resObj.data?.quotation_number ||
        formData.quotation_number ||
        formData.quotation_no ||
        (savedQuotationId ? `AKSN-${String(savedQuotationId).padStart(3, "0")}` : "");

      window.dispatchEvent(
        new CustomEvent("newNotification", {
          detail: {
            title: isEdit ? "Quotation Version Updated" : "New Quotation Generated",
            description: isEdit
              ? `Quotation #${qNumberStr} updated to a new version.`
              : `New Quotation #${qNumberStr} generated for ${formData.company_name || "Client"}.`,
            type: "quotation",
            badge: isEdit ? "Version" : "Quotation",
            quotationId: savedQuotationId,
            targetUrl: `/quotation?quotationId=${savedQuotationId}`,
          },
        })
      );

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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-4xl w-full mx-auto relative flex flex-col overflow-hidden"
        style={{ height: "90vh" }}
      >
        {/* Exact Fixed Header matching Image 1 */}
        <div className="bg-white px-6 pt-6 pb-2 flex justify-between items-start shrink-0 border-b border-slate-100/60">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isEdit
                ? versionName
                  ? `${versionName} - Edit Quotation`
                  : "Edit Quotation"
                : "Add New Quotation"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure quotation items and commercial pricing terms
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
          >
            <RxCross2 size={18} />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin flex flex-col">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between text-slate-800">
            {step === 1 ? (
              /* STEP 1: LEAD, QUOTATION DETAILS & LINE ITEMS (EXACT IMAGE 1 UI) */
              <div className="flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  {/* Lead Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                      Lead Information
                    </h4>

                    {/* Mobile Search */}
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
                          ✓ Lead found: {leadFound.company_name || "No Company"}{" "}
                          {leadFound.contact_person && ` • ${leadFound.contact_person}`}
                        </p>
                      )}
                      {!leadFound &&
                        formData.mobile_number &&
                        formData.mobile_number.length >= 10 &&
                        !searchingLead &&
                        !isInitialLoad && (
                          <p className="text-[10px] text-amber-600 font-medium">
                            ⚠ No lead found with this number. You can manually enter details below.
                          </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={formData.company_name}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                          placeholder="Company Name"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          value={formData.contact_person}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, contact_person: e.target.value }))
                          }
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
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, email_address: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                          placeholder="contact@company.com"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">LinkedIn Profile URL</label>
                        <input
                          type="url"
                          value={formData.linkedin_profile_url}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, linkedin_profile_url: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">State</label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({ ...prev, state: val, city: "" }));
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                        >
                          <option value="">Select State</option>
                          {states.map((st) => (
                            <option key={st.isoCode} value={st.name}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">City</label>
                        <select
                          name="city"
                          value={formData.city}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, city: e.target.value }))
                          }
                          disabled={!formData.state}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 h-[38px]"
                        >
                          <option value="">
                            {!formData.state ? "Select State First" : "Select City"}
                          </option>
                          {cities.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600">Address</label>
                        <textarea
                          rows={2}
                          value={formData.address}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, address: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                          placeholder="Enter quotation address details..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">Industry Type</label>
                        <input
                          type="text"
                          value={formData.industry_type}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, industry_type: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                          placeholder="Industry Type"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">GST Number</label>
                        <input
                          type="text"
                          value={formData.gst_number}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, gst_number: e.target.value }))
                          }
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
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, pan_number: e.target.value }))
                          }
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
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, msme_number: e.target.value }))
                          }
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
                      <div className="space-y-1 md:col-span-2 relative">
                        <label className="block text-xs font-semibold text-slate-600">Subject *</label>
                        <input
                          type="text"
                          value={formData.subject}
                          onFocus={() => {
                            fetchSubjectSuggestions(formData.subject);
                            setShowSubjectDropdown(true);
                          }}
                          onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 200)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({ ...prev, subject: val }));
                            fetchSubjectSuggestions(val);
                            setShowSubjectDropdown(true);
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                          placeholder="Quotation Subject"
                          required
                        />
                        {showSubjectDropdown && subjectSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {subjectSuggestions.map((item, idx) => (
                              <div
                                key={idx}
                                onMouseDown={() => {
                                  setFormData((prev) => ({ ...prev, subject: item }));
                                  setShowSubjectDropdown(false);
                                }}
                                className="px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer font-medium transition-colors"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">GST Type *</label>
                        <select
                          value={formData.gst_type}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, gst_type: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                        >
                          <option value="CGST_SGST">CGST + SGST</option>
                          <option value="IGST">IGST</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">
                          Quotation For <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.quotation_for}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, quotation_for: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white h-[38px]"
                          required
                        >
                          <option value="">Select Location</option>
                          <option value="Ahilyanagar">Ahilyanagar</option>
                          <option value="Pune">Pune</option>
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2 relative">
                        <label className="block text-xs font-semibold text-slate-600">Thank You Note *</label>
                        <textarea
                          value={formData.thank_you_note}
                          onFocus={() => {
                            fetchThankYouSuggestions(formData.thank_you_note);
                            setShowThankYouDropdown(true);
                          }}
                          onBlur={() => setTimeout(() => setShowThankYouDropdown(false), 200)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({ ...prev, thank_you_note: val }));
                            fetchThankYouSuggestions(val);
                            setShowThankYouDropdown(true);
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                          rows={2}
                          placeholder="Thank you note..."
                          required
                        />
                        {showThankYouDropdown && thankYouSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {thankYouSuggestions.map((item, idx) => (
                              <div
                                key={idx}
                                onMouseDown={() => {
                                  setFormData((prev) => ({ ...prev, thank_you_note: item }));
                                  setShowThankYouDropdown(false);
                                }}
                                className="px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer leading-relaxed transition-colors"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
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
                                    {item.product_code && (
                                      <div className="text-[10px] text-slate-400">{item.product_code}</div>
                                    )}
                                    <textarea
                                      rows={2}
                                      value={item.description || ""}
                                      onChange={(e) =>
                                        updateItem(index, "description", e.target.value)
                                      }
                                      placeholder="Description (end points with . for bullets)..."
                                      className="w-full mt-1 text-[11px] text-slate-600 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white resize-y"
                                    />
                                    {item.description && item.description.trim().length > 0 && (
                                      <div className="mt-1 space-y-0.5">
                                        {(() => {
                                          const raw = item.description.trim();
                                          const parts = raw.split(".");
                                          const bullets = [];
                                          parts.forEach((p) => {
                                            const c = p.replace(/\s+/g, " ").trim();
                                            if (c) bullets.push(c + ".");
                                          });
                                          if (!raw.endsWith(".") && bullets.length > 0) {
                                            bullets[bullets.length - 1] = bullets[bullets.length - 1].replace(/\.$/, "");
                                          }
                                          return bullets.map((b, i) => (
                                            <div key={i} className="text-[10px] text-slate-600 flex items-start gap-1">
                                              <span className="text-blue-500 font-bold leading-none mt-0.5">•</span>
                                              <span>{b}</span>
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">{item.hsn_sac_code || "-"}</td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                                      }
                                      className="w-16 px-2 py-1 border border-slate-200 rounded text-center bg-white"
                                      min="0.01"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <input
                                      type="number"
                                      value={item.unit_price}
                                      onChange={(e) =>
                                        updateItem(index, "unit_price", parseFloat(e.target.value) || 0)
                                      }
                                      className="w-24 px-2 py-1 border border-slate-200 rounded text-right bg-white"
                                      min="0"
                                      step="0.01"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="number"
                                      value={item.gst_percentage}
                                      onChange={(e) =>
                                        updateItem(index, "gst_percentage", parseFloat(e.target.value) || 0)
                                      }
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
                </div>

                {/* Footer Step 1 */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10"
                  >
                    Next: Terms & Conditions <MdArrowForward size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: CATEGORY-WISE ACCORDIONS FOR TERMS & CONDITIONS */
              <div className="flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Terms & Conditions Categories
                    </h4>
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                      <MdCheckCircle size={14} /> {selectedTerms.length} Selected
                    </span>
                  </div>

                  {loadingTerms ? (
                    <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                      Loading Terms Categories...
                    </div>
                  ) : termCategories.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                      No Terms & Conditions categories found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {termCategories.map((cat) => {
                        const catTerms = cat.terms || [];
                        const activeCatTerms = catTerms.filter((t) => t.is_active);
                        const selectedInCat = selectedTerms.filter(
                          (t) => t.category_id === cat.id || t.category_name === cat.name
                        );
                        const allSelected =
                          activeCatTerms.length > 0 &&
                          activeCatTerms.every((t) => isTermSelected(t.id, cat.name, t.name));

                        // Closed by default (false unless explicitly toggled)
                        const isOpen = !!openCategories[cat.id];

                        return (
                          <div
                            key={cat.id}
                            className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs"
                          >
                            {/* Accordion Header */}
                            <div
                              onClick={() => toggleCategoryAccordion(cat.id)}
                              className="bg-slate-50/80 hover:bg-slate-100/80 px-4 py-2.5 flex justify-between items-center cursor-pointer select-none transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <MdExpandMore size={18} className="text-slate-500" />
                                ) : (
                                  <MdChevronRight size={18} className="text-slate-500" />
                                )}
                                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                  {cat.name}
                                </h5>
                              </div>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {selectedInCat.length} / {activeCatTerms.length} Selected
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleAllCategoryTerms(cat)}
                                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                                >
                                  {allSelected ? "Deselect All" : "Select All"}
                                </button>
                              </div>
                            </div>

                            {/* Collapsible Terms List - Visible only when isOpen is true */}
                            {isOpen && (
                              <div className="p-4 space-y-3 divide-y divide-slate-100 border-t border-slate-200">
                                {activeCatTerms.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">No terms in this category.</p>
                                ) : (
                                  activeCatTerms.map((term) => {
                                    const selected = isTermSelected(term.id, cat.name, term.name);
                                    const selectedItem = selectedTerms.find(
                                      (st) =>
                                        st.id === term.id ||
                                        (st.category_name === cat.name && st.name === term.name)
                                    );

                                    return (
                                      <div key={term.id} className="pt-3 first:pt-0 flex items-start gap-3">
                                        <input
                                          type="checkbox"
                                          id={`term-${term.id}`}
                                          checked={selected}
                                          onChange={() => toggleTerm(term, cat)}
                                          className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <div className="flex-1 space-y-1">
                                          <label
                                            htmlFor={`term-${term.id}`}
                                            className="text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-2"
                                          >
                                            {term.name}
                                            {term.is_default && (
                                              <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.2 rounded border border-emerald-100 font-medium">
                                                Default
                                              </span>
                                            )}
                                          </label>
                                          {selected ? (
                                            <textarea
                                              rows={2}
                                              value={selectedItem?.description ?? term.description}
                                              onChange={(e) =>
                                                updateTermDescription(
                                                  term.id,
                                                  cat.name,
                                                  term.name,
                                                  e.target.value
                                                )
                                              }
                                              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                                            />
                                          ) : (
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                              {term.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Step 2 */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <MdArrowBack size={16} /> Back to Quotation Details
                  </button>
                  <div className="flex items-center gap-2">
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
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {loading
                        ? "Saving..."
                        : isEdit
                          ? "Update Quotation"
                          : "Create Quotation"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}