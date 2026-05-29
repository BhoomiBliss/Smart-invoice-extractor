import fs from 'fs';
import { extractInvoice } from '../services/ExtractionService';

export class OCRAgent {
  async run(jobData: {
    jobId: string;
    userId: string;
    fileUrl: string;
    originalName: string;
    mimeType: string;
    filepath: string;
    fileSize: number;
  }) {
    console.log(`[OCRAgent] Starting Document Preprocessing & Resilient OCR Routing for Job ID: ${jobData.jobId}`);

    const fileBuffer = fs.readFileSync(jobData.filepath);

    // Execute extraction via our 3-layer circuit-breaker and key pool rotation engine
    const { dto, routeUsed } = await extractInvoice(
      fileBuffer,
      jobData.mimeType,
      jobData.originalName,
      jobData.jobId,
      jobData.userId
    );

    console.log(`[OCRAgent] Extraction complete for Job ID: ${jobData.jobId} using route: ${routeUsed}`);

    return {
      ...jobData,
      extractedDto: dto,
      routeUsed
    };
  }
}

export default OCRAgent;

