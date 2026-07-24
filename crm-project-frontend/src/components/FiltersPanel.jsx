import React, { useEffect, useState, useMemo, useRef } from "react";



/**
 * FiltersPanel - manual apply mode
 *
 * - onChange is called only when user clicks "Apply" or "Reset".
 * - Inputs update local state immediately.
 */
export default function FiltersPanel({ config = [], initialValues = {}, onChange }) {
  const [values, setValues] = useState(() => ({ ...initialValues }));
  const initialRef = useRef(initialValues);

  // sync initialValues if parent intentionally changes them
  useEffect(() => {
    // shallow compare keys/values; if changed, sync local state
    const keys = Object.keys(initialValues);
    let changed = false;
    for (const k of keys) {
      if (initialValues[k] !== initialRef.current[k]) { changed = true; break; }
    }
    if (changed) {
      initialRef.current = initialValues;
      setValues(prev => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    const cleared = {};
    config.forEach(c => { cleared[c.key] = c.default ?? (c.type === "checkbox" ? [] : ""); });
    setValues(cleared);
    initialRef.current = cleared;      // treat reset as new baseline
    onChange && onChange(cleared);     // apply reset immediately
  };

  const handleApply = () => {
    initialRef.current = values;       // make current values the new baseline
    onChange && onChange(values);
  };

  // compute dirty flag (true if values differ from baseline initialRef.current)
  const isDirty = useMemo(() => {
    const keys = new Set([...Object.keys(initialRef.current || {}), ...Object.keys(values || {})]);
    for (const k of keys) {
      const a = initialRef.current ? initialRef.current[k] : undefined;
      const b = values ? values[k] : undefined;
      // simple deep-ish equality for arrays/objects and primitives:
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return true;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
        continue;
      }
      if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
        if (JSON.stringify(a) !== JSON.stringify(b)) return true;
        continue;
      }
      if (a !== b) return true;
    }
    return false;
  }, [values]);

  return (
    <div className="bg-white rounded-md shadow-sm flex flex-col max-h-full border border-slate-100">

{/* SCOPED CSS */}
      <style>{`
        .filters-panel-container .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .filters-panel-container .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .filters-panel-container .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .filters-panel-container .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      <div className="p-4 pb-2">
        <h3 className="text-lg font-semibold text-slate-700">Filter  by</h3>

      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
        <div className="space-y-6 pb-3">
          {config.map((c) => (
            <div key={c.key}>
              {c.type === "search" && (
                <SearchInput
                  label={c.label}
                  placeholder={c.placeholder}
                  initial={values[c.key] ?? ""}
                  onChange={(v) => handleChange(c.key, v)}
                />
              )}

              {c.type === "radio" && (
                <RadioGroup
                  label={c.label}
                  options={c.options}
                  value={values[c.key] ?? (c.options[0] && c.options[0].value) ?? ""}
                  onChange={(v) => handleChange(c.key, v)}
                />
              )}

              {c.type === "checkbox" && (
                <CheckboxGroup
                  label={c.label}
                  options={c.options}
                  value={values[c.key] ?? []}
                  onChange={(v) => handleChange(c.key, v)}
                />
              )}

              {c.type === "select" && (
                <SelectInput
                  label={c.label}
                  options={c.options}
                  value={values[c.key] ?? ""}
                  onChange={(v) => handleChange(c.key, v)}
                  placeholder={c.placeholder}
                />
              )}

              {c.type === "text" && (
                <TextInput
                  label={c.label}
                  value={values[c.key] ?? ""}
                  onChange={(v) => handleChange(c.key, v)}
                  placeholder={c.placeholder}
                />
              )}

              {c.type === "daterange" && (
                <DateRangeInput
                  label={c.label}
                  value={values[c.key] ?? { from: "", to: "" }}
                  onChange={(v) => handleChange(c.key, v)}
                />
              )}

              {/* ⭐ NEW SINGLE DATE INPUT */}
{c.type === "date" && (
  <div>
    <label className="text-sm font-medium text-slate-700 mb-2 block">
      {c.label}
    </label>
    <input
      type="date"
      value={values[c.key] ?? ""}
      onChange={(e) => handleChange(c.key, e.target.value)}
      className="w-full rounded-md border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300"
    />
  </div>
)}

            </div>
          ))}
        </div>

      </div>

      {/* Footer with Apply + Reset (Reset replaces Cancel) */}
      <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50 rounded-b-md">
        <div className="flex gap-3 ">
          <button
            onClick={handleApply}
            disabled={!isDirty}
            className={`px-4 py-2 rounded-md ${isDirty ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
          >
            Apply
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:shadow-sm"
          >
            Reset
          </button>
        </div>
      </div>

    </div>
  );
}

/* -------------------------
   SMALL INPUT COMPONENTS
   - SearchInput still debounces its internal typing,
     but does not call onChange globally (we only update local state).
   ------------------------- */

function SearchInput({ label, placeholder = "Search...", initial = "", onChange }) {
  const [q, setQ] = useState(initial);
  const initialRef = useRef(initial);

  // if parent initial prop changes, sync local state
  useEffect(() => {
    if (initial !== initialRef.current) {
      initialRef.current = initial;
      setQ(initial ?? "");
    }
  }, [initial]);

  // only update parent panel's local state (debounced) via onChange prop supplied by FiltersPanel
  useEffect(() => {
    const t = setTimeout(() => onChange && onChange(q), 250);
    return () => clearTimeout(t);
  }, [q, onChange]);

  return (
    <div>
      <label className="block text-sm text-slate-600 mb-2">{label}</label>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300"
      />
    </div>
  );
}

function RadioGroup({ label, options = [], value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
      </div>
      <div className="space-y-2">
        {options.map(opt => (
          <label
            key={opt.value}
            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-sky-50 ${String(value) === String(opt.value) ? "bg-sky-50" : ""}`}
          >
            <input
              type="radio"
              name={label}
              checked={String(value) === String(opt.value)}
              onChange={() => onChange(opt.value)}
              className="form-radio"
            />
            <span className="text-sm text-slate-700">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroup({ label, options = [], value = [], onChange }) {
  const selected = useMemo(() => new Set(value), [value]);

  const toggle = (val) => {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val); else next.add(val);
    onChange([...next]);
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-2 block">{label}</label>
      <div className="space-y-2">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2 p-2 rounded-md hover:bg-sky-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(opt.value)}
              onChange={() => toggle(opt.value)}
              className="form-checkbox"
            />
            <span className="text-sm text-slate-700">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SelectInput({ label, options = [], value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-2 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm text-slate-700 mb-2 block">{label}</label>
      <input
        className="w-full rounded-md border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function DateRangeInput({ label, value = { from: "", to: "" }, onChange }) {
  const change = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-2 block">{label}</label>
      <div className="flex gap-2">
        <input type="date" value={value.from} onChange={(e) => change("from", e.target.value)} className="rounded-md text-[13.5px] border border-slate-200 px-1 py-2 focus:ring-2 focus:ring-sky-300" />
        <input type="date" value={value.to} onChange={(e) => change("to", e.target.value)} className="rounded-md text-[13.5px] border border-slate-200 px-1 py-2 focus:ring-2 focus:ring-sky-300" />
      </div>
    </div>
  );
}
