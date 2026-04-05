import { motion } from "framer-motion";
import type { InvoiceData } from "../types/invoice";
import { parseCurrency } from "../utils/helpers";
import { CreditCard, Receipt, Truck, Calculator } from "lucide-react";
import {
  hasRealTotalsData,
  isMeaningfulNumber,
  getRealCurrency,
} from "../utils/helpers";

type SummaryPanelProps = {
  invoice: InvoiceData;
};

export default function SummaryPanel({ invoice }: SummaryPanelProps) {
  if (!hasRealTotalsData(invoice)) {
    return null;
  }

  const currencyVal = getRealCurrency(invoice.currency);
  const currencySymbol =
    currencyVal === "EUR" ? "€" : currencyVal === "GBP" ? "£" : "$";

  const formatMoney = (val: number | undefined) => {
    const num = parseCurrency(val);
    return `${currencySymbol}${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  const stats = [
    {
      label: "Subtotal",
      value: isMeaningfulNumber(invoice.subtotal)
        ? formatMoney(invoice.subtotal)
        : null,
      icon: <Calculator size={14} />,
    },
    {
      label: "Tax",
      value: isMeaningfulNumber(invoice.tax) ? formatMoney(invoice.tax) : null,
      icon: <Receipt size={14} />,
    },
    {
      label: "Shipping",
      value: isMeaningfulNumber(invoice.shipping)
        ? formatMoney(invoice.shipping)
        : null,
      icon: <Truck size={14} />,
    },
    {
      label: "Discount",
      value: isMeaningfulNumber(invoice.discount)
        ? `-${formatMoney(invoice.discount)}`
        : null,
      icon: <CreditCard size={14} />,
    },
  ].filter((stat) => stat.value !== null);

  const correctedTotal =
    (invoice as any).corrected_total ?? (invoice as any).correctedTotal ?? null;

  const totalVal = isMeaningfulNumber(correctedTotal)
    ? correctedTotal
    : (invoice.total ??
      (invoice as any).total_amount ??
      (invoice as any).extracted_total ??
      (invoice as any).amount_due);

  const hasTotal = isMeaningfulNumber(totalVal);

  const amountDue = isMeaningfulNumber(correctedTotal)
    ? correctedTotal
    : isMeaningfulNumber(invoice.total)
      ? invoice.total
      : isMeaningfulNumber((invoice as any).total_amount)
        ? (invoice as any).total_amount
        : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-2">
            {stat.icon}
            {stat.label}
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {stat.value}
          </div>
        </motion.div>
      ))}

      {hasTotal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 bg-blue-600 rounded-2xl p-5 shadow-lg shadow-blue-600/20 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-blue-100 font-bold text-[10px] uppercase tracking-[0.2em] mb-2">
              <CreditCard size={14} />
              Grand Total
            </div>
            <div className="text-2xl font-black text-white leading-none">
              {formatMoney(totalVal)}
            </div>
          </div>

          {amountDue !== null && (
            <div className="mt-4 text-white/80">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                Amount Due
              </div>
              <div className="text-lg font-black">{formatMoney(amountDue)}</div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
