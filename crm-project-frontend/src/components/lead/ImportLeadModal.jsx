import React, { useState, useRef } from "react";
import { 
  Download, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2,
  FileText,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import Swal from "sweetalert2";

export default function ImportLeadModal({
  open,
  onClose,
  onSuccess,
  baseApi,
  token = "",
}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const authToken =
    token ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    "";

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const url = `${baseApi.replace(/\/$/, "")}/lead/lead/download-template/`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download template. Please try again.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "lead_import_template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: err.message || "Could not download Excel template.",
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const validExts = [".xlsx", ".xls", ".csv"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExts.includes(fileExt)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid File Type",
        text: "Please select an Excel (.xlsx, .xls) or CSV (.csv) file.",
      });
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleImportSubmit = async () => {
    if (!file) {
      Swal.fire({
        icon: "info",
        title: "No File Selected",
        text: "Please select an Excel or CSV file to import.",
      });
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const url = `${baseApi.replace(/\/$/, "")}/lead/lead/import-leads/`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : "",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import leads.");
      }

      setImportResult(data);

      if (data.imported_count > 0) {
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Import Error",
        text: err.message || "An unexpected error occurred during import.",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 leading-tight">Import Lead Records</h2>
              <p className="text-xs text-slate-500">Add multiple enquiries quickly via Excel or CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* STEP 1: DOWNLOAD TEMPLATE */}
          <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-xl p-4 border border-blue-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wide">
                <span>Step 1</span>
                <span>•</span>
                <span>Download Template</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                Download our sample Excel template pre-configured with required columns, formats, and sample data.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg text-xs font-semibold shadow-xs transition-all duration-150 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {downloadingTemplate ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloadingTemplate ? "Preparing..." : "Get Excel Template"}</span>
            </button>
          </div>

          {/* STEP 2: UPLOAD FILE AREA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Step 2 • Upload Filled File
              </span>
              <span className="text-[11px] text-slate-400">Supports .xlsx, .xls, .csv</span>
            </div>

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                    : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/30"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Click to select file or drag and drop here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Excel (.xlsx, .xls) or CSV files up to 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* SELECTED FILE PREVIEW CARD */
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={importing}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* IMPORT RESULTS SUMMARY (AFTER SUBMISSION) */}
          {importResult && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              {/* SUCCESS COUNT BANNER */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Import Process Finished
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ {importResult.imported_count} Imported
                  </span>
                  {importResult.failed_count > 0 && (
                    <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      ✗ {importResult.failed_count} Skipped / Failed
                    </span>
                  )}
                </div>
              </div>

              {/* ERROR DETAILS LIST IF ANY */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    Skipped or invalid rows details:
                  </p>
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200/80 text-[11px]">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="p-2 flex items-start gap-2">
                        <span className="font-semibold text-slate-500 shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                          Row {err.row}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium text-slate-800">
                            {err.company_name !== "-" ? err.company_name : "Lead"} 
                            {err.mobile_number && err.mobile_number !== "-" ? ` (${err.mobile_number})` : ""}:
                          </span>{" "}
                          <span className="text-rose-600">{err.error}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HELPFUL TIPS */}
          <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 space-y-1 border border-slate-200/60">
            <div className="flex items-center gap-1 text-slate-700 font-semibold">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span>Important Tips:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1">
              <li><strong>Mobile Number</strong> must be 10 digits and unique across the CRM pipeline.</li>
              <li>Provide at least <strong>Company Name</strong> or <strong>Contact Person</strong>.</li>
              <li>Rows with duplicate mobile numbers will be skipped without stopping valid rows.</li>
            </ul>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            {importResult?.imported_count > 0 ? "Done" : "Cancel"}
          </button>

          <div className="flex items-center gap-2">
            {importResult && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                Upload Another File
              </button>
            )}

            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={!file || importing}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Leads...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Import Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
