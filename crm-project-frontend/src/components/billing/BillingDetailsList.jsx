import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";
import Base from "../Base";
import TableView from "../TableView";
import AdvancedTableFilter from "../AdvancedTableFilter";
import AddBillingDetailModal from "./AddBillingDetailModal";
import CardAndQrPreviewModal from "./CardAndQrPreviewModal";
import {
  MdEdit,
  MdDelete,
  MdOutlineRemoveRedEye,
  MdAdd,
  MdFilterList,
  MdDownload,
  MdStar,
  MdStarBorder
} from "react-icons/md";
import {
  Building2,
  Copy,
  Check,
  Eye,
  EyeOff,
  QrCode,
  Landmark
} from "lucide-react";
import { useUserRole } from "../../hooks/useAuth";
import { exportToExcel, formatExcelDate } from "../../utils/excelExport";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function BillingDetailsList() {
  const { hasPermission } = useUserRole(BASE_API);
  const canCreate = hasPermission("billing", "create");
  const canEdit = hasPermission("billing", "edit");
  const canDelete = hasPermission("billing", "delete");

  const [allRows, setAllRows] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter Drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewAccount, setPreviewAccount] = useState(null);

  // Mask & copy tracking
  const [revealedNumbers, setRevealedNumbers] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("quotation/billing-details/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const normalized = data.map((r) => ({
        ...r,
        status: r.is_active ? "Active" : "Inactive",
        is_active_text: r.is_active ? "Active" : "Inactive",
        primary_status: r.is_default ? "Primary" : "Secondary",
        is_default_text: r.is_default ? "Primary" : "Secondary",
      }));
      setAllRows(normalized);
      setFilteredData(normalized);
      setRows(normalized);
      setTotalCount(normalized.length);
      setTotalPages(Math.max(1, Math.ceil(normalized.length / itemsPerPage)));
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
  }, [itemsPerPage]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setRows(filteredData);
    setTotalCount(filteredData.length);
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
    setCurrentPage(1);
  }, [filteredData, itemsPerPage]);

  // Columns dedicated for AdvancedTableFilter dropdown
  const filterColumns = useMemo(
    () => [
      { key: "bank_name", label: "Bank Name" },
      { key: "account_holder_name", label: "Beneficiary Name" },
      { key: "account_number", label: "Account Number" },
      { key: "account_type", label: "Account Type" },
      { key: "ifsc_code", label: "IFSC Code" },
      { key: "branch_name", label: "Branch" },
      { key: "upi_id", label: "UPI ID" },
      { key: "company_name", label: "Company Name" },
      { key: "gst_number", label: "GSTIN" },
      { key: "pan_number", label: "PAN" },
      { key: "status", label: "Status (Active/Inactive)" },
      { key: "primary_status", label: "Primary Account" },
    ],
    []
  );

  const getCurrentPageData = () => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return rows.slice(startIdx, startIdx + itemsPerPage);
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  const toggleMask = (id) => {
    setRevealedNumbers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskAccountNumber = (num = "", revealed = false) => {
    if (revealed || !num || num.length <= 4) return num;
    const last4 = num.slice(-4);
    const masked = "•".repeat(Math.min(num.length - 4, 8));
    return `${masked} ${last4}`;
  };

  const handleSetDefault = async (account) => {
    if (account.is_default) return;
    try {
      await api.post(`quotation/billing-details/${account.id}/set-default/`);
      Swal.fire({
        icon: "success",
        title: "Primary Account Updated",
        text: `${account.bank_name} is now the default billing account.`,
        timer: 1600,
        showConfirmButton: false,
      });
      fetchAccounts();
    } catch (err) {
      console.error("Set default error:", err);
      Swal.fire({ icon: "error", title: "Action Failed", text: "Could not set primary account." });
    }
  };

  const handleToggleStatus = async (account) => {
    try {
      await api.post(`quotation/billing-details/${account.id}/toggle-status/`);
      fetchAccounts();
    } catch (err) {
      console.error("Status toggle failed:", err);
      Swal.fire({ icon: "error", title: "Update Failed", text: "Could not change account status." });
    }
  };

  const handleDelete = async (id) => {
    const target = allRows.find((r) => r.id === id);
    const result = await Swal.fire({
      title: "Delete Billing Account?",
      html: `Are you sure you want to delete <b>${target?.bank_name || "this account"}</b>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`quotation/billing-details/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Account deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchAccounts();
    } catch (err) {
      console.error("Delete error:", err);
      Swal.fire({ icon: "error", title: "Delete Failed", text: "Could not delete this billing account." });
    }
  };

  const handleExportExcel = () => {
    const dataToExport = rows && rows.length > 0 ? rows : allRows;
    const formatted = dataToExport.map((r, idx) => ({
      "Sr No": idx + 1,
      "Bank Name": r.bank_name || "-",
      "Beneficiary Name": r.account_holder_name || "-",
      "Account Number": r.account_number || "-",
      "Account Type": r.account_type || "Current",
      "IFSC Code": r.ifsc_code || "-",
      "Branch": r.branch_name || "-",
      "UPI ID": r.upi_id || "-",
      "SWIFT Code": r.swift_code || "-",
      "Company Name": r.company_name || "-",
      "GSTIN": r.gst_number || "-",
      "PAN": r.pan_number || "-",
      "Primary Account": r.is_default ? "Yes" : "No",
      "Active": r.is_active ? "Yes" : "No",
      "Created At": formatExcelDate(r.created_at),
    }));

    exportToExcel({
      data: formatted,
      fileName: "Billing_Details_Master",
      sheetName: "BillingAccounts",
    });
  };

  // Table Columns Definition
  const columns = useMemo(
    () => [
      {
        key: "sr_no",
        label: "Sr No",
        className: "w-12 text-center text-xs text-slate-500",
        render: (_row, idx) => (currentPage - 1) * itemsPerPage + idx + 1,
      },
      {
        key: "bank_name",
        label: "Bank Name",
        className: "text-left min-w-[170px]",
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Landmark className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <span>{row.bank_name}</span>
                {row.is_default && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <MdStar className="w-2.5 h-2.5 text-amber-500" /> Primary
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {row.branch_name ? `${row.branch_name} Branch` : "Main Branch"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "account_holder_name",
        label: "Beneficiary / A/C Name",
        className: "text-left text-xs font-medium text-slate-800 min-w-[160px]",
        render: (row) => row.account_holder_name || "-",
      },
      {
        key: "account_number",
        label: "Account Number",
        className: "text-center min-w-[150px]",
        render: (row) => {
          const isRevealed = Boolean(revealedNumbers[row.id]);
          return (
            <div className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-800">
              <span>{maskAccountNumber(row.account_number, isRevealed)}</span>
              <button
                type="button"
                onClick={() => toggleMask(row.id)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title={isRevealed ? "Hide Number" : "Show Number"}
              >
                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(row.account_number, `acc_${row.id}`)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Copy Account Number"
              >
                {copiedKey === `acc_${row.id}` ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          );
        },
      },
      {
        key: "account_type",
        label: "Type",
        className: "text-center text-xs",
        render: (row) => (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
            {row.account_type || "Current"}
          </span>
        ),
      },
      {
        key: "ifsc_code",
        label: "IFSC Code",
        className: "text-center min-w-[110px]",
        render: (row) => (
          <div className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-800">
            <span>{row.ifsc_code || "-"}</span>
            {row.ifsc_code && (
              <button
                type="button"
                onClick={() => copyToClipboard(row.ifsc_code, `ifsc_${row.id}`)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Copy IFSC Code"
              >
                {copiedKey === `ifsc_${row.id}` ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        ),
      },
      {
        key: "upi_id",
        label: "UPI ID",
        className: "text-center min-w-[140px]",
        render: (row) =>
          row.upi_id ? (
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
              <span className="truncate max-w-[140px]">{row.upi_id}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(row.upi_id, `upi_${row.id}`)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Copy UPI ID"
              >
                {copiedKey === `upi_${row.id}` ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-slate-400 text-xs">-</span>
          ),
      },
      {
        key: "qr_code",
        label: "QR Code",
        className: "text-center w-16",
        render: (row) => {
          const qrSrc = row.qr_code_url || row.qr_code;
          return qrSrc ? (
            <button
              type="button"
              onClick={() => {
                setPreviewAccount(row);
                setShowPreviewModal(true);
              }}
              className="p-1 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50 transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
              title="Click to view Card & QR Code"
            >
              <img src={qrSrc} alt="QR" className="w-6 h-6 object-contain rounded" />
            </button>
          ) : (
            <span className="text-slate-300 text-[10px]">No QR</span>
          );
        },
      },
      {
        key: "is_active",
        label: "Status",
        className: "text-center w-20",
        render: (row) => (
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            disabled={!canEdit}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer disabled:cursor-default ${
              row.is_active
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
            }`}
            title={row.is_active ? "Click to deactivate" : "Click to activate"}
          >
            {row.is_active ? "Active" : "Inactive"}
          </button>
        ),
      },
    ],
    [currentPage, itemsPerPage, revealedNumbers, copiedKey, canEdit]
  );

  // Table Action Column Renderer (View Card & QR, Make Primary, Edit, Delete)
  const actionsRenderer = useCallback(
    (row) => (
      <div className="flex items-center justify-center gap-1.5">
        {/* OPTION TO VIEW CARD AND QR CODE PREVIEW */}
        <button
          type="button"
          onClick={() => {
            setPreviewAccount(row);
            setShowPreviewModal(true);
          }}
          className="p-1 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="View Bank Card & QR Preview"
        >
          <MdOutlineRemoveRedEye />
        </button>

        {/* MAKE PRIMARY / DEFAULT */}
        {canEdit && !row.is_default && (
          <button
            type="button"
            onClick={() => handleSetDefault(row)}
            className="p-1 bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-600 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
            title="Designate as Primary Account"
          >
            <MdStarBorder />
          </button>
        )}

        {/* EDIT BUTTON (OPENS POPUP FORM) */}
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setEditingAccount(row);
              setShowFormModal(true);
            }}
            className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
            title="Edit Billing Details"
          >
            <MdEdit />
          </button>
        )}

        {/* DELETE BUTTON */}
        {canDelete && (
          <button
            type="button"
            onClick={() => handleDelete(row.id)}
            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
            title="Delete Record"
          >
            <MdDelete />
          </button>
        )}
      </div>
    ),
    [canEdit, canDelete]
  );

  const currentPageData = getCurrentPageData();

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">
        {/* HEADER BLOCK WITH BLUE VERTICAL ACCENT LINE */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                Billing Details Master
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading
                  ? "Synchronizing billing records..."
                  : `Total ${totalCount} bank and billing records identified`}
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2 sm:gap-3">
            {/* FILTER BUTTON */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <MdFilterList className="text-slate-400" />
              Filter
            </button>

            {/* EXPORT EXCEL BUTTON */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Export Billing Details to Excel"
            >
              <MdDownload className="text-emerald-600 text-sm" />
              Export
            </button>

            {/* ADD BILLING DETAILS POPUP BUTTON */}
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(null);
                  setShowFormModal(true);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add Billing Details
              </button>
            )}
          </div>
        </div>

        {/* COMPACT DATA TABLE */}
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
            emptyMessage="No billing account records match the active criteria filters"
          />
        </div>
      </div>

      {/* FILTER DRAWER - PORTAL TO BODY */}
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
                  type="button"
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
                  columns={filterColumns}
                />
              </div>
            </div>
          </>,
          document.body
        )}

      {/* ADD / EDIT POPUP MODAL */}
      <AddBillingDetailModal
        open={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        baseApi={BASE_API}
        onSuccess={() => {
          fetchAccounts();
          setShowFormModal(false);
          setEditingAccount(null);
        }}
      />

      {/* CARD & QR CODE PREVIEW MODAL */}
      <CardAndQrPreviewModal
        open={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewAccount(null);
        }}
        account={previewAccount}
      />
    </Base>
  );
}
