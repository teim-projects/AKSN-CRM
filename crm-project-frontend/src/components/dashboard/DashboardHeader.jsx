import React from "react";
import {
  RotateCw,
  Filter,
  LayoutGrid,
  Users,
  FileText,
  ShieldCheck,
  Package,
  UserCheck,
  FolderKanban,
} from "lucide-react";

export default function DashboardHeader({
  activeTab,
  onTabChange,
  counts = {},
  onRefresh,
  isRefreshing = false,
  isFilterOpen = false,
  onToggleFilter,
  isFilterActive = false,
}) {
  const tabs = [
    {
      id: "summary",
      label: "Summary",
      icon: LayoutGrid,
      count: counts.summary ?? 0,
      description: "Comprehensive multi-module operational pulse and high-level enterprise health.",
    },
    {
      id: "leads",
      label: "Lead",
      icon: UserCheck,
      count: counts.leads ?? 0,
      description: "Real-time lead conversion analytics, pipeline distribution, and team sales metrics.",
    },
    {
      id: "quotation",
      label: "Quotation",
      icon: FileText,
      count: counts.quotations ?? 0,
      description: "Quotation pipeline, proposal versioning, dropped vs finalized quotes, and revenue value.",
    },
    {
      id: "projects",
      label: "Project Report",
      icon: FolderKanban,
      count: counts.projects ?? 0,
      description: "Project execution lifecycle, stage pipeline, commercial project values, and delivery status.",
    },
    {
      id: "amc",
      label: "AMC",
      icon: ShieldCheck,
      count: counts.amc ?? 0,
      description: "Annual Maintenance Contracts, lifecycle status, upcoming renewals, and contract value.",
    },
    {
      id: "product",
      label: "Product",
      icon: Package,
      count: counts.products ?? 0,
      description: "Master product catalog, category breakdown, pricing spectrum, and inventory telemetry.",
    },
    {
      id: "roles",
      label: "Role Management",
      icon: Users,
      count: counts.roles ?? 0,
      description: "System role definitions, staff allocations, module permissions, and access privileges.",
    },
  ];

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[1];

  const formatBadge = (num) => {
    if (num === null || num === undefined) return "0";
    return Number(num).toLocaleString("en-IN");
  };

  return (
    <div className="w-full pb-3 space-y-4">
      {/* TOP ROW: TITLE WITH BLUE ACCENT LINE, SUBTITLE & REFRESH BUTTON */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-1 pt-1 gap-3">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Dashboard Overview
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentTabObj.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* FILTER BUTTON */}
          <button
            type="button"
            onClick={onToggleFilter}
            title={isFilterOpen ? "Hide filters" : "Show filters"}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all duration-150 cursor-pointer border ${
              isFilterOpen
                ? "bg-[#377d58] text-white border-[#2d6748]"
                : isFilterActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            }`}
          >
            <Filter
              className={`w-3.5 h-3.5 ${
                isFilterOpen
                  ? "text-white"
                  : isFilterActive
                  ? "text-[#377d58]"
                  : "text-slate-500"
              }`}
            />
            <span>Filter</span>
            {isFilterActive && !isFilterOpen && (
              <span className="w-2 h-2 rounded-full bg-[#377d58]" />
            )}
          </button>

          {/* REFRESH BUTTON */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard data"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#377d58] hover:bg-[#2d6748] active:bg-[#25553b] text-white text-xs font-semibold rounded-lg shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <RotateCw
              className={`w-3.5 h-3.5 transition-transform duration-500 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: HORIZONTAL CHIP/PILL ROW */}
      <div
        className="w-full flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 flex-shrink-0 cursor-pointer ${isActive
                  ? "bg-[#377d58] text-white shadow-sm border border-[#2d6748]"
                  : "bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border border-slate-200 shadow-xs"
                }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500"
                  }`}
              />
              <span className={isActive ? "font-bold" : "font-medium"}>
                {tab.label}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] leading-tight font-semibold ${isActive
                    ? "bg-[#295e42] text-white"
                    : "bg-slate-100 text-slate-600"
                  }`}
              >
                {formatBadge(tab.count)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
