import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Play,
  Zap,
  ArrowLeft,
  History,
  Terminal as TerminalIcon,
  Cpu,
  Sparkles,
} from "lucide-react";
import UploadZone from "../components/UploadZone";
import DualEngineView from "../components/DualEngineView";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import IntelligenceLedger from "../components/IntelligenceLedger";
import type { InvoiceData } from "../types/invoice";
import type { DashboardView } from "../types/dashboard";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isExtractionEmpty } from "../utils/helpers";

interface DashboardProps {
  view: DashboardView;
  onFileSelect: (file: File | null) => void;
  isExtracting: boolean;
  currentInvoice: InvoiceData | null;
  selectedFile: File | null;
  onExtract: () => void;
  onNewExtraction: () => void;
  steps: string[];
  error?: string | null;
}

const Terminal = ({ steps }: { steps: string[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayedSteps, setDisplayedSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedSteps, currentText]);

  useEffect(() => {
    if (currentStepIndex < steps.length) {
      const fullText = steps[currentStepIndex];
      let charIndex = 0;
      setCurrentText("");

      const interval = setInterval(() => {
        if (charIndex < fullText.length) {
          setCurrentText((prev) => prev + fullText[charIndex]);
          charIndex++;
        } else {
          clearInterval(interval);
          setDisplayedSteps((prev) => [...prev, fullText]);
          setCurrentStepIndex((prev) => prev + 1);
          setCurrentText("");
        }
      }, 20); // Typing speed

      return () => clearInterval(interval);
    }
  }, [steps, currentStepIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="w-full max-w-2xl mt-12 bg-[#0d1117] rounded-3xl border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Neural Engine Terminal
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
        </div>
      </div>
      <div
        ref={scrollRef}
        className="p-8 h-64 overflow-y-auto font-mono text-[13px] leading-relaxed custom-scrollbar bg-black/40"
      >
        {displayedSteps.map((step, i) => (
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            key={i}
            className="flex gap-4 mb-3"
          >
            <span className="text-blue-500/30 shrink-0 select-none">
              [
              {new Date().toLocaleTimeString([], {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
              ]
            </span>
            <span
              className={
                step.includes("✅")
                  ? "text-emerald-400 font-bold"
                  : step.includes("ERROR") || step.includes("⚠️")
                    ? "text-red-400"
                    : "text-slate-300"
              }
            >
              {step}
            </span>
          </motion.div>
        ))}
        {currentText && (
          <div className="flex gap-4 mb-3">
            <span className="text-blue-500/30 shrink-0 select-none">
              [
              {new Date().toLocaleTimeString([], {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
              ]
            </span>
            <span className="text-slate-300">
              {currentText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-2 h-4 bg-blue-500 ml-1 translate-y-0.5"
              />
            </span>
          </div>
        )}
        {steps.length > 0 &&
          !steps[steps.length - 1].includes("Complete") &&
          !currentText && (
            <div className="flex items-center gap-3 mt-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="text-blue-500/50 italic font-bold tracking-tight animate-pulse text-[11px] uppercase">
                Neural engine processing...
              </span>
            </div>
          )}
      </div>
    </motion.div>
  );
};

export default function Dashboard({
  view,
  onFileSelect,
  isExtracting,
  currentInvoice,
  selectedFile,
  onExtract,
  onNewExtraction,
  steps,
  error,
}: DashboardProps) {
  // normalize invoice data shape to handle variations from backend
  const invoiceData =
    (currentInvoice as any)?.finalData ??
    (currentInvoice as any)?.data?.finalData ??
    (currentInvoice as any)?.data ??
    currentInvoice ??
    null;

  // normalized invoiceData ready for rendering
  const { user } = useAuth();
  return (
    <div className="relative flex h-full w-full flex-col bg-transparent transition-colors duration-300">
      {/* Background Glows */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, filter: "blur(100px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(120px)" }}
        transition={{ duration: 2 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 dark:bg-blue-600/[0.05] rounded-full pointer-events-none z-0"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-start px-4 py-10 md:px-6 md:py-12">
        <div className="w-full max-w-6xl flex flex-col items-center">
          <AnimatePresence mode="wait">
            {view === "upload" && (
              <motion.div
                key="upload-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex flex-col items-center"
              >
                <div className="text-center mb-16">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-8 shadow-xl shadow-blue-500/5"
                  >
                    <Cpu size={12} className="animate-pulse" />
                    Extraction Engine Active
                  </motion.div>

                  <h1 className="text-5xl md:text-6xl font-black tracking-tighter dark:text-white text-gray-900 leading-[1.1] mb-8">
                    <motion.span
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="block"
                    >
                      Drop your invoice.
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent"
                    >
                      Let agents handle it.
                    </motion.span>
                  </h1>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium tracking-tight max-w-2xl mx-auto leading-[1.6]"
                  >
                    Experience enterprise-grade document intelligence powered by
                    a multi-agent neural workflow.
                  </motion.p>
                </div>

                <UploadZone
                  onFileSelect={onFileSelect}
                  selectedFile={selectedFile}
                  isExtracting={isExtracting}
                />

                {!isExtracting && !user && (
                  <p className="text-xs text-yellow-400">
                    Guest mode (data not saved)
                  </p>
                )}

                {!isExtracting ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col items-center gap-8 mt-12"
                  >
                    <button
                      disabled={!selectedFile || isExtracting}
                      onClick={onExtract}
                      className={`group relative px-24 py-6 rounded-[2rem] text-[15px] font-black uppercase tracking-[0.25em] transition-all shadow-2xl overflow-hidden active:scale-[0.97] ${
                        selectedFile && !isExtracting
                          ? "bg-blue-600 text-white shadow-blue-500/40 hover:scale-[1.03] hover:bg-blue-700 cursor-pointer"
                          : "bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-600 border border-transparent dark:border-white/5 cursor-not-allowed"
                      }`}
                    >
                      {/* Pulse Glow Effect */}
                      {selectedFile && !isExtracting && (
                        <div className="absolute inset-0 bg-blue-400/20 animate-ping rounded-full scale-[1.2] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}

                      <div className="flex items-center gap-4 relative z-10">
                        <Play className="w-5 h-5 fill-current" />
                        <span>Initialize Agents</span>
                        <Sparkles size={16} className="text-white/50" />
                      </div>
                    </button>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 shadow-lg shadow-red-500/5"
                        >
                          <p className="text-[12px] font-black uppercase text-red-500 tracking-[0.1em]">
                            ⚠️ {error}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <Terminal steps={steps} />
                )}
              </motion.div>
            )}

            {view === "result" && isExtracting && (
              <motion.div
                key="processing-result"
                initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex w-full flex-col items-start"
              >
                <Terminal steps={steps} />
              </motion.div>
            )}

            {view === "result" &&
              invoiceData &&
              !isExtractionEmpty(invoiceData) && (
                <motion.div
                  key="result-view"
                  initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="flex w-full flex-col items-start"
                >
                  <button
                    onClick={onNewExtraction}
                    className="mb-10 flex items-center gap-3 px-6 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-blue-600 transition-all text-xs font-black uppercase tracking-[0.2em] border border-transparent hover:border-blue-500/20"
                  >
                    <ArrowLeft size={18} />
                    Back to Upload
                  </button>
                  <DualEngineView invoice={invoiceData as InvoiceData} />
                </motion.div>
              )}

            {view === "result" &&
              currentInvoice &&
              isExtractionEmpty(currentInvoice) && (
                <motion.div
                  key="empty-result-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="flex w-full flex-col items-center justify-center min-h-[400px]"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-6">
                      <Zap size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                      No Data Extracted
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                      The invoice could not be processed. No meaningful data was
                      found. Please try again with a different file.
                    </p>
                    <button
                      onClick={onNewExtraction}
                      className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold uppercase tracking-widest text-sm hover:bg-blue-700 transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                </motion.div>
              )}

            {view === "history" && (
              <motion.div
                key="history-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full min-w-0"
              >
                <div className="flex flex-col gap-2 mb-12 px-4">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 shadow-xl shadow-blue-500/10">
                      <History className="w-7 h-7" />
                    </div>
                    <h2 className="text-4xl font-black dark:text-white text-gray-900 tracking-tighter uppercase leading-none">
                      Audit History
                    </h2>
                  </div>
                  <p className="text-gray-500 font-bold uppercase text-[12px] tracking-[0.25em] ml-20">
                    Intelligence Ledger Registry
                  </p>
                </div>
                <AnalyticsDashboard />
                <IntelligenceLedger />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-auto flex shrink-0 justify-center gap-16 border-t border-gray-100 bg-white/50 py-10 text-[11px] font-black uppercase tracking-[0.4em] text-gray-900 opacity-40 pointer-events-none backdrop-blur-md dark:border-white/5 dark:bg-black/20 dark:text-white">
        <span className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />{" "}
          3 Agents Active
        </span>
        <span>SSE Realtime Stream</span>
        <span>Secured SSL Encryption</span>
      </div>
    </div>
  );
}
