import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Base from "./Base";
import { MdPerson, MdLock, MdCheck, MdShield, MdEmail, MdPhone } from "react-icons/md";

export default function ProfileSection() {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  // Profile Form state
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    full_name: "",
    email: "",
    mobile_no: "",
    role_name: "ADMIN / SUPERUSER",
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change Form state
  const [passwords, setPasswords] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const token = useMemo(() => localStorage.getItem("access") || localStorage.getItem("token") || "", []);

  // Fetch current user details
  const fetchUserData = useCallback(async () => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    try {
      // First try /auth/me/ or dj-rest-auth user
      const res = await fetch(`${BASE_API}/auth/me/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          full_name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.email || "Administrator",
          email: data.email || "",
          mobile_no: data.mobile_no || "",
          role_name: data.role?.name ? data.role.name.toUpperCase() : "ADMIN / SUPERUSER",
        });
      } else {
        // Fallback to dj-rest-auth user
        const fallbackRes = await fetch(`${BASE_API}/auth/dj-rest-auth/user/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setProfile({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            full_name: data.full_name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.email || "Administrator",
            email: data.email || "",
            mobile_no: data.mobile_no || "",
            role_name: data.role?.name ? data.role.name.toUpperCase() : "ADMIN / SUPERUSER",
          });
        } else {
          navigate("/login", { replace: true });
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  }, [BASE_API, token, navigate]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Handle Profile Update (Email, Name, Mobile)
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (!profile.email.trim()) {
      Swal.fire({ icon: "error", title: "Validation Error", text: "Email address cannot be empty." });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${BASE_API}/auth/dj-rest-auth/user/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: `${profile.first_name} ${profile.last_name}`.trim(),
          mobile_no: profile.mobile_no,
        }),
      });

      if (res.ok) {
        const updatedData = await res.json().catch(() => ({}));
        setProfile((prev) => ({
          ...prev,
          email: updatedData.email || prev.email,
          first_name: updatedData.first_name || prev.first_name,
          last_name: updatedData.last_name || prev.last_name,
          mobile_no: updatedData.mobile_no || prev.mobile_no,
        }));

        Swal.fire({
          icon: "success",
          title: "Profile & Email Updated",
          text: "Your account profile and email address have been saved successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.email?.[0] || errorData.detail || errorData.mobile_no?.[0] || "Could not update profile details.";
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: errMsg,
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong while saving changes.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!passwords.new_password || passwords.new_password.length < 6) {
      Swal.fire({ icon: "error", title: "Validation Error", text: "New password must be at least 6 characters long." });
      return;
    }

    if (passwords.new_password !== passwords.confirm_password) {
      Swal.fire({ icon: "error", title: "Validation Error", text: "New password and confirmation do not match." });
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch(`${BASE_API}/auth/change-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: passwords.old_password,
          new_password: passwords.new_password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Password Changed!",
          text: "Your account password has been updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        setPasswords({ old_password: "", new_password: "", confirm_password: "" });
      } else {
        const errorMsg =
          data.error ||
          data.message ||
          data.detail ||
          data.old_password?.[0] ||
          data.new_password?.[0] ||
          "Failed to change password. Please verify your current password.";
        Swal.fire({
          icon: "error",
          title: "Password Change Failed",
          text: errorMsg,
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Could not connect to server to change password.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <Base title="">
        <div className="w-full py-12 text-center text-slate-500 font-medium text-xs">
          Loading profile details...
        </div>
      </Base>
    );
  }

  return (
    <Base title="">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 -mt-5 px-1">

        {/* HEADER BLOCK WITH BLUE VERTICAL ACCENT LINE MATCHING LEAD.JSX AND ACCOUNTS.JSX */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                My Profile & Credentials Settings
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your personal account profile information, email address, and security password
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs">
              <MdShield className="text-blue-600 text-sm" />
              <span>{profile.role_name}</span>
            </span>
          </div>
        </div>

        {/* TWO CARDS GRID: PROFILE INFO & SECURITY PASSWORD CHANGE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* CARD 1: PERSONAL PROFILE & EMAIL DETAILS */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MdPerson className="text-blue-600 text-lg" />
                  Account Profile & Email
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your official name, login email address, and contact number
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">First Name</label>
                  <input
                    type="text"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    placeholder="First name"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-600 font-semibold">Last Name</label>
                  <input
                    type="text"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    placeholder="Last name"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">Email Address (Login ID)</label>
                <div className="relative">
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full px-3.5 py-2 pl-9 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white font-medium"
                  />
                  <MdEmail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">Mobile Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.mobile_no}
                    onChange={(e) => setProfile({ ...profile, mobile_no: e.target.value })}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full px-3.5 py-2 pl-9 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                  />
                  <MdPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <MdCheck className="text-base" />
                  <span>{savingProfile ? "Saving..." : "Save Profile Details"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* CARD 2: CHANGE PASSWORD SECURITY */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MdLock className="text-indigo-600 text-lg" />
                  Security & Change Password
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your account password securely at any time
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">Current Password</label>
                <input
                  type="password"
                  value={passwords.old_password}
                  onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">New Password *</label>
                <input
                  type="password"
                  value={passwords.new_password}
                  onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                  placeholder="New password (min 6 characters)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">Confirm New Password *</label>
                <input
                  type="password"
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <MdLock className="text-base" />
                  <span>{changingPassword ? "Updating..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </Base>
  );
}