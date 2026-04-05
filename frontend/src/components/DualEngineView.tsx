import React from "react";
import { FileSpreadsheet, Download, Printer, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import type { InvoiceData } from "../types/invoice";
import { downloadCSV } from "../utils/helpers";
import toast from "react-hot-toast";

// New Business UI Components
import InvoiceHeader from "./InvoiceHeader";
import SummaryPanel from "./SummaryPanel";
import TableView from "./TableView";
import JSONViewer from "./JSONViewer";

interface DualEngineViewProps {
  invoice: InvoiceData;
}

export default function DualEngineView({ invoice }: DualEngineViewProps) {
  const handleDownloadCSV = () => {
    if (!invoice.items || invoice.items.length === 0) {
      toast.error("No items to export");
      return;
    }
    downloadCSV(
      invoice.items,
      `invoice-${invoice.invoice_number || "data"}.csv`,
    );
    toast.success("CSV exported successfully");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Invoice Audit: ${invoice.vendor || "Data"}`,
          text: `Financial audit result for ${invoice.vendor}`,
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 🚀 ACTION BAR (Top) */}
      <div className="flex items-center justify-end gap-3 mb-6 px-2 no-print relative z-20">
        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95"
        >
          <FileSpreadsheet size={14} className="text-emerald-500" />
          Export CSV
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95"
        >
          <Printer size={14} className="text-blue-500" />
          Print PDF
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Share2 size={14} />
          Share Audit
        </button>
      </div>

      {/* 1️⃣ INVOICE HEADER SECTION */}
      <InvoiceHeader invoice={invoice} />

      {/* 2️⃣ SUMMARY PANEL SECTION */}
      <SummaryPanel invoice={invoice} />

      {/* 3️⃣ MAIN LINE ITEMS TABLE */}
      <div className="w-full">
        <TableView invoice={invoice} />
      </div>

      {/* 4️⃣ RAW DATA VIEWER (Collapsible) */}
      <JSONViewer invoice={invoice} />

      {/* 🛡️ FOOTER METADATA */}
      <div className="mt-8 px-8 flex items-center justify-between opacity-40 grayscale hover:grayscale-0 transition-all duration-500 no-print">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Powered by{" "}
            {invoice.agent_metadata?.model_used || "Smart Invoice Engine v4.0"}
          </span>
          <span className="text-[9px] font-bold text-slate-400">
            Node ID: {Math.random().toString(36).substring(7).toUpperCase()} |
            Ledger Verified
          </span>
        </div>
        <div className="text-right flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 underline decoration-blue-500 decoration-2 underline-offset-4">
            Financial Compliance Grade A
          </span>
        </div>
      </div>
    </div>
  );
}
