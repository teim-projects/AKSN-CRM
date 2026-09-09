import React from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Layers,
  TrendingUp,
  MapPin,
  Calendar,
  Building,
  ArrowUpRight
} from "lucide-react";
import { Link } from "react-router-dom";

export default function QuotationDashboard({ quotations = [], isLoading = false }) {
  const totalQuotations = quotations.length;
  let finalizedCount = 0;
  let droppedCount = 0;
  let totalVersions = 0;
  let totalQuotationValue = 0;

  const locationMap = { Ahilyanagar: 0, Pune: 0, Other: 0 };
  const gstMap = { CGST_SGST: 0, IGST: 0 };
  const monthlyMap = {};

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  months.forEach((m) => {
    monthlyMap[m] = { total: 0, finalized: 0 };
  });

  quotations.forEach((q) => {
    const versions = q.versions || [];
    totalVersions += versions.length > 0 ? versions.length : 1;

    // Get active version or latest
    const activeVersion = versions.find((v) => v.is_active) || versions[0] || {};
    const grandTotal = parseFloat(activeVersion.grand_total || activeVersion.total_amount || 0);
    if (!isNaN(grandTotal)) {
      totalQuotationValue += grandTotal;
    }

    if (q.is_finalized || activeVersion.is_finalized) {
      finalizedCount += 1;
    }
    if (q.is_dropped) {
      droppedCount += 1;
    }

    // Location
    const loc = q.quotation_for || "Pune";
    if (locationMap[loc] !== undefined) {
      locationMap[loc] += 1;
    } else {
      locationMap.Other += 1;
    }

    // GST
    const gst = q.gst_type || "CGST_SGST";
    if (gstMap[gst] !== undefined) {
      gstMap[gst] += 1;
    }

    // Monthly
    const dateStr = q.quotation_date || q.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const monthName = months[d.getMonth()];
        if (monthlyMap[monthName]) {
          monthlyMap[monthName].total += 1;
          if (q.is_finalized || activeVersion.is_finalized) {
            monthlyMap[monthName].finalized += 1;
          }
        }
      }
    }
  });

  const activeQuotations = Math.max(0, totalQuotations - finalizedCount - droppedCount);
  const finalizedRate = totalQuotations > 0 ? ((finalizedCount / totalQuotations) * 100).toFixed(1) : 0;
  const droppedRate = totalQuotations > 0 ? ((droppedCount / totalQuotations) * 100).toFixed(1) : 0;
  const avgVersions = totalQuotations > 0 ? (totalVersions / totalQuotations).toFixed(1) : 1;

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount) || amount === 0) return "₹0";
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)} K`;
    }
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const formatDate = (str) => {
    if (!str) return "-";
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString("en-IN");
  };

  // Recent 6 quotations
  const recentQuotations = [...quotations]
    .sort((a, b) => new Date(b.created_at || b.quotation_date || 0) - new Date(a.created_at || a.quotation_date || 0))
    .slice(0, 7);

  return (
    <div className="w-full space-y-5 font-sans antialiased text-slate-800">
      {/* 1. KEY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Quotations
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : totalQuotations.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
              <span>{activeQuotations} active in pipeline</span>
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Finalized / Won
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : finalizedCount.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>{finalizedRate}% conversion rate</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dropped Quotes
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : droppedCount.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1">
              <span>{droppedRate}% loss rate</span>
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Quotation Value
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : formatCurrency(totalQuotationValue)}
            </h3>
            <p className="text-[11px] font-medium text-indigo-600 flex items-center gap-1">
              <span>{totalVersions} revisions ({avgVersions} avg/quote)</span>
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. VISUAL BREAKDOWN ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* STATUS BREAKDOWN */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quotation Status Breakdown</h3>
            <p className="text-xs text-slate-400 mb-4">Pipeline completion status</p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Finalized
                  </span>
                  <span className="text-slate-900 font-semibold">{finalizedCount} ({finalizedRate}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${finalizedRate}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Active / In Review
                  </span>
                  <span className="text-slate-900 font-semibold">{activeQuotations} ({totalQuotations > 0 ? ((activeQuotations / totalQuotations) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalQuotations > 0 ? (activeQuotations / totalQuotations) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Dropped
                  </span>
                  <span className="text-slate-900 font-semibold">{droppedCount} ({droppedRate}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${droppedRate}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Total Proposals: <strong>{totalQuotations}</strong></span>
            <span>Avg Revisions: <strong>{avgVersions}</strong></span>
          </div>
        </div>

        {/* LOCATION ANALYSIS */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Branch & Location Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">Quotes grouped by target region</p>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    PN
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Pune Branch</h4>
                    <p className="text-[10px] text-slate-400">Headquarter region</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{locationMap.Pune}</span>
                  <p className="text-[10px] text-slate-500">
                    {totalQuotations > 0 ? ((locationMap.Pune / totalQuotations) * 100).toFixed(0) : 0}% share
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    AH
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Ahilyanagar Branch</h4>
                    <p className="text-[10px] text-slate-400">Regional sales hub</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{locationMap.Ahilyanagar}</span>
                  <p className="text-[10px] text-slate-500">
                    {totalQuotations > 0 ? ((locationMap.Ahilyanagar / totalQuotations) * 100).toFixed(0) : 0}% share
                  </p>
                </div>
              </div>

              {locationMap.Other > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      OT
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Other Branches</h4>
                      <p className="text-[10px] text-slate-400">Interstate & external</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">{locationMap.Other}</span>
                    <p className="text-[10px] text-slate-500">
                      {totalQuotations > 0 ? ((locationMap.Other / totalQuotations) * 100).toFixed(0) : 0}% share
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>CGST+SGST: <strong>{gstMap.CGST_SGST}</strong></span>
            <span>IGST: <strong>{gstMap.IGST}</strong></span>
          </div>
        </div>

        {/* PROPOSAL VERSIONING & SPEED */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Proposal Versioning Health</h3>
            <p className="text-xs text-slate-400 mb-4">Negotiation & revision activity</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-center">
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Total Versions</span>
                <span className="text-2xl font-black text-indigo-900 mt-1 block">{totalVersions}</span>
                <span className="text-[10px] text-indigo-400">Created revisions</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Negotiation Index</span>
                <span className="text-2xl font-black text-emerald-900 mt-1 block">{avgVersions}x</span>
                <span className="text-[10px] text-emerald-400">Revisions / Quote</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Single-version Deals</span>
                <span className="font-bold text-slate-800">
                  {quotations.filter((q) => (q.versions?.length || 1) === 1).length} quotes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Multi-revision Deals</span>
                <span className="font-bold text-slate-800">
                  {quotations.filter((q) => (q.versions?.length || 0) > 1).length} quotes
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
            <Link
              to="/quotation"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Open Quotation Master <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. RECENT QUOTATIONS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              Recent Quotations & Proposals
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Latest quotations sent to prospective clients</p>
          </div>
          <Link
            to="/quotation"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All ({totalQuotations}) <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="pb-2.5 pl-1">Quote No</th>
                <th className="pb-2.5">Client / Company</th>
                <th className="pb-2.5">Branch</th>
                <th className="pb-2.5">GST</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">Date</th>
                <th className="pb-2.5 text-right pr-1">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
              {recentQuotations.length > 0 ? (
                recentQuotations.map((row, idx) => {
                  const versions = row.versions || [];
                  const activeV = versions.find((v) => v.is_active) || versions[0] || {};
                  const amount = activeV.grand_total || activeV.total_amount || 0;

                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50/40 transition">
                      <td className="py-2.5 pl-1 text-slate-900 font-bold">
                        {row.quotation_no || `AKSN-${row.id}`}
                      </td>
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-800 block">
                          {row.company_name || row.contact_person || "-"}
                        </span>
                        {row.contact_person && row.company_name && (
                          <span className="text-[10px] text-slate-400 block">{row.contact_person}</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                          {row.quotation_for || "Pune"}
                        </span>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-500">
                        {row.gst_type || "CGST_SGST"}
                      </td>
                      <td className="py-2.5">
                        {row.is_dropped ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase bg-rose-100 text-rose-700">
                            Dropped
                          </span>
                        ) : row.is_finalized || activeV.is_finalized ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-700">
                            Finalized
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase bg-blue-100 text-blue-700">
                            In Review
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-400 text-[11px]">
                        {formatDate(row.quotation_date || row.created_at)}
                      </td>
                      <td className="py-2.5 text-right pr-1 font-bold text-slate-900">
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-5 text-center text-slate-400 text-xs">
                    No quotation records found
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
