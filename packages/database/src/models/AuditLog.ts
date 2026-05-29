import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLogDocument extends Document {
  level: 'info' | 'warn' | 'error';
  action: string;
  userId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>({
  level: { type: String, enum: ['info', 'warn', 'error'], required: true, index: true },
  action: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
export default AuditLogModel;
