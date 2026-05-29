import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

export const Help: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: 'How does the Adaptive Model Routing engine work?',
      a: 'The platform analyses the uploaded document file structure and metadata preprocessing parameters. Digitally generated text-based PDFs bypass visual OCR and are routed directly to Gemini 2.0 Flash Lite for maximum extraction speed. Scanned PDFs, receipts, or images undergo skews adjustments and are dispatched to Qwen 2.5 VL for vision-based OCR. If a provider times out, Llama 3.2 Vision automatically acts as a failover recovery.'
    },
    {
      q: 'What is the purpose of the Human-in-the-Loop Correction Engine?',
      a: 'Large Language Models are probabilistic and prone to minor numerical or text parsing anomalies. Our platform treats raw extraction outputs as draft states. Auditors can review the extracted line items, modify fields in real-time inside the synchronized Table and JSON views, adjust calculations, and commit verified entries back to MongoDB Atlas.'
    },
    {
      q: 'How does the platform prevent duplicate invoice inputs?',
      a: 'We implement a tenant-aware compound index constraint at Layer 7 (MongoDB persistence level). The database strictly blocks completed extraction records containing identical vendor values, recipient IDs, and invoice numbers under the same user space, alerting operators to potential duplicates.'
    },
    {
      q: 'What metrics are tracked inside the AI Observability dashboards?',
      a: 'Our systems leverage Langfuse to instrument prompts, versionings, token costs, latency speeds, and manual correction volumes. When users apply edits in the correction workspace, the deltas are dispatched back to Langfuse traces as manual feedback logs, providing analytical evaluation signals to optimize prompt accuracy over time.'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold mb-2 text-slate-100 flex items-center space-x-2.5">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <span>Knowledge Base & Documentation</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Learn how to leverage our multi-agent AI document intelligence platform, customize routing rules, connect integrations, and review observability telemetry.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-surface-900 overflow-hidden transition"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-surface-800 transition focus:outline-none"
              >
                <span className="text-sm font-bold text-slate-200">{faq.q}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-brand-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {isOpen && (
                <div className="px-6 pb-5 pt-1 text-xs text-slate-400 leading-relaxed font-semibold border-t border-slate-800/40 whitespace-pre-line">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual link strip */}
      <div className="p-6 rounded-xl border border-slate-800 bg-brand-500/5 flex items-center space-x-4">
        <BookOpen className="w-8 h-8 text-brand-400 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-slate-200">Looking for developer docs?</h4>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
            Access REST endpoint references, Bearer token authentications examples, and worker configuration scripts inside our Admin API Docs workspace.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Help;
