import type { InvoiceItem } from "../types/invoice";

export function parseCurrency(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const normalized = String(value).replace(/[^0-9.-]+/g, "");
  return Number(normalized) || 0;
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
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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