import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    localStorage.setItem("theme", "light");
    const root = document.documentElement;
    root.classList.remove("dark");
    document.body.classList.remove("dark-mode");

    root.style.setProperty("--bg-layout", "#f4f5f9");
    root.style.setProperty("--bg-surface", "#ffffff");
    root.style.setProperty("--bg-card", "#ffffff");
    root.style.setProperty("--bg-table-th", "#f8fafc");
    root.style.setProperty("--text-main", "#1e293b");
    root.style.setProperty("--text-muted", "#64748b");
    root.style.setProperty("--text-td", "#334155");
    root.style.setProperty("--border-main", "#e5e7eb");
    root.style.setProperty("--border-light", "#f1f5f9");
    root.style.setProperty("--shadow-light", "rgba(0,0,0,0.04)");
    root.style.setProperty("--navbar-bg", "#ffffff");
    root.style.setProperty("--sidebar-bg", "#12192c");
    root.style.setProperty("--sidebar-hover", "#f8fafc");
    root.style.setProperty("--sidebar-active", "#eff6ff");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);