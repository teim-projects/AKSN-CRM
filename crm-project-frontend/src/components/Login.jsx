import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Login = ({ forceForgot = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const LOGIN_ENDPOINT = `${BASE_API}/auth/dj-rest-auth/login/`;
  const RESET_ENDPOINT = `${BASE_API}/auth/password-reset/`;

  const [form, setForm] = useState({ email_or_mobile: "", password: "" });
  const [message, setMessage] = useState("");

  // Forgot password in-place view state
  const [isForgotPassView, setIsForgotPassView] = useState(
    forceForgot || location.pathname === "/forgot-password"
  );
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState({ type: "", message: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Logging in...");

    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage("❌ Login failed: " + JSON.stringify(data));
        return;
      }

      if (data.access) localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);

      window.dispatchEvent(new Event("authChange"));
      
      setMessage("✅ Login successful!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setMessage("⚠️ Error connecting to server.");
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    setForgotStatus({ type: "info", message: "Verifying account in database..." });

    try {
      const res = await fetch(RESET_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errDetail = data.email
          ? Array.isArray(data.email)
            ? data.email.join(", ")
            : data.email
          : data.detail || "Account email not found in database.";
        setForgotStatus({ type: "error", message: errDetail });
        return;
      }

      if (data.is_admin) {
        setForgotStatus({
          type: "success",
          message: "✅ Admin reset link sent! Check your email inbox (girsawaleritesh5@gmail.com).",
        });
      } else {
        const notifPayload = {
          id: `req_${Date.now()}`,
          timestamp: Date.now(),
          title: "Password Change Requested",
          description: `Staff member ${data.user_name || forgotEmail} (${forgotEmail}) has requested a password change.`,
          type: "requests",
          badge: "Password Request",
          priority: "high",
          time: "Just now",
          userId: data.user_id,
          userEmail: forgotEmail,
          userName: data.user_name || forgotEmail,
        };

        const existingNotifs = JSON.parse(localStorage.getItem("crm_custom_notifs") || "[]");
        localStorage.setItem("crm_custom_notifs", JSON.stringify([notifPayload, ...existingNotifs]));

        window.dispatchEvent(
          new CustomEvent("newNotification", {
            detail: notifPayload,
          })
        );

        setForgotStatus({
          type: "success",
          message: `✅ Password reset request for staff account (${forgotEmail}) has been submitted to Admin!`,
        });
      }
    } catch (error) {
      console.error(error);
      setForgotStatus({ type: "error", message: "Could not connect to backend server." });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 overflow-y-auto grid grid-cols-1 md:grid-cols-[2.2fr_1fr] bg-white font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* LEFT SIDE: PRODUCT MARKETING BANNER (REMAINS FIXED & VISIBLE) */}
      <div className="hidden md:flex flex-col justify-between px-12 lg:px-24 py-20 bg-[#1D357E] text-white bg-gradient-to-b from-[#1E3A8A] to-[#1E293B] items-center">
        
        <div className="w-full max-w-xl flex flex-col justify-between h-full">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/10 shadow-sm">
              <svg className="w-5 h-5 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-wide text-white">AKSN CRM</span>
          </div>

          {/* Main Content Area */}
          <div className="my-auto py-12">
            <h1 className="text-4xl lg:text-[44px] font-bold leading-[1.15] mb-6 tracking-tight text-white">
              Complete CRM for <br /> Modern Sales Teams
            </h1>
            
            <p className="text-slate-300 text-[15px] lg:text-[16px] leading-relaxed mb-10 opacity-90">
              Manage leads, customers, projects, support, and renewals — all in one unified enterprise platform.
            </p>

            {/* Feature List Checklist */}
            <ul className="space-y-4 text-[13.5px] font-medium text-slate-200/95">
              <li className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full border border-teal-400/30 text-teal-400 text-xs font-bold bg-teal-500/5">✓</span>
                Lead-to-Revenue Pipeline Management
              </li>
              <li className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full border border-teal-400/30 text-teal-400 text-xs font-bold bg-teal-500/5">✓</span>
                360° Customer Intelligence View
              </li>
              <li className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full border border-teal-400/30 text-teal-400 text-xs font-bold bg-teal-500/5">✓</span>
                AMC & Renewal Automation
              </li>
              <li className="flex items-center gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full border border-teal-400/30 text-teal-400 text-xs font-bold bg-teal-500/5">✓</span>
                Real-time Analytics & Dashboards
              </li>
            </ul>
          </div>

          {/* Bottom Metrics Grid */}
          <div className="flex gap-4">
            <div className="w-[120px] bg-white/[0.07] rounded-xl p-4 border border-white/[0.08] backdrop-blur-md text-center">
              <div className="text-xl font-bold tracking-tight text-white">1,042</div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">Leads This Year</div>
            </div>
            
            <div className="w-[120px] bg-white/[0.07] rounded-xl p-4 border border-white/[0.08] backdrop-blur-md text-center">
              <div className="text-xl font-bold tracking-tight text-white">284</div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">Active Customers</div>
            </div>
            
            <div className="w-[120px] bg-white/[0.07] rounded-xl p-4 border border-white/[0.08] backdrop-blur-md text-center">
              <div className="text-xl font-bold tracking-tight text-white">₹3.89Cr</div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">Revenue Dec</div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT SIDE: AUTHENTICATION / FORGOT PASSWORD IN-PLACE SWAP PANEL */}
      <div className="flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white items-center">
        
        {isForgotPassView ? (
          /* FORGOT PASSWORD IN-PLACE VIEW (OVER RIGHT WHITE PANEL ONLY) */
          <div className="w-full max-w-[340px] my-auto transition-all duration-300 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-900 mb-1.5 tracking-tight">
              Reset Password
            </h2>
            <p className="text-[13.5px] text-slate-400 mb-7 font-medium leading-relaxed">
              Enter your account email below. Admin resets will receive an email link, while staff requests will alert Admin directly.
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-2">
                  Account Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  required
                  className="w-full h-[46px] rounded-lg border border-slate-200 bg-[#F8FAFC]/60 px-4 text-sm text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className={`w-full h-[46px] rounded-lg text-white font-semibold text-sm bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer ${
                  forgotLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {forgotLoading ? "Verifying Account..." : "Submit Reset Request"}
              </button>
            </form>

            {forgotStatus.message && (
              <div
                className={`mt-4 p-3 rounded-lg border text-xs font-medium leading-relaxed ${
                  forgotStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {forgotStatus.message}
              </div>
            )}

            <div className="mt-8 text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassView(false);
                  setForgotStatus({ type: "", message: "" });
                }}
                className="text-[13px] font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD LOGIN VIEW */
          <div className="w-full max-w-[340px] my-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-1.5 tracking-tight">
              Welcome back
            </h2>
            <p className="text-[14px] text-slate-400 mb-9 font-medium">
              Sign in to your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Address Field */}
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-2">
                  Email Address
                </label>
                <input
                  type="text"
                  name="email_or_mobile"
                  value={form.email_or_mobile}
                  onChange={handleChange}
                  placeholder="admin@gmail.com"
                  className="w-full h-[46px] rounded-lg border border-slate-200 bg-[#F8FAFC]/60 px-4 text-sm text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-[12px] font-medium text-slate-600 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="•••••••••"
                  className="w-full h-[46px] rounded-lg border border-slate-200 bg-[#F8FAFC]/60 px-4 text-sm text-slate-800 outline-hidden transition-all focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              {/* Checkbox and Forgot Link */}
              <div className="flex items-center justify-between text-sm pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer" 
                  />
                  <span className="text-slate-700 text-[13px] font-medium">Remember me</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassView(true);
                    setForgotStatus({ type: "", message: "" });
                  }}
                  className="text-[#3B82F6] hover:text-blue-700 text-[13px] font-medium transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Action Submit Button */}
              <button
                type="submit"
                className="w-full h-[46px] rounded-lg text-white font-semibold text-sm bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs tracking-wide mt-2 cursor-pointer"
              >
                Sign In to Dashboard
              </button>
            </form>

            {/* Fallback Messaging banner layout */}
            {message && (
              <div className="mt-4 text-center text-xs text-slate-500 font-medium">
                {message}
              </div>
            )}
          </div>
        )}

        {/* Small Footer Copyright Text */}
        <div className="text-[11px] text-slate-400 font-medium mt-12 text-center tracking-wide">
          © 2024 AKSN CRM · Enterprise Edition v3.2.1
        </div>
      </div>

    </div>
  );
};

export default Login;