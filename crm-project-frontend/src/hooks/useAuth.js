import { useState, useEffect, useCallback } from 'react';

const SYSTEM_MODULE_KEYS = [
  "dashboard",
  "leads",
  "followups",
  "quotations",
  "products",
  "customers",
  "projects",
  "amc",
  "terms",
  "accounts",
  "roles",
];

function getDefaultPermissionsForRole(roleName) {
  const norm = (roleName || "").toLowerCase();
  const matrix = {};

  SYSTEM_MODULE_KEYS.forEach((key) => {
    if (norm === "admin" || norm === "superuser") {
      matrix[key] = { view: true, create: true, edit: true, delete: true };
    } else {
      const isSystemAdminMod = key === "accounts" || key === "roles";
      matrix[key] = { view: !isSystemAdminMod, create: false, edit: false, delete: false };
    }
  });

  return matrix;
}

export function useUserRole(baseApi) {
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const handleAuthChange = () => {
      setTrigger(prev => prev + 1);
    };
    window.addEventListener("authChange", handleAuthChange);
    return () => {
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    if (!token) {
      setUserInfo(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`${baseApi}/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => {
        setUserInfo(data);
      })
      .catch(err => {
        console.error("Failed to fetch user profile:", err);
        setUserInfo(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [baseApi, trigger]);

  const userRole = userInfo?.role || (userInfo?.is_superuser ? { id: 1, name: "admin" } : null);

  const hasPermission = useCallback((moduleKey, action = "view") => {
    if (!userInfo) return false;

    const roleName = userRole?.name?.toLowerCase() || "";

    // Superuser or Admin role gets full access to all features and modules
    if (userInfo.is_superuser || roleName === "admin" || roleName === "superuser") {
      return true;
    }

    // 1. DYNAMIC CHECK FROM DB ROLE PERMISSIONS OBJECT
    if (userRole?.permissions && typeof userRole.permissions === 'object' && Object.keys(userRole.permissions).length > 0) {
      const modPerms = userRole.permissions[moduleKey];
      if (modPerms !== undefined && modPerms !== null) {
        return Boolean(modPerms[action]);
      }
    }

    // 2. DYNAMIC CHECK FROM LOCAL STORAGE CACHE (KEYED BY ROLE NAME)
    if (roleName) {
      const savedStr = localStorage.getItem(`crm_role_permissions_${roleName}`);
      if (savedStr) {
        try {
          const matrix = JSON.parse(savedStr);
          if (matrix && matrix[moduleKey] !== undefined) {
            return Boolean(matrix[moduleKey][action]);
          }
        } catch (e) {
          console.error("Error parsing role matrix cache:", e);
        }
      }
    }

    // 3. Fallback defaults if not yet configured in DB or LocalStorage
    const defaultMatrix = getDefaultPermissionsForRole(roleName);
    if (defaultMatrix && defaultMatrix[moduleKey] !== undefined) {
      return Boolean(defaultMatrix[moduleKey][action]);
    }

    return false;
  }, [userInfo, userRole]);

  return { userRole, userInfo, isLoading, hasPermission };
}