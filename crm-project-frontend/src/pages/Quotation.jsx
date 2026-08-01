import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import TableView from "../components/TableView";
import AddQuotation from "../components/quotations/AddQuotation";
import { MdAdd, MdFilterList, MdHistory, MdEdit, MdDelete, MdRemoveRedEye, MdDownload, MdEmail } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import Swal from "sweetalert2";
import AdvancedTableFilter from "../components/AdvancedTableFilter";
import axios from "axios";
import { useUserRole } from '../hooks/useAuth';

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

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Version history expanded row state
  const [openRow, setOpenRow] = useState(null);

  // ✅ Version pagination state for each quotation
  const [versionPagination, setVersionPagination] = useState({});
  const VERSIONS_PER_PAGE = 5;

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

      const data = normalize(res.data);
      
      setAllRows(data);
      setFilteredData(data);
      setRows(data);
      setTotalCount(data.length);
      setTotalPages(Math.max(1, Math.ceil(data.length / itemsPerPage)));
      setCurrentPage(1);
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

  const getProductCount = (version) => {
    if (!version?.items) return "0";
    return version.items.length;
  };

  const columns = [
    { 
      key: "sr", 
      label: "Sr.No", 
      render: (_, idx) => <span className="text-slate-600 font-medium text-xs py-0.5 block">{(currentPage - 1) * itemsPerPage + (idx + 1)}</span> 
    },
    { 
      key: "quotation_no", 
      label: "Quotation No", 
      render: (r) => <span className="text-blue-600 font-bold text-xs whitespace-nowrap py-0.5 block">{r.quotation_no || "-"}</span> 
    },
    { 
      key: "company_name", 
      label: "Company Name", 
      render: (r) => (
        <span className="text-slate-900 font-semibold text-xs tracking-tight py-0.5 block whitespace-nowrap">
          {r.company_name || "-"}
        </span>
      ) 
    },
    { 
      key: "contact", 
      label: "Contact", 
      render: (r) => <span className="text-slate-700 text-xs py-0.5 block whitespace-nowrap">{r.contact_person || "-"}</span> 
    },
    { 
      key: "mobile", 
      label: "Mobile", 
      render: (r) => <span className="text-slate-700 font-medium text-xs whitespace-nowrap py-0.5 block">{r.mobile_number || "-"}</span> 
    },
    { 
      key: "version", 
      label: "Version", 
      render: (r) => {
        const activeVersion = getActiveVersion(r);
        return <span className="text-slate-700 text-xs py-0.5 block font-medium whitespace-nowrap">{activeVersion?.version_no || "v1"}</span>;
      } 
    },
    { 
      key: "products", 
      label: "Products", 
      render: (r) => {
        const activeVersion = getActiveVersion(r);
        return <span className="text-slate-700 text-xs py-0.5 block whitespace-nowrap">{getProductCount(activeVersion)} item(s)</span>;
      } 
    },
    { 
      key: "total_amount", 
      label: "Total Amount", 
      render: (r) => {
        const activeVersion = getActiveVersion(r);
        return <span className="text-slate-900 font-bold text-xs py-0.5 block whitespace-nowrap">₹{formatAmount(activeVersion?.grand_total || activeVersion?.total_amount)}</span>;
      } 
    },
    { 
      key: "date", 
      label: "Date", 
      render: (r) => <span className="text-slate-600 text-xs whitespace-nowrap py-0.5 block">{formatDate(r.created_at)}</span> 
    },
  ];

  const actionsRenderer = useCallback((row) => {
    const activeVersion = getActiveVersion(row);
    const isLatest = activeVersion?.is_active;

    return (
      <div className="flex items-center justify-center gap-1 py-0.5">
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
          className={`p-1 rounded transition-all duration-150 text-sm shadow-xs ${
            openRow === row.id
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
            onClick={() => { 
              setEditingQuotation(row); 
              setShowQuotationForm(true); 
            }}
            className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
            title="Edit Record"
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
          className="p-1 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded transition-all duration-150 text-sm shadow-xs"
          title="WhatsApp"
        >
          <FaWhatsapp />
        </button>

        <button
          className="p-1 bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 rounded transition-all duration-150 text-sm shadow-xs"
          title="Email"
        >
          <MdEmail />
        </button>

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
  }, [openRow, handleDelete, canEditQuotation, canDeleteQuotation]);

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
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">
                        {v.created_at?.split("T")[0]}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">
                        {v.items?.length || 0} item(s)
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                        ₹{formatAmount(v.grand_total || v.total_amount)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {isActive ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-medium uppercase tracking-wider">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
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
  }, [openRow, columns.length, handleDeleteVersion, getPaginatedVersions, handleVersionPageChange, VERSIONS_PER_PAGE]);

  const currentPageData = getCurrentPageData();

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 -mt-5 px-1">
        
        {/* HEADER BLOCK */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Quotation Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Synchronizing quotation records..." : `Total ${totalCount} records identified`}
              </p>
            </div>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-3">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <MdFilterList className="text-slate-400" />
              Filter
            </button>
            {canCreateQuotation && (
              <button
                onClick={() => { setEditingQuotation(null); setShowQuotationForm(true); }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <MdAdd className="text-sm" />
                Add Quotation
              </button>
            )}
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
          />
        </div>
      </div>

      {/* FILTER DRAWER */}
      {isFilterOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[999]" 
          onClick={() => setIsFilterOpen(false)} 
        />
      )}
      
      <div className={`fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-[1000] transition-transform duration-300 ease-in-out ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Filters</h3>
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
    </Base>
  );
}