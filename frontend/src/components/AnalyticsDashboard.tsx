import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Building2, Receipt, Wallet } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { DatabaseInvoice } from "../types/invoice";
import {
  getInvoiceTotal,
  getMonthlySpend,
  getVendorBreakdown,
  normalizeDatabaseInvoice,
} from "../utils/invoices";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const tooltipFormatter = (value: unknown) => formatMoney(Number(value ?? 0));

export default function AnalyticsDashboard() {
  const [invoices, setInvoices] = useState<DatabaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setInvoices([]);
        return;
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

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
  }, []);

  const monthlyData = getMonthlySpend(invoices);
  const vendorBreakdown = getVendorBreakdown(invoices);
  const vendorChartData = vendorBreakdown.slice(0, 5);
  const totalSpend = invoices.reduce(
    (sum, invoice) => sum + getInvoiceTotal(invoice),
    0,
  );
  const totalInvoices = invoices.length;
  const avgInvoice = totalSpend / (totalInvoices || 1);
  const topVendor = vendorBreakdown[0]?.vendor || null;
  const insights = [
    totalSpend > 5000 ? "High spending detected this month" : null,
    topVendor ? `Top vendor: ${topVendor}` : null,
  ].filter(Boolean);

  return (
    <div className="w-full mb-10 grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Spend",
            value: formatMoney(totalSpend),
            icon: Wallet,
          },
          {
            label: "Invoice Count",
            value: totalInvoices.toString(),
            icon: Receipt,
          },
          {
            label: "Average Invoice",
            value: formatMoney(avgInvoice),
            icon: Building2,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[28px] border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-[#10182a]/90 p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                <card.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                KPI
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? "--" : card.value}
            </div>
            <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="rounded-[32px] border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-[#10182a]/90 p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Monthly Spend
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Spend trend by month
              </p>
            </div>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  opacity={0.35}
                />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip formatter={tooltipFormatter} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#2563eb" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-[#10182a]/90 p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Vendor Breakdown
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Top vendors by spend
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
              Top 5
            </span>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={vendorChartData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#cbd5e1"
                  opacity={0.2}
                />
                <XAxis type="number" stroke="#64748b" />
                <YAxis
                  dataKey="vendor"
                  type="category"
                  width={90}
                  stroke="#64748b"
                />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="total" fill="#0f766e" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200/70 dark:border-white/10 bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white shadow-[0_20px_40px_-20px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-200 mb-2">
              Smart Insights
            </div>
            <div className="text-2xl font-black tracking-tight">
              {topVendor
                ? `${topVendor} leads your ledger.`
                : "No vendor signals yet."}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {(insights.length
              ? insights
              : ["Upload invoices to unlock analytics insights."]
            ).map((insight) => (
              <span
                key={insight}
                className="px-4 py-2 rounded-full bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.18em]"
              >
                {insight}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
