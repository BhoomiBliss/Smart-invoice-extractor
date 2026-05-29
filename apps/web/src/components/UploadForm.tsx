import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useSSE } from '../hooks/useSSE';

interface UploadFormProps {
  onExtractionComplete: (invoice: any) => void;
  token: string | null;
}

export const UploadForm: React.FC<UploadFormProps> = ({ onExtractionComplete, token }) => {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleJobCompleted = useCallback(async (result?: any) => {
    // If the stream sent the direct result, use it immediately!
    if (result) {
      console.log('[SSE] Direct stream extraction payload received:', result);
      onExtractionComplete(result);
      return;
    }

    // Fallback: pull from database if stream didn't deliver the result payload
    try {
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get('/api/v1/invoices', { headers: authHeader });
      
      if (response.data.invoices.length > 0) {
        onExtractionComplete(response.data.invoices[0]);
      }
    } catch (err) {
      console.error('Failed to retrieve freshly processed invoice:', err);
    }
  }, [token, onExtractionComplete]);

  const { status, progress, error: sseError, metadata } = useSSE(jobId, handleJobCompleted);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const uploadedFile = acceptedFiles[0];
      
      setFile(uploadedFile);
      setJobId(null);
      setUploadError(null);
      setUploadProgress(0);
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', uploadedFile);

      try {
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.post('/api/v1/invoices/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...authHeader
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(percentCompleted);
          }
        });

        setJobId(response.data.jobId);
      } catch (err: any) {
        setUploadError(err.response?.data?.error || 'Failed to ingest invoice file');
      } finally {
        setIsUploading(false);
      }
    },
    [token]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB limit
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  const getPipelineStageMessage = (stage: string) => {
    switch (stage) {
      case 'queued':
        return 'Queue Ingestion: Enqueued BullMQ job...';
      case 'processing':
        return 'Preprocessing: Adjusting DPI and skew filters...';
      case 'ocr_running':
        return 'Vision OCR: Dispatching to Adaptive Multimodal routing...';
      case 'parsing':
        return 'AI Parsing: Extracting structured field entities...';
      case 'validation':
        return 'Validation: Re-auditing mathematical balances...';
      case 'completed':
        return 'Completed: Stored structured invoice successfully!';
      default:
        return 'Initiating platform worker pipeline...';
    }
  };

  const getProgressColorClass = (stage: string) => {
    if (stage === 'failed') return 'bg-red-500';
    if (stage === 'completed') return 'bg-emerald-500';
    return 'bg-gradient-to-r from-brand-500 to-indigo-500';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-2xl glass-panel relative">
      <h2 className="text-xl font-bold mb-2 text-slate-100 flex items-center space-x-2">
        <UploadCloud className="w-5 h-5 text-indigo-400" />
        <span>Document Ingestion Workspace</span>
      </h2>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        Upload single digital PDFs, scanned receipts, or bills to trigger the multi-agent AI extraction runtime. Max file size: 10MB.
      </p>

      {/* Drag & Drop Target Dropzone */}
      {!jobId && !isUploading && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition duration-200 ${
            isDragActive
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-slate-800 hover:border-slate-700 hover:bg-surface-800'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-300">
            {isDragActive ? 'Drop your invoice here...' : 'Drag & drop your invoice document'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Supports PDF, JPG, or PNG (Max 10MB)</p>
        </div>
      )}

      {/* File Upload Progress */}
      {isUploading && (
        <div className="p-6 rounded-xl border border-slate-800 bg-surface-900 text-center">
          <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-300">Uploading File: {file?.name}</p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
            <div
              className="bg-brand-500 h-1.5 rounded-full transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 mt-2 inline-block font-medium">{uploadProgress}% uploaded</span>
        </div>
      )}

      {/* SSE Real-Time Queue Extraction Tracer */}
      {jobId && (
        <div className="p-6 rounded-xl border border-slate-800 bg-surface-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              AI Processing Lifecycle
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
              status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : status === 'failed'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
            }`}>
              {status}
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-200 mb-4">
            {getPipelineStageMessage(status)}
          </p>

          {/* Core progress bar widget */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColorClass(status)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">{progress}% compiled</span>

          {/* Model Routing Metrics Telemetry */}
          {status === 'completed' && metadata && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap justify-between gap-4 text-xs font-semibold">
              <div className="text-slate-400">
                Routed Model: <span className="text-emerald-400">{metadata.modelUsed || 'Dev Simulation'}</span>
              </div>
              <div className="text-slate-400">
                Duration: <span className="text-indigo-400">{metadata.latencyMs ? `${metadata.latencyMs}ms` : 'N/A'}</span>
              </div>
              <div className="text-slate-400">
                Estimated Cost: <span className="text-slate-200">{metadata.costUsd ? `$${metadata.costUsd}` : 'N/A'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Errors display */}
      {(uploadError || sseError) && (
        <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{uploadError || sseError}</span>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
