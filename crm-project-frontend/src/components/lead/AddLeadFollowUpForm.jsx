import { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";

// Followup History Modal - Fully aligned to typography weights, tints, and card shadows
const FollowupHistoryModal = ({ open, onClose, lead }) => {
  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-start sm:items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
        <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-6 py-5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Followup History</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold transition-colors text-lg p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 bg-white">
          {lead.followups && lead.followups.length > 0 ? (
            <div className="space-y-6">
              {lead.followups.map((fu) => (
                <div key={fu.id} className="border border-slate-150 rounded-2xl p-6 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-all">
                  {/* Header: Date, Time, Mode */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-bold text-slate-800">
                        {fu.followup_date || "—"} · {fu.followup_time || ""} 
                        <span className="ml-3 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md capitalize">{fu.followup_mode || "Call"}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                        {fu.client_response_display || fu.client_response || "Positive"}
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        Completed
                      </span>
                    </div>
                  </div>
                  
                  {/* Executive Name & Followup Number Block */}
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-4">
                    <p className="text-xs text-slate-400 font-semibold">
                      By {fu.created_by?.full_name || "User"} · {fu.contact_person || "Contact"}
                    </p>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50/70 px-3 py-1 rounded-md border border-blue-100/50">
                      {fu.followup_number || "F001"}
                    </span>
                  </div>

                  {/* Discussion Summary */}
                  <div className="text-sm text-slate-600 mb-5 font-normal leading-relaxed">
                    {fu.discussion_summary || fu.remarks || "No discussion notes recorded."}
                  </div>

                  {/* Client & Our Commitments */}
                  {(fu.commitment_client || fu.commitment_us) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {fu.commitment_client ? (
                        <div className="p-4 bg-[#f4fbf7] border border-[#e2f6eb] rounded-xl">
                          <span className="text-xs font-bold tracking-wide text-[#2b7352] block mb-1.5 uppercase">
                            Client Commitment
                          </span>
                          <span className="text-sm text-slate-700 font-bold">{fu.commitment_client}</span>
                        </div>
                      ) : <div />}
                      
                      {fu.commitment_us ? (
                        <div className="p-4 bg-[#f4f7fe] border border-[#e8effd] rounded-xl">
                          <span className="text-xs font-bold tracking-wide text-[#2b52dd] block mb-1.5 uppercase">
                            Our Commitment
                          </span>
                          <span className="text-sm text-slate-700 font-bold">{fu.commitment_us}</span>
                        </div>
                      ) : <div />}
                    </div>
                  )}

                  {/* Stage & Next Follow-up */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold">Stage:</span>
                      <span className="font-bold text-slate-700 capitalize">
                        {fu.current_stage_display || fu.current_stage || "New Lead"}
                      </span>
                      {fu.move_to_stage && (
                        <>
                          <span className="text-slate-300">→</span>
                          <span className="font-bold text-blue-600 capitalize">
                            {fu.move_to_stage_display || fu.move_to_stage}
                          </span>
                        </>
                      )}
                    </div>
                    {fu.next_followup_date && (
                      <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                        <span>Next:</span>
                        <span className="font-bold text-slate-700">
                          {fu.next_followup_date} 
                          {fu.next_followup_mode && ` via ${fu.next_followup_mode}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 text-center py-10 font-bold">No followups recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Initial form state definition
const INITIAL_FORM_DATA = {
  followup_date: "",
  followup_time: "",
  followup_mode: "",
  current_stage: "",
  move_to_stage: "",
  client_response: "",
  discussion_summary: "",
  commitment_client: "",
  commitment_us: "",
  decision_maker_contacted: "",
  timeline_urgency: "",
  pain_point_urgency: "",
  budget_status: "",
  competition: "",
  number_of_users: "",
  competitors_list: "",
  next_followup_date: "",
  next_followup_mode: "",
  additional_remarks: "",
  ready_to_send_quotation: false,
  status: "open",
};

export default function AddLeadFollowUpForm({
  open,
  onClose,
  onSuccess,
  baseApi,
  leadId,
  followup = null,
}) {
  const DEFAULT_API = "http://127.0.0.1:8000";
  const BASE_API = baseApi ?? DEFAULT_API;

  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [showHistory, setShowHistory] = useState(false);
  const [faqList, setFaqList] = useState([]);
  const [faqAnswers, setFaqAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [faqLoading, setFaqLoading] = useState(false);
  const [leadData, setLeadData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const token = useMemo(
    () =>
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "",
    []
  );

  const followupModeOptions = [
    { value: "call", label: "Call" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "email", label: "Email" },
    { value: "video_call", label: "Video Call" },
    { value: "in_person", label: "In-Person" },
    { value: "demo", label: "Demo" },
    { value: "site_visit", label: "Site Visit" },
  ];

  const pipelineStageOptions = [
    { value: "new_lead", label: "New Lead" },
    { value: "contacted", label: "Contacted" },
    { value: "requirement_gathering", label: "Requirement Gathering" },
    { value: "demo_scheduled", label: "Demo Scheduled" },
    { value: "demo_completed", label: "Demo Completed" },
    { value: "proposal_sent", label: "Proposal Sent" },
    { value: "negotiation", label: "Negotiation" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
    { value: "on_hold", label: "On Hold" },
  ];

  const clientResponseOptions = [
    { value: "very_positive", label: "Very Positive" },
    { value: "positive", label: "Positive" },
    { value: "neutral", label: "Neutral" },
    { value: "negative", label: "Negative" },
    { value: "no_response", label: "No Response" },
    { value: "call_back_later", label: "Call Back Later" },
  ];

  const decisionMakerOptions = [
    { value: "yes_final", label: "Yes — Final Decision Maker" },
    { value: "yes_influencer", label: "Yes — Influencer / Recommender" },
    { value: "no_need_higher", label: "No — Need to Reach Higher" },
  ];

  const timelineOptions = [
    { value: "immediate", label: "Immediate (within 1 month)" },
    { value: "short_term", label: "Short-term (1–3 months)" },
    { value: "mid_term", label: "Mid-term (3–6 months)" },
    { value: "long_term", label: "Long-term (6+ months)" },
    { value: "no_clear", label: "No Clear Timeline" },
  ];

  const painPointOptions = [
    { value: "critical", label: "Critical — Impacting Business" },
    { value: "moderate", label: "Moderate — Manageable but needs fix" },
    { value: "low", label: "Low — Nice to have" },
  ];

  const budgetStatusOptions = [
    { value: "approved", label: "Budget Approved" },
    { value: "allocated", label: "Budget Allocated (not approved)" },
    { value: "under_discussion", label: "Budget Under Discussion" },
    { value: "no_budget", label: "No Budget Yet" },
    { value: "not_disclosed", label: "Not Disclosed" },
  ];

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "in_process", label: "In Process" },
    { value: "closed", label: "Closed" },
  ];

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM_DATA });
    setFaqAnswers({});
    setLeadData(null);
    setIsEditMode(false);
    setShowHistory(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  useEffect(() => {
    if (!open || !leadId) return;

    const fetchLead = async () => {
      try {
        const res = await fetch(`${BASE_API}/lead/lead/${leadId}/`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) throw new Error("Failed to load lead");

        const data = await res.json();
        setLeadData(data);
        
        if (data.pipeline_stage && !followup) {
          setFormData(prev => ({ ...prev, current_stage: data.pipeline_stage }));
        }
      } catch (err) {
        console.error("Lead fetch error:", err);
        setLeadData(null);
      }
    };

    fetchLead();
  }, [open, leadId, BASE_API, token, followup]);

  useEffect(() => {
    if (followup) {
      setIsEditMode(true);
      setFormData({
        followup_date: followup.followup_date || "",
        followup_time: followup.followup_time || "",
        followup_mode: followup.followup_mode || "",
        current_stage: followup.current_stage || "",
        move_to_stage: followup.move_to_stage || "",
        client_response: followup.client_response || "",
        discussion_summary: followup.discussion_summary || "",
        commitment_client: followup.commitment_client || "",
        commitment_us: followup.commitment_us || "",
        decision_maker_contacted: followup.decision_maker_contacted || "",
        timeline_urgency: followup.timeline_urgency || "",
        pain_point_urgency: followup.pain_point_urgency || "",
        budget_status: followup.budget_status || "",
        competition: followup.competition || "",
        number_of_users: followup.number_of_users || "",
        competitors_list: followup.competitors_list || "",
        next_followup_date: followup.next_followup_date || "",
        next_followup_mode: followup.next_followup_mode || "",
        additional_remarks: followup.additional_remarks || "",
        ready_to_send_quotation: followup.ready_to_send_quotation || false,
        status: followup.status || "open",
      });

      if (followup.faq_answers?.length) {
        const initial = {};
        followup.faq_answers.forEach((item) => {
          initial[item.faq] = item.answer || "";
        });
        setFaqAnswers(initial);
      }
    } else {
      setIsEditMode(false);
    }
  }, [followup]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        resetForm();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const fetchFaqs = async () => {
      setFaqLoading(true);
      try {
        const res = await fetch(`${BASE_API}/lead/lead-faqs/`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          console.error("Failed to load FAQs", await res.text());
          return;
        }

        const data = await res.json();
        const items = Array.isArray(data?.results) ? data.results : data;
        setFaqList(items || []);
        
        if (!followup) {
          const initial = {};
          (items || []).forEach((faq) => {
            initial[faq.id] = "";
          });
          setFaqAnswers(initial);
        }
      } catch (err) {
        console.error("FAQ fetch error", err);
      } finally {
        setFaqLoading(false);
      }
    };

    fetchFaqs();
  }, [open, BASE_API, token, followup]);

  if (!open) return null;

  const validate = () => {
    if (!leadId && !followup) {
      Swal.fire({ icon: "error", title: "Validation", text: "Lead is required to create follow-up." });
      return false;
    }

    if (!formData.followup_date) {
      Swal.fire({ icon: "error", title: "Validation", text: "Follow-up date is required" });
      return false;
    }

    if (!formData.followup_mode) {
      Swal.fire({ icon: "error", title: "Validation", text: "Follow-up mode is required" });
      return false;
    }

    if (!formData.client_response) {
      Swal.fire({ icon: "error", title: "Validation", text: "Client response is required" });
      return false;
    }

    if (!formData.discussion_summary.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Discussion summary is required" });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const faqPayload = Object.entries(faqAnswers)
        .filter(([, ans]) => ans && ans.toString().trim() !== "")
        .map(([faqId, ans]) => ({
          faq: Number(faqId),
          answer: ans.toString().trim(),
        }));

      const payload = {
        lead: leadId,
        ...formData,
        followup_time: formData.followup_time || null,
        move_to_stage: formData.move_to_stage || null,
        decision_maker_contacted: formData.decision_maker_contacted || null,
        timeline_urgency: formData.timeline_urgency || null,
        pain_point_urgency: formData.pain_point_urgency || null,
        budget_status: formData.budget_status || null,
        next_followup_date: formData.next_followup_date || null,
        next_followup_mode: formData.next_followup_mode || null,
        discussion_summary: formData.discussion_summary.trim(),
        commitment_client: formData.commitment_client.trim(),
        commitment_us: formData.commitment_us.trim(),
        additional_remarks: formData.additional_remarks.trim(),
      };

      if (faqPayload.length) {
        payload.faq_answers = faqPayload;
      }

      const url = followup
        ? `${BASE_API}/lead/lead-followups/${followup.id}/`
        : `${BASE_API}/lead/lead-followups/`;
      const method = followup ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (!res.ok) {
        const msg = data?.detail || JSON.stringify(data) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      Swal.fire({
        icon: "success",
        text: followup ? "Follow-up updated successfully" : "Follow-up added successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      resetForm();
      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to save follow-up",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose && onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-start sm:items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-6 py-5 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {followup ? "Edit Follow-up" : "Add Follow-up"}
              </h2>
              {leadData && (
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  {leadData.company_name} · {leadData.contact_person} · Stage: {leadData.pipeline_stage || "New Lead"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-150 rounded-lg hover:bg-slate-200 transition-colors shadow-xs"
              >
                Followup History
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg transition-colors ml-1 p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="px-6 py-5 overflow-y-auto flex-1 bg-white text-slate-800 scrollbar-thin">
            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* FOLLOW-UP DETAILS */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-1 border-b border-slate-200">
                  FOLLOW-UP DETAILS
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Follow-up Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="followup_date"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      value={formData.followup_date}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Follow-up Time
                    </label>
                    <input
                      type="time"
                      name="followup_time"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      value={formData.followup_time}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Follow-up Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {followupModeOptions.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, followup_mode: mode.value }))}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          formData.followup_mode === mode.value
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STAGE & RESPONSE */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-1 border-b border-slate-200">
                  STAGE & RESPONSE
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Current Stage <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="current_stage"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm h-[38px]"
                      value={formData.current_stage}
                      onChange={handleChange}
                    >
                      <option value="">Select Stage</option>
                      {pipelineStageOptions.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Move to Next Stage
                    </label>
                    <select
                      name="move_to_stage"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm h-[38px]"
                      value={formData.move_to_stage}
                      onChange={handleChange}
                    >
                      <option value="">— No Change —</option>
                      {pipelineStageOptions.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Client Response <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {clientResponseOptions.map((response) => (
                      <button
                        key={response.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, client_response: response.value }))}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          formData.client_response === response.value
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {response.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DISCUSSION NOTES */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-1 border-b border-slate-200">
                  DISCUSSION NOTES
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Follow-up Summary / Key Discussion Points <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="discussion_summary"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      rows={3}
                      value={formData.discussion_summary}
                      onChange={handleChange}
                      placeholder="What was discussed? Key pain points shared, objections raised, decisions taken..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Commitment by Client
                    </label>
                    <textarea
                      name="commitment_client"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      rows={2}
                      value={formData.commitment_client}
                      onChange={handleChange}
                      placeholder="e.g. Will share PO by Friday, Arranging technical team..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Commitment by Us
                    </label>
                    <textarea
                      name="commitment_us"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      rows={2}
                      value={formData.commitment_us}
                      onChange={handleChange}
                      placeholder="e.g. Sending revised proposal, Escalating discount request..."
                    />
                  </div>
                </div>
              </div>

              {/* QUALIFYING QUESTIONS */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-1 border-b border-slate-200">
                  QUALIFYING QUESTIONS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Decision Maker Contacted?
                    </label>
                    <select
                      name="decision_maker_contacted"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm h-[38px]"
                      value={formData.decision_maker_contacted}
                      onChange={handleChange}
                    >
                      <option value="">— Select —</option>
                      {decisionMakerOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Timeline / Urgency
                    </label>
                    <select
                      name="timeline_urgency"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm h-[38px]"
                      value={formData.timeline_urgency}
                      onChange={handleChange}
                    >
                      <option value="">— Select —</option>
                      {timelineOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Pain Point / Problem Urgency
                    </label>
                    <select
                      name="pain_point_urgency"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm h-[38px]"
                      value={formData.pain_point_urgency}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      {painPointOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Budget Status
                    </label>
                    <select
                      name="budget_status"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm h-[38px]"
                      value={formData.budget_status}
                      onChange={handleChange}
                    >
                      <option value="">— Select —</option>
                      {budgetStatusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Competition (Other Vendors Evaluated)
                    </label>
                    <input
                      type="text"
                      name="competition"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      value={formData.competition}
                      onChange={handleChange}
                      placeholder="e.g. SAP, Zoho, Tally, None"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Number of Users (Confirmed)
                    </label>
                    <input
                      type="text"
                      name="number_of_users"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      value={formData.number_of_users}
                      onChange={handleChange}
                      placeholder="Number of users..."
                    />
                  </div>
                </div>
              </div>

              {/* NEXT FOLLOW-UP PLANNING */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-1 border-b border-slate-200">
                  NEXT FOLLOW-UP PLANNING
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Next Follow-up Date
                    </label>
                    <input
                      type="date"
                      name="next_followup_date"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      value={formData.next_followup_date}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Next Follow-up Mode
                    </label>
                    <select
                      name="next_followup_mode"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm h-[38px]"
                      value={formData.next_followup_mode}
                      onChange={handleChange}
                    >
                      <option value="">Select Mode</option>
                      {followupModeOptions.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Additional Remarks
                  </label>
                  <textarea
                    name="additional_remarks"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                    rows={2}
                    value={formData.additional_remarks}
                    onChange={handleChange}
                    placeholder="Any other notes for next executive or management..."
                  />
                </div>
              </div>

              {/* Quotation & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    name="ready_to_send_quotation"
                    checked={formData.ready_to_send_quotation}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    Ready to send a quotation?
                  </label>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm h-[38px]"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FAQ Section */}
              {faqList.length > 0 && (
                <div className="border-t border-slate-100 pt-5 mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-900">Standard Questions</h3>
                    {faqLoading && <span className="text-xs text-slate-400 font-semibold">Loading…</span>}
                  </div>
                  <div className="space-y-4">
                    {faqList.map((faq) => (
                      <div key={faq.id}>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                          {faq.question}
                        </label>
                        <textarea
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                          rows={2}
                          value={faqAnswers[faq.id] ?? ""}
                          onChange={(e) =>
                            setFaqAnswers((prev) => ({
                              ...prev,
                              [faq.id]: e.target.value,
                            }))
                          }
                          placeholder="Enter your answer..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                  disabled={loading}
                >
                  {loading ? (followup ? "Updating..." : "Saving...") : (followup ? "Update" : "Save Follow-up")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <FollowupHistoryModal
          open={showHistory}
          onClose={() => setShowHistory(false)}
          lead={leadData}
        />
      )}
    </>
  );
}