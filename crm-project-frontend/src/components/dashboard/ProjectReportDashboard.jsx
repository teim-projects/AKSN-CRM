import React, { useMemo, useState } from "react";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
  Building,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Activity,
  Briefcase,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function ProjectReportDashboard({
  projects = [],
  isLoading = false,
}) {
  const totalProjects = projects.length;

  // Format currency helper
  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount) || amount === 0) return "₹0";
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calculations
  const {
    totalValue,
    completedCount,
    inProgressCount,
    criticalCount,
    stageCounts,
    priorityCounts,
    withAmcCount,
    recentProjects,
  } = useMemo(() => {
    let totalVal = 0;
    let completed = 0;
    let inProgress = 0;
    let critical = 0;
    let withAmc = 0;

    const stages = {
      requirement_analysis: { label: "Requirement Analysis", count: 0, color: "bg-amber-500", lightBg: "bg-amber-50 text-amber-700 border-amber-200" },
      system_design: { label: "System Design", count: 0, color: "bg-blue-500", lightBg: "bg-blue-50 text-blue-700 border-blue-200" },
      development_procurement: { label: "Procurement / Dev", count: 0, color: "bg-indigo-500", lightBg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      installation_implementation: { label: "Installation / Rollout", count: 0, color: "bg-cyan-500", lightBg: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      testing_qa: { label: "Testing / QA", count: 0, color: "bg-purple-500", lightBg: "bg-purple-50 text-purple-700 border-purple-200" },
      go_live: { label: "Go Live / Completed", count: 0, color: "bg-emerald-500", lightBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      other: { label: "Other / Maintenance", count: 0, color: "bg-slate-500", lightBg: "bg-slate-50 text-slate-700 border-slate-200" },
    };

    const priorities = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    projects.forEach((prj) => {
      const val = parseFloat(prj.project_value || 0) || 0;
      totalVal += val;

      const stageKey = (prj.project_stage || "").toLowerCase();
      if (stageKey === "go_live" || stageKey === "completed") {
        completed += 1;
        stages.go_live.count += 1;
      } else if (stages[stageKey]) {
        inProgress += 1;
        stages[stageKey].count += 1;
      } else {
        inProgress += 1;
        stages.other.count += 1;
      }

      const prio = (prj.priority || "medium").toLowerCase();
      if (priorities[prio] !== undefined) {
        priorities[prio] += 1;
      }
      if (prio === "critical" || prio === "high") {
        critical += 1;
      }

      if (prj.amc_start_date || prj.amc_end_date) {
        withAmc += 1;
      }
    });

    const recent = [...projects]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8);

    return {
      totalValue: totalVal,
      completedCount: completed,
      inProgressCount: inProgress,
      criticalCount: critical,
      stageCounts: stages,
      priorityCounts: priorities,
      withAmcCount: withAmc,
      recentProjects: recent,
    };
  }, [projects]);

  const completionRate =
    totalProjects > 0 ? ((completedCount / totalProjects) * 100).toFixed(1) : "0.0";

  return (
    <div className="w-full space-y-5 font-sans antialiased text-slate-800">
      {/* 1. TOP STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Projects */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Projects
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? "..." : totalProjects}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>{inProgressCount} active</span>
              <span className="text-slate-400 font-normal">in pipeline</span>
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        {/* Total Commercial Value */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Project Value
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? "..." : formatCurrency(totalValue)}
            </h3>
            <p className="text-[11px] font-medium text-indigo-600 flex items-center gap-1">
              <span>Across {totalProjects} project deliveries</span>
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Go-Live / Completed */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Go-Live & Delivered
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? "..." : completedCount}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>{completionRate}%</span>
              <span className="text-slate-400 font-normal">completion rate</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Critical & High Priority */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              High Priority & Risks
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? "..." : criticalCount}
            </h3>
            <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
              <span>{priorityCounts.critical} critical priority</span>
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: STAGE BREAKDOWN & COMMERCIAL REPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Project Stage Lifecycle Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Project Execution Stage Pipeline
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time milestone progress across project lifecycles
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {inProgressCount} Active in Pipeline
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {Object.entries(stageCounts).map(([key, st]) => {
                const pct =
                  totalProjects > 0 ? Math.round((st.count / totalProjects) * 100) : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${st.color}`}></span>
                        {st.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{st.count}</span>
                        <span className="text-[11px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${st.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>
              Delivery Lifecycle: <strong>{completionRate}%</strong> completed / live
            </span>
            <Link
              to="/projects"
              className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Open Projects Board <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Priority & AMC Attachment Summary */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Priority & Service Scope
                </h3>
                <p className="text-xs text-slate-400">Risk classification and warranties</p>
              </div>
            </div>

            {/* Priority Bars */}
            <div className="space-y-2.5 mb-5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Priority Breakdown
              </span>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs">
                <span className="font-semibold text-rose-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span> Critical
                </span>
                <strong className="text-rose-900 font-bold">{priorityCounts.critical}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-xs">
                <span className="font-semibold text-amber-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span> High Priority
                </span>
                <strong className="text-amber-900 font-bold">{priorityCounts.high}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                <span className="font-semibold text-blue-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span> Medium
                </span>
                <strong className="text-blue-900 font-bold">{priorityCounts.medium}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Low
                </span>
                <strong className="text-slate-800 font-bold">{priorityCounts.low}</strong>
              </div>
            </div>

            {/* AMC Attachment */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  AMC Warranty Linked
                </span>
                <span className="text-xs font-extrabold text-emerald-800">
                  {withAmcCount} of {totalProjects}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">
                {totalProjects > 0 ? Math.round((withAmcCount / totalProjects) * 100) : 0}% of projects have active maintenance coverage scheduled.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-right">
            <span className="text-[11px] text-slate-400">
              Commercial Audit Active
            </span>
          </div>
        </div>
      </div>

      {/* 3. PROJECT DIRECTORY & EXECUTION TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Recent Project Deliveries & Status Report
            </h3>
            <p className="text-xs text-slate-400">
              Active projects, customer assignments, stage progression, and commercial value
            </p>
          </div>
          <Link
            to="/projects"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 border border-blue-200 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
          >
            View All in Projects Module ({totalProjects}) <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Project Code</th>
                <th className="py-2.5 px-3">Customer / Client</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Go Live Date</th>
                <th className="py-2.5 px-3 text-right">Project Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentProjects.map((p) => {
                const stageKey = (p.project_stage || "").toLowerCase();
                const stageObj = stageCounts[stageKey] || stageCounts.other;
                const custName =
                  p.customer_details?.company_name ||
                  p.customer_details?.name ||
                  p.customer ||
                  "—";
                const pVal = parseFloat(p.project_value || 0);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                      {p.project_code || `#${p.id}`}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {custName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageObj.lightBg}`}
                      >
                        {p.project_stage_display || stageObj.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${p.priority === "critical"
                            ? "bg-red-50 text-red-700 border border-red-200 font-bold"
                            : p.priority === "high"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                      >
                        {p.priority || "Medium"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDate(p.expected_to_go_live || p.start_date)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {pVal > 0 ? formatCurrency(pVal) : "—"}
                    </td>
                  </tr>
                );
              })}

              {recentProjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No project records found in the system
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
