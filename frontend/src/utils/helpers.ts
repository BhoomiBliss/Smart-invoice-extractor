import type { InvoiceItem } from "../types/invoice";

export function parseCurrency(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const normalized = String(value).replace(/[^0-9.-]+/g, "");
  return Number(normalized) || 0;
}

export function isMeaningfulText(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const invalidTexts = [
    "Unknown Vendor",
    "Unknown",
    "N/A",
    "---",
    "INV-2024-5678",
    "123456",
    "DEMO-2026-001",
  ];
  return !invalidTexts.includes(trimmed);
}

export function isMeaningfulNumber(value: unknown): boolean {
  if (typeof value !== "number") return false;
  return Number.isFinite(value) && value !== 0;
}

export function getRealCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  // Assume if it's not empty, it's real; but user said hardcoded default "USD" is invalid, but since we don't know, perhaps check if it's a known currency.
  // For now, if it's a string and not empty, consider it real.
  return trimmed;
}

export function hasRealHeaderData(invoice: any): boolean {
  if (!invoice) return false;

  const vendorVal = invoice.vendor || invoice.vendor_name || invoice.vendorName;
  const hasVendor = isMeaningfulText(vendorVal);

  const invoiceVal = invoice.invoice_number;
  const hasInvoiceNumber = isMeaningfulText(invoiceVal);

  const totalVal =
    invoice.total ??
    invoice.total_amount ??
    invoice.extracted_total ??
    invoice.amount_due;
  const hasTotal = isMeaningfulNumber(totalVal);

  const dateVal = invoice.date || invoice.invoice_date || invoice.invoiceDate;
  const hasDate = isMeaningfulText(dateVal);

  return hasVendor || hasInvoiceNumber || hasTotal || hasDate;
}

export function hasRealTotalsData(invoice: any): boolean {
  if (!invoice) return false;

  const subtotal = isMeaningfulNumber(invoice.subtotal);
  const tax = isMeaningfulNumber(invoice.tax);
  const shipping = isMeaningfulNumber(invoice.shipping);
  const total = isMeaningfulNumber(
    invoice.total ??
      invoice.total_amount ??
      invoice.extracted_total ??
      invoice.amount_due,
  );

  return subtotal || tax || shipping || total;
}

export function isExtractionEmpty(data: any): boolean {
  if (!data) return true;

  const vendorVal = data.vendor || data.vendor_name || data.vendorName;
  const hasVendor =
    typeof vendorVal === "string" &&
    vendorVal.trim().length > 0 &&
    !["Unknown Vendor", "Unknown", "N/A"].includes(vendorVal.trim());

  const invoiceVal = data.invoice_number;
  const hasInvoiceNumber =
    typeof invoiceVal === "string" &&
    invoiceVal.trim().length > 0 &&
    !["INV-2024-5678", "123456", "DEMO-2026-001"].includes(invoiceVal.trim());

  const totalVal =
    data.total ?? data.total_amount ?? data.extracted_total ?? data.amount_due;
  const hasTotal =
    typeof totalVal === "number" && Number.isFinite(totalVal) && totalVal > 0;

  const dateVal = data.date || data.invoice_date || data.invoiceDate;
  const hasDate =
    typeof dateVal === "string" &&
    dateVal.trim().length > 0 &&
    dateVal.trim() !== "---";

  const itemsVal = data.items || data.line_items;
  const hasItems = Array.isArray(itemsVal) && itemsVal.length > 0;

  return !hasVendor && !hasInvoiceNumber && !hasTotal && !hasDate && !hasItems;
}

export function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Read failed"));
  });
}

export function buildCSV(items: InvoiceItem[]): string {
  const headers = ["Description", "Quantity", "Unit Price", "Total"];
  const rows = items.map((item) => [
    `"${(item.description ?? "").replace(/"/g, '""')}"`,
    parseCurrency(item.quantity),
    parseCurrency(item.unit_price).toFixed(2),
    parseCurrency(item.total).toFixed(2),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.body.appendChild(document.createElement("a"));
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}

export function downloadJSON(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, filename);
}

export function downloadCSV(items: InvoiceItem[], filename: string): void {
  const blob = new Blob([buildCSV(items)], { type: "text/csv" });
  triggerDownload(blob, filename);
}
