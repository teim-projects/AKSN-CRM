import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import Base from "../Base";
import TableView from "../TableView";
import { MdAdd, MdEdit, MdDelete, MdFilterList, MdVisibility } from "react-icons/md";
import AdvancedTableFilter from "../AdvancedTableFilter";
import { useUserRole } from "../../hooks/useAuth";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function TermsCategoriesList() {
  const { hasPermission } = useUserRole(BASE_API);
  const canCreateTerm = hasPermission("terms", "create");
  const canEditTerm = hasPermission("terms", "edit");
  const canDeleteTerm = hasPermission("terms", "delete");
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Expanded row state for viewing terms
  const [openRow, setOpenRow] = useState(null);
  
  // Terms pagination state for each category
  const [termsPagination, setTermsPagination] = useState({});
  const TERMS_PER_PAGE = 5;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`quotation/term-categories/`);
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      
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
  }, [itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setRows(filteredData);
    setTotalCount(filteredData.length);
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
    setCurrentPage(1);
  }, [filteredData, itemsPerPage]);

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Delete Category?",
      text: "All terms under this category will also be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b"
    });
    if (!res.isConfirmed) return;

    try {
      await api.delete(`quotation/term-categories/${id}/`);
      Swal.fire({ icon: "success", text: "Category deleted", timer: 1000, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  const handleDeleteTerm = async (categoryId, termId) => {
    const res = await Swal.fire({
      title: "Delete Term?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b"
    });
    if (!res.isConfirmed) return;

    try {
      await api.delete(`quotation/terms/${termId}/`);
      Swal.fire({ icon: "success", text: "Term deleted", timer: 1000, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  // Get paginated terms for a category
  const getPaginatedTerms = useCallback((categoryId, terms) => {
    const currentTermPage = termsPagination[categoryId] || 1;
    const startIndex = (currentTermPage - 1) * TERMS_PER_PAGE;
    const endIndex = startIndex + TERMS_PER_PAGE;
    const paginatedTerms = terms.slice(startIndex, endIndex);
    const totalTermPages = Math.max(1, Math.ceil(terms.length / TERMS_PER_PAGE));
    
    return {
      terms: paginatedTerms,
      currentPage: currentTermPage,
      totalPages: totalTermPages,
      totalTerms: terms.length
    };
  }, [termsPagination]);

  // Handle terms page change
  const handleTermsPageChange = useCallback((categoryId, newPage) => {
    setTermsPagination(prev => ({
      ...prev,
      [categoryId]: newPage
    }));
  }, []);

  const getCurrentPageData = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return rows.slice(startIndex, startIndex + itemsPerPage);
  }, [rows, currentPage, itemsPerPage]);

  const columns = [
    {
      key: "sr",
      label: "Sr.No",
      render: (_, idx) => (
        <span className="text-slate-400 font-medium text-[10px] py-0 whitespace-nowrap block">
          {(currentPage - 1) * itemsPerPage + (idx + 1)}
        </span>
      ),
      className: "w-14 whitespace-nowrap",
    },
    {
      key: "name",
      label: "Category Name",
      render: (r) => (
        <span
          className="text-slate-800 font-semibold text-xs tracking-tight py-0 block max-w-[160px] truncate mx-auto cursor-default"
          title={r.name || ""}
        >
          {r.name || "-"}
        </span>
      ),
      className: "min-w-[130px] max-w-[170px]",
    },
    {
      key: "description",
      label: "Description",
      render: (r) => (
        <span
          className="text-slate-600 text-xs py-0 block truncate max-w-[220px] mx-auto cursor-default"
          title={r.description || ""}
        >
          {r.description || "-"}
        </span>
      ),
      className: "min-w-[150px] max-w-[240px]",
    },
    {
      key: "terms_count",
      label: "Total Terms",
      render: (r) => (
        <span
          className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 whitespace-nowrap"
          title={`Total: ${r.terms_count || 0}`}
        >
          {r.terms_count || 0}
        </span>
      ),
      className: "w-28 whitespace-nowrap",
    },
    {
      key: "is_active",
      label: "Status",
      render: (r) => (
        <span
          className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap inline-block ${
            r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}
          title={r.is_active ? 'Active' : 'Inactive'}
        >
          {r.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      className: "w-24 whitespace-nowrap",
    },
  ];

  const actionsRenderer = useCallback((row) => (
    <div className="flex items-center justify-center gap-1.5 py-0 whitespace-nowrap">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenRow(openRow === row.id ? null : row.id);
          if (openRow !== row.id) {
            setTermsPagination(prev => ({
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
        title="View Terms"
      >
        <MdVisibility size={16} />
      </button>
      {canCreateTerm && (
        <button
          onClick={() => navigate(`/terms/add-term?category=${row.id}`)}
          className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
          title="Add Term"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
      {canEditTerm && (
        <button
          onClick={() => navigate(`/terms/edit-category/${row.id}`)}
          className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
          title="Edit Category"
        >
          <MdEdit size={16} />
        </button>
      )}
      {canDeleteTerm && (
        <button
          onClick={() => handleDelete(row.id)}
          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
          title="Delete Category"
        >
          <MdDelete size={16} />
        </button>
      )}
    </div>
  ), [openRow, navigate, handleDelete, canCreateTerm, canEditTerm, canDeleteTerm]);

  const renderExpandedRow = useCallback((row) => {
    if (openRow !== row.id) return null;

    const activeTerms = row.terms?.filter((t) => t.is_active) || [];
    const { terms: paginatedTerms, currentPage: termPage, totalPages: termTotalPages, totalTerms } = getPaginatedTerms(row.id, activeTerms);

    return (
      <tr key={`expanded-${row.id}`} className="bg-slate-50/70 border-b">
        <td colSpan={columns.length + 1} className="py-3 px-6">
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
            <div className="font-bold text-slate-800 text-xs mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                Terms under this category ({totalTerms} total)
              </div>
              {totalTerms > TERMS_PER_PAGE && (
                <span className="text-[10px] text-slate-400 font-medium">
                  Showing {((termPage - 1) * TERMS_PER_PAGE) + 1} to {Math.min(termPage * TERMS_PER_PAGE, totalTerms)} of {totalTerms}
                </span>
              )}
            </div>

            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-1.5 text-left">#</th>
                  <th className="px-3 py-1.5 text-left">Term Name</th>
                  <th className="px-3 py-1.5 text-left">Description</th>
                  <th className="px-3 py-1.5 text-center">Default</th>
                  <th className="px-3 py-1.5 text-center">Status</th>
                  <th className="px-3 py-1.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTerms.map((term, idx) => {
                  const globalIndex = ((termPage - 1) * TERMS_PER_PAGE) + idx + 1;
                  return (
                    <tr key={term.id} className="hover:bg-slate-50/50 h-9">
                      <td className="px-3 py-1 text-slate-400 whitespace-nowrap">{globalIndex}</td>
                      <td className="px-3 py-1 font-medium text-slate-800">
                        <span className="block truncate max-w-[160px] cursor-default" title={term.name}>
                          {term.name}
                        </span>
                      </td>
                      <td className="px-3 py-1 text-slate-600">
                        <span className="block truncate max-w-[240px] cursor-default" title={term.description || ""}>
                          {term.description || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-1 text-center whitespace-nowrap">
                        {term.is_default ? (
                          <span className="text-emerald-600 font-bold" title="Default">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-1 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap inline-block ${
                            term.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}
                          title={term.is_active ? 'Active' : 'Inactive'}
                        >
                          {term.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-1 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/terms/edit-term/${term.id}`)}
                            className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded text-xs transition-colors"
                            title="Edit Term"
                          >
                            <MdEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTerm(openRow, term.id)}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-xs transition-colors"
                            title="Delete Term"
                          >
                            <MdDelete size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {paginatedTerms.length === 0 && (
              <div className="p-3 text-center text-slate-400 text-xs">
                No terms found in this category.
              </div>
            )}

            {totalTerms > TERMS_PER_PAGE && (
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[10px] text-slate-400">
                  Page {termPage} of {termTotalPages}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTermsPageChange(row.id, Math.max(1, termPage - 1))}
                    disabled={termPage === 1}
                    className="px-2 py-1 rounded border border-slate-200 bg-white text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleTermsPageChange(row.id, Math.min(termTotalPages, termPage + 1))}
                    disabled={termPage === termTotalPages}
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
  }, [openRow, columns.length, navigate, handleDeleteTerm, getPaginatedTerms, handleTermsPageChange, TERMS_PER_PAGE]);

  const currentPageData = getCurrentPageData();

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                Terms & Conditions Categories
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Loading..." : `Total ${totalCount} categories found`}
              </p>
            </div>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-3">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-3.5 py-1.5 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <MdFilterList className="text-slate-400" />
              Filter
            </button>
            {canCreateTerm && (
              <button
                onClick={() => navigate("/terms/add-category")}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <MdAdd className="text-sm" />
                Add Category
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
            emptyMessage="No categories found. Create your first category!"
            rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150"}
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
    </Base>
  );
}