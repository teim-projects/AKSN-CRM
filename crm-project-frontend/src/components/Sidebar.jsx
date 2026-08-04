import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleUser,
  faBars,
  faBell,
  faSearch,
  faSignOutAlt
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

const allSidebarItems = [
  { key: "home", label: "Dashboard", icon: HomeIcon, path: "/dashboard", section: "OVERVIEW" },
  { key: "leads", label: "Lead Management", icon: TargetIcon, path: "/leads", section: "SALES" },
  { key: "followups", label: "Follow-up Management", icon: FollowUpIcon, path: "/follow-up", section: "SALES" },
  { key: "quotes", label: "Quotations", icon: QuoteIcon, path: "/quotation", section: "SALES" },
  { key: "products", label: "Product Master", icon: BoxIcon, path: "/products", section: "SALES" },
  { key: "contacts", label: "Customers", icon: UserIcon, path: "/customer", section: "SALES" },
  { key: "projects", label: "Project Management", icon: ProjectIcon, path: "/projects", section: "SALES" },
  { key: "terms", label: "Terms & Conditions", icon: TermsIcon, path: "/terms", section: "SALES" },
  { key: "accounts", label: "Accounts", icon: BuildingIcon, path: "/accounts", section: "OPERATIONS" },
  { key: "roles", label: "Role Management", icon: ShieldIcon, path: "/roles", section: "OPERATIONS" },
];

export default function Sidebar({ children }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const location = useLocation();
  const currentPath = location.pathname;

  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const { userRole, isLoading: loadingRole, hasPermission } = useUserRole(baseApi);

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

  const sections = ["OVERVIEW", "SALES", "OPERATIONS"];

  return (
    <div className="h-screen bg-[#12192c] flex flex-row font-sans antialiased relative w-full overflow-hidden">

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`bg-[#12192c] text-slate-300 h-screen flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out z-50 ${isOpen ? "w-64 opacity-100" : "w-0 opacity-0 pointer-events-none"
          }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/60 min-w-[256px]">
          <button
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-xl bg-blue-600 flex flex-col items-center justify-center gap-1 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors"
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

        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto min-w-[256px]">
          {sections.map(section => {
            const sectionItems = filteredItems.filter(item => item.section === section);
            if (sectionItems.length === 0) return null;

            return (
              <div key={section} className="space-y-1">
                <span className="px-3 text-[10px] font-bold tracking-wider text-slate-500 block uppercase mb-2">
                  {section}
                </span>
                {sectionItems.map((it) => (
                  <SidebarItem key={it.key} item={it} active={isActive(it.path, currentPath)} />
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* RIGHT SIDE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-[#f4f5f9]">

        {/* NAVBAR */}
        <Navbar
          onMenuClick={() => setIsOpen(true)}
          pageTitle={getPageTitle()}
          isSidebarOpen={isOpen}
          onNotificationClick={() => setIsNotificationOpen(true)}
          unreadCount={unreadNotifCount}
        />

        <main className="flex-1 p-5 md:p-6 w-full bg-[#f4f5f9]">
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

const Navbar = ({ onMenuClick, pageTitle, isSidebarOpen, onNotificationClick, unreadCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <nav className="bg-white border-b border-gray-100 flex-shrink-0 sticky top-0 z-40 w-full px-6 py-3.5 flex items-center justify-between shadow-md shadow-gray-200/40">
      <div className="flex items-center gap-4">
        {!isSidebarOpen && (
          <button
            onClick={onMenuClick}
            className="w-9 h-9 rounded-xl bg-blue-600 flex flex-col items-center justify-center gap-1 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors mr-2"
            title="Open Sidebar"
          >
            <span className="block w-4 h-0.5 bg-white rounded-full"></span>
            <span className="block w-4 h-0.5 bg-white rounded-full"></span>
            <span className="block w-4 h-0.5 bg-white rounded-full"></span>
          </button>
        )}

        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-gray-900 leading-tight">
            {pageTitle === "Dashboard" ? "Executive Dashboard" : pageTitle}
          </h1>
          <span className="text-[11px] text-gray-400 font-medium">
            Real-time business overview
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <form onSubmit={(e) => e.preventDefault()} className="relative hidden sm:block">
          <input
            type="text"
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 md:w-64 px-3 py-1.5 pl-9 rounded-lg border border-gray-200/80 
              bg-gray-50/50 text-gray-800 text-xs font-medium
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              transition-all duration-200"
          />
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-[11px]"
          />
        </form>

        <button
          onClick={onNotificationClick}
          className="p-2 text-gray-400 hover:text-blue-600 relative transition-colors cursor-pointer"
          title="Notifications"
        >
          <FontAwesomeIcon icon={faBell} className="text-base" />
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
          <div className="flex items-center gap-2 border-l border-gray-100 pl-2">
            <Link
              to="/profile"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Profile"
            >
              <FontAwesomeIcon icon={faCircleUser} className="text-lg" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50/50 transition-all duration-150"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 text-xs font-semibold shadow-sm shadow-blue-500/10">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

const SidebarItem = ({ item, active }) => {
  return (
    <Link
      to={item.path || "#"}
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