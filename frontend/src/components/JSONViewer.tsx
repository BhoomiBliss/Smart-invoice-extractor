import { useState } from "react";
import type { InvoiceData } from "../types/invoice";
import { downloadJSON } from "../utils/helpers";

type JSONViewerProps = {
  invoice: InvoiceData;
};

export default function JSONViewer({ invoice }: JSONViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(invoice, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const filename = invoice.invoice_number ? `invoice-${invoice.invoice_number}.json` : "invoice.json";

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon">
            <svg viewBox="0 0 16 16">
              <path d="M2 2h3v2H4v8h1v2H2v-2h1V4H2V2zm9 0h3v2h-1v8h1v2h-3v-2h1V4h-1V2z" />
              <path d="M5.5 7h5v2h-5z" />
            </svg>
          </div>
          Extracted JSON
        </div>

        <div className="btn-row">
          <button className={`btn ${copied ? "btn-success" : ""}`} onClick={handleCopy}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="5" width="9" height="9" rx="1.5" />
              <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" />
            </svg>
            {copied ? "Copied!" : "Copy JSON"}
          </button>

          <button className="btn btn-amber" onClick={() => downloadJSON(invoice, filename)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2v8M5 7l3 3 3-3" strokeLinecap="round" />
              <path d="M2 13h12" strokeLinecap="round" />
            </svg>
            Download JSON
          </button>
        </div>
      </div>

      <pre id="result">{JSON.stringify(invoice, null, 2)}</pre>
    </div>
  );
}
