import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Base from "../components/Base";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCalendarCheck,
  faUserPlus,
  faFileInvoice,
  faShieldHalved,
  faCheck,
  faTrash,
  faCircleCheck,
  faClock,
  faRotateRight,
  faKey,
  faUserShield,
  faHandshake,
  faBriefcase,
} from "@fortawesome/free-solid-svg-icons";

const initialNotifications = [
  {
    id: "default_req_1",
    title: "Password Change Requested",
    description: "Staff member Rahul Sharma (rahul@aksn.com) has requested a password change.",
    type: "requests",
    time: "5 mins ago",
    read: false,
    priority: "high",
    badge: "Password Request",
    icon: faKey,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50 text-amber-600 border-amber-100",
    userId: 1,
    userEmail: "rahul@aksn.com",
    userName: "Rahul Sharma",
    targetUrl: "/accounts?userId=1&email=rahul%40aksn.com",
  },
  {
    id: "default_1",
    title: "Overdue Follow-up Required",
    description: "Follow-up with Info Tech Ltd (Contact: Ragnath) is overdue.",
    type: "followup",
    time: "10 mins ago",
    read: false,
    priority: "high",
    badge: "Overdue",
    icon: faCalendarCheck,
    color: "from-rose-500 to-red-600",
    bgColor: "bg-rose-50 text-rose-600 border-rose-100",
    leadId: 1,
    targetUrl: "/leads?leadId=1",
  },
  {
    id: "default_2",
    title: "New Lead Assigned",
    description: "New website enquiry received from Rahul Sharma (Mobile App Project).",
    type: "leads",
    time: "35 mins ago",
    read: false,
    priority: "normal",
    badge: "New Lead",
    icon: faUserPlus,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50 text-blue-600 border-blue-100",
    leadId: 1,
    targetUrl: "/leads?leadId=1",
  },
  {
    id: "default_3",
    title: "Quotation #Q-2026-004 Accepted",
    description: "Teim Corp accepted quotation worth ₹4,50,000.",
    type: "quotation",
    time: "2 hours ago",
    read: false,
    priority: "high",
    badge: "Won",
    icon: faFileInvoice,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    quotationId: 1,
    targetUrl: "/quotation?quotationId=1",
  },
  {
    id: "default_4",
    title: "Follow-up Scheduled for Today",
    description: "Raju from Teim has follow-up scheduled for today.",
    type: "followup",
    time: "4 hours ago",
    read: true,
    priority: "normal",
    badge: "Today",
    icon: faClock,
    color: "from-amber-500 to-yellow-600",
    bgColor: "bg-amber-50 text-amber-600 border-amber-100",
    leadId: 1,
    targetUrl: "/leads?leadId=1",
  },
  {
    id: "default_amc_1",
    title: "AMC Contract Expiring Soon",
    description: "AMC contract #AMC-2026-088 for Info Tech Ltd expires in 7 days.",
    type: "amc",
    time: "1 hour ago",
    read: false,
    priority: "high",
    badge: "Expiring Soon",
    icon: faHandshake,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50 text-amber-600 border-amber-100",
    amcId: 1,
    targetUrl: "/amc?amcId=1",
  },
  {
    id: "default_prj_1",
    title: "Project Go-Live Scheduled",
    description: "Project PRJ-104 (CRM Implementation) is scheduled to go live tomorrow.",
    type: "projects",
    time: "3 hours ago",
    read: false,
    priority: "normal",
    badge: "Go Live",
    icon: faBriefcase,
    color: "from-cyan-500 to-blue-600",
    bgColor: "bg-cyan-50 text-cyan-700 border-cyan-100",
    projectId: 1,
    targetUrl: "/projects?projectId=1",
  },
  {
    id: "default_5",
    title: "System Role Updated",
    description: "Admin updated permissions matrix for Sales Manager role.",
    type: "system",
    time: "1 day ago",
    read: true,
    priority: "low",
    badge: "System",
    icon: faShieldHalved,
    color: "from-purple-500 to-violet-600",
    bgColor: "bg-purple-50 text-purple-600 border-purple-100",
    targetUrl: "/roles",
  },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);

  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return dateStr;
  };

  const fetchDynamicNotifications = useCallback(async () => {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token") || "";

    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [leadsRes, followupsRes, quotesRes, amcRes, projectsRes, staffRes] = await Promise.all([
        fetch(`${BASE_API}/lead/lead/?limit=100`, { headers }).catch(() => null),
        fetch(`${BASE_API}/lead/lead-followups/?limit=100`, { headers }).catch(() => null),
        fetch(`${BASE_API}/quotation/quotation/?limit=100`, { headers }).catch(() => null),
        fetch(`${BASE_API}/lead/amc/contracts/?limit=100`, { headers }).catch(() => null),
        fetch(`${BASE_API}/lead/projects/?limit=100`, { headers }).catch(() => null),
        fetch(`${BASE_API}/auth/staff/?limit=100`, { headers }).catch(() => null),
      ]);

      const leadsData = leadsRes && leadsRes.ok ? await leadsRes.json() : [];
      const followupsData = followupsRes && followupsRes.ok ? await followupsRes.json() : [];
      const quotesData = quotesRes && quotesRes.ok ? await quotesRes.json() : [];
      const amcData = amcRes && amcRes.ok ? await amcRes.json() : [];
      const projectsData = projectsRes && projectsRes.ok ? await projectsRes.json() : [];
      const staffData = staffRes && staffRes.ok ? await staffRes.json() : [];

      const leads = Array.isArray(leadsData) ? leadsData : leadsData.results || [];
      const followups = Array.isArray(followupsData) ? followupsData : followupsData.results || [];
      const quotes = Array.isArray(quotesData) ? quotesData : quotesData.results || [];
      const amcs = Array.isArray(amcData) ? amcData : amcData.results || [];
      const projectsList = Array.isArray(projectsData) ? projectsData : projectsData.results || [];
      const staffList = Array.isArray(staffData) ? staffData : staffData.results || [];

      const today = getTodayStr();
      const tomorrow = getTomorrowStr();

      const readIds = new Set(JSON.parse(localStorage.getItem("crm_notif_read_ids") || "[]"));
      const deletedIds = new Set(JSON.parse(localStorage.getItem("crm_notif_deleted_ids") || "[]"));
      const customNotifs = JSON.parse(localStorage.getItem("crm_custom_notifs") || "[]");

      const generated = [];

      // 1. FOLLOW-UPS
      leads.forEach((lead) => {
        if (!lead.followup_date) return;
        const isClosed = lead.status === "close_win" || lead.status === "close_loss" || lead.status === "closed";
        if (isClosed) return;

        const name = lead.company_name || lead.contact_person || "Unknown Client";

        if (lead.followup_date < today) {
          const id = `f_overdue_${lead.id}_${lead.followup_date}`;
          if (!deletedIds.has(id)) {
            generated.push({
              id,
              title: "Overdue Follow-up Required",
              description: `Follow-up with ${name} was due on ${lead.followup_date}.`,
              type: "followup",
              leadId: lead.id,
              targetUrl: `/leads?leadId=${lead.id}`,
              time: lead.followup_date,
              read: readIds.has(id),
              priority: "high",
              badge: "Overdue",
              icon: faCalendarCheck,
              color: "from-rose-500 to-red-600",
              bgColor: "bg-rose-50 text-rose-600 border-rose-100",
            });
          }
        } else if (lead.followup_date === today) {
          const id = `f_today_${lead.id}_${today}`;
          if (!deletedIds.has(id)) {
            generated.push({
              id,
              title: "Follow-up Scheduled Today",
              description: `Scheduled follow-up with ${name} today (${today}).`,
              type: "followup",
              leadId: lead.id,
              targetUrl: `/leads?leadId=${lead.id}`,
              time: "Today",
              read: readIds.has(id),
              priority: "high",
              badge: "Today",
              icon: faClock,
              color: "from-amber-500 to-yellow-600",
              bgColor: "bg-amber-50 text-amber-600 border-amber-100",
            });
          }
        } else if (lead.followup_date === tomorrow) {
          const id = `f_tomorrow_${lead.id}_${tomorrow}`;
          if (!deletedIds.has(id)) {
            generated.push({
              id,
              title: "Upcoming Follow-up Tomorrow",
              description: `Follow-up with ${name} is scheduled for tomorrow (${tomorrow}).`,
              type: "followup",
              leadId: lead.id,
              targetUrl: `/leads?leadId=${lead.id}`,
              time: "Tomorrow",
              read: readIds.has(id),
              priority: "normal",
              badge: "Tomorrow",
              icon: faClock,
              color: "from-blue-500 to-indigo-600",
              bgColor: "bg-blue-50 text-blue-600 border-blue-100",
            });
          }
        }
      });

      // 2. LEADS
      const sortedLeads = [...leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      sortedLeads.slice(0, 8).forEach((lead) => {
        const id = `lead_new_${lead.id}`;
        if (!deletedIds.has(id)) {
          const name = lead.company_name || lead.contact_person || "New Lead";
          const source = lead.lead_source ? `via ${lead.lead_source.replace(/_/g, ' ')}` : "";
          generated.push({
            id,
            title: "New Enquiry / Lead Added",
            description: `New lead added: ${name} ${source}.`,
            type: "leads",
            leadId: lead.id,
            targetUrl: `/leads?leadId=${lead.id}`,
            time: getTimeAgo(lead.created_at),
            read: readIds.has(id),
            priority: "normal",
            badge: "New Lead",
            icon: faUserPlus,
            color: "from-blue-500 to-cyan-600",
            bgColor: "bg-blue-50 text-blue-600 border-blue-100",
          });
        }
      });

      // 3. QUOTATIONS
      const sortedQuotes = [...quotes].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      sortedQuotes.slice(0, 8).forEach((q) => {
        const id = `quote_${q.id}_v${q.version || 1}`;
        if (!deletedIds.has(id)) {
          const qNum = q.quotation_number || `Q-${q.id}`;
          const isVersion = (q.version && q.version > 1) || (q.version_number && q.version_number > 1);
          generated.push({
            id,
            title: isVersion ? `Quotation Version Update (v${q.version || q.version_number})` : "New Quotation Generated",
            description: isVersion
              ? `Quotation #${qNum} was updated to Version ${q.version || q.version_number}.`
              : `New Quotation #${qNum} created for ${q.company_name || q.client_name || "Client"}.`,
            type: "quotation",
            quotationId: q.id,
            targetUrl: `/quotation?quotationId=${q.id}`,
            time: getTimeAgo(q.created_at || q.date),
            read: readIds.has(id),
            priority: isVersion ? "high" : "normal",
            badge: isVersion ? `v${q.version || q.version_number}` : "Quotation",
            icon: faFileInvoice,
            color: isVersion ? "from-purple-500 to-indigo-600" : "from-emerald-500 to-teal-600",
            bgColor: isVersion ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-emerald-50 text-emerald-600 border-emerald-100",
          });
        }
      });

      // 4. AMC CONTRACTS
      amcs.slice(0, 8).forEach((amc) => {
        const id = `amc_alert_${amc.id}`;
        if (!deletedIds.has(id)) {
          const isExpiring = amc.status === "expiring_soon";
          const isExpired = amc.status === "expired";
          const code = amc.contract_id || `#${amc.id}`;
          const name = amc.customer_name || amc.company_name || amc.customer_details?.company_name || "Client";
          generated.push({
            id,
            title: isExpired ? "AMC Contract Expired" : isExpiring ? "AMC Contract Expiring Soon" : "AMC Contract Update",
            description: `AMC contract ${code} for ${name} ${isExpired ? "has expired" : isExpiring ? `expires on ${amc.end_date}` : `active until ${amc.end_date || 'N/A'}`}.`,
            type: "amc",
            amcId: amc.id,
            targetUrl: `/amc?amcId=${amc.id}`,
            time: amc.end_date || "Active",
            read: readIds.has(id),
            priority: isExpired ? "high" : isExpiring ? "high" : "normal",
            badge: isExpired ? "Expired" : isExpiring ? "Expiring Soon" : "AMC",
            icon: faHandshake,
            color: isExpired ? "from-rose-500 to-red-600" : isExpiring ? "from-amber-500 to-orange-600" : "from-purple-500 to-indigo-600",
            bgColor: isExpired ? "bg-rose-50 text-rose-600 border-rose-100" : isExpiring ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-purple-50 text-purple-600 border-purple-100",
          });
        }
      });

      // 5. PROJECTS
      projectsList.slice(0, 8).forEach((prj) => {
        const id = `prj_alert_${prj.id}`;
        if (!deletedIds.has(id)) {
          const code = prj.project_code || `#${prj.id}`;
          const name = prj.customer_details?.company_name || prj.customer_details?.name || "Client";
          generated.push({
            id,
            title: prj.expected_to_go_live ? "Project Go-Live Scheduled" : "Project Initiated",
            description: `Project ${code} for ${name} ${prj.expected_to_go_live ? `scheduled to go live on ${prj.expected_to_go_live}` : "under development"}.`,
            type: "projects",
            projectId: prj.id,
            targetUrl: `/projects?projectId=${prj.id}`,
            time: getTimeAgo(prj.created_at || prj.start_date),
            read: readIds.has(id),
            priority: "normal",
            badge: prj.expected_to_go_live ? "Go-Live" : "Project",
            icon: faBriefcase,
            color: "from-cyan-500 to-blue-600",
            bgColor: "bg-cyan-50 text-cyan-700 border-cyan-100",
          });
        }
      });

      // 6. ACCOUNTS & STAFF
      staffList.slice(0, 8).forEach((st) => {
        const id = `staff_acc_${st.id}`;
        if (!deletedIds.has(id)) {
          const name = `${st.first_name || ''} ${st.last_name || ''}`.trim() || st.username || st.email;
          generated.push({
            id,
            title: "Staff Account Active",
            description: `Staff member ${name} (${st.email || 'No email'}) active account in system.`,
            type: "accounts",
            userId: st.id,
            userEmail: st.email,
            targetUrl: `/accounts?userId=${st.id}`,
            time: getTimeAgo(st.date_joined || st.created_at),
            read: readIds.has(id),
            priority: "low",
            badge: "Account",
            icon: faUserShield,
            color: "from-emerald-500 to-teal-600",
            bgColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
          });
        }
      });

      // 7. CUSTOM DISPATCHES
      customNotifs.forEach((cn) => {
        if (!deletedIds.has(cn.id)) {
          generated.push({
            ...cn,
            targetUrl: cn.targetUrl || (cn.leadId ? `/leads?leadId=${cn.leadId}` : cn.quotationId ? `/quotation?quotationId=${cn.quotationId}` : cn.customerId ? `/customer?customerId=${cn.customerId}` : cn.userId ? `/accounts?userId=${cn.userId}` : null),
            icon: cn.type === "requests" ? faKey : cn.type === "system" ? faShieldHalved : cn.type === "leads" ? faUserPlus : faBell,
            color: cn.type === "requests" ? "from-amber-500 to-orange-600" : cn.color || "from-purple-500 to-indigo-600",
            bgColor: cn.type === "requests" ? "bg-amber-50 text-amber-600 border-amber-100" : cn.bgColor || "bg-purple-50 text-purple-600 border-purple-100",
            read: readIds.has(cn.id),
          });
        }
      });

      const parseTimestamp = (item) => {
        if (item.timestamp) return item.timestamp;
        if (item.id && typeof item.id === 'string' && item.id.startsWith("req_")) {
          const ts = parseInt(item.id.replace("req_", ""), 10);
          if (!isNaN(ts)) return ts;
        }
        if (item.id && typeof item.id === 'string' && item.id.startsWith("custom_")) {
          const ts = parseInt(item.id.replace("custom_", ""), 10);
          if (!isNaN(ts)) return ts;
        }
        return 0;
      };

      const finalNotifs = generated.length > 0
        ? generated
        : initialNotifications.filter((n) => !deletedIds.has(n.id)).map(n => ({ ...n, read: readIds.has(n.id) }));

      finalNotifs.sort((a, b) => parseTimestamp(b) - parseTimestamp(a));

      setNotifications(finalNotifs);

    } catch (err) {
      console.error("Error fetching page notifications:", err);
      setNotifications(initialNotifications);
    } finally {
      setLoading(false);
    }
  }, [BASE_API]);

  useEffect(() => {
    fetchDynamicNotifications();
    window.addEventListener("crm_notification_updated", fetchDynamicNotifications);
    window.addEventListener("storage", fetchDynamicNotifications);
    return () => {
      window.removeEventListener("crm_notification_updated", fetchDynamicNotifications);
      window.removeEventListener("storage", fetchDynamicNotifications);
    };
  }, [fetchDynamicNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id) => {
    const updatedRead = new Set(JSON.parse(localStorage.getItem("crm_notif_read_ids") || "[]"));
    updatedRead.add(id);
    localStorage.setItem("crm_notif_read_ids", JSON.stringify(Array.from(updatedRead)));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleNotificationClick = (item) => {
    window._lastNotificationClickTime = Date.now();

    let targetUrl = item.targetUrl;

    if (!targetUrl || targetUrl === "/quotation") {
      if (item.quotationId) {
        targetUrl = `/quotation?quotationId=${item.quotationId}`;
      } else if (item.leadId) {
        targetUrl = `/leads?leadId=${item.leadId}`;
      } else if (item.customerId) {
        targetUrl = `/customer?customerId=${item.customerId}`;
      } else if (item.amcId) {
        targetUrl = `/amc?amcId=${item.amcId}`;
      } else if (item.projectId) {
        targetUrl = `/projects?projectId=${item.projectId}`;
      } else if (item.userId || item.userEmail) {
        targetUrl = `/accounts?userId=${item.userId || ""}&email=${encodeURIComponent(item.userEmail || item.email || "")}`;
      } else {
        let extractedName = null;
        if (item.description) {
          const match = item.description.match(/(?:#|for|with|with client|lead|quotation)\s*([A-Za-z0-9_\-]+)/i);
          if (match && match[1] && match[1].trim().length > 0 && match[1].trim().toLowerCase() !== "updated") {
            extractedName = match[1].trim();
          }
        }

        switch (item.type) {
          case "followup":
          case "leads":
            targetUrl = extractedName ? `/leads?leadId=${encodeURIComponent(extractedName)}` : "/leads?highlight=latest";
            break;
          case "quotation":
            targetUrl = extractedName ? `/quotation?quotationId=${encodeURIComponent(extractedName)}` : "/quotation?highlight=latest";
            break;
          case "requests":
            targetUrl = extractedName ? `/accounts?userId=${encodeURIComponent(extractedName)}` : "/accounts?highlight=latest";
            break;
          case "system":
            targetUrl = "/roles";
            break;
          case "customer":
            targetUrl = extractedName ? `/customer?customerId=${encodeURIComponent(extractedName)}` : "/customer?highlight=latest";
            break;
          case "amc":
            targetUrl = extractedName ? `/amc?amcId=${encodeURIComponent(extractedName)}` : "/amc?highlight=latest";
            break;
          case "projects":
            targetUrl = extractedName ? `/projects?projectId=${encodeURIComponent(extractedName)}` : "/projects?highlight=latest";
            break;
          default:
            targetUrl = "/dashboard";
            break;
        }
      }
    }

    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem("crm_notif_read_ids", JSON.stringify(allIds));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id) => {
    const updatedDeleted = new Set(JSON.parse(localStorage.getItem("crm_notif_deleted_ids") || "[]"));
    updatedDeleted.add(id);
    localStorage.setItem("crm_notif_deleted_ids", JSON.stringify(Array.from(updatedDeleted)));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem("crm_notif_deleted_ids", JSON.stringify(Array.from(allIds)));
    localStorage.removeItem("crm_custom_notifs");
    setNotifications([]);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "all") return true;
    return item.type === activeTab;
  });

  return (
    <Base title="">
      <div className="w-full space-y-5 font-sans antialiased text-slate-800 pt-1 sm:pt-2 px-1">

        {/* HEADER WELCOME BANNER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 pt-2">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-10 bg-blue-600 rounded-full block"></span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                  Notification Center
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white shadow-xs">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time activity alerts, password requests, follow-ups, leads & system updates.
              </p>
            </div>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <button
              onClick={fetchDynamicNotifications}
              className={`px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer ${loading ? "opacity-70" : ""
                }`}
            >
              <FontAwesomeIcon icon={faRotateRight} className={loading ? "animate-spin text-blue-600" : ""} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FontAwesomeIcon icon={faCheck} />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3.5 py-1.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-lg hover:bg-rose-100 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FontAwesomeIcon icon={faTrash} />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* SINGLE HORIZONTAL LINE SCROLLABLE TABS */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap thin-scrollbar">
          {[
            { id: "all", label: "All Notifications" },
            { id: "requests", label: "Requests" },
            { id: "followup", label: "Follow-ups" },
            { id: "leads", label: "Lead Alerts" },
            { id: "quotation", label: "Quotations & Versions" },
            { id: "amc", label: "AMC Contracts" },
            { id: "projects", label: "Projects" },
            { id: "accounts", label: "Accounts & Staff" },
            { id: "system", label: "System Updates" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${activeTab === tab.id
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* NOTIFICATIONS GRID / LIST */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-xl text-blue-600" />
              <span>Fetching notification feeds...</span>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 bg-white flex items-start justify-between gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${!item.read
                  ? "border-blue-300 shadow-md shadow-blue-500/10 bg-blue-50/10"
                  : "border-slate-200/90 shadow-sm shadow-slate-200/50 opacity-90 hover:border-slate-300"
                  }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${item.color} shadow-xs shrink-0 mt-0.5`}
                  >
                    <FontAwesomeIcon icon={item.icon || faBell} className="text-base" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${item.bgColor}`}
                      >
                        {item.badge}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.time}
                      </span>
                      {!item.read && (
                        <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                          Unread
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {item.type === "requests" || item.userId ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(item);
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FontAwesomeIcon icon={faKey} className="text-[11px]" />
                      Change Password
                    </button>
                  ) : !item.read ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(item.id);
                      }}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faCheck} className="text-[11px]" />
                      Mark Read
                    </button>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1 text-xs font-medium px-2 py-1">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500" />
                      Read
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove notification"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-16 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 mb-4">
                <FontAwesomeIcon icon={faBell} className="text-3xl" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Notifications</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                You're all caught up! New CRM alerts will appear here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </Base>
  );
}
