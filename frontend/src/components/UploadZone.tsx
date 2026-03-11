import { useMemo, useState } from "react";
import type { InvoiceData } from "../types/invoice";
import { toBase64 } from "../utils/helpers";

type UploadZoneProps = {
  onExtracted: (invoice: InvoiceData) => void;
};

export default function UploadZone({ onExtracted }: UploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fileLabel = useMemo(() => {
    if (!selectedFile) return "No file selected";
    return `${selectedFile.name} � ${(selectedFile.size / 1024).toFixed(0)} KB`;
  }, [selectedFile]);

  const pickFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleExtract = async () => {
  if (!selectedFile) return;

  setLoading(true);
  setError("");

  try {
    const base64Image = await toBase64(selectedFile);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const response = await fetch("/extract-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || payload.details || "Backend request failed");
    }

    if (!payload.success || !payload.data) {
      throw new Error(payload.error || "No invoice data returned");
    }

    onExtracted(payload.data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected extraction error";
    setError(message);
    console.error("Frontend extraction error:", err);
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <div className="upload-row">
        <div>
          <div className="section-label">
            <div className="step-badge">1</div>
            <h2>Upload Invoice</h2>
          </div>

          <label
            id="uploadArea"
            className={`${selectedFile ? "has-file" : ""} ${dragOver ? "dragover" : ""}`.trim()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragOver(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              pickFile(event.dataTransfer.files[0] ?? null);
            }}
          >
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
            />

            {!selectedFile && (
              <div className="upload-prompt">
                <div className="upload-icon-wrap">
                  <svg
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M48 38C52.4 38 56 34.4 56 30s-3.6-8-8-8c-.7 0-1.3.1-2 .3C44.4 17.5 40 14 34.5 14 27.6 14 22 19.6 22 26.5c0 .2 0 .3.01.5-.3-.1-.7-.1-1-.1-3.9 0-7 3.1-7 7s3.1 7 7 7H48"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M32 52V34m0 0-6 6m6-6 6 6"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="upload-text">
                  <h3>
                    {dragOver
                      ? "Drop your invoice here"
                      : "Drag & drop your invoice"}
                  </h3>
                  <p>
                    or <span>browse to upload</span>
                  </p>
                </div>
                <div className="upload-hint">JPG � PNG � WEBP � up to 10MB</div>
              </div>
            )}

            {selectedFile && (
              <div className="preview-wrap" style={{ display: "flex" }}>
                <div className="preview-img-box">
                  <img src={previewUrl} alt="Uploaded invoice" />
                  <div className="preview-badges">
                    <span className="preview-name">{selectedFile.name}</span>
                    <span className="preview-size">
                      {(selectedFile.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
                <p className="preview-replace">
                  Click or drop to replace image
                </p>
              </div>
            )}
          </label>
        </div>

        <div className="extract-panel">
          <div className="section-label">
            <div className="step-badge">2</div>
            <h2>Extract</h2>
          </div>

          <button
            id="extractBtn"
            disabled={!selectedFile || loading}
            onClick={handleExtract}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 4l6-2 6 2v7l-6 3-6-3V4z" strokeLinejoin="round" />
              <path d="M8 2v10M2 4l6 3 6-3" strokeLinejoin="round" />
            </svg>
            {loading ? "Extracting..." : "Extract Data"}
          </button>
          <p className="extract-hint">
            {selectedFile ? "Click to analyze with AI" : "Select a file first"}
          </p>
          <p className="extract-file">{fileLabel}</p>
        </div>
      </div>

      {loading && (
        <div id="loading" className="visible">
          <div className="dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <span>AI is analyzing your invoice...</span>
        </div>
      )}

      {error && (
        <div id="errorBox" className="visible">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0 1A8 8 0 108 0a8 8 0 000 16z" />
            <path d="M7.002 11a1 1 0 112 0 1 1 0 01-2 0zM7.1 4.995a.905.905 0 111.8 0l-.35 3.507a.552.552 0 01-1.1 0L7.1 4.995z" />
          </svg>
          <div>
            <div id="errorTitle">Extraction Failed</div>
            <div id="errorMsg">{error}</div>
          </div>
        </div>
      )}
    </>
  );
}
