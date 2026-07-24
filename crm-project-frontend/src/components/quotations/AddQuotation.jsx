import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import ItemSelectionEngine from "../ItemSelectionEngine";
import ReusableForm from "../Form";
import Swal from "sweetalert2";

const BASE_API = import.meta.env.VITE_BASE_API_URL;

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function AddQuotation({ id, onBack, leadData }) {
  const isEdit = !!id;
  const isFromLead = !!leadData;

  const [step, setStep] = useState(1);

  useEffect(() => {
    setStep(1);
  }, [id]);

  const [formData, setFormData] = useState({
    customer_phone: "",
    customer_name: "",
    customer_id: "",
    subject: "",
    gst_type: "CGST_SGST",
    thank_you_note: "",
  });

  const [loading, setLoading] = useState(false);
  const [versionName, setVersionName] = useState("");

  const [items, setItems] = useState([]);
  const [lowItems, setLowItems] = useState([]);

  const [thankYouSuggestions, setThankYouSuggestions] = useState([]);
  const [showThankYouSuggestions, setShowThankYouSuggestions] = useState(false);
  const [loadingThankYou, setLoadingThankYou] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const [subjectSuggestions, setSubjectSuggestions] = useState([]);
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(-1);

  // Edit load
  useEffect(() => {
    if (!isEdit) return;

    const loadQuotationData = async () => {
      try {
        const res = await api.get(`quotation/quotation/${id}/`);
        const q = res.data;

        const active = q.versions.find(v => v.is_active);
        if (active && active.version_no) {
          setVersionName(active.version_no);
        }

        setFormData(prev => ({
          ...prev,
          customer_phone: q.customer_contact || "",
          customer_name: q.customer_name || "",
          customer_id: q.customer || "",
          subject: q.subject || "",
          thank_you_note: q.thank_you_note || "",
          gst_type: active?.gst_type || "CGST_SGST"
        }));

        // Load high side items - read from product_data JSON
        setItems(
          (active?.high_side_items || []).map(i => ({
            product_name: i.product_data?.name || i.product_name || "",
            product_sku: i.product_data?.sku || i.product_sku || "",
            product_variant: i.product_data?.id || i.product_variant || "",
            unit: i.unit || "NOS",
            quantity: i.quantity || 1,
            unit_price: i.unit_price || 0,
            gst_percent: i.gst_percent || 18,
            mathadi_charges: i.mathadi_charges || 0,
            transportation_charges: i.transportation_charges || 0,
            description: i.description || "",
            hsn_sac: i.hsn_sac || "",
            category: i.product_data?.category || i.category || ""
          }))
        );

        // Load low side items - read from item_data JSON
        setLowItems(
          (active?.low_side_items || []).map(l => ({
            item: l.item_data?.id || l.item || "",
            item_code: l.item_data?.item_code || l.item_code || "",
            item_name: l.item_data?.name || l.item_name || "",
            unit: l.unit || "NOS",
            quantity: l.quantity || 1,
            unit_price: l.unit_price || 0,
            gst_percent: l.gst_percent || 18,
            mathadi_charges: l.mathadi_charges || 0,
            description: l.description || "",
            hsn_sac: l.hsn_sac || ""
          }))
        );
      } catch (err) {
        console.log("Error loading quotation:", err);
      }
    };

    loadQuotationData();
  }, [id]);

  // Lead data mapping
  useEffect(() => {
    if (leadData && !isEdit) {
      setFormData(prev => ({
        ...prev,
        customer_phone: leadData.customer_contact || "",
        customer_name: leadData.customer_name || "",
        customer_id: leadData.customer || "",
        subject: "",
        gst_type: "CGST_SGST",
        thank_you_note: ""
      }));

      if (leadData.product_details && leadData.product_details.length > 0) {
        const mappedItems = leadData.product_details.map(product => ({
          product_name: product.product_name || "",
          product_sku: product.product_sku || "",
          unit: "NOS",
          quantity: product.quantity || 1,
          unit_price: product.expected_price || 0,
          gst_percent: 18,
          mathadi_charges: 0,
          transportation_charges: 0,
          description: product.remarks || "",
          hsn_sac: product.hsn_sac || "",
          category: product.category || ""
        }));
        setItems(mappedItems);
      }
    }
  }, [leadData, isEdit]);

  // Phone search
  const handlePhoneSearch = async (phone) => {
    if (phone.length >= 10) {
      try {
        const res = await api.get(`lead/customer/?search=${phone}`);
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];

        if (data.length > 0) {
          setFormData(prev => ({
            ...prev,
            customer_phone: phone,
            customer_name: data[0].name,
            customer_id: data[0].id
          }));
        }
      } catch (err) {
        console.log("Error searching customer:", err);
      }
    }
  };

  // Thank you note suggestions
  const fetchThankYouSuggestions = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setThankYouSuggestions([]);
      setShowThankYouSuggestions(false);
      return;
    }

    setLoadingThankYou(true);
    try {
      const response = await api.get(`quotation/thank-you-suggestions/?search=${encodeURIComponent(searchTerm)}`);
      setThankYouSuggestions(response.data);
      setShowThankYouSuggestions(response.data.length > 0);
      setSelectedSuggestionIndex(-1);
    } catch (error) {
      console.error('Error fetching thank you suggestions:', error);
      setThankYouSuggestions([]);
      setShowThankYouSuggestions(false);
    } finally {
      setLoadingThankYou(false);
    }
  };

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedThankYouSearch = debounce(fetchThankYouSuggestions, 300);

  const handleThankYouKeyDown = (e) => {
    if (!showThankYouSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < thankYouSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : thankYouSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectThankYouNote(thankYouSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowThankYouSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const selectThankYouNote = (note) => {
    setFormData(prev => ({ ...prev, thank_you_note: note.text }));
    setShowThankYouSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Subject suggestions
  const fetchSubjectSuggestions = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setSubjectSuggestions([]);
      setShowSubjectSuggestions(false);
      return;
    }

    setLoadingSubject(true);
    try {
      const token = localStorage.getItem("access") || localStorage.getItem("access_token");
      const response = await fetch(
        `${BASE_API}/quotation/subject-suggestions/?search=${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubjectSuggestions(data);
        setShowSubjectSuggestions(data.length > 0);
      }
    } catch (error) {
      console.error("Error fetching subject suggestions:", error);
    } finally {
      setLoadingSubject(false);
    }
  };

  const debouncedSubjectSearch = useCallback(
    debounce((searchTerm) => {
      fetchSubjectSuggestions(searchTerm);
    }, 300),
    []
  );

  const handleSubjectKeyDown = (e) => {
    if (!showSubjectSuggestions || subjectSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSubjectIndex(prev =>
          prev < subjectSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSubjectIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSubjectIndex >= 0) {
          selectSubject(subjectSuggestions[selectedSubjectIndex]);
        }
        break;
      case 'Escape':
        setShowSubjectSuggestions(false);
        setSelectedSubjectIndex(-1);
        break;
    }
  };

  const selectSubject = (suggestion) => {
    setFormData(prev => ({ ...prev, subject: suggestion.text }));
    setShowSubjectSuggestions(false);
    setSelectedSubjectIndex(-1);
  };

  const resetForm = () => {
    if (isFromLead) {
      onBack && onBack();
      return;
    }

    setFormData({
      customer_phone: "",
      customer_name: "",
      customer_id: "",
      subject: "",
      gst_type: "CGST_SGST",
      thank_you_note: ""
    });

    setItems([]);
    setLowItems([]);
  };

  // Submit
  const handleSubmit = async (data) => {
    if (!data.customer_id) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please search and select a customer" });
      return;
    }
    if (!data.subject.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Subject is required" });
      return;
    }

    setLoading(true);

    const payload = {
      customer: Number(data.customer_id),
      subject: data.subject,
      thank_you_note: data.thank_you_note,
      versions: [{
        gst_type: data.gst_type,
        high_side_items: items.map(i => ({
          product_data: {
            id: i.product_variant || i.id || null,
            name: i.product_name || "",
            sku: i.product_sku || "",
            price: i.unit_price || 0,
            category: i.category || "",
            hsn_code: i.hsn_sac || "",
            gst_percentage: i.gst_percent || 18,
          },
          product_name: i.product_name || "",
          product_sku: i.product_sku || "",
          quantity: Number(i.quantity),
          unit: i.unit || "NOS",
          description: i.description || "",
          unit_price: Number(i.unit_price),
          gst_percent: Number(i.gst_percent),
          mathadi_charges: Number(i.mathadi_charges || 0),
          transportation_charges: Number(i.transportation_charges || 0),
          hsn_sac: i.hsn_sac || "",
          category: i.category || ""
        })),
        low_side_items: lowItems.map(l => ({
          item_data: {
            id: l.item || l.id || null,
            item_code: l.item_code || "",
            name: l.item_name || "",
            description: l.description || "",
          },
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          description: l.description || "",
          unit: l.unit || "NOS",
          gst_percent: Number(l.gst_percent || 18),
          mathadi_charges: Number(l.mathadi_charges || 0),
          hsn_sac: l.hsn_sac || ""
        }))
      }]
    };

    try {
      if (isEdit) {
        await api.put(`quotation/quotation/${id}/`, payload);
      } else {
        await api.post("quotation/quotation/", payload);
      }

      Swal.fire({
        icon: "success",
        text: isEdit ? "Quotation updated successfully" : "Quotation saved successfully",
        timer: 1200,
        showConfirmButton: false
      });

      resetForm();
      onBack && onBack();

    } catch (err) {
      console.log("Error details:", err);
      console.log("Response status:", err.response?.status);
      console.log("Response data:", err.response?.data);

      if (err.response?.status === 200 || err.response?.status === 201) {
        Swal.fire({
          icon: "success",
          text: isEdit ? "Quotation updated successfully" : "Quotation saved successfully",
          timer: 1200,
          showConfirmButton: false
        });
        resetForm();
        onBack && onBack();
        return;
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.detail || "Error saving quotation"
      });
    } finally {
      setLoading(false);
    }
  };

  // Step validation functions
  const validateStep1 = () => {
    if (!formData.customer_id) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please search and select a customer" });
      return false;
    }
    if (!formData.subject.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Subject is required" });
      return false;
    }
    if (!formData.thank_you_note || !formData.thank_you_note.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Thank You Note is required" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (items.length === 0 && lowItems.length === 0) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please add at least one item" });
      return false;
    }
    return true;
  };

  // Step 1 Fields
  const step1Fields = [
    {
      name: "customer_phone",
      label: "Customer Phone",
      type: "phone",
      required: true,
      gridCols: 1,
      placeholder: "Enter customer phone",
      component: ({ value, onChange }) => (
        <input
          type="text"
          className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={value}
          onChange={(e) => {
            const phone = e.target.value.replace(/\D/g, "");
            onChange(phone);
            handlePhoneSearch(phone);
          }}
          placeholder="Enter customer phone"
          maxLength={10}
        />
      )
    },
    {
      name: "customer_name",
      label: "Customer Name",
      type: "text",
      disabled: true,
      gridCols: 1,
      placeholder: "Auto-filled from phone search"
    },
    {
      name: "subject",
      label: "Subject",
      type: "component",
      required: true,
      gridCols: 1,
      component: ({ value, onChange }) => (
        <div className="relative">
          <input
            type="text"
            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Type to get suggestions..."
            value={value || ""}
            onChange={(e) => {
              onChange(e.target.value);
              debouncedSubjectSearch(e.target.value);
            }}
            onKeyDown={handleSubjectKeyDown}
            onFocus={() => {
              if (value && value.length >= 2) {
                debouncedSubjectSearch(value);
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setShowSubjectSuggestions(false);
                setSelectedSubjectIndex(-1);
              }, 200);
            }}
          />

          {loadingSubject && (
            <div className="absolute right-3 top-3 pointer-events-none">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
          )}

          {showSubjectSuggestions && subjectSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {subjectSuggestions.map((suggestion, index) => {
                const isSelected = index === selectedSubjectIndex;
                return (
                  <div
                    key={suggestion.id}
                    className={`px-3 py-2 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors ${isSelected
                        ? 'bg-indigo-100 text-indigo-900'
                        : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSubject(suggestion);
                    }}
                    onMouseEnter={() => setSelectedSubjectIndex(index)}
                  >
                    <div className="truncate">
                      {suggestion.text.length > 80 ? `${suggestion.text.substring(0, 80)}...` : suggestion.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showSubjectSuggestions && subjectSuggestions.length === 0 && !loadingSubject && value && value.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              <div className="px-3 py-2 text-sm text-gray-500 italic">
                No suggestions found. Keep typing to create a new one.
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      name: "gst_type",
      label: "GST Type",
      type: "select",
      required: true,
      gridCols: 1,
      options: [
        { value: "CGST_SGST", label: "CGST + SGST" },
        { value: "IGST", label: "IGST" },
        { value: "NO_GST", label: "No GST" }
      ]
    },
    {
      name: "thank_you_note",
      label: "Thank You Note",
      type: "component",
      required: true,
      gridCols: 2,
      component: ({ value, onChange }) => (
        <div className="relative">
          <textarea
            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            placeholder="Type to get suggestions..."
            rows={3}
            value={value || ""}
            onChange={(e) => {
              onChange(e.target.value);
              debouncedThankYouSearch(e.target.value);
            }}
            onKeyDown={handleThankYouKeyDown}
            onFocus={() => {
              if (value && value.length >= 2) {
                debouncedThankYouSearch(value);
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setShowThankYouSuggestions(false);
                setSelectedSuggestionIndex(-1);
              }, 200);
            }}
          />

          {loadingThankYou && (
            <div className="absolute right-3 top-3 pointer-events-none">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
          )}

          {showThankYouSuggestions && thankYouSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {thankYouSuggestions.map((note, index) => {
                const isSelected = index === selectedSuggestionIndex;
                return (
                  <div
                    key={note.id}
                    className={`px-3 py-2 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors ${isSelected
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectThankYouNote(note);
                    }}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    <div className="truncate">
                      {note.text.length > 80 ? `${note.text.substring(0, 80)}...` : note.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showThankYouSuggestions && thankYouSuggestions.length === 0 && !loadingThankYou && value && value.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              <div className="px-3 py-2 text-sm text-gray-500 italic">
                No suggestions found. Keep typing to create a new one.
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  // Step 2 Fields
  const step2Fields = [
    {
      name: "items_section",
      label: "Items",
      component: () => (
        <ItemSelectionEngine
          baseApi={BASE_API}
          authToken={localStorage.getItem("access")}
          items={items}
          setItems={setItems}
          lowItems={lowItems}
          setLowItems={setLowItems}
          mode="quotation"
          gstType={formData.gst_type}
        />
      ),
      gridCols: 2,
    },
  ];

  const getCurrentFields = () => {
    switch (step) {
      case 1: return step1Fields;
      case 2: return step2Fields;
      default: return step1Fields;
    }
  };

  return (
    <>
      <div className="fixed inset-0 mt-8 bg-black/40 flex items-start sm:items-center justify-center z-50">
        <div className="bg-white rounded-md shadow-lg w-full max-w-4xl relative max-h-[90vh] flex flex-col">
          <div className="sticky top-0 bg-white z-10 border-b px-6 py-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {isEdit 
                  ? (versionName ? `${versionName} - Edit Quotation` : "Edit Quotation")
                  : isFromLead 
                    ? "Create Quotation from Enquiry" 
                    : "Add Quotation"
                }
              </h2>
              <button
                onClick={onBack}
                className="text-xl font-bold hover:text-red-500"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="ml-2">Basic Info</span>
              </div>
              <div className={`w-8 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="ml-2">Items</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <ReusableForm
              fields={getCurrentFields()}
              formData={formData}
              onChange={setFormData}
              onSubmit={
                step === 2
                  ? handleSubmit
                  : step === 1
                    ? () => { if (validateStep1()) setStep(2); }
                    : () => { }
              }
              loading={loading}
              showCancel={true}
              onCancel={step > 1 ? () => setStep(step - 1) : onBack}
              submitText={step === 2 ? (isEdit ? "Update Quotation" : "Save Quotation") : "Next"}
              cancelText={step > 1 ? "Back" : "Cancel"}
            />
          </div>
        </div>
      </div>
    </>
  );
}