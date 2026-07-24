import { useState, useCallback, useMemo } from "react";
import Base from "../components/Base";
import QuotationList from "../components/quotations/QuotationList";
import AddQuotation from "../components/quotations/AddQuotation";

export default function Quotation() {

  const [mode, setMode] = useState("list");
  const [editId, setEditId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── Filter state ────────────────────────────────────────────────────────────
  const initialFilters = useMemo(() => ({
    search: "",
    date: { from: "", to: "" },
  }), []);

  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  // ─── Filter config for FiltersPanel (via Base) ────────────────────────────────
  // Uses the same config shape as Lead.jsx / Inventory.jsx
  const filtersConfig = useMemo(() => [
    {
      key: "search",
      type: "search",
      label: "Search",
      placeholder: "Search by customer, quotation no, site...",
    },
    {
      key: "date",
      type: "daterange",
      label: "Quotation Date",
    },
  ], []);

  const handleFilterChange = useCallback((filters) => {
    setAppliedFilters(filters);
  }, []);

  // ─── Navigation ───────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setMode("add");
  };

  const openEdit = (id) => {
    setEditId(id);
    setMode("add");
  };

  const goBack = () => {
    setMode("list");
    // force quotation list reload
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Base
      title="Quotes"
      filterTitle="Quotation Filters"
      filtersConfig={filtersConfig}
      initialFilterValues={initialFilters}
      onFiltersChange={handleFilterChange}
    >
      {/* LIST — always rendered so it's ready in background */}
      <QuotationList
        key={refreshKey}
        onAdd={openAdd}
        onEdit={openEdit}
        filters={appliedFilters}
      />

      {/* ADD / EDIT MODAL */}
      {mode === "add" && (
        <AddQuotation
          id={editId}
          onBack={goBack}
        />
      )}
    </Base>
  );
}