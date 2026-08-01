import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../../components/Base";
import TableView from "../../components/TableView";
import { MdAdd, MdFilterList } from "react-icons/md";
import AddLeadFollowUpForm from "./AddLeadFollowUpForm";
import AdvancedTableFilter from "../AdvancedTableFilter";
import { useUserRole } from "../../hooks/useAuth";

export default function FollowUp() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API}/lead/lead/`;
  const FOLLOWUP_API_URL = `${BASE_API}/lead/lead-followups/`;

  const { hasPermission } = useUserRole(BASE_API);
  const canCreateFollowup = hasPermission("followups", "create");

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Quick Filter state
  const [filterType, setFilterType] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Advanced Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total_followups: 0,
    today_followups: 0,
    overdue_followups: 0,
    completed_followups: 0,
  });

  // Follow-up form states
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [leadSearchTerm, setLeadSearchTerm] = useState("");
  const [leadSearchResults, setLeadSearchResults] = useState([]);
  const [searchingLeads, setSearchingLeads] = useState(false);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const fetchDataAndStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = getTodayString();

      const [leadRes, followupRes] = await Promise.all([
        fetch(`${API_URL}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }),
        fetch(`${FOLLOWUP_API_URL}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        })
      ]);

      if (!leadRes.ok || !followupRes.ok) {
        throw new Error("Failed to fetch leads or follow-ups data");
      }

      const leadData = await leadRes.json();
      const followupData = await followupRes.json();

      const leads = Array.isArray(leadData.results) ? leadData.results : Array.isArray(leadData) ? leadData : [];
      const followups = Array.isArray(followupData.results) ? followupData.results : Array.isArray(followupData) ? followupData : [];

      // Enrich every lead with its specific follow-ups and calculated scheduled date
      const enrichedLeads = leads.map((lead) => {
        const leadFollowups = followups.filter((f) => f.lead === lead.id);
        const latestFollowup = leadFollowups.length > 0 ? leadFollowups[leadFollowups.length - 1] : null;
        
        let effectiveFollowupDate = lead.followup_date || null;
        if (latestFollowup) {
          effectiveFollowupDate = latestFollowup.next_followup_date || null;
        }

        let lastFollowupDate = lead.last_followup_date || (latestFollowup ? latestFollowup.followup_date : null);

        return {
          ...lead,
          effective_followup_date: effectiveFollowupDate,
          last_followup_date: lastFollowupDate,
          followup_count: leadFollowups.length,
          latest_followup: latestFollowup,
          followups: leadFollowups,
        };
      });

      setAllRows(enrichedLeads);
      setFilteredData(enrichedLeads);
      setRows(enrichedLeads);

      // Calculate overall statistics
      const isNotClosed = (status) => status !== "close_win" && status !== "close_loss" && status !== "closed";
      const totalFollowupsCount = followups.length;
      const todayCount = enrichedLeads.filter((l) => {
        return l.effective_followup_date === today && isNotClosed(l.status);
      }).length;
      const overdueCount = enrichedLeads.filter((l) => {
        return l.effective_followup_date && l.effective_followup_date < today && isNotClosed(l.status);
      }).length;
      const completedCount = enrichedLeads.filter((l) => !isNotClosed(l.status)).length;

      setStats({
        total_followups: totalFollowupsCount,
        today_followups: todayCount,
        overdue_followups: overdueCount,
        completed_followups: completedCount,
      });

      setTotalCount(enrichedLeads.length);
      setTotalPages(Math.max(1, Math.ceil(enrichedLeads.length / itemsPerPage)));
      setCurrentPage(1);
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
  }, [token, API_URL, FOLLOWUP_API_URL, itemsPerPage]);

  useEffect(() => {
    fetchDataAndStats();
  }, [fetchDataAndStats]);

  // Apply quick filter
  const applyQuickFilter = useCallback(() => {
    const today = getTodayString();
    let filtered = allRows;

    switch(filterType) {
      case "today":
        filtered = allRows.filter((l) => l.effective_followup_date === today && l.status !== "closed");
        break;
      case "overdue":
        filtered = allRows.filter((l) => l.effective_followup_date && l.effective_followup_date < today && l.status !== "closed");
        break;
      case "completed":
        filtered = allRows.filter((l) => l.status === "closed");
        break;
      default:
        filtered = allRows;
    }

    setFilteredData(filtered);
  }, [allRows, filterType]);

  useEffect(() => {
    applyQuickFilter();
  }, [applyQuickFilter]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setRows(filteredData);
    setTotalCount(filteredData.length);
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
    setCurrentPage(1);
  }, [filteredData, itemsPerPage]);

  // Get current page data
  const getCurrentPageData = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return rows.slice(startIndex, startIndex + itemsPerPage);
  }, [rows, currentPage, itemsPerPage]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getRowClassName = (lead) => {
    if (lead.status === "close_win" || lead.status === "close_loss" || lead.status === "closed") return "";
    
    const targetDate = lead.effective_followup_date;
    if (!targetDate) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followupDate = new Date(targetDate);
    followupDate.setHours(0, 0, 0, 0);

    if (followupDate.getTime() === today.getTime()) return "bg-yellow-100";
    if (followupDate < today) return "bg-red-100";
    return "";
  };

  const searchLeads = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setLeadSearchResults([]);
      return;
    }

    setSearchingLeads(true);
    try {
      const res = await fetch(`${API_URL}?search=${searchTerm}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setLeadSearchResults(results);
      }
    } catch (err) {
      console.error("Error searching leads:", err);
    } finally {
      setSearchingLeads(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (leadSearchTerm) {
        searchLeads(leadSearchTerm);
      } else {
        setLeadSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [leadSearchTerm]);

  // Quick filter options
  const filterOptions = [
    { value: "all", label: "All Records" },
    { value: "today", label: "Today's Follow-ups" },
    { value: "overdue", label: "Overdue Follow-ups" },
    { value: "completed", label: "Completed Follow-ups" },
  ];

  const currentFilterLabel = filterOptions.find(f => f.value === filterType)?.label || "All Records";

  const columns = [
    { 
      key: "sr", 
      label: "#", 
      render: (_, idx) => <span className="text-slate-400 font-medium text-[10px] py-0.5 block">{(currentPage - 1) * itemsPerPage + (idx + 1)}</span>,
      className: "w-8 text-center"
    },
    { 
      key: "company_name", 
      label: "Company Name", 
      render: (r) => <span className="text-slate-800 font-medium text-xs">{r.company_name || "-"}</span>,
      className: "min-w-[120px]"
    },
    { 
      key: "contact_person", 
      label: "Contact Person", 
      render: (r) => <span className="text-slate-600 text-xs">{r.contact_person || "-"}</span>,
      className: "w-32"
    },
    { 
      key: "mobile_number", 
      label: "Mobile", 
      render: (r) => <span className="text-slate-700 text-xs font-medium">{r.mobile_number || "-"}</span>,
      className: "w-28"
    },
    { 
      key: "last_followup_date", 
      label: "Follow-up Date", 
      render: (r) => (
        <span className="text-xs font-semibold text-slate-700">
          {formatDate(r.last_followup_date)}
        </span>
      ),
      className: "w-28"
    },
    { 
      key: "followup_date", 
      label: "Next Follow-up Date", 
      render: (r) => {
        const today = getTodayString();
        const isOverdue = r.effective_followup_date && r.effective_followup_date < today && r.status !== 'close_win' && r.status !== 'close_loss' && r.status !== 'closed';
        const isToday = r.effective_followup_date === today && r.status !== 'close_win' && r.status !== 'close_loss' && r.status !== 'closed';
        return (
          <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 font-bold' : isToday ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
            {formatDate(r.effective_followup_date)}
          </span>
        );
      },
      className: "w-28"
    },
    { 
      key: "followup_count", 
      label: "Total Follow-ups", 
      render: (r) => (
        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
          {r.followup_count || 0}
        </span>
      ),
      className: "w-28"
    },
    { 
      key: "status", 
      label: "Status", 
      render: (r) => {
        const s = r.status || "open";
        const label = s === 'close_win' ? 'Close Win' : s === 'close_loss' ? 'Close Loss' : s === 'closed' ? 'Closed' : s === 'in_process' ? 'In Process' : 'Open';
        const colorClass = s === 'close_win' || s === 'closed' ? 'bg-emerald-100 text-emerald-700' : s === 'close_loss' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700';
        return (
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${colorClass}`}>
            {label}
          </span>
        );
      },
      className: "w-24"
    },
  ];

  const actionsRenderer = useCallback((row) => (
    <div className="flex items-center justify-center gap-1 py-0.5">
      {canCreateFollowup && (
        <button
          onClick={() => {
            setSelectedLeadId(row.id);
            setEditingFollowUp(null);
            setShowFollowUpForm(true);
          }}
          className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="Add Follow-up"
        >
          <MdAdd />
        </button>
      )}
    </div>
  ), [canCreateFollowup]);

  // Lead Selector Modal
  const LeadSelectorModal = ({ open, onClose, onSelect }) => {
    if (!open) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-start sm:items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col relative overflow-hidden">
          <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-6 py-5 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Select Lead</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 font-bold transition-colors text-lg p-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-5 overflow-y-auto flex-1 bg-white">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by company name, contact, or mobile..."
                value={leadSearchTerm}
                onChange={(e) => setLeadSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50/50"
                autoFocus
              />
            </div>

            {searchingLeads ? (
              <div className="text-center py-8 text-slate-400 text-sm">Searching...</div>
            ) : leadSearchResults.length > 0 ? (
              <div className="space-y-2">
                {leadSearchResults.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      onSelect(lead.id);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex justify-between items-center"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{lead.company_name || "No Company"}</div>
                      <div className="text-xs text-slate-500">{lead.contact_person || "No Contact"} · {lead.mobile_number || "No Mobile"}</div>
                    </div>
                    <span className="text-xs text-slate-400">#{lead.id}</span>
                  </button>
                ))}
              </div>
            ) : leadSearchTerm.length >= 2 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No leads found</div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">Type at least 2 characters to search</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const formatNumber = (num) => String(num).padStart(2, '0');

  const currentPageData = getCurrentPageData();

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 -mt-5 px-1">
        {/* HEADER BLOCK WITH THE BLUE VERTICAL ACCENT LINE */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Follow-up Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Synchronizing pipeline records..." : `${totalCount} leads found`}
              </p>
            </div>
          </div>
          
          <div className="mt-3 md:mt-0 flex items-center gap-3">
            {/* Quick Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <MdFilterList className="text-slate-400" />
                {currentFilterLabel}
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterType(option.value);
                        setShowFilterDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors ${
                        filterType === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {option.label}
                      {filterType === option.value && (
                        <span className="float-right text-blue-600">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced Filter Button */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <MdFilterList className="text-slate-400" />
              Filter
            </button>

            {canCreateFollowup && (
              <button
                onClick={() => {
                  setShowLeadSelector(true);
                  setLeadSearchTerm("");
                  setLeadSearchResults([]);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <MdAdd className="text-sm" />
                Add Follow-up
              </button>
            )}
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
            <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total_followups)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Total Follow-ups</p>
            <p className="text-[10px] text-slate-400 mt-1">All records</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
            <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats.today_followups)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Today's Follow-ups</p>
            <p className="text-[10px] text-slate-400 mt-1">Scheduled for today</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
            <p className="text-2xl font-bold text-red-600">{formatNumber(stats.overdue_followups)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Overdue</p>
            <p className="text-[10px] text-slate-400 mt-1">Past due date</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
            <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats.completed_followups)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Completed</p>
            <p className="text-[10px] text-slate-400 mt-1">Done this cycle</p>
          </div>
        </div>

        {/* DATA TABLE COMPONENT */}
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
            emptyMessage="No leads found"
            rowClassName={getRowClassName}
          />
        </div>

        {/* ADVANCED FILTER DRAWER - DARK OVERLAY WITHOUT BLUR */}
        {isFilterOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-[999]" 
            onClick={() => setIsFilterOpen(false)} 
          />
        )}
        
        <div className={`fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-[1000] transition-transform duration-300 ease-in-out ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Advanced Filters</h3>
            <button 
              onClick={() => setIsFilterOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
            >
              ×
            </button>
          </div>
          <div className="p-5 overflow-y-auto h-[calc(100%-80px)]">
            <AdvancedTableFilter
              data={allRows}
              onFilter={setFilteredData}
              setItemsPerPage={setItemsPerPage}
              columns={columns}
            />
          </div>
        </div>

        {/* Add/Edit Follow-up Form */}
        <AddLeadFollowUpForm
          open={showFollowUpForm}
          onClose={() => {
            setShowFollowUpForm(false);
            setSelectedLeadId(null);
            setEditingFollowUp(null);
          }}
          baseApi={BASE_API}
          token={token}
          leadId={selectedLeadId}
          followup={editingFollowUp}
          onSuccess={() => {
            fetchDataAndStats();
            setShowFollowUpForm(false);
            setSelectedLeadId(null);
            setEditingFollowUp(null);
          }}
        />

        {/* Lead Selector Modal */}
        <LeadSelectorModal
          open={showLeadSelector}
          onClose={() => {
            setShowLeadSelector(false);
            setLeadSearchTerm("");
            setLeadSearchResults([]);
          }}
          onSelect={(leadId) => {
            setSelectedLeadId(leadId);
            setEditingFollowUp(null);
            setShowFollowUpForm(true);
          }}
        />
      </div>
    </Base>
  );
}