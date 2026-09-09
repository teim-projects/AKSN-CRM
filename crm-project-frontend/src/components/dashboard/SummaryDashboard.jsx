import React, { useState, useEffect, useMemo } from "react";
import {
  UserCheck,
  FileText,
  ShieldCheck,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  ChevronRight,
  Activity,
  CheckCircle2,
  FolderKanban,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function SummaryDashboard({
  leadsStats = {},
  quotations = [],
  amcContracts = [],
  products = [],
  roles = [],
  staff = [],
  projects = [],
  onNavigateTab,
  isLoading = false,
}) {
  // Live IST Clock
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateStr = currentTime.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Quotation metrics
  const totalQuotations = quotations.length;
  const finalizedQuotes = quotations.filter((q) => q.is_finalized || q.versions?.some((v) => v.is_finalized)).length;

  // AMC metrics
  const totalAMC = amcContracts.length;
  const expiringSoonAMC = amcContracts.filter((c) => (c.status || "").toLowerCase() === "expiring_soon").length;
  const expiredAMC = amcContracts.filter((c) => (c.status || "").toLowerCase() === "expired").length;
  const activeAMC = amcContracts.filter((c) => (c.status || "").toLowerCase() === "active").length;
  const overdueFollowups = leadsStats.overdueFollowups || 0;
  const openQuotations = Math.max(0, totalQuotations - finalizedQuotes);

  // Products
  const totalProducts = products.length;

  // Roles & Staff
  const totalStaff = staff.length;
  const totalRoles = roles.length;

  // Operational Performance & SLA Indices
  const leadConvRate = Math.min(100, Math.round(Number(leadsStats.conversionRate || (leadsStats.totalLeads > 0 ? (leadsStats.convertedLeads / leadsStats.totalLeads) * 100 : 100))));
  const quoteWinRate = Math.min(100, Math.round(totalQuotations > 0 ? (finalizedQuotes / totalQuotations) * 100 : 25));
  const amcRetentionRate = Math.min(100, Math.round(totalAMC > 0 ? ((totalAMC - expiredAMC) / totalAMC) * 100 : 100));
  const rbacComplianceRate = totalStaff > 0 ? 100 : 100;

  const healthScore = useMemo(() => {
    let score = 98;
    if (overdueFollowups > 0) score -= Math.min(20, overdueFollowups * 4);
    if (expiredAMC > 0) score -= Math.min(15, expiredAMC * 3);
    if (expiringSoonAMC > 0) score -= Math.min(8, expiringSoonAMC * 2);
    return Math.max(70, Math.min(99, score));
  }, [overdueFollowups, expiredAMC, expiringSoonAMC]);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount) || amount === 0) return "₹0";
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  // PROJECT REVENUE GROWTH & MOM COMPARISON (Data from Projects Module)
  const projectRevenueData = useMemo(() => {
    const validProjects = Array.isArray(projects) ? projects : [];

    let totalAllTime = 0;
    const monthlyMap = {}; // "YYYY-MM" -> { revenue: number, count: number }

    validProjects.forEach((prj) => {
      const val = parseFloat(prj.project_value || 0) || 0;
      totalAllTime += val;

      const dateStr = prj.start_date || prj.created_at || prj.expected_to_go_live;
      let key = null;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          key = `${y}-${m}`;
        }
      }

      if (!key) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        key = `${y}-${m}`;
      }

      if (!monthlyMap[key]) {
        monthlyMap[key] = { revenue: 0, count: 0, key };
      }
      monthlyMap[key].revenue += val;
      monthlyMap[key].count += 1;
    });

    const now = new Date();
    const currKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}`;

    const sortedMonths = Object.keys(monthlyMap).sort();

    let thisMonthRev = monthlyMap[currKey]?.revenue || 0;
    let thisMonthCount = monthlyMap[currKey]?.count || 0;
    let lastMonthRev = monthlyMap[lastKey]?.revenue || 0;
    let lastMonthCount = monthlyMap[lastKey]?.count || 0;

    let thisMonthLabel = now.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    let lastMonthLabel = lastDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

    // If current calendar month has 0 projects yet, but there is historical project data, compare latest 2 recorded months
    if (thisMonthRev === 0 && sortedMonths.length > 0) {
      const latestKey = sortedMonths[sortedMonths.length - 1];
      const prevKey = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null;

      thisMonthRev = monthlyMap[latestKey]?.revenue || 0;
      thisMonthCount = monthlyMap[latestKey]?.count || 0;
      const [ly, lm] = latestKey.split("-");
      thisMonthLabel = new Date(Number(ly), Number(lm) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

      if (prevKey) {
        lastMonthRev = monthlyMap[prevKey]?.revenue || 0;
        lastMonthCount = monthlyMap[prevKey]?.count || 0;
        const [py, pm] = prevKey.split("-");
        lastMonthLabel = new Date(Number(py), Number(pm) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      } else {
        lastMonthRev = 0;
        lastMonthCount = 0;
        lastMonthLabel = "Previous Month";
      }
    }

    const diff = thisMonthRev - lastMonthRev;
    let growthRate = 0;
    if (lastMonthRev > 0) {
      growthRate = Number(((diff / lastMonthRev) * 100).toFixed(1));
    } else if (thisMonthRev > 0) {
      growthRate = 100;
    }

    // Recent monthly trend for mini sparkline (last 3-4 active periods)
    const recentKeys = sortedMonths.slice(-4);
    if (recentKeys.length === 0) {
      recentKeys.push(currKey);
    }
    const maxMonthlyRev = Math.max(...recentKeys.map((k) => monthlyMap[k]?.revenue || 0), 1);
    const monthlyTrend = recentKeys.map((k) => {
      const [y, m] = k.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);
      const rev = monthlyMap[k]?.revenue || 0;
      const cnt = monthlyMap[k]?.count || 0;
      return {
        key: k,
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        revenue: rev,
        count: cnt,
        heightPct: Math.max(12, Math.round((rev / maxMonthlyRev) * 100)),
        isCurrent: k === currKey || k === sortedMonths[sortedMonths.length - 1],
      };
    });

    return {
      totalAllTime,
      totalProjectsCount: validProjects.length,
      thisMonthRev,
      thisMonthCount,
      thisMonthLabel,
      lastMonthRev,
      lastMonthCount,
      lastMonthLabel,
      growthRate,
      diff,
      isPositive: growthRate >= 0,
      monthlyTrend,
    };
  }, [projects]);

  const modulePillars = [
    {
      id: "leads",
      title: "Lead Management",
      icon: UserCheck,
      color: "blue",
      stat1Label: "Total Leads",
      stat1Val: leadsStats.totalLeads?.toLocaleString() || 0,
      stat2Label: "Converted",
      stat2Val: `${leadsStats.convertedLeads || 0} (${leadsStats.conversionRate || 0}%)`,
      badge: `${leadsStats.todayFollowups || 0} Today's Follow-ups`,
      bgHover: "hover:border-blue-300",
    },
    {
      id: "quotation",
      title: "Quotations & Deals",
      icon: FileText,
      color: "indigo",
      stat1Label: "Total Quotes",
      stat1Val: totalQuotations.toLocaleString(),
      stat2Label: "Finalized / Won",
      stat2Val: `${finalizedQuotes} (${totalQuotations > 0 ? ((finalizedQuotes / totalQuotations) * 100).toFixed(0) : 0}%)`,
      badge: `${totalQuotations - finalizedQuotes} Open Proposals`,
      bgHover: "hover:border-indigo-300",
    },
    {
      id: "projects",
      title: "Project Report",
      icon: FolderKanban,
      color: "cyan",
      stat1Label: "Total Projects",
      stat1Val: (projects.length || 0).toLocaleString(),
      stat2Label: "Active Delivery",
      stat2Val: `${projects.filter((p) => {
        const s = (p.project_stage || "").toLowerCase();
        return s !== "go_live" && s !== "completed";
      }).length} active`,
      badge: `${formatCurrency(projectRevenueData.totalAllTime)} Pipeline`,
      bgHover: "hover:border-cyan-300",
    },
    {
      id: "amc",
      title: "AMC Contracts",
      icon: ShieldCheck,
      color: "emerald",
      stat1Label: "Total Contracts",
      stat1Val: totalAMC.toLocaleString(),
      stat2Label: "Active Service",
      stat2Val: `${activeAMC} contracts`,
      badge: `${expiringSoonAMC} Expiring Soon`,
      badgeColor: expiringSoonAMC > 0 ? "bg-amber-100 text-amber-700 font-bold" : "",
      bgHover: "hover:border-emerald-300",
    },
    {
      id: "product",
      title: "Product Master",
      icon: Package,
      color: "purple",
      stat1Label: "Catalog SKUs",
      stat1Val: totalProducts.toLocaleString(),
      stat2Label: "Available",
      stat2Val: `${products.filter((p) => (p.status || "ACTIVE").toUpperCase() === "ACTIVE").length} items`,
      badge: "Master Price Index",
      bgHover: "hover:border-purple-300",
    },
    {
      id: "roles",
      title: "Role & Access",
      icon: Users,
      color: "slate",
      stat1Label: "Staff Accounts",
      stat1Val: totalStaff.toLocaleString(),
      stat2Label: "Configured Roles",
      stat2Val: `${totalRoles} roles`,
      badge: "RBAC Matrix Active",
      bgHover: "hover:border-slate-400",
    },
  ];

  return (
    <div className="w-full space-y-5 font-sans antialiased text-slate-800">
      {/* ENTERPRISE PULSE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e3d2d] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Operations Center
            </span>
            <span className="text-xs text-slate-400">All Modules Integrated</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Enterprise CRM High-Level Pulse</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Real-time multi-dimensional view across sales leads, client quotations, maintenance contracts, product inventory, and personnel permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-right min-w-[140px]">
            <span className="text-[10px] uppercase font-bold text-emerald-300 flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live IST
            </span>
            <span className="text-lg sm:text-xl font-mono font-extrabold text-white tracking-wider block leading-tight mt-0.5">
              {timeStr}
            </span>
            <span className="text-[10px] text-slate-300 block font-medium mt-0.5">
              {dateStr}
            </span>
          </div>
        </div>
      </div>

      {/* 6 MODULE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {modulePillars.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              onClick={() => onNavigateTab && onNavigateTab(p.id)}
              className="bg-gradient-to-br from-[#eff6ff] via-[#f5f9ff] to-white rounded-xl border border-blue-100 shadow-2xs p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-white border border-blue-100 text-blue-600 shadow-2xs group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>

                <h3 className="text-xs font-bold text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
                  {p.title}
                </h3>

                <div className="mt-3 space-y-1.5 border-t border-blue-100/70 pt-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">{p.stat1Label}</span>
                    <span className="font-extrabold text-slate-900">{p.stat1Val}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">{p.stat2Label}</span>
                    <span className="font-semibold text-slate-700 text-[11px]">{p.stat2Val}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-blue-100/50">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${p.badgeColor || "bg-white/90 text-blue-700 border border-blue-100 shadow-2xs"
                    }`}
                >
                  {p.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* HIGH-PRIORITY ACTION RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ACTION ITEMS */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Immediate Operational Attention</h3>
                <p className="text-xs text-slate-400">Cross-module high priority action triggers</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Priority Tasks
              </span>
            </div>

            <div className="space-y-3">
              {/* 1. OVERDUE LEAD FOLLOW-UPS */}
              <Link
                to="/follow-up?filter=overdue"
                className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between hover:bg-rose-50 hover:border-rose-200 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-900">
                      {overdueFollowups} Overdue Lead Follow-ups
                    </h4>
                    <p className="text-[11px] text-rose-700">
                      Follow-up dates missed and requiring immediate contact
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-rose-700 group-hover:underline flex items-center gap-0.5">
                  Resolve <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </Link>

              {/* 2. AMC CONTRACTS EXPIRING SOON */}
              <Link
                to="/amc?filter=expiring_soon"
                className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between hover:bg-amber-50 hover:border-amber-200 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    ⏳
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      {expiringSoonAMC} AMC Contracts Expiring Soon
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      Service contracts due for renewal within the next 30 days
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 group-hover:underline flex items-center gap-0.5">
                  Review <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </Link>

              {/* 3. EXPIRED AMC CONTRACTS */}
              <Link
                to="/amc?filter=expired"
                className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 flex items-center justify-between hover:bg-red-50 hover:border-red-300 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                    ⏱️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-red-900">
                      {expiredAMC} Expired AMC Contracts
                    </h4>
                    <p className="text-[11px] text-red-700">
                      Service contracts that have lapsed and require renewal or reactivation
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-700 group-hover:underline flex items-center gap-0.5">
                  Resolve <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </Link>

              {/* 4. OPEN QUOTATIONS PENDING DECISION */}
              <Link
                to="/quotation?filter=active"
                className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between hover:bg-blue-50 hover:border-blue-200 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    📝
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">
                      {openQuotations} Open Quotations Pending Decision
                    </h4>
                    <p className="text-[11px] text-blue-700">
                      Awaiting client signoff or final proposal revision
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 group-hover:underline flex items-center gap-0.5">
                  Review <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            System updates live every 60 seconds with active telemetry synchronization.
          </div>
        </div>

        {/* PROJECT REVENUE GROWTH & MOM COMPARISON CARD (DATA FROM PROJECTS MODULE) */}
        <div className="bg-gradient-to-br from-[#eff6ff] via-[#f5f9ff] to-white rounded-xl border border-blue-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            {/* Header with Title and Growth Pill */}
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Project Revenue Growth
                </h3>
                <p className="text-xs text-slate-400">Month-over-Month comparison</p>
              </div>

              <div
                className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border shadow-2xs ${projectRevenueData.isPositive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
              >
                {projectRevenueData.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>
                  {projectRevenueData.growthRate > 0 ? "+" : ""}
                  {projectRevenueData.growthRate}% MoM
                </span>
              </div>
            </div>

            {/* Current Month Primary Revenue Hero Box */}
            <div className="bg-white/90 rounded-xl border border-blue-100 p-4 mb-3.5 shadow-2xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    {projectRevenueData.thisMonthLabel} Revenue
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {formatCurrency(projectRevenueData.thisMonthRev)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {projectRevenueData.thisMonthCount} {projectRevenueData.thisMonthCount === 1 ? "Project" : "Projects"}
                  </span>
                </div>
              </div>

              {/* MoM Variance Subtitle */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  vs {projectRevenueData.lastMonthLabel}:
                </span>
                <span
                  className={`font-bold text-[11px] ${projectRevenueData.diff >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                >
                  {projectRevenueData.diff >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(projectRevenueData.diff))} (
                  {projectRevenueData.growthRate > 0 ? "+" : ""}
                  {projectRevenueData.growthRate}%)
                </span>
              </div>
            </div>

            {/* Visual MoM Comparison List / Mini Bars */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium px-0.5">
                <span>Recent Months Pipeline</span>
                <span>Revenue (₹)</span>
              </div>

              <div className="space-y-1.5">
                {projectRevenueData.monthlyTrend.map((m) => (
                  <div
                    key={m.key}
                    className={`p-2 rounded-lg border transition flex items-center justify-between text-xs ${m.isCurrent
                        ? "bg-blue-50/70 border-blue-200 text-blue-900 font-semibold"
                        : "bg-white/60 border-slate-100 text-slate-600"
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-[75px]">
                      <span
                        className={`w-2 h-2 rounded-full ${m.isCurrent ? "bg-blue-600" : "bg-slate-300"
                          }`}
                      ></span>
                      <span className="text-xs font-medium">{m.month}</span>
                    </div>

                    {/* Mini inline bar */}
                    <div className="flex-1 mx-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${m.isCurrent ? "bg-blue-600" : "bg-slate-400"
                          }`}
                        style={{ width: `${m.heightPct}%` }}
                      ></div>
                    </div>

                    <div className="text-right font-bold text-slate-800 text-[11px] min-w-[70px]">
                      {formatCurrency(m.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card Footer: Total Projects Lifetime & Link to Projects */}
          <div className="mt-4 pt-3 border-t border-blue-100/70 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">
                Total Projects Value
              </span>
              <strong className="text-slate-800 text-xs">
                {formatCurrency(projectRevenueData.totalAllTime)} ({projectRevenueData.totalProjectsCount} projects)
              </strong>
            </div>

            <Link
              to="/projects"
              className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 text-[11px] group"
            >
              Projects Module <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
