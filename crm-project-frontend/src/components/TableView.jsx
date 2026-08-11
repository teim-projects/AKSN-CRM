import React from "react";
import { MdOutlineNavigateNext, MdOutlineNavigateBefore } from "react-icons/md";

/**
 * TableView
 *
 * Props:
 * - columns: [{ key, label, render? }]
 * - rows: array
 * - loading: bool
 * - error: string|null
 * - page: number
 * - totalPages: number
 * - onPageChange: fn(newPage)
 * - pageSize: number (for Sr.No calculation)
 * - actions: function(row) => ReactNode (optional actions column)
 * - renderExpandedRow: function(row) => ReactNode (optional nested/expanded row)
 * - emptyMessage: string
 */
export default function TableView({
  columns = [],
  rows = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  onPageChange = () => { },
  pageSize = 10,
  actions = null,
  renderExpandedRow = null,
  emptyMessage = "No records",
  rowClassName,
}) {
  return (
    <div className="bg-white p-3 sm:p-4 rounded-md shadow flex flex-col w-full">
      {loading ? (
        <div className="py-6 text-center text-slate-600">Loading...</div>
      ) : error ? (
        <div className="py-6 text-red-600">Error: {error}</div>
      ) : (
        <>
          <div className="overflow-x-auto w-full thin-scrollbar">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  {columns.map(col => (
                    <th key={col.key} className="py-2 px-3 text-center">{col.label}</th>
                  ))}
                  {actions && <th className="py-2 px-3 text-center">Actions</th>}
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (actions ? 1 : 0)} className="py-6 text-center text-slate-500">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : rows.map((row, idx) => (
                  <React.Fragment key={row.id ?? idx}>
                    <tr className={`border-b hover:bg-gray-50 ${rowClassName ? rowClassName(row) : ''}`}>
                      {columns.map(col => (
                        <td key={col.key} className="py-1.5 px-3 text-center">
                          {col.render ? col.render(row, idx) : (row[col.key] ?? "")}
                        </td>
                      ))}

                      {actions && (
                        <td className="py-1.5 px-3">
                          <div className="flex items-center justify-center text-center gap-2">
                            {actions(row)}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Render inline expanded version row directly underneath if passed */}
                    {renderExpandedRow && renderExpandedRow(row)}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination (Fixed below table, stays visible when table scrolls horizontally) */}
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm">
            <div className="text-slate-600">
              Page {page} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <MdOutlineNavigateBefore />
              </button>

              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <MdOutlineNavigateNext />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}