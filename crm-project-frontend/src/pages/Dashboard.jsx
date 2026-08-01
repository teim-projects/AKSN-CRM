import React, { useEffect, useState } from "react";
import Base from "../components/Base";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    convertedLeads: 0,
    totalCustomers: 0,
    totalFollowups: 0,
    todayFollowups: 0,
    overdueFollowups: 0,
    conversionRate: 0,
    avgResponseTime: "14m",
    leadsByStatus: [],
    leadsByStage: [],
    recentActivities: [],
    monthlyTrend: [],
    leadsBySource: [],
    executivePerformance: [],
    revenueTrend: []
  });

  const [isLoading, setIsLoading] = useState(true);

  const BASE_API = import.meta.env.VITE_BASE_API_URL;
  const LEADS_ENDPOINT = `${BASE_API}/lead/lead/`;
  const CUSTOMERS_ENDPOINT = `${BASE_API}/lead/customer/`;
  const FOLLOWUPS_ENDPOINT = `${BASE_API}/lead/lead-followups/`;

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateStr);
  };

  const formatCurrencyInLakhs = (amount) => {
    if (!amount || isNaN(amount) || amount === 0) return "₹0";
    if (amount >= 100000) {
      const lakhs = (amount / 100000).toFixed(1);
      return `₹${lakhs}L`;
    }
    if (amount >= 1000) {
      const k = (amount / 1000).toFixed(1);
      return `₹${k}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("access") || localStorage.getItem("token") || "";

      try {
        setIsLoading(true);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [leadsRes, customersRes, followupsRes] = await Promise.all([
          fetch(LEADS_ENDPOINT, { headers }),
          fetch(CUSTOMERS_ENDPOINT, { headers }),
          fetch(FOLLOWUPS_ENDPOINT, { headers }),
        ]);

        const leadsData = leadsRes.ok ? await leadsRes.json() : { results: [] };
        const customersData = customersRes.ok ? await customersRes.json() : { results: [] };
        const followupsData = followupsRes.ok ? await followupsRes.json() : { results: [] };

        const leads = Array.isArray(leadsData) ? leadsData : leadsData.results || [];
        const customers = Array.isArray(customersData) ? customersData : customersData.results || [];
        const followups = Array.isArray(followupsData) ? followupsData : followupsData.results || [];

        const today = getTodayString();

        const totalLeads = leads.length;
        const convertedLeads = leads.filter(l => l.is_converted === true).length;
        const totalCustomers = customers.length;
        const totalFollowups = followups.length;
        const isNotClosed = (s) => s !== 'close_win' && s !== 'close_loss' && s !== 'closed';
        const todayFollowups = leads.filter(l => l.followup_date === today && isNotClosed(l.status)).length;
        const overdueFollowups = leads.filter(l => l.followup_date && l.followup_date < today && isNotClosed(l.status)).length;
        
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

        // --- LEAD STATUS BREAKDOWN ---
        const statusMap = {};
        leads.forEach(lead => {
          const status = lead.status || 'open';
          statusMap[status] = (statusMap[status] || 0) + 1;
        });

        const statusColors = {
          open: 'bg-blue-600',
          close_win: 'bg-emerald-500',
          close_loss: 'bg-rose-500',
          closed: 'bg-emerald-500',
          in_process: 'bg-indigo-500'
        };

        const statusLabels = {
          open: 'Open',
          close_win: 'Close Win',
          close_loss: 'Close Loss',
          closed: 'Closed',
          in_process: 'In Process'
        };

        const leadsByStatus = Object.entries(statusMap).map(([key, count]) => ({
          label: statusLabels[key] || key,
          count,
          color: statusColors[key] || 'bg-slate-500',
          percentage: totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : 0
        }));

        // --- PIPELINE STAGES ---
        const stageMap = {};
        const stageLabels = {
          new_lead: 'New Lead',
          contacted: 'Contacted',
          requirement_gathering: 'Requirement Gathering',
          demo_scheduled: 'Demo Scheduled',
          demo_completed: 'Demo Completed',
          proposal_sent: 'Proposal Sent',
          negotiation: 'Negotiation',
          won: 'Won',
          lost: 'Lost',
          on_hold: 'On Hold'
        };

        leads.forEach(lead => {
          const stage = lead.pipeline_stage || 'new_lead';
          stageMap[stage] = (stageMap[stage] || 0) + 1;
        });

        const leadsByStage = Object.entries(stageMap)
          .map(([key, count]) => ({
            label: stageLabels[key] || key,
            count,
            percentage: totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : 0
          }))
          .sort((a, b) => b.count - a.count);

        // --- 12-MONTH DATA FOR TRENDS ---
        const monthMap = {};
        const months = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleString('en-IN', { month: 'short' });
          months.push({ key, label });
          monthMap[key] = { label, total: 0, converted: 0, revenue: 0 };
        }

        leads.forEach(lead => {
          if (lead.created_at) {
            const date = new Date(lead.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthMap[key]) {
              monthMap[key].total += 1;
              if (lead.is_converted) {
                monthMap[key].converted += 1;
              }
            }
          }
        });

        // Revenue from Customer table project_value
        customers.forEach(cust => {
          if (cust.created_at) {
            const date = new Date(cust.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthMap[key]) {
              const val = parseFloat(cust.project_value || 0);
              monthMap[key].revenue += val;
            }
          }
        });

        const maxLeadCount = Math.max(...Object.values(monthMap).map(m => m.total), 1);
        const monthlyTrend = months.map(m => ({
          month: m.label,
          total: monthMap[m.key].total,
          converted: monthMap[m.key].converted,
          totalHeight: Math.max(10, (monthMap[m.key].total / maxLeadCount) * 100),
          convertedHeight: Math.max(5, (monthMap[m.key].converted / maxLeadCount) * 100),
        }));

        const maxRev = Math.max(...Object.values(monthMap).map(m => m.revenue), 100000);
        const revenueTrend = months.map(m => ({
          month: m.label,
          revenue: monthMap[m.key].revenue,
          revNorm: (monthMap[m.key].revenue / maxRev) * 100,
          formattedRevenue: formatCurrencyInLakhs(monthMap[m.key].revenue)
        }));

        // --- LEAD SOURCES WITH DISTINCT COLORS ---
        const sourceMap = {};
        const sourceMeta = {
          website: { label: 'Website', color: '#3b82f6', bg: 'bg-blue-600' },       // Deep Royal Blue
          referral: { label: 'Referral', color: '#60a5fa', bg: 'bg-blue-400' },     // Light Blue
          cold_call: { label: 'Cold Call', color: '#a855f7', bg: 'bg-purple-500' },  // Vibrant Purple
          social_media: { label: 'Social Media', color: '#10b981', bg: 'bg-emerald-500' }, // Green
          email_campaign: { label: 'Email Campaign', color: '#f59e0b', bg: 'bg-amber-500' }, // Amber
          exhibition: { label: 'Exhibition', color: '#ef4444', bg: 'bg-red-500' },    // Red
          other: { label: 'Other', color: '#94a3b8', bg: 'bg-slate-400' }
        };

        leads.forEach(lead => {
          const source = lead.lead_source || 'other';
          sourceMap[source] = (sourceMap[source] || 0) + 1;
        });

        const leadsBySource = Object.entries(sourceMap)
          .map(([key, count]) => ({
            key,
            label: sourceMeta[key]?.label || key.replace(/_/g, ' '),
            count,
            hexColor: sourceMeta[key]?.color || '#94a3b8',
            bgColor: sourceMeta[key]?.bg || 'bg-slate-400',
            percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count);

        // --- EXECUTIVE PERFORMANCE ---
        const execMap = {};

        const getOrInitExec = (id, name) => {
          const key = id ? `id_${id}` : (name || "Unassigned");
          if (!execMap[key]) {
            execMap[key] = {
              id: id || null,
              name: name || "Unassigned",
              totalLeads: 0,
              wonLeads: 0,
              revenue: 0,
            };
          }
          return execMap[key];
        };

        // 1. Process all leads for leads count & won count
        leads.forEach((lead) => {
          const staffId = lead.assigned_executive_details?.id || lead.assigned_executive;
          const staffName = lead.assigned_executive_details?.full_name || 
                            (lead.assigned_executive ? `Executive #${lead.assigned_executive}` : "Unassigned");
          
          const execEntry = getOrInitExec(staffId, staffName);
          execEntry.totalLeads += 1;
          if (lead.is_converted) {
            execEntry.wonLeads += 1;
          }
        });

        // 2. Attribute converted customer project_value to the staff executive who converted that lead
        customers.forEach((cust) => {
          const convertedLead = leads.find(
            (l) => (cust.lead && l.id === cust.lead) || (l.converted_to_customer === cust.id)
          );

          const staffId = cust.sales_executive_details?.id || 
                          cust.sales_executive || 
                          convertedLead?.assigned_executive_details?.id || 
                          convertedLead?.assigned_executive;

          const staffName = cust.sales_executive_details?.full_name || 
                            convertedLead?.assigned_executive_details?.full_name || 
                            (staffId ? `Executive #${staffId}` : "Unassigned");

          const customerProjectVal = parseFloat(cust.project_value || 0);
          const leadAmt = parseFloat(convertedLead?.amount || 0);
          const val = customerProjectVal > 0 ? customerProjectVal : leadAmt;

          const execEntry = getOrInitExec(staffId, staffName);
          execEntry.revenue += val;
        });

        const maxExecRev = Math.max(...Object.values(execMap).map(e => e.revenue), 1);
        const executivePerformance = Object.values(execMap)
          .filter(e => e.totalLeads > 0 || e.revenue > 0)
          .map(e => ({
            ...e,
            formattedRevenue: formatCurrencyInLakhs(e.revenue),
            progressWidth: Math.max(8, (e.revenue / maxExecRev) * 100)
          }))
          .sort((a, b) => b.revenue - a.revenue || b.wonLeads - a.wonLeads);

        // --- RECENT ACTIVITIES LOG ---
        const recentLeads = [...leads]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 8);

        const recentActivities = recentLeads.map(lead => {
          const leadFollowups = followups.filter(f => f.lead === lead.id);
          const latestFollowup = leadFollowups.length > 0 ? leadFollowups[leadFollowups.length - 1] : null;
          const lastActivity = latestFollowup?.created_at || lead.created_at;

          return {
            name: lead.company_name || lead.contact_person || "Unknown Lead",
            source: lead.lead_source || "N/A",
            agent: lead.assigned_executive_details?.full_name || "Unassigned",
            time: getTimeAgo(lastActivity),
            status: lead.status || 'open',
            hasFollowup: leadFollowups.length > 0,
            isConverted: lead.is_converted
          };
        });

        setStats({
          totalLeads,
          convertedLeads,
          totalCustomers,
          totalFollowups,
          todayFollowups,
          overdueFollowups,
          conversionRate,
          avgResponseTime: "14m",
          leadsByStatus,
          leadsByStage,
          recentActivities,
          monthlyTrend,
          leadsBySource,
          executivePerformance,
          revenueTrend
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getDonutSegments = () => {
    let cumulative = 0;
    return stats.leadsBySource.map(item => {
      const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
      const strokeDashoffset = 100 - cumulative + 25;
      cumulative += item.percentage;
      return { ...item, strokeDasharray, strokeDashoffset };
    });
  };

  const getPoints = () => {
    if (!stats.revenueTrend.length) return [];
    return stats.revenueTrend.map((d, index) => {
      const x = (index / (stats.revenueTrend.length - 1)) * 300;
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
    <Base title="" filterTitle="Dashboard Filters">
      <div className="w-full space-y-5 font-sans antialiased text-slate-800 -mt-5 -mx-2 px-1">
        
        {/* HEADER WELCOME BANNER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 pt-2">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Executive Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">Real-time business overview and sales metrics.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : stats.totalLeads.toLocaleString()}
              </h3>
              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span>{stats.convertedLeads} converted</span>
                <span className="text-slate-400 font-normal">to customers</span>
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customers</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : stats.totalCustomers.toLocaleString()}
              </h3>
              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span>Active customers</span>
                <span className="text-slate-400 font-normal">in system</span>
              </p>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex items-center justify-between transition hover:shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversion Rate</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isLoading ? <span className="text-base font-medium text-slate-400 animate-pulse">Loading...</span> : `${stats.conversionRate}%`}
              </h3>
              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span>{stats.convertedLeads} converted</span>
                <span className="text-slate-400 font-normal">out of {stats.totalLeads}</span>
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
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

        {/* 2. TOP ROW: LEAD SOURCE ANALYSIS, EXECUTIVE PERFORMANCE & FOLLOW-UP OVERVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* LEAD SOURCE ANALYSIS WITH PIE/DONUT CHART */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lead Source Analysis</h3>
              <p className="text-xs text-slate-400 mb-2">Distribution by channel</p>

              <div className="flex justify-center my-2">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
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
                {stats.leadsBySource.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.bgColor}`}></span>
                    <span className="text-slate-600 truncate">{item.label}</span>
                    <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EXECUTIVE PERFORMANCE BLOCK */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Executive Performance</h3>
              <p className="text-xs text-slate-400 mb-4">Revenue by sales executive</p>

              <div className="space-y-4">
                {stats.executivePerformance.length > 0 ? (
                  stats.executivePerformance.map((exec, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800">{exec.name}</span>
                        <span className="font-bold text-slate-900">{exec.formattedRevenue}</span>
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
                  <p className="text-xs text-slate-400 text-center py-6">No executive performance data</p>
                )}
              </div>
            </div>
          </div>

          {/* FOLLOW-UP OVERVIEW */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Follow-up Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-medium text-slate-600">Total Follow-ups</span>
                  <span className="text-base font-medium text-slate-900">
                    {isLoading ? <span className="text-sm text-slate-400 animate-pulse">Loading...</span> : stats.totalFollowups}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-medium text-slate-600">Today's Follow-ups</span>
                  <span className="text-base font-medium text-slate-900">
                    {isLoading ? <span className="text-sm text-slate-400 animate-pulse">Loading...</span> : stats.todayFollowups}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-600">Overdue Follow-ups</span>
                  <span className="text-base font-medium text-slate-900">
                    {isLoading ? <span className="text-sm text-slate-400 animate-pulse">Loading...</span> : stats.overdueFollowups}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <span>📋</span> {stats.totalFollowups} total follow-ups logged
              </span>
            </div>
          </div>

        </div>

        {/* 3. SECOND ROW: REVENUE TREND & MONTHLY LEAD TREND */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* REVENUE TREND ONLY */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-900">Revenue Trend</h3>
                <p className="text-xs text-slate-400">Monthly comparison · {new Date().getFullYear()}</p>
              </div>

              <div className="relative h-48 w-full pt-4">
                {/* Y-AXIS LABELS */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-slate-400">
                  <span>40L</span>
                  <span>30L</span>
                  <span>20L</span>
                  <span>10L</span>
                  <span>0L</span>
                </div>

                <div className="ml-8 h-full flex flex-col justify-between">
                  <div className="relative h-36 w-full border-b border-slate-100">
                    
                    {/* INTERACTIVE HOVER OVERLAY COLUMNS */}
                    <div className="absolute inset-0 flex justify-between z-20">
                      {getPoints().map((pt, idx) => (
                        <div key={idx} className="flex-1 group relative flex justify-center">
                          
                          {/* HOVER TOOLTIP */}
                          <div className="absolute bottom-full mb-3 hidden group-hover:block z-30 bg-white border border-slate-200 shadow-xl rounded-xl p-3 text-left min-w-[120px]">
                            <p className="text-xs font-bold text-slate-900">{pt.month}</p>
                            <p className="text-xs font-semibold text-blue-600 mt-1">Revenue : {pt.formattedRevenue}</p>
                          </div>

                          {/* VERTICAL INDICATOR LINE ON HOVER */}
                          <div className="w-[1px] h-full bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                          {/* DOT ON THE LINE */}
                          <div 
                            className="absolute w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ top: `${pt.y}%` }}
                          ></div>
                        </div>
                      ))}
                    </div>

                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                      {/* Fill area below line */}
                      <path
                        d={`${buildSmoothPath()} L 300,100 L 0,100 Z`}
                        fill="rgba(37, 99, 235, 0.08)"
                      />
                      {/* Main Smooth Line */}
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
                    {stats.revenueTrend.map((item, idx) => (
                      <span key={idx} className="flex-1 text-center">{item.month}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span className="text-slate-600 font-medium">Revenue</span>
              </div>
            </div>
          </div>

          {/* MONTHLY LEAD TREND */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-900">Monthly Lead Trend</h3>
                <p className="text-xs text-slate-400">Leads vs Conversions · {new Date().getFullYear()}</p>
              </div>

              <div className="relative h-48 w-full pt-4">
                {/* Y-AXIS LABELS */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-slate-400">
                  <span>160</span>
                  <span>120</span>
                  <span>80</span>
                  <span>40</span>
                  <span>0</span>
                </div>

                <div className="ml-8 h-full flex flex-col justify-between">
                  <div className="relative h-36 w-full border-b border-slate-100 flex items-end justify-between px-1">
                    {stats.monthlyTrend.map((bar, idx) => (
                      <div key={idx} className="flex-1 flex items-end justify-center gap-1 group relative h-full">
                        
                        {/* HOVER TOOLTIP CARD */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 bg-white border border-slate-200 shadow-lg rounded-lg p-2.5 text-left min-w-[110px]">
                          <p className="text-xs font-bold text-slate-900">{bar.month}</p>
                          <p className="text-[11px] text-blue-400 mt-1">Total Leads : {bar.total}</p>
                          <p className="text-[11px] text-blue-700 font-semibold mt-0.5">Converted : {bar.converted}</p>
                        </div>

                        {/* Total Leads Bar */}
                        <div 
                          className="w-3.5 bg-blue-200 rounded-t-md transition-all duration-200 group-hover:bg-blue-300" 
                          style={{ height: `${bar.totalHeight}%` }}
                        ></div>
                        {/* Converted Leads Bar */}
                        <div 
                          className="w-3.5 bg-blue-600 rounded-t-md transition-all duration-200 group-hover:bg-blue-700" 
                          style={{ height: `${bar.convertedHeight}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>

                  {/* X-AXIS LABELS */}
                  <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                    {stats.monthlyTrend.map((item, idx) => (
                      <span key={idx} className="flex-1 text-center">{item.month}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-200"></span>
                <span className="text-slate-600 font-medium">Total Leads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span>
                <span className="text-slate-600 font-medium">Converted</span>
              </div>
            </div>
          </div>

        </div>

        {/* 4. BOTTOM ROW: LEAD STATUS, PIPELINE STAGES & RECENT ACTIVITIES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* LEAD STATUS BREAKDOWN */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 mb-4 tracking-wide uppercase">Lead Status Breakdown</h3>
              <div className="space-y-3.5">
                {stats.leadsByStatus.length > 0 ? (
                  stats.leadsByStatus.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="text-slate-900 font-semibold">{item.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No leads found</p>
                )}
              </div>
            </div>
          </div>

          {/* PIPELINE STAGES */}
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-5 lg:col-span-2 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 mb-4 tracking-wide uppercase">Pipeline Stages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.leadsByStage.length > 0 ? (
                  stats.leadsByStage.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <span className="text-xs font-medium text-slate-600">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{item.count}</span>
                        <span className="text-[10px] text-slate-400">{item.percentage}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4 col-span-2">No pipeline data</p>
                )}
              </div>
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
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right pr-1">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                {stats.recentActivities.length > 0 ? (
                  stats.recentActivities.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40 transition">
                      <td className="py-2.5 pl-1 text-slate-900 font-semibold">{row.name}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-normal">
                          {row.source}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {row.agent === "Unassigned" ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] border border-rose-200 font-bold">⚠️ Assign Now</span>
                        ) : (
                          row.agent
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          row.status === 'close_win' || row.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : 
                          row.status === 'close_loss' ? 'bg-rose-100 text-rose-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {row.status === 'close_win' ? 'Close Win' : row.status === 'close_loss' ? 'Close Loss' : row.status || 'Open'}
                        </span>
                        {row.isConverted && (
                          <span className="ml-1 text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold">✓ Converted</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right pr-1 text-slate-400">{row.time}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-slate-400 text-xs">No recent activity</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Base>
  );
}