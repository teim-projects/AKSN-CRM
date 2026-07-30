import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL;
  console.log("BASE_API :", BASE_API);

  const LOGIN_ENDPOINT = `${BASE_API}/auth/dj-rest-auth/login/`;

  const [form, setForm] = useState({ email_or_mobile: "", password: "" });
  const [message, setMessage] = useState("");

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

  return (
    /* 
      FIXED: Added 'fixed inset-0 w-screen h-screen z-50 overflow-y-auto' 
      to break completely free of any parent wrapper constraints (like container, margins, or padding).
    */
    <div className="fixed inset-0 w-screen h-screen z-50 overflow-y-auto grid grid-cols-1 md:grid-cols-[2.2fr_1fr] bg-white font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* LEFT SIDE: PRODUCT MARKETING BANNER */}
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

      {/* RIGHT SIDE: AUTHENTICATION FORM */}
      <div className="flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white items-center">
        
        {/* Form Container */}
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
                placeholder="admin@nexuscrm.com"
                className="w-full h-[46px] rounded-lg border border-slate-200 bg-[#F8FAFC]/60 px-4 text-sm text-slate-800 outline-none transition-all focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
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
                className="w-full h-[46px] rounded-lg border border-slate-200 bg-[#F8FAFC]/60 px-4 text-sm text-slate-800 outline-none transition-all focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
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
              
              <button type="button" className="text-[#3B82F6] hover:text-blue-700 text-[13px] font-medium transition-colors">
                Forgot password?
              </button>
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              className="w-full h-[46px] rounded-lg text-white font-semibold text-sm bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm tracking-wide mt-2"
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

        {/* Small Footer Copyright Text */}
        <div className="text-[11px] text-slate-400 font-medium mt-12 text-center tracking-wide">
          © 2024 AKSN CRM · Enterprise Edition v3.2.1
        </div>
      </div>

    </div>
  );
};

export default Login;



// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";

// const Login = () => {
//   const navigate = useNavigate();
//   const BASE_API = import.meta.env.VITE_BASE_API_URL;
//   console.log("BASE_API :", BASE_API);

//   const LOGIN_ENDPOINT = `${BASE_API}/auth/dj-rest-auth/login/`;

//   const [form, setForm] = useState({ email_or_mobile: "", password: "" });
//   const [message, setMessage] = useState("");

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setMessage("Logging in...");

//     try {
//       const res = await fetch(LOGIN_ENDPOINT, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(form),
//       });

//       const data = await res.json();
//       if (!res.ok) {
//         setMessage("❌ Login failed: " + JSON.stringify(data));
//         return;
//       }

//       if (data.access) localStorage.setItem("access", data.access);
//       if (data.refresh) localStorage.setItem("refresh", data.refresh);

//       window.dispatchEvent(new Event("authChange"));
      
//       setMessage("✅ Login successful!");
//       navigate("/dashboard");
//     } catch (error) {
//       console.error("Login error:", error);
//       setMessage("⚠️ Error connecting to server.");
//     }
//   };

//   return (
//     <div className="fixed inset-0 w-screen h-screen z-50 overflow-y-auto grid grid-cols-1 md:grid-cols-[2.2fr_1fr] bg-white font-sans antialiased selection:bg-blue-600 selection:text-white">
      
//       {/* LEFT SIDE: TALLY PARTNER MARKETING BANNER */}
//       <div className="hidden md:flex flex-col justify-between px-12 lg:px-20 py-16 bg-[#1D357E] text-white bg-gradient-to-br from-[#1E3A8A] via-[#1E293B] to-[#0F172A] items-center relative overflow-hidden">
        
//         {/* Background Decorative Animated Glows */}
//         <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
//         <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

//         <div className="w-full max-w-xl flex flex-col justify-between h-full relative z-10">
          
//           {/* Logo and Brand */}
//           <div className="flex items-center gap-3">
//             <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl shadow-lg shadow-amber-500/20">
//               <span className="text-xs font-black tracking-widest text-slate-950 uppercase">TALLY</span>
//             </div>
//             <div>
//               <span className="text-xl font-bold tracking-wide text-white block">AKSN CRM</span>
//               <span className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase block -mt-1">
//                 Authorized Tally Sales & Solutions
//               </span>
//             </div>
//           </div>

//           {/* Main Content Area */}
//           <div className="my-auto py-8">
//             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-medium mb-6">
//               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
//               Enterprise Tally Management Suite
//             </div>

//             <h1 className="text-4xl lg:text-[42px] font-bold leading-[1.18] mb-5 tracking-tight text-white">
//               Smart CRM for <br />
//               <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-teal-300 to-amber-300">
//                 Tally Partners & Solution Providers
//               </span>
//             </h1>
            
//             <p className="text-slate-300 text-[14.5px] leading-relaxed mb-8 opacity-90">
//               Streamline Tally Prime licensing, cloud hosting subscriptions, custom module delivery, and AMC renewals in one platform.
//             </p>

//             {/* Feature List Checklist */}
//             <ul className="space-y-3.5 text-[13.5px] font-medium text-slate-200/95">
//               <li className="flex items-center gap-3">
//                 <span className="flex items-center justify-center w-5 h-5 rounded-full border border-emerald-400/30 text-emerald-400 text-xs font-bold bg-emerald-500/10">✓</span>
//                 TallyPrime Serial & Multi-User License Tracking
//               </li>
//               <li className="flex items-center gap-3">
//                 <span className="flex items-center justify-center w-5 h-5 rounded-full border border-emerald-400/30 text-emerald-400 text-xs font-bold bg-emerald-500/10">✓</span>
//                 TSS Renewal & AMC Automated Alerts
//               </li>
//               <li className="flex items-center gap-3">
//                 <span className="flex items-center justify-center w-5 h-5 rounded-full border border-emerald-400/30 text-emerald-400 text-xs font-bold bg-emerald-500/10">✓</span>
//                 Tally on Cloud & Remote User Management
//               </li>
//               <li className="flex items-center gap-3">
//                 <span className="flex items-center justify-center w-5 h-5 rounded-full border border-emerald-400/30 text-emerald-400 text-xs font-bold bg-emerald-500/10">✓</span>
//                 Custom TDL & Integration Pipeline
//               </li>
//             </ul>
//           </div>

//           {/* ANIMATED TALLY SOLUTIONS SHOWCASE (REPLACED THE 3 STAT CARDS) */}
//           <div className="grid grid-cols-3 gap-3">
            
//             {/* Animated Card 1 */}
//             <div className="p-3.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl border border-white/[0.09] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 group">
//               <div className="flex items-center justify-between mb-1.5">
//                 <span className="text-[18px]">🏷️</span>
//                 <span className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:animate-ping"></span>
//               </div>
//               <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
//                 TallyPrime
//               </div>
//               <div className="text-[10px] text-slate-400 font-normal mt-0.5 leading-snug">
//                 Silver & Gold Licenses
//               </div>
//             </div>

//             {/* Animated Card 2 */}
//             <div className="p-3.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl border border-white/[0.09] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 group">
//               <div className="flex items-center justify-between mb-1.5">
//                 <span className="text-[18px]">☁️</span>
//                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:animate-ping"></span>
//               </div>
//               <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
//                 Tally on Cloud
//               </div>
//               <div className="text-[10px] text-slate-400 font-normal mt-0.5 leading-snug">
//                 Anytime Web Access
//               </div>
//             </div>

//             {/* Animated Card 3 */}
//             <div className="p-3.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl border border-white/[0.09] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 group">
//               <div className="flex items-center justify-between mb-1.5">
//                 <span className="text-[18px]">⚙️</span>
//                 <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:animate-ping"></span>
//               </div>
//               <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
//                 TDL & Add-ons
//               </div>
//               <div className="text-[10px] text-slate-400 font-normal mt-0.5 leading-snug">
//                 Custom Modules
//               </div>
//             </div>

//           </div>

//         </div>

//       </div>

//       {/* RIGHT SIDE: AUTHENTICATION FORM */}
//       <div className="flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-white items-center">
        
//         {/* Form Container */}
//         <div className="w-full max-w-[340px] my-auto">
          
//           <h2 className="text-3xl font-bold text-slate-900 mb-1.5 tracking-tight">
//             Welcome back
//           </h2>
//           <p className="text-[14px] text-slate-400 mb-9 font-medium">
//             Sign in to your account
//           </p>

//           <form onSubmit={handleSubmit} className="space-y-6">
            
//             {/* Email Address Field */}
//             <div>
//               <label className="block text-[12px] font-medium text-slate-600 mb-2">
//                 Email Address
//               </label>
//               <input
//                 type="text"
//                 name="email_or_mobile"
//                 value={form.email_or_mobile}
//                 onChange={handleChange}
//                 placeholder="admin@nexuscrm.com"
//                 className="w-full h-[46px] rounded-lg border border-slate-200 bg-[#F8FAFC]/60 px-4 text-sm text-slate-800 outline-none transition-all focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
//               />
//             </div>

//             {/* Password Field */}
//             <div>
//               <label className="block text-[12px] font-medium text-slate-600 mb-2">
//                 Password
//               </label>
//               <input
//                 type="password"
//                 name="password"
//                 value={form.password}
//                 onChange={handleChange}
//                 placeholder="•••••••••"
//                 className="w-full h-[46px] rounded-lg border border-slate-200 bg-[#F8FAFC]/60 px-4 text-sm text-slate-800 outline-none transition-all focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
//               />
//             </div>

//             {/* Checkbox and Forgot Link */}
//             <div className="flex items-center justify-between text-sm pt-0.5">
//               <label className="inline-flex items-center gap-2 cursor-pointer select-none">
//                 <input 
//                   type="checkbox" 
//                   defaultChecked
//                   className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 accent-blue-600 cursor-pointer" 
//                 />
//                 <span className="text-slate-700 text-[13px] font-medium">Remember me</span>
//               </label>
              
//               <button type="button" className="text-[#3B82F6] hover:text-blue-700 text-[13px] font-medium transition-colors">
//                 Forgot password?
//               </button>
//             </div>

//             {/* Action Submit Button */}
//             <button
//               type="submit"
//               className="w-full h-[46px] rounded-lg text-white font-semibold text-sm bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm tracking-wide mt-2"
//             >
//               Sign In to Dashboard
//             </button>
//           </form>

//           {/* Messaging banner */}
//           {message && (
//             <div className="mt-4 text-center text-xs text-slate-500 font-medium">
//               {message}
//             </div>
//           )}
//         </div>

//         {/* Small Footer Copyright Text */}
//         <div className="text-[11px] text-slate-400 font-medium mt-12 text-center tracking-wide">
//           © 2024 AKSN CRM · Enterprise Edition v3.2.1
//         </div>
//       </div>

//     </div>
//   );
// };

// export default Login;