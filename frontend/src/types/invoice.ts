export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceData {
  vendor: string;
  tax_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  total_mismatch?: boolean;
  calculated_total?: number;
}

export interface ExtractResponse {
  success: boolean;
  data: InvoiceData;
}
