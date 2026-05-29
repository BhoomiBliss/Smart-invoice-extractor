import { Invoice } from '@multi-agent-invoice/shared';

export type ReconciliationDecision = 'APPLY' | 'IGNORE_STALE' | 'CONFLICT';

export interface InvoiceStateVector {
  version: number;
  epoch: number;
  hash: string;
  isSnapshotComplete: boolean;
  isDirtyLocal: boolean;
}

export interface ReconciledInvoiceState {
  decision: ReconciliationDecision;
  resolvedData: Invoice;
  conflictDetails?: {
    serverSnapshot: Invoice;
    localSnapshot: Invoice;
  };
}

/**
 * PURE RECONCILIATION REDUCER LAYER - INVOICEFLOW AI
 * Operates completely outside of Zustand with zero side effects.
 * Enforces server-authoritative version rules, drops out-of-order SSE logs,
 * and isolates local draft edits from partial background ingestion snapshots.
 */
export const reconcileState = (
  localInvoice: Invoice,
  localVector: InvoiceStateVector,
  incomingInvoice: Invoice,
  incomingVector: InvoiceStateVector
): ReconciledInvoiceState => {
  // Guard 1: Epoch Invalidation (State Epoch Barrier)
  if (incomingVector.epoch > localVector.epoch) {
    console.log(`[RECONCILER] Epoch Barrier advanced: ${incomingVector.epoch} > ${localVector.epoch}. Applying server truth.`);
    return {
      decision: 'APPLY',
      resolvedData: incomingInvoice
    };
  }

  if (incomingVector.epoch < localVector.epoch) {
    console.log(`[RECONCILER] Stale epoch event ignored: ${incomingVector.epoch} < ${localVector.epoch}`);
    return {
      decision: 'IGNORE_STALE',
      resolvedData: localInvoice
    };
  }

  // Guard 2: Snapshot Completeness Check
  if (!incomingVector.isSnapshotComplete) {
    console.log('[RECONCILER] Partial update payload received. Discarding state change to protect local editing canvas.');
    const metadataUpdate = {
      ...localInvoice,
      status: incomingInvoice.status
    };
    return {
      decision: 'APPLY',
      resolvedData: metadataUpdate
    };
  }

  // Guard 3: Monotonic Version Gate & Deterministic Priority
  // RULE: server.version ALWAYS wins over local.version unless local is a "dirty-unconfirmed draft"

  if (incomingVector.version < localVector.version) {
    // Under client-authoritative version elimination, local should not exceed server version unless out of order SSE.
    console.log(`[RECONCILER] Out-of-order stale version discarded: Server version ${incomingVector.version} < Local ${localVector.version}`);
    return {
      decision: 'IGNORE_STALE',
      resolvedData: localInvoice
    };
  }

  if (incomingVector.version === localVector.version) {
    if (incomingVector.hash === localVector.hash) {
      return {
        decision: 'IGNORE_STALE',
        resolvedData: localInvoice
      };
    }

    if (localVector.isDirtyLocal) {
      console.warn('[RECONCILER] Concurrency conflict triggered! Version match but structural checksum mismatch on dirty local state.');
      return {
        decision: 'CONFLICT',
        resolvedData: localInvoice,
        conflictDetails: {
          serverSnapshot: incomingInvoice,
          localSnapshot: localInvoice
        }
      };
    }

    // If local is not dirty, server version wins (applies updates)
    console.log('[RECONCILER] Identical version hash mismatch on non-dirty state. Applying server updates.');
    return {
      decision: 'APPLY',
      resolvedData: incomingInvoice
    };
  }

  // Case: incomingVector.version > localVector.version (Newer server version)
  if (localVector.isDirtyLocal) {
    console.warn(`[RECONCILER] Concurrency conflict triggered! Server is newer (${incomingVector.version} > ${localVector.version}) but local has dirty unsaved edits.`);
    return {
      decision: 'CONFLICT',
      resolvedData: localInvoice,
      conflictDetails: {
        serverSnapshot: incomingInvoice,
        localSnapshot: localInvoice
      }
    };
  }

  // Newer server version wins completely since local is clean
  console.log(`[RECONCILER] Valid advanced server update applied: version ${incomingVector.version}`);
  return {
    decision: 'APPLY',
    resolvedData: incomingInvoice
  };
};

export default reconcileState;
