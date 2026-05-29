// ==============================================================================
// DATABASE SUPPORT TICKET MODEL - INVOICEFLOW AI
// ==============================================================================

import mongoose, { Schema, Document } from 'mongoose';
import { TicketReply } from '@multi-agent-invoice/shared';

export interface ISupportTicketDocument extends Document {
  ticketId: string;
  userId: string;
  tenantId: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  replies: TicketReply[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketReplySchema = new Schema(
  {
    replyId: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const SupportTicketSchema = new Schema<ISupportTicketDocument>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW', index: true },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'OPEN', index: true },
    replies: { type: [TicketReplySchema], default: [] }
  },
  {
    timestamps: true
  }
);

// High performance indexes for quick dashboard filtering
SupportTicketSchema.index({ tenantId: 1, status: 1 });
SupportTicketSchema.index({ userId: 1, status: 1 });

export const SupportTicketModel = mongoose.models.SupportTicket || mongoose.model<ISupportTicketDocument>('SupportTicket', SupportTicketSchema);
export default SupportTicketModel;
