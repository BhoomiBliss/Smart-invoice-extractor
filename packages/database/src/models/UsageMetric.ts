// ==============================================================================
// DATABASE USAGE METRIC MODEL - INVOICEFLOW AI
// ==============================================================================

import mongoose, { Schema, Document } from 'mongoose';

export interface IUsageMetricDocument extends Document {
  tenantId: string;
  userId?: string;
  pagesProcessed: number;
  aiTokens: number;
  exportsGenerated: number;
  apiCalls: number;
  estimatedCost: number;
  timestamp: Date;
}

const UsageMetricSchema = new Schema<IUsageMetricDocument>({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  pagesProcessed: { type: Number, default: 0 },
  aiTokens: { type: Number, default: 0 },
  exportsGenerated: { type: Number, default: 0 },
  apiCalls: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Index to aggregate dynamic costs over time per tenant
UsageMetricSchema.index({ tenantId: 1, timestamp: -1 });

export const UsageMetricModel = mongoose.models.UsageMetric || mongoose.model<IUsageMetricDocument>('UsageMetric', UsageMetricSchema);
export default UsageMetricModel;
