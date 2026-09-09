import React, { useMemo } from "react";
import {
  Calendar,
  Filter,
  RotateCcw,
  CalendarDays,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  X,
  Clock,
} from "lucide-react";

export const FILTER_PRESETS = [
  { id: "all", label: "All Time" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_year", label: "This Year" },
  { id: "last_year", label: "Last Year" },
  { id: "custom", label: "Custom Range" },
];

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const QUARTERS = [
  { value: 1, label: "Q1 (Jan - Mar)" },
  { value: 2, label: "Q2 (Apr - Jun)" },
  { value: 3, label: "Q3 (Jul - Sep)" },
  { value: 4, label: "Q4 (Oct - Dec)" },
];

export default function DashboardFilterBar({
  filterConfig,
  onFilterChange,
  onReset,
  availableYears = [],
  totalFilteredCount = 0,
  activeFilterSummary = "All Time",
  onClose,
}) {
  const currentYear = new Date().getFullYear();

  // Ensure available years has valid unique sorted years descending
  const yearsList = useMemo(() => {
    const yearsSet = new Set(availableYears);
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear - 2);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [availableYears, currentYear]);

  const isFiltered = filterConfig.mode !== "all" || filterConfig.preset !== "all";

  const handlePresetClick = (presetId) => {
    if (presetId === "all") {
      onReset();
      return;
    }
    if (presetId === "custom") {
      onFilterChange({
        ...filterConfig,
        mode: "custom",
        preset: "custom",
      });
      return;
    }

    onFilterChange({
      ...filterConfig,
      mode: "preset",
      preset: presetId,
    });
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3 transition-all duration-200">
      {/* ROW 1: CONTROLS & SELECTORS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* LEFT: PRESET PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" style={{ scrollbarWidth: "none" }}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Filters:</span>
          </div>

          {FILTER_PRESETS.map((preset) => {
            const isActive =
              filterConfig.preset === preset.id ||
              (preset.id === "all" && filterConfig.mode === "all" && filterConfig.preset === "all");

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer flex-shrink-0 ${
                  isActive
                    ? "bg-[#377d58] text-white shadow-xs font-semibold"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* RIGHT: RESET & CLOSE BUTTONS */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Reset to all-time view"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filter</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close filter panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ROW 2: DETAILED SELECTORS (YEAR / MONTH / QUARTER / CUSTOM RANGE) */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
        {/* FILTER MODE SELECTOR */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 font-medium whitespace-nowrap">View By:</label>
          <select
            value={filterConfig.mode}
            onChange={(e) => {
              const newMode = e.target.value;
              onFilterChange({
                ...filterConfig,
                mode: newMode,
                preset: newMode === "all" ? "all" : "custom_mode",
              });
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-1 focus:ring-[#377d58] focus:border-[#377d58] outline-hidden cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="year">Yearly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* YEAR SELECTOR (Visible for year, month, quarter) */}
        {(filterConfig.mode === "year" ||
          filterConfig.mode === "month" ||
          filterConfig.mode === "quarter") && (
          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 font-medium">Year:</label>
            <select
              value={filterConfig.year}
              onChange={(e) =>
                onFilterChange({
                  ...filterConfig,
                  year: parseInt(e.target.value, 10),
                  preset: "custom_mode",
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-1 focus:ring-[#377d58] focus:border-[#377d58] outline-hidden cursor-pointer"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* MONTH SELECTOR (Visible when mode === 'month') */}
        {filterConfig.mode === "month" && (
          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 font-medium">Month:</label>
            <select
              value={filterConfig.month}
              onChange={(e) =>
                onFilterChange({
                  ...filterConfig,
                  month: parseInt(e.target.value, 10),
                  preset: "custom_mode",
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-1 focus:ring-[#377d58] focus:border-[#377d58] outline-hidden cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* QUARTER SELECTOR (Visible when mode === 'quarter') */}
        {filterConfig.mode === "quarter" && (
          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 font-medium">Quarter:</label>
            <select
              value={filterConfig.quarter}
              onChange={(e) =>
                onFilterChange({
                  ...filterConfig,
                  quarter: parseInt(e.target.value, 10),
                  preset: "custom_mode",
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-1 focus:ring-[#377d58] focus:border-[#377d58] outline-hidden cursor-pointer"
            >
              {QUARTERS.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CUSTOM DATE RANGE PICKERS (Visible when mode === 'custom') */}
        {filterConfig.mode === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500 font-medium">From:</label>
              <input
                type="date"
                value={filterConfig.startDate || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filterConfig,
                    startDate: e.target.value,
                    preset: "custom",
                  })
                }
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-1 focus:ring-[#377d58] focus:border-[#377d58] outline-hidden text-xs cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500 font-medium">To:</label>
              <input
                type="date"
                value={filterConfig.endDate || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filterConfig,
                    endDate: e.target.value,
                    preset: "custom",
                  })
                }
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-1 focus:ring-[#377d58] focus:border-[#377d58] outline-hidden text-xs cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ACTIVE FILTER BADGE SUMMARY */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 text-slate-700 text-[11px] font-semibold border border-slate-200">
            <Calendar className="w-3 h-3 text-[#377d58]" />
            <span>{activeFilterSummary}</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/70">
            <span>{Number(totalFilteredCount).toLocaleString("en-IN")} Records Filtered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
