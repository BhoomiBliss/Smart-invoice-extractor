import { useEffect, useState } from "react";
import JSONViewer from "./components/JSONViewer";
import TableView from "./components/TableView";
import UploadZone from "./components/UploadZone";
import type { InvoiceData } from "./types/invoice";

export default function App() {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [dark, setDark] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
  }, [dark]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowIntro(false), 1400);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      <div className={`intro-overlay ${showIntro ? "active" : "done"}`}>
        <div className="intro-core">
          <div className="intro-logo-wrap">
            <img src="/invoice-icon.svg" alt="Smart Invoice Extractor logo" />
          </div>
          <p>Smart Invoice Extractor</p>
        </div>
      </div>

      <header>
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">
              <img
                src="/invoice-icon.svg"
                alt="Invoice icon"
                width={20}
                height={20}
              />
            </div>
            <div className="logo-text">
              <h1>Smart Invoice Extractor</h1>
              <p>AI-powered invoice to JSON converter</p>
            </div>
          </div>

          <button
            id="themeToggle"
            title="Toggle theme"
            onClick={() => setDark((value) => !value)}
          >
            {dark ? (
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                fill="currentColor"
              >
                <path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 0a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 0zm0 13a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 13zm8-5a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zM3 8a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2A.5.5 0 013 8zm10.657-5.657a.5.5 0 010 .707l-1.414 1.415a.5.5 0 11-.707-.708l1.414-1.414a.5.5 0 01.707 0zm-9.193 9.193a.5.5 0 010 .707L3.05 13.657a.5.5 0 01-.707-.707l1.414-1.414a.5.5 0 01.707 0zm9.193 2.121a.5.5 0 01-.707 0l-1.414-1.414a.5.5 0 01.707-.707l1.414 1.414a.5.5 0 010 .707zM4.464 4.465a.5.5 0 01-.707 0L2.343 3.05a.5.5 0 11.707-.707l1.414 1.414a.5.5 0 010 .707z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                fill="currentColor"
              >
                <path d="M6 .278a.768.768 0 01.08.858 7.208 7.208 0 00-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 01.81.316.733.733 0 01-.031.893A8.349 8.349 0 018.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 016 .278z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className={showIntro ? "page-enter" : "page-enter ready"}>
        <UploadZone onExtracted={setInvoice} />

        {invoice && (
          <>
            <div className="divider visible">
              <div className="div-line"></div>
              <span className="div-label">Results</span>
              <div className="div-line"></div>
            </div>

            <div className="results visible">
              <JSONViewer invoice={invoice} />
              <TableView invoice={invoice} />
            </div>
          </>
        )}
      </main>

      <footer>
        <div className="footer-inner">
          <span>Smart Invoice Extractor · AI-powered</span>
          <span>v1.0.0</span>
        </div>
      </footer>
    </>
  );
}
