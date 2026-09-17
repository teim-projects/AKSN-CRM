import React, { useState } from "react";
import { RxCross2 } from "react-icons/rx";
import {
  Landmark,
  QrCode,
  Download,
  Copy,
  Check,
  Building2,
  FileText,
  Star,
  Sparkles
} from "lucide-react";

export default function CardAndQrPreviewModal({
  open,
  onClose,
  account = null,
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!open || !account) return null;

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  const qrSrc = account.qr_code_url || account.qr_code;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full mx-auto my-8 relative flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="bg-white px-6 pt-5 pb-3 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {account.bank_name}
                </h3>
                {account.is_default && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    Primary Account
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Official Virtual Bank Card & Payment QR Code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* VIRTUAL ATM / BANK CARD */}
            <div className="relative w-full rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 overflow-hidden border border-slate-800 flex flex-col justify-between">
              {/* Background ambient glow */}
              <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="relative z-10 flex items-start justify-between gap-3 mb-5">
                <div>
                  <span className="text-[9px] font-mono tracking-widest uppercase text-blue-300/80">OFFICIAL BANK ACCOUNT</span>
                  <h4 className="text-base font-bold tracking-tight text-white mt-0.5 leading-tight">
                    {account.bank_name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {account.branch_name ? `${account.branch_name} Branch` : "Main Branch"}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 flex-shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>

              {/* Card Chip & Account Type */}
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-9 h-6 rounded-md bg-amber-400/90 flex items-center justify-center shadow-inner">
                  <div className="w-6 h-3.5 border border-amber-600/50 rounded-xs" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/15 text-white backdrop-blur-xs border border-white/10">
                  {account.account_type || "Current"}
                </span>
              </div>

              {/* Account Number */}
              <div className="relative z-10 mb-4">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">Account Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-base sm:text-lg font-bold tracking-wider text-white select-all">
                    {account.account_number}
                  </p>
                  <button
                    onClick={() => copyToClipboard(account.account_number, "card_acc")}
                    className="p-1 rounded hover:bg-white/10 text-slate-300 transition-colors"
                    title="Copy Account Number"
                  >
                    {copiedKey === "card_acc" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Card Footer */}
              <div className="relative z-10 flex items-end justify-between text-xs pt-3 border-t border-white/10">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Beneficiary Name</p>
                  <p className="font-semibold text-white truncate max-w-[130px]">
                    {account.account_holder_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">IFSC Code</p>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-blue-300">
                      {account.ifsc_code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(account.ifsc_code, "card_ifsc")}
                      className="p-0.5 rounded hover:bg-white/10 text-slate-300 transition-colors"
                      title="Copy IFSC"
                    >
                      {copiedKey === "card_ifsc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* QR CODE SCAN CARD */}
            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 flex flex-col items-center justify-between text-center">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Scan &amp; Pay (UPI)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Official payment QR for invoices and quotations
                </p>
              </div>

              <div className="my-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt="Payment QR Code"
                    className="w-44 h-44 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-44 h-44 rounded-xl bg-slate-100 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <QrCode className="w-10 h-10 stroke-[1.5]" />
                    <span className="text-[10px] mt-2 font-medium">No QR Image Attached</span>
                  </div>
                )}

                {account.upi_id && (
                  <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-semibold text-slate-800">
                    <span>{account.upi_id}</span>
                    <button
                      onClick={() => copyToClipboard(account.upi_id, "qr_upi")}
                      className="p-0.5 text-slate-400 hover:text-blue-600"
                      title="Copy UPI ID"
                    >
                      {copiedKey === "qr_upi" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {qrSrc && (
                <a
                  href={qrSrc}
                  download={`QR_${account.bank_name}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR Image</span>
                </a>
              )}
            </div>
          </div>

          {/* ADDITIONAL DETAILS SECTION */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Mapped Company / Entity:</span>
              <span className="font-semibold text-slate-800">
                {account.company_name || "-"}
              </span>
            </div>
            {account.gst_number && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">GSTIN:</span>
                <span className="font-mono font-semibold text-slate-800">{account.gst_number}</span>
              </div>
            )}
            {account.pan_number && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">PAN Number:</span>
                <span className="font-mono font-semibold text-slate-800">{account.pan_number}</span>
              </div>
            )}
            {account.swift_code && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">SWIFT / BIC Code:</span>
                <span className="font-mono font-semibold text-slate-800">{account.swift_code}</span>
              </div>
            )}
            {account.notes && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium block mb-0.5">Instructions / Notes:</span>
                <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200/80 leading-relaxed">
                  "{account.notes}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
