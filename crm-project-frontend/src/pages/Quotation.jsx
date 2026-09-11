import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import Base from "../components/Base";
import TableView from "../components/TableView";
import AddQuotation from "../components/quotations/AddQuotation";
import { MdAdd, MdFilterList, MdHistory, MdEdit, MdDelete, MdRemoveRedEye, MdDownload, MdEmail, MdTaskAlt, MdBlock } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import Swal from "sweetalert2";
import AdvancedTableFilter from "../components/AdvancedTableFilter";
import axios from "axios";
import { useUserRole } from '../hooks/useAuth';
import SendMessageModal from "../components/templates/SendMessageModal";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const normalize = (d) => (Array.isArray(d) ? d : d?.results || []);

export default function Quotation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useUserRole(BASE_API);
  const canCreateQuotation = hasPermission("quotations", "create");
  const canEditQuotation = hasPermission("quotations", "edit");
  const canDeleteQuotation = hasPermission("quotations", "delete");

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form modal state
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);

  // Send Message Modal state
  const [sendMessageModalOpen, setSendMessageModalOpen] = useState(false);
  const [selectedMessageRecord, setSelectedMessageRecord] = useState(null);
  const [messageChannel, setMessageChannel] = useState("email");

  // Quick Filter state
  const [filterType, setFilterType] = useState(searchParams.get("filter") || "all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f) {
      setFilterType(f);
    }
  }, [searchParams]);

  // Stats state
  const [stats, setStats] = useState({
    total_quotations: 0,
    total_versions: 0,
    dropped_quotations: 0,
    finalized_quotations: 0,
  });

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Version history expanded row state
  const [openRow, setOpenRow] = useState(null);

  // ✅ Version pagination state for each quotation
  const [versionPagination, setVersionPagination] = useState({});
  const VERSIONS_PER_PAGE = 5;

  const [highlightedQuotationId, setHighlightedQuotationId] = useState(null);

  // Highlight target quotation row and paginate when redirected from notification (without auto-opening form modal)
  useEffect(() => {
    const targetQuotationId =
      searchParams.get("quotationId") ||
      searchParams.get("id") ||
      searchParams.get("quotation_id") ||
      searchParams.get("highlight");

    if (targetQuotationId) {
      if (allRows.length > 0) {
        let itemIdx = -1;
        if (targetQuotationId === "latest") {
          itemIdx = 0;
        } else {
          const targetStr = String(targetQuotationId).toLowerCase().trim();
          itemIdx = allRows.findIndex(
            (r) =>
              String(r.id).toLowerCase().trim() === targetStr ||
              String(r.quotation_no || "").toLowerCase().trim() === targetStr ||
              String(r.quotation_number || "").toLowerCase().trim() === targetStr
          );
        }

        if (itemIdx !== -1 && allRows[itemIdx]) {
          const matchedItem = allRows[itemIdx];
          setHighlightedQuotationId(String(matchedItem.id));
          const pageNum = Math.floor(itemIdx / itemsPerPage) + 1;
          setCurrentPage(pageNum);
        } else {
          // Fallback to highlighting top quotation if specific ID wasn't matched
          setHighlightedQuotationId(String(allRows[0].id));
          setCurrentPage(1);
        }
      }
    }
  }, [searchParams, allRows, itemsPerPage]);

  // Clear highlight and remove query parameters when user clicks anywhere on screen
  useEffect(() => {
    if (!highlightedQuotationId) return;

    const handleScreenClick = () => {
      if (window._lastNotificationClickTime && Date.now() - window._lastNotificationClickTime < 600) {
        return;
      }
      setHighlightedQuotationId(null);
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
  }, [highlightedQuotationId]);

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

      const res = await api.get(`quotation/quotation/?limit=1000`);

      if (res.status < 200 || res.status >= 300) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const rawData = normalize(res.data);
      const data = rawData.map((q) => {
        const activeV = q.versions?.find((v) => v.is_active);
        const pNames = getProductNames(activeV);
        return {
          ...q,
          product: pNames !== "-" ? pNames : "",
          products: pNames !== "-" ? pNames : "",
        };
      });

      setAllRows(data);
      setFilteredData(data);
      setRows(data);

      // Calculate overall statistics
      const totalQuotationsCount = data.length;
      let totalVersionsCount = 0;
      let droppedCount = 0;
      let finalizedCount = 0;

      data.forEach((q) => {
        const versions = q.versions || [];
        totalVersionsCount += versions.length > 0 ? versions.length : 1;

        if (q.is_dropped) {
          droppedCount += 1;
        }

        const activeVersion = q.versions?.find((v) => v.is_active);
        if (q.is_finalized || activeVersion?.is_finalized) {
          finalizedCount += 1;
        }
      });

      setStats({
        total_quotations: totalQuotationsCount,
        total_versions: totalVersionsCount,
        dropped_quotations: droppedCount,
        finalized_quotations: finalizedCount,
      });

      setTotalCount(data.length);
      setTotalPages(Math.max(1, Math.ceil(data.length / itemsPerPage)));
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || String(err));
      setRows([]);
      setAllRows([]);
      setFilteredData([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [token, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply quick filter
  const applyQuickFilter = useCallback(() => {
    let filtered = allRows;

    switch (filterType) {
      case "ahilyanagar":
        filtered = allRows.filter((q) => q.quotation_for === "Ahilyanagar");
        break;
      case "pune":
        filtered = allRows.filter((q) => q.quotation_for === "Pune" || !q.quotation_for);
        break;
      case "finalized":
        filtered = allRows.filter((q) => {
          const activeVersion = q.versions?.find((v) => v.is_active);
          return q.is_finalized || activeVersion?.is_finalized;
        });
        break;
      case "dropped":
        filtered = allRows.filter((q) => q.is_dropped);
        break;
      case "active":
        filtered = allRows.filter((q) => {
          const activeVersion = q.versions?.find((v) => v.is_active);
          return !q.is_dropped && !q.is_finalized && !activeVersion?.is_finalized;
        });
        break;
      default:
        filtered = allRows;
    }

    setFilteredData(filtered);
  }, [allRows, filterType]);

  useEffect(() => {
    applyQuickFilter();
  }, [applyQuickFilter]);

  const filterOptions = [
    { value: "all", label: "All Records" },
    { value: "ahilyanagar", label: "Ahilyanagar" },
    { value: "pune", label: "Pune" },
    { value: "finalized", label: "Finalized Quotations" },
    { value: "dropped", label: "Dropped Quotations" },
    { value: "active", label: "Active / Pending" },
  ];

  const currentFilterLabel = filterOptions.find((f) => f.value === filterType)?.label || "All Records";
  const formatNumber = (num) => String(num).padStart(2, '0');

  // Update pagination when filtered data changes
  useEffect(() => {
    setRows(filteredData);
    setTotalCount(filteredData.length);
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
    if (!window.location.search.includes("quotationId") && !window.location.search.includes("id=") && !window.location.search.includes("highlight")) {
      setCurrentPage(1);
    }
  }, [filteredData, itemsPerPage]);

  // Get current page data
  const getCurrentPageData = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return rows.slice(startIndex, startIndex + itemsPerPage);
  }, [rows, currentPage, itemsPerPage]);

  // ✅ Get paginated versions for a quotation
  const getPaginatedVersions = useCallback((quotationId, versions) => {
    const currentVersionPage = versionPagination[quotationId] || 1;
    const startIndex = (currentVersionPage - 1) * VERSIONS_PER_PAGE;
    const endIndex = startIndex + VERSIONS_PER_PAGE;
    const paginatedVersions = versions.slice(startIndex, endIndex);
    const totalVersionPages = Math.max(1, Math.ceil(versions.length / VERSIONS_PER_PAGE));

    return {
      versions: paginatedVersions,
      currentPage: currentVersionPage,
      totalPages: totalVersionPages,
      totalVersions: versions.length
    };
  }, [versionPagination]);

  // ✅ Handle version page change
  const handleVersionPageChange = useCallback((quotationId, newPage) => {
    setVersionPagination(prev => ({
      ...prev,
      [quotationId]: newPage
    }));
  }, []);

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Delete Quotation?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b"
    });
    if (!res.isConfirmed) return;

    try {
      await api.delete(`quotation/quotation/${id}/`);
      Swal.fire({ icon: "success", text: "Quotation deleted", timer: 1000, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  const handleDeleteVersion = async (quotationId, versionId) => {
    const res = await Swal.fire({
      title: "Delete Version?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
    });

    if (!res.isConfirmed) return;

    try {
      await api.delete(`quotation/quotation/${quotationId}/version/${versionId}/delete/`);
      Swal.fire({ icon: "success", text: "Version deleted", timer: 1000, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  const handleFinalizeVersion = async (quotationId, versionId = null, currentlyFinalized = false, versionNo = "") => {
    const actionText = currentlyFinalized ? "remove final status from" : "make";
    const statusText = currentlyFinalized ? "un-finalized" : "final";
    const res = await Swal.fire({
      title: currentlyFinalized ? "Remove Final Status?" : "Finalize Quotation Version?",
      text: `Are you sure you want to ${actionText} ${versionNo ? `version ${versionNo}` : "this version"}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: currentlyFinalized ? "Yes, Un-finalize" : "Yes, Make Final",
      confirmButtonColor: currentlyFinalized ? "#e11d48" : "#059669",
      cancelButtonColor: "#64748b",
    });

    if (!res.isConfirmed) return;

    try {
      const url = versionId
        ? `quotation/quotation/${quotationId}/version/${versionId}/finalize/`
        : `quotation/quotation/${quotationId}/finalize/`;
      const response = await api.post(url);
      Swal.fire({
        icon: "success",
        text: response.data.message || `Version marked as ${statusText}`,
        timer: 1500,
        showConfirmButton: false,
      });
      fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Action failed",
        text: err.response?.data?.error || err.message || String(err),
      });
    }
  };

  const handleViewPDF = async (quotationId, versionId = null) => {
    try {
      const query = versionId ? `version_id=${versionId}&disposition=inline` : `disposition=inline`;
      const url = `quotation/quotation/${quotationId}/pdf/?${query}`;

      const response = await api.get(url, { responseType: "blob" });
      const file = new Blob([response.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to open PDF" });
    }
  };

  const handleDownloadPDF = async (quotationId, versionId = null) => {
    try {
      const query = versionId ? `version_id=${versionId}&disposition=attachment` : `disposition=attachment`;
      const url = `quotation/quotation/${quotationId}/pdf/?${query}`;

      const response = await api.get(url, { responseType: "blob" });
      const file = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = `Quotation_${quotationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to download PDF" });
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

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return "0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const getActiveVersion = (q) => {
    return q.versions?.find((v) => v.is_active);
  };

  const getProductNames = (version) => {
    if (!version?.items || !Array.isArray(version.items) || version.items.length === 0) return "-";
    const names = version.items
      .map((it) => {
        if (typeof it === "object" && it !== null) {
          return it.product_name || it.name || it.product || "";
        }
        return String(it || "").trim();
      })
      .filter((n) => n && !/^\d+$/.test(n) && n.toLowerCase() !== "item 1");
    return names.length > 0 ? Array.from(new Set(names)).join(", ") : "-";
  };

  const getProductCount = (version) => {
    if (!version?.items) return "0";
    return version.items.length;
  };

  const handleToggleDrop = useCallback(async (id, currentDroppedStatus) => {
    const actionText = currentDroppedStatus ? "restore this quotation" : "mark this quotation as DROPPED";
    const result = await Swal.fire({
      title: currentDroppedStatus ? "Restore Quotation?" : "Drop Quotation?",
      text: `Are you sure you want to ${actionText}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: currentDroppedStatus ? "Yes, Restore" : "Yes, Drop It",
      cancelButtonText: "Cancel",
      confirmButtonColor: currentDroppedStatus ? "#2563eb" : "#475569",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`quotation/quotation/${id}/toggle-drop/`, {
        is_dropped: !currentDroppedStatus,
      });

      Swal.fire({
        icon: "success",
        title: "Updated",
        text: `Quotation ${!currentDroppedStatus ? "marked as dropped" : "restored"} successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });
      fetchData();
    } catch (err) {
      console.error("Error toggling drop status:", err);
      Swal.fire("Error", "Failed to update quotation status.", "error");
    }
  }, [fetchData]);

  const columns = [
    {
      key: "sr",
      label: "Sr.No",
      render: (_, idx) => <span className="text-slate-600 font-medium text-xs whitespace-nowrap block">{(currentPage - 1) * itemsPerPage + (idx + 1)}</span>,
      className: "w-12 whitespace-nowrap"
    },
    {
      key: "quotation_no",
      label: "Quotation No",
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap" title={r.quotation_no || ""}>
          <span className={r.is_dropped ? "text-slate-700 font-bold text-xs line-through" : "text-blue-600 font-bold text-xs"}>
            {r.quotation_no || "-"}
          </span>
          {r.is_dropped && (
            <span className="px-1.5 py-0.5 bg-slate-700 text-slate-100 rounded text-[9px] font-extrabold uppercase tracking-wider shadow-xs">
              DROPPED
            </span>
          )}
        </div>
      ),
      className: "whitespace-nowrap"
    },
    {
      key: "quotation_for",
      label: "Quotation For",
      render: (r) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${r.quotation_for === "Ahilyanagar"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          title={r.quotation_for || "Pune"}
        >
          {r.quotation_for || "Pune"}
        </span>
      ),
      className: "whitespace-nowrap"
    },
    {
      key: "company_name",
      label: "Company Name",
      render: (r) => (
        <span
          className="text-slate-900 font-semibold text-xs tracking-tight block max-w-[160px] truncate mx-auto cursor-default"
          title={r.company_name || ""}
        >
          {r.company_name || "-"}
        </span>
      ),
      className: "min-w-[130px] max-w-[170px]"
    },
    {
      key: "contact",
      label: "Contact",
      render: (r) => (
        <span
          className="text-slate-700 text-xs block max-w-[130px] truncate mx-auto cursor-default"
          title={r.contact_person || ""}
        >
          {r.contact_person || "-"}
        </span>
      ),
      className: "min-w-[110px] max-w-[140px]"
    },
    {
      key: "mobile",
      label: "Mobile",
      render: (r) => (
        <span className="text-slate-700 font-medium text-xs whitespace-nowrap block" title={r.mobile_number || ""}>
          {r.mobile_number || "-"}
        </span>
      ),
      className: "whitespace-nowrap"
    },
    {
      key: "version",
      label: "Version",
      render: (r) => {
        const activeVersion = getActiveVersion(r);
        const isFinalized = r.is_finalized || activeVersion?.is_finalized;
        const vText = activeVersion?.version_no || "v1";
        return (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap" title={`Version: ${vText}${isFinalized ? " (Final)" : ""}`}>
            <span className="text-slate-700 text-xs font-medium">{vText}</span>
            {isFinalized && (
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[9px] font-bold uppercase tracking-wider">
                Final
              </span>
            )}
          </div>
        );
      },
      className: "whitespace-nowrap",
    },
    {
      key: "products",
      label: (
        <div className="leading-tight">
          <div>Products</div>
        </div>
      ),
      render: (r) => {
        const activeVersion = getActiveVersion(r);
        const prodNames = getProductNames(activeVersion);
        return (
          <span
            className="text-slate-800 font-medium text-xs block max-w-[140px] truncate mx-auto cursor-default"
            title={prodNames}
          >
            {prodNames}
          </span>
        );
      },
      className: "min-w-[120px] max-w-[160px]"
    },
    {
      key: "total_amount",
      label: "Total Amount",
      render: (r) => {
        const activeVersion = getActiveVersion(r);
        const amtText = `₹${formatAmount(activeVersion?.grand_total || activeVersion?.total_amount)}`;
        return <span className="text-slate-900 font-bold text-xs whitespace-nowrap block" title={amtText}>{amtText}</span>;
      },
      className: "whitespace-nowrap"
    },
    {
      key: "date",
      label: "Date",
      render: (r) => <span className="text-slate-600 text-xs whitespace-nowrap block" title={formatDate(r.created_at)}>{formatDate(r.created_at)}</span>,
      className: "whitespace-nowrap"
    },
  ];

  const actionsRenderer = useCallback((row) => {
    const activeVersion = getActiveVersion(row);
    const isLatest = activeVersion?.is_active;
    const isFinalized = Boolean(row.is_finalized || activeVersion?.is_finalized);
    const isDropped = Boolean(row.is_dropped);
    const isEditable = !isFinalized && !isDropped;

    return (
      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenRow(openRow === row.id ? null : row.id);
            // ✅ Reset version pagination when opening a new row
            if (openRow !== row.id) {
              setVersionPagination(prev => ({
                ...prev,
                [row.id]: 1
              }));
            }
          }}
          className={`p-1 rounded transition-all duration-150 text-sm shadow-xs ${openRow === row.id
            ? "bg-purple-600 text-white"
            : "bg-purple-50 hover:bg-purple-100 text-purple-600"
            }`}
          title="Version History"
        >
          <MdHistory />
        </button>

        <button
          onClick={() => handleViewPDF(row.id)}
          className="p-1 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded transition-all duration-150 text-sm shadow-xs"
          title="View PDF"
        >
          <MdRemoveRedEye />
        </button>

        {canEditQuotation && isLatest && (
          <button
            onClick={() => handleFinalizeVersion(row.id, activeVersion?.id, activeVersion?.is_finalized, activeVersion?.version_no)}
            className={`p-1 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer ${activeVersion?.is_finalized
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700"
              }`}
            title={activeVersion?.is_finalized ? "Finalized (Click to un-finalize)" : "Make Final"}
          >
            <MdTaskAlt />
          </button>
        )}

        {canEditQuotation && isLatest && (
          <button
            onClick={() => {
              if (!isEditable) return;
              setEditingQuotation(row);
              setShowQuotationForm(true);
            }}
            disabled={!isEditable}
            className={`p-1 rounded transition-all duration-150 text-sm shadow-xs ${isEditable
              ? "bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 cursor-pointer"
              : "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
              }`}
            title={
              isEditable
                ? "Edit Record"
                : isDropped
                  ? "Cannot edit a dropped quotation"
                  : "Cannot edit a finalized quotation"
            }
          >
            <MdEdit />
          </button>
        )}

        <button
          onClick={() => handleDownloadPDF(row.id)}
          className="p-1 bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-700 rounded transition-all duration-150 text-sm shadow-xs"
          title="Download PDF"
        >
          <MdDownload />
        </button>

        <button
          onClick={() => {
            setSelectedMessageRecord(row);
            setMessageChannel("whatsapp");
            setSendMessageModalOpen(true);
          }}
          className="p-1 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
          title="Send via WhatsApp"
        >
          <FaWhatsapp />
        </button>

        <button
          onClick={() => {
            setSelectedMessageRecord(row);
            setMessageChannel("email");
            setSendMessageModalOpen(true);
          }}
          className="p-1 bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
          title="Send via Email"
        >
          <MdEmail />
        </button>

        {canEditQuotation && (
          <button
            onClick={() => handleToggleDrop(row.id, row.is_dropped)}
            className={`p-1 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer ${row.is_dropped
              ? "bg-slate-700 text-slate-100 hover:bg-slate-800"
              : "bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700"
              }`}
            title={row.is_dropped ? "Dropped (Click to restore)" : "Mark as Dropped"}
          >
            <MdBlock />
          </button>
        )}

        {canDeleteQuotation && isLatest && (
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
            title="Delete Record"
          >
            <MdDelete />
          </button>
        )}
      </div>
    );
  }, [openRow, handleDelete, handleFinalizeVersion, handleToggleDrop, canEditQuotation, canDeleteQuotation]);

  // NESTED VERSION HISTORY ROW WITH PAGINATION
  const renderExpandedRow = useCallback((row) => {
    if (openRow !== row.id) return null;

    const allVersions = row.versions || [];
    // Sort: active first, then by created_at desc
    const sortedVersions = [...allVersions].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const { versions: paginatedVersions, currentPage: versionPage, totalPages: versionTotalPages, totalVersions } = getPaginatedVersions(row.id, sortedVersions);

    return (
      <tr key={`expanded-${row.id}`} className="bg-slate-50/70 border-b">
        <td colSpan={columns.length + 1} className="py-3 px-6">
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
            <div className="font-bold text-slate-800 text-xs mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                Version History ({totalVersions} total)
              </div>
              {totalVersions > VERSIONS_PER_PAGE && (
                <span className="text-[10px] text-slate-400 font-medium">
                  Showing {((versionPage - 1) * VERSIONS_PER_PAGE) + 1} to {Math.min(versionPage * VERSIONS_PER_PAGE, totalVersions)} of {totalVersions}
                </span>
              )}
            </div>

            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-1.5 text-left">Version</th>
                  <th className="px-3 py-1.5 text-left">Date</th>
                  <th className="px-3 py-1.5 text-left">Products</th>
                  <th className="px-3 py-1.5 text-right">Total</th>
                  <th className="px-3 py-1.5 text-center">Status</th>
                  <th className="px-3 py-1.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedVersions.map((v) => {
                  const isActive = v.is_active;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-1.5 font-semibold text-slate-800">
                        {v.version_no}
                        {isActive && (
                          <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[8px] font-bold uppercase">
                            Active
                          </span>
                        )}
                        {v.is_finalized && (
                          <span className="ml-1 px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[8px] font-bold uppercase">
                            Final
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">
                        {v.created_at?.split("T")[0]}
                      </td>
                      <td className="px-3 py-1.5 text-slate-700 font-medium max-w-[160px] truncate" title={getProductNames(v)}>
                        {getProductNames(v)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                        ₹{formatAmount(v.grand_total || v.total_amount)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isActive ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-medium uppercase tracking-wider">
                              Archived
                            </span>
                          )}
                          {v.is_finalized && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[9px] font-bold uppercase tracking-wider">
                              Finalized
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isActive && (
                            <button
                              onClick={() => handleFinalizeVersion(row.id, v.id, v.is_finalized, v.version_no)}
                              className={`p-1 rounded text-xs transition-colors cursor-pointer ${v.is_finalized
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700"
                                }`}
                              title={v.is_finalized ? "Finalized (Click to un-finalize)" : "Make Final"}
                            >
                              <MdTaskAlt size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => handleViewPDF(row.id, v.id)}
                            className="p-1 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded text-xs transition-colors"
                            title="View PDF"
                          >
                            <MdRemoveRedEye size={14} />
                          </button>

                          <button
                            onClick={() => handleDownloadPDF(row.id, v.id)}
                            className="p-1 bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-700 rounded text-xs transition-colors"
                            title="Download PDF"
                          >
                            <MdDownload size={14} />
                          </button>

                          <button
                            className="p-1 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded text-xs transition-colors"
                            title="WhatsApp"
                          >
                            <FaWhatsapp size={14} />
                          </button>

                          {!isActive && (
                            <button
                              onClick={() => handleDeleteVersion(row.id, v.id)}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded text-xs transition-colors"
                              title="Delete Version"
                            >
                              <MdDelete size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {paginatedVersions.length === 0 && (
              <div className="p-3 text-center text-slate-400 text-xs">
                No versions found
              </div>
            )}

            {/* ✅ Version Pagination Controls */}
            {totalVersions > VERSIONS_PER_PAGE && (
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[10px] text-slate-400">
                  Page {versionPage} of {versionTotalPages}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleVersionPageChange(row.id, Math.max(1, versionPage - 1))}
                    disabled={versionPage === 1}
                    className="px-2 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleVersionPageChange(row.id, Math.min(versionTotalPages, versionPage + 1))}
                    disabled={versionPage === versionTotalPages}
                    className="px-2 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }, [openRow, columns.length, handleDeleteVersion, getPaginatedVersions, handleVersionPageChange, handleFinalizeVersion, VERSIONS_PER_PAGE]);

  const currentPageData = getCurrentPageData();

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">

        {/* HEADER BLOCK WITH THE BLUE VERTICAL ACCENT LINE */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Quotation Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Synchronizing quotation records..." : `${totalCount} records found`}
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-3">
            {/* Quick Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MdFilterList className="text-slate-400" />
                {currentFilterLabel}
              </button>

              {showFilterDropdown && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterType(option.value);
                        setShowFilterDropdown(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors ${filterType === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
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
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <MdFilterList className="text-slate-400" />
              Filter
            </button>

            {canCreateQuotation && (
              <button
                onClick={() => { setEditingQuotation(null); setShowQuotationForm(true); }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <MdAdd className="text-sm" />
                Add Quotation
              </button>
            )}
          </div>
        </div>

        {/* 4 TOP KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total_quotations)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Total Quotations</p>
            <p className="text-[10px] text-slate-400 mt-1">All records</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.total_versions)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Total Versions</p>
            <p className="text-[10px] text-slate-400 mt-1">Across all quotations</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <p className="text-2xl font-bold text-slate-600">{formatNumber(stats.dropped_quotations)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Dropped</p>
            <p className="text-[10px] text-slate-400 mt-1">Marked as dropped</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats.finalized_quotations)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Finalized</p>
            <p className="text-[10px] text-slate-400 mt-1">Finalized contracts</p>
          </div>
        </div>

        {/* TABLE */}
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
            renderExpandedRow={renderExpandedRow}
            emptyMessage="No quotation records matched the criteria"
            rowClassName={(row) =>
              highlightedQuotationId && String(row.id) === String(highlightedQuotationId)
                ? "!bg-blue-100/90 font-bold border-l-4 border-l-blue-600 ring-2 ring-blue-400/60 shadow-md animate-pulse"
                : row.is_dropped
                  ? "bg-slate-300/80 text-slate-700 font-medium border-slate-400"
                  : ""
            }
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

      {/* QUOTATION FORM MODAL */}
      {showQuotationForm && (
        <AddQuotation
          id={editingQuotation?.id}
          onBack={() => {
            setShowQuotationForm(false);
            setEditingQuotation(null);
            fetchData();
          }}
        />
      )}

      {/* SEND MESSAGE MODAL */}
      <SendMessageModal
        isOpen={sendMessageModalOpen}
        onClose={() => {
          setSendMessageModalOpen(false);
          setSelectedMessageRecord(null);
        }}
        category="quotation"
        recordData={selectedMessageRecord}
        initialChannel={messageChannel}
        onSuccess={() => {}}
      />
    </Base>
  );
}