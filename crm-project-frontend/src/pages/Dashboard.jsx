import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Base from "../components/Base";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardFilterBar, { MONTHS } from "../components/dashboard/DashboardFilterBar";
import LeadDashboard from "../components/dashboard/LeadDashboard";
import QuotationDashboard from "../components/dashboard/QuotationDashboard";
import AMCDashboard from "../components/dashboard/AMCDashboard";
import ProductDashboard from "../components/dashboard/ProductDashboard";
import RoleManagementDashboard from "../components/dashboard/RoleManagementDashboard";
import SummaryDashboard from "../components/dashboard/SummaryDashboard";
import ProjectReportDashboard from "../components/dashboard/ProjectReportDashboard";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "leads";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Common Filter State
  const [filterConfig, setFilterConfig] = useState({
    mode: "all", // 'all' | 'year' | 'month' | 'quarter' | 'preset' | 'custom'
    preset: "all", // 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_year' | 'custom'
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // 1 to 12
    quarter: Math.floor(new Date().getMonth() / 3) + 1, // 1 to 4
    startDate: "",
    endDate: "",
  });

  // Raw Module Data States (Unfiltered source of truth from API)
  const [rawLeads, setRawLeads] = useState([]);
  const [rawQuotations, setRawQuotations] = useState([]);
  const [rawCustomers, setRawCustomers] = useState([]);
  const [rawFollowups, setRawFollowups] = useState([]);
  const [rawAmcContracts, setRawAmcContracts] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [rawCategories, setRawCategories] = useState([]);
  const [rawRoles, setRawRoles] = useState([]);
  const [rawStaff, setRawStaff] = useState([]);
  const [rawProjects, setRawProjects] = useState([]);

  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const LEADS_ENDPOINT = `${BASE_API}/lead/lead/`;
  const CUSTOMERS_ENDPOINT = `${BASE_API}/lead/customer/`;
  const FOLLOWUPS_ENDPOINT = `${BASE_API}/lead/lead-followups/`;
  const QUOTATIONS_ENDPOINT = `${BASE_API}/quotation/quotation/`;
  const AMC_ENDPOINT_1 = `${BASE_API}/lead/amc/contracts/?limit=1000`;
  const AMC_ENDPOINT_2 = `${BASE_API}/amc/contracts/?limit=1000`;
  const PRODUCTS_ENDPOINT = `${BASE_API}/product/products/`;
  const CATEGORIES_ENDPOINT = `${BASE_API}/product/categories/`;
  const ROLES_ENDPOINT = `${BASE_API}/auth/roles/`;
  const STAFF_ENDPOINT = `${BASE_API}/auth/staff/`;
  const PROJECTS_ENDPOINT = `${BASE_API}/lead/projects/?limit=1000`;

  const getTodayString = () => new Date().toISOString().split("T")[0];

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
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
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
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabId);
      return next;
    });
  };

  // 1. Fetch raw dashboard datasets
  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "";

    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Resilient parallel fetching using Promise.allSettled
      const [
        leadsSettled,
        customersSettled,
        followupsSettled,
        quotationsSettled,
        amcSettled,
        productsSettled,
        categoriesSettled,
        rolesSettled,
        staffSettled,
        projectsSettled,
      ] = await Promise.allSettled([
        fetch(LEADS_ENDPOINT, { headers }),
        fetch(CUSTOMERS_ENDPOINT, { headers }),
        fetch(FOLLOWUPS_ENDPOINT, { headers }),
        fetch(QUOTATIONS_ENDPOINT, { headers }),
        fetch(AMC_ENDPOINT_1, { headers }).then(async (res) => {
          if (!res.ok) return fetch(AMC_ENDPOINT_2, { headers });
          return res;
        }),
        fetch(PRODUCTS_ENDPOINT, { headers }),
        fetch(CATEGORIES_ENDPOINT, { headers }),
        fetch(ROLES_ENDPOINT, { headers }),
        fetch(STAFF_ENDPOINT, { headers }),
        fetch(PROJECTS_ENDPOINT, { headers }),
      ]);

      // Leads, Customers, Followups
      const leadsRes = leadsSettled.status === "fulfilled" ? leadsSettled.value : null;
      const customersRes = customersSettled.status === "fulfilled" ? customersSettled.value : null;
      const followupsRes = followupsSettled.status === "fulfilled" ? followupsSettled.value : null;

      const leadsData = leadsRes && leadsRes.ok ? await leadsRes.json() : { results: [] };
      const customersData = customersRes && customersRes.ok ? await customersRes.json() : { results: [] };
      const followupsData = followupsRes && followupsRes.ok ? await followupsRes.json() : { results: [] };

      setRawLeads(Array.isArray(leadsData) ? leadsData : leadsData.results || []);
      setRawCustomers(Array.isArray(customersData) ? customersData : customersData.results || []);
      setRawFollowups(Array.isArray(followupsData) ? followupsData : followupsData.results || []);

      // Quotations
      const quotationsRes = quotationsSettled.status === "fulfilled" ? quotationsSettled.value : null;
      if (quotationsRes && quotationsRes.ok) {
        const quotesData = await quotationsRes.json();
        setRawQuotations(Array.isArray(quotesData) ? quotesData : quotesData.results || []);
      }

      // AMC Contracts
      const amcRes = amcSettled.status === "fulfilled" ? amcSettled.value : null;
      if (amcRes && amcRes.ok) {
        const amcData = await amcRes.json();
        setRawAmcContracts(Array.isArray(amcData) ? amcData : amcData.results || []);
      }

      // Products & Categories
      const productsRes = productsSettled.status === "fulfilled" ? productsSettled.value : null;
      if (productsRes && productsRes.ok) {
        const pData = await productsRes.json();
        setRawProducts(Array.isArray(pData) ? pData : pData.results || []);
      }

      const categoriesRes = categoriesSettled.status === "fulfilled" ? categoriesSettled.value : null;
      if (categoriesRes && categoriesRes.ok) {
        const cData = await categoriesRes.json();
        setRawCategories(Array.isArray(cData) ? cData : cData.results || []);
      }

      // Roles & Staff
      const rolesRes = rolesSettled.status === "fulfilled" ? rolesSettled.value : null;
      if (rolesRes && rolesRes.ok) {
        const rData = await rolesRes.json();
        setRawRoles(Array.isArray(rData) ? rData : rData.results || []);
      }

      const staffRes = staffSettled.status === "fulfilled" ? staffSettled.value : null;
      if (staffRes && staffRes.ok) {
        const sData = await staffRes.json();
        setRawStaff(Array.isArray(sData) ? sData : sData.results || []);
      }

      // Projects
      const projectsRes = projectsSettled.status === "fulfilled" ? projectsSettled.value : null;
      if (projectsRes && projectsRes.ok) {
        const prjData = await projectsRes.json();
        setRawProjects(Array.isArray(prjData) ? prjData : prjData.results || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard telemetry:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    LEADS_ENDPOINT,
    CUSTOMERS_ENDPOINT,
    FOLLOWUPS_ENDPOINT,
    QUOTATIONS_ENDPOINT,
    AMC_ENDPOINT_1,
    AMC_ENDPOINT_2,
    PRODUCTS_ENDPOINT,
    CATEGORIES_ENDPOINT,
    ROLES_ENDPOINT,
    STAFF_ENDPOINT,
    PROJECTS_ENDPOINT,
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 2. Extract all available years from records dynamically
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear - 2);

    const checkDate = (dateStr) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        if (y > 2000 && y < 2100) yearsSet.add(y);
      }
    };

    rawLeads.forEach((l) => checkDate(l.created_at || l.followup_date));
    rawQuotations.forEach((q) => checkDate(q.quotation_date || q.created_at));
    rawProjects.forEach((p) => checkDate(p.start_date || p.created_at));
    rawAmcContracts.forEach((c) => checkDate(c.start_date || c.created_at));

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [rawLeads, rawQuotations, rawProjects, rawAmcContracts]);

  // 3. Compute active date boundaries [start, end]
  const dateBounds = useMemo(() => {
    const { mode, preset, year, month, quarter, startDate, endDate } = filterConfig;

    if (mode === "all" && preset === "all") {
      return null;
    }

    const now = new Date();

    // Preset options
    if (mode === "preset" || (preset && preset !== "all" && preset !== "custom_mode" && mode !== "custom")) {
      if (preset === "this_month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        return { start, end, label: `This Month (${label})` };
      }
      if (preset === "last_month") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const label = start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        return { start, end, label: `Last Month (${label})` };
      }
      if (preset === "this_quarter") {
        const q = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
        return { start, end, label: `This Quarter (Q${q + 1} ${now.getFullYear()})` };
      }
      if (preset === "this_year") {
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end, label: `This Year (${now.getFullYear()})` };
      }
      if (preset === "last_year") {
        const prevYear = now.getFullYear() - 1;
        const start = new Date(prevYear, 0, 1, 0, 0, 0, 0);
        const end = new Date(prevYear, 11, 31, 23, 59, 59, 999);
        return { start, end, label: `Last Year (${prevYear})` };
      }
    }

    // Explicit mode selection
    if (mode === "year") {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end, label: `Year ${year}` };
    }

    if (mode === "month") {
      const monthIdx = (month || 1) - 1;
      const start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
      const end = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
      const monthObj = MONTHS.find((m) => m.value === month);
      const monthName = monthObj ? monthObj.label : `Month ${month}`;
      return { start, end, label: `${monthName} ${year}` };
    }

    if (mode === "quarter") {
      const q = quarter || 1;
      const start = new Date(year, (q - 1) * 3, 1, 0, 0, 0, 0);
      const end = new Date(year, q * 3, 0, 23, 59, 59, 999);
      return { start, end, label: `Q${q} ${year}` };
    }

    if (mode === "custom") {
      let start = null;
      let end = null;
      if (startDate) {
        const [sY, sM, sD] = startDate.split("-").map(Number);
        start = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
      }
      if (endDate) {
        const [eY, eM, eD] = endDate.split("-").map(Number);
        end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
      }
      let label = "Custom Range";
      if (startDate && endDate) label = `${startDate} to ${endDate}`;
      else if (startDate) label = `From ${startDate}`;
      else if (endDate) label = `Until ${endDate}`;

      return { start, end, label };
    }

    return null;
  }, [filterConfig]);

  // Helper date checker
  const isDateInRange = useCallback((dateStr, bounds) => {
    if (!bounds) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (bounds.start && d < bounds.start) return false;
    if (bounds.end && d > bounds.end) return false;
    return true;
  }, []);

  // 4. Derive filtered datasets reactively
  const filteredLeads = useMemo(() => {
    if (!dateBounds) return rawLeads;
    return rawLeads.filter((l) => isDateInRange(l.created_at || l.followup_date, dateBounds));
  }, [rawLeads, dateBounds, isDateInRange]);

  const filteredCustomers = useMemo(() => {
    if (!dateBounds) return rawCustomers;
    return rawCustomers.filter((c) => isDateInRange(c.created_at, dateBounds));
  }, [rawCustomers, dateBounds, isDateInRange]);

  const filteredFollowups = useMemo(() => {
    if (!dateBounds) return rawFollowups;
    return rawFollowups.filter((f) => isDateInRange(f.followup_date || f.created_at, dateBounds));
  }, [rawFollowups, dateBounds, isDateInRange]);

  const filteredQuotations = useMemo(() => {
    if (!dateBounds) return rawQuotations;
    return rawQuotations.filter((q) => isDateInRange(q.quotation_date || q.created_at, dateBounds));
  }, [rawQuotations, dateBounds, isDateInRange]);

  const filteredProjects = useMemo(() => {
    if (!dateBounds) return rawProjects;
    return rawProjects.filter((p) =>
      isDateInRange(p.start_date || p.created_at || p.expected_to_go_live, dateBounds)
    );
  }, [rawProjects, dateBounds, isDateInRange]);

  const filteredAmcContracts = useMemo(() => {
    if (!dateBounds) return rawAmcContracts;
    return rawAmcContracts.filter((c) => isDateInRange(c.start_date || c.created_at, dateBounds));
  }, [rawAmcContracts, dateBounds, isDateInRange]);

  const filteredProducts = useMemo(() => {
    if (!dateBounds) return rawProducts;
    return rawProducts.filter((p) => {
      if (!p.created_at) return true; // keep catalog items visible
      return isDateInRange(p.created_at, dateBounds);
    });
  }, [rawProducts, dateBounds, isDateInRange]);

  const filteredStaff = useMemo(() => {
    if (!dateBounds) return rawStaff;
    return rawStaff.filter((s) => {
      if (!s.date_joined && !s.created_at) return true;
      return isDateInRange(s.date_joined || s.created_at, dateBounds);
    });
  }, [rawStaff, dateBounds, isDateInRange]);

  // Total matching records count across all transactional modules
  const totalFilteredCount =
    filteredLeads.length +
    filteredQuotations.length +
    filteredProjects.length +
    filteredAmcContracts.length;

  const activeFilterSummary = dateBounds?.label || "All Time";

  const handleResetFilter = () => {
    setFilterConfig({
      mode: "all",
      preset: "all",
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      quarter: Math.floor(new Date().getMonth() / 3) + 1,
      startDate: "",
      endDate: "",
    });
  };

  // 5. Dynamic Lead Analytics & Trend calculations computed against filtered data
  const leadStats = useMemo(() => {
    const leads = filteredLeads;
    const customers = filteredCustomers;
    const followups = filteredFollowups;
    const projectList = filteredProjects;

    const today = getTodayString();
    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l) => l.is_converted === true).length;
    const totalCustomers = customers.length;
    const totalFollowups = followups.length;
    const isNotClosed = (s) => s !== "close_win" && s !== "close_loss" && s !== "closed";
    const todayFollowups = leads.filter((l) => l.followup_date === today && isNotClosed(l.status)).length;
    const overdueFollowups = leads.filter((l) => l.followup_date && l.followup_date < today && isNotClosed(l.status)).length;

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    // Status breakdown
    const statusMap = {};
    leads.forEach((lead) => {
      const status = lead.status || "open";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    const statusColors = {
      open: "bg-blue-600",
      close_win: "bg-emerald-500",
      close_loss: "bg-rose-500",
      closed: "bg-emerald-500",
      in_process: "bg-indigo-500",
    };

    const statusLabels = {
      open: "Open",
      close_win: "Close Win",
      close_loss: "Close Loss",
      closed: "Closed",
      in_process: "In Process",
    };

    const leadsByStatus = Object.entries(statusMap).map(([key, count]) => ({
      label: statusLabels[key] || key,
      count,
      color: statusColors[key] || "bg-slate-500",
      percentage: totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : 0,
    }));

    // Pipeline stages
    const stageMap = {};
    const stageLabels = {
      new_lead: "New Lead",
      contacted: "Contacted",
      requirement_gathering: "Requirement Gathering",
      demo_scheduled: "Demo Scheduled",
      demo_completed: "Demo Completed",
      proposal_sent: "Proposal Sent",
      negotiation: "Negotiation",
      won: "Won",
      lost: "Lost",
      on_hold: "On Hold",
    };

    leads.forEach((lead) => {
      const stage = lead.pipeline_stage || "new_lead";
      stageMap[stage] = (stageMap[stage] || 0) + 1;
    });

    const leadsByStage = Object.entries(stageMap)
      .map(([key, count]) => ({
        label: stageLabels[key] || key,
        count,
        percentage: totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Monthly Trend
    const monthMap = {};
    const months = [];
    const now = new Date();

    const isYearSpecific =
      filterConfig.mode === "year" ||
      filterConfig.preset === "this_year" ||
      filterConfig.preset === "last_year";

    const targetYear =
      filterConfig.mode === "year"
        ? filterConfig.year
        : filterConfig.preset === "last_year"
        ? now.getFullYear() - 1
        : now.getFullYear();

    if (isYearSpecific) {
      // 12 months for the specific selected year
      for (let m = 0; m < 12; m++) {
        const d = new Date(targetYear, m, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en-IN", { month: "short" });
        months.push({ key, label });
        monthMap[key] = { label, total: 0, converted: 0, revenue: 0 };
      }
    } else {
      // Rolling 12-month trend
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en-IN", { month: "short" });
        months.push({ key, label });
        monthMap[key] = { label, total: 0, converted: 0, revenue: 0 };
      }
    }

    leads.forEach((lead) => {
      if (lead.created_at) {
        const date = new Date(lead.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap[key]) {
          monthMap[key].total += 1;
          if (lead.is_converted) {
            monthMap[key].converted += 1;
          }
        }
      }
    });

    // Revenue from filtered projects
    const projectsForRevenue = projectList.length > 0 ? projectList : [];
    projectsForRevenue.forEach((prj) => {
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

    const maxLeadCount = Math.max(...Object.values(monthMap).map((m) => m.total), 1);
    const monthlyTrend = months.map((m) => ({
      month: m.label,
      total: monthMap[m.key].total,
      converted: monthMap[m.key].converted,
      totalHeight: Math.max(10, (monthMap[m.key].total / maxLeadCount) * 100),
      convertedHeight: Math.max(5, (monthMap[m.key].converted / maxLeadCount) * 100),
    }));

    const rawMaxRev = Math.max(...Object.values(monthMap).map((m) => m.revenue), 0);
    let maxRev = rawMaxRev > 0 ? rawMaxRev : 100000;
    if (maxRev <= 100000) maxRev = 100000;
    else if (maxRev <= 500000) maxRev = 500000;
    else if (maxRev <= 1000000) maxRev = 1000000;
    else if (maxRev <= 2500000) maxRev = 2500000;
    else if (maxRev <= 5000000) maxRev = 5000000;
    else maxRev = Math.ceil(maxRev / 1000000) * 1000000;

    const revenueYTicks = [
      formatCurrencyInLakhs(maxRev),
      formatCurrencyInLakhs(Math.round(maxRev * 0.75)),
      formatCurrencyInLakhs(Math.round(maxRev * 0.5)),
      formatCurrencyInLakhs(Math.round(maxRev * 0.25)),
      "0L",
    ];

    const revenueTrend = months.map((m) => ({
      month: m.label,
      revenue: monthMap[m.key].revenue,
      revNorm: maxRev > 0 ? (monthMap[m.key].revenue / maxRev) * 100 : 0,
      formattedRevenue: formatCurrencyInLakhs(monthMap[m.key].revenue),
    }));

    // Lead sources
    const sourceMap = {};
    const sourceMeta = {
      website: { label: "Website", color: "#3b82f6", bg: "bg-blue-600" },
      referral: { label: "Referral", color: "#60a5fa", bg: "bg-blue-400" },
      cold_call: { label: "Cold Call", color: "#a855f7", bg: "bg-purple-500" },
      social_media: { label: "Social Media", color: "#10b981", bg: "bg-emerald-500" },
      email_campaign: { label: "Email Campaign", color: "#f59e0b", bg: "bg-amber-500" },
      exhibition: { label: "Exhibition", color: "#ef4444", bg: "bg-red-500" },
      other: { label: "Other", color: "#94a3b8", bg: "bg-slate-400" },
    };

    leads.forEach((lead) => {
      const source = lead.lead_source || "other";
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });

    const leadsBySource = Object.entries(sourceMap)
      .map(([key, count]) => ({
        key,
        label: sourceMeta[key]?.label || key.replace(/_/g, " "),
        count,
        hexColor: sourceMeta[key]?.color || "#94a3b8",
        bgColor: sourceMeta[key]?.bg || "bg-slate-400",
        percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Executive performance
    const execMap = {};
    const getOrInitExec = (id, name) => {
      const key = id ? `id_${id}` : name || "Unassigned";
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

    leads.forEach((lead) => {
      const staffId = lead.assigned_executive_details?.id || lead.assigned_executive;
      const staffName =
        lead.assigned_executive_details?.full_name ||
        (lead.assigned_executive ? `Executive #${lead.assigned_executive}` : "Unassigned");

      const execEntry = getOrInitExec(staffId, staffName);
      execEntry.totalLeads += 1;
      if (lead.is_converted) {
        execEntry.wonLeads += 1;
      }
    });

    customers.forEach((cust) => {
      const convertedLead = leads.find(
        (l) => (cust.lead && l.id === cust.lead) || l.converted_to_customer === cust.id
      );

      const staffId =
        cust.sales_executive_details?.id ||
        cust.sales_executive ||
        convertedLead?.assigned_executive_details?.id ||
        convertedLead?.assigned_executive;

      const staffName =
        cust.sales_executive_details?.full_name ||
        convertedLead?.assigned_executive_details?.full_name ||
        (staffId ? `Executive #${staffId}` : "Unassigned");

      const customerProjectVal = parseFloat(cust.project_value || 0);
      const leadAmt = parseFloat(convertedLead?.amount || 0);
      const val = customerProjectVal > 0 ? customerProjectVal : leadAmt;

      const execEntry = getOrInitExec(staffId, staffName);
      execEntry.revenue += val;
    });

    const maxExecRev = Math.max(...Object.values(execMap).map((e) => e.revenue), 1);
    const executivePerformance = Object.values(execMap)
      .filter((e) => e.totalLeads > 0 || e.revenue > 0)
      .map((e) => ({
        ...e,
        formattedRevenue: formatCurrencyInLakhs(e.revenue),
        progressWidth: Math.max(8, (e.revenue / maxExecRev) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue || b.wonLeads - a.wonLeads);

    // Recent activities (5 leads)
    const recentLeads = [...leads]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    const recentActivities = recentLeads.map((lead) => {
      const leadFollowups = followups.filter((f) => f.lead === lead.id);
      const latestFollowup = leadFollowups.length > 0 ? leadFollowups[leadFollowups.length - 1] : null;
      const lastActivity = latestFollowup?.created_at || lead.created_at;

      return {
        name: lead.company_name || lead.contact_person || "Unknown Lead",
        source: lead.lead_source || "N/A",
        agent: lead.assigned_executive_details?.full_name || "Unassigned",
        time: getTimeAgo(lastActivity),
        status: lead.status || "open",
        hasFollowup: leadFollowups.length > 0,
        isConverted: lead.is_converted,
      };
    });

    return {
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
      revenueTrend,
      revenueYTicks,
    };
  }, [
    filteredLeads,
    filteredCustomers,
    filteredFollowups,
    filteredProjects,
    filterConfig,
  ]);

  // Aggregate counts for Header Carousel Chips reflecting filtered data
  const counts = {
    summary:
      filteredLeads.length +
      filteredQuotations.length +
      filteredAmcContracts.length +
      filteredProducts.length +
      filteredStaff.length +
      filteredProjects.length,
    leads: filteredLeads.length,
    quotations: filteredQuotations.length,
    projects: filteredProjects.length,
    amc: filteredAmcContracts.length,
    products: filteredProducts.length,
    roles: filteredStaff.length > 0 ? filteredStaff.length : rawRoles.length,
  };

  return (
    <Base title="" filterTitle="Dashboard Filters">
      <div className="w-full space-y-4 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">
        {/* HEADER SECTION WITH FILTER & REFRESH BUTTONS */}
        <DashboardHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={counts}
          onRefresh={() => fetchDashboardData(true)}
          isRefreshing={isRefreshing}
          isFilterOpen={isFilterOpen}
          onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
          isFilterActive={filterConfig.mode !== "all" || filterConfig.preset !== "all"}
        />

        {/* COMMON DASHBOARD FILTER BAR (REVEALED WHEN FILTER BUTTON IS CLICKED) */}
        {isFilterOpen && (
          <DashboardFilterBar
            filterConfig={filterConfig}
            onFilterChange={setFilterConfig}
            onReset={handleResetFilter}
            availableYears={availableYears}
            totalFilteredCount={totalFilteredCount}
            activeFilterSummary={activeFilterSummary}
            onClose={() => setIsFilterOpen(false)}
          />
        )}

        {/* COMPACT ACTIVE FILTER BANNER (WHEN FILTERS ARE ACTIVE BUT BAR IS COLLAPSED) */}
        {!isFilterOpen && (filterConfig.mode !== "all" || filterConfig.preset !== "all") && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 font-medium shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#377d58]" />
              <span>
                Filtered by: <strong className="font-bold">{activeFilterSummary}</strong> (
                {Number(totalFilteredCount).toLocaleString("en-IN")} matching records)
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="text-[#377d58] hover:text-[#285d41] font-bold underline cursor-pointer"
              >
                Modify Filter
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleResetFilter}
                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE MODULE VIEW */}
        <div className="transition-all duration-200">
          {activeTab === "summary" && (
            <SummaryDashboard
              leadsStats={leadStats}
              quotations={filteredQuotations}
              amcContracts={filteredAmcContracts}
              products={filteredProducts}
              roles={rawRoles}
              staff={filteredStaff}
              projects={filteredProjects}
              onNavigateTab={handleTabChange}
              isLoading={isLoading}
            />
          )}

          {activeTab === "leads" && (
            <LeadDashboard stats={leadStats} projects={filteredProjects} isLoading={isLoading} />
          )}

          {activeTab === "quotation" && (
            <QuotationDashboard quotations={filteredQuotations} isLoading={isLoading} />
          )}

          {activeTab === "projects" && (
            <ProjectReportDashboard projects={filteredProjects} isLoading={isLoading} />
          )}

          {activeTab === "amc" && (
            <AMCDashboard contracts={filteredAmcContracts} isLoading={isLoading} />
          )}

          {activeTab === "product" && (
            <ProductDashboard
              products={filteredProducts}
              categories={rawCategories}
              quotations={filteredQuotations}
              customers={filteredCustomers}
              amcContracts={filteredAmcContracts}
              projects={filteredProjects}
              isLoading={isLoading}
            />
          )}

          {activeTab === "roles" && (
            <RoleManagementDashboard
              roles={rawRoles}
              staff={filteredStaff}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </Base>
  );
}