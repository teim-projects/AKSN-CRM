import React, { useEffect, useState, useMemo } from "react";
import { RxCross2 } from "react-icons/rx";
import Swal from "sweetalert2";

export default function AddStaffForm({
  open,
  onClose,
  onSuccess,
  baseApi,
  roles = [],
  staff = null 
}) {
  const [email, setEmail] = useState(staff?.email || "");
  const [mobile, setMobile] = useState(staff?.mobile_no || "");
  const [firstName, setFirstName] = useState(staff?.first_name || "");
  const [lastName, setLastName] = useState(staff?.last_name || "");
  const [role, setRole] = useState(staff?.role?.id || "");
  const [password, setPassword] = useState("");
  const [changePassword, setChangePassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const BASE_API = baseApi;

  const token = useMemo(() => localStorage.getItem("access") || "", []);

  useEffect(() => {
    setEmail(staff?.email || "");
    setMobile(staff?.mobile_no || "");
    setFirstName(staff?.first_name || "");
    setLastName(staff?.last_name || "");
    setRole(staff?.role?.id || "");
    setPassword("");
    setChangePassword(false);
  }, [staff, open]);

  if (!open) return null;

  const validate = () => {
    if (!email.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Email is required" });
      return false;
    }
    if (!mobile.toString().trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Mobile number is required" });
      return false;
    }
    if (!firstName.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "First name is required" });
      return false;
    }
    if (!role) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please select a role" });
      return false;
    }
    if (!staff || changePassword) {
      if (!password || password.length < 6) {
        Swal.fire({ icon: "error", title: "Validation", text: "Password must be at least 6 characters" });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const payload = {
      email,
      mobile_no: mobile,
      first_name: firstName,
      last_name: lastName,
      role,
    };

    if (!staff || changePassword) payload.password = password;

    const url = staff
      ? `${BASE_API}/auth/staff/${staff.id}/`
      : `${BASE_API}/auth/staff/`;

    const method = staff ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      let data;
      try { data = await res.json(); } catch (e) { data = {}; }

      if (!res.ok) {
        throw new Error(data?.detail || data?.non_field_errors?.[0] || JSON.stringify(data) || `${res.status} ${res.statusText}`);
      }

      Swal.fire({
        icon: "success",
        text: staff ? "Staff updated successfully" : "Staff added successfully",
        timer: 1200,
        showConfirmButton: false
      });

      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to save staff"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 overflow-y-auto p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-6 max-w-lg w-full mx-auto relative space-y-4">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          aria-label="Close"
        >
          <RxCross2 size={18} />
        </button>

        {/* Header Block Title & Subtext */}
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {staff ? "Edit Staff Account" : "Add New Staff"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Configure system profile identities credentials and operational permissions fields.</p>
        </div>

        {/* Form Body Structure Layout */}
        <form className="space-y-4 text-slate-800" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Email *</label>
            <input 
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white" 
              placeholder="example@domain.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Mobile *</label>
            <input 
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white" 
              placeholder="Enter 10-digit mobile phone" 
              value={mobile}
              onChange={(e) => setMobile(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">First name *</label>
              <input 
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white" 
                placeholder="First Name" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)} 
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Last name</label>
              <input 
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white" 
                placeholder="Last Name" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Role *</label>
            <select 
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white" 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Select Operational Role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Conditional Credential Allocation Form Segment */}
          {!staff ? (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Password *</label>
              <input 
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white" 
                placeholder="Password (min 6 characters)" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          ) : (
            <div className="space-y-2 pt-1 select-none">
              <label className="flex items-center cursor-pointer text-xs font-semibold text-slate-600">
                <input 
                  type="checkbox" 
                  checked={changePassword} 
                  onChange={(e) => setChangePassword(e.target.checked)} 
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2 cursor-pointer"
                />
                <span>Request password update</span>
              </label>

              {changePassword && (
                <div className="space-y-1 animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-600">New Password *</label>
                  <input 
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white" 
                    placeholder="Enter new account password (min 6 characters)" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
              )}
            </div>
          )}

          {/* Compartmental Standard Interactivity Actions Footer */}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              {loading ? (staff ? "Updating..." : "Saving...") : (staff ? "Update Profile" : "Create Account")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}