import React from 'react';
import { Trash2, PlusCircle, Calculator } from 'lucide-react';
import { useInvoiceStore } from '../store/invoice.store';

export const InvoiceTable: React.FC = () => {
  const { invoice, updateField, updateLineItem, addLineItem, removeLineItem } = useInvoiceStore();

  if (!invoice) return null;

  const handleFieldChange = (field: any, val: any) => {
    updateField(field, val);
  };

  const handleLineItemChange = (idx: number, field: string, val: any) => {
    updateLineItem(idx, field as any, val);
  };

  const handleAddNewRow = () => {
    addLineItem({
      description: 'New Line Item Item',
      quantity: 1,
      price: 0,
      amount: 0
    });
  };

  const getConfidenceBadgeColorClass = (score: number) => {
    if (score >= 0.90) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 0.70) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Level Metadata Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 rounded-xl border border-slate-800 bg-surface-900">
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Vendor Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={invoice.vendor.value}
              onChange={(e) => handleFieldChange('vendor', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 glass-input font-medium"
            />
            <span className={`absolute right-2 top-2 text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getConfidenceBadgeColorClass(invoice.vendor.confidence)}`}>
              {Math.round(invoice.vendor.confidence * 100)}%
            </span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Recipient
          </label>
          <div className="relative">
            <input
              type="text"
              value={invoice.recipient.value}
              onChange={(e) => handleFieldChange('recipient', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 glass-input font-medium"
            />
            <span className={`absolute right-2 top-2 text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getConfidenceBadgeColorClass(invoice.recipient.confidence)}`}>
              {Math.round(invoice.recipient.confidence * 100)}%
            </span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Invoice Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={invoice.invoiceNumber.value}
              onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 glass-input font-medium"
            />
            <span className={`absolute right-2 top-2 text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getConfidenceBadgeColorClass(invoice.invoiceNumber.confidence)}`}>
              {Math.round(invoice.invoiceNumber.confidence * 100)}%
            </span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Invoice Date
          </label>
          <div className="relative">
            <input
              type="text"
              value={invoice.date.value}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 glass-input font-medium"
            />
            <span className={`absolute right-2 top-2 text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getConfidenceBadgeColorClass(invoice.date.confidence)}`}>
              {Math.round(invoice.date.confidence * 100)}%
            </span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Due Date
          </label>
          <div className="relative">
            <input
              type="text"
              value={invoice.dueDate.value}
              onChange={(e) => handleFieldChange('dueDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 glass-input font-medium"
            />
            <span className={`absolute right-2 top-2 text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getConfidenceBadgeColorClass(invoice.dueDate.confidence)}`}>
              {Math.round(invoice.dueDate.confidence * 100)}%
            </span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Currency
          </label>
          <div className="relative">
            <input
              type="text"
              value={invoice.currency.value}
              onChange={(e) => handleFieldChange('currency', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 glass-input font-medium"
            />
            <span className={`absolute right-2 top-2 text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getConfidenceBadgeColorClass(invoice.currency.confidence)}`}>
              {Math.round(invoice.currency.confidence * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Line Items Table */}
      <div className="rounded-xl border border-slate-800 bg-surface-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-surface-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Item Description</th>
                <th className="px-6 py-4 w-28">Quantity</th>
                <th className="px-6 py-4 w-32">Unit Price</th>
                <th className="px-6 py-4 w-32">Total Amount</th>
                <th className="px-6 py-4 w-16 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {invoice.lineItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-800 transition">
                  <td className="px-6 py-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-transparent hover:bg-surface-700/30 focus:bg-surface-700/60 border border-transparent focus:border-slate-800 text-slate-100 font-semibold focus:outline-none transition"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 rounded bg-transparent hover:bg-surface-700/30 focus:bg-surface-700/60 border border-transparent focus:border-slate-800 text-slate-100 font-semibold focus:outline-none text-right transition"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => handleLineItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded bg-transparent hover:bg-surface-700/30 focus:bg-surface-700/60 border border-transparent focus:border-slate-800 text-slate-100 font-semibold focus:outline-none text-right transition"
                    />
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-200">
                    {invoice.currency.value} {item.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => removeLineItem(idx)}
                      className="p-1 rounded text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table actions footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-surface-900/50">
          <button
            onClick={handleAddNewRow}
            className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center space-x-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Item Row</span>
          </button>

          <div className="flex flex-col items-end space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Aggregate Total
            </span>
            <span className="text-lg font-black text-slate-100">
              {invoice.currency.value} {invoice.totalAmount.value.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Mathematical Inconsistency Banner Alert */}
      {!invoice.mathValid && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-semibold flex items-center space-x-3">
          <Calculator className="w-5 h-5 flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-bold">Numerical Inconsistency Flagged</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              The aggregate sum of individual items does not match the invoice total. Auditing required.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceTable;
