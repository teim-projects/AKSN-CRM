import React, { useState, useEffect, useRef } from "react";
import { RxCross2 } from "react-icons/rx";

export const CATEGORY_OPTIONS = [
  { value: "lead", label: "Leads / Enquiries" },
  { value: "customer", label: "Customers" },
  { value: "followup", label: "Follow-up Management" },
  { value: "quotation", label: "Quotations" },
  { value: "project", label: "Projects" },
  { value: "amc", label: "AMC Contracts" },
];

export const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const AVAILABLE_TAGS = [
  { tag: "{contact_person}", label: "Contact Person" },
  { tag: "{executive_name}", label: "Executive Name" },
  { tag: "{company_name}", label: "Company Name" },
  { tag: "{mobile_number}", label: "Mobile Number" },
  { tag: "{email}", label: "Email Address" },
  { tag: "{site_name}", label: "Site Name" },
  { tag: "{quotation_no}", label: "Quotation No" },
  { tag: "{amount}", label: "Total Amount" },
  { tag: "{followup_date}", label: "Follow-up Date" },
  { tag: "{project_name}", label: "Project Name" },
  { tag: "{amc_no}", label: "AMC Number" },
  { tag: "{date}", label: "Today's Date" },
];

export default function CreateTemplateModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    name: "",
    channel: "email",
    category: "quotation",
    subject: "",
    body: "",
  });

  const textareaRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        channel: initialData.channel || "email",
        category: initialData.category || "quotation",
        subject: initialData.subject || "",
        body: initialData.body || "",
      });
    } else {
      setFormData({
        name: "",
        channel: "email",
        category: "quotation",
        subject: "",
        body: "",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagInsert = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData((prev) => ({ ...prev, body: prev.body + tag }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.body;
    const newText = text.substring(0, start) + tag + text.substring(end);

    setFormData((prev) => ({ ...prev, body: newText }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a template name");
      return;
    }
    if (!formData.body.trim()) {
      alert("Please enter message body");
      return;
    }
    if (formData.channel === "email" && !formData.subject.trim()) {
      alert("Please enter a subject line for email template");
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header Bar - Exactly Matching AddLeadForm.jsx */}
        <div className="bg-white px-6 pt-6 pb-2 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {initialData ? "Edit Template" : "Add New Template"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage template details and dynamic placeholders
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
          <form className="space-y-4 text-slate-800" onSubmit={handleSubmit}>
            
            {/* Template Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Template Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Quotation Welcome Email or Follow-up Reminder"
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Channel & Category Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Channel *
                </label>
                <select
                  name="channel"
                  value={formData.channel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Line (Email Only) */}
            {formData.channel === "email" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-600">
                    Subject Line *
                  </label>
                  <span className="text-[11px] text-slate-400">Supports placeholders</span>
                </div>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="e.g. Quotation #{quotation_no} from AKSN Infotech"
                  required={formData.channel === "email"}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            )}

            {/* Message Body & Dynamic Tags */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-600">
                  Message Body *
                </label>
                <span className="text-[11px] text-slate-400">
                  Click a tag to insert into template
                </span>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                {AVAILABLE_TAGS.map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleTagInsert(item.tag)}
                    className="px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-medium border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                    title={`Insert ${item.label}`}
                  >
                    + {item.tag}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                name="body"
                value={formData.body}
                onChange={handleChange}
                rows={8}
                placeholder="Dear {contact_person},&#10;&#10;Thank you for reaching out to AKSN Infotech. Please find the details below...&#10;&#10;Best regards,&#10;{executive_name}&#10;AKSN Infotech"
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white leading-relaxed resize-y"
              />
            </div>

            {/* Footer Buttons - Matching AddLeadForm.jsx */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : initialData
                  ? "Update Template"
                  : "Submit Entry"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
