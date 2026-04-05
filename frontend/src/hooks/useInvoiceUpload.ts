import { useState } from "react";
import toast from "react-hot-toast";
import type { ExtractResponse, InvoiceData } from "../types/invoice";
import { supabase } from "../lib/supabase";
import { addGuestInvoice } from "../lib/guestHistory";

interface UseInvoiceUploadReturn {
  isExtracting: boolean;
  error: string | null;
  extractedData: InvoiceData | null;
  steps: string[];
  handleUpload: (file: File) => Promise<void>;
  reset: () => void;
}

export const useInvoiceUpload = (
  onSuccess?: (
    data: InvoiceData,
    payload: ExtractResponse,
  ) => void | Promise<void>,
): UseInvoiceUploadReturn => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  const reset = () => {
    setError(null);
    setExtractedData(null);
    setIsExtracting(false);
    setSteps([]);
  };

  const saveToGuestHistory = (invoice: InvoiceData) => {
    addGuestInvoice(invoice);
  };

  const handleUpload = async (file: File) => {
    setIsExtracting(true);
    setError(null);
    setSteps(["Uploading file..."]);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    const user = data.session?.user ?? null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      let response: Response;
      try {
        response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/extract`, {
          method: "POST",
          body: formData,
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}, // guest mode (empty headers)
        });
      } catch (networkErr: any) {
        throw new Error(
          "Cannot reach the backend. Make sure server is running on port 5001.",
        );
      }

      if (!response.ok) {
        const errBody = await response
          .json()
          .catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }

      const payload: ExtractResponse = await response.json();
      const result: InvoiceData = payload.data ?? payload;

      setSteps(["Extraction complete."]);
      setExtractedData(result);

      if (payload.cloudSynced) {
        toast.success("Invoice extracted and saved!");
      } else {
        toast.success("Invoice extracted!");
      }

      if (onSuccess) {
        await onSuccess(result, payload);
      }

      if (!user) {
        saveToGuestHistory(result);
      }

      window.dispatchEvent(new CustomEvent("invoice-history-updated"));
    } catch (err: any) {
      console.error("Extraction failed:", err);
      const msg = err.message || "Processing failed";
      
      // Silence 'No token' error for guest mode
      const isTokenError = msg.toLowerCase().includes("no token");
      if (!user && isTokenError) {
        console.log("Silencing token error for guest mode");
        return;
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  return { isExtracting, error, extractedData, steps, handleUpload, reset };
};
