import React, { useState, useEffect } from "react";
import { RxCross2 } from "react-icons/rx";
import { MdContentCopy, MdCheck } from "react-icons/md";

export default function TallyPairingModal({ isOpen, onClose, onPairedSuccess, baseApi }) {
  const [pairingCode, setPairingCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);
  const [commandMode, setCommandMode] = useState("exe"); // "exe" | "python"
  const [error, setError] = useState("");

  const cleanServerUrl = (baseApi || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8000")).replace(/\/$/, "");
  const commandToRun = commandMode === "exe"
    ? `TallyConnector.exe --server ${cleanServerUrl} --pair ${pairingCode}`
    : `python tally_connector.py --server ${cleanServerUrl} --pair ${pairingCode}`;

  const token = localStorage.getItem("access") || localStorage.getItem("token");

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setError("");

    fetch(`${baseApi}/api/tally/pairing-code/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate pairing code");
        return res.json();
      })
      .then((data) => {
        setPairingCode(data.pairing_code);
        const expTime = new Date(data.expires_at).getTime();
        setTimeLeft(Math.max(0, Math.floor((expTime - Date.now()) / 1000)));
      })
      .catch((err) => {
        setError(err.message || "Failed to initialize pairing");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, baseApi, token]);

  // Countdown timer
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Auto poll for successful pairing
  useEffect(() => {
    if (!isOpen || !pairingCode) return;

    const pollInterval = setInterval(() => {
      fetch(`${baseApi}/api/tally/status/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "connected") {
            clearInterval(pollInterval);
            if (onPairedSuccess) onPairedSuccess(data);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isOpen, pairingCode, baseApi, token, onPairedSuccess]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans antialiased text-slate-800"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-auto my-8 relative max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
      >
        {/* Header Bar - Exactly like AddLeadForm */}
        <div className="bg-white px-6 pt-6 pb-3 flex justify-between items-start border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Connect TallyPrime
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure pairing code for Windows Connector
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

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 scrollbar-thin">
          {isLoading ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Generating secure pairing code...
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
              {error}
            </div>
          ) : (
            <>
              {/* Code Box */}
              <div className="text-center p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pairing Code
                </span>

                <div className="flex items-center justify-center gap-2">
                  <div className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg font-mono text-2xl font-black text-slate-900 tracking-widest shadow-xs select-all">
                    {pairingCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copied ? <MdCheck className="text-emerald-600 text-xl" /> : <MdContentCopy className="text-xl" />}
                  </button>
                </div>

                <div className="text-xs text-slate-500 pt-1">
                  Code expires in: <strong className="text-slate-800">{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</strong>
                </div>
              </div>

              {/* Instructions */}
              <div className="border border-slate-200/80 rounded-lg p-4 bg-white space-y-3 text-xs text-slate-700">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Next Steps:
                </h4>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0">1</span>
                  <span>Ensure <strong>TallyPrime</strong> is open on your machine (port 9000).</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] flex-shrink-0">2</span>
                  <span>Run the connector command on this machine:</span>
                </div>

                {/* Command Mode Tabs & Code Box */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCommandMode("exe")}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                          commandMode === "exe"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Windows App (.exe)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommandMode("python")}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                          commandMode === "python"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Python Script (.py)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(commandToRun);
                        setCmdCopied(true);
                        setTimeout(() => setCmdCopied(false), 2500);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                      title="Copy full command"
                    >
                      {cmdCopied ? (
                        <>
                          <MdCheck className="text-emerald-300 text-sm" />
                          <span className="text-white font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <MdContentCopy className="text-blue-100 text-sm" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Clean code box with word-wrap and distinct styling */}
                  <div className="bg-slate-950 text-slate-100 rounded-lg p-3 font-mono text-[11.5px] border border-slate-800 shadow-inner select-all break-all leading-relaxed whitespace-pre-wrap">
                    {commandToRun}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 px-0.5">
                    <span>
                      Target CRM Server: <strong className="text-slate-800 font-semibold">{cleanServerUrl}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                  <a
                    href={`${cleanServerUrl}/api/tally/download-connector/?format=exe`}
                    download="TallyConnector.exe"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    Download TallyConnector.exe
                  </a>
                  <span className="text-slate-300">•</span>
                  <a
                    href={`${cleanServerUrl}/api/tally/download-connector/?format=py`}
                    download="tally_connector.py"
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-800 font-semibold underline"
                  >
                    Download tally_connector.py
                  </a>
                </div>

                <div className="flex items-center gap-2 pt-1 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Waiting for connector to establish handshake...</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
