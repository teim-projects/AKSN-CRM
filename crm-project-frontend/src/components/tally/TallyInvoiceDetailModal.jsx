import React from "react";
import { RxCross2 } from "react-icons/rx";

export default function TallyInvoiceDetailModal({ invoice, isOpen, onClose }) {
  if (!isOpen || !invoice) return null;

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: invoice.currency || "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans antialiased text-slate-800"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative border border-slate-100 my-auto"
      >
        {/* Header Bar - Identical to AddLeadForm / LeadDetails */}
        <div className="bg-white px-6 pt-6 pb-3 flex justify-between items-start border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">
                Invoice {invoice.voucher_number || ""}
              </h3>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                {invoice.voucher_type || "Sales"}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                Tally Source
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Voucher Date: <span className="font-semibold text-slate-600">{formatDate(invoice.date)}</span>
              {invoice.reference_number && (
                <span className="ml-3">Ref: <span className="font-semibold text-slate-600">{invoice.reference_number}</span></span>
              )}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
            aria-label="Close"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 scrollbar-thin">
          {/* Party Details Card */}
          <div className="border border-slate-200/80 rounded-lg p-4 bg-white">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Party & Tax Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-500 text-xs block">Tally Party Name:</span>
                <span className="text-slate-900 font-semibold text-sm">{invoice.party_name || "—"}</span>
                {invoice.party_ledger_id && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ledger ID: <span className="font-mono text-slate-500">{invoice.party_ledger_id}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-medium text-slate-500 text-xs block">GSTIN / UIN:</span>
                <span className="font-mono text-slate-800 text-xs font-semibold">{invoice.gstin || "Not specified"}</span>
              </div>

              <div>
                <span className="font-medium text-slate-500 text-xs block">Place of Supply / State:</span>
                <span className="text-slate-800 text-xs font-medium">{invoice.state || "—"}</span>
              </div>

              <div>
                <span className="font-medium text-slate-500 text-xs block">Currency:</span>
                <span className="text-slate-800 text-xs font-medium">{invoice.currency || "INR"}</span>
              </div>

              {invoice.billing_address && (
                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <span className="font-medium text-slate-500 text-xs block mb-1">Billing Address:</span>
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{invoice.billing_address}</p>
                </div>
              )}

              {invoice.shipping_address && (
                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <span className="font-medium text-slate-500 text-xs block mb-1">Shipping Address:</span>
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{invoice.shipping_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Invoice Line Items ({invoice.items?.length || 0})
            </h4>

            <div className="overflow-x-auto rounded-lg border border-slate-200/80 bg-white">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600 font-semibold text-left">
                    <th className="py-2 px-3 text-center w-10">#</th>
                    <th className="py-2 px-3">Item Name & Description</th>
                    <th className="py-2 px-3 text-center">HSN</th>
                    <th className="py-2 px-3 text-right">Quantity</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Taxable</th>
                    <th className="py-2 px-3 text-right">Taxes</th>
                    <th className="py-2 px-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => {
                      const taxTotal =
                        (Number(item.cgst_amount) || 0) +
                        (Number(item.sgst_amount) || 0) +
                        (Number(item.igst_amount) || 0);
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{item.item_name}</div>
                            {item.item_description && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{item.item_description}</div>
                            )}
                            {item.ledger_name && (
                              <div className="text-[10px] text-slate-400">Ledger: {item.ledger_name}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {item.hsn_code || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {Number(item.quantity).toLocaleString()} {item.unit || "Nos"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">
                            {formatCurrency(item.taxable_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {taxTotal > 0 ? (
                              <div className="font-mono">
                                <div>{formatCurrency(taxTotal)}</div>
                                <div className="text-[10px] text-slate-400">
                                  {Number(item.igst_amount) > 0 ? `IGST ${item.igst_rate}%` : `CGST+SGST`}
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                            {formatCurrency(item.total_amount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-slate-400 text-xs">
                        No individual line items stored for this voucher.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown & Audit Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-3">
              {invoice.narration && (
                <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Narration / Remarks
                  </span>
                  <p className="text-xs text-slate-700 italic">"{invoice.narration}"</p>
                </div>
              )}

              <div className="text-[11px] text-slate-400 space-y-1">
                <div>Tally GUID: <span className="font-mono text-slate-600">{invoice.tally_guid}</span></div>
                {invoice.tally_alter_id && (
                  <div>Alter ID: <span className="font-mono text-slate-600">{invoice.tally_alter_id}</span></div>
                )}
              </div>
            </div>

            <div className="border border-slate-200/80 rounded-lg p-4 bg-slate-50/70 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span className="font-mono font-semibold">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {Number(invoice.cgst_amount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>CGST:</span>
                  <span className="font-mono">{formatCurrency(invoice.cgst_amount)}</span>
                </div>
              )}

              {Number(invoice.sgst_amount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>SGST:</span>
                  <span className="font-mono">{formatCurrency(invoice.sgst_amount)}</span>
                </div>
              )}

              {Number(invoice.igst_amount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IGST:</span>
                  <span className="font-mono">{formatCurrency(invoice.igst_amount)}</span>
                </div>
              )}

              {Number(invoice.cess_amount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Cess:</span>
                  <span className="font-mono">{formatCurrency(invoice.cess_amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1.5 font-medium">
                <span>Total Tax:</span>
                <span className="font-mono">{formatCurrency(invoice.total_tax)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Grand Total:</span>
                <span className="text-blue-600 font-mono text-base">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Consistent with Lead modal footers */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
