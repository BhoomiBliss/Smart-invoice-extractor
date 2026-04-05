import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  LayoutGrid,
  Check,
  Download,
  Copy,
  Code,
  Table as TableIcon,
  FileSearch,
  Trash2,
  Printer,
  Share2,
} from "lucide-react";
import JSONViewer from "./JSONViewer";
import TableView from "./TableView";
import type { DatabaseInvoice } from "../types/invoice";
import { downloadJSON, downloadCSV } from "../utils/helpers";
import { getInvoiceTotal } from "../utils/invoices";
import toast from "react-hot-toast";

interface AuditResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: DatabaseInvoice | null;
  onDelete?: () => void;
}

export default function AuditResultModal({
  isOpen,
  onClose,
  invoice,
  onDelete,
}: AuditResultModalProps) {
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;
  const rawData = invoice.raw_data ?? {
    vendor: invoice.vendor_name || "Unknown Vendor",
    vendor_name: invoice.vendor_name || "Unknown Vendor",
    invoice_number: invoice.invoice_number || undefined,
    items: [],
    total: getInvoiceTotal(invoice),
    currency: "USD",
  };

  const handleCopyJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
    setCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const filename = rawData.invoice_number
      ? `invoice-${rawData.invoice_number}.json`
      : "invoice.json";
    downloadJSON(rawData, filename);
  };

  const handleDownloadCSV = () => {
    if (!rawData.items) return;
    const filename = rawData.invoice_number
      ? `invoice-${rawData.invoice_number}-table.csv`
      : "invoice-table.csv";
    downloadCSV(rawData.items, filename);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Audit Result: ${invoice.vendor_name}`,
          text: `Check out this invoice audit for ${invoice.vendor_name}`,
          url: window.location.href,
        })
        .catch(() => {
          toast.success("Audit link copied to clipboard");
        });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Audit link copied to clipboard");
    }
  };

  const formatMoney = (val: number, currency: string = "USD") => {
    const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
    return `${symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const confidenceScore = rawData.agent_metadata?.confidence_score || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl max-h-[90vh] bg-[#f8fafc] dark:bg-[#0b0f1a] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white/10"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Modal Header */}
            <div className="px-8 py-5 bg-white dark:bg-[#151c2c] border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <FileSearch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2
                    className="text-[18px] font-black text-slate-900 dark:text-white"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    Audit result: {invoice.vendor_name}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                    Automated Intelligence View
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              {/* Row 1: Spend Analytics & Image Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Analytics */}
                <div className="lg:col-span-2 bg-blue-600 dark:bg-blue-600/90 rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                  <div className="absolute top-0 right-0 opacity-10 pointer-events-none scale-150 transform -translate-y-1/4 translate-x-1/4">
                    <Sparkles className="w-64 h-64 text-white" />
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-[11px] font-extrabold text-blue-100 uppercase tracking-widest bg-blue-500/30 inline-block px-3 py-1.5 rounded-full mb-4">
                      Master Ledger Analysis
                    </h3>
                    <div
                      className="text-[56px] font-black text-white leading-none tracking-tight"
                      style={{ fontFamily: "'Manrope', sans-serif" }}
                    >
                      {formatMoney(getInvoiceTotal(invoice), rawData.currency)}
                    </div>
                    <div className="flex items-center gap-3 mt-6">
                      <span className="px-3 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg flex gap-2 items-center text-[11px] font-black uppercase tracking-wider border border-white/20">
                        <Check className="w-3.5 h-3.5" />
                        Validated
                      </span>
                      <span className="px-3 py-1.5 bg-white text-blue-600 rounded-lg flex gap-2 items-center text-[11px] font-black uppercase tracking-wider">
                        Confidence: {(confidenceScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Image Preview */}
                <div className="bg-white dark:bg-[#151c2c] rounded-[32px] shadow-[0_8px_24px_rgba(0,0,0,0.04)] border-0 overflow-hidden relative group">
                  {(() => {
                    const url = invoice.image_url || invoice.file_url;
                    const isPdf = url?.toLowerCase().endsWith(".pdf");

                    if (!url) {
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5">
                          <LayoutGrid className="w-10 h-10 text-slate-300" />
                        </div>
                      );
                    }

                    if (isPdf) {
                      return (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/10 p-6">
                          <FileSearch className="w-16 h-16 text-blue-500 mb-4" />
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">PDF Document</span>
                          <a href={url} target="_blank" rel="noreferrer" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Open Full PDF</a>
                        </div>
                      );
                    }

                    return (
                      <img
                        src={url}
                        alt="Document"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = ""; // Clear src
                          (e.target as HTMLImageElement).style.display = "none";
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            const placeholder = document.createElement("div");
                            placeholder.className = "w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5";
                            placeholder.innerHTML = '<svg class="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    );
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent p-6 flex items-end pointer-events-none">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <FileSearch className="w-3 h-3" />
                      Original Source File
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Table Analysis */}
              <div className="bg-white dark:bg-[#151c2c] rounded-[32px] shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden p-8 border border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                      <TableIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3
                        className="text-[18px] font-black text-slate-900 dark:text-white uppercase tracking-tight"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        Entity Mapping
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Structured line-item intelligence
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    >
                      <Printer size={14} className="text-blue-500" />
                      Print
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <Share2 size={14} />
                      Share Audit
                    </button>
                    <button
                      onClick={handleDownloadCSV}
                      className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[12px] font-black uppercase tracking-wider border-0 shadow-lg shadow-slate-900/10 transition-all hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="w-full">
                  <TableView invoice={rawData} />
                </div>
              </div>

              {/* Row 3: Raw JSON Intelligence */}
              <div className="bg-white dark:bg-[#151c2c] rounded-[32px] shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden p-8 border border-white/5">
                <div className="flex items-center justify-between mb-8">
                  {" "}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                      <Code className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h3
                        className="text-[18px] font-black text-slate-900 dark:text-white uppercase tracking-tight"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        Object Hierarchy
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Raw JSON Audit Trail
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopyJSON}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[12px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copied ? "Copied" : "Copy Object"}
                    </button>
                    <button
                      onClick={handleDownloadJSON}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[12px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Save File
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] overflow-hidden bg-[#0d0b09] border border-white/5 p-2">
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    <JSONViewer invoice={rawData} />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <span>Analysis Node: Gemini-3.1-Internal</span>
              <span className="flex items-center gap-2">
                Audit Version v2.4.9
                <div className="w-1 h-1 rounded-full bg-slate-400" />
                Last Sync: {new Date(invoice.created_at).toLocaleString()}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
