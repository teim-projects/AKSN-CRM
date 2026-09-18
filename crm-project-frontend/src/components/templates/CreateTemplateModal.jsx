import React, { useState, useEffect, useRef } from "react";
import { RxCross2 } from "react-icons/rx";
import RichVisualEditor from "./RichVisualEditor";

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

export function renderLivePreview(rawText, channel) {
  if (!rawText || !rawText.trim()) {
    return "<div class='text-slate-400 italic text-center py-8'>Type or insert content in Write mode to see live preview...</div>";
  }

  if (channel === "whatsapp") {
    let safe = rawText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace ```code/table``` blocks
    safe = safe.replace(/```([\s\S]*?)```/g, (match, p1) => {
      return `<div class="my-2.5 p-3 bg-slate-900 text-emerald-300 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed border border-slate-700 shadow-xs">${p1}</div>`;
    });

    // Replace *bold text* with <strong>
    safe = safe.replace(/(?<=^|[\s\W])\*([^*\n\r]+)\*(?=[\s\W]|$)/g, '<strong class="font-bold text-slate-900 bg-amber-100/60 px-0.5 rounded">$1</strong>');

    // Convert newlines to <br>
    safe = safe.replace(/\n/g, "<br>");
    return `<div class="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200/70 font-sans text-xs text-slate-800 leading-relaxed shadow-xs">${safe}</div>`;
  } else {
    // Email channel
    let formatted = rawText;
    if (!/<(table|div|p|tbody|tr|td|th)\b/i.test(formatted)) {
      formatted = formatted
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    } else {
      formatted = formatted
        .split(/(<table[\s\S]*?<\/table>)/i)
        .map(part => {
          if (part.toLowerCase().startsWith("<table")) {
            return part;
          }
          return part.replace(/\n/g, "<br>");
        })
        .join("");
    }
    return `<div class="bg-white p-4 rounded-xl border border-slate-200 font-sans text-xs text-slate-800 leading-relaxed shadow-xs">${formatted}</div>`;
  }
}

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

  const editorRef = useRef(null);
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

  // Insert tag at current cursor position in whichever field was last active
  const handleTagInsert = (tag) => {
    if (activeField === "subject" && formData.channel === "email") {
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
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(tag);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        document.execCommand("insertText", false, tag);
      }
      setFormData((prev) => ({ ...prev, body: editor.innerHTML }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a template name");
      return;
    }
    const currentBody = editorRef.current ? editorRef.current.innerHTML : formData.body;
    const stripped = currentBody ? currentBody.replace(/<[^>]*>?/gm, "").trim() : "";
    if (!stripped) {
      alert("Please enter message body");
      return;
    }
    if (formData.channel === "email" && !formData.subject.trim()) {
      alert("Please enter a subject line for email template");
      return;
    }

    onSave({ ...formData, body: currentBody });
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

            {/* Message Body with Visual Rich Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-600">
                  Message Body *
                </label>
                <span className="text-[11px] text-slate-400 font-normal">
                  Visual editor: Click Bold or Insert Table to create directly
                </span>
              </div>

              <RichVisualEditor
                value={formData.body}
                onChange={(html) => setFormData((prev) => ({ ...prev, body: html }))}
                channel={formData.channel}
                editorRef={editorRef}
                onFocus={() => setActiveField("body")}
                placeholder="Dear {contact_person},&#10;&#10;Thank you for reaching out to AKSN Infotech. Please find the quotation details below...&#10;&#10;Best regards,&#10;{executive_name}"
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
