import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import AddStaffForm from "../components/accounts/AddStaffForm";
import { MdEdit, MdDelete, MdFilterList, MdZoomIn } from "react-icons/md";
import RolePage from "../pages/RolesPage";
import Swal from "sweetalert2";
import TableView from "../components/TableView";
import AdvancedTableFilter from "../components/AdvancedTableFilter";
import RecordViewer from "../components/RecordViewer";
import { useUserRole } from "../hooks/useAuth";

import { useNavigate, useSearchParams } from "react-router-dom";

export default function Accounts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const { hasPermission } = useUserRole(BASE_API);
  const canCreateAccount = hasPermission("accounts", "create");
  const canEditAccount = hasPermission("accounts", "edit");
  const canDeleteAccount = hasPermission("accounts", "delete");

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Record Viewer state
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const token = useMemo(() => {
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  }, []);

  // fetch roles
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      if (!token) throw new Error("No bearer token found.");

      const url = `${BASE_API}/auth/roles/`;

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
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setRolesError(err.message || String(err));
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, [token, BASE_API]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // fetch staff - fetch all for filtering
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error("No bearer token found in localStorage.");

      const url = `${BASE_API}/auth/staff/?limit=1000`;

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
      let results = [];

      if (data && Array.isArray(data.results)) {
        results = data.results;
      } else if (Array.isArray(data)) {
        results = data;
      } else {
        throw new Error("Unexpected staff response shape");
      }

      setAllRows(results);
      setFilteredData(results);
      setRows(results);
      setTotalCount(results.length);
      setTotalPages(Math.max(1, Math.ceil(results.length / itemsPerPage)));
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
  }, [token, BASE_API, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Automatically open staff edit form when navigating with userId or email from Notification
  useEffect(() => {
    const userId = searchParams.get("userId");
    const emailParam = searchParams.get("email");
    if ((userId || emailParam) && allRows.length > 0) {
      const match = allRows.find(
        (r) =>
          (userId && String(r.id) === String(userId)) ||
          (emailParam && r.email && r.email.toLowerCase() === String(emailParam).toLowerCase())
      );
      if (match) {
        setEditingStaff(match);
        setShowStaffForm(true);
      }
    }
  }, [searchParams, allRows]);

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

  const handleDeleteStaff = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete Staff?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b"
    });

    if (!confirm.isConfirmed) return;

    try {
      const resp = await fetch(`${BASE_API}/auth/staff/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`${resp.status} ${resp.statusText} — ${text}`);
      }
      Swal.fire({ icon: "success", text: "Staff deleted", timer: 1000, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  // Columns for the table
  const columns = useMemo(() => ([
    {
      key: "sr",
      label: "Sr.No",
      render: (_, idx) => (currentPage - 1) * itemsPerPage + (idx + 1)
    },
    { key: "email", label: "Email", render: r => r.email || "-" },
    { key: "mobile_no", label: "Mobile", render: r => r.mobile_no || "-" },
    { key: "first_name", label: "First Name", render: r => r.first_name || "-" },
    { key: "last_name", label: "Last Name", render: r => r.last_name || "-" },
    { key: "role", label: "Role", render: r => r.role?.name ?? "-" },
  ]), [currentPage, itemsPerPage]);

  // Columns for the filter
  const filterColumns = [
    { key: "email", label: "Email" },
    { key: "mobile_no", label: "Mobile" },
    { key: "first_name", label: "First Name" },
    { key: "last_name", label: "Last Name" },
    { key: "role", label: "Role" },
  ];

  const actionsRenderer = useCallback((row) => (
    <div className="flex items-center justify-center gap-2 text-slate-500">
      <button
        onClick={() => {
          setSelectedStaff(row);
          setViewOpen(true);
        }}
        className="hover:text-purple-600 transition-colors p-0 bg-transparent border-none"
        title="View Full Record"
      >
        <MdZoomIn size={16} />
      </button>

      {canEditAccount && (
        <button
          onClick={() => { setEditingStaff(row); setShowStaffForm(true); }}
          className="hover:text-amber-600 transition-colors p-0 bg-transparent border-none cursor-pointer"
          title="Edit"
        >
          <MdEdit size={16} />
        </button>
      )}

      {canDeleteAccount && (
        <button
          onClick={() => handleDeleteStaff(row.id)}
          className="hover:text-rose-600 transition-colors p-0 bg-transparent border-none cursor-pointer"
          title="Delete"
        >
          <MdDelete size={16} />
        </button>
      )}
    </div>
  ), [handleDeleteStaff, canEditAccount, canDeleteAccount]);

  const currentPageData = getCurrentPageData();

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 -mt-5 px-1">

        {/* HEADER BLOCK WITH THE BLUE VERTICAL ACCENT LINE */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Accounts Overview</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "Loading…" : `Total ${totalCount} staff records identified across channels`}
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

            <button
              onClick={() => navigate("/roles")}
              className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              Manage Roles & Permissions
            </button>

            {canCreateAccount && (
              <button
                onClick={() => { setEditingStaff(null); setShowStaffForm(true); }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add Staff
              </button>
            )}

            {rolesLoading ? <div className="text-xs text-slate-400">Loading roles…</div> :
              rolesError ? <div className="text-xs text-red-500">Roles error</div> : null}
          </div>
        </div>

        {/* DATA TABLE VIEW */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <TableView
            columns={columns}
            rows={currentPageData}
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
            emptyMessage="No accounts found"
            rowClassName={() => "hover:bg-slate-50/80 transition-colors duration-150"}
          />
        </div>
      </div>

      {/* FILTER DRAWER - DARK OVERLAY WITHOUT BLUR */}
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
            columns={filterColumns}
          />
        </div>
      </div>

      {/* RECORD VIEWER - Slides in from right */}
      <RecordViewer
        isOpen={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setSelectedStaff(null);
        }}
        record={selectedStaff}
        title="Staff Details"
      />

      {/* Manage Roles modal wrapper */}
      {showAddRole && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="w-full max-w-3xl p-4 mx-4">
            <RolePage
              baseApi={BASE_API}
              onClose={() => {
                setShowAddRole(false);
                fetchRoles();
              }}
            />
          </div>
        </div>
      )}

      {/* Staff Account form modal wrapper */}
      <AddStaffForm
        open={showStaffForm}
        onClose={() => setShowStaffForm(false)}
        onSuccess={() => {
          fetchData();
          setShowStaffForm(false);
          setEditingStaff(null);
        }}
        baseApi={BASE_API}
        roles={roles}
        staff={editingStaff}
      />
    </Base>
  );
}