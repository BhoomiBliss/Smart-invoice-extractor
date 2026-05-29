export class ValidationAgent {
  async run(jobData: {
    jobId: string;
    userId: string;
    fileUrl: string;
    originalName: string;
    mimeType: string;
    filepath: string;
    fileSize: number;
    parsedData: any;
  }) {
    console.log(`[ValidationAgent] Commencing background mathematical checksum checks for Job ID: ${jobData.jobId}`);

    const data = jobData.parsedData;
    
    // Sum all item amounts
    const sumLineItems = data.lineItems.reduce((acc: number, item: any) => acc + item.amount, 0);
    const expectedTotal = data.totalAmount.value;

    // Verify mathematical consistency using float tolerance threshold
    const difference = Math.abs(sumLineItems - expectedTotal);
    const isMathValid = difference < 0.01;

    console.log(
      `[ValidationAgent] Checksum details -> Total amount: ${expectedTotal}, Items sum: ${sumLineItems}, Verified: ${isMathValid}`
    );

    return {
      ...jobData,
      mathValid: isMathValid
    };
  }
}

export default ValidationAgent;
