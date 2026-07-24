import React, { useEffect, useState, useMemo } from "react";
import { RxCross2 } from "react-icons/rx";

/**
 * Reusable AddRoleForm
 *
 * Props:
 * - open: boolean
 * - onClose: fn()
 * - onSuccess: fn(createdOrUpdatedRole)
 * - baseApi: optional base url string
 * - initialName: optional string (for edit)
 * - roleId: optional id (for edit) — when provided, form does PUT /roles/{id}/
 */
export default function AddRoleForm({ open, onClose, onSuccess, baseApi, initialName = "", roleId = null }) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE_API = baseApi ?? "http://127.0.0.1:8000";

  const token = useMemo(() => {
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  }, []);

  // sync initialName when editing different roles
  useEffect(() => {
    setName(initialName ?? "");
    setError(null);
  }, [initialName, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Role name is required");
      return;
    }

    setLoading(true);
    try {
      const url = roleId ? `${BASE_API}/auth/roles/${roleId}/` : `${BASE_API}/auth/roles/`;
      const method = roleId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.detail || data?.name || JSON.stringify(data) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      onSuccess && onSuccess(data);
      onClose && onClose();
      setName("");
    } catch (err) {
      setError(err.message || "Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 overflow-y-auto p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-6 max-w-md w-full mx-auto relative space-y-4">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          aria-label="Close"
        >
          <RxCross2 size={18} />
        </button>

        {/* Form Title & Subtext */}
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {roleId ? "Edit Role" : "Add New Role"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Configure access permission groups classifications inside system records.</p>
        </div>

        {/* Form Error Alert block segment */}
        {error && (
          <div className="text-xs font-semibold text-rose-700 bg-rose-50/50 px-2.5 py-1.5 rounded-md border border-rose-100/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-slate-800">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">
              Role Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. manager, account"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
            />
          </div>

          {/* Core Footer Buttons Layout */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (roleId ? "Updating..." : "Saving...") : (roleId ? "Update Role" : "Create Role")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}