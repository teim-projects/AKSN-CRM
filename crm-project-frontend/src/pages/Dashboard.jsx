import React, { useEffect, useState } from "react";
import Base from "../components/Base";

export default function Dashboard() {
  const [totalLeads, setTotalLeads] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const BASE_API = import.meta.env.VITE_BASE_API_URL;
  const LEADS_ENDPOINT = `${BASE_API}/lead/lead/`;

  useEffect(() => {
    const fetchLeads = async () => {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("token") ||
        "";

      try {
        setIsLoading(true);
        const res = await fetch(LEADS_ENDPOINT, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) throw new Error("Failed to fetch leads");
        const data = await res.json();
        setTotalLeads(data.count ?? 0);
      } catch (error) {
        console.error("API Error fetching leads: ", error);
        setTotalLeads(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [LEADS_ENDPOINT]);

  return (
    <Base title="" filterTitle="Dashboard Filters">
      {/* Counteracted root component padding bounds by applying full window layouts */}
      <div className="w-full space-y-5 font-sans antialiased text-slate-800 -mt-5 -mx-2 px-1">
        
        {/* HEADER WELCOME BANNER WITH LEFT ACCENT LINE */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 pt-2">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Performance Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">Real-time overview of your pipeline performance metrics.</p>
            </div>
          </div>
          <div className="mt-3 md:mt-0 flex gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
        </div>

        {/* 1. DYNAMIC KPI BLOCK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isLoading ? (
                  <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span>
                ) : (
                  totalLeads?.toLocaleString()
                )}
              </h3>
              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span>↑ 12.4%</span>
                <span className="text-slate-400 font-normal">vs last month</span>
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656 Sec126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversion Rate</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">24.8%</h3>
              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span>↑ 2.1%</span>
                <span className="text-slate-400 font-normal">target benchmark</span>
              </p>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Response Time</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">14m</h3>
              <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                <span>↓ 4m faster</span>
                <span className="text-slate-400 font-normal">vs yesterday</span>
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* SECONDARY SECTION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* PIPELINE STATUS DISTRIBUTION */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 mb-4 tracking-wide uppercase">Lead Status Breakdown</h3>
              <div className="space-y-3.5">
                {[
                  { label: "New / Unassigned", count: "420", pct: "w-[42%]", color: "bg-blue-600" },
                  { label: "Contacted / Qualified", count: "310", pct: "w-[31%]", color: "bg-indigo-500" },
                  { label: "Proposal Sent", count: "180", pct: "w-[18%]", color: "bg-amber-500" },
                  { label: "Negotiation", count: "90", pct: "w-[9%]", color: "bg-rose-500" },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="text-slate-900 font-semibold">{item.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} ${item.pct}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
              <span>Updated 5 mins ago</span>
              <button className="text-blue-600 font-semibold hover:underline">View Pipeline →</button>
            </div>
          </div>

          {/* LEAD ACQUISITION TRENDS */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">Lead Volume Trend (H1)</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 uppercase">Jan - Jun</span>
              </div>
              
              <div className="flex items-end justify-between gap-3 h-32 pt-4 px-2">
                {[
                  { month: "Jan", val: "h-[45%]", leads: "450" },
                  { month: "Feb", val: "h-[60%]", leads: "600" },
                  { month: "Mar", val: "h-[55%]", leads: "550" },
                  { month: "Apr", val: "h-[85%]", leads: "850" },
                  { month: "May", val: "h-[70%]", leads: "700" },
                  { month: "Jun", val: "h-[100%]", leads: "1,042" },
                ].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-0.5">
                      {bar.leads}
                    </div>
                    <div className="w-full h-full bg-slate-50 rounded-t-sm relative min-h-[120px] flex items-end">
                      <div className={`w-full ${bar.val} bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-sm opacity-90 group-hover:opacity-100 transition-all`}></div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 mt-1">{bar.month}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span>⚡</span> Peak performance achieved in June
              </span>
            </div>
          </div>

        </div>

        {/* RECENT ACTIVITIES LOG */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-900 mb-4 tracking-wide uppercase">Recent Lead Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-2.5 pl-1">Lead Name</th>
                  <th className="pb-2.5">Source</th>
                  <th className="pb-2.5">Assigned Agent</th>
                  <th className="pb-2.5 text-right pr-1">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                {[
                  { name: "Alpha Tech Solutions", source: "Google Ads", agent: "Sarah Jenkins", time: "Just now" },
                  { name: "David Miller", source: "Website Form", agent: "Michael Chang", time: "14 mins ago" },
                  { name: "Quantum Logistics", source: "LinkedIn Referral", agent: "Sarah Jenkins", time: "1 hour ago" },
                  { name: "Elena Rostova", source: "Direct Inbound", agent: "Unassigned", time: "2 hours ago", alert: true },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition">
                    <td className="py-2.5 pl-1 text-slate-900 font-semibold">{row.name}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-normal">{row.source}</span>
                    </td>
                    <td className="py-2.5">
                      {row.alert ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] border border-rose-200 font-bold">⚠️ Assign Now</span>
                      ) : (
                        row.agent
                      )}
                    </td>
                    <td className="py-2.5 text-right pr-1 text-slate-400">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Base>
  );
}