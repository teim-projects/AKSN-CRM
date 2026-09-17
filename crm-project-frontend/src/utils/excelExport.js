import * as XLSX from "xlsx";
import Swal from "sweetalert2";

/**
 * Formats any date value into DD-MM-YYYY format for clean Excel reporting.
 * Avoids timezone shifts by parsing YYYY-MM-DD directly.
 */
export function formatExcelDate(dateVal) {
  if (!dateVal) return "-";
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed || trimmed === "-") return "-";
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}-${m}-${y}`;
    }
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Exports data to an Excel file (.xlsx) with automated column sizing
 * @param {Object} options
 * @param {Array<Object>} options.data - Array of formatted objects to export
 * @param {string} options.fileName - Base file name without extension
 * @param {string} [options.sheetName="Sheet1"] - Name of the worksheet
 */
export function exportToExcel({ data, fileName = "Export", sheetName = "Data" }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    Swal.fire({
      icon: "info",
      title: "No Data to Export",
      text: "There are no records matching the current selection to export.",
      timer: 2000,
      showConfirmButton: false,
    });
    return;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Calculate column widths based on header and cell content length
    const colKeys = Object.keys(data[0] || {});
    const colWidths = colKeys.map((key) => {
      let maxLen = String(key).length;
      data.forEach((row) => {
        const val = row[key];
        if (val !== undefined && val !== null) {
          const len = String(val).length;
          if (len > maxLen) maxLen = len;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const dateStamp = new Date().toISOString().slice(0, 10);
    const finalFileName = `${fileName.replace(/\s+/g, "_")}_${dateStamp}.xlsx`;

    XLSX.writeFile(workbook, finalFileName);

    Swal.fire({
      icon: "success",
      title: "Export Successful",
      text: `Exported ${data.length} records to ${finalFileName}`,
      timer: 1800,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Failed to export excel:", err);
    Swal.fire({
      icon: "error",
      title: "Export Failed",
      text: "An error occurred while generating the Excel spreadsheet.",
    });
  }
}
