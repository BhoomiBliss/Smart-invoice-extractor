import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Dashboard from "./pages/Dashboard";
import HistoryPage from "./pages/HistoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import Header from "./components/Header";
import AuthPage from "./pages/AuthPage";
import HistorySidebar from "./components/HistorySidebar";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import type { InvoiceData } from "./types/invoice";
import { useInvoiceUpload } from "./hooks/useInvoiceUpload";
import $ from "jquery";

const signInWithGoogle = null; // Removed unused import to prevent accidental direct calls
import type { DashboardView } from "./types/dashboard";

function IntroOverlay({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 2.1 }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#020617] pointer-events-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 0.14, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute left-1/2 top-[42%] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 blur-[110px]"
      />
      <div className="flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          <motion.div
            initial={{ boxShadow: "0 0 0 rgba(37,99,235,0)" }}
            animate={{
              boxShadow: [
                "0 0 0 rgba(37,99,235,0)",
                "0 0 48px rgba(37,99,235,0.38)",
                "0 0 24px rgba(37,99,235,0.16)",
              ],
            }}
            transition={{ duration: 0.8, delay: 0.45, times: [0, 0.55, 1] }}
            className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-600"
          >
            <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          </motion.div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.6, ease: "easeOut" }}
          className="mt-8 text-center text-2xl font-black uppercase tracking-[0.22em] text-white md:text-3xl"
        >
          <span className="bg-gradient-to-r from-blue-300 via-white to-indigo-300 bg-clip-text text-transparent">
            SMART INVOICE EXTRACTOR
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.55, ease: "easeOut" }}
          className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-blue-100/75 md:text-xs"
        >
          Enterprise-grade AI invoice intelligence
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
          className="mt-6 h-px w-40 bg-gradient-to-r from-transparent via-blue-300/70 to-transparent"
        />
      </div>
    </motion.div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>("upload");
  const [showIntro, setShowIntro] = useState(true);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceData | null>(
    null,
  );
  const mainContentRef = useRef<HTMLDivElement>(null);

  const {
    isExtracting,
    handleUpload,
    reset: resetExtraction,
    error,
    steps,
  } = useInvoiceUpload((data) => {
    setCurrentInvoice(data);
    setCurrentView("result");
    navigate("/");
  });

  useEffect(() => {
    if (location.pathname === "/history") {
      setCurrentView("history");
      return;
    }

    if (location.pathname === "/analytics") {
      setCurrentView("analytics");
      return;
    }

    if (location.pathname === "/") {
      setCurrentView((prev) =>
        prev === "result" && currentInvoice ? "result" : "upload",
      );
    }
  }, [currentInvoice, location.pathname]);

  useEffect(() => {
    if (mainContentRef.current) {
      $(mainContentRef.current).css({
        opacity: 0,
        transform: "translateY(20px)",
      });
      $(mainContentRef.current).animate(
        { opacity: 1 },
        {
          duration: 800,
          step: function (now, fx) {
            if (fx.prop === "opacity") {
              const y = 20 - now * 20;
              $(this).css("transform", `translateY(${y}px)`);
            }
          },
        },
      );
    }
  }, [currentView]);

  const handleExtract = async () => {
    if (!selectedFile) return;
    await handleUpload(selectedFile);
  };

  const handleChartClick = (invoice: InvoiceData) => {
    setCurrentInvoice(invoice);
    setCurrentView("result");
    navigate("/");
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#f7f9fb] transition-colors duration-300 dark:bg-[#020617]">
      <AnimatePresence>
        {showIntro && <IntroOverlay onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>

      <div className="mesh-bg" />

      <HistorySidebar
        isExpanded={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentView={currentView}
        onViewChange={setCurrentView}
        user={user}
        onNewExtraction={() => {
          setCurrentInvoice(null);
          setSelectedFile(null);
          resetExtraction();
          setCurrentView("upload");
          navigate("/");
        }}
        onChartClick={handleChartClick}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onLoginClick={() => setShowAuth(true)}
          isExtracting={isExtracting}
        />

        <div className="flex min-h-0 flex-1">
          <main
            ref={mainContentRef}
            className="relative flex flex-1 min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden px-3 py-3 md:px-4"
          >
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    view={currentView}
                    onFileSelect={setSelectedFile}
                    isExtracting={isExtracting}
                    currentInvoice={currentInvoice}
                    selectedFile={selectedFile}
                    onExtract={handleExtract}
                    onNewExtraction={() => {
                      setCurrentInvoice(null);
                      setSelectedFile(null);
                      resetExtraction();
                      setCurrentView("upload");
                      navigate("/");
                    }}
                    steps={steps}
                    error={error}
                  />
                }
              />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route
                path="/settings"
                element={
                  <SettingsPage onLoginClick={() => setShowAuth(true)} />
                }
              />
            </Routes>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showAuth && <AuthPage onClose={() => setShowAuth(false)} />}
      </AnimatePresence>

      <Toaster position="top-right" />
    </div>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any; info?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // log to console and optionally to telemetry
    // Keep this minimal and safe
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-black p-6">
          <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-left">
            <h2 className="mb-2 text-xl font-bold text-red-700">
              Something went wrong
            </h2>
            <p className="mb-4 text-sm text-red-600">
              The app encountered a runtime error. The details are shown below
              for debugging.
            </p>
            <details className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">
              {this.state.error?.toString()}
              {this.state.info?.componentStack && (
                <pre className="mt-2 text-[12px]">
                  {this.state.info.componentStack}
                </pre>
              )}
            </details>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded bg-red-600 px-4 py-2 text-white"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as any;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppErrorBoundary>
            <AppContent />
          </AppErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
