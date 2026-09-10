import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import Base from "../components/Base";
import TableView from "../components/TableView";
import LeadDetails from "../components/lead/LeadDetails";
import AddLeadFollowUpForm from "../components/lead/AddLeadFollowUpForm";
import AddLeadForm from "../components/lead/AddLeadForm";
import { MdEdit, MdDelete, MdOutlineRemoveRedEye, MdEditDocument, MdAdd, MdFilterList, MdZoomIn, MdUpload } from "react-icons/md";
import Swal from "sweetalert2";
import { useUserRole } from '../hooks/useAuth';
import AddQuotation from "../components/quotations/AddQuotation";
import AdvancedTableFilter from "../components/AdvancedTableFilter";
import RecordViewer from "../components/RecordViewer";
import ImportLeadModal from "../components/lead/ImportLeadModal";

export default function Lead() {
  const [searchParams, setSearchParams] = useSearchParams();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API}/lead/lead/`;

  const { userRole, isLoading: loadingUser, hasPermission } = useUserRole(BASE_API);
  const canCreateLead = hasPermission("leads", "create");
  const canEditLead = hasPermission("leads", "edit");
  const canDeleteLead = hasPermission("leads", "delete");

  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationLeadData, setQuotationLeadData] = useState(null);

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Record Viewer state
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [leadDetailsId, setLeadDetailsId] = useState(null);

  const [showLeadFollowUp, setShowLeadFollowUp] = useState(false);
  const [followUpLeadId, setFollowUpLeadId] = useState(null);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [highlightedLeadId, setHighlightedLeadId] = useState(null);

  const isLeadMatch = useCallback((r, targetId) => {
    if (!targetId) return false;
    const strTarget = String(targetId).toLowerCase().trim();
    if (!strTarget) return false;

    const idMatch = String(r.id).toLowerCase() === strTarget;
    const leadIdMatch = String(r.lead_id || "").toLowerCase() === strTarget;
    const enquiryIdMatch = String(r.enquiry_id || "").toLowerCase() === strTarget;

    const companyName = String(r.company_name || "").toLowerCase().trim();
    const contactPerson = String(r.contact_person || "").toLowerCase().trim();

    const nameMatch =
      (companyName && (companyName === strTarget || companyName.includes(strTarget) || strTarget.includes(companyName))) ||
      (contactPerson && (contactPerson === strTarget || contactPerson.includes(strTarget) || strTarget.includes(contactPerson)));

    return idMatch || leadIdMatch || enquiryIdMatch || nameMatch;
  }, []);

  // Highlight target lead row and paginate when redirected from notification
  useEffect(() => {
    const targetLeadId = searchParams.get("leadId") || searchParams.get("id");
    const isLatest = searchParams.get("highlight") === "latest" || targetLeadId === "latest";

    if ((targetLeadId || isLatest) && allRows.length > 0) {
      if (isLatest) {
        setHighlightedLeadId(allRows[0].id);
        setCurrentPage(1);
      } else {
        const itemIdx = allRows.findIndex((r) => isLeadMatch(r, targetLeadId));
        if (itemIdx !== -1) {
          setHighlightedLeadId(allRows[itemIdx].id);
          const pageNum = Math.floor(itemIdx / itemsPerPage) + 1;
          setCurrentPage(pageNum);
        } else {
          setHighlightedLeadId(allRows[0].id);
          setCurrentPage(1);
        }
      }
    }
  }, [searchParams, allRows, itemsPerPage, isLeadMatch]);

  // Clear highlight and remove query parameters when user clicks anywhere on screen
  useEffect(() => {
    if (!highlightedLeadId) return;

    const handleScreenClick = () => {
      if (window._lastNotificationClickTime && Date.now() - window._lastNotificationClickTime < 600) {
        return;
      }
      setHighlightedLeadId(null);
      if (window.location.search) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener("click", handleScreenClick, { capture: true });
      window.addEventListener("pointerdown", handleScreenClick, { capture: true });
    }, 400);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleScreenClick, { capture: true });
      window.removeEventListener("pointerdown", handleScreenClick, { capture: true });
    };
  }, [highlightedLeadId]);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error("No bearer token found in localStorage.");

      const url = `${API_URL}?limit=1000`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${body ? " — " + body : ""}`);
      }

      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];

      const normalized = results.map((r) => ({
        ...r,
        date: r.enquiry_date || r.created_at || "",
        assign_to:
          r.assigned_executive_details?.full_name ||
          r.assigned_executive_details?.first_name ||
          (r.assigned_executive ? String(r.assigned_executive) : ""),
      }));

      setAllRows(normalized);
      setFilteredData(normalized);
      setRows(normalized);
      setTotalCount(normalized.length);
      setTotalPages(Math.max(1, Math.ceil(normalized.length / itemsPerPage)));
    } catch (err) {
      setError(err.message || String(err));
      setRows([]);
      setAllRows([]);
      setFilteredData([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setRows(filteredData);
    setTotalCount(filteredData.length);
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
    if (!window.location.search.includes("leadId") && !window.location.search.includes("id=") && !window.location.search.includes("highlight")) {
      setCurrentPage(1);
    }
  }, [filteredData, itemsPerPage]);

  // Get current page data
  const getCurrentPageData = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return rows.slice(startIndex, startIndex + itemsPerPage);
  }, [rows, currentPage, itemsPerPage]);

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Delete Lead?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b"
    });
    if (!res.isConfirmed) return;

    try {
      const resp = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`${resp.status} ${resp.statusText} — ${text}`);
      }
      Swal.fire({ icon: "success", text: "Lead deleted", timer: 1000, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  const handleConvertToCustomer = async (leadId) => {
    const result = await Swal.fire({
      title: "Convert to Customer?",
      text: "This will create a customer record from this lead data.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Convert",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}${leadId}/convert-to-customer/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to convert lead");
      }

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: data.message || "Lead converted to customer successfully",
        timer: 2000,
        showConfirmButton: false
      });

      fetchData();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Conversion Failed",
        text: err.message
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getRowClassName = (lead) => {
    if (highlightedLeadId && String(lead.id) === String(highlightedLeadId)) {
      return "!bg-blue-100/90 font-bold border-l-4 border-l-blue-600 ring-2 ring-blue-400/60 shadow-md animate-pulse";
    }
    // If status is closed, won, or lost, return normal styling
    if (lead.status === "close_win" || lead.status === "close_loss" || lead.status === "closed") return "";

    if (!lead.followup_date) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followupDate = new Date(lead.followup_date);
    followupDate.setHours(0, 0, 0, 0);

    if (followupDate.getTime() === today.getTime()) return "bg-yellow-100";
    if (followupDate < today) return "bg-red-100";
    return "";
  };

  const columns = [
    {
      key: "sr",
      label: "Sr.No",
      render: (r, idx) => {
        const isReady = Boolean(r.ready_to_send_quotation);
        const srNum = (currentPage - 1) * itemsPerPage + (idx + 1);
        return (
          <div className="flex items-center gap-1.5 py-0.5" title={isReady ? "Ready to Send Quotation" : ""}>
            <span className="text-slate-600 font-medium text-xs">{srNum}</span>
            {isReady && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse inline-block shrink-0" />
            )}
          </div>
        );
      },
    },
    { key: "date", label: "Date", render: (r) => <span className="text-slate-600 text-xs whitespace-nowrap py-0.5 block">{formatDate(r.enquiry_date || r.created_at)}</span> },
    {
      key: "followup_date",
      label: (
        <div className="leading-tight">
          <div>Next Followup</div>
          <div>Date</div>
        </div>
      ),
      render: (r) => <span className="font-semibold text-slate-700 text-xs whitespace-nowrap py-0.5 block">{formatDate(r.followup_date)}</span>
    },
    {
      key: "company_name",
      label: (
        <div className="leading-tight">
          <div>Company</div>
          <div>Name</div>
        </div>
      ),
      render: (r) => <span className="text-slate-900 font-semibold text-xs tracking-tight py-0.5 block">{r.company_name || "-"}</span>
    },
    {
      key: "contact_person",
      label: (
        <div className="leading-tight">
          <div>Contact</div>
          <div>Person</div>
        </div>
      ),
      render: (r) => <span className="text-slate-700 text-xs py-0.5 block">{r.contact_person || "-"}</span>
    },
    { key: "mobile_number", label: "Mobile", render: (r) => <span className="text-slate-700 text-xs font-medium whitespace-nowrap py-0.5 block">{r.mobile_number || "-"}</span> },
    {
      key: "lead_source",
      label: "Source",
      render: (r) => <div className="py-0.5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium uppercase tracking-wider">{r.lead_source || "-"}</span></div>
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <div className="py-0.5"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">{r.status || "-"}</span></div>
    },
    {
      key: "is_converted",
      label: "Converted",
      render: (r) => r.is_converted ?
        <span className="text-emerald-600 font-bold text-sm py-0.5 block">✓</span> :
        <span className="text-slate-300 text-xs py-0.5 block">-</span>
    },
    ...(userRole?.name !== "sales"
      ? [{
        key: "assign_to",
        label: (
          <div className="leading-tight">
            <div>Assign</div>
            <div>To</div>
          </div>
        ),
        render: (r) => (
          <div className="py-0.5 text-center leading-tight">
            <span className="text-slate-800 font-medium text-xs block whitespace-nowrap">
              {r.assigned_executive_details?.full_name || r.assigned_executive_details?.first_name || "-"}
            </span>
            {r.assigned_executive_details?.email && (
              <span className="text-slate-500 text-[10px] block whitespace-nowrap mt-0.5">
                {r.assigned_executive_details.email}
              </span>
            )}
          </div>
        )
      }]
      : [])
  ];

  const actionsRenderer = useCallback((row) => (
    <div className="flex items-center justify-center gap-1 py-0.5">
      {/* Record Viewer Button */}
      <button
        onClick={() => {
          setSelectedLead(row);
          setViewOpen(true);
        }}
        className="p-1 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded transition-all duration-150 text-sm shadow-sm"
        title="View Full Record"
      >
        <MdZoomIn />
      </button>

      {/* Lead Details Button */}
      <button
        onClick={() => {
          setLeadDetailsId(row.id);
          setShowLeadDetails(true);
        }}
        className="p-1 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded transition-all duration-150 text-sm shadow-sm"
        title="View Profile Details"
      >
        <MdOutlineRemoveRedEye />
      </button>

      <button
        onClick={() => {
          setFollowUpLeadId(row.id);
          setShowLeadFollowUp(true);
        }}
        className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded transition-all duration-150 text-sm shadow-sm"
        title="Follow-up Log"
      >
        <MdEditDocument />
      </button>

      {!row.is_converted && (
        <button
          onClick={() => handleConvertToCustomer(row.id)}
          className="p-1 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded transition-all duration-150 flex items-center justify-center text-sm shadow-sm"
          title="Convert to Customer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
            <line x1="12" y1="11" x2="12" y2="15"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
        </button>
      )}

      {row.is_converted && (
        <span className="text-emerald-600 text-xs font-bold" title="Already converted to customer">✓</span>
      )}

      <button
        onClick={() => {
          setQuotationLeadData(row);
          setShowQuotationForm(true);
        }}
        className="p-1 bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 rounded transition-all duration-150 text-sm shadow-sm"
        title="Create New Quotation"
      >
        <MdAdd />
      </button>

      {canEditLead && (
        <button
          onClick={() => { setEditingLead(row); setShowLeadForm(true); }}
          className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="Edit Record"
        >
          <MdEdit />
        </button>
      )}

      {canDeleteLead && (
        <button
          onClick={() => handleDelete(row.id)}
          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="Delete Record"
        >
          <MdDelete />
        </button>
      )}
    </div>
  ), [handleDelete, handleConvertToCustomer, canEditLead, canDeleteLead]);

  const currentPageData = getCurrentPageData();

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">

        {/* HEADER BLOCK WITH THE BLUE VERTICAL ACCENT LINE */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Enquiry Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Synchronizing pipeline records..." : `Total ${totalCount} records identified across channels`}
              </p>
            </div>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <MdFilterList className="text-slate-400" />
              Filter
            </button>
            {canCreateLead && (
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Import Leads from Excel or CSV"
              >
                <MdUpload className="text-blue-600 text-sm" />
                Import
              </button>
            )}
            {canCreateLead && (
              <button
                onClick={() => { setEditingLead(null); setShowLeadForm(true); }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add Enquiry
              </button>
            )}
          </div>
        </div>

        {/* COMPACT DATA TABLE COMPONENT */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <TableView
            columns={columns}
            rows={currentPageData}
            loading={loading}
            error={error}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            pageSize={itemsPerPage}
            actions={actionsRenderer}
            emptyMessage="No enquiry records matches the active criteria filters"
            rowClassName={getRowClassName}
          />
        </div>
      </div>

      {/* FILTER DRAWER - PORTAL TO BODY PREVENTS LAYOUT PUSH AND WHITE BOTTOM STRIP */}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {isFilterOpen && (
              <div
                className="fixed inset-0 w-screen h-screen bg-black/40 z-[9999]"
                onClick={() => setIsFilterOpen(false)}
              />
            )}

            <div
              className={`fixed top-0 right-0 h-screen w-full max-w-[380px] sm:w-[380px] bg-white shadow-2xl z-[10000] flex flex-col transition-transform duration-300 ease-in-out ${
                isFilterOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
                <h3 className="text-lg font-bold text-slate-900">Filters</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1 cursor-pointer"
                >
                  ×
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                <AdvancedTableFilter
                  data={allRows}
                  onFilter={setFilteredData}
                  setItemsPerPage={setItemsPerPage}
                  columns={columns}
                />
              </div>
            </div>
          </>,
          document.body
        )}

      {/* RECORD VIEWER - Slides in from right */}
      <RecordViewer
        isOpen={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setSelectedLead(null);
        }}
        record={selectedLead}
        title="Lead Details"
      />

      <AddLeadForm
        open={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        baseApi={BASE_API}
        token={token}
        lead={editingLead}
        onSuccess={() => {
          fetchData();
          setShowLeadForm(false);
          setEditingLead(null);
        }}
      />

      <LeadDetails
        open={showLeadDetails}
        onClose={() => setShowLeadDetails(false)}
        leadId={leadDetailsId}
        baseApi={BASE_API}
        token={token}
      />

      <AddLeadFollowUpForm
        open={showLeadFollowUp}
        onClose={() => setShowLeadFollowUp(false)}
        baseApi={BASE_API}
        token={token}
        leadId={followUpLeadId}
        onSuccess={() => {
          fetchData();
          setShowLeadFollowUp(false);
          setFollowUpLeadId(null);
        }}
      />

      {showQuotationForm && (
        <AddQuotation
          leadData={quotationLeadData}
          onBack={() => {
            setShowQuotationForm(false);
            setQuotationLeadData(null);
            fetchData();
          }}
        />
      )}

      <ImportLeadModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchData}
        baseApi={BASE_API}
        token={token}
      />
    </Base>
  );
}