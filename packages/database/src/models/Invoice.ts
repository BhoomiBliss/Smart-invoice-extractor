// ==============================================================================
// DATABASE INVOICE MODEL - INVOICEFLOW AI
// ==============================================================================

import mongoose, { Schema, Document } from 'mongoose';
import { LineItem, CorrectionEntry, InvoiceRevision } from '@multi-agent-invoice/shared';

export interface IInvoiceDocument extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: string;
  schemaVersion: string;
  vendor: { value: string; confidence: number };
  recipient: { value: string; confidence: number };
  invoiceNumber: { value: string; confidence: number };
  date: { value: string; confidence: number };
  dueDate: { value: string; confidence: number };
  currency: { value: string; confidence: number };
  totalAmount: { value: number; confidence: number };
  taxAmount: { value: number; confidence: number };
  lineItems: LineItem[];
  confidenceScore: number;
  modelUsed: string;
  routeUsed?: 'gemini' | 'openrouter' | 'tesseract';
  summary: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'needs_review' | 'editing' | 'verified' | 'finalized' | 'exporting' | 'exported' | 'export_failed';
  mathValid: boolean;
  corrections: CorrectionEntry[];
  fileUrl: string;
  isDeleted: boolean;
  deletedAt?: Date;
  revisionHistory: InvoiceRevision[];
  checksumHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FieldConfidenceSchema = new Schema(
  {
    value: { type: Schema.Types.Mixed, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 }
  },
  { _id: false }
);

const LineItemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    amount: { type: Number, required: true }
  },
  { _id: false }
);

const CorrectionEntrySchema = new Schema(
  {
    field: { type: String, required: true },
    oldValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const InvoiceRevisionSchema = new Schema(
  {
    revisionNumber: { type: Number, required: true },
    changedFields: { type: [String], default: [] },
    timestamp: { type: Date, default: Date.now },
    modifiedBy: { type: String, required: true },
    rollbackSnapshot: { type: Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoiceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    schemaVersion: { type: String, default: 'v1' },
    vendor: { type: FieldConfidenceSchema, required: true },
    recipient: { type: FieldConfidenceSchema, required: true },
    invoiceNumber: { type: FieldConfidenceSchema, required: true },
    date: { type: FieldConfidenceSchema, required: true },
    dueDate: { type: FieldConfidenceSchema, required: true },
    currency: { type: FieldConfidenceSchema, required: true },
    totalAmount: { type: FieldConfidenceSchema, required: true },
    taxAmount: { type: FieldConfidenceSchema, required: true },
    lineItems: { type: [LineItemSchema], default: [] },
    confidenceScore: { type: Number, required: true, default: 0 },
    modelUsed: { type: String, required: true, default: 'simulation' },
    routeUsed: { type: String, enum: ['gemini', 'openrouter', 'tesseract'], default: 'gemini' },
    summary: { type: String, default: '' },
    status: { type: String, default: 'queued' },
    mathValid: { type: Boolean, default: true },
    corrections: { type: [CorrectionEntrySchema], default: [] },
    fileUrl: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    revisionHistory: { type: [InvoiceRevisionSchema], default: [] },
    checksumHash: { type: String, index: true }
  },
  {
    timestamps: true
  }
);

// High-performance operational compound database indexes
InvoiceSchema.index({ tenantId: 1, createdAt: -1 });
InvoiceSchema.index({ tenantId: 1, status: 1 });
InvoiceSchema.index({ tenantId: 1, 'vendor.value': 1 });
InvoiceSchema.index({ status: 1 });

// Prevent duplicate invoice ingestion under the same tenant (unless soft-deleted)
InvoiceSchema.index(
  { tenantId: 1, 'vendor.value': 1, 'invoiceNumber.value': 1 },
  { unique: true, partialFilterExpression: { status: 'completed', isDeleted: false } }
);

export const InvoiceModel = mongoose.models.Invoice || mongoose.model<IInvoiceDocument>('Invoice', InvoiceSchema);
export default InvoiceModel;
