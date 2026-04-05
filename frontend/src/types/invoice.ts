export interface InvoiceItem {
  description?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  total?: number;
}

export interface InvoiceData {
  vendor?: string;
  vendor_name?: string;
  suggested_category?: string | null;
  tax_id?: string;
  invoice_number?: string;
  date?: string;
  invoice_date?: string;
  due_date?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  tax_rate?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total?: number;
  currency?: string;
  total_mismatch?: boolean;
  calculated_total?: number;
  is_total_corrected?: boolean;
  status?: string;
  file_url?: string | null;
  validation?: {
    items_total: number;
    expected_total: number;
    difference: number;
    is_match: boolean;
  };
  corrected_total?: number;
  agent_metadata?: {
    confidence_score: number;
    model_used: string;
    manual_review_required: boolean;
    classification: {
      is_handwritten: boolean;
      image_quality: string;
    };
  };
}

export interface DatabaseInvoice {
  id: string;
  user_id?: string | null;
  vendor_name?: string | null;
  vendor_key?: string | null;
  invoice_number?: string | null;
  total_amount?: number | null;
  total?: number | null;
  invoice_date?: string | null;
  month_key?: string | null;
  category?: string | null;
  raw_data?: InvoiceData | null;
  image_url?: string | null;
  file_url?: string | null;
  created_at: string;
  status?: string | null;
  suggested_category?: string | null;
  folder_id?: string | null;
  is_pinned?: boolean;
}

export interface ExtractResponse {
  success: boolean;
  data: InvoiceData;
  cloudSynced?: boolean;
}
