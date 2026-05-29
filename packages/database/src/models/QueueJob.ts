import mongoose, { Schema, Document } from 'mongoose';

export interface IQueueJobDocument extends Document {
  jobId: string;
  userId: string;
  status: 'queued' | 'processing' | 'ocr_running' | 'parsing' | 'validation' | 'completed' | 'failed';
  progress: number;
  modelUsed?: string;
  latencyMs?: number;
  costUsd?: number;
  error?: string;
  result?: any;
  createdAt: Date;
  updatedAt: Date;
}

const QueueJobSchema = new Schema<IQueueJobDocument>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', index: true },
    progress: { type: Number, default: 0 },
    modelUsed: { type: String },
    latencyMs: { type: Number },
    costUsd: { type: Number },
    error: { type: String },
    result: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true
  }
);

export const QueueJobModel = mongoose.models.QueueJob || mongoose.model<IQueueJobDocument>('QueueJob', QueueJobSchema);
export default QueueJobModel;
