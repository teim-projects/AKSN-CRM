import React, { useState, useEffect, useRef } from "react";
import { RxCross2 } from "react-icons/rx";
import Swal from "sweetalert2";
import {
  Landmark,
  QrCode,
  UploadCloud,
  Trash2,
  Save,
  Building2,
  FileText
} from "lucide-react";

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

export default function AddBillingDetailModal({
  open,
  onClose,
  onSuccess,
  baseApi,
  token = "",
  account = null,
}) {
  const isEdit = Boolean(account);
  const fileInputRef = useRef(null);

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
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (account) {
      setFormData({
        bank_name: account.bank_name || "",
        account_holder_name: account.account_holder_name || "",
        account_number: account.account_number || "",
        confirm_account_number: account.account_number || "",
        account_type: account.account_type || "Current",
        ifsc_code: account.ifsc_code || "",
        branch_name: account.branch_name || "",
        upi_id: account.upi_id || "",
        swift_code: account.swift_code || "",
        company_name: account.company_name || "",
        gst_number: account.gst_number || "",
        pan_number: account.pan_number || "",
        notes: account.notes || "",
        is_default: Boolean(account.is_default),
        is_active: account.is_active !== undefined ? Boolean(account.is_active) : true,
      });
      const initialQr = account.qr_code_url || account.qr_code || null;
      setQrPreview(initialQr);
      setQrFile(null);
    } else {
      setFormData({
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
      setQrPreview(null);
      setQrFile(null);
    }
    setErrors({});
  }, [account, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;

    // Auto-uppercase
    if (["ifsc_code", "pan_number", "gst_number", "swift_code"].includes(name) && typeof finalValue === "string") {
      finalValue = finalValue.toUpperCase();
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
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
      Swal.fire({ icon: "warning", title: "Invalid File", text: "Please upload an image (PNG, JPG, SVG)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "warning", title: "File Too Large", text: "Image must be under 5MB." });
      return;
    }

    setQrFile(file);
    const objectUrl = URL.createObjectURL(file);
    setQrPreview(objectUrl);
  };

  const handleRemoveQr = () => {
    setQrFile(null);
    setQrPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.bank_name.trim()) errs.bank_name = "Bank Name is required";
    if (!formData.account_holder_name.trim()) errs.account_holder_name = "Beneficiary Name is required";
    if (!formData.account_number.trim()) errs.account_number = "Account Number is required";
    if (!isEdit && formData.account_number !== formData.confirm_account_number) {
      errs.confirm_account_number = "Account numbers do not match";
    }
    if (!formData.ifsc_code.trim()) {
      errs.ifsc_code = "IFSC Code is required";
    } else if (formData.ifsc_code.trim().length !== 11) {
      errs.ifsc_code = "IFSC Code must be 11 characters (e.g. HDFC0001234)";
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
        text: "Please correct the highlighted fields before saving.",
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

      const authToken = token || localStorage.getItem("access") || localStorage.getItem("access_token") || "";
      const headers = {
        Authorization: authToken ? `Bearer ${authToken}` : "",
      };

      const url = isEdit
        ? `${baseApi.replace(/\/$/, "")}/quotation/billing-details/${account.id}/`
        : `${baseApi.replace(/\/$/, "")}/quotation/billing-details/`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: payload,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg =
          data && typeof data === "object"
            ? Object.entries(data)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                .join("\n")
            : "Failed to save billing account";
        throw new Error(errorMsg);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Account Updated" : "Account Added",
        text: isEdit ? "Billing account updated successfully." : "New billing account successfully created.",
        timer: 1600,
        showConfirmButton: false,
      });

      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      console.error("Save error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to save billing account",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-3xl w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="bg-white px-6 pt-6 pb-3 flex justify-between items-start border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isEdit ? "Edit Billing Details" : "Add New Billing Details"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Map bank credentials, UPI ID, and QR code for quotations and customer payments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          <form className="space-y-5 text-slate-800" onSubmit={handleSubmit} id="billing-modal-form">
            {/* Quick Bank Select Pills */}
            <div>
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

            {/* Banking Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="e.g. HDFC Bank Ltd"
                  className={`w-full px-3 py-2 text-sm border ${
                    errors.bank_name ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  } rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white`}
                />
                {errors.bank_name && <p className="text-[11px] text-rose-500">{errors.bank_name}</p>}
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Beneficiary / Account Holder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="account_holder_name"
                  value={formData.account_holder_name}
                  onChange={handleChange}
                  placeholder="e.g. AKSN Infotech Pvt Ltd"
                  className={`w-full px-3 py-2 text-sm border ${
                    errors.account_holder_name ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  } rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white`}
                />
                {errors.account_holder_name && (
                  <p className="text-[11px] text-rose-500">{errors.account_holder_name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  placeholder="e.g. 50200012345678"
                  className={`w-full px-3 py-2 text-sm font-mono border ${
                    errors.account_number ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  } rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white`}
                />
                {errors.account_number && (
                  <p className="text-[11px] text-rose-500">{errors.account_number}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Confirm Account Number {!isEdit && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  name="confirm_account_number"
                  value={formData.confirm_account_number}
                  onChange={handleChange}
                  placeholder="Re-enter account number"
                  className={`w-full px-3 py-2 text-sm font-mono border ${
                    errors.confirm_account_number ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  } rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white`}
                />
                {errors.confirm_account_number && (
                  <p className="text-[11px] text-rose-500">{errors.confirm_account_number}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Account Type
                </label>
                <select
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="Current">Current Account</option>
                  <option value="Savings">Savings Account</option>
                  <option value="CC">Cash Credit (CC)</option>
                  <option value="OD">Overdraft (OD)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  IFSC Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={handleChange}
                  maxLength={11}
                  placeholder="e.g. HDFC0001234"
                  className={`w-full px-3 py-2 text-sm font-mono uppercase border ${
                    errors.ifsc_code ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  } rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white`}
                />
                {errors.ifsc_code && <p className="text-[11px] text-rose-500">{errors.ifsc_code}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Branch Name
                </label>
                <input
                  type="text"
                  name="branch_name"
                  value={formData.branch_name}
                  onChange={handleChange}
                  placeholder="e.g. Prestige Point, Pune"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  SWIFT / BIC Code (Optional)
                </label>
                <input
                  type="text"
                  name="swift_code"
                  value={formData.swift_code}
                  onChange={handleChange}
                  placeholder="e.g. HDFCINBB"
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* UPI & QR Code */}
              <div className="space-y-1 md:col-span-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600">
                  UPI ID / VPA
                </label>
                <input
                  type="text"
                  name="upi_id"
                  value={formData.upi_id}
                  onChange={handleChange}
                  placeholder="e.g. aksninfotech@hdfcbank"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Bank / UPI QR Code Image
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleQrFileSelect}
                  accept="image/*"
                  className="hidden"
                />

                {qrPreview ? (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <img
                      src={qrPreview}
                      alt="QR Code"
                      className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {qrFile ? qrFile.name : "Active QR Code"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {qrFile ? `${(qrFile.size / 1024).toFixed(1)} KB` : "Image stored in server"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={handleRemoveQr}
                          className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/20 rounded-xl p-4 text-center cursor-pointer transition-colors"
                  >
                    <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-700">Click to upload QR Code image</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG or SVG up to 5MB</p>
                  </div>
                )}
              </div>

              {/* Company / Tax Details */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Legal / Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="e.g. AKSN Infotech"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  GST Number (GSTIN)
                </label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  maxLength={15}
                  placeholder="e.g. 27AAXFA5487A1Z4"
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleChange}
                  maxLength={10}
                  placeholder="e.g. AAXFA5487A"
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Instructions / Notes */}
              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Payment Instructions / Customer Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="e.g. Please share payment receipt or UTR number with accounts team."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Checkboxes */}
              <div className="md:col-span-2 flex items-center gap-6 pt-2 border-t border-slate-100">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={formData.is_default}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Set as Primary / Default Account</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>Active Account</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="billing-modal-form"
            disabled={submitting}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-blue-500/10 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{submitting ? "Saving..." : isEdit ? "Update Account" : "Save Billing Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
