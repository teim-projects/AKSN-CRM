import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCalendarCheck,
  faUserPlus,
  faFileInvoice,
  faShieldHalved,
  faCheck,
  faTrash,
  faXmark,
  faCircleCheck,
  faClock,
  faRotateRight,
  faKey,
  faUserShield
} from "@fortawesome/free-solid-svg-icons";

const defaultInitialNotifications = [
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
    userEmail: "rahul@aksn.com",
    userName: "Rahul Sharma",
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
  },
];

export default function NotificationDrawer({ isOpen, onClose, onUnreadCountChange }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(defaultInitialNotifications);
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

      const [leadsRes, followupsRes, quotesRes] = await Promise.all([
        fetch(`${BASE_API}/lead/lead/?limit=100`, { headers }).catch(() => null),
        fetch(`${BASE_API}/lead/lead-followups/?limit=100`, { headers }).catch(() => null),
        fetch(`${BASE_API}/quotation/quotation/?limit=100`, { headers }).catch(() => null),
      ]);

      const leadsData = leadsRes && leadsRes.ok ? await leadsRes.json() : [];
      const followupsData = followupsRes && followupsRes.ok ? await followupsRes.json() : [];
      const quotesData = quotesRes && quotesRes.ok ? await quotesRes.json() : [];

      const leads = Array.isArray(leadsData) ? leadsData : leadsData.results || [];
      const followups = Array.isArray(followupsData) ? followupsData : followupsData.results || [];
      const quotes = Array.isArray(quotesData) ? quotesData : quotesData.results || [];

      const today = getTodayStr();
      const tomorrow = getTomorrowStr();

      const readIds = new Set(JSON.parse(localStorage.getItem("crm_notif_read_ids") || "[]"));
      const deletedIds = new Set(JSON.parse(localStorage.getItem("crm_notif_deleted_ids") || "[]"));
      const customNotifs = JSON.parse(localStorage.getItem("crm_custom_notifs") || "[]");

      const generated = [];

      // 1. FOLLOW-UP NOTIFICATIONS
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

      // 2. NEW LEADS NOTIFICATIONS
      const sortedLeads = [...leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      sortedLeads.slice(0, 5).forEach((lead) => {
        const id = `lead_new_${lead.id}`;
        if (!deletedIds.has(id)) {
          const name = lead.company_name || lead.contact_person || "New Lead";
          const source = lead.lead_source ? `via ${lead.lead_source.replace(/_/g, ' ')}` : "";
          generated.push({
            id,
            title: "New Enquiry / Lead Added",
            description: `New lead added: ${name} ${source}.`,
            type: "leads",
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

      // 3. QUOTATIONS NOTIFICATIONS
      const sortedQuotes = [...quotes].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      sortedQuotes.slice(0, 5).forEach((q) => {
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

      // 4. CUSTOM DISPATCHED NOTIFICATIONS (Password Requests, System Alerts)
      customNotifs.forEach((cn) => {
        if (!deletedIds.has(cn.id)) {
          generated.push({
            ...cn,
            icon: cn.type === "requests" ? faKey : cn.type === "system" ? faShieldHalved : cn.type === "leads" ? faUserPlus : faBell,
            color: cn.type === "requests" ? "from-amber-500 to-orange-600" : cn.color || "from-purple-500 to-indigo-600",
            bgColor: cn.type === "requests" ? "bg-amber-50 text-amber-600 border-amber-100" : cn.bgColor || "bg-purple-50 text-purple-600 border-purple-100",
            read: readIds.has(cn.id),
          });
        }
      });      // Attach numerical timestamp for sorting (latest first)
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
        : defaultInitialNotifications.filter((n) => !deletedIds.has(n.id)).map(n => ({ ...n, read: readIds.has(n.id) }));

      finalNotifs.sort((a, b) => parseTimestamp(b) - parseTimestamp(a));

      setNotifications(finalNotifs);

    } catch (err) {
      console.error("Error generating dynamic notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [BASE_API]);

  useEffect(() => {
    fetchDynamicNotifications();
  }, [fetchDynamicNotifications]);

  // Listen to custom window events
  useEffect(() => {
    const handleNewNotificationEvent = (e) => {
      if (e.detail) {
        const newNotif = {
          id: `custom_${Date.now()}`,
          timestamp: Date.now(),
          title: e.detail.title || "System Alert",
          description: e.detail.description || "Notification update",
          type: e.detail.type || "system",
          time: "Just now",
          read: false,
          priority: e.detail.priority || "normal",
          badge: e.detail.badge || "System",
          userId: e.detail.userId,
          userEmail: e.detail.userEmail || e.detail.email,
          userName: e.detail.userName,
          color: e.detail.type === "requests" ? "from-amber-500 to-orange-600" : e.detail.color || "from-purple-500 to-indigo-600",
          bgColor: e.detail.type === "requests" ? "bg-amber-50 text-amber-600 border-amber-100" : e.detail.bgColor || "bg-purple-50 text-purple-600 border-purple-100",
        };

        const existingCustom = JSON.parse(localStorage.getItem("crm_custom_notifs") || "[]");
        localStorage.setItem("crm_custom_notifs", JSON.stringify([newNotif, ...existingCustom]));

        fetchDynamicNotifications();
      }
    };

    window.addEventListener("newNotification", handleNewNotificationEvent);
    return () => window.removeEventListener("newNotification", handleNewNotificationEvent);
  }, [fetchDynamicNotifications]);

  // Always sync unread count to parent component (Sidebar / Navbar)
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    if (onUnreadCountChange) {
      onUnreadCountChange(count);
    }
  }, [notifications, onUnreadCountChange]);

  const handleMarkAsRead = (id) => {
    const updatedRead = new Set(JSON.parse(localStorage.getItem("crm_notif_read_ids") || "[]"));
    updatedRead.add(id);
    localStorage.setItem("crm_notif_read_ids", JSON.stringify(Array.from(updatedRead)));

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isOpen) return null;

  return (
    <>
      {/* GLASSMORPHISM BACKDROP OVERLAY */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[999] transition-opacity duration-300"
      />

      {/* RIGHT SIDE DRAWER PANEL */}
      <aside
        aria-label="Notifications"
        className="fixed top-0 right-0 h-screen w-full sm:w-[420px] bg-white shadow-2xl z-[1000] flex flex-col transform transition-transform duration-300 ease-out font-sans border-l border-slate-800/40"
      >
        {/* DARK NAVY HEADER BLOCK MATCHING EXACT IMAGE COLOR (#12192c) */}
        <div className="pt-5 px-5 pb-0 bg-[#12192c] text-white relative flex-shrink-0 border-b border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                <FontAwesomeIcon icon={faBell} className="text-base animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-white">
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white shadow-xs shadow-blue-600/40">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Real-time CRM alerts & updates
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchDynamicNotifications}
                className={`w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ${
                  loading ? "animate-spin text-blue-400" : ""
                }`}
                title="Refresh notifications"
              >
                <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close notifications"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>
          </div>

          {/* SINGLE HORIZONTAL LINE SCROLLABLE TABS STICKING EXACTLY AT BLUE/WHITE DIVISION */}
          <div className="flex items-center gap-1.5 mt-4 pt-1 overflow-x-auto whitespace-nowrap thin-scrollbar mb-0 pb-1.5">
            {[
              { id: "all", label: "All" },
              { id: "requests", label: "Requests" },
              { id: "followup", label: "Follow-ups" },
              { id: "leads", label: "Leads" },
              { id: "quotation", label: "Quotations" },
              { id: "system", label: "System" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-[#1c2640] text-slate-400 hover:bg-[#253254] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SCROLLABLE MAIN CONTAINER TOUCHING DARK BLUE HEADER */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {/* SUB-HEADER: CONTROL BAR PASSING BESIDE VERTICAL SCROLLBAR */}
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-2.5 flex items-center justify-between text-xs text-slate-500 sticky top-0 z-10 shadow-xs">
            <span className="font-medium text-slate-600 text-[11px]">
              Showing {filteredNotifications.length} notification
              {filteredNotifications.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-slate-400 hover:text-rose-600 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* NOTIFICATIONS LIST CARDS */}
          <div className="p-4 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-lg text-blue-600" />
              <span>Fetching live notifications...</span>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border-2 transition-all duration-200 relative group bg-white ${
                  !item.read
                    ? "border-blue-300 shadow-md shadow-blue-500/10 hover:border-blue-400"
                    : "border-slate-200/90 shadow-sm shadow-slate-200/50 hover:border-slate-300 opacity-90"
                }`}
              >
                {!item.read && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-100 animate-pulse"></span>
                )}

                <div className="flex items-start gap-3">
                  {/* ICON WITH GRADIENT BACKGROUND */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${item.color} shadow-xs shrink-0 mt-0.5`}
                  >
                    <FontAwesomeIcon icon={item.icon || faBell} className="text-sm" />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${item.bgColor}`}
                      >
                        {item.badge}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.time}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {item.description}
                    </p>

                    {/* ACTION ROW */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
                      {item.type === "requests" || item.userId ? (
                        <button
                          onClick={() => {
                            handleMarkAsRead(item.id);
                            onClose && onClose();
                            navigate(
                              `/accounts?userId=${item.userId || ""}&email=${encodeURIComponent(item.userEmail || item.email || "")}`
                            );
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faKey} className="text-[10px]" />
                          Change Password
                        </button>
                      ) : !item.read ? (
                        <button
                          onClick={() => handleMarkAsRead(item.id)}
                          className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                          Mark as read
                        </button>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                          <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500" />
                          Read
                        </span>
                      )}

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                        title="Remove notification"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 mb-3">
                <FontAwesomeIcon icon={faBell} className="text-2xl" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No Notifications</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                You're all caught up! New CRM alerts will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
