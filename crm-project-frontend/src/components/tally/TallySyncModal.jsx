import React, { useState } from "react";
import { RxCross2 } from "react-icons/rx";
import { MdSync, MdDateRange, MdAllInclusive, MdCheckCircle } from "react-icons/md";

export default function TallySyncModal({ isOpen, onClose, onConfirmSync, isSyncing }) {
  const [syncMode, setSyncMode] = useState("full"); // "full" | "date_range"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState("");

  if (!isOpen) return null;

  // Helpers for quick presets
  const applyPreset = (type) => {
    setDateError("");
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const toDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    if (type === "current_fy") {
      // Indian FY starts April 1
      const currentYear = today.getFullYear();
      const fyStartYear = today.getMonth() >= 3 ? currentYear : currentYear - 1;
      setFromDate(`${fyStartYear}-04-01`);
      setToDate(toDateStr);
    } else if (type === "this_month") {
      const monthStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
      setFromDate(monthStart);
      setToDate(toDateStr);
    } else if (type === "last_30_days") {
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 30);
      setFromDate(`${past30.getFullYear()}-${pad(past30.getMonth() + 1)}-${pad(past30.getDate())}`);
      setToDate(toDateStr);
    } else if (type === "clear") {
      setFromDate("");
      setToDate("");
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    setDateError("");

    if (syncMode === "date_range") {
      if (fromDate && toDate && fromDate > toDate) {
        setDateError("From Date cannot be later than To Date.");
        return;
      }
      onConfirmSync({
        fromDate: fromDate || null,
        toDate: toDate || null,
      });
    } else {
      // Full sync (no date bounds)
      onConfirmSync({
        fromDate: null,
        toDate: null,
      });
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans antialiased text-slate-800"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="bg-white px-6 pt-6 pb-3 flex justify-between items-start border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                <MdSync className={isSyncing ? "animate-spin" : ""} />
              </span>
              <h3 className="text-xl font-bold text-slate-900">Sync Tally Invoices</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 ml-10">
              Fetch sales vouchers from TallyPrime to CRM
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Mode Selection Cards */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Choose Synchronization Mode
            </label>

            {/* Option 1: Full Sync */}
            <div
              onClick={() => {
                setSyncMode("full");
                setDateError("");
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                syncMode === "full"
                  ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="mt-0.5">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    syncMode === "full" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                  }`}
                >
                  {syncMode === "full" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <MdAllInclusive className="text-blue-600 text-base" />
                    <span className="text-xs font-bold text-slate-900">
                      Full Synchronization (All Invoices)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    Default
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
                  Pulls all sales vouchers from TallyPrime without any date limitation. Existing records will be updated and new ones created.
                </p>
              </div>
            </div>

            {/* Option 2: Date Range */}
            <div
              onClick={() => setSyncMode("date_range")}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                syncMode === "date_range"
                  ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="mt-0.5">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    syncMode === "date_range" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                  }`}
                >
                  {syncMode === "date_range" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <MdDateRange className="text-blue-600 text-base" />
                    <span className="text-xs font-bold text-slate-900">
                      Filter by Date Range
                    </span>
                  </div>
                </div>
                <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
                  Pulls only vouchers dated within a specified date window. Ideal for syncing daily, weekly, or specific billing periods.
                </p>
              </div>
            </div>
          </div>

          {/* Date Range Inputs when Mode is date_range */}
          {syncMode === "date_range" && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset("current_fy")}
                    className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                  >
                    Current FY
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("this_month")}
                    className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("last_30_days")}
                    className="px-2.5 py-1 text-[11px] font-medium bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                  >
                    Last 30 Days
                  </button>
                  {(fromDate || toDate) && (
                    <button
                      type="button"
                      onClick={() => applyPreset("clear")}
                      className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer ml-auto"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* From and To Date Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    From Date:
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setDateError("");
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    To Date:
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setDateError("");
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                  />
                </div>
              </div>

              {dateError && (
                <p className="text-xs text-rose-600 font-medium">{dateError}</p>
              )}

              <p className="text-[11px] text-slate-400 italic">
                Note: If either date is left blank, all vouchers starting from the beginning or up to the latest date will be included.
              </p>
            </div>
          )}

          {/* Duplication Protection Notice */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-emerald-800 text-[11.5px] flex items-start gap-2">
            <MdCheckCircle className="text-emerald-600 text-sm mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">Automatic Deduplication:</span> Vouchers already synced will be safely updated by Tally GUID without creating duplicates.
            </div>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSyncing}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <MdSync className={`text-sm ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Queuing Sync..." : "Start Sync"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
