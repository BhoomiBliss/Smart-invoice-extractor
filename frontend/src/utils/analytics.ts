import type { DatabaseInvoice } from "../types/invoice";

type AnalyticsMap = Record<string, number>;

export interface AnalyticsSummary {
  monthly: AnalyticsMap;
  vendors: AnalyticsMap;
  categories: AnalyticsMap;
}

export function computeAnalytics(
  invoices: DatabaseInvoice[] | null | undefined,
): AnalyticsSummary {
  if (!Array.isArray(invoices)) {
    return {
      monthly: {},
      vendors: {},
      categories: {},
    };
  }

  const monthly: AnalyticsMap = {};
  const vendors: AnalyticsMap = {};
  const categories: AnalyticsMap = {};

  invoices.forEach((inv) => {
    const date = new Date(inv.created_at || Date.now());
    const month = Number.isNaN(date.getTime())
      ? new Date().toISOString().slice(0, 7)
      : date.toISOString().slice(0, 7);

    const amount = Number(inv.total_amount || inv.total || 0);
    const vendor = inv.vendor_name || "Unknown";
    const category =
      inv.raw_data?.suggested_category || inv.suggested_category || "General";

    monthly[month] = (monthly[month] || 0) + amount;
    vendors[vendor] = (vendors[vendor] || 0) + amount;
    categories[category] = (categories[category] || 0) + amount;
  });

  return {
    monthly,
    vendors,
    categories,
  };
}

export function generateInsights(data: AnalyticsSummary) {
  const insights: string[] = [];

  const topVendor = Object.entries(data.vendors).sort((a, b) => b[1] - a[1])[0];
  if (topVendor) {
    insights.push(`Top vendor: ${topVendor[0]} ($${topVendor[1].toFixed(2)})`);
  }

  const months = Object.entries(data.monthly).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  if (months.length >= 2) {
    const last = months[months.length - 1][1];
    const prev = months[months.length - 2][1];

    if (last > prev) {
      insights.push("Spending increased this month");
    } else if (last < prev) {
      insights.push("Spending decreased this month");
    } else {
      insights.push("Spending remained flat this month");
    }
  }

  const topCategory = Object.entries(data.categories).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (topCategory) {
    insights.push(`Strongest category: ${topCategory[0]}`);
  }

  return insights;
}

export function detectAnomalies(
  invoices: DatabaseInvoice[] | null | undefined,
): DatabaseInvoice[] {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return [];
  }

  const avg =
    invoices.reduce(
      (sum, invoice) => sum + Number(invoice.total_amount || invoice.total || 0),
      0,
    ) / invoices.length;

  return invoices.filter(
    (invoice) => Number(invoice.total_amount || invoice.total || 0) > avg * 2,
  );
}
