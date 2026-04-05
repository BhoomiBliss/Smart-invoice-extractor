import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  FileText,
  Home,
  LayoutGrid,
  Pin,
  Plus,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getGuestHistory } from "../lib/guestHistory";
import { useAuth } from "../context/AuthContext";
import type { DashboardView } from "../types/dashboard";
import type { DatabaseInvoice, InvoiceData } from "../types/invoice";
import { normalizeDatabaseInvoice } from "../utils/invoices";

interface SidebarChart {
  id: string;
  vendor_name: string;
  invoice_number: string;
  total_amount: number;
  created_at: string;
  raw_data: InvoiceData;
  fullInvoice: DatabaseInvoice;
  is_pinned?: boolean;
  status?: "verified" | "flagged" | "recent";
}

interface HistorySidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  onNewExtraction: () => void;
  user: any;
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onChartClick: (invoice: InvoiceData) => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: typeof Home;
  onClick: () => void;
  isActive: boolean;
};

const itemMotion = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
};

function createGuestChart(item: InvoiceData, index: number): SidebarChart {
  const id = String(
    (item as any)._id ||
      `guest-${(item as any)._created_at || item.date || index}-${index}`,
  );

  return {
    id,
    vendor_name: item.vendor || item.vendor_name || "Unknown Vendor",
    invoice_number: item.invoice_number || "N/A",
    total_amount: item.total || 0,
    created_at: (item as any)._created_at || new Date().toISOString(),
    raw_data: item,
    fullInvoice: normalizeDatabaseInvoice({
      id,
      vendor_name: item.vendor || item.vendor_name || "Unknown Vendor",
      invoice_number: item.invoice_number || "N/A",
      total: item.total || 0,
      total_amount: item.total || 0,
      created_at: (item as any)._created_at || new Date().toISOString(),
      raw_data: item,
      status: (item as any).status || "recent",
    }),
    is_pinned: false,
    status: ((item as any).status || "recent") as
      | "verified"
      | "flagged"
      | "recent",
  };
}

export default function HistorySidebar({
  isExpanded,
  onToggle,
  onNewExtraction,
  user,
  currentView,
  onViewChange,
  onChartClick,
}: HistorySidebarProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [charts, setCharts] = useState<SidebarChart[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sectionPadding = isExpanded ? "px-4" : "px-2";

  const fetchCharts = async () => {
    if (!user) {
      const guestData = getGuestHistory();

      setCharts(
        (Array.isArray(guestData) ? guestData : []).map(
          (item: InvoiceData, index: number) => createGuestChart(item, index),
        ),
      );
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (profile?.role === "admin") {
        query = supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCharts(
        (Array.isArray(data) ? data : []).map((item: any) => {
          const normalized = normalizeDatabaseInvoice(item);
          return {
            id: normalized.id,
            vendor_name: normalized.vendor_name || "Unknown Vendor",
            invoice_number:
              normalized.invoice_number ||
              normalized.raw_data?.invoice_number ||
              "N/A",
            total_amount: normalized.total_amount ?? normalized.total ?? 0,
            created_at: normalized.created_at,
            raw_data: normalized.raw_data || {},
            fullInvoice: normalized,
            is_pinned: normalized.is_pinned || false,
            status:
              (normalized.status as "verified" | "flagged" | "recent") ||
              "recent",
          };
        }),
      );
    } catch (err) {
      console.error("Error fetching charts:", err);
      setCharts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCharts();

    const handleHistoryUpdate = () => {
      void fetchCharts();
    };

    window.addEventListener("invoice-history-updated", handleHistoryUpdate);
    return () =>
      window.removeEventListener(
        "invoice-history-updated",
        handleHistoryUpdate,
      );
  }, [profile?.role, user]);

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      onClick: () => {
        onViewChange("upload");
        navigate("/");
      },
      isActive: currentView === "upload",
    },
    {
      id: "history",
      label: "Invoices",
      icon: FileText,
      onClick: () => {
        onViewChange("history");
        navigate("/history");
      },
      isActive: currentView === "history",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      onClick: () => {
        onViewChange("analytics");
        navigate("/analytics");
      },
      isActive: currentView === "analytics",
    },
  ];

  const groupedCharts = useMemo(() => {
    const groups: Record<string, SidebarChart[]> = {};

    charts.forEach((invoice) => {
      const key = invoice.vendor_name || "Unknown";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(invoice);
    });

    return groups;
  }, [charts]);

  const sortedCharts = useMemo(() => {
    return [...charts].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [charts, groupedCharts]);

  const filteredCharts = sortedCharts;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 260 : 72 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative z-20 hidden h-screen shrink-0 border-r border-slate-200/70 bg-white/96 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/5 dark:bg-[#0d1117]/96 md:flex"
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div
          className={`relative flex items-center py-4 ${
            isExpanded ? "justify-between px-4" : "justify-center px-2"
          }`}
        >
          <div
            className={`flex min-w-0 items-center ${
              isExpanded ? "gap-3" : "justify-center"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.8)]">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div {...itemMotion} transition={{ duration: 0.18 }}>
                  <div className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                    Smart Invoice
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Intelligence OS
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.04 }}
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 shadow-sm transition-all duration-200 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-white/5 ${
              isExpanded ? "" : "absolute right-2 top-4"
            }`}
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 0 : 180 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          </motion.button>
        </div>

        <div className={`${sectionPadding} pb-4`}>
          <button
            onClick={onNewExtraction}
            className={`group relative flex w-full items-center rounded-2xl py-3 text-white shadow-[0_18px_32px_-18px_rgba(37,99,235,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 ${
              isExpanded
                ? "justify-start gap-3 bg-blue-600 px-4"
                : "justify-center bg-blue-600 px-2"
            }`}
          >
            <Plus className="h-5 w-5" />
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.span
                  {...itemMotion}
                  transition={{ duration: 0.18 }}
                  className="text-[13px] font-black uppercase tracking-[0.18em]"
                >
                  New Extraction
                </motion.span>
              )}
            </AnimatePresence>
            {!isExpanded && (
              <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
                New Extraction
              </span>
            )}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${sectionPadding} pb-4`}>
          <div className="flex flex-col gap-6">
            <SidebarSection title="Navigation" isExpanded={isExpanded}>
              {navItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * index }}
                  onClick={item.onClick}
                  className={`group relative flex w-full items-center rounded-2xl py-3 text-left transition-all duration-200 ${
                    item.isActive
                      ? "bg-blue-50 text-blue-700 shadow-[0_8px_24px_-18px_rgba(37,99,235,0.45)] dark:bg-blue-500/10 dark:text-blue-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  } ${isExpanded ? "justify-start gap-3 px-4" : "justify-center px-2"}`}
                >
                  {item.isActive && (
                    <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
                  )}
                  <item.icon className="h-5 w-5 shrink-0" />
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.span
                        {...itemMotion}
                        transition={{ duration: 0.18 }}
                        className="text-[13px] font-semibold"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!isExpanded && (
                    <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
                      {item.label}
                    </span>
                  )}
                </motion.button>
              ))}
            </SidebarSection>

            <SidebarSection title="Recent Files" isExpanded={isExpanded}>
              <div className="flex flex-col gap-2">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className={`animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5 ${
                        isExpanded ? "h-14" : "h-12"
                      }`}
                    />
                  ))}

                {!isLoading &&
                  filteredCharts
                    .slice(0, 8)
                    .map((chart, index) => (
                      <SidebarInvoiceRow
                        key={chart.id}
                        chart={chart}
                        index={index}
                        isExpanded={isExpanded}
                        onOpen={() =>
                          onChartClick(
                            chart.fullInvoice.raw_data || chart.raw_data,
                          )
                        }
                      />
                    ))}

                {!isLoading && !filteredCharts.length && isExpanded && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-[11px] font-medium text-slate-400 dark:bg-white/5">
                    No extractions yet
                  </div>
                )}
              </div>
            </SidebarSection>
          </div>
        </div>

        <div
          className={`border-t border-slate-100 py-4 dark:border-white/5 ${sectionPadding}`}
        >
          <button
            onClick={() => navigate("/settings")}
            className={`group relative flex w-full items-center rounded-2xl py-3 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white ${
              isExpanded ? "gap-3 px-4" : "justify-center px-2"
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  {...itemMotion}
                  transition={{ duration: 0.18 }}
                  className="min-w-0"
                >
                  <div className="text-[13px] font-semibold">Settings</div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Preferences
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!isExpanded && (
              <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
                Settings
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

function SidebarInvoiceRow({
  chart,
  index,
  isExpanded,
  onOpen,
}: {
  chart: SidebarChart;
  index: number;
  isExpanded: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.02 * index }}
      onClick={onOpen}
      className={`group relative flex w-full items-center rounded-2xl py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 dark:hover:bg-white/5 ${
        isExpanded ? "gap-3 px-4" : "justify-center px-2"
      }`}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
        <FileText className="h-4 w-4" />
        {chart.is_pinned && (
          <Pin className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-amber-400 p-[2px] text-slate-900" />
        )}
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            {...itemMotion}
            transition={{ duration: 0.18 }}
            className="min-w-0 flex-1"
          >
            <div className="truncate text-[13px] font-semibold text-slate-700 dark:text-slate-100">
              {chart.vendor_name}
            </div>
            <div className="truncate text-[11px] font-medium text-slate-400">
              #{chart.invoice_number} · ${chart.total_amount.toLocaleString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isExpanded && (
        <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
          {chart.vendor_name}
        </span>
      )}
    </motion.button>
  );
}

function SidebarSection({
  title,
  isExpanded,
  children,
}: {
  title: string;
  isExpanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex items-center ${isExpanded ? "justify-between px-1" : "justify-center"}`}
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              {...itemMotion}
              transition={{ duration: 0.18 }}
              className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"
            >
              {title}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {children}
    </div>
  );
}
