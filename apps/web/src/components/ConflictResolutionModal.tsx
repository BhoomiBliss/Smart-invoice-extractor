import React from 'react';
import { useInvoiceStore } from '../store/invoice.store';
import { ShieldAlert, ArrowDownToLine, Sparkles, CheckCircle2 } from 'lucide-react';

export const ConflictResolutionModal: React.FC = () => {
  const conflictMode = useInvoiceStore((state) => state.syncSlice.conflictMode);
  const isOutOfSync = useInvoiceStore((state) => state.syncSlice.isOutOfSync);
  const resolveConflict = useInvoiceStore((state) => state.resolveConflict);

  if (!isOutOfSync || !conflictMode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-surface-900/90 shadow-2xl backdrop-blur-xl p-8 space-y-6 transform scale-100 hover:shadow-brand-500/10 transition-shadow">
        
        {/* Border glow accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-brand-500 to-indigo-500" />

        {/* Title Block */}
        <div className="flex items-center space-x-3.5 pb-2">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1 animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-100 uppercase tracking-wider font-outfit">
              State Concurrency Conflict Detected
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Another operator or system transaction has modified this document on the server in the background.
            </p>
          </div>
        </div>

        {/* Description Body */}
        <div className="p-4 rounded-xl border border-slate-800 bg-surface-950/50 text-xs text-slate-300 leading-relaxed font-medium">
          To prevent accidental destructive overwrites or rolling loops, the SSE Reconciliation Gate has isolated your session. Please choose one of the three-way resolution vectors below to re-establish synchronization:
        </div>

        {/* 3-Way Choice Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Choice 1: KEEP LOCAL */}
          <button
            onClick={() => resolveConflict('KEEP_LOCAL')}
            className="flex flex-col text-left p-5 rounded-xl border border-slate-800 hover:border-amber-500/40 bg-surface-950/40 hover:bg-amber-500/5 transition-all duration-200 group text-xs relative overflow-hidden"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-200 uppercase tracking-wide group-hover:text-amber-400 transition-colors">
              Keep Local Edits
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 leading-normal font-medium">
              Force-push your local session state to overwrite the server version.
            </span>
          </button>

          {/* Choice 2: PULL SERVER */}
          <button
            onClick={() => resolveConflict('PULL_SERVER')}
            className="flex flex-col text-left p-5 rounded-xl border border-slate-800 hover:border-indigo-500/40 bg-surface-950/40 hover:bg-indigo-500/5 transition-all duration-200 group text-xs relative overflow-hidden"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3 group-hover:scale-105 transition-transform">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-200 uppercase tracking-wide group-hover:text-indigo-400 transition-colors">
              Load Server Version
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 leading-normal font-medium">
              Discard all local changes and pull the latest verified server version.
            </span>
          </button>

          {/* Choice 3: SMART MERGE */}
          <button
            onClick={() => resolveConflict('SMART_MERGE')}
            className="flex flex-col text-left p-5 rounded-xl border border-slate-800 hover:border-brand-500/40 bg-surface-950/40 hover:bg-brand-500/5 transition-all duration-200 group text-xs relative overflow-hidden"
          >
            {/* Top right Sparkle badge */}
            <div className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase">
              Recommended
            </div>
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-200 uppercase tracking-wide group-hover:text-brand-400 transition-colors">
              Smart Merge Sync
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 leading-normal font-medium">
              Merge local numerical edits with server additions using our resolution engine.
            </span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
