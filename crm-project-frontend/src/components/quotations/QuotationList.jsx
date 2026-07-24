// quotation/QuotationList.jsx

import { useEffect, useState, useCallback } from "react";
import React from "react";
import axios from "axios";

import {
  MdRemoveRedEye,
  MdDownload,
  MdEdit,
  MdDelete,
  MdEmail,
  MdHistory,
  MdPrint,
} from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";

const BASE_API =
  import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

// TOKEN
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const normalize = (d) => (Array.isArray(d) ? d : d?.results || []);

/**
 * QuotationList
 * Props:
 *   onAdd    – called when user clicks "+ Add Quotation"
 *   onEdit   – called with quotation id when user clicks Edit
 *   filters  – applied filter object from FiltersPanel (parent passes via Quotation.jsx)
 */
export default function QuotationList({ onAdd, onEdit, filters = {} }) {
  const [list, setList] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState({});
  const [openRow, setOpenRow] = useState(null);
  const [loading, setLoading] = useState(false);

  // CLOSE PANEL ON OUTSIDE CLICK
  useEffect(() => {
    const close = () => setOpenRow(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // ─── Build query string from filters ───────────────────────────────────────
  const buildParams = useCallback((f = {}) => {
    const params = new URLSearchParams();

    // Full-text search → DRF SearchFilter uses ?search=
    if (f.search) params.set("search", f.search);

    // Date range → custom InvoiceFilter date_from / date_to
    if (f.date?.from) params.set("date_from", f.date.from);
    if (f.date?.to)   params.set("date_to",   f.date.to);

    return params.toString();
  }, []);

  // ─── Fetch quotations whenever filters change ───────────────────────────────
  const fetchQuotations = useCallback(() => {
    setLoading(true);
    const qs = buildParams(filters);
    api
      .get(`quotation/quotation/${qs ? `?${qs}` : ""}`)
      .then((res) => {
        const data = normalize(res.data);
        const initialVersion = {};
        data.forEach((q) => {
          const active = q.versions?.find((v) => v.is_active);
          if (active) initialVersion[q.id] = active.id;
        });
        setSelectedVersion(initialVersion);
        setList(data);
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [filters, buildParams]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const getActiveVersion = (q) =>
    q.versions?.find((v) => v.id === selectedVersion[q.id]);

  const handleViewPDF = async (quotationId, versionId = null) => {
    try {
      const url = versionId
        ? `quotation/quotation/${quotationId}/version/${versionId}/pdf/`
        : `quotation/quotation/${quotationId}/pdf/`;

      const response = await api.get(url, { responseType: "blob" });
      const file = new Blob([response.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(file));
    } catch (err) {
      console.error(err);
      alert("Failed to open PDF");
    }
  };

  const handleViewPrintPDF = async (quotationId, versionId = null) => {
    try {
      const url = versionId
        ? `quotation/quotation/${quotationId}/version/${versionId}/print-pdf/`
        : `quotation/quotation/${quotationId}/print-pdf/`;

      const response = await api.get(url, { responseType: "blob" });
      const file = new Blob([response.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(file));
    } catch (err) {
      console.error(err);
      alert("Failed to open new design PDF");
    }
  };

  const handleDownloadPDF = async (quotationId, versionId = null) => {
    try {
      const url = versionId
        ? `quotation/quotation/${quotationId}/version/${versionId}/pdf/`
        : `quotation/quotation/${quotationId}/pdf/`;

      const response = await api.get(url, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const fileURL = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = fileURL;
      link.download = `quotation_${quotationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error(err);
      alert("Download failed");
    }
  };

  const handleDeleteVersion = async (quotationId, versionId) => {
    const ok = window.confirm("Delete this version?");
    if (!ok) return;

    try {
      await api.delete(
        `quotation/quotation/${quotationId}/version/${versionId}/delete/`
      );
      fetchQuotations();
    } catch (err) {
      console.error(err);
      alert("Failed to delete version");
    }
  };

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return "0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Header Section — matches PurchaseOrder.jsx */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quotation Management</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${list.length} quotation(s) found`}
          </div>
        </div>
        <div>
          <button
            onClick={onAdd}
            className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
          >
            + Add Quotation
          </button>
        </div>
      </div>

      {/* Table — matches PurchaseOrder.jsx */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sr.No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Site Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Products</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Total Amount</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {list.map((q, i) => {
              const activeVersion = getActiveVersion(q);

              return (
                <React.Fragment key={q.id}>
                  {/* MAIN ROW */}
                  <tr className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{i + 1}</td>

                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{q.customer_name}</div>
                      <div className="text-xs text-slate-500">{q.customer_contact}</div>
                    </td>

                    <td className="px-4 py-3 text-sm">{q.site_name_detail || q.site_name || "-"}</td>

                    <td className="px-4 py-3 text-sm">
                      {activeVersion?.product_count || "1 item(s)"}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      ₹{formatAmount(activeVersion?.total_amount)}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* ORDER matches PurchaseOrder.jsx: History | View | Edit | Download | WhatsApp | Email | Delete */}
                        <button
                          className={`px-2 py-1 rounded hover:bg-purple-300 ${openRow === q.id
                            ? "bg-purple-400 text-purple-900"
                            : "bg-purple-200 text-purple-800"
                            }`}
                          title="Version History"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenRow(openRow === q.id ? null : q.id);
                          }}
                        >
                          <MdHistory />
                        </button>

                        <button onClick={() => handleViewPDF(q.id)} className="px-2 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300" title="View PDF (Existing)">
                          <MdRemoveRedEye />
                        </button>

                        <button onClick={() => handleViewPrintPDF(q.id)} className="px-2 py-1 bg-indigo-200 text-indigo-800 rounded hover:bg-indigo-300" title="View PDF (New WeasyPrint Design)">
                          <MdPrint />
                        </button>

                        <button onClick={() => onEdit(q.id)} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300" title="Edit">
                          <MdEdit />
                        </button>

                        <button onClick={() => handleDownloadPDF(q.id)} className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300" title="Download">
                          <MdDownload />
                        </button>

                        <button className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300" title="WhatsApp">
                          <FaWhatsapp />
                        </button>

                        <button className="px-2 py-1 bg-sky-200 text-sky-800 rounded hover:bg-sky-300" title="Email">
                          <MdEmail />
                        </button>

                        <button onClick={() => handleDeleteVersion(q.id, activeVersion.id)} className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300" title="Delete">
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* FULL VERSION HISTORY TABLE */}
                  {openRow === q.id && (
                    <tr>
                      <td colSpan="6" className="bg-slate-50 px-8 py-4">
                        <div className="font-semibold text-sm mb-2">Version History</div>

                        <table className="w-full bg-white rounded-md overflow-hidden">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Version</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Date</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Products</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Total</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">Actions</th>
                            </tr>
                          </thead>

                          <tbody>
                            {q.versions
                              ?.filter((v) => !v.is_active)
                              .map((v) => (
                                <tr key={v.id} className="border-b hover:bg-slate-50">
                                  <td className="px-3 py-2 text-xs">{v.version_no}</td>
                                  <td className="px-3 py-2 text-xs">
                                    {v.created_at?.split("T")[0]}
                                  </td>
                                  <td className="px-3 py-2 text-xs">1 item(s)</td>
                                  <td className="px-3 py-2 text-xs">
                                    ₹{formatAmount(v.total_amount)}
                                  </td>

                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => handleViewPDF(q.id, v.id)} className="px-2 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300" title="View PDF (Existing)">
                                        <MdRemoveRedEye />
                                      </button>

                                      <button onClick={() => handleViewPrintPDF(q.id, v.id)} className="px-2 py-1 bg-indigo-200 text-indigo-800 rounded hover:bg-indigo-300" title="View PDF (New WeasyPrint Design)">
                                        <MdPrint />
                                      </button>

                                      <button onClick={() => handleDownloadPDF(q.id, v.id)} className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300" title="Download">
                                        <MdDownload />
                                      </button>

                                      <button className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300" title="WhatsApp">
                                        <FaWhatsapp />
                                      </button>

                                      <button className="px-2 py-1 bg-sky-200 text-sky-800 rounded hover:bg-sky-300" title="Email">
                                        <MdEmail />
                                      </button>

                                      <button onClick={() => handleDeleteVersion(q.id, v.id)} className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300" title="Delete">
                                        <MdDelete />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {list.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                  No quotations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}