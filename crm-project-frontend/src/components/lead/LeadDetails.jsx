import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import axios from "axios";

const LeadDetails = ({ open, onClose, leadId, baseApi, token }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!open) return;

    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${baseApi}/product/products/`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const items = Array.isArray(response.data) ? response.data : response.data.results ?? [];
        setProducts(items);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };

    fetchProducts();
  }, [open, baseApi, token]);

  useEffect(() => {
    if (!open || !leadId) return;

    const fetchLead = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(`${baseApi}/lead/lead/${leadId}/`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        setLead(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || String(err));
        setLead(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [open, leadId, baseApi, token]);

  const getProductName = (id) => {
    if (!id) return "";
    const str = typeof id === "object" ? (id.name || id.product || "") : String(id);
    const product = products.find(p => String(p.id) === String(str) || p.name === str);
    if (product) return product.name;
    if (/^\d+$/.test(str.trim())) return "";
    return str;
  };

  const getDisplayValue = (value, options = []) => {
    if (!value) return "—";
    const option = options.find(opt => opt.id === value);
    return option ? option.name : value;
  };

  const leadSourceOptions = [
    { id: "website", name: "Website" },
    { id: "referral", name: "Referral" },
    { id: "cold_call", name: "Cold Call" },
    { id: "social_media", name: "Social Media" },
    { id: "email_campaign", name: "Email Campaign" },
    { id: "exhibition", name: "Exhibition" },
  ];

  const industryOptions = [
    { id: "it_services", name: "IT Services" },
    { id: "manufacturing", name: "Manufacturing" },
    { id: "banking", name: "Banking" },
    { id: "automotive", name: "Automotive" },
    { id: "healthcare", name: "Healthcare" },
    { id: "education", name: "Education" },
    { id: "real_estate", name: "Real Estate" },
  ];

  const priorityOptions = [
    { id: "critical", name: "Critical" },
    { id: "high", name: "High" },
    { id: "medium", name: "Medium" },
    { id: "low", name: "Low" },
  ];

  const pipelineOptions = [
    { id: "new_lead", name: "New Lead" },
    { id: "contacted", name: "Contacted" },
    { id: "requirement_gathering", name: "Requirement Gathering" },
    { id: "demo_scheduled", name: "Demo Scheduled" },
    { id: "demo_completed", name: "Demo Completed" },
    { id: "proposal_sent", name: "Proposal Sent" },
    { id: "negotiation", name: "Negotiation" },
  ];

  const statusOptions = [
    { id: "open", name: "Open" },
    { id: "close_win", name: "Close Win" },
    { id: "close_loss", name: "Close Loss" },
  ];

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-slate-100 my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          aria-label="Close"
        >
          <MdClose size={22} />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-slate-900">Lead Details</h2>

        {loading && <div className="text-sm text-slate-500 py-4">Loading…</div>}
        {error && <div className="text-sm text-red-600 mb-2 py-2">{error}</div>}
        {!loading && !lead && !error && (
          <div className="text-sm text-slate-500 py-4">No data found</div>
        )}

        {!loading && lead && (
          <div className="space-y-4">
            {/* Conversion Status */}
            {lead.is_converted && lead.converted_to_customer && (
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <h3 className="font-semibold mb-2 text-green-700">Converted to Customer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">Customer ID:</span>{" "}
                    {lead.converted_to_customer}
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Status:</span>{" "}
                    <span className="text-green-600 font-medium">✓ Converted</span>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="border border-slate-200/80 rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-3 text-slate-700">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Company Name:</span>{" "}
                  <span className="text-slate-800 font-medium">{lead.company_name || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Contact Person:</span>{" "}
                  <span className="text-slate-800 font-medium">{lead.contact_person || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Mobile Number:</span>{" "}
                  <span className="text-slate-800 font-medium">{lead.mobile_number || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Email:</span>{" "}
                  <span className="text-slate-800">{lead.email_address || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">State:</span>{" "}
                  <span className="text-slate-800">{lead.state || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">City:</span>{" "}
                  <span className="text-slate-800">{lead.city || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Industry:</span>{" "}
                  <span className="text-slate-800">{getDisplayValue(lead.industry_type, industryOptions)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Lead Source:</span>{" "}
                  <span className="text-slate-800">{getDisplayValue(lead.lead_source, leadSourceOptions)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Priority:</span>{" "}
                  <span className={`font-semibold ${
                    lead.priority === "critical" ? "text-red-600" :
                    lead.priority === "high" ? "text-orange-600" :
                    lead.priority === "medium" ? "text-yellow-600" :
                    "text-green-600"
                  }`}>
                    {getDisplayValue(lead.priority, priorityOptions)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Lead Date:</span>{" "}
                  <span className="text-slate-800">{lead.enquiry_date || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Expected Closure:</span>{" "}
                  <span className="text-slate-800">{lead.expected_closure_date || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Expected Budget:</span>{" "}
                  <span className="text-slate-800">{lead.expected_budget || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Amount:</span>{" "}
                  <span className="font-bold text-slate-900">
                    {lead.amount !== undefined && lead.amount !== null
                      ? `₹${parseFloat(lead.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-slate-600">LinkedIn:</span>{" "}
                  {lead.linkedin_profile_url ? (
                    <a href={lead.linkedin_profile_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {lead.linkedin_profile_url}
                    </a>
                  ) : "—"}
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-slate-600">Products Interested:</span>{" "}
                  {(() => {
                    const validProducts = (lead.product_interested || [])
                      .map((id) => getProductName(id))
                      .filter(Boolean);
                    if (validProducts.length === 0) return "—";
                    return (
                      <span className="flex flex-wrap gap-1 mt-1">
                        {validProducts.map((pName, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs border border-blue-100">
                            {pName}
                          </span>
                        ))}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Pipeline Information */}
            <div className="border border-slate-200/80 rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-3 text-slate-700">Pipeline Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Pipeline Stage:</span>{" "}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getDisplayValue(lead.pipeline_stage, pipelineOptions)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Status:</span>{" "}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lead.status === 'close_win' ? 'bg-emerald-100 text-emerald-800' :
                    lead.status === 'close_loss' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {getDisplayValue(lead.status, statusOptions)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Assigned Executive:</span>{" "}
                  <span className="text-slate-800 font-medium">
                    {lead.assigned_executive_details?.full_name || lead.assigned_executive || "—"}
                    {lead.assigned_executive_details?.email && (
                      <span className="text-slate-500 font-normal ml-1">({lead.assigned_executive_details.email})</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Last Follow-up Date:</span>{" "}
                  <span className="text-slate-800">{lead.last_followup_date || "—"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Next Follow-up Date:</span>{" "}
                  <span className="text-slate-800">{lead.followup_date || "—"}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="font-medium text-slate-600">Tally User:</span>{" "}
                  {lead.is_tally_user === "yes" ? (
                    <span className="text-green-600 font-medium">
                      Yes {lead.tally_number ? `(Serial / License No: ${lead.tally_number})` : ""}
                    </span>
                  ) : lead.is_tally_user === "no" ? (
                    <span className="text-red-600 font-medium">No</span>
                  ) : "—"}
                </div>
              </div>
            </div>

            {/* Requirements & Remarks */}
            <div className="border border-slate-200/80 rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-3 text-slate-700">Requirements & Notes</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Requirement Details:</span>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                    {lead.requirement_details || "—"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Remarks:</span>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                    {lead.remarks || "—"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Status:</span>{" "}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lead.status === "open" ? "bg-green-100 text-green-800" :
                    lead.status === "closed" ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {lead.status || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Follow-up History */}
            {lead.followups && lead.followups.length > 0 && (
              <div className="border border-slate-200/80 rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-3 text-slate-700">Follow-up History</h3>
                <table className="w-full text-sm border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Followup Date</th>
                      <th className="p-2 text-left">Next Followup</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lead.followups.map((fu, idx) => (
                      <tr key={fu.id || idx} className="border-t align-top">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{fu.followup_date || "—"}</td>
                        <td className="p-2">{fu.next_followup_date || "—"}</td>
                        <td className="p-2">{fu.status || "—"}</td>
                        <td className="p-2">
                          <div>{fu.remarks || "—"}</div>
                          {fu.faq_answers && fu.faq_answers.length > 0 && (
                            <div className="mt-2 text-xs text-slate-600">
                              <div className="font-semibold mb-1">FAQs:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {fu.faq_answers.map((faq) => (
                                  <li key={faq.id}>
                                    <span className="font-medium">{faq.faq_question}:</span>{" "}
                                    {faq.answer || "—"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetails;