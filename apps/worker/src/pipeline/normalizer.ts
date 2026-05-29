import { ParsedInvoiceDTO } from './modelRouter';

export interface CanonicalLineItem {
  description: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface CanonicalInvoiceExtraction {
  vendor: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  total: number | null;
  tax: number | null;
  currency: string | null;
  lineItems: CanonicalLineItem[];
  confidence: number;
  partialExtraction: boolean;
  rawText?: string;
}

export const normalizeGemini = (raw: ParsedInvoiceDTO): CanonicalInvoiceExtraction => {
  return {
    vendor: raw.vendor.value || null,
    invoiceNumber: raw.invoiceNumber.value || null,
    invoiceDate: raw.date.value || null,
    total: raw.totalAmount.value || 0,
    tax: raw.taxAmount.value || 0,
    currency: raw.currency.value || 'USD',
    lineItems: raw.lineItems.map(item => ({
      description: item.description || 'Line Item',
      quantity: item.quantity || 1,
      price: item.price || 0,
      amount: item.amount || 0
    })),
    confidence: raw.vendor.confidence,
    partialExtraction: !raw.vendor.value || !raw.invoiceNumber.value || !raw.totalAmount.value
  };
};

export const normalizeQwen = (raw: ParsedInvoiceDTO): CanonicalInvoiceExtraction => {
  return {
    vendor: raw.vendor.value || null,
    invoiceNumber: raw.invoiceNumber.value || null,
    invoiceDate: raw.date.value || null,
    total: raw.totalAmount.value || 0,
    tax: raw.taxAmount.value || 0,
    currency: raw.currency.value || 'USD',
    lineItems: raw.lineItems.map(item => ({
      description: item.description || 'Line Item',
      quantity: item.quantity || 1,
      price: item.price || 0,
      amount: item.amount || 0
    })),
    confidence: raw.vendor.confidence,
    partialExtraction: !raw.vendor.value || !raw.invoiceNumber.value || !raw.totalAmount.value
  };
};

export const normalizeLlama = (raw: ParsedInvoiceDTO): CanonicalInvoiceExtraction => {
  return {
    vendor: raw.vendor.value || null,
    invoiceNumber: raw.invoiceNumber.value || null,
    invoiceDate: raw.date.value || null,
    total: raw.totalAmount.value || 0,
    tax: raw.taxAmount.value || 0,
    currency: raw.currency.value || 'USD',
    lineItems: raw.lineItems.map(item => ({
      description: item.description || 'Line Item',
      quantity: item.quantity || 1,
      price: item.price || 0,
      amount: item.amount || 0
    })),
    confidence: raw.vendor.confidence,
    partialExtraction: !raw.vendor.value || !raw.invoiceNumber.value || !raw.totalAmount.value
  };
};
