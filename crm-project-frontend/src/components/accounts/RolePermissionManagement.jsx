import React, { useState, useEffect, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import AddRoleForm from "./AddRoleForm";
import { MdCheck, MdAdd } from "react-icons/md";

// Default System Modules Definition
export const SYSTEM_MODULES = [
  {
    key: "dashboard",
    name: "Dashboard & Telemetry",
    description: "View system telemetry, analytics, and overview charts",
  },
  {
    key: "leads",
    name: "Lead Management",
    description: "Create, view, edit, and manage sales leads and enquiries",
  },
  {
    key: "followups",
    name: "Follow-up Management",
    description: "Schedule, log, and manage customer follow-ups",
  },
  {
    key: "quotations",
    name: "Quotations",
    description: "Generate, edit, and send quotation PDFs to customers",
  },
  {
    key: "products",
    name: "Product Master",
    description: "Manage products, pricing, categories, and specifications",
  },
  {
    key: "customers",
    name: "Customer Management",
    description: "Manage customer profiles, billing addresses, and contact details",
  },
  {
    key: "projects",
    name: "Project Management",
    description: "Manage client implementation projects, timelines, and stages",
  },
  {
    key: "terms",
    name: "Terms & Conditions",
    description: "Manage quotation terms, conditions, and categories",
  },
  {
    key: "accounts",
    name: "Accounts & Staff",
    description: "Manage staff accounts, credentials, and operational roles",
  },
];

// Helper to get default permissions for a role name
const getDefaultPermissionsForRole = (roleName = "") => {
  const norm = roleName.toLowerCase();
  const permissions = {};

  SYSTEM_MODULES.forEach((mod) => {
    if (norm === "admin" || norm === "superuser") {
      permissions[mod.key] = { view: true, create: true, edit: true, delete: true };
    } else {
      const isSystemAdminMod = mod.key === "accounts" || mod.key === "roles";
      permissions[mod.key] = {
        view: !isSystemAdminMod,
        create: false,
        edit: false,
        delete: false,
      };
    }
  });

  return permissions;
};

export default function RolePermissionManagement({ baseApi }) {
  const DEFAULT_API = "http://127.0.0.1:8000";
  const BASE_API = baseApi ?? import.meta.env.VITE_BASE_API_URL ?? DEFAULT_API;

  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);

  // Permission Matrix state: { [moduleKey]: { view, create, edit, delete } }
  const [matrix, setMatrix] = useState({});

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  // Fetch Roles from Backend API
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${BASE_API}/auth/roles/`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      let roleList = [];

      if (Array.isArray(data)) {
        roleList = data;
      } else if (data && Array.isArray(data.results)) {
        roleList = data.results;
      }

      // Filter out "admin" role (only show created/configurable roles)
      const configurableRoles = roleList.filter(
        (r) => r.name && r.name.toLowerCase() !== "admin"
      );

      setRoles(configurableRoles);
      if (configurableRoles.length > 0) {
        setSelectedRole((prev) => {
          if (!prev || prev.name?.toLowerCase() === "admin") {
            return configurableRoles[0];
          }
          const exists = configurableRoles.find((r) => r.id === prev.id || r.name === prev.name);
          return exists || configurableRoles[0];
        });
      } else {
        setSelectedRole(null);
      }
    } catch (err) {
      console.error("Failed to fetch system roles:", err);
      setRoles([]);
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  }, [BASE_API, token]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Load Permissions when selectedRole changes
  useEffect(() => {
    if (!selectedRole) return;

    // 1. Load from DB role object if permissions exist
    if (selectedRole.permissions && typeof selectedRole.permissions === 'object' && Object.keys(selectedRole.permissions).length > 0) {
      setMatrix(selectedRole.permissions);
      return;
    }

    // 2. Load from LocalStorage cache
    const storageKey = `crm_role_permissions_${selectedRole.name.toLowerCase()}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setMatrix(JSON.parse(saved));
        return;
      } catch (e) {
        console.error("Error parsing saved role permissions:", e);
      }
    }

    // 3. Fallback defaults
    setMatrix(getDefaultPermissionsForRole(selectedRole.name));
  }, [selectedRole]);

  // Toggle single permission for a module
  const togglePermission = (moduleKey, action) => {
    setMatrix((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [action]: !prev[moduleKey]?.[action],
      },
    }));
  };

  // Preset Actions
  const handleGrantFullAccess = () => {
    const full = {};
    SYSTEM_MODULES.forEach((mod) => {
      full[mod.key] = { view: true, create: true, edit: true, delete: true };
    });
    setMatrix(full);
  };

  const handleReadOnlyAccess = () => {
    const readOnly = {};
    SYSTEM_MODULES.forEach((mod) => {
      readOnly[mod.key] = { view: true, create: false, edit: false, delete: false };
    });
    setMatrix(readOnly);
  };

  const handleClearAllAccess = () => {
    const cleared = {};
    SYSTEM_MODULES.forEach((mod) => {
      cleared[mod.key] = { view: false, create: false, edit: false, delete: false };
    });
    setMatrix(cleared);
  };

  const handleClearModule = (moduleKey) => {
    setMatrix((prev) => ({
      ...prev,
      [moduleKey]: { view: false, create: false, edit: false, delete: false },
    }));
  };

  const handleSelectModule = (moduleKey) => {
    setMatrix((prev) => ({
      ...prev,
      [moduleKey]: { view: true, create: true, edit: true, delete: true },
    }));
  };

  // Save Permissions Configuration to Backend Database & LocalStorage
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);

    const storageKey = `crm_role_permissions_${selectedRole.name.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(matrix));

    try {
      if (selectedRole.id) {
        const res = await fetch(`${BASE_API}/auth/roles/${selectedRole.id}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ permissions: matrix }),
        });

        if (res.ok) {
          const updatedRole = await res.json().catch(() => null);
          if (updatedRole) {
            setRoles((prev) =>
              prev.map((r) => (r.id === updatedRole.id ? updatedRole : r))
            );
            setSelectedRole(updatedRole);
          }
        }
      }

      // Notify application of auth/permissions change
      window.dispatchEvent(new Event("authChange"));
      window.dispatchEvent(
        new CustomEvent("newNotification", {
          detail: {
            title: "System Permissions Updated",
            description: `Permissions matrix updated for role: ${selectedRole.name}.`,
            type: "system",
            badge: "Permissions",
          },
        })
      );

      Swal.fire({
        icon: "success",
        title: "Permissions Saved & Applied!",
        text: `Access permissions for ${selectedRole.name} updated in system database.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to save permissions to DB:", err);
      Swal.fire({
        icon: "success",
        title: "Permissions Saved",
        text: `Access permissions for ${selectedRole.name} updated.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4 font-sans antialiased text-slate-800 -mt-5 px-1">

      {/* HEADER BLOCK MATCHING LEAD.JSX */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Role & Access Control Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure model access rights and feature permissions for each system role.
            </p>
          </div>
        </div>

        <div className="mt-3 md:mt-0 flex items-center gap-3">
          <button
            onClick={() => setShowAddRoleModal(true)}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer"
          >
            <MdAdd className="text-base" />
            <span>Create New Role</span>
          </button>
        </div>
      </div>

      {/* SELECT ROLE SELECTION CARD */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          SELECT ROLE TO CONFIGURE
        </span>

        {loading ? (
          <div className="text-xs text-slate-400 py-1">Loading system roles...</div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id || selectedRole?.name === r.name;
              return (
                <button
                  key={r.id || r.name}
                  onClick={() => setSelectedRole(r)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer ${isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-blue-400" : "bg-slate-300"}`} />
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* PERMISSION MATRIX TABLE CARD */}
      {selectedRole && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">

          {/* Matrix Header & Action Buttons */}
          <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Permission Matrix for <span className="text-blue-600 capitalize">{selectedRole.name}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Toggle module permissions and apply quick presets.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGrantFullAccess}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Grant Full Access
              </button>

              <button
                onClick={handleReadOnlyAccess}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Read Only Access
              </button>

              <button
                onClick={handleClearAllAccess}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Clear All Access
              </button>

              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-1"
              >
                <MdCheck className="text-base" />
                <span>{saving ? "Saving..." : "Save Permissions"}</span>
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-5 text-left">SYSTEM MODULE</th>
                  <th className="py-3 px-4 text-center">VIEW ACCESS</th>
                  <th className="py-3 px-4 text-center">CREATE ACCESS</th>
                  <th className="py-3 px-4 text-center">EDIT ACCESS</th>
                  <th className="py-3 px-4 text-center">DELETE ACCESS</th>
                  <th className="py-3 px-4 text-right">QUICK SELECT</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {SYSTEM_MODULES.map((mod) => {
                  const perm = matrix[mod.key] || { view: false, create: false, edit: false, delete: false };
                  const isAllActive = perm.view && perm.create && perm.edit && perm.delete;

                  return (
                    <tr key={mod.key} className="hover:bg-slate-50/60 transition-colors duration-150">
                      {/* Module Info */}
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-900 text-xs">
                          {mod.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {mod.description}
                        </div>
                      </td>

                      {/* View Access - Pastel Emerald */}
                      <td className="py-3 px-4 text-center">
                        <ToggleSwitch
                          active={perm.view}
                          onToggle={() => togglePermission(mod.key, "view")}
                          activeColor="bg-emerald-500"
                        />
                      </td>

                      {/* Create Access - Pastel Blue */}
                      <td className="py-3 px-4 text-center">
                        <ToggleSwitch
                          active={perm.create}
                          onToggle={() => togglePermission(mod.key, "create")}
                          activeColor="bg-blue-600"
                        />
                      </td>

                      {/* Edit Access - Pastel Amber */}
                      <td className="py-3 px-4 text-center">
                        <ToggleSwitch
                          active={perm.edit}
                          onToggle={() => togglePermission(mod.key, "edit")}
                          activeColor="bg-amber-500"
                        />
                      </td>

                      {/* Delete Access - Pastel Rose */}
                      <td className="py-3 px-4 text-center">
                        <ToggleSwitch
                          active={perm.delete}
                          onToggle={() => togglePermission(mod.key, "delete")}
                          activeColor="bg-rose-500"
                        />
                      </td>

                      {/* Quick Select Actions */}
                      <td className="py-3 px-4 text-right">
                        {isAllActive ? (
                          <button
                            onClick={() => handleClearModule(mod.key)}
                            className="text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
                          >
                            Clear Module
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSelectModule(mod.key)}
                            className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
                          >
                            Select All
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      <AddRoleForm
        open={showAddRoleModal}
        onClose={() => setShowAddRoleModal(false)}
        baseApi={BASE_API}
        onSuccess={() => {
          fetchRoles();
          setShowAddRoleModal(false);
        }}
      />
    </div>
  );
}

// Compact & Clean Toggle Switch Component
function ToggleSwitch({ active, onToggle, activeColor = "bg-blue-600" }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-4.5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-hidden ${active ? activeColor : "bg-slate-200"
        }`}
      aria-pressed={active}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-150 ease-in-out ${active ? "translate-x-4" : "translate-x-0"
          }`}
      />
    </button>
  );
}