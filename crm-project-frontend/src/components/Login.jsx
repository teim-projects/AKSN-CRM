import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import loginVideo from "../assets/login_video.mp4";

const Login = ({ forceForgot = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const LOGIN_ENDPOINT = `${BASE_API}/auth/dj-rest-auth/login/`;
  const RESET_ENDPOINT = `${BASE_API}/auth/password-reset/`;

  const [form, setForm] = useState({ email_or_mobile: "", password: "" });
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({
    leads: "1,042",
    customers: "284",
    projects: "156",
    conversionRate: "27.3%",
  });

  useEffect(() => {
    const fetchPublicMetrics = async () => {
      try {
        const res = await fetch(`${BASE_API}/lead/public-metrics/`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            leads: data.total_leads !== undefined ? data.total_leads.toLocaleString() : "1,042",
            customers: data.total_customers !== undefined ? data.total_customers.toLocaleString() : "284",
            projects: data.total_projects !== undefined ? data.total_projects.toLocaleString() : "156",
            conversionRate: data.conversion_rate || "27.3%",
          });
        }
      } catch (err) {
        // Keeps fallback stats if unauthenticated
      }
    };
    fetchPublicMetrics();
  }, [BASE_API]);

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
    <div className="fixed inset-0 w-full h-full z-50 overflow-hidden flex flex-col md:flex-row bg-[#0b1932] font-sans antialiased selection:bg-blue-600 selection:text-white">

      {/* LEFT SIDE: MARQUEE AT VERY TOP, VIDEO BELOW MARQUEE, METRIC CARDS AT BOTTOM */}
      <div className="hidden md:flex flex-col justify-start items-start bg-[#0b1932] relative overflow-hidden shrink-0 pt-2" style={{ width: "min(66vw, calc(100vh * 1.04 * 16 / 9))" }}>
        <style>{`
          @keyframes tallyMarquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-tally-marquee {
            display: flex;
            width: max-content;
            animation: tallyMarquee 26s linear infinite;
          }
          .animate-tally-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>

        {/* 1. ROLLING TALLY PRODUCTS & SOFTWARE MARQUEE AT VERY TOP */}
        <div className="w-full px-4 pt-1 pb-2 overflow-hidden relative z-10 opacity-85 hover:opacity-100 transition-opacity">
          {/* Faded Left & Right Edge Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0b1932] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0b1932] to-transparent z-10 pointer-events-none" />

          {/* Marquee Track */}
          <div className="animate-tally-marquee flex items-center whitespace-nowrap text-[11px] font-medium tracking-wide text-slate-300/70 uppercase">
            {[1, 2].map((loopIdx) => (
              <React.Fragment key={loopIdx}>
                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  TallyPrime Enterprise
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  TallyPrime Server
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  TallyPrime Cloud AWS
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  TallyPrime Edit Log
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  Tally Customization & Addons
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  Tally WhatsApp Integration
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  Tally Mobile App & Dashboards
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  Tally Data Sync & Backup
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  Tally AMC & Support Services
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>

                <span className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-md border border-white/[0.06]">
                  Tally Auditor Edition
                </span>
                <span className="mx-2.5 text-blue-400/40">•</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 2. VIDEO CONTAINER BELOW TOP MARQUEE */}
        <div className="w-full relative flex items-start justify-start overflow-hidden pt-1">
          <video
            src={loginVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto object-contain object-top object-left block transform origin-top-left scale-[1.03]"
          />
        </div>

        {/* 3. 4 STATS BLOCKS: TOTAL LEADS, TOTAL CUSTOMERS, PROJECTS, CONVERSION RATE */}
        <div className="w-full px-3.5 pt-5 pb-3 mt-2 z-10 relative">
          <div className="grid grid-cols-4 gap-2.5">

            {/* Block 1: Total Leads */}
            <div className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-xl p-2.5 backdrop-blur-md transition-all duration-300 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span className="text-[9.5px] font-bold text-slate-200 uppercase tracking-wider">Total Leads</span>
              </div>
              <div className="text-base font-bold text-white tracking-tight">{stats.leads}</div>
            </div>

            {/* Block 2: Total Customers */}
            <div className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-xl p-2.5 backdrop-blur-md transition-all duration-300 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[9.5px] font-bold text-slate-200 uppercase tracking-wider">Total Customers</span>
              </div>
              <div className="text-base font-bold text-white tracking-tight">{stats.customers}</div>
            </div>

            {/* Block 3: Total Projects */}
            <div className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-xl p-2.5 backdrop-blur-md transition-all duration-300 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span className="text-[9.5px] font-bold text-slate-200 uppercase tracking-wider">Projects</span>
              </div>
              <div className="text-base font-bold text-white tracking-tight">{stats.projects}</div>
            </div>

            {/* Block 4: Conversion Rate */}
            <div className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-xl p-2.5 backdrop-blur-md transition-all duration-300 text-center flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span className="text-[9.5px] font-bold text-slate-200 uppercase tracking-wider">Conv. Rate</span>
              </div>
              <div className="text-base font-bold text-white tracking-tight">{stats.conversionRate}</div>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT SIDE: WHITE LOGIN BLOCK EXTENDING TO MEET VIDEO */}
      <div className="flex-1 h-full flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white items-center overflow-y-auto">

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
                className={`w-full h-[46px] rounded-lg text-white font-semibold text-sm bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer ${forgotLoading ? "opacity-75 cursor-not-allowed" : ""
                  }`}
              >
                {forgotLoading ? "Verifying Account..." : "Submit Reset Request"}
              </button>
            </form>

            {forgotStatus.message && (
              <div
                className={`mt-4 p-3 rounded-lg border text-xs font-medium leading-relaxed ${forgotStatus.type === "success"
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