import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";
import Base from "../components/Base";
import TableView from "../components/TableView";
import AdvancedTableFilter from "../components/AdvancedTableFilter";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdFilterList,
  MdMail,
} from "react-icons/md";
import CreateTemplateModal from "../components/templates/CreateTemplateModal";
import SendMessageModal from "../components/templates/SendMessageModal";
import { useUserRole } from "../hooks/useAuth";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function TemplatesPage() {
  const { hasPermission } = useUserRole(BASE_API);
  const canCreate = hasPermission("templates", "create");
  const canEdit = hasPermission("templates", "edit");
  const canDelete = hasPermission("templates", "delete");

  const [allRows, setAllRows] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Test send modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testRecord, setTestRecord] = useState(null);
  const [testCategory, setTestCategory] = useState("quotation");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("templates/message-templates/");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      setAllRows(data);
      setFilteredData(data);
      setTotalCount(data.length);
      setTotalPages(Math.max(1, Math.ceil(data.length / itemsPerPage)));
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setError("Failed to load message templates");
      setAllRows([]);
      setFilteredData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Sync pagination with filtered data
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredData.length / itemsPerPage)));
    setCurrentPage(1);
  }, [filteredData, itemsPerPage]);

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  };

  const handleCreateOrUpdate = async (formData) => {
    try {
      setIsSubmitting(true);
      if (editingTemplate) {
        await api.patch(
          `templates/message-templates/${editingTemplate.id}/`,
          formData
        );
        Swal.fire({
          icon: "success",
          text: "Message template updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("templates/message-templates/", formData);
        Swal.fire({
          icon: "success",
          text: "Message template created successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsCreateModalOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error("Save template error:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Save",
        text:
          err.response?.data?.error ||
          err.response?.data?.name?.[0] ||
          "Could not save message template.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (template) => {
    Swal.fire({
      title: "Delete Template?",
      text: `Are you sure you want to delete "${template.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`templates/message-templates/${template.id}/`);
          Swal.fire({
            icon: "success",
            text: "Template deleted successfully",
            timer: 1500,
            showConfirmButton: false,
          });
          fetchTemplates();
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text: "Could not delete template.",
          });
        }
      }
    });
  };

  const handleOpenTestModal = (template) => {
    const mockRecord = {
      id: 101,
      contact_person: "Rajesh Sharma",
      name: "Rajesh Sharma",
      company_name: "Apex Engineering Pvt Ltd",
      phone: "9876543210",
      mobile_number: "9876543210",
      email: "info@aksninfotech.com",
      site_name: "Apex Plant #2, Sector 5",
      quotation_no: "QT-2026-089",
      total_amount: 145000,
      followup_date: new Date().toISOString().split("T")[0],
      project_name: "Apex HVAC Installation",
      contract_number: "AMC-2026-012",
      sales_executive_details: { full_name: "Suresh Kumar" },
      assigned_executive_details: { full_name: "Suresh Kumar" },
    };
    setTestCategory(template.category || "quotation");
    setTestRecord(mockRecord);
    setTestModalOpen(true);
  };

  const categoryMap = {
    lead: "Lead",
    customer: "Customer",
    followup: "Follow-up",
    quotation: "Quotation",
    project: "Project",
    amc: "AMC Contract",
  };

  const columns = [
    {
      key: "sr",
      label: "Sr.No",
      render: (r, idx) => {
        const srNum = (currentPage - 1) * itemsPerPage + (idx + 1);
        return <span className="text-slate-600 font-medium text-xs">{srNum}</span>;
      },
      className: "w-16 whitespace-nowrap",
    },
    {
      key: "name",
      label: "Template Name",
      render: (r) => (
        <span
          className="text-slate-900 font-semibold text-xs tracking-tight block max-w-[200px] truncate mx-auto cursor-default"
          title={r.name || ""}
        >
          {r.name || "-"}
        </span>
      ),
      className: "min-w-[160px] max-w-[220px]",
    },
    {
      key: "channel",
      label: "Channel",
      render: (r) => (
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap inline-block ${
            r.channel === "whatsapp"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {r.channel === "whatsapp" ? "WhatsApp" : "Email"}
        </span>
      ),
      className: "w-24 whitespace-nowrap",
    },
    {
      key: "category",
      label: "Category",
      render: (r) => (
        <span className="text-slate-700 font-medium text-xs whitespace-nowrap block">
          {categoryMap[r.category] || r.category || "-"}
        </span>
      ),
      className: "w-28 whitespace-nowrap",
    },
    {
      key: "subject",
      label: "Subject / Preview",
      render: (r) => {
        const text = r.channel === "email" ? r.subject : r.body;
        return (
          <span
            className="text-slate-600 text-xs block max-w-[260px] truncate mx-auto cursor-default"
            title={text || ""}
          >
            {text || "-"}
          </span>
        );
      },
      className: "min-w-[180px] max-w-[280px]",
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap inline-block ${
            r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {r.is_active ? "Active" : "Inactive"}
        </span>
      ),
      className: "w-24 whitespace-nowrap",
    },
  ];

  const actionsRenderer = useCallback(
    (row) => (
      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
        {/* Test Send / Preview Button */}
        <button
          onClick={() => handleOpenTestModal(row)}
          className="p-1 bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
          title="Test Send / Preview"
        >
          <MdMail />
        </button>

        {/* Edit Button */}
        {canEdit && (
          <button
            onClick={() => {
              setEditingTemplate(row);
              setIsCreateModalOpen(true);
            }}
            className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded transition-all duration-150 text-sm shadow-sm cursor-pointer"
            title="Edit Record"
          >
            <MdEdit />
          </button>
        )}

        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={() => handleDelete(row)}
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
        
        {/* HEADER BLOCK WITH THE BLUE VERTICAL ACCENT LINE - MATCHING LEAD MANAGEMENT */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                Message Templates
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading
                  ? "Synchronizing template records..."
                  : `Total ${totalCount} records identified across channels`}
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
            {canCreate && (
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add Template
              </button>
            )}
          </div>
        </div>

        {/* COMPACT DATA TABLE COMPONENT - MATCHING LEAD MANAGEMENT */}
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
            emptyMessage="No template records match the active criteria filters"
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

      {/* CREATE / EDIT TEMPLATE MODAL */}
      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleCreateOrUpdate}
        initialData={editingTemplate}
        isSubmitting={isSubmitting}
      />

      {/* TEST / PREVIEW SEND MODAL */}
      <SendMessageModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        category={testCategory}
        recordData={testRecord}
        onSuccess={() => {}}
      />
    </Base>
  );
}
