import { useEffect, useState } from "react";
import { MdCheckCircle, MdRadioButtonUnchecked, MdExpandMore, MdExpandLess } from "react-icons/md";

/**
 * LeadQualifyingPanel
 * Shows active LeadFAQ questions and lets the user fill in answers.
 * Only visible when `isQualified` is true (manager approved).
 *
 * Props:
 *   baseApi          – API base URL
 *   token            – Bearer token
 *   answers          – current answers object: { [faq_id]: answer_text }
 *   onChange         – (newAnswers) => void
 *   isQualified      – bool — whether this lead has been approved for qualifying
 *   onToggleQualify  – () => void — called when manager flips the qualify toggle
 *   canApprove       – bool — whether the current user can approve (manager/admin only)
 */
export default function LeadQualifyingPanel({
  baseApi,
  token,
  answers = {},
  onChange,
  isQualified = false,
  onToggleQualify,
  canApprove = false,
}) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!isQualified) return;
    fetchFaqs();
  }, [isQualified, baseApi, token]);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseApi}/lead/lead-faqs/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFaqs((data.results || data).filter((f) => f.is_active));
      }
    } catch (e) {
      console.error("Failed to fetch lead FAQs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (faqId, value) => {
    onChange && onChange({ ...answers, [faqId]: value });
  };

  const answeredCount = faqs.filter((f) => answers[f.id]?.trim()).length;

  return (
    <div className="mt-4">
      {/* Qualify Toggle Row */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          {isQualified ? (
            <MdCheckCircle size={20} className="text-green-600" />
          ) : (
            <MdRadioButtonUnchecked size={20} className="text-slate-400" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Lead Qualifying Questions
            </p>
            <p className="text-xs text-slate-500">
              {isQualified
                ? `${answeredCount} of ${faqs.length} answered`
                : "Awaiting manager approval to unlock qualifying questions"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && (
            <button
              type="button"
              onClick={onToggleQualify}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                isQualified
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
              }`}
            >
              {isQualified ? "✓ Approved" : "Approve"}
            </button>
          )}
          {isQualified && faqs.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-slate-400 hover:text-slate-600"
            >
              {expanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* FAQ Questions */}
      {isQualified && expanded && (
        <div className="mt-3 space-y-3 border border-slate-200 rounded-lg p-4 bg-white">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-4 animate-pulse">
              Loading qualifying questions...
            </p>
          ) : faqs.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-4">
              No qualifying questions configured. Ask admin to add questions via{" "}
              <code className="bg-slate-100 px-1 rounded">/lead/lead-faqs/</code>
            </p>
          ) : (
            faqs.map((faq, idx) => {
              const answer = answers[faq.id] || "";
              const isAnswered = !!answer.trim();
              return (
                <div key={faq.id} className="space-y-1">
                  <label className="flex items-start gap-2 text-sm font-medium text-slate-700">
                    <span className="shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                      {idx + 1}
                    </span>
                    <span>
                      {faq.question}
                      {isAnswered && (
                        <MdCheckCircle
                          size={14}
                          className="inline ml-1 text-green-500"
                        />
                      )}
                    </span>
                  </label>
                  <textarea
                    value={answer}
                    onChange={(e) => handleAnswer(faq.id, e.target.value)}
                    placeholder="Enter your answer..."
                    rows={2}
                    className={`w-full ml-7 px-3 py-2 text-sm rounded-md border transition-colors resize-none ${
                      isAnswered
                        ? "border-green-300 bg-green-50 focus:border-green-400"
                        : "border-slate-300 bg-white focus:border-blue-400"
                    } focus:outline-none focus:ring-1 focus:ring-blue-200`}
                  />
                </div>
              );
            })
          )}

          {/* Progress bar */}
          {faqs.length > 0 && !loading && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Completion</span>
                <span>
                  {answeredCount}/{faqs.length}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${faqs.length ? (answeredCount / faqs.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
