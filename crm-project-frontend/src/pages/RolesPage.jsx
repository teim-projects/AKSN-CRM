import React, { useEffect, useState, useMemo, useCallback } from "react";
import AddRoleForm from "../components/accounts/AddRoleForm";
import { MdEdit , MdDelete } from "react-icons/md";
import Swal from "sweetalert2";
export default function RolePage({ baseApi, onClose, open = true }) {
  const DEFAULT_API = "http://127.0.0.1:8000";
  const BASE_API = baseApi ?? import.meta.env.VITE_BASE_API_URL ?? DEFAULT_API;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [editingRole, setEditingRole] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const token = useMemo(() => localStorage.getItem("access") || localStorage.getItem("token") || "", []);

  // fallback page size to compute pages when server doesn't expose page_size
  const PAGE_SIZE_FALLBACK = 10;

  const fetchRoles = useCallback(async (pageNo = 1) => {
    setLoading(true);
    setError(null);

    try {
      const url = `${BASE_API}/auth/roles/?page=${pageNo}`;
      console.log("[RolePage] fetching roles:", url);

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const text = await res.text(); // read text first so we can show helpful debug if non-json
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        throw new Error(`Invalid JSON response from server: ${text.slice(0, 300)}`);
      }

      if (!res.ok) {
        // include backend message if present
        const serverMsg = data?.detail || JSON.stringify(data) || `${res.status} ${res.statusText}`;
        throw new Error(`Server error: ${serverMsg}`);
      }

      console.log("[RolePage] roles response:", data);

      // handle paginated response { count, next, previous, results: [...] }
      if (data && Array.isArray(data.results)) {
        const items = data.results;
        const count = Number.isFinite(data.count) ? data.count : items.length;
        const pageSize = items.length || PAGE_SIZE_FALLBACK;
        setRoles(items);
        setTotalCount(count);
        setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
        setPage(pageNo);
      } else if (Array.isArray(data)) {
        // backend returned raw array (no pagination)
        setRoles(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setPage(1);
      } else {
        // unexpected shape but try to find array inside
        const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data?.data) ? data.data : []);
        setRoles(items);
        setTotalCount(items.length);
        setTotalPages(1);
        setPage(1);
      }
    } catch (err) {
      console.error("[RolePage] fetchRoles error:", err);
      setError(err.message || String(err));
      setRoles([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [BASE_API, token]);

  // fetch when modal is opened or page changes
  useEffect(() => {
    if (!open) return;
    fetchRoles(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page]);

  // delete role
  const handleDelete = async (id) => {
    const confirmDelete = await Swal.fire({
      title: "Are you sure?",
      text: "This role will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });
  
    if (!confirmDelete.isConfirmed) return;
  
    try {
      const res = await fetch(`${BASE_API}/auth/roles/${id}/`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
  
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Delete failed: ${res.status} ${res.statusText} — ${text}`);
      }
  
      Swal.fire({
        title: "Deleted!",
        text: "Role has been deleted.",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
  
      await fetchRoles(page);
  
      if (roles.length === 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
    } catch (err) {
      Swal.fire({
        title: "Error!",
        text: err.message || "Failed to delete role",
        icon: "error",
      });
    }
  };
  

  if (!open) return null;

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm w-full max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg font-semibold">Manage Roles</h2>
          <div className="text-sm text-slate-600">{loading ? "Loading…" : `${totalCount} roles`}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingRole(null); setShowForm(true); }}
            className="px-3 py-1 bg-indigo-600 text-white rounded"
          >
            + Add Role
          </button>

          <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">Close</button>
        </div>
      </div>

      <div className="bg-white rounded-md">
        {error ? (
          <div className="p-4 text-red-600">Error: {error}</div>
        ) : loading ? (
          <div className="p-6 text-center text-slate-600">Loading roles…</div>
        ) : (
          <>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-center border-b">
                    <th className="py-2 px-3">Sr.No</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length === 0 ? (
                    <tr><td colSpan={3} className="py-6 text-center text-slate-500">No roles</td></tr>
                  ) : roles.map((r, i) => (
                    <tr key={r.id} className="odd:bg-slate-50 text-center">
                      <td className="py-2 px-3">{(page - 1) * (roles.length || 1) + (i + 1)}</td>
                      <td className="py-2 px-3">{r.name}</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => { setEditingRole(r); setShowForm(true); }} className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-sm"><MdEdit /></button>
                          <button onClick={() => handleDelete(r.id)} className="px-2 py-1 rounded bg-red-100 text-red-800 text-sm"><MdDelete /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            
          </>
        )}
      </div>

      <AddRoleForm
        open={showForm}
        onClose={() => setShowForm(false)}
        baseApi={BASE_API}
        onSuccess={() => { fetchRoles(page); setShowForm(false); }}
        roleId={editingRole?.id}
        initialName={editingRole?.name}
      />
    </div>
  );
}
