import React from "react";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  FileCheck2,
  Calendar,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AMCDashboard({ contracts = [], isLoading = false }) {
  const totalContracts = contracts.length;
  let activeCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;
  let renewedCount = 0;
  let inactiveCount = 0;
  let totalAnnualValue = 0;

  const typeMap = { comprehensive: 0, non_comprehensive: 0 };
  const freqMap = { annual: 0, half_yearly: 0, quarterly: 0, monthly: 0 };

  contracts.forEach((c) => {
    const val = parseFloat(c.annual_value || c.contract_value || 0);
    if (!isNaN(val)) totalAnnualValue += val;

    const st = (c.status || "active").toLowerCase();
    if (st === "active") activeCount += 1;
    else if (st === "expiring_soon") expiringSoonCount += 1;
    else if (st === "expired") expiredCount += 1;
    else if (st === "renewed" || st === "renewal_pending") renewedCount += 1;
    else inactiveCount += 1;

    // Type
    const t = (c.amc_type || "comprehensive").toLowerCase();
    if (typeMap[t] !== undefined) typeMap[t] += 1;
    else typeMap.comprehensive += 1;

    // Freq
    const f = (c.payment_frequency || "annual").toLowerCase();
    if (freqMap[f] !== undefined) freqMap[f] += 1;
    else freqMap.annual += 1;
  });

  const activePercent = totalContracts > 0 ? ((activeCount / totalContracts) * 100).toFixed(1) : 0;
  const expiringPercent = totalContracts > 0 ? ((expiringSoonCount / totalContracts) * 100).toFixed(1) : 0;
  const expiredPercent = totalContracts > 0 ? ((expiredCount / totalContracts) * 100).toFixed(1) : 0;

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

  // Recent or expiring contracts
  const priorityContracts = [...contracts]
    .sort((a, b) => {
      // Prioritize expiring_soon first
      if (a.status === "expiring_soon" && b.status !== "expiring_soon") return -1;
      if (b.status === "expiring_soon" && a.status !== "expiring_soon") return 1;
      return new Date(b.end_date || 0) - new Date(a.end_date || 0);
    })
    .slice(0, 7);

  return (
    <div className="w-full space-y-5 font-sans antialiased text-slate-800">
      {/* 1. KEY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total AMC Contracts
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : totalContracts.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <span>{activeCount} currently active</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Expiring Soon
            </span>
            <h3 className="text-3xl font-extrabold text-amber-600 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : expiringSoonCount.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
              <span>Action required (&lt; 30 days)</span>
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Expired Contracts
            </span>
            <h3 className="text-3xl font-extrabold text-rose-600 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : expiredCount.toLocaleString()}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <span>{renewedCount} successfully renewed</span>
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Annual Contract Value
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : formatCurrency(totalAnnualValue)}
            </h3>
            <p className="text-[11px] font-medium text-indigo-600 flex items-center gap-1">
              <span>Recurring service revenue</span>
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. VISUAL BREAKDOWN ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CONTRACT STATUS PROGRESS */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">AMC Lifecycle Breakdown</h3>
            <p className="text-xs text-slate-400 mb-4">Contract health distribution</p>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Active
                  </span>
                  <span className="text-slate-900 font-semibold">{activeCount} ({activePercent}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activePercent}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Expiring Soon
                  </span>
                  <span className="text-slate-900 font-semibold">{expiringSoonCount} ({expiringPercent}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${expiringPercent}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Expired
                  </span>
                  <span className="text-slate-900 font-semibold">{expiredCount} ({expiredPercent}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${expiredPercent}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Renewed
                  </span>
                  <span className="text-slate-900 font-semibold">
                    {renewedCount} ({totalContracts > 0 ? ((renewedCount / totalContracts) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${totalContracts > 0 ? (renewedCount / totalContracts) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Active Ratio: <strong>{activePercent}%</strong></span>
            <span>At Risk: <strong>{expiringSoonCount + expiredCount}</strong></span>
          </div>
        </div>

        {/* AMC TYPE BREAKDOWN */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Contract Scope & Type</h3>
            <p className="text-xs text-slate-400 mb-4">Comprehensive vs Non-Comprehensive</p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    CMP
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Comprehensive AMC</h4>
                    <p className="text-[10px] text-slate-400">Includes labor + replacement parts</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-900">{typeMap.comprehensive}</span>
                  <p className="text-[10px] text-slate-500">
                    {totalContracts > 0 ? ((typeMap.comprehensive / totalContracts) * 100).toFixed(0) : 0}% share
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    NCMP
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Non-Comprehensive AMC</h4>
                    <p className="text-[10px] text-slate-400">Labor only · Parts billed separately</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-900">{typeMap.non_comprehensive}</span>
                  <p className="text-[10px] text-slate-500">
                    {totalContracts > 0 ? ((typeMap.non_comprehensive / totalContracts) * 100).toFixed(0) : 0}% share
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>High Coverage: <strong>{typeMap.comprehensive}</strong></span>
            <span>Standard: <strong>{typeMap.non_comprehensive}</strong></span>
          </div>
        </div>

        {/* PAYMENT FREQUENCY */}
        <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Billing Cycles</h3>
            <p className="text-xs text-slate-400 mb-4">Payment schedule frequency</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Annual</span>
                <span className="text-xl font-bold text-slate-900 block mt-0.5">{freqMap.annual}</span>
                <span className="text-[10px] text-slate-500">Single billing</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Half-Yearly</span>
                <span className="text-xl font-bold text-slate-900 block mt-0.5">{freqMap.half_yearly}</span>
                <span className="text-[10px] text-slate-500">2 installments</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Quarterly</span>
                <span className="text-xl font-bold text-slate-900 block mt-0.5">{freqMap.quarterly}</span>
                <span className="text-[10px] text-slate-500">4 installments</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Monthly</span>
                <span className="text-xl font-bold text-slate-900 block mt-0.5">{freqMap.monthly}</span>
                <span className="text-[10px] text-slate-500">Recurring MRR</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <Link
              to="/amc"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Open AMC Contracts <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. CRITICAL / EXPIRING CONTRACTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              Priority & Expiring AMC Contracts
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Contracts requiring immediate renewal or inspection</p>
          </div>
          <Link
            to="/amc"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All ({totalContracts}) <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="pb-2.5 pl-1">Contract ID</th>
                <th className="pb-2.5">Customer Name</th>
                <th className="pb-2.5">Product / System</th>
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5">Expiry Date</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right pr-1">Annual Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
              {priorityContracts.length > 0 ? (
                priorityContracts.map((row, idx) => {
                  const custName =
                    row.customer?.company_name ||
                    row.customer?.customer_name ||
                    row.customer_name ||
                    row.customer?.name ||
                    "-";
                  const status = (row.status || "active").toLowerCase();

                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50/40 transition">
                      <td className="py-2.5 pl-1 text-slate-900 font-bold">
                        {row.contract_id || `AMC-${row.id}`}
                      </td>
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-800 block">{custName}</span>
                      </td>
                      <td className="py-2.5 text-slate-700">
                        {row.product || "Solar Inverter / System"}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] capitalize">
                          {row.amc_type?.replace("_", " ") || "Comprehensive"}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px]">
                        {formatDate(row.end_date)}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "expiring_soon"
                                ? "bg-amber-100 text-amber-700 animate-pulse"
                                : status === "expired"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                        >
                          {status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 text-right pr-1 font-bold text-slate-900">
                        {formatCurrency(row.annual_value)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-5 text-center text-slate-400 text-xs">
                    No AMC contracts found
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
