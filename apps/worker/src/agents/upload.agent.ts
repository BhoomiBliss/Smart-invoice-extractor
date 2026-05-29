import fs from 'fs';
import path from 'path';

export class UploadAgent {
  async run(jobData: {
    jobId: string;
    userId: string;
    fileUrl: string;
    originalName: string;
    mimeType: string;
  }) {
    console.log(`[UploadAgent] Commencing validation on document for Job ID: ${jobData.jobId}`);
    
    const serverUploadsDir = path.join(__dirname, '../../../../server/uploads');
    const filename = path.basename(jobData.fileUrl);
    const filepath = path.join(serverUploadsDir, filename);

    // Verify file physical presence on the server disk
    if (!fs.existsSync(filepath)) {
      throw new Error(`Ingestion Exception: Document file not found on disk storage: ${filepath}`);
    }

    const fileStats = fs.statSync(filepath);
    console.log(`[UploadAgent] Document ingestion integrity verified. Size: ${fileStats.size} bytes`);

    return {
      ...jobData,
      filepath,
      fileSize: fileStats.size
    };
  }
}

export default UploadAgent;
