import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Building2,
  Landmark,
  CreditCard,
  QrCode,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Save,
  Star,
  ShieldCheck,
  FileText,
  Sparkles,
  Eye,
  Info
} from "lucide-react";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const QUICK_BANKS = [
  "HDFC Bank",
  "State Bank of India",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "IndusInd Bank",
];

export default function BillingDetailsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    confirm_account_number: "",
    account_type: "Current",
    ifsc_code: "",
    branch_name: "",
    upi_id: "",
    swift_code: "",
    company_name: "",
    gst_number: "",
    pan_number: "",
    notes: "",
    is_default: false,
    is_active: true,
  });

  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [existingQrUrl, setExistingQrUrl] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch account data if editing
  useEffect(() => {
    if (!isEdit) return;

    const fetchAccount = async () => {
      setLoading(true);
      try {
        const res = await api.get(`quotation/billing-details/${id}/`);
        const data = res.data;
        setFormData({
          bank_name: data.bank_name || "",
          account_holder_name: data.account_holder_name || "",
          account_number: data.account_number || "",
          confirm_account_number: data.account_number || "",
          account_type: data.account_type || "Current",
          ifsc_code: data.ifsc_code || "",
          branch_name: data.branch_name || "",
          upi_id: data.upi_id || "",
          swift_code: data.swift_code || "",
          company_name: data.company_name || "",
          gst_number: data.gst_number || "",
          pan_number: data.pan_number || "",
          notes: data.notes || "",
          is_default: Boolean(data.is_default),
          is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
        });

        if (data.qr_code_url || data.qr_code) {
          setExistingQrUrl(data.qr_code_url || data.qr_code);
          setQrPreview(data.qr_code_url || data.qr_code);
        }
      } catch (err) {
        console.error("Failed to load billing account:", err);
        Swal.fire({
          icon: "error",
          title: "Account Not Found",
          text: "Could not retrieve the requested billing details.",
        });
        navigate("/billing-details");
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;

    // Auto-uppercase IFSC, PAN, GSTIN, SWIFT
    if (["ifsc_code", "pan_number", "gst_number", "swift_code"].includes(name) && typeof finalValue === "string") {
      finalValue = finalValue.toUpperCase();
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));

    // Clear error on edit
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectBankPill = (bank) => {
    setFormData((prev) => ({ ...prev, bank_name: bank }));
    if (errors.bank_name) {
      setErrors((prev) => ({ ...prev, bank_name: null }));
    }
  };

  const handleQrFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "warning", title: "Invalid File", text: "Please upload an image file (PNG, JPG, SVG)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "warning", title: "File Too Large", text: "Image size should be less than 5MB." });
      return;
    }

    setQrFile(file);
    const objectUrl = URL.createObjectURL(file);
    setQrPreview(objectUrl);
  };

  const handleRemoveQr = () => {
    setQrFile(null);
    setQrPreview(null);
    setExistingQrUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.bank_name.trim()) errs.bank_name = "Bank Name is required";
    if (!formData.account_holder_name.trim()) errs.account_holder_name = "Account Holder / Beneficiary Name is required";
    if (!formData.account_number.trim()) errs.account_number = "Account Number is required";
    if (!isEdit && formData.account_number !== formData.confirm_account_number) {
      errs.confirm_account_number = "Account numbers do not match";
    }
    if (!formData.ifsc_code.trim()) {
      errs.ifsc_code = "IFSC Code is required";
    } else if (formData.ifsc_code.trim().length !== 11) {
      errs.ifsc_code = "IFSC Code must be exactly 11 characters (e.g. HDFC0001234)";
    }

    if (formData.gst_number && formData.gst_number.trim().length !== 15) {
      errs.gst_number = "GSTIN should typically be 15 characters";
    }
    if (formData.pan_number && formData.pan_number.trim().length !== 10) {
      errs.pan_number = "PAN should be 10 characters (e.g. ABCDE1234F)";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire({
        icon: "error",
        title: "Validation Incomplete",
        text: "Please check the highlighted fields and try again.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("bank_name", formData.bank_name.trim());
      payload.append("account_holder_name", formData.account_holder_name.trim());
      payload.append("account_number", formData.account_number.trim());
      payload.append("account_type", formData.account_type);
      payload.append("ifsc_code", formData.ifsc_code.trim());
      payload.append("branch_name", formData.branch_name.trim());
      payload.append("upi_id", formData.upi_id.trim());
      payload.append("swift_code", formData.swift_code.trim());
      payload.append("company_name", formData.company_name.trim());
      payload.append("gst_number", formData.gst_number.trim());
      payload.append("pan_number", formData.pan_number.trim());
      payload.append("notes", formData.notes.trim());
      payload.append("is_default", String(formData.is_default));
      payload.append("is_active", String(formData.is_active));

      if (qrFile) {
        payload.append("qr_code", qrFile);
      }

      if (isEdit) {
        await api.patch(`quotation/billing-details/${id}/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        Swal.fire({
          icon: "success",
          title: "Billing Account Updated",
          text: "The bank and billing details were successfully saved.",
          timer: 1600,
          showConfirmButton: false,
        });
      } else {
        await api.post("quotation/billing-details/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        Swal.fire({
          icon: "success",
          title: "Billing Account Created",
          text: "New bank account successfully added to Master Data.",
          timer: 1600,
          showConfirmButton: false,
        });
      }

      navigate("/billing-details");
    } catch (err) {
      console.error("Save billing account failed:", err);
      const serverErrs = err.response?.data;
      let msg = "An unexpected error occurred.";
      if (typeof serverErrs === "object" && serverErrs !== null) {
        msg = Object.entries(serverErrs)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n");
      }
      Swal.fire({
        icon: "error",
        title: "Could Not Save Account",
        text: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading billing details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans antialiased text-slate-800">
      {/* NAVIGATION & TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate("/billing-details")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Billing Master</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {isEdit ? "Edit Billing Account" : "Add New Billing Account"}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isEdit ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {isEdit ? "Modifying Account" : "New Master Entry"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Fill in official banking information, UPI ID, and QR code to map them to customer documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/billing-details")}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? "Saving..." : isEdit ? "Update Account" : "Save Billing Account"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: FORM SECTIONS */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 1: BANKING DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Banking Information</h2>
                  <p className="text-xs text-slate-500">Core bank credentials required for RTGS, NEFT, and IMPS</p>
                </div>
              </div>

              {/* Quick Select Bank Pills */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Suggested Banks:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_BANKS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleSelectBankPill(b)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        formData.bank_name === b
                          ? "bg-blue-50 text-blue-700 border-blue-300 font-semibold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    placeholder="e.g. HDFC Bank Ltd"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                      errors.bank_name ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300" : "border-slate-200"
                    } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  {errors.bank_name && <p className="text-xs text-rose-500 mt-1">{errors.bank_name}</p>}
                </div>

                {/* Account Holder Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Holder / Beneficiary Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="account_holder_name"
                    value={formData.account_holder_name}
                    onChange={handleChange}
                    placeholder="e.g. AKSN Infotech Pvt Ltd"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                      errors.account_holder_name ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300" : "border-slate-200"
                    } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  {errors.account_holder_name && (
                    <p className="text-xs text-rose-500 mt-1">{errors.account_holder_name}</p>
                  )}
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    placeholder="e.g. 50200012345678"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 font-mono border ${
                      errors.account_number ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300" : "border-slate-200"
                    } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  {errors.account_number && (
                    <p className="text-xs text-rose-500 mt-1">{errors.account_number}</p>
                  )}
                </div>

                {/* Confirm Account Number (only for add mode) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Account Number {!isEdit && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="confirm_account_number"
                    value={formData.confirm_account_number}
                    onChange={handleChange}
                    placeholder="Re-enter account number"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 font-mono border ${
                      errors.confirm_account_number ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300" : "border-slate-200"
                    } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  {errors.confirm_account_number && (
                    <p className="text-xs text-rose-500 mt-1">{errors.confirm_account_number}</p>
                  )}
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Type
                  </label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="CC">Cash Credit (CC)</option>
                    <option value="OD">Overdraft (OD)</option>
                  </select>
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={handleChange}
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 font-mono uppercase border ${
                      errors.ifsc_code ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-300" : "border-slate-200"
                    } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  {errors.ifsc_code && <p className="text-xs text-rose-500 mt-1">{errors.ifsc_code}</p>}
                </div>

                {/* Branch Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Name & City
                  </label>
                  <input
                    type="text"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                    placeholder="e.g. Prestige Point, Pune"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* SWIFT Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SWIFT / BIC Code (Optional)
                  </label>
                  <input
                    type="text"
                    name="swift_code"
                    value={formData.swift_code}
                    onChange={handleChange}
                    placeholder="e.g. HDFCINBB"
                    className="w-full px-3.5 py-2.5 bg-slate-50 font-mono uppercase border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: DIGITAL PAYMENTS & QR CODE */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Digital Payments & QR Mapping</h2>
                  <p className="text-xs text-slate-500">Provide UPI address and attach official QR code for customer scan & pay</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                {/* UPI ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    name="upi_id"
                    value={formData.upi_id}
                    onChange={handleChange}
                    placeholder="e.g. aksninfotech@hdfcbank"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Customers can transfer directly using any UPI app (GPay, PhonePe, Paytm).
                  </p>
                </div>

                {/* QR Code Upload Box */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload Bank / UPI QR Code
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleQrFileSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  {qrPreview ? (
                    <div className="relative border-2 border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center gap-4">
                      <img
                        src={qrPreview}
                        alt="QR Preview"
                        className="w-20 h-20 object-contain rounded-xl bg-white p-1 shadow-2xs border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {qrFile ? qrFile.name : "Active QR Code"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {qrFile ? `${(qrFile.size / 1024).toFixed(1)} KB` : "Stored in system"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            Replace
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={handleRemoveQr}
                            className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/20 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                    >
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">Click to upload QR Code</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG or SVG up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: TAX & ORGANIZATION MAPPING */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Entity & Tax Credentials</h2>
                  <p className="text-xs text-slate-500">Legal entity details displayed alongside banking information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Trade Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="e.g. AKSN Infotech"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GST Number (GSTIN)
                  </label>
                  <input
                    type="text"
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleChange}
                    maxLength={15}
                    placeholder="e.g. 27AAXFA5487A1Z4"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 font-mono uppercase border ${
                      errors.gst_number ? "border-rose-400" : "border-slate-200"
                    } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  {errors.gst_number && <p className="text-xs text-rose-500 mt-1">{errors.gst_number}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleChange}
                    maxLength={10}
                    placeholder="e.g. AAXFA5487A"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 font-mono uppercase border ${
                      errors.pan_number ? "border-rose-400" : "border-slate-200"
                    } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                  />
                  {errors.pan_number && <p className="text-xs text-rose-500 mt-1">{errors.pan_number}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 4: CONFIGURATION & NOTES */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Settings & Payment Instructions</h2>
                  <p className="text-xs text-slate-500">Status, primary account selection, and optional remarks for customers</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Primary / Default Billing Account</p>
                    <p className="text-xs text-slate-500">
                      When enabled, this bank account will automatically be selected on new quotations and invoice templates.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={formData.is_default}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Active Status</p>
                    <p className="text-xs text-slate-500">
                      Inactive accounts will not be offered as payment options for clients.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Instructions / Customer Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="e.g. Please share transfer screenshot or UTR number to accounts@company.com after payment."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/billing-details")}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? "Saving..." : isEdit ? "Update Billing Account" : "Save Billing Account"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT 1 COL: LIVE CARD & QR PREVIEW */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Real-Time Bank Card Preview</span>
            </div>

            {/* VIRTUAL BANK CARD */}
            <div className="relative w-full rounded-3xl p-6 text-white shadow-xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 overflow-hidden border border-slate-800">
              {/* Background ambient glow */}
              <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="relative z-10 flex items-start justify-between gap-3 mb-6">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-blue-300/80">OFFICIAL BANK ACCOUNT</span>
                  <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                    {formData.bank_name || "Bank Name"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {formData.branch_name ? `${formData.branch_name} Branch` : "Main Branch"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>

              {/* Card Chip & Account Type */}
              <div className="relative z-10 flex items-center justify-between mb-5">
                <div className="w-10 h-7 rounded-md bg-amber-400/90 flex items-center justify-center shadow-inner">
                  <div className="w-7 h-4 border border-amber-600/50 rounded-xs" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/15 text-white backdrop-blur-xs border border-white/10">
                  {formData.account_type || "Current"}
                </span>
              </div>

              {/* Account Number Display */}
              <div className="relative z-10 mb-5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Account Number</p>
                <p className="font-mono text-lg sm:text-xl font-bold tracking-wider text-white select-all">
                  {formData.account_number || "•••• •••• •••• ••••"}
                </p>
              </div>

              {/* Card Footer */}
              <div className="relative z-10 flex items-end justify-between text-xs pt-3 border-t border-white/10">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Beneficiary Name</p>
                  <p className="font-semibold text-white truncate max-w-[150px]">
                    {formData.account_holder_name || "Beneficiary Name"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">IFSC Code</p>
                  <p className="font-mono font-bold text-blue-300">
                    {formData.ifsc_code || "IFSC CODE"}
                  </p>
                </div>
              </div>
            </div>

            {/* QR CODE PREVIEW CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs text-center">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Scan to Pay (UPI)
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Will be printed on quotations and invoices
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center mx-auto max-w-[220px]">
                {qrPreview ? (
                  <img
                    src={qrPreview}
                    alt="QR Preview"
                    className="w-40 h-40 object-contain rounded-xl bg-white p-2 shadow-inner border border-slate-200"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-[10px] mt-2 font-medium">No QR Code Uploaded</span>
                  </div>
                )}

                {formData.upi_id ? (
                  <div className="mt-3 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-700 shadow-2xs">
                    {formData.upi_id}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-2 font-mono">upi-id@bank</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
