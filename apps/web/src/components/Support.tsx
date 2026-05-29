import React, { useState } from 'react';
import { LifeBuoy, Send, CheckCircle2, Ticket } from 'lucide-react';

interface MockTicket {
  id: string;
  subject: string;
  category: string;
  status: 'Open' | 'Resolved';
  date: string;
}

export const Support: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Extraction Failure');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [tickets, setTickets] = useState<MockTicket[]>([
    { id: 'TKT-7821', subject: 'Adaptive model routing latency spike', category: 'API Latency', status: 'Resolved', date: '2026-05-24' },
    { id: 'TKT-9201', subject: 'Incorrect Qwen-VL tax items extract', category: 'Extraction Failure', status: 'Resolved', date: '2026-05-26' }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    const newTicket: MockTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject,
      category,
      status: 'Open',
      date: new Date().toISOString().split('T')[0]
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSubject('');
    setDescription('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 1. Ticket Form */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2 text-slate-100 flex items-center space-x-2.5">
            <LifeBuoy className="w-5 h-5 text-indigo-400" />
            <span>Technical Support Workspace</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Submit latency alerts, OCR failure logs, or API discrepancies directly to the engineering team.
          </p>
        </div>

        {success && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 animate-bounce" />
            <span>Support ticket successfully submitted! Tracking number generated.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-slate-800 bg-surface-900">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Ticket Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. AWS digital PDF extraction parse error"
              className="w-full px-4 py-2.5 rounded-lg text-xs text-slate-100 glass-input"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Issue Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-xs text-slate-100 bg-surface-950 border border-slate-800 focus:border-brand-500 focus:outline-none font-semibold"
            >
              <option>Extraction Failure</option>
              <option>API Latency Spike</option>
              <option>Billing Discrepancy</option>
              <option>Integration Error</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Detailed Description</label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide exact details, original invoice numbers, or routed model logs..."
              rows={5}
              className="w-full px-4 py-2.5 rounded-lg text-xs text-slate-100 glass-input resize-none"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg text-xs font-bold text-slate-100 bg-brand-600 hover:bg-brand-500 transition flex items-center space-x-2 shadow-lg hover:shadow-brand-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Ticket</span>
          </button>
        </form>
      </div>

      {/* 2. Tickets History Sidebar List */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center space-x-2">
          <Ticket className="w-4 h-4 text-emerald-400" />
          <span>Active Tickets ({tickets.length})</span>
        </h3>
        
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className="p-4 rounded-xl border border-slate-800 bg-surface-900 space-y-2 hover:shadow-md hover:shadow-brand-500/5 transition duration-150">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-400">{t.id}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                  t.status === 'Open' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {t.status}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{t.subject}</h4>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                <span>{t.category}</span>
                <span>{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Support;
