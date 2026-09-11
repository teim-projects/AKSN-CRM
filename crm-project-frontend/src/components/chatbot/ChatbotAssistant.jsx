import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Bot, 
  X, 
  Send, 
  Trash2, 
  Sparkles, 
  ChevronDown,
  RefreshCw,
  GripHorizontal
} from "lucide-react";

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

const DEFAULT_SUGGESTIONS = [
  "How do I add a new lead?",
  "What are the pipeline stages?",
  "How to schedule a follow-up?",
  "How to convert a lead to a customer?",
  "How do I create a quotation for a lead?",
];

export default function ChatbotAssistant({ isOpen = false, onClose }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! 👋 I am your **AKSN CRM Assistant**.\n\nI can help you navigate the CRM, manage leads, track follow-ups, and answer questions about quotes and pipeline stages. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Window position state for dragging
  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const width = Math.min(410, window.innerWidth - 32);
      const initialX = Math.max(16, window.innerWidth - width - 24);
      return { x: initialX, y: 76 };
    }
    return { x: 500, y: 76 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Keep window in bounds on viewport resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(16, window.innerWidth - 380);
        const maxY = Math.max(16, window.innerHeight - 100);
        return {
          x: Math.min(Math.max(16, prev.x), maxX),
          y: Math.min(Math.max(16, prev.y), maxY),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto scroll to latest message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Fetch starter suggestions from backend
  useEffect(() => {
    const fetchStarter = async () => {
      try {
        const res = await axios.get(`${BASE_API}/chatbot/ask/`, { timeout: 4000 });
        if (res.data && res.data.suggestions && res.data.suggestions.length > 0) {
          setSuggestions(res.data.suggestions);
        }
      } catch {
        // Fallback silently
      }
    };
    fetchStarter();
  }, []);

  // Pointer drag handling on header
  const handlePointerDown = (e) => {
    if (e.target.closest("button") || e.target.closest("input")) return;
    
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handlePointerMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.mouseX;
      const dy = moveEvent.clientY - dragStartRef.current.mouseY;

      const maxX = Math.max(10, window.innerWidth - 320);
      const maxY = Math.max(10, window.innerHeight - 60);

      const nextX = Math.max(10, Math.min(maxX, dragStartRef.current.posX + dx));
      const nextY = Math.max(10, Math.min(maxY, dragStartRef.current.posY + dy));

      setPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg = {
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("access") || localStorage.getItem("access_token");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Detect current friendly screen name
      const path = window.location.pathname.toLowerCase();
      let pageName = "Dashboard";
      if (path.includes("lead")) pageName = "Leads Management";
      else if (path.includes("followup")) pageName = "Follow-ups";
      else if (path.includes("quotation")) pageName = "Quotations";
      else if (path.includes("product")) pageName = "Product Catalog";
      else if (path.includes("customer")) pageName = "Customer Accounts";
      else if (path.includes("project")) pageName = "Projects";
      else if (path.includes("amc")) pageName = "AMC Contracts";
      else if (path.includes("template")) pageName = "Message Templates";
      else if (path.includes("role")) pageName = "Role Management";
      else if (path.includes("account")) pageName = "Account Settings";

      const historyPayload = updatedMessages.slice(1).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      const response = await axios.post(
        `${BASE_API}/chatbot/ask/`,
        {
          message: text,
          history: historyPayload,
          current_page: pageName,
        },
        { headers, timeout: 30000 }
      );

      const botReply = response.data.reply || "I didn't receive a response. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      if (response.data.suggestions && response.data.suggestions.length > 0) {
        setSuggestions(response.data.suggestions);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      let errorMsg = "Sorry, I encountered a problem reaching the server. Please try again.";
      if (err.response?.data?.reply) {
        errorMsg = err.response.data.reply;
      } else if (err.code === "ECONNABORTED") {
        errorMsg = "The request timed out. Please check your connection and try again.";
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMsg,
          isError: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared! How can I assist you with the CRM today?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const formatInline = (str) => {
        const parts = [];
        const regex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(str)) !== null) {
          if (match.index > lastIndex) {
            parts.push(str.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="font-semibold text-slate-900">{match[1]}</strong>);
          lastIndex = regex.lastIndex;
        }
        if (lastIndex < str.length) {
          parts.push(str.substring(lastIndex));
        }
        return parts.length > 0 ? parts : str;
      };

      const trimmed = line.trim();

      // Numbered List (e.g. "1. Go to...")
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 text-slate-700 leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">
              {numMatch[1]}
            </span>
            <span className="flex-1">{formatInline(numMatch[2])}</span>
          </div>
        );
      }

      // Bullet List (e.g. "- Item" or "* Item")
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1 text-slate-700 leading-relaxed">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
            <span className="flex-1">{formatInline(trimmed.substring(2))}</span>
          </div>
        );
      }

      // Header-like line (### Header)
      if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
        const cleanHeader = trimmed.replace(/^#+\s*/, "");
        return (
          <h4 key={idx} className="text-xs font-bold text-slate-900 mt-2.5 mb-1 tracking-wide">
            {formatInline(cleanHeader)}
          </h4>
        );
      }

      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="my-1 leading-relaxed text-slate-700">
          {formatInline(line)}
        </p>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: "fixed",
        zIndex: 9999,
        boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
      }}
      className={`bg-white rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden font-sans select-none w-[360px] sm:w-[410px] ${
        isMinimized ? "h-14" : "h-[540px] max-h-[82vh]"
      } ${isDragging ? "opacity-95 ring-2 ring-blue-500/40" : "transition-shadow"}`}
    >
      {/* DRAGGABLE HEADER - DARK NAVY THEME MATCHING NOTIFICATION DRAWER (#12192c) */}
      <div
        onPointerDown={handlePointerDown}
        className={`bg-[#12192c] text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-md flex-shrink-0 cursor-grab active:cursor-grabbing ${
          isDragging ? "cursor-grabbing" : ""
        }`}
        title="Click and drag anywhere to move"
      >
        <div className="flex items-center gap-3 pointer-events-none">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white">
                AKSN CRM Assistant
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white shadow-xs shadow-blue-600/40">
                AI Guide
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Drag anywhere to move • CRM Support
            </p>
          </div>
        </div>

        {/* Center Drag Handle Visual Indicator */}
        <div className="flex items-center justify-center text-slate-500 hover:text-slate-400 pointer-events-none">
          <GripHorizontal className="w-4 h-4" />
        </div>

        {/* Action Buttons with dark theme */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <button
            type="button"
            onClick={clearChat}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Clear Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isMinimized ? "rotate-180" : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MAIN CHAT CONTENT */}
      {!isMinimized && (
        <>
          {/* MESSAGES FEED */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-end gap-1.5 max-w-[86%]">
                    {!isUser && (
                      <div className="w-6 h-6 rounded-lg bg-[#12192c] border border-blue-400/30 text-blue-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold shadow-xs mb-1">
                        AI
                      </div>
                    )}

                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs ${
                        isUser
                          ? "bg-blue-600 text-white rounded-br-xs shadow-xs"
                          : msg.isError
                          ? "bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-xs"
                          : "bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-bl-xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div>{renderFormattedText(msg.content)}</div>
                      )}
                    </div>
                  </div>

                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {msg.time}
                  </span>
                </div>
              );
            })}

            {/* TYPING LOADER */}
            {loading && (
              <div className="flex items-center gap-2 max-w-[80%]">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold shadow-xs">
                  AI
                </div>
                <div className="bg-white border border-slate-200/80 px-3 py-2 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-[10px] text-slate-400 ml-1.5">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTIONS CAROUSEL */}
          {suggestions.length > 0 && !loading && (
            <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold flex-shrink-0">
                <Sparkles className="w-3 h-3 text-blue-500" /> Suggested:
              </span>
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(sug)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* INPUT BAR */}
          <div className="p-3 bg-white border-t border-slate-200/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Ask about Leads, Statuses, Follow-ups..."
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                title="Send Message"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>

            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 px-0.5">
              <span>Only answers CRM & Lead queries</span>
              <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-mono">Gemini AI</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
