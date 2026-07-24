export const toNum = (val, fallback = 0) => {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return Number.isFinite(val) ? val : fallback;
  const n = parseFloat(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

export const formatAmount = (val, fallback = 0) => toNum(val, fallback).toFixed(2);

export const normalizeLowSideItem = (row) => ({
  ...row,
  quantity: toNum(row.quantity, 1),
  unit_price: toNum(row.unit_price),
  rate: toNum(row.rate),
  gst_percent: toNum(row.gst_percent),
  mathadi_charges: toNum(row.mathadi_charges),
});

export const normalizeHighSideItem = (row) => ({
  ...row,
  quantity: toNum(row.quantity, 1),
  unit_price: toNum(row.unit_price),
  rate: toNum(row.rate),
  gst_percent: toNum(row.gst_percent),
  mathadi_charges: toNum(row.mathadi_charges),
  transportation_charges: toNum(row.transportation_charges),
});
