import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleUser,
  faBars,
  faBell,
  faSearch,
  faSignOutAlt,
  faTimes,
  faArrowLeft
} from "@fortawesome/free-solid-svg-icons";
import { useUserRole } from "../hooks/useAuth";
import NotificationDrawer from "./NotificationDrawer";

// ✅ NEW: Terms & Conditions Icon
function TermsIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none">
    <path d="M4 4h16v16H4V4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 8h8M8 12h6M8 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

// ✅ NEW: Role Management Shield Icon
function ShieldIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ✅ NEW: Project Icon
function ProjectIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ✅ NEW: AMC Icon
function AmcIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const allSidebarItems = [
  { key: "home", label: "Dashboard", icon: HomeIcon, path: "/dashboard", section: "OVERVIEW" },

  // SALES (Pre-Sales & Deal Pipeline)
  { key: "leads", label: "Lead Management", icon: TargetIcon, path: "/leads", section: "SALES" },
  { key: "followups", label: "Follow-up Management", icon: FollowUpIcon, path: "/follow-up", section: "SALES" },
  { key: "quotes", label: "Quotations", icon: QuoteIcon, path: "/quotation", section: "SALES" },

  // OPERATIONS (Post-Sales Delivery & Service)
  { key: "contacts", label: "Customers", icon: UserIcon, path: "/customer", section: "OPERATIONS" },
  { key: "projects", label: "Project Management", icon: ProjectIcon, path: "/projects", section: "OPERATIONS" },
  { key: "amc", label: "AMC Contracts", icon: AmcIcon, path: "/amc", section: "OPERATIONS" },

  // MASTER DATA (Catalog & Master Configurations)
  { key: "products", label: "Product Master", icon: BoxIcon, path: "/products", section: "MASTER DATA" },
  { key: "terms", label: "Terms & Conditions", icon: TermsIcon, path: "/terms", section: "MASTER DATA" },

  // ADMINISTRATION (System & Role Management)
  { key: "accounts", label: "Accounts", icon: BuildingIcon, path: "/accounts", section: "ADMINISTRATION" },
  { key: "roles", label: "Role Management", icon: ShieldIcon, path: "/roles", section: "ADMINISTRATION" },
];

export default function Sidebar({ children }) {
  const [isOpen, setIsOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState({});
  const location = useLocation();
  const currentPath = location.pathname;

  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const { userRole, isLoading: loadingRole, hasPermission } = useUserRole(baseApi);

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [currentPath]);

  // Handle window resize gracefully
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Real-time unread notification counter sync
  const updateNotifCount = useCallback(() => {
    const readIds = new Set(JSON.parse(localStorage.getItem("crm_notif_read_ids") || "[]"));
    const deletedIds = new Set(JSON.parse(localStorage.getItem("crm_notif_deleted_ids") || "[]"));
    const customNotifs = JSON.parse(localStorage.getItem("crm_custom_notifs") || "[]");

    const token = localStorage.getItem("access") || localStorage.getItem("access_token") || "";
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${baseApi}/lead/lead/?limit=100`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const leads = Array.isArray(data) ? data : data.results || [];
        const today = new Date().toISOString().split("T")[0];
        let count = 0;

        leads.forEach((l) => {
          if (l.followup_date && l.followup_date <= today && !["close_win", "close_loss", "closed"].includes(l.status)) {
            const id = l.followup_date < today ? `f_overdue_${l.id}_${l.followup_date}` : `f_today_${l.id}_${today}`;
            if (!deletedIds.has(id) && !readIds.has(id)) count++;
          }
          const leadId = `lead_new_${l.id}`;
          if (!deletedIds.has(leadId) && !readIds.has(leadId)) count++;
        });

        customNotifs.forEach((cn) => {
          if (!deletedIds.has(cn.id) && !readIds.has(cn.id)) count++;
        });

        setUnreadNotifCount(count);
      })
      .catch(() => {
        const unreadCustom = customNotifs.filter((cn) => !readIds.has(cn.id) && !deletedIds.has(cn.id)).length;
        setUnreadNotifCount(unreadCustom);
      });
  }, [baseApi]);

  useEffect(() => {
    updateNotifCount();
    window.addEventListener("crm_notification_updated", updateNotifCount);
    window.addEventListener("storage", updateNotifCount);
    return () => {
      window.removeEventListener("crm_notification_updated", updateNotifCount);
      window.removeEventListener("storage", updateNotifCount);
    };
  }, [updateNotifCount]);

  const toggleSection = (sectionName) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const filteredItems = React.useMemo(() => {
    if (loadingRole) return [];

    const keyToModuleMap = {
      home: "dashboard",
      leads: "leads",
      followups: "followups",
      quotes: "quotations",
      products: "products",
      contacts: "customers",
      projects: "projects",
      amc: "amc",
      terms: "terms",
      accounts: "accounts",
      roles: "roles",
    };

    return allSidebarItems.filter((item) => {
      const moduleKey = keyToModuleMap[item.key] || item.key;
      return hasPermission(moduleKey, "view");
    });
  }, [loadingRole, hasPermission]);

  const getPageTitle = () => {
    const currentItem = allSidebarItems.find(item => isActive(item.path, currentPath));
    return currentItem ? currentItem.label : "Executive Dashboard";
  };

  const sections = ["OVERVIEW", "SALES", "OPERATIONS", "MASTER DATA", "ADMINISTRATION"];

  return (
    <div className="h-screen h-[100dvh] bg-[#12192c] flex flex-row font-sans antialiased relative w-full overflow-hidden">

      {/* MOBILE BACKDROP OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`bg-[#12192c] text-slate-300 h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out fixed lg:relative inset-y-0 left-0 z-50 ${
          isOpen
            ? "w-64 translate-x-0 opacity-100 shadow-2xl lg:shadow-none"
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/60 min-w-[256px]">
          <button
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-xl bg-blue-600 flex flex-col items-center justify-center gap-1 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors cursor-pointer"
            title="Close Sidebar"
          >
            <span className="block w-4 h-0.5 bg-white rounded-full"></span>
            <span className="block w-4 h-0.5 bg-white rounded-full"></span>
            <span className="block w-4 h-0.5 bg-white rounded-full"></span>
          </button>

          <Link to="/dashboard" className="text-base font-bold text-white tracking-wide">
            AKSN CRM
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto min-w-[256px]">
          {sections.map(section => {
            const sectionItems = filteredItems.filter(item => item.section === section);
            if (sectionItems.length === 0) return null;
            const isCollapsed = Boolean(collapsedSections[section]);

            return (
              <div key={section} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold tracking-wider text-slate-500 hover:text-slate-300 uppercase transition-colors cursor-pointer"
                >
                  <span>{section}</span>
                  <span className="text-[9px] text-slate-600">
                    {isCollapsed ? "►" : "▼"}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1 pt-0.5">
                    {sectionItems.map((it) => (
                      <SidebarItem
                        key={it.key}
                        item={it}
                        active={isActive(it.path, currentPath)}
                        onNavigate={() => {
                          if (typeof window !== "undefined" && window.innerWidth < 1024) {
                            setIsOpen(false);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* RIGHT SIDE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden bg-[#f4f5f9]">

        {/* NAVBAR */}
        <Navbar
          onMenuClick={() => setIsOpen((prev) => !prev)}
          pageTitle={getPageTitle()}
          isSidebarOpen={isOpen}
          onNotificationClick={() => setIsNotificationOpen(true)}
          unreadCount={unreadNotifCount}
          modules={filteredItems}
        />

        <main className="flex-1 p-3 sm:p-5 md:p-6 w-full bg-[#f4f5f9] overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* NOTIFICATION DRAWER - SLIDES IN FROM RIGHT */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onUnreadCountChange={setUnreadNotifCount}
      />
    </div>
  );
}

const Navbar = ({ onMenuClick, pageTitle, isSidebarOpen, onNotificationClick, unreadCount, modules = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const handleLogout = useCallback(() => {
    window.dispatchEvent(new Event("authChange"));
    setIsAuthenticated(false);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login", { replace: true });
  }, [navigate]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("access");
    if (!token) return setIsAuthenticated(false);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/auth/dj-rest-auth/user/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      res.ok ? setIsAuthenticated(true) : handleLogout();
    } catch {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    const publicPaths = ["/login", "/register"];
    if (!publicPaths.includes(location.pathname)) {
      checkAuth();
    } else {
      setIsAuthenticated(false);
    }
  }, [location, checkAuth]);

  // Click outside listener for search suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter modules based on search query
  const suggestions = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.section.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query)
    );
  }, [searchQuery, modules]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(suggestions.length > 0 ? 0 : -1);
  }, [suggestions]);

  const handleSelectModule = (item) => {
    if (!item || !item.path) return;
    navigate(item.path);
    setSearchQuery("");
    setIsDropdownOpen(false);
    setIsMobileSearchOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectModule(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        handleSelectModule(suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 flex-shrink-0 sticky top-0 z-30 w-full px-4 sm:px-6 py-3 flex items-center justify-between shadow-md shadow-gray-200/40">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className={`w-9 h-9 rounded-xl bg-blue-600 flex flex-col items-center justify-center gap-1 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors mr-1 cursor-pointer ${
            isSidebarOpen ? "lg:hidden" : "block"
          }`}
          title="Toggle Sidebar"
        >
          <span className="block w-4 h-0.5 bg-white rounded-full"></span>
          <span className="block w-4 h-0.5 bg-white rounded-full"></span>
          <span className="block w-4 h-0.5 bg-white rounded-full"></span>
        </button>

        <button
          onClick={handleGoBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200/80 text-xs font-semibold transition-all duration-150 shadow-xs cursor-pointer active:scale-95"
          title="Go back to previous page"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs text-slate-500" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex flex-col">
          <h1 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
            {pageTitle === "Dashboard" ? "Executive Dashboard" : pageTitle}
          </h1>
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium hidden sm:block">
            Real-time business overview
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* DESKTOP SEARCH BAR */}
        <div ref={searchRef} className="relative hidden md:block">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="w-52 lg:w-72 px-3 py-1.5 pl-9 pr-8 rounded-lg border border-gray-200/80 
                bg-gray-50/50 text-gray-800 text-xs font-medium
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                transition-all duration-200"
            />
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[11px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedIndex(-1);
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>

          {/* SUGGESTIONS DROPDOWN */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden py-2 animate-in fade-in duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  {searchQuery.trim() ? "Search Results" : "Quick Module Access"}
                </span>
                <span className="text-[9px] text-slate-400">Press ↑↓ to navigate</span>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {suggestions.length > 0 ? (
                  suggestions.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleSelectModule(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/90 text-blue-900 font-semibold border-l-4 border-blue-600 pl-2.5"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                              isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                          </span>
                          <div className="flex flex-col min-w-0 truncate">
                            <span className="text-xs font-medium leading-snug truncate">
                              {item.label}
                            </span>
                            <span className="text-[9px] text-slate-400 font-normal">
                              {item.path}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0 ml-2 ${
                            isSelected
                              ? "bg-blue-200/60 text-blue-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.section}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-slate-400 text-xs">
                    No modules found matching &ldquo;<span className="font-semibold text-slate-600">{searchQuery}</span>&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MOBILE SEARCH TOGGLE BUTTON */}
        <button
          onClick={() => setIsMobileSearchOpen((prev) => !prev)}
          className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 md:hidden transition-colors cursor-pointer"
          title="Search modules"
        >
          <FontAwesomeIcon icon={faSearch} className="text-sm sm:text-base" />
        </button>

        {/* MOBILE SEARCH DROPDOWN OVERLAY */}
        {isMobileSearchOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-3 shadow-xl md:hidden z-50">
            <div className="relative">
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 pl-9 pr-8 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>

            <div className="mt-2 max-h-56 overflow-y-auto space-y-1 py-1">
              {suggestions.length > 0 ? (
                suggestions.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleSelectModule(item)}
                      className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between text-xs text-slate-700 hover:bg-blue-50 active:bg-blue-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        {IconComponent && <IconComponent className="w-4 h-4 text-blue-600" />}
                        <span className="font-semibold">{item.label}</span>
                      </div>
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">
                        {item.section}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-slate-400 text-xs">
                  No modules found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onNotificationClick}
          className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 relative transition-colors cursor-pointer"
          title="Notifications"
        >
          <FontAwesomeIcon icon={faBell} className="text-sm sm:text-base" />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
              <span className="absolute -top-0.5 -right-1 px-1 min-w-[15px] h-[15px] bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </>
          )}
        </button>

        {isAuthenticated ? (
          <div className="flex items-center gap-1 sm:gap-2 border-l border-gray-100 pl-1.5 sm:pl-2">
            <Link
              to="/profile"
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Profile"
            >
              <FontAwesomeIcon icon={faCircleUser} className="text-base sm:text-lg" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50/50 transition-all duration-150 cursor-pointer"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 text-xs font-semibold shadow-sm shadow-blue-500/10">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

const SidebarItem = ({ item, active, onNavigate }) => {
  return (
    <Link
      to={item.path || "#"}
      onClick={onNavigate}
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group ${active
        ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-600/10"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex-shrink-0 transition-colors ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
          }`}>
          <item.icon className="w-[18px] h-[18px]" />
        </span>
        <span className="text-xs tracking-wide">
          {item.label}
        </span>
      </div>

      {active && (
        <svg className="w-3 h-3 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </Link>
  );
};

function isActive(itemPath, currentPath) {
  if (!itemPath) return false;
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

// Icon Components
function HomeIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none"><path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function TargetIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" /><path d="M17 7l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function UserIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" /><path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function BuildingIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function BoxIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73L13 3.27a2 2 0 00-2 0L4 6.27A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function QuoteIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none"><path d="M8 7H5a2 2 0 00-2 2v4a2 2 0 002 2h3V7zM19 7h-3a2 2 0 00-2 2v4a2 2 0 002 2h3V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

function FollowUpIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none">
    <path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M8 4L6 2M16 4l2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 8H2M4 16H2M20 8h2M20 16h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}