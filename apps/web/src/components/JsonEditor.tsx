import React, { useState, useEffect } from 'react';
import { FileCode, AlertCircle, CheckCircle } from 'lucide-react';
import { useInvoiceStore } from '../store/invoice.store';

export const JsonEditor: React.FC = () => {
  const { invoice, syncRawJson } = useInvoiceStore();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (invoice) {
      const simplifiedJson = {
        vendor: invoice.vendor.value,
        recipient: invoice.recipient.value,
        invoiceNumber: invoice.invoiceNumber.value,
        date: invoice.date.value,
        dueDate: invoice.dueDate.value,
        currency: invoice.currency.value,
        totalAmount: invoice.totalAmount.value,
        taxAmount: invoice.taxAmount.value,
        lineItems: invoice.lineItems
      };
      setJsonText(JSON.stringify(simplifiedJson, null, 2));
      setError(null);
    }
  }, [invoice]);

  const handleTextChange = (val: string) => {
    setJsonText(val);
    setSuccess(false);

    try {
      JSON.parse(val);
      setError(null);
    } catch (e: any) {
      setError(`Syntax Error: ${e.message}`);
    }
  };

  const handleSync = () => {
    setError(null);
    setSuccess(false);

    const isSyncSuccessful = syncRawJson(jsonText);
    
    if (isSyncSuccessful) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } else {
      setError('JSON parsing error. Verify structured syntax.');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. Header Info Bar */}
      <div className="flex justify-between items-center bg-surface-900 px-4 py-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-300">Structured JSON Editing Workspace</span>
        </div>
        <button
          onClick={handleSync}
          disabled={!!error}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-100 bg-brand-600 hover:bg-brand-500 transition disabled:opacity-50"
        >
          Format & Sync Views
        </button>
      </div>

      {/* 2. Main Raw JSON Textarea */}
      <div className="flex-grow rounded-xl border border-slate-800 bg-surface-950 font-mono text-xs overflow-hidden flex flex-col p-4">
        <textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          className="w-full h-[380px] bg-transparent text-slate-200 resize-none focus:outline-none focus:ring-0 leading-relaxed overflow-y-auto"
          spellCheck={false}
        />
      </div>

      {/* 3. Operational Feedback Notices */}
      {error && (
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0 animate-bounce" />
          <span>Table View and Summary Views synchronized!</span>
        </div>
      )}
    </div>
  );
};

export default JsonEditor;
