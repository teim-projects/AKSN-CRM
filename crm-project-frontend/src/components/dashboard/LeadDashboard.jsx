import React from "react";

export default function LeadDashboard({
  stats = {},
  projects = [],
  isLoading = false,
}) {
  // SVG Donut chart math for lead sources
  const getDonutSegments = () => {
    let cumulative = 0;
    const sources = stats.leadsBySource || [];
    return sources.map((item) => {
      const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
      const strokeDashoffset = 100 - cumulative + 25;
      cumulative += item.percentage;
      return { ...item, strokeDasharray, strokeDashoffset };
    });
  };

  // Helper calculation for project revenue trend sourced from Projects Module
  const projectRevenueTrend = React.useMemo(() => {
    if (Array.isArray(projects) && projects.length > 0) {
      const now = new Date();
      const monthMap = {};
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en-IN", { month: "short" });
        months.push({ key, label });
        monthMap[key] = { label, revenue: 0 };
      }

      projects.forEach((prj) => {
        const val = parseFloat(prj.project_value || 0) || 0;
        const dateStr = prj.start_date || prj.created_at || prj.expected_to_go_live;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            if (monthMap[key]) {
              monthMap[key].revenue += val;
            }
          }
        } else {
          const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          if (monthMap[nowKey]) {
            monthMap[nowKey].revenue += val;
          }
        }
      });

      const rawMaxRev = Math.max(...Object.values(monthMap).map((m) => m.revenue), 0);
      let maxRev = rawMaxRev > 0 ? rawMaxRev : 100000;
      if (maxRev <= 100000) maxRev = 100000;
      else if (maxRev <= 500000) maxRev = 500000;
      else if (maxRev <= 1000000) maxRev = 1000000;
      else if (maxRev <= 2500000) maxRev = 2500000;
      else if (maxRev <= 5000000) maxRev = 5000000;
      else maxRev = Math.ceil(maxRev / 1000000) * 1000000;

      const formatLakhs = (amount) => {
        if (!amount || isNaN(amount) || amount === 0) return "₹0";
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
        return `₹${amount.toLocaleString("en-IN")}`;
      };

      const yTicks = [
        formatLakhs(maxRev),
        formatLakhs(Math.round(maxRev * 0.75)),
        formatLakhs(Math.round(maxRev * 0.5)),
        formatLakhs(Math.round(maxRev * 0.25)),
        "0L",
      ];

      return {
        trend: months.map((m) => ({
          month: m.label,
          revenue: monthMap[m.key].revenue,
          revNorm: maxRev > 0 ? (monthMap[m.key].revenue / maxRev) * 100 : 0,
          formattedRevenue: formatLakhs(monthMap[m.key].revenue),
        })),
        yTicks,
      };
    }

    return {
      trend: stats.revenueTrend || [],
      yTicks: stats.revenueYTicks || ["40L", "30L", "20L", "10L", "0L"],
    };
  }, [projects, stats.revenueTrend, stats.revenueYTicks]);

  // Helper points for smooth revenue curve
  const getPoints = () => {
    const trend = projectRevenueTrend.trend || [];
    if (!trend.length) return [];
    return trend.map((d, index) => {
      const x = (index / (trend.length - 1)) * 300;
      const y = 100 - (d.revNorm * 0.75 + 10);
      return { x, y, ...d };
    });
  };

  const buildSmoothPath = () => {
    const points = getPoints();
    if (!points.length) return "";
    return points.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const cpsX = (point.x + a[i - 1].x) / 2;
      return `${acc} C ${cpsX},${a[i - 1].y} ${cpsX},${point.y} ${point.x},${point.y}`;
    }, "");
  };

  return (
    <div className="w-full space-y-5 font-sans antialiased text-slate-800">
      {/* 1. DYNAMIC KPI BLOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Leads
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-base font-medium text-slate-400 animate-pulse">
                  Loading...
                </span>
              ) : (
                stats.totalLeads?.toLocaleString() || 0
              )}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>{stats.convertedLeads || 0} converted</span>
              <span className="text-slate-400 font-normal">to customers</span>
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Customers
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-base font-medium text-slate-400 animate-pulse">
                  Loading...
                </span>
              ) : (
                stats.totalCustomers?.toLocaleString() || 0
              )}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>Active customers</span>
              <span className="text-slate-400 font-normal">in system</span>
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"
              />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Conversion Rate
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-base font-medium text-slate-400 animate-pulse">
                  Loading...
                </span>
              ) : (
                `${stats.conversionRate || 0}%`
              )}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>{stats.convertedLeads || 0} converted</span>
              <span className="text-slate-400 font-normal">
                out of {stats.totalLeads || 0}
              </span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Avg Response Time
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              14m
            </h3>
            <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
              <span>↓ 4m faster</span>
              <span className="text-slate-400 font-normal">vs yesterday</span>
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. TOP ROW: LEAD SOURCE ANALYSIS, EXECUTIVE PERFORMANCE & FOLLOW-UP OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEAD SOURCE ANALYSIS WITH DONUT CHART */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Lead Source Analysis
            </h3>
            <p className="text-xs text-slate-400 mb-2">Distribution by channel</p>

            <div className="flex justify-center my-2">
              <div className="relative w-36 h-36">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    className="text-slate-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {getDonutSegments().map((seg, i) => (
                    <path
                      key={i}
                      stroke={seg.hexColor}
                      strokeWidth="4"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  ))}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs pt-2">
              {(stats.leadsBySource || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${item.bgColor}`}
                  ></span>
                  <span className="text-slate-600 truncate">{item.label}</span>
                  <span className="text-slate-400 font-normal">
                    ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* EXECUTIVE PERFORMANCE BLOCK */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Executive Performance
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Revenue by sales executive
            </p>

            <div className="space-y-4">
              {stats.executivePerformance &&
                stats.executivePerformance.length > 0 ? (
                stats.executivePerformance.map((exec, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">
                        {exec.name}
                      </span>
                      <span className="font-bold text-slate-900">
                        {exec.formattedRevenue}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${exec.progressWidth}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {exec.totalLeads} leads · {exec.wonLeads} won
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  No executive performance data
                </p>
              )}
            </div>
          </div>
        </div>

        {/* FOLLOW-UP OVERVIEW */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              Follow-up Overview
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-xs font-medium text-slate-600">
                  Total Follow-ups
                </span>
                <span className="text-base font-semibold text-slate-900">
                  {isLoading ? (
                    <span className="text-sm text-slate-400 animate-pulse">
                      Loading...
                    </span>
                  ) : (
                    stats.totalFollowups || 0
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-xs font-medium text-slate-600">
                  Today's Follow-ups
                </span>
                <span className="text-base font-semibold text-slate-900">
                  {isLoading ? (
                    <span className="text-sm text-slate-400 animate-pulse">
                      Loading...
                    </span>
                  ) : (
                    stats.todayFollowups || 0
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">
                  Overdue Follow-ups
                </span>
                <span className="text-base font-semibold text-rose-600">
                  {isLoading ? (
                    <span className="text-sm text-slate-400 animate-pulse">
                      Loading...
                    </span>
                  ) : (
                    stats.overdueFollowups || 0
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <span>📋</span> {stats.totalFollowups || 0} total follow-ups logged
            </span>
          </div>
        </div>
      </div>

      {/* 3. SECOND ROW: REVENUE TREND & MONTHLY LEAD TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* REVENUE TREND (SOURCED FROM PROJECTS MODULE) */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Revenue Trend
                </h3>
                <p className="text-xs text-slate-400">
                  Monthly project price / value · {new Date().getFullYear()}
                </p>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                Projects Module
              </span>
            </div>

            <div className="relative h-48 w-full pt-4">
              {/* Y-AXIS LABELS (DYNAMICALLY REFLECTS PROJECTS REVENUE TICKS) */}
              <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-slate-400">
                {(projectRevenueTrend.yTicks || stats.revenueYTicks || ["40L", "30L", "20L", "10L", "0L"]).map((tick, tIdx) => (
                  <span key={tIdx}>{String(tick).replace("₹", "")}</span>
                ))}
              </div>

              <div className="ml-8 h-full flex flex-col justify-between">
                <div className="relative h-36 w-full border-b border-slate-100">
                  {/* INTERACTIVE HOVER OVERLAY */}
                  <div className="absolute inset-0 flex justify-between z-20">
                    {getPoints().map((pt, idx) => (
                      <div
                        key={idx}
                        className="flex-1 group relative flex justify-center"
                      >
                        <div className="absolute bottom-full mb-3 hidden group-hover:block z-30 bg-white border border-slate-200 shadow-xl rounded-xl p-3 text-left min-w-[130px]">
                          <p className="text-xs font-bold text-slate-900">
                            {pt.month}
                          </p>
                          <p className="text-xs font-semibold text-blue-600 mt-1">
                            Project Revenue : {pt.formattedRevenue}
                          </p>
                        </div>
                        <div className="w-[1px] h-full bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div
                          className="absolute w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ top: `${pt.y}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>

                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 300 100"
                    preserveAspectRatio="none"
                  >
                    <path
                      d={`${buildSmoothPath()} L 300,100 L 0,100 Z`}
                      fill="rgba(37, 99, 235, 0.08)"
                    />
                    <path
                      d={buildSmoothPath()}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>

                {/* X-AXIS LABELS */}
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  {(projectRevenueTrend.trend || stats.revenueTrend || []).map((item, idx) => (
                    <span key={idx} className="flex-1 text-center">
                      {item.month}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-600 font-medium">Project Revenue</span>
            </div>
          </div>
        </div>

        {/* MONTHLY LEAD TREND */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-3 sm:p-5 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="mb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Lead Trend
              </h3>
              <p className="text-xs text-slate-400">
                Leads vs Conversions · {new Date().getFullYear()}
              </p>
            </div>

            <div className="relative h-48 w-full pt-4">
              {/* Y-AXIS LABELS */}
              <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] sm:text-[10px] text-slate-400 z-10 bg-white/80 pr-1">
                <span>160</span>
                <span>120</span>
                <span>80</span>
                <span>40</span>
                <span>0</span>
              </div>

              <div className="ml-7 sm:ml-8 h-full flex flex-col justify-between overflow-x-auto thin-scrollbar">
                <div className="relative h-36 w-full min-w-[280px] border-b border-slate-100 flex items-end justify-between px-0.5 sm:px-1">
                  {(stats.monthlyTrend || []).map((bar, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex items-end justify-center gap-0.5 sm:gap-1 group relative h-full"
                    >
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 bg-white border border-slate-200 shadow-lg rounded-lg p-2 text-left min-w-[100px]">
                        <p className="text-xs font-bold text-slate-900">
                          {bar.month}
                        </p>
                        <p className="text-[11px] text-blue-400 mt-0.5">
                          Total Leads : {bar.total}
                        </p>
                        <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                          Converted : {bar.converted}
                        </p>
                      </div>

                      <div
                        className="w-1.5 sm:w-2.5 md:w-3.5 bg-blue-200 rounded-t-sm sm:rounded-t-md transition-all duration-200 group-hover:bg-blue-300"
                        style={{ height: `${bar.totalHeight}%` }}
                      ></div>
                      <div
                        className="w-1.5 sm:w-2.5 md:w-3.5 bg-blue-600 rounded-t-sm sm:rounded-t-md transition-all duration-200 group-hover:bg-blue-700"
                        style={{ height: `${bar.convertedHeight}%` }}
                      ></div>
                    </div>
                  ))}
                </div>

                {/* X-AXIS LABELS */}
                <div className="flex justify-between text-[8px] sm:text-[10px] text-slate-400 pt-1 min-w-[280px]">
                  {(stats.monthlyTrend || []).map((item, idx) => (
                    <span key={idx} className="flex-1 text-center truncate">
                      {item.month}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 sm:gap-6 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-200"></span>
              <span className="text-slate-600 font-medium text-[11px] sm:text-xs">
                Total Leads
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span>
              <span className="text-slate-600 font-medium text-[11px] sm:text-xs">
                Converted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ROW: LEAD STATUS, PIPELINE STAGES & RECENT ACTIVITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEAD STATUS BREAKDOWN */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-4 tracking-wide uppercase">
              Lead Status Breakdown
            </h3>
            <div className="space-y-3.5">
              {stats.leadsByStatus && stats.leadsByStatus.length > 0 ? (
                stats.leadsByStatus.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="text-slate-900 font-semibold">
                        {item.count}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No leads found
                </p>
              )}
            </div>
          </div>
        </div>

        {/* PIPELINE STAGES */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-4 tracking-wide uppercase">
              Pipeline Stages
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.leadsByStage && stats.leadsByStage.length > 0 ? (
                stats.leadsByStage.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center border-b border-slate-50 pb-2"
                  >
                    <span className="text-xs font-medium text-slate-600">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {item.count}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4 col-span-2">
                  No pipeline data
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITIES LOG */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5">
        <h3 className="text-xs font-bold text-slate-900 mb-4 tracking-wide uppercase">
          Recent Lead Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="pb-2.5 pl-1">Lead Name</th>
                <th className="pb-2.5">Source</th>
                <th className="pb-2.5">Assigned Agent</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right pr-1">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition">
                    <td className="py-2.5 pl-1 text-slate-900 font-semibold">
                      {row.name}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-normal">
                        {row.source}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {row.agent === "Unassigned" ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] border border-rose-200 font-bold">
                          ⚠️ Assign Now
                        </span>
                      ) : (
                        row.agent
                      )}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${row.status === "close_win" || row.status === "closed"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "close_loss"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-blue-100 text-blue-700"
                          }`}
                      >
                        {row.status === "close_win"
                          ? "Close Win"
                          : row.status === "close_loss"
                            ? "Close Loss"
                            : row.status || "Open"}
                      </span>
                      {row.isConverted && (
                        <span className="ml-1 text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold">
                          ✓ Converted
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right pr-1 text-slate-400">
                      {row.time}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="py-4 text-center text-slate-400 text-xs"
                  >
                    No recent activity
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
