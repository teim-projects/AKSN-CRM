import { useState, useEffect } from 'react';

export function useUserRole(baseApi) {
  const [userRole, setUserRole] = useState(null);
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
    const token = localStorage.getItem("access");
    if (!token) {
      setUserRole(null);
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
        setUserRole(data.role);
      })
      .catch(err => {
        console.error("Failed to fetch user role:", err);
        setUserRole(null); // Set to null on error
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [baseApi, trigger]); // Re-run if baseApi or trigger changes

  return { userRole, isLoading };
}