import React from 'react';
import { Sparkles, Calendar, Activity } from 'lucide-react';
import { useInvoiceStore } from '../store/invoice.store';

export const SummaryCard: React.FC = () => {
  const { invoice } = useInvoiceStore();

  if (!invoice) return null;

  const consensusScorePercentage = Math.round(invoice.confidenceScore * 100);

  const getConsensusColorClass = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 relative overflow-hidden flex flex-col justify-between h-full">
      {/* Decorative background light glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-4">
        {/* Header Title */}
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Natural Language AI Summary
          </span>
        </div>

        {/* Dynamic Summary Brief Paragraph */}
        <p className="text-sm text-slate-200 leading-relaxed font-semibold italic">
          "{invoice.vendor.value} issued Invoice #{invoice.invoiceNumber.value} to {invoice.recipient.value} on {invoice.date.value}, containing {invoice.lineItems.length} specific line items and totaling {invoice.currency.value} {invoice.totalAmount.value.toFixed(2)}. Due date is scheduled for {invoice.dueDate.value}."
        </p>

        {/* Secondary description brief */}
        {invoice.summary && (
          <div className="p-3 rounded-lg bg-surface-950/40 border border-slate-800 text-xs text-slate-400 leading-relaxed font-medium">
            {invoice.summary}
          </div>
        )}
      </div>

      {/* Telemetry Footer Info */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap justify-between gap-4 text-xs font-bold">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Activity className="w-3.5 h-3.5 text-brand-400" />
          <span>
            Confidence Consensus:{' '}
            <span className={getConsensusColorClass(consensusScorePercentage)}>
              {consensusScorePercentage}%
            </span>
          </span>
        </div>
        
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Audited: {invoice.mathValid ? 'Math Verified' : 'Inconsistencies Flagged'}</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
