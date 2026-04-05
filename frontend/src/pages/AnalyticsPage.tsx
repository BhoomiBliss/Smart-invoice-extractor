import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Building2, Receipt, Wallet } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { DatabaseInvoice } from "../types/invoice";
import { getInvoiceTotal, normalizeDatabaseInvoice } from "../utils/invoices";
import {
  computeAnalytics,
  detectAnomalies,
  generateInsights,
} from "../utils/analytics";

const COLORS = [
  "#2563eb",
  "#0f766e",
  "#7c3aed",
  "#ea580c",
  "#dc2626",
  "#0891b2",
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export default function AnalyticsPage() {
  const { user, profile } = useAuth();
  const [invoices, setInvoices] = useState<DatabaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const sessionUserId = user?.id ?? null;
      const isAdmin = profile?.role === "admin";

      if (!sessionUserId) {
        const guestHistory = JSON.parse(
          localStorage.getItem("guest_history") || "[]",
        );
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
                    row._extracted_at ||
                    row.created_at ||
                    new Date().toISOString(),
                  raw_data: row,
                  folder_id: row.folder_id || null,
                  suggested_category: row.suggested_category || null,
                }),
              )
            : [],
        );
        setTotalUsers(0);
        return;
      }

      let query = supabase.from("invoices").select("*").order("created_at", {
        ascending: false,
      });

      if (!isAdmin) {
        query = query.eq("user_id", sessionUserId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (isAdmin) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });
        setTotalUsers(count || 0);
      } else {
        setTotalUsers(0);
      }

      setInvoices(
        Array.isArray(data)
          ? data.map((row) => normalizeDatabaseInvoice(row))
          : [],
      );
    } catch (err) {
      console.error("Analytics fetch error:", err);
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

  const analytics = useMemo(() => computeAnalytics(invoices), [invoices]);

  const monthlyChartData = useMemo(
    () =>
      Object.entries(analytics.monthly)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, value]) => ({ month, value })),
    [analytics.monthly],
  );

  const vendorChartData = useMemo(
    () =>
      Object.entries(analytics.vendors)
        .map(([vendor, total]) => ({ vendor, total }))
        .sort((a, b) => b.total - a.total),
    [analytics.vendors],
  );

  const categoryChartData = useMemo(
    () =>
      Object.entries(analytics.categories)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total),
    [analytics.categories],
  );

  const pieChartData = categoryChartData.slice(0, 6);
  const totalSpend = invoices.reduce(
    (sum, inv) => sum + getInvoiceTotal(inv),
    0,
  );
  const totalInvoices = invoices.length;
  const avgInvoiceValue = totalSpend / (totalInvoices || 1);
  const currentMonthSpend =
    monthlyChartData[monthlyChartData.length - 1]?.value || 0;
  const previousMonthSpend =
    monthlyChartData[monthlyChartData.length - 2]?.value || 0;
  const topVendor = vendorChartData[0]?.vendor || null;
  const trendPercent =
    previousMonthSpend > 0
      ? ((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100
      : 0;
  const anomalies = useMemo(() => detectAnomalies(invoices), [invoices]);
  const insights = useMemo(() => {
    const baseInsights = generateInsights(analytics);

    if (previousMonthSpend > 0) {
      baseInsights.unshift(
        `Spending ${trendPercent >= 0 ? "increased" : "decreased"} ${Math.abs(
          trendPercent,
        ).toFixed(0)}% this month`,
      );
    }

    if (anomalies.length > 0) {
      baseInsights.push("High-value transactions detected");
    }

    return baseInsights;
  }, [analytics, anomalies.length, previousMonthSpend, trendPercent]);

  const hasData = invoices.length > 0;
  const isAdmin = profile?.role === "admin";
  const cards = [
    {
      label: "Total Spend",
      value: formatMoney(totalSpend),
      icon: Wallet,
    },
    {
      label: "Total Invoices",
      value: String(totalInvoices),
      icon: Receipt,
    },
    {
      label: "Avg Invoice Value",
      value: formatMoney(avgInvoiceValue),
      icon: Building2,
    },
    ...(isAdmin
      ? [
          {
            label: "Total Users",
            value: String(totalUsers),
            icon: BarChart3,
          },
        ]
      : []),
  ];

  return (
    <div className="flex w-full flex-1 flex-col px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-[#10182a]/90"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
                  <card.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  KPI
                </span>
              </div>
              <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {loading ? "--" : card.value}
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {!loading && !hasData ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[32px] border border-dashed border-slate-300/80 bg-white/70 px-8 text-center dark:border-white/10 dark:bg-[#10182a]/70">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                No financial data yet
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Upload invoices to unlock monthly spend, vendor trends, and
                distribution insights.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-[32px] border border-slate-200/70 bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white shadow-[0_20px_40px_-20px_rgba(15,23,42,0.45)] dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.25em] text-blue-200">
                    Smart Insights
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {topVendor
                      ? `${topVendor} leads your financial activity.`
                      : "Your financial insights will appear here."}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(insights.length
                    ? insights
                    : ["Upload invoices to unlock trend intelligence."]
                  ).map((insight) => (
                    <span
                      key={insight}
                      className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em]"
                    >
                      {insight}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {anomalies.length > 0 && (
              <div className="rounded-[32px] border border-amber-200/70 bg-amber-50/80 p-5 shadow-[0_12px_30px_-18px_rgba(245,158,11,0.45)] dark:border-amber-400/20 dark:bg-amber-500/10">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
                  High-value transactions detected
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {anomalies.slice(0, 3).map((invoice) => (
                    <span
                      key={invoice.id}
                      className="rounded-full border border-amber-300/60 bg-white/80 px-4 py-2 text-[11px] font-bold text-amber-700 dark:border-amber-300/10 dark:bg-white/5 dark:text-amber-200"
                    >
                      {(invoice.vendor_name || "Unknown") +
                        " " +
                        formatMoney(getInvoiceTotal(invoice))}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[32px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-[#10182a]/90">
              <div className="mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Monthly Spend
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Spending trend across recent invoice activity
                </p>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#cbd5e1"
                      opacity={0.25}
                    />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value || 0))}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#2563eb" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[32px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-[#10182a]/90">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Top Vendors
                  </h2>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Highest spend by vendor
                  </p>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={vendorChartData.slice(0, 6)}
                      layout="vertical"
                      margin={{ left: 16 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#cbd5e1"
                        opacity={0.2}
                      />
                      <XAxis type="number" stroke="#64748b" />
                      <YAxis
                        type="category"
                        dataKey="vendor"
                        width={110}
                        stroke="#64748b"
                      />
                      <Tooltip
                        formatter={(value) => formatMoney(Number(value || 0))}
                      />
                      <Bar
                        dataKey="total"
                        fill="#0f766e"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-[#10182a]/90">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Category Distribution
                  </h2>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Share of spend by category
                  </p>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="total"
                        nameKey="category"
                        innerRadius={68}
                        outerRadius={108}
                        paddingAngle={2}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={entry.category}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatMoney(Number(value || 0))}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
