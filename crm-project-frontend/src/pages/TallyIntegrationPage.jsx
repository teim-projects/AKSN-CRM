import React, { useState, useEffect, useCallback, useMemo } from "react";
import Base from "../components/Base";
import TableView from "../components/TableView";
import TallyInvoiceDetailModal from "../components/tally/TallyInvoiceDetailModal";
import TallyPairingModal from "../components/tally/TallyPairingModal";
import TallySyncModal from "../components/tally/TallySyncModal";
import Swal from "sweetalert2";
import {
  MdOutlineRemoveRedEye,
  MdZoomIn,
  MdSync,
  MdFilterList,
  MdCloudDownload,
  MdLink,
  MdLinkOff,
  MdCheckCircle,
  MdErrorOutline,
} from "react-icons/md";

export default function TallyIntegrationPage() {
  const [activeTab, setActiveTab] = useState("invoices"); // "invoices" | "connection" | "history"
  const [statusData, setStatusData] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoicePage, setInvoicePage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [voucherTypeFilter, setVoucherTypeFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Company selection state
  const [selectedCompany, setSelectedCompany] = useState("");
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Sync History state
  const [syncHistory, setSyncHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistory, setTotalHistory] = useState(0);

  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = localStorage.getItem("access") || localStorage.getItem("token");

  // 1. Fetch Tally Status
  const fetchStatus = useCallback(() => {
    setIsLoadingStatus(true);
    fetch(`${baseApi}/api/tally/status/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load status");
        return res.json();
      })
      .then((data) => {
        setStatusData(data);
        const validCompanies = (data.available_companies || []).map((c) => c.name);
        if (data.tally_company_name && validCompanies.includes(data.tally_company_name)) {
          setSelectedCompany(data.tally_company_name);
        } else if (validCompanies.length > 0) {
          setSelectedCompany(validCompanies[0]);
        } else {
          setSelectedCompany(data.tally_company_name || "");
        }
      })
      .catch((err) => {
        console.error("Error fetching status:", err);
      })
      .finally(() => {
        setIsLoadingStatus(false);
      });
  }, [baseApi, token]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // 2. Fetch Invoices
  const fetchInvoices = useCallback(() => {
    setIsLoadingInvoices(true);
    let url = `${baseApi}/api/tally/invoices/?page=${invoicePage}&page_size=${itemsPerPage}`;
    if (invoiceSearch.trim()) url += `&search=${encodeURIComponent(invoiceSearch.trim())}`;
    if (voucherTypeFilter) url += `&voucher_type=${encodeURIComponent(voucherTypeFilter)}`;
    if (startDateFilter) url += `&start_date=${encodeURIComponent(startDateFilter)}`;
    if (endDateFilter) url += `&end_date=${encodeURIComponent(endDateFilter)}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data.results || []);
        setTotalInvoices(data.count || 0);
      })
      .catch((err) => {
        console.error("Error fetching invoices:", err);
      })
      .finally(() => {
        setIsLoadingInvoices(false);
      });
  }, [baseApi, token, invoicePage, itemsPerPage, invoiceSearch, voucherTypeFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    if (activeTab === "invoices") {
      fetchInvoices();
    }
  }, [activeTab, fetchInvoices]);

  // 3. Fetch Sync History
  const fetchHistory = useCallback(() => {
    setIsLoadingHistory(true);
    fetch(`${baseApi}/api/tally/sync-history/?page=${historyPage}&page_size=${itemsPerPage}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setSyncHistory(data.results || []);
        setTotalHistory(data.count || 0);
      })
      .catch((err) => {
        console.error("Error fetching sync history:", err);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [baseApi, token, historyPage, itemsPerPage]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Manual Trigger: Sync Now (supports full sync or specific date range)
  const handleSyncNow = async (dateRange = {}) => {
    const { fromDate, toDate } = dateRange;
    setIsSyncing(true);
    try {
      const res = await fetch(`${baseApi}/api/tally/sync-now/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_date: fromDate || null,
          to_date: toDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger sync");
      }

      setIsSyncModalOpen(false);

      Swal.fire({
        icon: "success",
        title: "Sync Command Queued",
        text: data.message || "Manual sync command queued for connector",
        timer: 2500,
        showConfirmButton: false,
      });

      setTimeout(() => {
        fetchStatus();
        if (activeTab === "invoices") fetchInvoices();
        if (activeTab === "history") fetchHistory();
      }, 3000);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Sync Error",
        text: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Change selected company
  const handleSelectCompany = async (compName) => {
    setIsSavingCompany(true);
    const compObj = statusData?.available_companies?.find((c) => c.name === compName);
    const identifier = compObj?.identifier || compName;

    try {
      const res = await fetch(`${baseApi}/api/tally/select-company/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: compName,
          company_identifier: identifier,
        }),
      });
      if (!res.ok) throw new Error("Failed to change company");

      Swal.fire({
        icon: "success",
        text: `Company switched to "${compName}"`,
        timer: 1500,
        showConfirmButton: false,
      });
      fetchStatus();
    } catch (err) {
      Swal.fire({ icon: "error", text: err.message });
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    const result = await Swal.fire({
      title: "Disconnect Tally Connector?",
      text: "This will revoke the connector authentication token and set status to disconnected.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Disconnect",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${baseApi}/api/tally/disconnect/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to disconnect");

      Swal.fire({
        icon: "success",
        text: "Tally connector disconnected",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchStatus();
    } catch (err) {
      Swal.fire({ icon: "error", text: err.message });
    }
  };

  // Clear test demo data
  const handleClearTestData = async () => {
    const result = await Swal.fire({
      title: "Clear Test Invoices?",
      text: "This will remove the sample test invoices and reset the count to 0.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Clear",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      const resp = await fetch(`${baseApi}/api/tally/clear-test-data/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await resp.json();
      Swal.fire({ icon: "success", text: data.message, timer: 1500, showConfirmButton: false });
      fetchStatus();
      fetchInvoices();
      fetchHistory();
    } catch (err) {
      Swal.fire({ icon: "error", text: err.message });
    }
  };

  // View full invoice detail
  const handleViewInvoice = async (invoiceId) => {
    try {
      const res = await fetch(`${baseApi}/api/tally/invoices/${invoiceId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load invoice");
      const data = await res.json();
      setSelectedInvoice(data);
      setIsDetailModalOpen(true);
    } catch (err) {
      Swal.fire({ icon: "error", text: err.message });
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return "Never";
    try {
      return new Date(dtStr).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dtStr;
    }
  };

  const isConnected = statusData?.status === "connected";
  const isOffline = statusData?.status === "offline";
  const isDisconnected = !isConnected && !isOffline;
  const isPaired = Boolean(statusData?.is_paired || (statusData?.connector_name && statusData?.last_connected_at));

  // ==========================================
  // TableView Columns Configuration (Invoices)
  // ==========================================
  const invoiceColumns = useMemo(
    () => [
      {
        key: "sr_no",
        label: "Sr.No",
        render: (_, idx) => (
          <span className="text-slate-500 font-medium text-xs">
            {idx + 1 + (invoicePage - 1) * itemsPerPage}
          </span>
        ),
        className: "w-12 text-center",
      },
      {
        key: "voucher_number",
        label: "Invoice No",
        render: (r) => (
          <span className="font-semibold text-slate-900 text-xs font-mono block">
            {r.voucher_number || "—"}
          </span>
        ),
        className: "whitespace-nowrap font-medium",
      },
      {
        key: "date",
        label: "Date",
        render: (r) => (
          <span className="text-slate-700 text-xs font-medium whitespace-nowrap block">
            {formatDate(r.date)}
          </span>
        ),
        className: "whitespace-nowrap",
      },
      {
        key: "party_name",
        label: "Tally Party Name",
        render: (r) => (
          <div>
            <span
              className="text-slate-800 font-medium text-xs block max-w-[200px] truncate"
              title={r.party_name || ""}
            >
              {r.party_name || "—"}
            </span>
            <span className="text-[10px] text-amber-600 font-medium block">
              Tally Ledger (Unmapped)
            </span>
          </div>
        ),
        className: "min-w-[150px] max-w-[220px]",
      },
      {
        key: "gstin",
        label: "GSTIN",
        render: (r) => (
          <span className="text-slate-600 font-mono text-xs block whitespace-nowrap">
            {r.gstin || "—"}
          </span>
        ),
        className: "whitespace-nowrap",
      },
      {
        key: "voucher_type",
        label: "Voucher Type",
        render: (r) => (
          <div>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap inline-block">
              {r.voucher_type || "Sales"}
            </span>
          </div>
        ),
        className: "whitespace-nowrap text-center",
      },
      {
        key: "items_count",
        label: "Items",
        render: (r) => (
          <span className="text-slate-700 font-semibold text-xs block text-center">
            {r.items_count || 0}
          </span>
        ),
        className: "text-center w-14",
      },
      {
        key: "total_amount",
        label: "Total Amount",
        render: (r) => (
          <span className="text-slate-900 font-bold text-xs font-mono block text-right whitespace-nowrap">
            {formatCurrency(r.total_amount)}
          </span>
        ),
        className: "text-right whitespace-nowrap",
      },
      {
        key: "sync_status",
        label: "Sync Status",
        render: () => (
          <div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap inline-block">
              Synced
            </span>
          </div>
        ),
        className: "whitespace-nowrap text-center",
      },
    ],
    [invoicePage, itemsPerPage]
  );

  // TableView Action buttons - Exactly styled like in Lead.jsx
  const invoiceActionsRenderer = useCallback(
    (row) => (
      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
        <button
          onClick={() => handleViewInvoice(row.id)}
          className="p-1 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="View Full Invoice Details"
        >
          <MdZoomIn />
        </button>
        <button
          onClick={() => handleViewInvoice(row.id)}
          className="p-1 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="View Line Items"
        >
          <MdOutlineRemoveRedEye />
        </button>
      </div>
    ),
    []
  );

  // ==========================================
  // TableView Columns Configuration (Sync History)
  // ==========================================
  const historyColumns = useMemo(
    () => [
      {
        key: "sr_no",
        label: "Sr.No",
        render: (_, idx) => (
          <span className="text-slate-500 font-medium text-xs">
            {idx + 1 + (historyPage - 1) * itemsPerPage}
          </span>
        ),
        className: "w-12 text-center",
      },
      {
        key: "started_at",
        label: "Started At",
        render: (r) => (
          <span className="text-slate-800 text-xs font-medium whitespace-nowrap block">
            {formatDateTime(r.started_at)}
          </span>
        ),
        className: "whitespace-nowrap",
      },
      {
        key: "sync_type",
        label: "Sync Mode",
        render: (r) => (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap inline-block">
            {r.sync_type}
          </span>
        ),
        className: "whitespace-nowrap text-center",
      },
      {
        key: "status",
        label: "Status",
        render: (r) => {
          const isSuccess = r.status === "success";
          const isPartial = r.status === "partial";
          return (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap inline-block ${
                isSuccess
                  ? "bg-emerald-50 text-emerald-600"
                  : isPartial
                  ? "bg-amber-50 text-amber-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {isSuccess ? "✓ Success" : isPartial ? "Partial" : "Failed"}
            </span>
          );
        },
        className: "whitespace-nowrap text-center",
      },
      {
        key: "records_processed",
        label: "Processed",
        render: (r) => (
          <span className="text-slate-700 font-bold text-xs block text-center">
            {r.records_processed}
          </span>
        ),
        className: "text-center w-16",
      },
      {
        key: "records_created",
        label: "Created",
        render: (r) => (
          <span className="text-emerald-600 font-bold text-xs block text-center">
            +{r.records_created}
          </span>
        ),
        className: "text-center w-16",
      },
      {
        key: "records_updated",
        label: "Updated",
        render: (r) => (
          <span className="text-blue-600 font-bold text-xs block text-center">
            {r.records_updated}
          </span>
        ),
        className: "text-center w-16",
      },
      {
        key: "records_failed",
        label: "Failed",
        render: (r) => (
          <span className="text-rose-600 font-bold text-xs block text-center">
            {r.records_failed}
          </span>
        ),
        className: "text-center w-16",
      },
      {
        key: "error_details",
        label: "Details",
        render: (r) => (
          <span
            className="text-slate-500 text-xs block max-w-[220px] truncate"
            title={r.error_details || "Completed smoothly"}
          >
            {r.error_details || "Completed smoothly"}
          </span>
        ),
        className: "max-w-[220px]",
      },
    ],
    [historyPage, itemsPerPage]
  );

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">
        {/* ========================================================================= */}
        {/* HEADER BLOCK WITH THE BLUE VERTICAL ACCENT LINE (EXACT LEAD PAGE STYLE) */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                  TallyPrime Integration
                </h1>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                  Phase 1
                </span>
                {isConnected ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                ) : isOffline ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Tally Offline
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLoadingInvoices
                  ? "Synchronizing pipeline records..."
                  : `Total ${totalInvoices} vouchers retrieved from TallyPrime (isolated storage)`}
              </p>
            </div>
          </div>

          {/* Action Buttons in Header - Formatted identically to Lead.jsx */}
          <div className="mt-3 md:mt-0 flex items-center gap-2 sm:gap-3">
            {/* Sync Now Button */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              disabled={isSyncing}
              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Synchronize invoices from Tally (All or Date Range)"
            >
              <MdSync className={`text-slate-500 text-sm ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </button>

            {/* Connect / Pairing Button */}
            {isDisconnected ? (
              <button
                onClick={() => setIsPairingModalOpen(true)}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Connect Tally
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                title="Disconnect Tally connector"
              >
                <MdLinkOff className="text-sm" />
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-NAVIGATION TABS (MATCHING FILTER BUTTONS STYLE) */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("invoices")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "invoices"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/10"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Tally Invoices ({totalInvoices})
            </button>

            <button
              onClick={() => setActiveTab("connection")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "connection"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/10"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Connection & Setup
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "history"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/10"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Sync History
            </button>
          </div>

          {/* Quick Search & Filter when on Invoices Tab */}
          {activeTab === "invoices" && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                placeholder="Search invoice or party..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchInvoices()}
                className="w-44 sm:w-48 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
              />
              <select
                value={voucherTypeFilter}
                onChange={(e) => {
                  setVoucherTypeFilter(e.target.value);
                  setInvoicePage(1);
                }}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-700"
              >
                <option value="">All Types</option>
                <option value="Sales">Sales</option>
              </select>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600">
                <span className="text-[10.5px] text-slate-400 font-medium">From:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="text-xs border-0 p-0 focus:ring-0 text-slate-700 bg-transparent"
                />
                <span className="text-[10.5px] text-slate-400 font-medium ml-1">To:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="text-xs border-0 p-0 focus:ring-0 text-slate-700 bg-transparent"
                />
                {(startDateFilter || endDateFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                      setInvoicePage(1);
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 px-1 cursor-pointer font-bold"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: INVOICES (REUSING COMPACT DATA TABLE COMPONENT TableView) */}
        {/* ========================================================================= */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <TableView
              columns={invoiceColumns}
              rows={invoices}
              loading={isLoadingInvoices}
              page={invoicePage}
              totalPages={Math.ceil(totalInvoices / itemsPerPage) || 1}
              onPageChange={(p) => setInvoicePage(p)}
              pageSize={itemsPerPage}
              actions={invoiceActionsRenderer}
              emptyMessage="No Tally invoice records found. Click 'Sync Now' or pair your Windows connector."
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CONNECTION & SETUP */}
        {/* ========================================================================= */}
        {activeTab === "connection" && (
          <div className="space-y-4">
            {/* Status overview card */}
            <div className="border border-slate-200/80 rounded-xl p-5 bg-white shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Windows Connector Status
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Local bridge between TallyPrime on port 9000 and CRM cloud server
                  </p>
                </div>
                <div>
                  {isDisconnected && !isPaired ? (
                    <button
                      onClick={() => setIsPairingModalOpen(true)}
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
                    >
                      <span>+</span> Connect Tally
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Device:</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                        {statusData?.connector_name || "Windows PC"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status banner */}
              {isOffline && statusData?.last_error && (
                <div className="border border-amber-200 rounded-lg p-3 bg-amber-50 text-amber-800 text-xs flex items-start gap-2">
                  <MdErrorOutline className="text-base text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">Tally Connection Notice:</span>
                    <span>{statusData.last_error}</span>
                  </div>
                </div>
              )}

              {isDisconnected && isPaired && (
                <div className="border border-rose-200 rounded-lg p-3 bg-rose-50 text-rose-800 text-xs flex items-start gap-2">
                  <MdErrorOutline className="text-base text-rose-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">Connector Process Notice:</span>
                    <span>{statusData?.last_error || "Windows connector is not running. Please launch TallyConnector.exe on your Windows PC to resume synchronization."}</span>
                  </div>
                </div>
              )}

              {/* Attributes grid */}
              {(!isDisconnected || isPaired) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-lg">
                    <span className="text-slate-500 block">Tally Version:</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {statusData?.tally_version || "TallyPrime"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-lg">
                    <span className="text-slate-500 block">Active Company:</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {statusData?.tally_company_name || "None Selected"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-lg">
                    <span className="text-slate-500 block">Last Connected:</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {formatDateTime(statusData?.last_connected_at)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-lg">
                    <span className="text-slate-500 block">Last Synchronized:</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {formatDateTime(statusData?.last_sync_at)}
                    </span>
                  </div>
                </div>
              )}

              {/* Company Selection form */}
              {!isDisconnected && statusData?.available_companies?.length > 0 && (
                <div className="p-3.5 bg-slate-50/50 border border-slate-200/80 rounded-lg space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Select Tally Company to Synchronize:
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                      >
                        {statusData.available_companies.map((c, i) => (
                          <option key={c.identifier || i} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSelectCompany(selectedCompany)}
                        disabled={isSavingCompany || selectedCompany === statusData?.tally_company_name}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
                      >
                        {isSavingCompany ? "Saving..." : "Apply"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Setup Guide & Download Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200/80 rounded-xl p-5 bg-white shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-600 rounded-full block"></span>
                  <h4 className="text-sm font-bold text-slate-900">Windows Connector Setup</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The connector is a lightweight Windows bridge that communicates with TallyPrime locally (port 9000) and syncs data to CRM over secure HTTPS.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={`${baseApi}/api/tally/download-connector/?format=exe`}
                    download="TallyConnector.exe"
                    className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                    title="Standalone Windows executable - No Python needed!"
                  >
                    <MdCloudDownload className="text-sm" />
                    Download TallyConnector.exe
                  </a>
                  <button
                    onClick={() => setIsPairingModalOpen(true)}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                  >
                    Pairing Code
                  </button>
                </div>
              </div>

              <div className="border border-slate-200/80 rounded-xl p-5 bg-white shadow-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-5 bg-emerald-600 rounded-full block"></span>
                  <h4 className="text-sm font-bold text-slate-900">Phase 1 Isolation Guarantees</h4>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Customer Records:</strong> No customer records are overwritten or linked.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Invoice Records:</strong> Stored independently from CRM Quotations.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Duplicate Prevention:</strong> Uniquely keyed by Tally GUID + AlterID.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SYNC HISTORY (REUSING COMPACT DATA TABLE COMPONENT TableView) */}
        {/* ========================================================================= */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <TableView
              columns={historyColumns}
              rows={syncHistory}
              loading={isLoadingHistory}
              page={historyPage}
              totalPages={Math.ceil(totalHistory / itemsPerPage) || 1}
              onPageChange={(p) => setHistoryPage(p)}
              pageSize={itemsPerPage}
              emptyMessage="No synchronization history recorded yet."
            />
          </div>
        )}

        {/* Tally Sync Modal (Full or Date Range) */}
        <TallySyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onConfirmSync={handleSyncNow}
          isSyncing={isSyncing}
        />

        {/* Invoice Detail Modal */}
        <TallyInvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />

        {/* Pairing Modal */}
        <TallyPairingModal
          isOpen={isPairingModalOpen}
          onClose={() => setIsPairingModalOpen(false)}
          baseApi={baseApi}
          onPairedSuccess={(newData) => {
            setStatusData(newData);
            setIsPairingModalOpen(false);
            Swal.fire({
              icon: "success",
              text: "Connector paired successfully!",
              timer: 1500,
              showConfirmButton: false,
            });
          }}
        />
      </div>
    </Base>
  );
}
