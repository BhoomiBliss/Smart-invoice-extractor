// ==============================================================================
// DATABASE USER MODEL - INVOICEFLOW AI
// ==============================================================================

import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@multi-agent-invoice/shared';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  tenantId: string;
  isSuspended: boolean;
  isDeleted: boolean;
  uploadsToday: number;
  quotaLimit: number;
  lastUploadReset: Date;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'viewer', 'user', 'support', 'ops'], default: 'user' },
    tenantId: { type: String, required: true, index: true },
    isSuspended: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    uploadsToday: { type: Number, default: 0 },
    quotaLimit: { type: Number, default: 50 },
    lastUploadReset: { type: Date, default: Date.now },
    tokenVersion: { type: Number, default: 1 }
  },
  {
    timestamps: true
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
export default UserModel;
