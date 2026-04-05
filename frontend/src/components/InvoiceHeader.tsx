import { motion } from "framer-motion";
import type { InvoiceData } from "../types/invoice";
import ConfidenceBadge from "./ConfidenceBadge";
import { Building2, Hash, CalendarDays, Coins } from "lucide-react";
import {
  hasRealHeaderData,
  isMeaningfulText,
  getRealCurrency,
} from "../utils/helpers";

type InvoiceHeaderProps = {
  invoice: InvoiceData;
};

export default function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  const confidence = invoice.agent_metadata?.confidence_score || 0;

  if (!hasRealHeaderData(invoice)) {
    return null;
  }

  const vendorVal = invoice.vendor || invoice.vendor_name;
  const hasVendor = isMeaningfulText(vendorVal);

  const invoiceVal = invoice.invoice_number;
  const hasInvoiceNumber = isMeaningfulText(invoiceVal);

  const dateVal = invoice.date || invoice.invoice_date;
  const hasDate = isMeaningfulText(dateVal);

  const currencyVal = getRealCurrency(invoice.currency);

  return (
    <div className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-3xl p-8 mb-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        {/* Left Side: Vendor + Invoice Number */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
              <Building2 size={24} />
            </div>
            <div>
              {hasVendor && (
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {vendorVal}
                </h1>
              )}
              {hasInvoiceNumber && (
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
                  <Hash size={12} className="text-slate-400" />
                  <span>Invoice #{invoiceVal}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Date + Status Badge */}
        <div className="flex flex-col items-end gap-4">
          <ConfidenceBadge score={confidence} />

          <div className="flex flex-col items-end gap-2 pr-2">
            {hasDate && (
              <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <CalendarDays size={12} />
                <span>Date: {dateVal}</span>
              </div>
            )}
            {currencyVal && (
              <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <Coins size={12} />
                <span>Currency: {currencyVal}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
