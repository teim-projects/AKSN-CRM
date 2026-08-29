import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FiltersPanel from "./FiltersPanel";
import { FaFilter, FaArrowLeft } from "react-icons/fa";


export default function Base({
  title = "Page",
  filterTitle,
  filtersConfig = null,
  initialFilterValues = {},
  onFiltersChange = () => { },
  sidebarWidth = 230,
  drawerWidth = 320,
  showBackButton = false,
  children,
}) {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleFilterChange = useCallback((filters) => {
    onFiltersChange && onFiltersChange(filters);
  }, [onFiltersChange]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };


  // compute left offset for desktop (inline style)
  const leftStyle = { left: `${sidebarWidth}px`, width: `${drawerWidth}px` };

  return (
    <div className="relative h-full flex flex-col w-full min-w-0">
      {/* Render drawer only if page supplies a filtersConfig */}
      {filtersConfig && filtersOpen && (
        <>
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 top-14 left-0 w-full max-w-[320px] sm:w-80 bg-white shadow-2xl z-50 transform transition-transform duration-200 flex flex-col border-r border-slate-200"
          >
            <div className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-semibold text-slate-700">
                {filterTitle || "Filters"}
              </h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-slate-600 hover:text-slate-800 p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Wrapper for FiltersPanel */}
            <div className="flex-1 h-full overflow-y-auto">
              <FiltersPanel
                config={filtersConfig}
                initialValues={initialFilterValues}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          {/* Backdrop on small screens */}
          <button
            onClick={() => setFiltersOpen(false)}
            className="fixed inset-0 bg-black/40 z-40"
            aria-hidden="true"
          />
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {(title || showBackButton) && (
          <div className="flex items-center justify-between p-2 bg-transparent">
            <div className="flex items-center gap-3 ml-2 sm:ml-5">
              {showBackButton && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Go back"
                >
                  <FaArrowLeft className="text-slate-500 text-xs" />
                  <span>Back</span>
                </button>
              )}
              {title && (
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">{title}</h2>
              )}
            </div>

            <div className="flex items-center gap-3">
              {filtersConfig && (
                <button
                  onClick={() => setFiltersOpen((s) => !s)}
                  className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-md border border-slate-200 bg-white hover:shadow-sm text-xs sm:text-sm cursor-pointer"
                  title="Show filters"
                  aria-expanded={filtersOpen}
                >
                  <FaFilter className="text-sky-600" />
                  <span className="inline text-slate-700">Filters</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 p-2 sm:p-4 lg:p-6 w-full min-w-0 overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
