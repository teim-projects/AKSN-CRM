import React, { useState, useMemo } from "react";
import {
  Users,
  Shield,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Lock,
  ArrowUpRight,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SYSTEM_MODULES } from "../accounts/RolePermissionManagement";

// Harmonious, elegant pastel palette with high visual contrast and clarity
const PASTEL_PALETTE = [
  { hex: "#60A5FA", bgClass: "bg-[#60A5FA]", border: "#3B82F6", text: "#1E40AF", lightBg: "#EFF6FF", name: "Sky" },
  { hex: "#34D399", bgClass: "bg-[#34D399]", border: "#10B981", text: "#065F46", lightBg: "#ECFDF5", name: "Mint" },
  { hex: "#A78BFA", bgClass: "bg-[#A78BFA]", border: "#8B5CF6", text: "#5B21B6", lightBg: "#F5F3FF", name: "Lavender" },
  { hex: "#FB923C", bgClass: "bg-[#FB923C]", border: "#F97316", text: "#9A3412", lightBg: "#FFF7ED", name: "Peach" },
  { hex: "#F472B6", bgClass: "bg-[#F472B6]", border: "#EC4899", text: "#9D174D", lightBg: "#FDF2F8", name: "Blush" },
  { hex: "#FBBF24", bgClass: "bg-[#FBBF24]", border: "#F59E0B", text: "#854D0E", lightBg: "#FEFCE8", name: "Honey" },
  { hex: "#2DD4BF", bgClass: "bg-[#2DD4BF]", border: "#14B8A6", text: "#115E59", lightBg: "#F0FDFA", name: "Aqua" },
  { hex: "#FB7185", bgClass: "bg-[#FB7185]", border: "#F43F5E", text: "#9F1239", lightBg: "#FFF1F2", name: "Rose" },
];

export default function RoleManagementDashboard({
  roles = [],
  staff = [],
  isLoading = false,
}) {
  const totalRoles = roles.length;
  const totalStaff = staff.length;

  let superuserCount = 0;
  let activeStaffCount = 0;

  const roleStaffCount = {};
  roles.forEach((r) => {
    roleStaffCount[r.name || r.role_name || r.id] = 0;
  });

  staff.forEach((s) => {
    if (s.is_superuser) superuserCount += 1;
    if (s.is_active !== false) activeStaffCount += 1;

    const rName =
      s.role?.name ||
      s.role_name ||
      (typeof s.role === "string" ? s.role : "Unassigned");
    roleStaffCount[rName] = (roleStaffCount[rName] || 0) + 1;
  });

  const sortedRoles = Object.entries(roleStaffCount)
    .map(([name, count]) => ({
      name,
      count,
      percent: totalStaff > 0 ? ((count / totalStaff) * 100).toFixed(0) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const modulesCount = SYSTEM_MODULES?.length || 10;
  const recentStaff = [...staff].slice(0, 7);

  const [pieMode, setPieMode] = useState("role"); // "role" | "privilege"
  const [hoveredPieIndex, setHoveredPieIndex] = useState(null);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [hoveredRoleIndex, setHoveredRoleIndex] = useState(null);

  // 1. Role Segments for Donut
  const roleSegments = useMemo(() => {
    const validRoles = sortedRoles.filter((r) => r.count > 0);
    const sum = validRoles.reduce((acc, r) => acc + r.count, 0) || totalStaff || 1;

    let cumulative = 0;
    return validRoles.map((item, idx) => {
      const percentage = Number(((item.count / sum) * 100).toFixed(1));
      const startAngle = cumulative * 3.6 - 90;
      cumulative += percentage;
      const palette = PASTEL_PALETTE[idx % PASTEL_PALETTE.length];

      return {
        ...item,
        percentage,
        strokeDasharray: `${percentage} ${100 - percentage}`,
        startAngle,
        palette,
      };
    });
  }, [sortedRoles, totalStaff]);

  // 2. Privilege / Security Status Segments for Donut
  const privilegeSegments = useMemo(() => {
    const regularStaff = Math.max(0, activeStaffCount - superuserCount);
    const inactiveCount = Math.max(0, totalStaff - activeStaffCount);

    const data = [
      { name: "Superuser / Admins", count: superuserCount, palette: PASTEL_PALETTE[0] },
      { name: "Operational Staff", count: regularStaff, palette: PASTEL_PALETTE[1] },
      ...(inactiveCount > 0
        ? [{ name: "Inactive / Suspended", count: inactiveCount, palette: PASTEL_PALETTE[7] }]
        : []),
    ].filter((d) => d.count > 0);

    const sum = data.reduce((acc, d) => acc + d.count, 0) || totalStaff || 1;

    let cumulative = 0;
    return data.map((item) => {
      const percentage = Number(((item.count / sum) * 100).toFixed(1));
      const startAngle = cumulative * 3.6 - 90;
      cumulative += percentage;

      return {
        ...item,
        percentage,
        strokeDasharray: `${percentage} ${100 - percentage}`,
        startAngle,
      };
    });
  }, [activeStaffCount, superuserCount, totalStaff]);

  const activeDonutSegments = pieMode === "role" ? roleSegments : privilegeSegments;

  // Bar chart calculations for Staff Distribution by Role
  const topRole = sortedRoles[0] || null;
  const activeRoleIndex = hoveredRoleIndex !== null ? hoveredRoleIndex : selectedRoleIndex;
  const activeRole = sortedRoles[activeRoleIndex] || topRole;
  const activeRoleRank = (activeRoleIndex !== null && activeRoleIndex >= 0) ? activeRoleIndex + 1 : 1;

  const maxRoleStaff = useMemo(() => {
    return Math.max(...sortedRoles.map((r) => r.count || 0), 1);
  }, [sortedRoles]);

  const roleYTicks = useMemo(() => {
    const max = maxRoleStaff > 0 ? maxRoleStaff : 4;
    let ceil = max;
    if (ceil <= 4) ceil = 4;
    else if (ceil <= 8) ceil = 8;
    else if (ceil <= 12) ceil = 12;
    else ceil = Math.ceil(max / 5) * 5;

    return [
      ceil,
      Math.round(ceil * 0.75),
      Math.round(ceil * 0.5),
      Math.round(ceil * 0.25),
      0,
    ];
  }, [maxRoleStaff]);

  return (
    <div className="w-full space-y-5 font-sans antialiased text-slate-800">
      {/* 1. KEY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              System Roles
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : totalRoles.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-purple-600 flex items-center gap-1">
              <span>Granular permission profiles</span>
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Staff Members
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : totalStaff.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>{activeStaffCount} active accounts</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Superusers / Admins
            </span>
            <h3 className="text-3xl font-extrabold text-blue-600 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : superuserCount.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
              <span>Full system root access</span>
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active System Modules
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {modulesCount}
            </h3>
            <p className="text-[11px] font-medium text-indigo-600 flex items-center gap-1">
              <span>Leads, AMC, Quotes, Master</span>
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. VISUAL BREAKDOWN ROW: PIE CHART (LEFT) + VERTICAL BAR GRAPH (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. ROLE ALLOCATION & PRIVILEGE SHARE (PIE CHART - LEFT) */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-purple-600" />
                  {pieMode === "role" ? "Role Allocation Share" : "Account Access & Security"}
                </h3>
                <p className="text-xs text-slate-400">
                  {pieMode === "role"
                    ? "Headcount distribution across security roles"
                    : "Administrative privileges and account activity breakdown"}
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPieMode("role");
                    setHoveredPieIndex(null);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${pieMode === "role"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  By Role
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPieMode("privilege");
                    setHoveredPieIndex(null);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${pieMode === "privilege"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  By Privilege
                </button>
              </div>
            </div>

            {/* Donut SVG & Legend */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
              <div className="relative w-44 h-44 flex-shrink-0">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 46 46">
                  {/* Background base track */}
                  <circle
                    cx="23"
                    cy="23"
                    r="15.9155"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="5"
                  />
                  {/* Donut Pastel Segments */}
                  {activeDonutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="23"
                      cy="23"
                      r="15.9155"
                      fill="none"
                      stroke={seg.palette.hex}
                      strokeWidth={hoveredPieIndex === idx ? "6.8" : "5.5"}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset="0"
                      transform={`rotate(${seg.startAngle} 23 23)`}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredPieIndex(idx)}
                      onMouseLeave={() => setHoveredPieIndex(null)}
                    />
                  ))}
                </svg>

                {/* Center Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {hoveredPieIndex !== null && activeDonutSegments[hoveredPieIndex]
                      ? activeDonutSegments[hoveredPieIndex].name.slice(0, 12)
                      : "Total Staff"}
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 tracking-tight leading-none my-0.5">
                    {hoveredPieIndex !== null && activeDonutSegments[hoveredPieIndex]
                      ? `${activeDonutSegments[hoveredPieIndex].percentage}%`
                      : totalStaff}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {hoveredPieIndex !== null && activeDonutSegments[hoveredPieIndex]
                      ? `${activeDonutSegments[hoveredPieIndex].count} members`
                      : "Active Profiles"}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeDonutSegments.length > 0 ? (
                  activeDonutSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredPieIndex(idx)}
                      onMouseLeave={() => setHoveredPieIndex(null)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${hoveredPieIndex === idx
                          ? "bg-slate-50 border-slate-300 shadow-xs scale-[1.01]"
                          : "bg-white border-slate-100 hover:border-slate-200"
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: seg.palette.hex }}
                        ></span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {seg.name}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {seg.percentage}%
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          ({seg.count})
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No allocation data available
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Role-Based Access Control (RBAC) Active
            </span>
            <Link
              to="/accounts"
              className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Manage Staff Accounts <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. STAFF DISTRIBUTION BY ROLE (VERTICAL BAR GRAPH - RIGHT, AS IN PRODUCT MASTER) */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            {/* Header & #1 Top Stat Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Staff Distribution by Role
                </h3>
                <p className="text-xs text-slate-400">
                  Personnel assigned to security roles
                </p>
              </div>

              {activeRole && (
                <div className="flex items-center gap-2.5 bg-white border border-slate-200/90 shadow-2xs rounded-xl px-3.5 py-1.5 flex-shrink-0 transition-all duration-150">
                  <span className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0"></span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[120px]" title={activeRole.name}>
                        {activeRole.name}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${activeRoleRank === 1 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                        }`}>
                        #{activeRoleRank}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      <strong className="text-slate-800">{activeRole.count} {activeRole.count === 1 ? "user" : "users"}</strong> ({activeRole.percent}%)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SVG Vertical Bar Chart (Clean corporate styling with rotated labels below baseline) */}
            {(() => {
              const marginLeft = 36;
              const marginRight = 16;
              const marginTop = 24;
              const chartHeight = 145;
              const baseline = marginTop + chartHeight;
              const labelHeight = 75;
              const svgHeight = baseline + labelHeight;
              const count = sortedRoles.length;
              const slotWidth = Math.max(56, Math.floor((480 - marginLeft - marginRight) / Math.max(count, 1)));
              const chartWidth = Math.max(480, marginLeft + marginRight + count * slotWidth);
              const yMax = roleYTicks[0] || 4;
              const barWidth = Math.min(36, Math.max(22, slotWidth - 18));

              return (
                <div className="w-full overflow-x-auto overflow-y-hidden pb-1">
                  <svg
                    width={chartWidth}
                    height={svgHeight}
                    viewBox={`0 0 ${chartWidth} ${svgHeight}`}
                    className="min-w-full"
                  >
                    {/* Rotated Y-Axis Label */}
                    <text
                      x={-(marginTop + chartHeight / 2)}
                      y="12"
                      transform="rotate(-90)"
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-slate-400 tracking-wider uppercase"
                    >
                      Staff Count
                    </text>

                    {/* Horizontal Gridlines & Y-Axis Ticks */}
                    {roleYTicks.map((tickVal, tIdx) => {
                      const y = baseline - (tickVal / yMax) * chartHeight;
                      const isBaseline = tickVal === 0;

                      return (
                        <g key={tIdx}>
                          <line
                            x1={marginLeft}
                            y1={y}
                            x2={chartWidth - marginRight}
                            y2={y}
                            stroke={isBaseline ? "#94A3B8" : "#E2E8F0"}
                            strokeWidth={isBaseline ? "1.5" : "1"}
                            strokeDasharray={isBaseline ? "none" : "3 3"}
                          />
                          <text
                            x={marginLeft - 6}
                            y={y + 3.5}
                            textAnchor="end"
                            className="text-[10px] font-semibold fill-slate-400"
                          >
                            {tickVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Role Columns & Rotated Labels */}
                    {sortedRoles.map((item, idx) => {
                      const val = item.count || 0;
                      const barH = yMax > 0 ? (val / yMax) * chartHeight : 0;
                      const x = marginLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
                      const y = baseline - barH;
                      const centerX = x + barWidth / 2;
                      const isSelected = activeRoleIndex === idx;

                      return (
                        <g
                          key={item.name || idx}
                          className="group cursor-pointer"
                          onClick={() => setSelectedRoleIndex(idx)}
                          onMouseEnter={() => setHoveredRoleIndex(idx)}
                          onMouseLeave={() => setHoveredRoleIndex(null)}
                        >
                          {/* Hover Glow / Background Highlight */}
                          <rect
                            x={x - 4}
                            y={marginTop}
                            width={barWidth + 8}
                            height={chartHeight + 4}
                            fill={isSelected ? "rgba(239, 246, 255, 0.75)" : "transparent"}
                            rx="4"
                            className="transition-colors group-hover:fill-blue-50/60"
                          />

                          {/* Value Label above Bar */}
                          {val > 0 && (
                            <text
                              x={centerX}
                              y={y - 5}
                              textAnchor="middle"
                              className={`text-[10px] transition-colors ${isSelected ? "font-extrabold fill-blue-700" : "font-bold fill-slate-700"
                                }`}
                            >
                              {val}
                            </text>
                          )}

                          {/* Vertical Bar (SAME COLOR AS PRODUCT MASTER: #2563EB, active #1D4ED8) */}
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={Math.max(barH, val > 0 ? 4 : 0)}
                            rx="3"
                            fill={isSelected ? "#1D4ED8" : "#2563EB"}
                            className="transition-all duration-200 group-hover:fill-[#1D4ED8]"
                          >
                            <title>{`#${idx + 1} ${item.name}: ${item.count} staff (${item.percent}%)`}</title>
                          </rect>

                          {/* Rotated X-Axis Label (-90deg reading bottom-to-top towards baseline) */}
                          <text
                            x={centerX}
                            y={baseline + 12}
                            textAnchor="end"
                            transform={`rotate(-90 ${centerX} ${baseline + 12})`}
                            className={`text-[11px] select-none transition-colors ${isSelected
                                ? "font-bold fill-blue-600 group-hover:fill-blue-800"
                                : "font-semibold fill-slate-700 group-hover:fill-slate-900"
                              }`}
                          >
                            {item.name.length > 14 ? item.name.slice(0, 13) + "…" : item.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Roles configured: <strong>{totalRoles}</strong></span>
            <Link
              to="/roles"
              className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Role Matrix <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. STAFF DIRECTORY HIGHLIGHTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              Staff & User Directory
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Active users and associated security roles</p>
          </div>
          <Link
            to="/accounts"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All Staff ({totalStaff}) <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="pb-2.5 pl-1">Staff Member</th>
                <th className="pb-2.5">Role</th>
                <th className="pb-2.5">Mobile</th>
                <th className="pb-2.5">Access Level</th>
                <th className="pb-2.5 text-right pr-1">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
              {recentStaff.length > 0 ? (
                recentStaff.map((row, idx) => {
                  const roleName =
                    row.role?.name ||
                    row.role_name ||
                    (typeof row.role === "string" ? row.role : "Staff Member");
                  const displayName =
                    row.first_name || row.last_name
                      ? `${row.first_name || ""} ${row.last_name || ""}`.trim()
                      : row.name || row.email?.split("@")[0] || `User #${row.id}`;

                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50/40 transition">
                      <td className="py-2.5 pl-1">
                        <span className="font-bold text-slate-900 block">{displayName}</span>
                        <span className="text-[10px] text-slate-400 block">{row.email || "-"}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium text-[10px] border border-purple-100">
                          {roleName}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600 text-[11px]">
                        {row.mobile_no || row.phone || "-"}
                      </td>
                      <td className="py-2.5">
                        {row.is_superuser ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase bg-indigo-100 text-indigo-700">
                            Superuser
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right pr-1">
                        {row.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Disabled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-5 text-center text-slate-400 text-xs">
                    No staff records found
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
