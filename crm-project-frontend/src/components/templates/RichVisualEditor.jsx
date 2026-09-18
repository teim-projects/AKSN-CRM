import React, { useState, useRef, useEffect } from "react";
import {
  MdFormatBold,
  MdTableChart,
  MdAddCircleOutline,
} from "react-icons/md";
import { RxCross2 } from "react-icons/rx";

/**
 * Utility to convert rich HTML into clean WhatsApp text format
 * (*bold* and monospaced pipe-aligned tables)
 */
export function htmlToWhatsAppText(html) {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Convert tables to monospaced text tables
  const tables = doc.querySelectorAll("table");
  tables.forEach((table) => {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length === 0) return;

    const grid = rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("th, td"));
      return cells.map((cell) => cell.innerText.trim());
    });

    const colCount = Math.max(...grid.map((r) => r.length), 0);
    if (colCount === 0) return;

    const colWidths = Array(colCount).fill(0);
    grid.forEach((row) => {
      row.forEach((cellText, colIdx) => {
        colWidths[colIdx] = Math.max(colWidths[colIdx] || 0, cellText.length);
      });
    });

    let textTable = "\n```\n";
    grid.forEach((row, rowIdx) => {
      const paddedCells = [];
      for (let i = 0; i < colCount; i++) {
        const text = row[i] || "";
        paddedCells.push(text.padEnd(colWidths[i] || 4, " "));
      }
      textTable += "| " + paddedCells.join(" | ") + " |\n";
      if (rowIdx === 0) {
        textTable +=
          "|-" + colWidths.map((w) => "-".repeat(Math.max(w, 4))).join("-|-") + "-|\n";
      }
    });
    textTable += "```\n";

    const textNode = doc.createTextNode(textTable);
    table.parentNode?.replaceChild(textNode, table);
  });

  // Convert <b> and <strong> to *bold*
  const bolds = doc.querySelectorAll("b, strong");
  bolds.forEach((b) => {
    const textNode = doc.createTextNode(`*${b.innerText}*`);
    b.parentNode?.replaceChild(textNode, b);
  });

  // Convert <br>, <p>, <div> to newlines
  const breaks = doc.querySelectorAll("br");
  breaks.forEach((br) => {
    const textNode = doc.createTextNode("\n");
    br.parentNode?.replaceChild(textNode, br);
  });

  const paragraphs = doc.querySelectorAll("p, div");
  paragraphs.forEach((p) => {
    p.insertAdjacentText("afterend", "\n");
  });

  return (doc.body.innerText || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Utility to ensure stored or loaded text is represented visually
 */
export function normalizeToHtml(content) {
  if (!content) return "";
  const trimmed = content.trim();

  // If it already has HTML tags (like <table>, <p>, <b>, <div>), keep as HTML
  if (/<(table|p|div|b|strong|span|ul|ol|li|br)\b/i.test(trimmed)) {
    return trimmed;
  }

  // Convert WhatsApp markdown like *bold* and newlines into visual HTML
  let converted = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // WhatsApp ```table``` blocks -> monospace visual table
  converted = converted.replace(/```([\s\S]*?)```/g, (m, p1) => {
    return `<pre style="background-color: #0f172a; color: #6ee7b7; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto;">${p1}</pre>`;
  });

  // *bold* -> <b>bold</b>
  converted = converted.replace(/(?<=^|[\s\W])\*([^*\n\r]+)\*(?=[\s\W]|$)/g, "<b>$1</b>");

  // \n -> <br>
  converted = converted.replace(/\n/g, "<br>");
  return converted;
}

export default function RichVisualEditor({
  value = "",
  onChange,
  channel = "email",
  placeholder = "Type message here or insert dynamic tags/tables...",
  onFocus,
  editorRef: externalEditorRef,
}) {
  const internalEditorRef = useRef(null);
  const editorRef = externalEditorRef || internalEditorRef;

  const savedRangeRef = useRef(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [includeHeader, setIncludeHeader] = useState(true);

  // Sync initial or external value changes to innerHTML without disrupting active typing
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const normalized = normalizeToHtml(value);
    if (currentHtml !== normalized && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = normalized;
    }
  }, [value]);

  // Save selection range so toolbar clicks don't lose caret position
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    } else if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Bold action: standard browser rich text bold
  const handleBold = (e) => {
    e.preventDefault();
    restoreSelection();
    document.execCommand("bold", false, null);
    saveSelection();
    handleInput();
  };

  // Open Table Modal
  const openTableDialog = (e) => {
    e.preventDefault();
    saveSelection();
    setShowTableModal(true);
  };

  // Insert Table into contentEditable
  const handleInsertTable = () => {
    const rows = Math.max(1, Math.min(20, parseInt(tableRows, 10) || 3));
    const cols = Math.max(1, Math.min(10, parseInt(tableCols, 10) || 3));

    let html = `\n<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1; font-size: 13px; font-family: Arial, sans-serif; background-color: #ffffff;">\n`;

    let startRow = 0;
    if (includeHeader) {
      html += `  <thead>\n    <tr style="background-color: #f1f5f9; color: #0f172a;">\n`;
      for (let c = 1; c <= cols; c++) {
        html += `      <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-weight: 600;">Header ${c}</th>\n`;
      }
      html += `    </tr>\n  </thead>\n`;
      startRow = 1;
    }

    html += `  <tbody>\n`;
    for (let r = startRow; r < rows; r++) {
      html += `    <tr>\n`;
      for (let c = 1; c <= cols; c++) {
        html += `      <td style="border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 60px;">Cell ${r + 1}-${c}</td>\n`;
      }
      html += `    </tr>\n`;
    }
    html += `  </tbody>\n</table>\n<p><br></p>`;

    setShowTableModal(false);
    restoreSelection();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      let lastNode = null;
      while ((node = tempDiv.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);

      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else if (editorRef.current) {
      editorRef.current.innerHTML += html;
    }

    handleInput();
  };

  // Add a row to the table currently nearest to cursor
  const handleAddRow = (e) => {
    e.preventDefault();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === "TABLE") {
        const table = node;
        const tbody = table.querySelector("tbody") || table;
        const lastRow = table.querySelector("tr:last-child");
        const colCount = lastRow ? lastRow.querySelectorAll("th, td").length : 3;

        const newRow = document.createElement("tr");
        for (let i = 0; i < colCount; i++) {
          const td = document.createElement("td");
          td.style.border = "1px solid #cbd5e1";
          td.style.padding = "8px 12px";
          td.style.minWidth = "60px";
          td.innerHTML = "New Data";
          newRow.appendChild(td);
        }
        tbody.appendChild(newRow);
        handleInput();
        return;
      }
      node = node.parentNode;
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
      {/* Visual Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs gap-2">
        <div className="flex items-center gap-2">
          {/* Bold Button */}
          <button
            type="button"
            onClick={handleBold}
            title="Make selected text Bold"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <MdFormatBold className="text-base text-slate-900" />
            <span>Bold</span>
          </button>

          {/* Insert Table Button */}
          <button
            type="button"
            onClick={openTableDialog}
            title="Ask rows & columns and insert table"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <MdTableChart className="text-sm text-blue-600" />
            <span>Insert Table...</span>
          </button>

          {/* Quick Row Button */}
          <button
            type="button"
            onClick={handleAddRow}
            title="Add a row to the active table"
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition-all cursor-pointer text-xs"
          >
            <MdAddCircleOutline className="text-sm text-teal-600" />
            <span>+ Row</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          {channel === "whatsapp" ? (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ● WhatsApp Visual Mode
            </span>
          ) : (
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              ● Email HTML Visual Mode
            </span>
          )}
        </div>
      </div>

      {/* Visual ContentEditable Area with Explicit Black Cursor and Caret */}
      <style>{`
        .visual-editor-content,
        .visual-editor-content *,
        .visual-editor-content table,
        .visual-editor-content th,
        .visual-editor-content td {
          caret-color: #000000 !important;
          color: #000000 !important;
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='24' viewBox='0 0 16 24'%3E%3Cpath d='M4 2h8M8 2v20M4 22h8' stroke='%23000000' stroke-width='2' stroke-linecap='round' fill='none'/%3E%3C/svg%3E") 8 12, text !important;
        }
      `}</style>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={saveSelection}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onFocus={(e) => {
          saveSelection();
          if (onFocus) onFocus(e);
        }}
        className="w-full min-h-[220px] max-h-[420px] overflow-y-auto p-4 text-sm bg-white focus:outline-hidden leading-relaxed visual-editor-content"
        style={{
          outline: "none",
          color: "#000000",
          caretColor: "#000000",
          cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'24\' viewBox=\'0 0 16 24\'%3E%3Cpath d=\'M4 2h8M8 2v20M4 22h8\' stroke=\'%23000000\' stroke-width=\'2\' stroke-linecap=\'round\' fill=\'none\'/%3E%3C/svg%3E") 8 12, text',
        }}
        data-placeholder={placeholder}
      />

      {/* Insert Table Dialog Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MdTableChart className="text-blue-600 text-lg" />
                <h4 className="text-sm font-bold text-slate-800">
                  Create Table Grid
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <RxCross2 size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Specify rows and columns to directly build the table inside your template.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rows
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="modalHeaderCheck"
                checked={includeHeader}
                onChange={(e) => setIncludeHeader(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label
                htmlFor="modalHeaderCheck"
                className="text-xs font-medium text-slate-700 cursor-pointer"
              >
                Include column header row
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertTable}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                Create Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
