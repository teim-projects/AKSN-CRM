import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import TableView from "../components/TableView";
import AddAMCContractForm from "../components/amc/AddAMCContractForm";
import RenewAMCModal from "../components/amc/RenewAMCModal";
import RecordViewer from "../components/RecordViewer";
import AdvancedTableFilter from "../components/AdvancedTableFilter";
import {
  MdAdd,
  MdFilterList,
  MdDelete,
  MdZoomIn,
  MdOutlineRemoveRedEye,
  MdToggleOn,
  MdToggleOff,
  MdHistory,
  MdAutorenew,
} from "react-icons/md";
import Swal from "sweetalert2";
import { useUserRole } from "../hooks/useAuth";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

export default function AMC() {
  const { hasPermission } = useUserRole(BASE_API);
  const canCreateAMC = hasPermission("amc", "create");
  const canEditAMC = hasPermission("amc", "edit");
  const canDeleteAMC = hasPermission("amc", "delete");
  const token = useMemo(
    () =>
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "",
    []
  );

  const API_URL = `${BASE_API.replace(/\/$/, "")}/lead/amc/contracts/`;

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingAMC, setEditingAMC] = useState(null);

  // Details viewing states
  const [viewingAMC, setViewingAMC] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordViewerOpen, setRecordViewerOpen] = useState(false);

  // Quick filter state
  const [filterType, setFilterType] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Filter drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Version / History row expansion state
  const [openRow, setOpenRow] = useState(null);

  // Renew modal state
  const [renewingAMC, setRenewingAMC] = useState(null);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const formatNumber = (num) => String(num || 0).padStart(2, "0");

  const filterOptions = [
    { value: "all", label: "All Records" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "expiring_soon", label: "Expiring Soon" },
    { value: "expired", label: "Expired" },
    { value: "renewed", label: "Renewed" },
  ];

  const currentFilterLabel = filterOptions.find((f) => f.value === filterType)?.label || "All Records";

  const stats = useMemo(() => {
    const total = allRows.length;
    const active = allRows.filter((r) => r.status !== "inactive").length;
    const inactive = allRows.filter((r) => r.status === "inactive").length;
    const expiringSoon = allRows.filter((r) => r.status === "expiring_soon").length;
    const expired = allRows.filter((r) => r.status === "expired").length;
    const renewed = allRows.filter((r) => r.status === "renewed" || r.status === "renewal_pending").length;

    return { total, active, inactive, expiringSoon, expired, renewed };
  }, [allRows]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}?limit=1000`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${txt}`);
      }

      const data = await res.json();
      const list = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];

      setAllRows(list);
      setFilteredData(list);
      setRows(list);
      setTotalCount(list.length);
      setTotalPages(Math.max(1, Math.ceil(list.length / itemsPerPage)));
      setCurrentPage(1);
    } catch (err) {
      console.error("Fetch AMC error:", err);
      setError(err.message || String(err));
      setRows([]);
      setAllRows([]);
      setFilteredData([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let result = filteredData;
    if (filterType !== "all") {
      const ft = (filterType || "").toLowerCase();
      result = filteredData.filter((r) => {
        const st = (r.status || "").toLowerCase();
        if (ft === "renewed") {
          return st === "renewed" || st === "renewal_pending";
        }
        if (ft === "active") {
          return st !== "inactive";
        }
        if (ft === "expiring_soon") {
          return st === "expiring_soon" || st === "expiring soon";
        }
        return st === ft;
      });
    }

    setRows(result);
    setTotalCount(result.length);
    setTotalPages(Math.max(1, Math.ceil(result.length / itemsPerPage)));
    setCurrentPage(1);
  }, [filteredData, filterType, itemsPerPage]);

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Delete AMC Contract?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
    });

    if (!res.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete AMC contract.");
      }

      Swal.fire({
        icon: "success",
        text: "AMC Contract deleted",
        timer: 1200,
        showConfirmButton: false,
      });
      fetchData();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: err.message || String(err),
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleToggleStatus = async (row) => {
    try {
      const response = await fetch(`${API_URL}${row.id}/toggle-status/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update AMC contract status.");
      }

      const updated = await response.json();
      const newStatus = updated.status === "active" ? "Active" : "Inactive";
      Swal.fire({
        icon: "success",
        text: `AMC Contract status changed to ${newStatus}`,
        timer: 1200,
        showConfirmButton: false,
      });
      fetchData();
    } catch (err) {
      Swal.fire("Error", err.message || "Failed to change status", "error");
    }
  };

  const getRowClassName = (row) => {
    if (row.status === "expiring_soon") return "bg-yellow-100/60";
    if (row.status === "expired") return "bg-red-100/60";
    return "";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Active</span>;
      case "inactive":
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Inactive</span>;
      case "expiring_soon":
        return <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Expiring Soon</span>;
      case "expired":
        return <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Expired</span>;
      case "renewed":
      case "renewal_pending":
        return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Renewed</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium uppercase tracking-wider">{status || "Active"}</span>;
    }
  };

  const columns = [
    {
      key: "sr",
      label: "Sr.No",
      render: (_, idx) => (
        <span className="text-slate-600 font-medium text-xs py-0 block">
          {(currentPage - 1) * itemsPerPage + (idx + 1)}
        </span>
      ),
      className: "w-14",
    },
    {
      key: "contract_id",
      label: "Contract ID",
      render: (r) => (
        <span className="font-mono font-bold text-blue-600 text-xs py-0 block whitespace-nowrap">
          {r.contract_id || `#${r.id}`}
        </span>
      ),
      className: "w-28",
    },
    {
      key: "project_code",
      label: "Project No.",
      render: (r) => (
        <span className="font-mono text-slate-700 text-xs py-0 block whitespace-nowrap">
          {r.project_details?.project_code || r.project_code || "-"}
        </span>
      ),
      className: "w-28",
    },
    {
      key: "customer",
      label: "Customer",
      render: (r) => (
        <span className="text-slate-900 font-semibold text-xs py-0 block whitespace-nowrap">
          {r.customer_details?.company_name || r.customer_details?.name || r.customer || "-"}
        </span>
      ),
      className: "min-w-[140px]",
    },
    {
      key: "product",
      label: "Product",
      render: (r) => (
        <span className="text-slate-700 text-xs py-0 block whitespace-nowrap">
          {r.product || "-"}
        </span>
      ),
      className: "w-36",
    },
    {
      key: "amc_type",
      label: "Type",
      render: (r) => (
        <span className="text-slate-600 text-xs py-0 block capitalize whitespace-nowrap">
          {r.amc_type_display || r.amc_type || "Comprehensive"}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "period",
      label: "Period (Start - End)",
      render: (r) => (
        <span className="text-slate-600 text-xs py-0 block whitespace-nowrap">
          {formatDate(r.start_date)} to {formatDate(r.end_date)}
        </span>
      ),
      className: "w-44",
    },
    {
      key: "annual_value",
      label: "Annual Value",
      render: (r) => (
        <span className="text-slate-900 font-bold text-xs py-0 block whitespace-nowrap">
          {r.annual_value ? `₹${parseFloat(r.annual_value).toLocaleString("en-IN")}` : "₹0"}
        </span>
      ),
      className: "w-28",
    },
    {
      key: "support_coordinator",
      label: "Coordinator",
      render: (r) => (
        <span className="text-slate-700 text-xs py-0 block whitespace-nowrap">
          {r.support_coordinator_details?.full_name || r.support_coordinator_details?.name || r.support_coordinator_details?.username || "-"}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "status",
      label: "Status",
      render: (r) => getStatusBadge(r.status),
      className: "w-28 text-center",
    },
  ];

  const actionsRenderer = (row) => (
    <div className="flex items-center justify-center gap-1 py-0">
      {/* Version / Renewal History Symbol Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenRow(openRow === row.id ? null : row.id);
        }}
        className={`p-1 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer ${openRow === row.id
          ? "bg-purple-600 text-white"
          : "bg-purple-50 hover:bg-purple-100 text-purple-600"
          }`}
        title="Renewal History & Old AMC Versions"
      >
        <MdHistory size={16} />
      </button>

      {/* Renew AMC Contract Button */}
      {canEditAMC && (
        <button
          onClick={() => {
            setRenewingAMC(row);
            setShowRenewModal(true);
          }}
          className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
          title="Renew AMC Contract"
        >
          <MdAutorenew size={16} />
        </button>
      )}

      {/* View Record Viewer Button */}
      <button
        onClick={() => {
          setSelectedRecord(row);
          setRecordViewerOpen(true);
        }}
        className="p-1 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
        title="View Full Record"
      >
        <MdZoomIn />
      </button>

      {/* View Details Button */}
      <button
        onClick={() => setViewingAMC(row)}
        className="p-1 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
        title="View Details"
      >
        <MdOutlineRemoveRedEye />
      </button>

      {/* Status Toggle (Active / Inactive) */}
      {canEditAMC && (() => {
        const isRowActive = row.status !== "inactive";
        return (
          <button
            onClick={() => handleToggleStatus(row)}
            className={`p-1 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer ${isRowActive
              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
              : "bg-slate-100 hover:bg-slate-200 text-slate-500"
              }`}
            title={isRowActive ? "Mark Inactive" : "Mark Active"}
          >
            {isRowActive ? <MdToggleOn size={18} /> : <MdToggleOff size={18} />}
          </button>
        );
      })()}

      {/* Delete Button */}
      {canDeleteAMC && (
        <button
          onClick={() => handleDelete(row.id)}
          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
          title="Delete Contract"
        >
          <MdDelete />
        </button>
      )}
    </div>
  );

  const getCycleStatusBadge = (st) => {
    switch (st) {
      case "active":
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px] uppercase">Active</span>;
      case "scheduled":
        return <span className="px-2 py-0.5 bg-sky-100 text-sky-700 font-bold rounded text-[10px] uppercase">Scheduled</span>;
      case "expiring_soon":
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 font-bold rounded text-[10px] uppercase">Expiring Soon</span>;
      case "expired":
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[10px] uppercase">Expired</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px] uppercase">{st || "Inactive"}</span>;
    }
  };

  const renderExpandedRow = useCallback((row) => {
    if (openRow !== row.id) return null;

    const cycles = row.cycles || [];

    return (
      <tr className="bg-slate-50/70 border-b">
        <td colSpan={11} className="p-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-purple-100 text-purple-700 rounded-md">
                  <MdHistory className="text-base" />
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    AMC Contract Cycles ({cycles.length} cycle{cycles.length !== 1 ? 's' : ''})
                  </h4>
                </div>
              </div>
              <button
                onClick={() => {
                  setRenewingAMC(row);
                  setShowRenewModal(true);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <MdAutorenew className="text-sm" />
                Renew Contract Now
              </button>
            </div>

            {cycles.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No contract cycles logged. Active period: {formatDate(row.start_date)} to {formatDate(row.end_date)}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/70 text-slate-500 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Cycle</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Period (Start - End)</th>
                      <th className="py-2 px-3">Annual Value (₹)</th>
                      <th className="py-2 px-3">Payment Frequency</th>
                      <th className="py-2 px-3">Created On</th>
                      <th className="py-2 px-3">Created / Renewed By</th>
                      <th className="py-2 px-3">Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cycles.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-purple-700">
                          <span className="px-2 py-0.5 bg-purple-50 rounded text-[10px]">
                            Cycle #{item.cycle_number}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {getCycleStatusBadge(item.status)}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium whitespace-nowrap">
                          {formatDate(item.start_date)} to {formatDate(item.end_date)}
                        </td>
                        <td className="py-2 px-3 font-bold text-emerald-700">
                          ₹{parseFloat(item.annual_value || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 text-slate-600 capitalize">
                          {item.payment_frequency_display || item.payment_frequency}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[10px]">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {item.created_by_details?.full_name || item.created_by_details?.username || "System"}
                        </td>
                        <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate">
                          {item.remarks || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }, [openRow, formatDate]);

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return rows.slice(start, start + itemsPerPage);
  };

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                AMC Contracts
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading
                  ? "Synchronizing AMC records..."
                  : `Total ${totalCount} contracts active`}
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <MdFilterList className="text-slate-400 text-sm" />
                <span>Filter: {currentFilterLabel}</span>
              </button>

              {showFilterDropdown && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFilterType(opt.value);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer ${filterType === opt.value ? "font-bold text-blue-600 bg-blue-50/50" : "text-slate-700"
                        }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <MdFilterList className="text-slate-400 text-sm" />
              Filter
            </button>

            {canCreateAMC && (
              <button
                onClick={() => {
                  setEditingAMC(null);
                  setShowForm(true);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <MdAdd className="text-sm" />
                Add AMC Contract
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Total Contracts</p>
            <p className="text-[10px] text-slate-400 mt-1">All records</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <p className="text-2xl font-bold">
              <span className="text-emerald-600">{formatNumber(stats.active)}</span>
              <span className="text-slate-300 font-normal px-1">/</span>
              <span className="text-slate-500">{formatNumber(stats.inactive)}</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Active / Inactive</p>
            <p className="text-[10px] text-slate-400 mt-1">Contract status</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <p className="text-2xl font-bold">
              <span className="text-yellow-600">{formatNumber(stats.expiringSoon)}</span>
              <span className="text-slate-300 font-normal px-1">/</span>
              <span className="text-red-600">{formatNumber(stats.expired)}</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Expiring Soon / Expired</p>
            <p className="text-[10px] text-slate-400 mt-1">Contract expiration</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
            <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats.renewed)}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Renewed</p>
            <p className="text-[10px] text-slate-400 mt-1">Renewed contracts</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <TableView
            columns={columns}
            rows={getCurrentPageData()}
            loading={loading}
            error={error}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            pageSize={itemsPerPage}
            actions={actionsRenderer}
            rowClassName={getRowClassName}
            renderExpandedRow={renderExpandedRow}
            emptyMessage="No AMC contracts matched the active criteria"
          />
        </div>

        {isFilterOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-[999]"
            onClick={() => setIsFilterOpen(false)}
          />
        )}
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-[380px] sm:w-[380px] bg-white shadow-2xl z-[1000] transition-transform duration-300 ease-in-out ${isFilterOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Filters</h3>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
            >
              ×
            </button>
          </div>
          <div className="p-5 overflow-y-auto h-[calc(100vh-80px)]">
            <AdvancedTableFilter
              data={allRows}
              onFilter={setFilteredData}
              setItemsPerPage={setItemsPerPage}
              columns={columns}
            />
          </div>
        </div>

        <AddAMCContractForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingAMC(null);
          }}
          onSuccess={() => fetchData()}
          amcContract={editingAMC}
          token={token}
          baseUrl={BASE_API}
        />

        <RecordViewer
          isOpen={recordViewerOpen}
          onClose={() => {
            setRecordViewerOpen(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
          title="AMC Contract Details"
        />

        {viewingAMC && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setViewingAMC(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>

              <h2 className="text-lg font-bold text-slate-900 border-b pb-3 mb-4 flex items-center justify-between pr-8">
                <span>Contract Details — {viewingAMC.contract_id || `#${viewingAMC.id}`}</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(viewingAMC.status)}
                  <button
                    onClick={() => {
                      const target = viewingAMC;
                      setViewingAMC(null);
                      setRenewingAMC(target);
                      setShowRenewModal(true);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <MdAutorenew className="text-sm" />
                    Renew Contract
                  </button>
                </div>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block">Customer:</span>
                  <span className="text-slate-900 font-bold">
                    {viewingAMC.customer_details?.company_name || viewingAMC.customer_details?.name || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Project Reference:</span>
                  <span className="text-slate-800 font-medium">
                    {viewingAMC.project_details?.project_code || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Product:</span>
                  <span className="text-blue-700 font-semibold">{viewingAMC.product || "—"}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">AMC Type:</span>
                  <span className="text-slate-800 capitalize font-medium">{viewingAMC.amc_type_display || viewingAMC.amc_type}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">AMC Start Date:</span>
                  <span className="text-slate-800 font-medium">{formatDate(viewingAMC.start_date)}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">AMC End Date:</span>
                  <span className="text-slate-800 font-medium">{formatDate(viewingAMC.end_date)}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Annual Value:</span>
                  <span className="text-slate-900 font-bold">
                    {viewingAMC.annual_value ? `₹${parseFloat(viewingAMC.annual_value).toLocaleString("en-IN")}` : "₹0"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Payment Frequency:</span>
                  <span className="text-slate-800 capitalize font-medium">{viewingAMC.payment_frequency_display || viewingAMC.payment_frequency}</span>
                </div>

                <div className="md:col-span-2">
                  <span className="font-semibold text-slate-500 block">Support Coordinator:</span>
                  <span className="text-slate-800 font-medium">
                    {viewingAMC.support_coordinator_details?.full_name || viewingAMC.support_coordinator_details?.name || viewingAMC.support_coordinator_details?.username || "—"}
                  </span>
                </div>

                <div className="md:col-span-2 border-t pt-3 mt-1">
                  <span className="font-semibold text-slate-500 block mb-1">Scope of Support:</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                    {viewingAMC.scope_of_support || "No scope specified."}
                  </p>
                </div>

                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <MdHistory className="text-purple-600 text-base" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Contract Cycles ({viewingAMC.cycles?.length || 0})
                    </h3>
                  </div>

                  {(!viewingAMC.cycles || viewingAMC.cycles.length === 0) ? (
                    <p className="text-slate-400 italic text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                      No cycles logged.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {viewingAMC.cycles.map((cyc) => (
                        <div key={cyc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                                Cycle #{cyc.cycle_number}
                              </span>
                              {getCycleStatusBadge(cyc.status)}
                            </div>
                            <p className="text-slate-700 font-medium">
                              Period: <span className="text-emerald-700 font-semibold">{formatDate(cyc.start_date)} to {formatDate(cyc.end_date)}</span> (₹{parseFloat(cyc.annual_value || 0).toLocaleString("en-IN")})
                            </p>
                            {cyc.remarks && (
                              <p className="text-slate-500 text-[11px] mt-1 bg-white p-2 rounded border border-slate-100 italic">
                                "{cyc.remarks}"
                              </p>
                            )}
                          </div>
                          <div className="text-right text-[10px] text-slate-400">
                            <span className="block font-medium text-slate-600">{cyc.created_by_details?.full_name || cyc.created_by_details?.username || "System"}</span>
                            <span>{formatDate(cyc.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <RenewAMCModal
          open={showRenewModal}
          onClose={() => {
            setShowRenewModal(false);
            setRenewingAMC(null);
          }}
          onSuccess={() => fetchData()}
          amcContract={renewingAMC}
          token={token}
          baseUrl={BASE_API}
        />
      </div>
    </Base>
  );
}
