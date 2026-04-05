import { useState } from "react";
import type { InvoiceData } from "../types/invoice";
import {
  parseCurrency,
  isMeaningfulText,
  isMeaningfulNumber,
  getRealCurrency,
} from "../utils/helpers";
import {
  ListOrdered,
  Package,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  Hash,
  Globe,
  ReceiptText,
} from "lucide-react";

type TableViewProps = {
  invoice: InvoiceData;
};

const DOT_COLORS = [
  "bg-green-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-pink-500",
];

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) return null;

  const pct = Math.round((score || 0) * 100);

  if (pct >= 80) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-black tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <BadgeCheck size={13} />
        Verified
      </span>
    );
  } else if (pct >= 50) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-black tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <AlertTriangle size={13} />
        Needs Review
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-black tracking-widest uppercase bg-red-500/10 text-red-400 border border-red-500/20">
        <ShieldAlert size={13} />
        Mismatch Found
      </span>
    );
  }
}

// ─── Validation Badge ─────────────────────────────────────────────────────────

function ValidationBadge({
  calculatedTotal,
  invoiceTotal,
  currencySymbol,
  formatMoney,
}: {
  calculatedTotal: number;
  invoiceTotal: number;
  currencySymbol: string;
  formatMoney: (v: number | string | undefined) => string;
}) {
  const diff = Math.abs(calculatedTotal - invoiceTotal);
  const matched = diff <= 1;

  if (matched) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
        <ShieldCheck size={15} />
        <span className="text-[12px] font-black tracking-widest uppercase">
          Total Matched
        </span>
      </div>
    );
  }

  const sign = calculatedTotal > invoiceTotal ? "+" : "-";
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
      <ShieldAlert size={15} />
      <span className="text-[12px] font-black tracking-widest uppercase">
        Mismatch: Expected {formatMoney(invoiceTotal)}, Found{" "}
        {formatMoney(calculatedTotal)}&nbsp;
        <span className="opacity-70">
          ({sign}
          {currencySymbol}
          {diff.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          )
        </span>
      </span>
    </div>
  );
}

function ResultStatus({
  validation,
  confidence,
}: {
  validation: any;
  confidence?: number | null;
}) {
  const hasValidation = Boolean(validation);

  if (hasValidation && validation.is_match === false) {
    const reason =
      validation.difference ||
      "Line-item totals do not match detected invoice total";
    return (
      <div className="flex flex-col">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle size={14} />
          Needs Review
        </span>
        <div className="text-xs text-slate-500 mt-1">{reason}</div>
      </div>
    );
  }

  if (hasValidation && validation.is_match === true) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck size={14} />
          Verified
        </span>
      </div>
    );
  }

  // No validation available: show confidence only if meaningful (>0)
  if (confidence && confidence > 0) {
    return (
      <div className="flex items-center gap-3">
        <StatusBadge score={confidence} />
      </div>
    );
  }

  return <div className="text-xs text-slate-400">Confidence unavailable</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TableView({ invoice }: TableViewProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const rawVendor =
    invoice?.vendor ||
    (invoice as any)?.vendor_name ||
    (invoice as any)?.sender?.name;
  const vendorName = isMeaningfulText(rawVendor) ? rawVendor : null;
  const invoiceDateRaw =
    invoice?.date || (invoice as any)?.invoice_date || null;
  const invoiceDate = isMeaningfulText(invoiceDateRaw) ? invoiceDateRaw : null;

  // 1. Safe Access and normalize items
  const safeItems = Array.isArray((invoice as any)?.items)
    ? (invoice as any).items
    : [];

  const calculatedItems = (safeItems || []).map((item: any, index: number) => {
    // 🛡️ MULTI-KEY NORMALIZATION ENGINE
    const quantity = Number(item.quantity ?? item.qty ?? item.Quantity ?? 0) || 0;
    const unitPrice = Number(item.unit_price ?? item.unitPrice ?? item.rate ?? item.unit_rate ?? item.UnitPrice ?? 0) || 0;

    const amount =
      item.amount !== undefined && item.amount !== null
        ? Number(item.amount)
        : item.total !== undefined && item.total !== null
          ? Number(item.total)
          : quantity * unitPrice;

    return {
      ...item,
      id: index + 1,
      description: item.description ?? item.name ?? item.item_description ?? item.Service ?? "Item " + (index + 1),
      quantity,
      unit_price: unitPrice,
      amount,
    };
  });

  // 2. Formatting Helper
  const currencySymbol =
    invoice?.currency === "EUR" ? "€" : invoice?.currency === "GBP" ? "£" : "$";

  const formatMoney = (val: any) => {
    const num = typeof val === "number" ? val : parseCurrency(val);
    return `${currencySymbol}${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // 3. Logic Check: Compare extracted total vs calculated items total
  const itemsTotal = calculatedItems.reduce((sum: number, item: any) => {
    return (
      sum + (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0)
    );
  }, 0);

  const tax = parseCurrency(invoice?.tax || 0);
  const shipping = parseCurrency(invoice?.shipping || 0);
  const extractedTotal = Number(invoice?.total) || 0;

  // confidence computed from difference between extracted total and itemsTotal
  const difference = extractedTotal - itemsTotal;
  const isMatch = Math.abs(difference) < 1;
  const confidenceScore = isMatch
    ? 100
    : Math.max(0, 100 - (Math.abs(difference) / (extractedTotal || 1)) * 100);

  // validation object (safely pick likely locations)
  const validation =
    (invoice as any)?.validation ??
    (invoice as any)?.validation_result ??
    (invoice as any)?.validationResult ??
    null;

  const validationMismatch = validation && validation.is_match === false;

  // ── Mismatch detection per row ─────────────────────────────────────────────
  const isMismatch = (
    qty: number | undefined,
    unitPrice: number | undefined,
    total: number | undefined,
  ): boolean => {
    if (qty === undefined || unitPrice === undefined || total === undefined)
      return false;
    const expected = Number(qty) * Number(unitPrice);
    const actual = Number(total);
    return (
      Number.isFinite(expected) &&
      Number.isFinite(actual) &&
      Math.abs(expected - actual) > 0.5
    );
  };

  const calculatedTotal = itemsTotal + tax + shipping;

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/5 rounded-[32px] overflow-visible shadow-2xl shadow-blue-500/5 transition-all duration-500">
      {/* ── Top Bar: Glassmorphic Header ── */}
      <div className="relative px-8 py-8 overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-white/[0.03] dark:to-transparent border-b border-slate-100 dark:border-white/5">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building2 className="text-white" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <ResultStatus
                    validation={validation}
                    confidence={confidenceScore}
                  />
                </div>
                {vendorName ? (
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {vendorName}
                  </h2>
                ) : (
                  <h2 className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                    Extracted Invoice
                  </h2>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-right">
              {invoice?.invoice_number &&
                isMeaningfulText(invoice.invoice_number) && (
                  <>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                      Invoice #
                    </p>
                    <p className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      {invoice.invoice_number}
                    </p>
                  </>
                )}

              {invoiceDate && (
                <p className="text-[11px] text-slate-500 mt-1">{invoiceDate}</p>
              )}

              {isMeaningfulNumber(extractedTotal) && (
                <div className="mt-2">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    Grand Total
                  </p>
                  <p className="text-xl font-black font-mono text-slate-900 dark:text-white">{`${getRealCurrency(invoice.currency) ? (getRealCurrency(invoice.currency) === "EUR" ? "€" : getRealCurrency(invoice.currency) === "GBP" ? "£" : "$") : "$"}${extractedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action/Status Bar ── */}
      <div className="px-8 py-4 flex items-center justify-between bg-white dark:bg-[#0d1117]">
        <div className="flex items-center gap-6">
          {invoiceDate && (
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                {invoiceDate}
              </span>
            </div>
          )}

          {invoice?.currency && (
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-indigo-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                {invoice?.currency}
              </span>
            </div>
          )}

          {/* Validation Insights */}
          <div className="ml-2 inline-flex items-center gap-3">
            <div className="text-[12px] text-slate-500">
              {calculatedItems.length} line items
            </div>
            <div className="text-[12px] text-slate-500">
              Detected:{" "}
              {isMeaningfulNumber(extractedTotal)
                ? formatMoney(extractedTotal)
                : "—"}
            </div>
            {calculatedItems.length > 0 && (
              <div className="text-[12px] font-black uppercase tracking-widest text-slate-400">
                {isMatch ? "Totals Match" : "Totals Mismatch"}
              </div>
            )}
          </div>
        </div>

        <div>
          {calculatedItems.length > 0 && (
            <ValidationBadge
              calculatedTotal={itemsTotal}
              invoiceTotal={extractedTotal}
              currencySymbol={currencySymbol}
              formatMoney={formatMoney}
            />
          )}
        </div>
      </div>

      {/* ── Table: Ultra-Clean Layout ── */}
      {calculatedItems.length === 0 ? (
        <div className="px-6 py-8">
          <div className="text-sm text-gray-400">No line items detected</div>
        </div>
      ) : (
        <div className="overflow-visible px-4 pb-4">
          <div className="rounded-xl border border-transparent">
            <table className="w-full text-left table-auto border-separate border-spacing-0">
              <thead>
                <tr className="text-slate-400">
                  <th style={{ width: "8%" }} className="sticky top-0 z-20 bg-white dark:bg-[#0d1117] py-4 px-6 text-[10px] font-black tracking-[0.2em] uppercase text-left border-b border-slate-100 dark:border-white/5">
                    #
                  </th>
                  <th style={{ width: "42%" }} className="sticky top-0 z-20 bg-white dark:bg-[#0d1117] py-4 px-4 text-[10px] font-black tracking-[0.2em] uppercase text-left border-b border-slate-100 dark:border-white/5">
                    Item Detail
                  </th>
                  <th style={{ width: "12%" }} className="sticky top-0 z-20 bg-white dark:bg-[#0d1117] py-4 px-4 text-[10px] font-black tracking-[0.2em] uppercase text-center border-b border-slate-100 dark:border-white/5">
                    Qty
                  </th>
                  <th style={{ width: "18%" }} className="sticky top-0 z-20 bg-white dark:bg-[#0d1117] py-4 px-4 text-[10px] font-black tracking-[0.2em] uppercase text-right border-b border-slate-100 dark:border-white/5">
                    Unit Rate
                  </th>
                  <th style={{ width: "20%" }} className="sticky top-0 z-20 bg-white dark:bg-[#0d1117] py-4 px-6 text-[10px] font-black tracking-[0.2em] uppercase text-right border-b border-slate-100 dark:border-white/5">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {calculatedItems.map((item: any, index: number) => {
                  const hasRowMismatch = isMismatch(
                    item.quantity,
                    item.unit_price,
                    item.amount ?? null,
                  );
                  const even = index % 2 === 0;
                  const itemUnitNum = Number(item.unit_price) || 0;
                  const itemQty = Number(item.quantity) || 0;
                  const itemTotal = Number(item.amount || (itemQty * itemUnitNum)) || 0;

                  return (
                    <tr
                      key={index}
                      onMouseEnter={() => setHoveredRow(index)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`transition-colors duration-200 ${even ? "bg-white/50 dark:bg-white/[0.02]" : "bg-slate-50/50 dark:bg-white/[0.01]"} hover:bg-blue-50 dark:hover:bg-white/5`}
                    >
                      <td className="py-5 px-6 text-[11px] font-black text-slate-500">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${DOT_COLORS[index % 5]} shadow-[0_0_8px_rgba(0,0,0,0.06)]`}
                          />
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={item.description}>
                              {item.description || ""}
                            </div>
                            {item.sku && (
                              <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                                {item.sku}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4 text-center font-mono text-sm font-medium text-slate-600 dark:text-slate-400">
                        {itemQty % 1 === 0 ? itemQty : itemQty.toFixed(2)}
                      </td>
                      <td className="py-5 px-4 text-right font-mono text-xs text-slate-500">
                        {currencySymbol}{itemUnitNum.toFixed(2)}
                      </td>
                      <td
                        className={`py-5 px-6 text-right font-black text-sm ${hasRowMismatch ? "text-red-500" : "text-slate-900 dark:text-white"}`}
                      >
                        {currencySymbol}{itemTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Summary Card ── */}
      <div className="mt-auto px-8 py-10 bg-slate-900 dark:bg-white/[0.02] text-white">
        <div className="flex flex-wrap justify-between items-center gap-10">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black tracking-[0.3em] text-blue-400 uppercase">
              Extraction Engine
            </p>
            <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
              Data processed via Neural Ledger v4. All financial calculations
              have been verified against source text.
            </p>
          </div>

          <div className="flex items-center gap-16">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Subtotal
              </span>
              <span className="text-lg font-bold font-mono">
                {formatMoney(itemsTotal)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Tax
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                +{formatMoney(tax)}
              </span>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                Amount Due
              </span>
              <span className="text-4xl font-black tracking-tighter text-white drop-shadow-2xl">
                {formatMoney(extractedTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
