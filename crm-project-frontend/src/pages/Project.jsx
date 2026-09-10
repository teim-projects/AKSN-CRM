import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import Base from "../components/Base";
import TableView from "../components/TableView";
import { MdEdit, MdDelete, MdOutlineRemoveRedEye, MdFilterList, MdAdd, MdZoomIn, MdHandshake, MdMail } from "react-icons/md";
import Swal from "sweetalert2";
import AddProjectForm from "../components/projects/AddProjectForm";
import AddAMCContractForm from "../components/amc/AddAMCContractForm";
import RecordViewer from "../components/RecordViewer";
import AdvancedTableFilter from "../components/AdvancedTableFilter";
import SendMessageModal from "../components/templates/SendMessageModal";
import { useUserRole } from "../hooks/useAuth";

export default function Project() {
  const [searchParams, setSearchParams] = useSearchParams();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API.replace(/\/$/, "")}/lead/projects/`;

  const { hasPermission } = useUserRole(BASE_API);
  const canCreateProject = hasPermission("projects", "create");
  const canEditProject = hasPermission("projects", "edit");
  const canDeleteProject = hasPermission("projects", "delete");
  const canCreateAMC = hasPermission("amc", "create");

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [showAMCForm, setShowAMCForm] = useState(false);
  const [amcProject, setAmcProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  // Record Viewer
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Send Message Modal state
  const [sendMessageModalOpen, setSendMessageModalOpen] = useState(false);
  const [selectedMessageRecord, setSelectedMessageRecord] = useState(null);

  // Filter
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  const [highlightedProjectId, setHighlightedProjectId] = useState(null);

  // Highlight target project row and paginate when redirected from notification (without auto-opening record viewer)
  useEffect(() => {
    const targetProjectId = searchParams.get("projectId") || searchParams.get("id");
    if (targetProjectId) {
      setHighlightedProjectId(targetProjectId);
      if (allRows.length > 0) {
        const itemIdx = allRows.findIndex((r) => String(r.id) === String(targetProjectId));
        if (itemIdx !== -1) {
          const pageNum = Math.floor(itemIdx / itemsPerPage) + 1;
          setCurrentPage(pageNum);
        }
      }
    }
  }, [searchParams, allRows, itemsPerPage]);

  // Clear highlight and remove query parameters when user clicks anywhere on screen
  useEffect(() => {
    if (!highlightedProjectId) return;

    const handleScreenClick = () => {
      if (window._lastNotificationClickTime && Date.now() - window._lastNotificationClickTime < 600) {
        return;
      }
      setHighlightedProjectId(null);
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
  }, [highlightedProjectId]);

  const token = useMemo(
    () =>
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "",
    []
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_URL}?limit=1000`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        customer_name:
          r.customer_details?.company_name ||
          r.customer_details?.name ||
          (typeof r.customer === "string" ? r.customer : ""),
        project_executive_name:
          r.project_executive_details?.full_name ||
          r.project_executive_details?.name ||
          r.project_executive_details?.username ||
          "",
        amc_dates:
          r.amc_start_date && r.amc_end_date
            ? `${r.amc_start_date} to ${r.amc_end_date}`
            : r.amc_start_date || r.amc_end_date || "",
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
  }, [API_URL, token, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setRows(filteredData);
    setTotalCount(filteredData.length);
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
    if (!window.location.search.includes("projectId") && !window.location.search.includes("id=") && !window.location.search.includes("highlight")) {
      setCurrentPage(1);
    }
  }, [filteredData, itemsPerPage]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This project will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete project");
      }

      Swal.fire("Deleted!", "Project has been deleted.", "success");
      fetchData();
    } catch (err) {
      Swal.fire("Error", err.message || "Failed to delete project", "error");
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

  const getStageBadgeColor = (stage) => {
    switch (stage) {
      case "requirement_analysis":
        return "bg-blue-100 text-blue-700";
      case "installation":
        return "bg-purple-100 text-purple-700";
      case "data_migration":
        return "bg-amber-100 text-amber-700";
      case "customization":
        return "bg-indigo-100 text-indigo-700";
      case "training":
        return "bg-cyan-100 text-cyan-700";
      case "uat":
        return "bg-orange-100 text-orange-700";
      case "go_live":
        return "bg-emerald-100 text-emerald-700 font-bold";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case "critical":
        return "bg-rose-100 text-rose-700 font-bold";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "medium":
        return "bg-amber-100 text-amber-700";
      case "low":
        return "bg-slate-100 text-slate-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const [productList, setProductList] = useState([]);

  useEffect(() => {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    fetch(`${BASE_API}/product/products/?limit=1000`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setProductList(list);
      })
      .catch(() => setProductList([]));
  }, [BASE_API, token]);

  const resolveProductName = useCallback((item) => {
    if (!item) return "";
    const found = productList.find(
      (p) => String(p.id) === String(item) || String(p.name).toLowerCase() === String(item).toLowerCase()
    );
    return found ? (found.name || found.product_name || `Product #${found.id}`) : String(item);
  }, [productList]);

  const columns = [
    {
      key: "sr",
      label: "Sr.No",
      render: (_, idx) => (
        <span className="text-slate-600 font-medium text-xs whitespace-nowrap block">
          {(currentPage - 1) * itemsPerPage + (idx + 1)}
        </span>
      ),
      className: "w-14 whitespace-nowrap",
    },
    {
      key: "project_code",
      label: "Project Code",
      render: (r) => {
        const code = r.project_code || `#${r.id}`;
        return (
          <span className="font-bold text-blue-600 text-xs whitespace-nowrap block" title={code}>
            {code}
          </span>
        );
      },
      className: "w-28 whitespace-nowrap",
    },
    {
      key: "customer",
      label: "Customer",
      render: (r) => {
        const name = r.customer_details?.company_name || r.customer_details?.name || r.customer || "-";
        return (
          <span
            className="text-slate-900 font-semibold text-xs tracking-tight block max-w-[150px] truncate mx-auto cursor-default"
            title={name}
          >
            {name}
          </span>
        );
      },
      className: "w-44 min-w-[130px] max-w-[160px]",
    },
    {
      key: "product",
      label: "Product(s)",
      render: (r) => {
        const rawProds = Array.isArray(r.product) ? r.product : r.product ? [r.product] : [];
        if (rawProds.length === 0) return <span className="text-slate-400 text-xs whitespace-nowrap block">-</span>;
        const resolvedNames = rawProds.map(resolveProductName).filter(Boolean).join(", ");
        return (
          <span className="text-slate-700 text-xs block truncate max-w-[140px] mx-auto cursor-default" title={resolvedNames}>
            {resolvedNames || "-"}
          </span>
        );
      },
      className: "w-36 max-w-[150px]",
    },
    {
      key: "project_executive",
      label: "Executive",
      render: (r) => {
        const execName = r.project_executive_details?.full_name || r.project_executive_details?.name || r.project_executive_details?.username || "-";
        return (
          <span className="text-slate-600 text-xs block max-w-[130px] truncate mx-auto cursor-default" title={execName}>
            {execName}
          </span>
        );
      },
      className: "w-32 max-w-[140px]",
    },
    {
      key: "project_stage",
      label: "Stage",
      render: (r) => {
        const stage = r.project_stage_display || r.project_stage || "Requirement Analysis";
        return (
          <span
            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap inline-block ${getStageBadgeColor(
              r.project_stage
            )}`}
            title={stage}
          >
            {stage}
          </span>
        );
      },
      className: "w-36 whitespace-nowrap",
    },
    {
      key: "priority",
      label: "Priority",
      render: (r) => {
        const priority = r.priority_display || r.priority || "Medium";
        return (
          <span
            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap inline-block ${getPriorityBadgeColor(
              r.priority
            )}`}
            title={priority}
          >
            {priority}
          </span>
        );
      },
      className: "w-24 whitespace-nowrap",
    },
    {
      key: "expected_to_go_live",
      label: "Go Live Date",
      render: (r) => {
        const d = formatDate(r.expected_to_go_live);
        return (
          <span className="text-slate-600 text-xs whitespace-nowrap block" title={d}>
            {d}
          </span>
        );
      },
      className: "w-28 whitespace-nowrap",
    },
    {
      key: "project_value",
      label: "Value (₹)",
      render: (r) => {
        const valText = r.project_value
          ? `₹${parseFloat(r.project_value).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`
          : "—";
        return (
          <span className="text-slate-900 font-semibold text-xs whitespace-nowrap block" title={valText}>
            {valText}
          </span>
        );
      },
      className: "w-28 whitespace-nowrap",
    },
    {
      key: "amc_dates",
      label: "AMC Period",
      render: (r) => {
        if (!r.amc_start_date && !r.amc_end_date) {
          return <span className="text-slate-400 text-xs whitespace-nowrap block italic">No AMC</span>;
        }
        const amcText = `${formatDate(r.amc_start_date)} - ${formatDate(r.amc_end_date)}`;
        return (
          <span className="text-slate-700 text-xs whitespace-nowrap block" title={`AMC Period: ${amcText}`}>
            {amcText}
          </span>
        );
      },
      className: "w-36 whitespace-nowrap",
    },
  ];

  const actionsRenderer = (row) => (
    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
      {/* Record Viewer */}
      <button
        onClick={() => {
          setSelectedProject(row);
          setViewOpen(true);
        }}
        className="p-1 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
        title="View Full Record"
      >
        <MdZoomIn />
      </button>

      {/* Details Modal */}
      <button
        onClick={() => setViewingProject(row)}
        className="p-1 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
        title="View Details"
      >
        <MdOutlineRemoveRedEye />
      </button>

      {/* Add to AMC */}
      {canCreateAMC && (
        <button
          onClick={() => {
            setAmcProject(row);
            setShowAMCForm(true);
          }}
          className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded transition-all duration-150 text-sm shadow-xs cursor-pointer"
          title="Add to AMC Contract"
        >
          <MdHandshake />
        </button>
      )}

      {/* Send Message */}
      <button
        onClick={() => {
          setSelectedMessageRecord(row);
          setSendMessageModalOpen(true);
        }}
        className="p-1 bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
        title="Send Email / WhatsApp"
      >
        <MdMail />
      </button>

      {/* Edit */}
      {canEditProject && (
        <button
          onClick={() => {
            setEditingProject(row);
            setShowProjectForm(true);
          }}
          className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="Edit Project"
        >
          <MdEdit />
        </button>
      )}

      {/* Delete */}
      {canDeleteProject && (
        <button
          onClick={() => handleDelete(row.id)}
          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="Delete Project"
        >
          <MdDelete />
        </button>
      )}
    </div>
  );

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return rows.slice(start, start + itemsPerPage);
  };

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">
        {/* HEADER BLOCK WITH BLUE ACCENT */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Project Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Loading project records..." : `Total ${totalCount} projects identified across accounts`}
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-3">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <MdFilterList className="text-slate-400" />
              Filter
            </button>

            {canCreateProject && (
              <button
                onClick={() => {
                  setEditingProject(null);
                  setShowProjectForm(true);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Project
              </button>
            )}
          </div>
        </div>

        {/* PROJECT TABLE VIEW */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <TableView
            columns={columns}
            rows={getCurrentPageData()}
            loading={loading}
            error={error}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => {
              if (p < 1 || p > totalPages) return;
              setCurrentPage(p);
            }}
            pageSize={itemsPerPage}
            actions={actionsRenderer}
            emptyMessage="No project records found."
            rowClassName={(row) => highlightedProjectId && String(row.id) === String(highlightedProjectId) ? "!bg-blue-100/90 font-bold border-l-4 border-l-blue-600 ring-2 ring-blue-400/60 shadow-md animate-pulse" : "hover:bg-slate-50/80 transition-colors duration-150"}
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

        {/* ADD / EDIT PROJECT FORM MODAL */}
        <AddProjectForm
          open={showProjectForm}
          onClose={() => {
            setShowProjectForm(false);
            setEditingProject(null);
          }}
          onSuccess={() => fetchData()}
          project={editingProject}
        />

        {/* ADD AMC CONTRACT FROM PROJECT MODAL */}
        <AddAMCContractForm
          open={showAMCForm}
          onClose={() => {
            setShowAMCForm(false);
            setAmcProject(null);
          }}
          initialProject={amcProject}
        />

        {/* RECORD VIEWER MODAL */}
        <RecordViewer
          isOpen={viewOpen}
          onClose={() => {
            setViewOpen(false);
            setSelectedProject(null);
          }}
          record={selectedProject}
          title="Project Details"
        />

        {/* PROJECT DETAILS MODAL */}
        {viewingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative">
              <button
                onClick={() => setViewingProject(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>

              <h2 className="text-lg font-bold text-slate-900 border-b pb-3 mb-4">
                Project Details — {viewingProject.project_code || `#${viewingProject.id}`}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block">Customer:</span>
                  <span className="text-slate-900 font-bold">
                    {viewingProject.customer_details?.company_name || viewingProject.customer_details?.name || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Project Executive:</span>
                  <span className="text-slate-900">
                    {viewingProject.project_executive_details?.full_name || viewingProject.project_executive_details?.name || viewingProject.project_executive_details?.username || "—"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Current Stage:</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStageBadgeColor(viewingProject.project_stage)}`}>
                    {viewingProject.project_stage_display || viewingProject.project_stage}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Priority:</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getPriorityBadgeColor(viewingProject.priority)}`}>
                    {viewingProject.priority_display || viewingProject.priority}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Start Date:</span>
                  <span className="text-slate-800 font-medium">{formatDate(viewingProject.start_date)}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Expected Go Live:</span>
                  <span className="text-slate-800 font-medium">{formatDate(viewingProject.expected_to_go_live)}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">AMC Start Date:</span>
                  <span className="text-slate-800 font-medium">{formatDate(viewingProject.amc_start_date)}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">AMC End Date:</span>
                  <span className="text-slate-800 font-medium">{formatDate(viewingProject.amc_end_date)}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">No. of Users:</span>
                  <span className="text-slate-800">{viewingProject.no_of_user || "—"}</span>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 block">Project Value:</span>
                  <span className="text-slate-900 font-bold">
                    {viewingProject.project_value ? `₹${parseFloat(viewingProject.project_value).toLocaleString("en-IN")}` : "—"}
                  </span>
                </div>

                <div className="md:col-span-2">
                  <span className="font-semibold text-slate-500 block">Product(s):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.isArray(viewingProject.product) && viewingProject.product.length > 0 ? (
                      viewingProject.product.map((prod, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-100">
                          {resolveProductName(prod)}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <span className="font-semibold text-slate-500 block">Team Members:</span>
                  <p className="text-slate-800 mt-1">
                    {viewingProject.team_members || "—"}
                  </p>
                </div>

                <div className="md:col-span-2 border-t pt-3 mt-1">
                  <span className="font-semibold text-slate-500 block mb-1">Scope / Requirements:</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                    {viewingProject.project_scope_requirements || "No scope notes specified."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Send Message Modal */}
      <SendMessageModal
        isOpen={sendMessageModalOpen}
        onClose={() => {
          setSendMessageModalOpen(false);
          setSelectedMessageRecord(null);
        }}
        category="project"
        recordData={selectedMessageRecord}
        onSuccess={() => {}}
      />
    </Base>
  );
}
