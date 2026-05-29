import { LineItem } from '@multi-agent-invoice/shared';

export interface RecalculationResult {
  lineItems: LineItem[];
  totalAmount: number;
  taxAmount: number;
  mathValid: boolean;
}

/**
 * DETERMINISTIC STATELESS FINANCIAL ENGINE - INVOICEFLOW AI
 * Performs all arithmetic operations immutably with floating-point precision guards.
 */
export const recalculateFinancials = (
  lineItems: LineItem[],
  taxRatePercent: number = 18,
  totalOverride?: number
): RecalculationResult => {
  const recalculatedItems = lineItems.map((item) => {
    const qty = Math.max(0, item.quantity || 0);
    const prc = Math.max(0, item.price || 0);
    const amount = parseFloat((qty * prc).toFixed(2));
    return {
      ...item,
      quantity: qty,
      price: prc,
      amount
    };
  });

  const subtotal = recalculatedItems.reduce((sum, item) => sum + item.amount, 0);
  const roundedSubtotal = parseFloat(subtotal.toFixed(2));

  // Determine tax (18% by default if not specified)
  const tax = parseFloat((roundedSubtotal * (taxRatePercent / 100)).toFixed(2));
  
  const total = totalOverride !== undefined
    ? parseFloat(totalOverride.toFixed(2))
    : parseFloat((roundedSubtotal + tax).toFixed(2));

  const mathValid = Math.abs(roundedSubtotal - total) < 0.01 || Math.abs((roundedSubtotal + tax) - total) < 0.01;

  return {
    lineItems: recalculatedItems,
    totalAmount: total,
    taxAmount: tax,
    mathValid
  };
};

/**
 * Deep-merge utility resolving diffs between active local changes and incoming server updates
 */
export const resolveLineItemDiff = (
  localItems: LineItem[],
  serverItems: LineItem[]
): LineItem[] => {
  const resolved: LineItem[] = [];
  const serverMap = new Map(serverItems.map((item) => [item.description.trim().toLowerCase(), item]));

  for (const localItem of localItems) {
    const key = localItem.description.trim().toLowerCase();
    const serverMatch = serverMap.get(key);
    if (serverMatch) {
      resolved.push({
        description: localItem.description,
        quantity: localItem.quantity !== serverMatch.quantity ? localItem.quantity : serverMatch.quantity,
        price: localItem.price !== serverMatch.price ? localItem.price : serverMatch.price,
        amount: localItem.amount !== serverMatch.amount ? localItem.amount : serverMatch.amount
      });
      serverMap.delete(key);
    } else {
      resolved.push(localItem);
    }
  }

  for (const remainingServerItem of serverMap.values()) {
    resolved.push(remainingServerItem);
  }

  return resolved;
};


export const sortDeepObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortDeepObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: any = {};
  for (const key of sortedKeys) {
    sortedObj[key] = sortDeepObject(obj[key]);
  }
  return sortedObj;
};

export const computeInvoiceHash = (invoice: any): string => {
  if (!invoice) return '';
  const sorted = sortDeepObject({
    vendor: invoice.vendor?.value || '',
    recipient: invoice.recipient?.value || '',
    invoiceNumber: invoice.invoiceNumber?.value || '',
    date: invoice.date?.value || '',
    dueDate: invoice.dueDate?.value || '',
    currency: invoice.currency?.value || '',
    totalAmount: invoice.totalAmount?.value || 0,
    taxAmount: invoice.taxAmount?.value || 0,
    lineItems: (invoice.lineItems || []).map((item: any) => ({
      description: (item.description || '').trim().toLowerCase(),
      quantity: item.quantity || 0,
      price: item.price || 0,
      amount: item.amount || 0
    }))
  });
  const content = JSON.stringify(sorted);
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

export const deepFreeze = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = obj[prop];
    if (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function') &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value as any);
    }
  });
  return obj;
};

export default recalculateFinancials;
