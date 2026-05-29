import { useState, useEffect } from 'react';

export interface SSEMetadata {
  modelUsed?: string;
  latencyMs?: number;
  costUsd?: number;
}

export const useSSE = (jobId: string | null, onCompleted?: (result: any) => void) => {
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SSEMetadata | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus('idle');
      setProgress(0);
      setError(null);
      setMetadata(null);
      return;
    }

    setStatus('queued');
    setProgress(0);
    setError(null);
    setMetadata(null);

    const eventSource = new EventSource(`/api/v1/jobs/${jobId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setStatus(payload.status);
        setProgress(payload.progress);

        if (payload.error) {
          setError(payload.error);
        }

        if (payload.status === 'completed') {
          setMetadata({
            modelUsed: payload.modelUsed,
            latencyMs: payload.latencyMs,
            costUsd: payload.costUsd
          });
          eventSource.close();
          if (onCompleted) {
            onCompleted(payload.result);
          }
        } else if (payload.status === 'failed') {
          setError(payload.error || 'Pipeline execution failed');
          eventSource.close();
        }
      } catch (err) {
        setError('Failed to parse SSE event payload');
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError('Connection interrupted. Unable to track job state.');
      setStatus('failed');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return { status, progress, error, metadata };
};

export default useSSE;
