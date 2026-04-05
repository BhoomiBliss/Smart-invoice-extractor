import type { InvoiceData } from "../types/invoice";

// 💾 In-memory storage for guest results (clears on refresh)
let memoryGuestHistory: InvoiceData[] = [];

export const getGuestHistory = (): InvoiceData[] => {
  return [...memoryGuestHistory];
};

export const addGuestInvoice = (invoice: InvoiceData) => {
  memoryGuestHistory = [
    {
      ...invoice,
      _id: Date.now(),
      _created_at: new Date().toISOString(),
    } as any,
    ...memoryGuestHistory,
  ].slice(0, 20);
  
  // Notify listeners
  window.dispatchEvent(new Event("invoice-history-updated"));
};

export const clearGuestHistory = () => {
  memoryGuestHistory = [];
  window.dispatchEvent(new Event("invoice-history-updated"));
};
