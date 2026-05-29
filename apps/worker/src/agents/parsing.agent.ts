import { ParsedInvoiceDTO } from '../pipeline/modelRouter';

export class ParsingAgent {
  async run(jobData: {
    jobId: string;
    userId: string;
    fileUrl: string;
    originalName: string;
    mimeType: string;
    filepath: string;
    fileSize: number;
    extractedDto: ParsedInvoiceDTO;
  }) {
    console.log(`[ParsingAgent] Commencing Multi-Agent Extraction & Normalization for Job ID: ${jobData.jobId}`);

    const dto = jobData.extractedDto;

    // Normalizations: String sanitizations and lower/upper casings
    const cleanVendor = dto.vendor.value.trim();
    const cleanRecipient = dto.recipient.value.trim();
    const cleanInvoiceNumber = dto.invoiceNumber.value.trim();

    // Standardize Date formats into YYYY-MM-DD
    const parseDateToISO = (dateStr: string): string => {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        return dateStr;
      }
      return dateObj.toISOString().split('T')[0];
    };

    const cleanDate = parseDateToISO(dto.date.value);
    const cleanDueDate = parseDateToISO(dto.dueDate.value);

    // Safely parse raw string or numerical amounts to prevent .toFixed type errors
    const rawTotal = typeof dto.totalAmount.value === 'number'
      ? dto.totalAmount.value
      : parseFloat(String(dto.totalAmount.value)) || 0;

    const rawTax = typeof dto.taxAmount.value === 'number'
      ? dto.taxAmount.value
      : parseFloat(String(dto.taxAmount.value)) || 0;

    // Formats floating-point decimal fields and line items parameters
    const cleanLineItems = dto.lineItems.map((item) => {
      const quantity = Math.max(0, typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0);
      const rawPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0;
      const price = parseFloat(rawPrice.toFixed(2));
      return {
        description: (item.description || '').trim(),
        quantity,
        price,
        amount: parseFloat((quantity * price).toFixed(2))
      };
    });

    const parsedData = {
      vendor: { value: cleanVendor, confidence: dto.vendor.confidence },
      recipient: { value: cleanRecipient, confidence: dto.recipient.confidence },
      invoiceNumber: { value: cleanInvoiceNumber, confidence: dto.invoiceNumber.confidence },
      date: { value: cleanDate, confidence: dto.date.confidence },
      dueDate: { value: cleanDueDate, confidence: dto.dueDate.confidence },
      currency: { value: dto.currency.value.toUpperCase().trim(), confidence: dto.currency.confidence },
      totalAmount: { value: parseFloat(rawTotal.toFixed(2)), confidence: dto.totalAmount.confidence },
      taxAmount: { value: parseFloat(rawTax.toFixed(2)), confidence: dto.taxAmount.confidence },
      lineItems: cleanLineItems,
      summary: dto.summary.trim()
    };

    console.log(`[ParsingAgent] Completed extraction structuring for Job ID: ${jobData.jobId}`);

    return {
      ...jobData,
      parsedData
    };
  }
}

export default ParsingAgent;
