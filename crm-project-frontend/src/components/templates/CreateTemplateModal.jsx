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
  const subjectInputRef = useRef(null);
  
  // Track active field and exact cursor selection
  const [activeField, setActiveField] = useState("body");
  const cursorRef = useRef({ field: "body", start: null, end: null });

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
    setActiveField("body");
    cursorRef.current = { field: "body", start: null, end: null };
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Cursor tracking handlers
  const updateSubjectCursor = (e) => {
    cursorRef.current = {
      field: "subject",
      start: e.target.selectionStart,
      end: e.target.selectionEnd,
    };
    setActiveField("subject");
  };

  const updateBodyCursor = (e) => {
    cursorRef.current = {
      field: "body",
      start: e.target.selectionStart,
      end: e.target.selectionEnd,
    };
    setActiveField("body");
  };

  // Insert tag at current cursor position in whichever field was last active
  const handleTagInsert = (tag) => {
    const field = cursorRef.current.field || activeField;

    if (field === "subject" && formData.channel === "email") {
      const input = subjectInputRef.current;
      const curText = formData.subject || "";
      const start = cursorRef.current.start !== null && cursorRef.current.start !== undefined
        ? cursorRef.current.start
        : curText.length;
      const end = cursorRef.current.end !== null && cursorRef.current.end !== undefined
        ? cursorRef.current.end
        : curText.length;

      const newText = curText.substring(0, start) + tag + curText.substring(end);
      setFormData((prev) => ({ ...prev, subject: newText }));

      const nextPos = start + tag.length;
      cursorRef.current = { field: "subject", start: nextPos, end: nextPos };

      setTimeout(() => {
        if (input) {
          input.focus();
          input.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    } else {
      const textarea = textareaRef.current;
      const curText = formData.body || "";
      const start = cursorRef.current.start !== null && cursorRef.current.start !== undefined
        ? cursorRef.current.start
        : curText.length;
      const end = cursorRef.current.end !== null && cursorRef.current.end !== undefined
        ? cursorRef.current.end
        : curText.length;

      const newText = curText.substring(0, start) + tag + curText.substring(end);
      setFormData((prev) => ({ ...prev, body: newText }));

      const nextPos = start + tag.length;
      cursorRef.current = { field: "body", start: nextPos, end: nextPos };

      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    }
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
        
        {/* Header Bar */}
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

            {/* SINGLE COMMON DYNAMIC TAGS SECTION FOR BOTH SUBJECT & BODY */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">Dynamic Tags:</span>
                  <span className="text-[11px] text-slate-500">
                    Click any tag to insert at your active cursor
                  </span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Target: {activeField === "subject" && formData.channel === "email" ? "Subject Line" : "Message Body"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {AVAILABLE_TAGS.map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleTagInsert(item.tag)}
                    className="px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-medium border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                    title={`Click to insert ${item.tag} at cursor`}
                  >
                    + {item.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Line (Email Only) */}
            {formData.channel === "email" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-600">
                    Subject Line *
                  </label>
                  {activeField === "subject" && (
                    <span className="text-[11px] text-blue-600 font-semibold">● Cursor active in Subject</span>
                  )}
                </div>
                <input
                  ref={subjectInputRef}
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  onFocus={updateSubjectCursor}
                  onClick={updateSubjectCursor}
                  onKeyUp={updateSubjectCursor}
                  onSelect={updateSubjectCursor}
                  placeholder="e.g. Quotation #{quotation_no} for {company_name} from AKSN Infotech"
                  required={formData.channel === "email"}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden transition-all bg-white ${
                    activeField === "subject" ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"
                  }`}
                />
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-600">
                  Message Body *
                </label>
                {activeField === "body" && (
                  <span className="text-[11px] text-blue-600 font-semibold">● Cursor active in Body</span>
                )}
              </div>
              <textarea
                ref={textareaRef}
                name="body"
                value={formData.body}
                onChange={handleChange}
                onFocus={updateBodyCursor}
                onClick={updateBodyCursor}
                onKeyUp={updateBodyCursor}
                onSelect={updateBodyCursor}
                rows={8}
                placeholder="Dear {contact_person},&#10;&#10;Thank you for reaching out to AKSN Infotech. Please find the quotation details below...&#10;&#10;Best regards,&#10;{executive_name}&#10;AKSN Infotech"
                required
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden transition-all bg-white leading-relaxed resize-y ${
                  activeField === "body" ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"
                }`}
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
