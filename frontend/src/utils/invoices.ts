import type {
  DatabaseInvoice,
  InvoiceData,
  InvoiceItem,
} from "../types/invoice";

const toNumber = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[^0-9.-]/g, ""))
        : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeItem = (
  item: InvoiceItem | Record<string, unknown>,
): InvoiceItem => ({
  description:
    typeof item.description === "string" && item.description.trim()
      ? item.description.trim()
      : "Item",
  quantity: toNumber(
    item.quantity ?? (item as Record<string, unknown>).qty ?? 0,
  ),
  unit_price: toNumber(
    item.unit_price ??
      (item as Record<string, unknown>).unitPrice ??
      (item as Record<string, unknown>).rate ??
      0,
  ),
  total: toNumber(
    item.total ??
      (item as Record<string, unknown>).line_total ??
      (item as Record<string, unknown>).amount ??
      0,
  ),
});

export const normalizeInvoiceData = (
  invoice: Partial<InvoiceData> | null | undefined,
  fallback?: Partial<DatabaseInvoice>,
): InvoiceData => {
  const items = Array.isArray(invoice?.items)
    ? invoice.items.map((item) => normalizeItem(item))
    : [];

  const vendor =
    invoice?.vendor ??
    invoice?.vendor_name ??
    fallback?.vendor_name ??
    "Unknown Vendor";
  const invoiceDate =
    invoice?.date ??
    invoice?.invoice_date ??
    fallback?.invoice_date ??
    undefined;
  const total =
    invoice?.total ??
    fallback?.total ??
    fallback?.total_amount ??
    items.reduce((sum, item) => sum + toNumber(item.total), 0);
  const normalizedVendor = String(vendor).toLowerCase();
  const suggestedCategory =
    invoice?.suggested_category ??
    fallback?.suggested_category ??
    (normalizedVendor.includes("fuel")
      ? "transport"
      : normalizedVendor.includes("hotel")
        ? "travel"
        : "general");

  return {
    ...invoice,
    vendor,
    vendor_name: vendor,
    suggested_category: suggestedCategory,
    date: invoiceDate,
    invoice_date: invoiceDate,
    invoice_number:
      invoice?.invoice_number ?? fallback?.invoice_number ?? undefined,
    due_date: invoice?.due_date ?? undefined,
    subtotal: toNumber(invoice?.subtotal),
    tax_rate: toNumber(invoice?.tax_rate),
    tax: toNumber(invoice?.tax),
    shipping: toNumber(invoice?.shipping),
    discount: toNumber(invoice?.discount),
    total: toNumber(total),
    calculated_total: toNumber(invoice?.calculated_total),
    is_total_corrected: Boolean(invoice?.is_total_corrected),
    currency: invoice?.currency ?? "USD",
    items,
    status: invoice?.status ?? fallback?.status ?? "recent",
    file_url: invoice?.file_url ?? fallback?.file_url ?? null,
    agent_metadata: invoice?.agent_metadata,
  };
};

export const normalizeDatabaseInvoice = (invoice: any): DatabaseInvoice => {
  const rawData = normalizeInvoiceData(invoice?.raw_data, invoice);
  const vendorName =
    invoice?.vendor_name ?? rawData.vendor_name ?? "Unknown Vendor";
  const totalAmount = toNumber(
    invoice?.total_amount ?? invoice?.total ?? rawData.total,
  );
  const invoiceDate =
    invoice?.invoice_date ?? rawData.invoice_date ?? rawData.date ?? null;
  const vendorKey = String(vendorName)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const createdAt = invoice?.created_at ?? new Date().toISOString();
  const createdDate = new Date(createdAt);
  const monthKey = `${createdDate.getFullYear()}-${createdDate.getMonth() + 1}`;
  const category =
    totalAmount > 5000
      ? "high_value"
      : totalAmount > 1000
        ? "medium_value"
        : "low_value";

  return {
    id: String(invoice?.id ?? ""),
    user_id: invoice?.user_id ?? null,
    vendor_name: vendorName,
    vendor_key: vendorKey,
    invoice_number: invoice?.invoice_number ?? rawData.invoice_number ?? null,
    total_amount: totalAmount,
    total: toNumber(invoice?.total ?? rawData.total),
    invoice_date: invoiceDate,
    month_key: monthKey,
    category,
    raw_data: rawData,
    image_url: invoice?.image_url ?? null,
    file_url: invoice?.file_url ?? rawData.file_url ?? null,
    created_at: createdAt,
    status: invoice?.status ?? rawData.status ?? "recent",
    suggested_category:
      invoice?.suggested_category ?? rawData.suggested_category ?? null,
    folder_id: invoice?.folder_id ?? null,
    is_pinned: Boolean(invoice?.is_pinned),
  };
};

export const getInvoiceTotal = (
  invoice: Partial<DatabaseInvoice> | InvoiceData,
): number => {
  if ("total_amount" in invoice || "raw_data" in invoice) {
    const dbInvoice = invoice as Partial<DatabaseInvoice>;
    return toNumber(
      dbInvoice.total_amount ?? dbInvoice.total ?? dbInvoice.raw_data?.total,
    );
  }

  return toNumber((invoice as InvoiceData).total);
};

export const getInvoiceVendor = (
  invoice: Partial<DatabaseInvoice> | InvoiceData,
): string => {
  if ("vendor_name" in invoice && invoice.vendor_name) {
    return invoice.vendor_name;
  }

  const rawData = "raw_data" in invoice ? invoice.raw_data : undefined;
  return (
    rawData?.vendor ??
    rawData?.vendor_name ??
    (invoice as InvoiceData).vendor ??
    (invoice as InvoiceData).vendor_name ??
    "Unknown Vendor"
  );
};

export const getInvoiceDateLabel = (
  invoice: Partial<DatabaseInvoice> | InvoiceData,
): string => {
  if ("invoice_date" in invoice && invoice.invoice_date) {
    return invoice.invoice_date;
  }

  const rawData = "raw_data" in invoice ? invoice.raw_data : undefined;
  return (
    rawData?.date ??
    rawData?.invoice_date ??
    (invoice as InvoiceData).date ??
    (invoice as InvoiceData).invoice_date ??
    "N/A"
  );
};

export const getInvoiceCategory = (
  invoice: Partial<DatabaseInvoice> | InvoiceData,
): string => {
  if ("suggested_category" in invoice && invoice.suggested_category) {
    return invoice.suggested_category;
  }

  const rawData = "raw_data" in invoice ? invoice.raw_data : undefined;
  return (
    rawData?.suggested_category ??
    (invoice as InvoiceData).suggested_category ??
    "Uncategorized"
  );
};

export const getMonthlySpend = (invoices: DatabaseInvoice[]) => {
  const map: Record<string, number> = {};

  invoices.forEach((invoice) => {
    const createdAt = invoice.created_at ? new Date(invoice.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return;
    }

    const key = `${createdAt.getFullYear()}-${String(
      createdAt.getMonth() + 1,
    ).padStart(2, "0")}`;

    map[key] = (map[key] || 0) + getInvoiceTotal(invoice);
  });

  return Object.entries(map)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

export const getVendorBreakdown = (invoices: DatabaseInvoice[]) => {
  const map: Record<string, number> = {};

  invoices.forEach((invoice) => {
    const vendor = getInvoiceVendor(invoice);
    map[vendor] = (map[vendor] || 0) + getInvoiceTotal(invoice);
  });

  return Object.entries(map)
    .map(([vendor, total]) => ({ vendor, total }))
    .sort((a, b) => b.total - a.total);
};
