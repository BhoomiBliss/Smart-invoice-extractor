import mongoose from 'mongoose';
import { InvoiceModel, QueueJobModel, AuditLogModel } from '@multi-agent-invoice/database';

export class DBWriterAgent {
  async run(jobData: {
    jobId: string;
    userId: string;
    fileUrl: string;
    originalName: string;
    mimeType: string;
    filepath: string;
    fileSize: number;
    parsedData: any;
    mathValid: boolean;
    overallConfidence: number;
  }) {
    console.log(`[DBWriterAgent] Commencing database persistence transactions for Job ID: ${jobData.jobId}`);

    const data = jobData.parsedData;
    const isGuest = jobData.userId === 'guest';
    const routeUsed = (jobData as any).routeUsed || 'gemini';
    const modelUsed = routeUsed === 'gemini'
      ? 'gemini-1.5-flash'
      : routeUsed === 'openrouter'
        ? 'qwen-2.5-vl-7b-instruct'
        : 'tesseract-ocr-mistral-7b';

    let invoiceRecord = null;

    if (!isGuest) {
      // Binds documents directly to user spaces
      invoiceRecord = await InvoiceModel.create({
        userId: new mongoose.Types.ObjectId(jobData.userId),
        tenantId: (jobData as any).tenantId || 'default_tenant',
        checksumHash: (jobData as any).checksumHash || '',
        schemaVersion: 'v1',
        vendor: data.vendor,
        recipient: data.recipient,
        invoiceNumber: data.invoiceNumber,
        date: data.date,
        dueDate: data.dueDate,
        currency: data.currency,
        totalAmount: data.totalAmount,
        taxAmount: data.taxAmount,
        lineItems: data.lineItems,
        confidenceScore: jobData.overallConfidence,
        modelUsed,
        routeUsed,
        summary: data.summary,
        status: 'completed',
        mathValid: jobData.mathValid,
        fileUrl: jobData.fileUrl,
        corrections: []
      });

      // Write administrative telemetry trace
      await AuditLogModel.create({
        level: 'info',
        action: 'DOCUMENT_INVOICE_EXTRACTED',
        userId: new mongoose.Types.ObjectId(jobData.userId),
        metadata: {
          jobId: jobData.jobId,
          invoiceId: invoiceRecord._id,
          vendor: data.vendor.value,
          total: data.totalAmount.value,
          confidence: jobData.overallConfidence
        }
      });

      console.log(
        `[DBWriterAgent] Invoice committed successfully with Checksum: ${(jobData as any).checksumHash || 'N/A'}. Doc ID: ${invoiceRecord._id}, Job ID: ${jobData.jobId}`
      );
    } else {
      console.log('[DBWriterAgent] Guest Session runtime detected. Skipping MongoDB Atlas persistence.');
    }

    const guestPayload = {
      schemaVersion: 'v1',
      vendor: data.vendor,
      recipient: data.recipient,
      invoiceNumber: data.invoiceNumber,
      date: data.date,
      dueDate: data.dueDate,
      currency: data.currency,
      totalAmount: data.totalAmount,
      taxAmount: data.taxAmount,
      lineItems: data.lineItems,
      confidenceScore: jobData.overallConfidence,
      modelUsed,
      routeUsed,
      summary: data.summary,
      status: 'completed',
      mathValid: jobData.mathValid,
      fileUrl: jobData.fileUrl,
      corrections: []
    };

    return {
      ...jobData,
      invoiceId: invoiceRecord ? invoiceRecord._id : null,
      result: invoiceRecord ? invoiceRecord.toObject() : guestPayload
    };
  }
}

export default DBWriterAgent;
