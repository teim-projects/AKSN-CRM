import React, { useState, useMemo } from "react";
import {
  MdChevronLeft,
  MdChevronRight,
  MdToday,
  MdClose,
  MdOutlineRemoveRedEye,
  MdAutorenew,
  MdEvent,
  MdWarningAmber,
  MdSchedule,
  MdCancel,
  MdZoomIn,
  MdSearch,
  MdCalendarViewMonth,
  MdViewAgenda,
  MdBusiness,
  MdPerson,
  MdDateRange,
  MdAttachMoney,
} from "react-icons/md";

export default function AMCCalendarView({
  contracts = [],
  onViewRecord,
  onViewDetails,
  onRenewRecord,
  formatDate = (d) => d,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'expiring', 'expired', 'scheduled'
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarMode, setCalendarMode] = useState("grid"); // 'grid' | 'agenda'

  const todayStr = useMemo(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  // Format YYYY-MM-DD
  const formatYMD = (year, month, day) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  // Build events map from contracts (Strictly deduplicated per contract per date)
  const dateEventsMap = useMemo(() => {
    const map = {};

    const addEvent = (dateKey, eventObj) => {
      if (!dateKey || typeof dateKey !== "string") return;
      const cleanKey = dateKey.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanKey)) return;

      if (!map[cleanKey]) map[cleanKey] = [];

      // Avoid adding duplicate event for the same contract on the same date
      const exists = map[cleanKey].some(
        (e) => String(e.contract.id) === String(eventObj.contract.id)
      );
      if (!exists) {
        map[cleanKey].push(eventObj);
      }
    };

    (contracts || []).forEach((c) => {
      if (!c || c.status === "inactive") return;

      const custName =
        c.customer_name ||
        c.customer_details?.company_name ||
        c.customer_details?.name ||
        (typeof c.customer === "string" ? c.customer : "Customer");

      // 1. AMC Expiring / Expired on end_date
      if (c.end_date) {
        const isPast = c.end_date < todayStr;
        const type = isPast ? "expired" : "expiring";
        addEvent(c.end_date, {
          type,
          label: isPast ? "Expired" : "Expiring",
          contract: c,
          date: c.end_date,
          customerName: custName,
          contractId: c.contract_id || `#${c.id}`,
        });
      }

      // 2. AMC Scheduled on start_date (ONLY if scheduled for a future date from today)
      // When that date arrives or passes, it automatically disappears from scheduled
      if (c.start_date && c.start_date > todayStr) {
        addEvent(c.start_date, {
          type: "scheduled",
          label: "Scheduled",
          contract: c,
          date: c.start_date,
          customerName: custName,
          contractId: c.contract_id || `#${c.id}`,
        });
      }

      // 3. Also check any upcoming renewal cycles scheduled for a later date
      if (Array.isArray(c.cycles)) {
        c.cycles.forEach((cycle) => {
          if (cycle.start_date && cycle.start_date > todayStr) {
            addEvent(cycle.start_date, {
              type: "scheduled",
              label: "Scheduled",
              contract: c,
              date: cycle.start_date,
              customerName: custName,
              contractId: c.contract_id || `#${c.id}`,
            });
          }
        });
      }
    });

    return map;
  }, [contracts, todayStr]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateKey = formatYMD(prevYear, prevMonth, d);
      days.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: false,
        events: dateEventsMap[dateKey] || [],
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateKey = formatYMD(currentYear, currentMonth, d);
      days.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        events: dateEventsMap[dateKey] || [],
      });
    }

    // Trailing days from next month to complete standard 35 or 42 grid
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateKey = formatYMD(nextYear, nextMonth, d);
      days.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: false,
        events: dateEventsMap[dateKey] || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, dateEventsMap, todayStr]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleMonthChange = (e) => {
    setCurrentDate(new Date(currentYear, parseInt(e.target.value, 10), 1));
  };

  const handleYearChange = (e) => {
    setCurrentDate(new Date(parseInt(e.target.value, 10), currentMonth, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Monthly summary stats & total value calculations
  const monthlyStats = useMemo(() => {
    let expiring = 0;
    let expired = 0;
    let scheduled = 0;
    let expiringValue = 0;

    calendarDays.forEach((day) => {
      if (day.isCurrentMonth && day.events.length > 0) {
        day.events.forEach((e) => {
          if (e.type === "expiring") {
            expiring++;
            expiringValue += parseFloat(e.contract?.annual_value || 0);
          } else if (e.type === "expired") {
            expired++;
          } else if (e.type === "scheduled") {
            scheduled++;
          }
        });
      }
    });

    return {
      expiring,
      expired,
      scheduled,
      total: expiring + expired + scheduled,
      expiringValue,
    };
  }, [calendarDays]);

  // Filter helper for events by search query & status
  const matchesSearch = (event) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const c = event.contract;
    const cname = (event.customerName || "").toLowerCase();
    const cid = (event.contractId || "").toLowerCase();
    const prod = (c.product || "").toLowerCase();
    const pcode = (c.project_details?.project_code || c.project_code || "").toLowerCase();
    return cname.includes(q) || cid.includes(q) || prod.includes(q) || pcode.includes(q);
  };

  // Selected date events for popup
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    let list = dateEventsMap[selectedDate] || [];
    if (statusFilter !== "all") {
      list = list.filter((e) => e.type === statusFilter);
    }
    if (searchQuery.trim()) {
      list = list.filter(matchesSearch);
    }
    return list;
  }, [selectedDate, dateEventsMap, statusFilter, searchQuery]);

  // Agenda events: all events in current month sorted by date
  const agendaEvents = useMemo(() => {
    const list = [];
    calendarDays.forEach((day) => {
      if (day.isCurrentMonth && day.events.length > 0) {
        day.events.forEach((e) => {
          if (statusFilter === "all" || e.type === statusFilter) {
            if (matchesSearch(e)) {
              list.push({ ...e, dayNumber: day.dayNumber, dateKey: day.dateKey });
            }
          }
        });
      }
    });
    return list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [calendarDays, statusFilter, searchQuery]);

  // Helper to format modal date nicely
  const formatDisplayDate = (ymdStr) => {
    if (!ymdStr) return "";
    try {
      const [y, m, d] = ymdStr.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return ymdStr;
    }
  };

  // Get Avatar Initials
  const getInitials = (name) => {
    if (!name) return "A";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Year options for dropdown: 3 years back to 3 years forward
  const currentActualYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentActualYear - 3; y <= currentActualYear + 4; y++) {
    yearOptions.push(y);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-200">
      {/* 1. TOP HEADER & NAVIGATION TOOLBAR */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Month / Year Navigator */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-500/20 flex items-center justify-center">
              <MdEvent className="text-xl" />
            </div>

            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={currentMonth}
                onChange={handleMonthChange}
                aria-label="Select month"
                className="font-bold text-base sm:text-lg text-slate-900 bg-transparent border-none hover:bg-slate-100/80 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={currentYear}
                onChange={handleYearChange}
                aria-label="Select year"
                className="font-bold text-base sm:text-lg text-slate-600 bg-transparent border-none hover:bg-slate-100/80 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Prev / Next & Today Navigation */}
            <div className="flex items-center gap-1 ml-auto sm:ml-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Previous Month"
              >
                <MdChevronLeft className="text-xl" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                title="Jump to Current Month"
              >
                <MdToday className="text-sm text-blue-600" />
                <span>Today</span>
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Next Month"
              >
                <MdChevronRight className="text-xl" />
              </button>
            </div>
          </div>

          {/* Right Toolbar: Search & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Inline Search Bar */}
            <div className="relative flex-1 sm:w-60">
              <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client, contract ID..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all text-slate-800 placeholder-slate-400 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <MdClose className="text-xs" />
                </button>
              )}
            </div>

            {/* Mode Switch: Month Grid vs Agenda List */}
            <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setCalendarMode("grid")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  calendarMode === "grid"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Grid View"
              >
                <MdCalendarViewMonth className="text-sm" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setCalendarMode("agenda")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  calendarMode === "agenda"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Agenda List View"
              >
                <MdViewAgenda className="text-sm" />
                <span>Agenda</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. MONTH AT A GLANCE MINI-KPI & FILTER PILLS */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase tracking-wider">
              Filter:
            </span>

            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              All Events ({monthlyStats.total})
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "expiring" ? "all" : "expiring")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusFilter === "expiring"
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs font-bold"
                  : "bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === "expiring" ? "bg-white" : "bg-amber-500"}`}></span>
              <span>Expiring ({monthlyStats.expiring})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusFilter === "expired"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs font-bold"
                  : "bg-rose-50/80 text-rose-800 border-rose-200/80 hover:bg-rose-100"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === "expired" ? "bg-white" : "bg-rose-500"}`}></span>
              <span>Expired ({monthlyStats.expired})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "scheduled" ? "all" : "scheduled")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                statusFilter === "scheduled"
                  ? "bg-sky-600 text-white border-sky-600 shadow-xs font-bold"
                  : "bg-sky-50/80 text-sky-800 border-sky-200/80 hover:bg-sky-100"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === "scheduled" ? "bg-white" : "bg-sky-500"}`}></span>
              <span>Scheduled ({monthlyStats.scheduled})</span>
            </button>
          </div>

          {/* Quick Value Badge */}
          {monthlyStats.expiring > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200/70">
              <MdWarningAmber className="text-amber-600 text-sm" />
              <span>
                Expiring Value: <strong className="font-bold">₹{monthlyStats.expiringValue.toLocaleString("en-IN")}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. CALENDAR CONTENT: GRID MODE OR AGENDA MODE */}
      {calendarMode === "grid" ? (
        <div>
          {/* WEEKDAY HEADER (SUN - SAT) */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
            {weekDays.map((w, idx) => (
              <div
                key={idx}
                className={`py-3 px-1 border-r last:border-r-0 border-slate-200 ${
                  idx === 0 || idx === 6 ? "bg-slate-200/40 text-slate-400" : ""
                }`}
              >
                <span>{w}</span>
              </div>
            ))}
          </div>

          {/* CALENDAR DAYS 7-COLUMN GRID */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/30">
            {calendarDays.map((day, idx) => {
              const dayEvents =
                statusFilter === "all"
                  ? day.events
                  : day.events.filter((e) => e.type === statusFilter);

              const visibleEvents = dayEvents.filter(matchesSearch);
              const hasEvents = visibleEvents.length > 0;
              const isWeekend = idx % 7 === 0 || idx % 7 === 6;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (hasEvents || day.isCurrentMonth) {
                      setSelectedDate(day.dateKey);
                    }
                  }}
                  className={`min-h-[110px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col transition-all cursor-pointer relative group ${
                    day.isCurrentMonth
                      ? isWeekend
                        ? "bg-slate-50/40 hover:bg-blue-50/40"
                        : "bg-white hover:bg-blue-50/40"
                      : "bg-slate-100/30 text-slate-300 hover:bg-slate-100/60"
                  } ${
                    day.isToday
                      ? "ring-2 ring-inset ring-blue-500 bg-blue-50/25 shadow-inner"
                      : ""
                  } ${
                    selectedDate === day.dateKey
                      ? "!bg-blue-50/90 ring-2 ring-blue-600 z-10 shadow-md"
                      : ""
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs font-semibold inline-flex items-center justify-center rounded-full transition-all ${
                          day.isToday
                            ? "w-6 h-6 bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30 ring-2 ring-blue-300"
                            : day.isCurrentMonth
                            ? "text-slate-700 w-6 h-6 group-hover:text-blue-600"
                            : "text-slate-400 w-6 h-6"
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      {day.isToday && (
                        <span className="hidden sm:inline-block text-[9px] font-bold text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Today
                        </span>
                      )}
                    </div>

                    {hasEvents && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {visibleEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events List (Small Badges Written Directly on the Date) */}
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {visibleEvents.slice(0, 2).map((ev, evIdx) => {
                      let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                      let dotColor = "bg-slate-400";
                      let iconEmoji = "📄";
                      let prefix = ev.label;

                      if (ev.type === "expiring") {
                        badgeStyle =
                          "bg-amber-50 text-amber-900 border-amber-200/90 hover:bg-amber-100 shadow-2xs";
                        dotColor = "bg-amber-500";
                        iconEmoji = "⏳";
                      } else if (ev.type === "expired") {
                        badgeStyle =
                          "bg-rose-50 text-rose-900 border-rose-200/90 hover:bg-rose-100 shadow-2xs";
                        dotColor = "bg-rose-500";
                        iconEmoji = "✕";
                      } else if (ev.type === "scheduled") {
                        badgeStyle =
                          "bg-sky-50 text-sky-900 border-sky-200/90 hover:bg-sky-100 shadow-2xs";
                        dotColor = "bg-sky-500";
                        iconEmoji = "📅";
                      }

                      return (
                        <div
                          key={evIdx}
                          className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-md border transition-all flex items-center gap-1 truncate ${badgeStyle}`}
                          title={`${prefix}: ${ev.customerName} (${ev.contractId})`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}></span>
                          <span className="font-bold text-[9px]">{iconEmoji} {prefix}:</span>
                          <span className="truncate font-medium">{ev.customerName}</span>
                        </div>
                      );
                    })}

                    {visibleEvents.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-500 hover:text-blue-600 pl-1 mt-auto flex items-center gap-0.5">
                        <span>+{visibleEvents.length - 2} more</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* AGENDA LIST VIEW MODE */
        <div className="p-4 sm:p-6 divide-y divide-slate-100">
          {agendaEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MdEvent className="text-4xl mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No AMC events found for this period.</p>
              <p className="text-xs text-slate-400 mt-1">
                Try resetting your search query or status filter.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {agendaEvents.map((ev, idx) => {
                const c = ev.contract;
                const isExpiring = ev.type === "expiring";
                const isExpired = ev.type === "expired";
                const isScheduled = ev.type === "scheduled";

                let pillColor = "bg-slate-100 text-slate-700 border-slate-200";
                let icon = <MdEvent />;
                if (isExpiring) {
                  pillColor = "bg-amber-50 text-amber-800 border-amber-200";
                  icon = <MdWarningAmber className="text-amber-600" />;
                } else if (isExpired) {
                  pillColor = "bg-rose-50 text-rose-800 border-rose-200";
                  icon = <MdCancel className="text-rose-600" />;
                } else if (isScheduled) {
                  pillColor = "bg-sky-50 text-sky-800 border-sky-200";
                  icon = <MdSchedule className="text-sky-600" />;
                }

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 bg-white hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      {/* Date Badge */}
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold flex-shrink-0">
                        <span className="text-base leading-none">{ev.dayNumber}</span>
                        <span className="text-[9px] uppercase font-semibold text-blue-500">
                          {monthNames[currentMonth].slice(0, 3)}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">{ev.customerName}</h4>
                          <span className="font-mono text-xs text-blue-600 font-semibold px-2 py-0.5 bg-blue-50 rounded">
                            {ev.contractId}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${pillColor}`}>
                            {icon}
                            <span>{ev.label}</span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          Product: <span className="font-medium text-slate-700">{c.product || "-"}</span> ·
                          Period: <span className="font-medium text-slate-700">{formatDate(c.start_date)} to {formatDate(c.end_date)}</span> ·
                          Value: <span className="font-bold text-emerald-600">₹{parseFloat(c.annual_value || 0).toLocaleString("en-IN")}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => setSelectedDate(ev.dateKey)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        View Event
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. INTERACTIVE DATE POPUP MODAL */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                  <MdDateRange className="text-xl" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {formatDisplayDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedDateEvents.length} AMC event{selectedDateEvents.length !== 1 ? "s" : ""} on this date
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <MdClose className="text-lg" />
              </button>
            </div>

            {/* Modal Body: Events List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3.5 slim-scrollbar">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <MdEvent className="text-4xl mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    No AMC contracts expiring, expired, or scheduled on this date.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    All contracts on this day are in good standing.
                  </p>
                </div>
              ) : (
                selectedDateEvents.map((ev, idx) => {
                  const c = ev.contract;
                  const isExpiring = ev.type === "expiring";
                  const isExpired = ev.type === "expired";
                  const isScheduled = ev.type === "scheduled";

                  let headerBadge = "bg-slate-100 text-slate-700 border-slate-200";
                  let cardBorder = "border-slate-200";
                  let statusTitle = "Expiring Soon";
                  let statusIcon = <MdWarningAmber className="text-amber-600 text-base" />;
                  let avatarGradient = "from-slate-600 to-slate-800";

                  if (isExpiring) {
                    headerBadge = "bg-amber-50 text-amber-900 border-amber-200 shadow-2xs";
                    cardBorder = "border-amber-300/80 ring-1 ring-amber-200/40";
                    statusTitle = "Expiring on this date";
                    statusIcon = <MdWarningAmber className="text-amber-600 text-base" />;
                    avatarGradient = "from-amber-500 to-orange-600";
                  } else if (isExpired) {
                    headerBadge = "bg-rose-50 text-rose-900 border-rose-200 shadow-2xs";
                    cardBorder = "border-rose-300/80 ring-1 ring-rose-200/40";
                    statusTitle = "Expired on this date";
                    statusIcon = <MdCancel className="text-rose-600 text-base" />;
                    avatarGradient = "from-rose-500 to-red-600";
                  } else if (isScheduled) {
                    headerBadge = "bg-sky-50 text-sky-900 border-sky-200 shadow-2xs";
                    cardBorder = "border-sky-300/80 ring-1 ring-sky-200/40";
                    statusTitle = "Scheduled to start on this date";
                    statusIcon = <MdSchedule className="text-sky-600 text-base" />;
                    avatarGradient = "from-sky-500 to-blue-600";
                  }

                  const custName =
                    c.customer_name ||
                    c.customer_details?.company_name ||
                    c.customer_details?.name ||
                    "Customer";

                  const projCode = c.project_details?.project_code || c.project_code || "-";
                  const annualVal = parseFloat(c.annual_value || 0).toLocaleString("en-IN");

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-4 bg-white transition-all shadow-xs ${cardBorder}`}
                    >
                      {/* Top Row: Customer & Badge */}
                      <div className="flex items-start justify-between gap-2.5 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          {/* Client Initials Avatar */}
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient} text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0`}
                          >
                            {getInitials(custName)}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900">
                                {custName}
                              </h4>
                              <span className="font-mono text-xs text-blue-600 font-semibold px-2 py-0.5 bg-blue-50 rounded">
                                {c.contract_id || `#${c.id}`}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Project: <span className="font-mono font-medium text-slate-700">{projCode}</span> · Product:{" "}
                              <span className="font-medium text-slate-700">{c.product || "-"}</span>
                            </p>
                          </div>
                        </div>

                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 flex-shrink-0 ${headerBadge}`}>
                          {statusIcon}
                          <span className="uppercase tracking-wider">{statusTitle}</span>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-3 text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                            Contract Period
                          </span>
                          <span className="font-semibold text-slate-800">
                            {formatDate(c.start_date)} to {formatDate(c.end_date)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                            Annual Value
                          </span>
                          <span className="font-bold text-emerald-600 text-sm">
                            ₹{annualVal}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                            Coordinator
                          </span>
                          <span className="font-medium text-slate-700 truncate block">
                            {c.support_coordinator_name || "Unassigned"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100 flex-wrap">
                        {onViewRecord && (
                          <button
                            onClick={() => {
                              setSelectedDate(null);
                              onViewRecord(c);
                            }}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <MdZoomIn className="text-sm" />
                            <span>View Full Record</span>
                          </button>
                        )}

                        {onViewDetails && (
                          <button
                            onClick={() => {
                              setSelectedDate(null);
                              onViewDetails(c);
                            }}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <MdOutlineRemoveRedEye className="text-sm" />
                            <span>View Details</span>
                          </button>
                        )}

                        {(isExpiring || isExpired) && onRenewRecord && (
                          <button
                            onClick={() => {
                              setSelectedDate(null);
                              onRenewRecord(c);
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-xs shadow-emerald-600/20"
                          >
                            <MdAutorenew className="text-sm" />
                            <span>Renew Contract</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
