import React, { useState, useCallback } from "react";
import FiltersPanel from "./FiltersPanel";
import { FaFilter } from "react-icons/fa";


export default function Base({
  title = "Page",
  filterTitle,
  filtersConfig = null,
  initialFilterValues = {},
  onFiltersChange = () => { },
  sidebarWidth = 230,
  drawerWidth = 320,
  children,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleFilterChange = useCallback((filters) => {
    onFiltersChange && onFiltersChange(filters);
  }, [onFiltersChange]);


  // compute left offset for desktop (inline style)
  const leftStyle = { left: `${sidebarWidth}px`, width: `${drawerWidth}px` };

  return (
    <div className="relative h-full flex">
      {/* Render drawer only if page supplies a filtersConfig */}
      {filtersConfig && filtersOpen && (
        <>
    // Inside Base.js
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 top-15 bg-white shadow-lg z-50 transform transition-transform duration-200 flex flex-col" // Added flex flex-col
            style={leftStyle}
          >
            <div className="p-6 flex items-center justify-between border-b border-slate-50"> {/* Added border-b */}
              <h3 className="text-lg font-semibold text-slate-700">
                {filterTitle || "Filters"}
              </h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-slate-600 hover:text-slate-800 p-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* This wrapper must be flex-1 and h-full to pass height to FiltersPanel */}
            <div className="flex-1 h-full overflow-hidden">
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
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            aria-hidden="true"
          />
        </>
      )}

      {/* Main content area (shifts right on md when drawer open) */}
      <div className={"flex-1 flex flex-col transition-all duration-300 overflow-auto " + (filtersOpen ? "md:ml-45" : "")}>
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-transparent">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 ml-5">{title}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* show filter trigger only if filtersConfig provided */}
            {filtersConfig && (
              <button
                onClick={() => setFiltersOpen((s) => !s)}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white hover:shadow-sm"
                title="Show filters"
                aria-expanded={filtersOpen}
              >
                <FaFilter className="text-sky-600" />
                <span className="hidden sm:inline text-sm text-slate-700">Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
