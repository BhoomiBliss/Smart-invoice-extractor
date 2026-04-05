import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { getGuestHistory } from "../lib/guestHistory";
import {
  Search,
  Eye,
  ExternalLink,
  Calendar,
  FileText,
  ChevronRight,
  FileSearch,
} from "lucide-react";
import { motion } from "framer-motion";
import AuditResultModal from "./AuditResultModal";
import type { DatabaseInvoice } from "../types/invoice";
import { useAuth } from "../context/AuthContext";
import {
  getInvoiceDateLabel,
  getInvoiceCategory,
  getInvoiceTotal,
  normalizeDatabaseInvoice,
} from "../utils/invoices";

const MetadataList = ({
  data,
  searchTerm,
}: {
  data: any;
  searchTerm: string;
}) => {
  const flattened =
    data && typeof data === "object"
      ? Object.entries(data)
          .filter(([key]) => key !== "items" && key !== "agent_metadata")
          .filter(([key, value]) => {
            const valStr = String(value).toLowerCase();
            const keyStr = key.toLowerCase();
            return (
              keyStr.includes(searchTerm.toLowerCase()) ||
              valStr.includes(searchTerm.toLowerCase())
            );
          })
      : [];

  if (flattened.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {flattened.map(([key, value]) => (
        <div
          key={key}
          className="group flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] transition-all hover:border-blue-300 dark:border-white/5 dark:bg-white/5 dark:hover:border-blue-500/30"
        >
          <span className="font-extrabold uppercase tracking-tighter text-slate-400 group-hover:text-blue-500">
            {key.replace(/_/g, " ")}:
          </span>
          <span className="max-w-[120px] truncate font-medium text-slate-700 dark:text-slate-300">
            {String(value)}
          </span>
        </div>
      ))}
    </div>
  );
};

interface IntelligenceLedgerProps {}

export default function IntelligenceLedger({}: IntelligenceLedgerProps) {
  const { user, profile } = useAuth();
  const [invoices, setInvoices] = useState<DatabaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<DatabaseInvoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const userId = user?.id ?? null;
      const isAdmin = profile?.role === "admin";

      if (!userId) {
        const guestHistory = getGuestHistory();
        setInvoices(
          Array.isArray(guestHistory)
            ? guestHistory.map((row: any, index: number) =>
                normalizeDatabaseInvoice({
                  id:
                    row.id ||
                    `guest-${row._extracted_at || row.date || index}-${index}`,
                  vendor_name:
                    row.vendor_name || row.vendor || "Unknown Vendor",
                  total: row.total || 0,
                  total_amount: row.total || 0,
                  invoice_number: row.invoice_number || null,
                  invoice_date: row.invoice_date || row.date || null,
                  created_at:
                    row._created_at ||
                    row.created_at ||
                    new Date().toISOString(),
                  raw_data: row,
                  suggested_category: row.suggested_category || null,
                }),
              )
            : [],
        );
        return;
      }

      let query = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(
        Array.isArray(data)
          ? data.map((row) => normalizeDatabaseInvoice(row))
          : [],
      );
    } catch (err) {
      console.error("Fetch invoices error:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInvoices();

    const handleHistoryUpdate = () => {
      void fetchInvoices();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void fetchInvoices();
    });

    window.addEventListener("invoice-history-updated", handleHistoryUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(
        "invoice-history-updated",
        handleHistoryUpdate,
      );
    };
  }, [profile?.role, user?.id]);

  console.log("Invoices:", invoices);

  const filteredInvoices = useMemo(() => {
    const source = Array.isArray(invoices) ? invoices : [];
    const searchQuery = searchTerm.trim();

    if (!searchQuery) return source;

    const q = searchQuery.toLowerCase();

    return source.filter((inv) => {
      const vendor = inv.vendor_name?.toLowerCase() || "";
      const vendorKey = inv.vendor_key?.toLowerCase() || "";
      const number = inv.invoice_number?.toLowerCase() || "";
      const amountValue = inv.total_amount || inv.total || 0;
      const amount = String(amountValue);
      const date = (inv.created_at || "").toLowerCase();
      const monthKey = (inv.month_key || "").toLowerCase();
      const invoiceDate = getInvoiceDateLabel(inv).toLowerCase();
      const category = getInvoiceCategory(inv).toLowerCase();

      if (q.startsWith(">")) {
        return amountValue > Number(q.slice(1));
      }

      if (q.startsWith("<")) {
        return amountValue < Number(q.slice(1));
      }

      return (
        vendor.includes(q) ||
        vendorKey.includes(q.replace(/[^a-z0-9]/g, "")) ||
        number.includes(q) ||
        amount.includes(q) ||
        date.includes(q) ||
        invoiceDate.includes(q) ||
        monthKey.includes(q) ||
        category.includes(q)
      );
    });
  }, [invoices, searchTerm]);

  const filteredByType = useMemo(() => {
    if (!filterType) return filteredInvoices;

    if (filterType === "recent") {
      return filteredInvoices.slice(0, 5);
    }

    if (filterType === "high") {
      return filteredInvoices.filter(
        (invoice) => (invoice.total_amount || 0) > 5000,
      );
    }

    return filteredInvoices;
  }, [filteredInvoices, filterType]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);
  };

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-[24px] border-0 bg-[#ffffff] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.04)] dark:bg-[#151c2c]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="flex items-center justify-between border-b-0 bg-[#f2f4f6]/50 px-10 py-4 select-none dark:bg-white/[0.02]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Nodes Active:
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-blue-600 dark:text-blue-400">
              1
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Records Indexed:
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-slate-900 dark:text-white">
              {invoices.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Latency:
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest leading-none text-emerald-600 dark:text-emerald-400">
            24ms
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 px-10 py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-blue-500 shadow-xl shadow-blue-500/20">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h2
              className="text-[20px] font-black leading-tight text-slate-900 dark:text-white"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Financial Audit Ledger
            </h2>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Primary Extraction History
            </p>
          </div>
        </div>

        <div className="relative max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor, amount, date, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-[800px] w-full border-collapse text-left">
          <thead>
            <tr className="border-0 bg-transparent">
              <th
                className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Document
              </th>
              <th
                className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Vendor Intelligence
              </th>
              <th
                className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Posting Date
              </th>
              <th
                className="px-6 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Settlement Total
              </th>
              <th
                className="px-10 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td
                    colSpan={5}
                    className="px-8 py-10 text-center font-medium text-slate-400"
                  >
                    Loading ledger records...
                  </td>
                </tr>
              ))
            ) : filteredByType.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-32 text-center select-none">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                        <Search
                          className="h-10 w-10 text-slate-300 dark:text-slate-700"
                          strokeWidth={1.5}
                        />
                      </div>
                      <motion.div
                        animate={{ x: [0, 6, 0], y: [0, 4, 0] }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="absolute -right-1 -top-1 flex h-16 w-12 items-center justify-center rounded-lg border-2 border-slate-100 bg-white shadow-xl dark:border-white/10 dark:bg-[#151c2c]"
                      >
                        <FileText className="h-6 w-6 text-blue-500" />
                      </motion.div>
                    </div>
                    <div className="max-w-[320px] flex flex-col gap-1">
                      <h3
                        className="text-[18px] font-black tracking-tight text-slate-900 dark:text-white"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        Your Intelligence Ledger is ready.
                      </h3>
                      <p className="text-[13px] font-bold leading-relaxed text-slate-400">
                        Upload an invoice to begin auditing and building your
                        financial intelligence history.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredByType.map((inv, idx) => (
                <motion.tr
                  key={inv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`${idx % 2 === 0 ? "bg-[#ffffff]" : "bg-[#f2f4f6]/40"} dark:${idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"} group relative transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-500/5`}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-colors group-hover:border-blue-300 dark:border-white/10 dark:bg-white/10">
                        {(() => {
                          const url = inv.image_url || inv.file_url;
                          const isPdf = url?.toLowerCase().endsWith(".pdf");

                          if (!url) {
                            return (
                              <div className="flex h-full w-full items-center justify-center">
                                <FileText className="h-6 w-6 text-slate-400" />
                              </div>
                            );
                          }

                          if (isPdf) {
                            return (
                              <div className="flex h-full w-full items-center justify-center bg-blue-50 dark:bg-blue-900/10">
                                <FileSearch className="h-6 w-6 text-blue-500" />
                              </div>
                            );
                          }

                          return (
                            <img
                              src={url}
                              alt="Invoice"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.visibility = "hidden";
                                (e.target as HTMLImageElement).parentElement!.style.backgroundColor = "transparent";
                              }}
                            />
                          );
                        })()}
                        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-slate-900/40 to-transparent pb-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <ExternalLink className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
                          INV-{(inv.id || "----").slice(0, 4)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                          TYPE: FINANCIAL_TAX_DOC
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="min-w-[250px] px-6 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[14px] font-extrabold text-slate-900 dark:text-white"
                          style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                          {inv.vendor_name || "Unknown Provider"}
                        </span>
                        {inv.raw_data?.invoice_number && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-slate-500 dark:bg-white/10">
                            #{inv.raw_data.invoice_number}
                          </span>
                        )}
                      </div>
                      <MetadataList
                        data={inv.raw_data}
                        searchTerm={searchTerm}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-[13px] font-bold">
                          {getInvoiceDateLabel(inv)}
                        </span>
                      </div>
                      <span className="pl-5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Post Sequence
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="rounded-xl bg-blue-600 px-3 py-1.5 text-[14px] font-black text-white shadow-lg shadow-blue-500/20"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        {formatCurrency(getInvoiceTotal(inv))}
                      </span>
                      {inv.raw_data?.currency && (
                        <span className="pr-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                          SETTLED IN {inv.raw_data.currency || "USD"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setIsModalOpen(true);
                      }}
                      className="group/btn inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-extrabold text-white shadow-md transition-all hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                      <ChevronRight className="h-3.5 w-3.5 translate-x-0 transition-transform group-hover/btn:translate-x-0.5" />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <AuditResultModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          invoice={selectedInvoice}
        />
      )}

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:border-white/5 dark:bg-white/2">
        <div className="flex gap-6">
          <span>Active Nodes: 1</span>
          <span>Records Indexed: {invoices.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          <span>Real-time Sync Active</span>
        </div>
      </div>
    </div>
  );
}
