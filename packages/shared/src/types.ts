// ==============================================================================
// TYPE DEFINITIONS - INVOICEFLOW AI
// ==============================================================================

export type UserRole = 'admin' | 'manager' | 'viewer' | 'user' | 'support' | 'ops';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  isSuspended: boolean;
  isDeleted: boolean;
  uploadsToday: number;
  quotaLimit: number;
  lastUploadReset: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldConfidence<T> {
  value: T;
  confidence: number;
}

export interface LineItem {
  description: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface CorrectionEntry {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface InvoiceRevision {
  revisionNumber: number;
  changedFields: string[];
  timestamp: string;
  modifiedBy: string; // userId
  rollbackSnapshot: any; // complete snapshot
}

export interface Invoice {
  id: string;
  userId: string;
  tenantId: string;
  schemaVersion: string;
  vendor: FieldConfidence<string>;
  recipient: FieldConfidence<string>;
  invoiceNumber: FieldConfidence<string>;
  date: FieldConfidence<string>;
  dueDate: FieldConfidence<string>;
  currency: FieldConfidence<string>;
  totalAmount: FieldConfidence<number>;
  taxAmount: FieldConfidence<number>;
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
  deletedAt?: string;
  revisionHistory: InvoiceRevision[];
  checksumHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface QueueJob {
  id: string;
  jobId: string;
  userId: string;
  tenantId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  modelUsed?: string;
  latencyMs?: number;
  costUsd?: number;
  error?: string;
  result?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryMetrics {
  totalDocs: number;
  avgConfidence: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  throughput: { hour: string; count: number }[];
  accuracyByDocType: { docType: string; accuracy: number }[];
  costOverTime: { date: string; cost: number }[];
}

// ==============================================================================
// ENTERPRISE SAAS ADDITIONS
// ==============================================================================

export interface UsageMetric {
  id: string;
  tenantId: string;
  userId?: string;
  pagesProcessed: number;
  aiTokens: number;
  exportsGenerated: number;
  apiCalls: number;
  estimatedCost: number;
  timestamp: string;
}

export interface TicketReply {
  replyId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  userId: string;
  tenantId: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadSession {
  sessionId: string;
  tenantId: string;
  userId?: string;
  uploadStatus: 'queued' | 'processing' | 'ocr_running' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export enum SSEEventType {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  OCR_RUNNING = 'OCR_RUNNING',
  VALIDATING = 'VALIDATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface SSEPayload {
  event: SSEEventType;
  progress: number;
  message: string;
  jobId: string;
  traceId: string;
  result?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  traceId: string;
}
