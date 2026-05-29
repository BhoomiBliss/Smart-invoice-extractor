export class ConsensusAgent {
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
  }) {
    console.log(`[ConsensusAgent] Evaluating overall extraction consensus values for Job ID: ${jobData.jobId}`);

    const data = jobData.parsedData;

    // Aggregate extraction weights
    const confidenceParameters = [
      data.vendor.confidence,
      data.recipient.confidence,
      data.invoiceNumber.confidence,
      data.date.confidence,
      data.dueDate.confidence,
      data.currency.confidence,
      data.totalAmount.confidence
    ];

    let rawScore = confidenceParameters.reduce((sum, val) => sum + val, 0) / confidenceParameters.length;

    // Apply numerical consistency penalty if the validation audit failed
    if (!jobData.mathValid) {
      console.warn('[ConsensusAgent] Warning: Applying confidence score penalty due to line items math mismatch');
      rawScore = Math.max(0.1, rawScore - 0.15); // Deduct 15% confidence
    }

    const overallConfidence = parseFloat(rawScore.toFixed(4));
    console.log(`[ConsensusAgent] Final computed consensus confidence: ${overallConfidence}`);

    return {
      ...jobData,
      overallConfidence
    };
  }
}

export default ConsensusAgent;
