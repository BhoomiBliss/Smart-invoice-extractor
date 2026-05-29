import { create } from 'zustand';
import { Invoice, LineItem, SSEPayload } from '@multi-agent-invoice/shared';
import { recalculateFinancials, resolveLineItemDiff, computeInvoiceHash, deepFreeze } from './utils/financialEngine';
import { writeCommandQueue } from './utils/WriteCommandQueue';
import { reconcileState, InvoiceStateVector, ReconciledInvoiceState } from './utils/reconcileState';
import { persistenceAdapter, syncEngine } from './utils/DraftPersistenceAdapter';

export type SyncState = 'SYNCED' | 'DIRTY_LOCAL' | 'PENDING_WRITE' | 'SERVER_UPDATED' | 'CONFLICT_DETECTED' | 'RESOLVED';

export interface EditorSlice {
  invoice: Invoice | null;
  serverInvoice: Invoice | null; // Cached server truth for 3-way conflicts
  selectedRow: number | null;
  editingCell: { rowIndex: number; field: string } | null;
  validationErrors: string[];
}

export interface SyncSlice {
  syncState: SyncState;
  draftVersion: number;
  lastSyncedVersion: number;
  epochId: number;
  isOutOfSync: boolean;
  conflictMode: 'KEEP_LOCAL' | 'PULL_SERVER' | 'SMART_MERGE' | null;
  unsavedChanges: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
}

export interface RevisionSlice {
  revisionsHistory: any[];
  currentRevisionId: string | null;
}

export interface AuthSlice {
  token: string | null;
  user: any | null;
  tenantId: string | null;
}

interface UiSliceCompat {
  conflictMode: 'KEEP_LOCAL' | 'PULL_SERVER' | 'SMART_MERGE' | null;
  isSaving: boolean;
  saveSuccess: boolean;
}

interface InvoiceEditorStore {
  editorSlice: EditorSlice;
  syncSlice: SyncSlice;
  revisionSlice: RevisionSlice;
  authSlice: AuthSlice;

  // Backwards compatibility flat getters
  invoice: Invoice | null;
  unsavedChanges: boolean;
  uiSlice: UiSliceCompat;

  // Throttling state for SSE Backpressure Protection
  sseTracker: {
    timestamps: number[];
    timeoutId: NodeJS.Timeout | null;
    bufferedPayload: any | null;
  };

  // Initializers & Credentials
  setInvoice: (invoice: Invoice | null) => void;
  setCredentials: (token: string | null, user: any, tenantId: string | null) => void;

  // Editor Actions (Immutable adaptors to Pure Engine)
  updateField: (field: keyof Invoice, value: any) => void;
  updateLineItem: (index: number, field: keyof LineItem, value: any) => void;
  addLineItem: (item: LineItem) => void;
  removeLineItem: (index: number) => void;
  syncRawJson: (jsonString: string) => boolean;

  // Synchronization and Reconciliation Pipeline
  saveChangesToServer: () => Promise<boolean>;
  receiveSSEUpdate: (incoming: any) => void;
  applySSEEvent: (event: SSEPayload) => void;
  applyReconciledState: (reconciled: ReconciledInvoiceState) => void;
  resolveConflict: (mode: 'KEEP_LOCAL' | 'PULL_SERVER' | 'SMART_MERGE') => Promise<void>;
}

export const useInvoiceStore = create<InvoiceEditorStore>((set, get) => ({
  // Flat getters (forwarded to the slices)
  invoice: null,
  unsavedChanges: false,
  uiSlice: {
    conflictMode: null,
    isSaving: false,
    saveSuccess: false
  },

  editorSlice: {
    invoice: null,
    serverInvoice: null,
    selectedRow: null,
    editingCell: null,
    validationErrors: []
  },
  
  syncSlice: {
    syncState: 'SYNCED',
    draftVersion: 0,
    lastSyncedVersion: 0,
    epochId: 1,
    isOutOfSync: false,
    conflictMode: null,
    unsavedChanges: false,
    isSaving: false,
    saveSuccess: false
  },

  revisionSlice: {
    revisionsHistory: [],
    currentRevisionId: null
  },

  authSlice: {
    token: null,
    user: null,
    tenantId: null
  },

  sseTracker: {
    timestamps: [],
    timeoutId: null,
    bufferedPayload: null
  },

  setCredentials: (token, user, tenantId) => {
    set((state) => ({
      authSlice: deepFreeze({ ...state.authSlice, token, user, tenantId })
    }));
  },

  setInvoice: (invoice) => {
    if (!invoice) {
      set((state) => ({
        invoice: null,
        unsavedChanges: false,
        uiSlice: { conflictMode: null, isSaving: false, saveSuccess: false },
        editorSlice: {
          invoice: null,
          serverInvoice: null,
          selectedRow: null,
          editingCell: null,
          validationErrors: []
        },
        syncSlice: {
          syncState: 'SYNCED',
          draftVersion: 0,
          lastSyncedVersion: 0,
          epochId: 1,
          isOutOfSync: false,
          conflictMode: null,
          unsavedChanges: false,
          isSaving: false,
          saveSuccess: false
        }
      }));
      return;
    }

    const version = invoice.revisionHistory ? invoice.revisionHistory.length : 0;
    const epoch = (invoice as any).epochId || 1;
    const { tenantId, user } = get().authSlice;
    const userId = user ? user.id : 'guest';

    let resolvedInvoice = structuredClone(invoice);
    let finalVersion = version;

    // Check if there is a namespace-isolated localStorage backup draft
    if (tenantId) {
      const draft = persistenceAdapter.load(tenantId, userId, invoice.id);
      if (draft) {
        console.log(`[STORE] Recovered draft from localStorage for invoice ${invoice.id}`);
        
        // Enforce version soft merge fallback
        if (draft.draftVersion > version) {
          const merged = persistenceAdapter.softMerge(draft.invoice, invoice);
          if (merged) {
            console.log(`[STORE] Soft-merged draft version ${draft.draftVersion} with server version ${version}`);
            resolvedInvoice = merged;
            finalVersion = draft.draftVersion;
          } else {
            console.warn('[STORE] Soft merge failed. Forcing local draft backup recovery due to newer changes.');
            resolvedInvoice = draft.invoice;
            finalVersion = draft.draftVersion;
          }
        } else {
          // If draft is older or same version, discard it safely
          persistenceAdapter.remove(tenantId, userId, invoice.id);
        }
      }
    }

    const frozen = deepFreeze(resolvedInvoice);

    set((state) => ({
      invoice: frozen,
      unsavedChanges: false,
      uiSlice: {
        conflictMode: null,
        isSaving: false,
        saveSuccess: false
      },
      editorSlice: {
        ...state.editorSlice,
        invoice: frozen,
        serverInvoice: deepFreeze(structuredClone(invoice)),
        selectedRow: null,
        editingCell: null,
        validationErrors: []
      },
      syncSlice: {
        syncState: 'SYNCED',
        draftVersion: finalVersion,
        lastSyncedVersion: version,
        epochId: epoch,
        isOutOfSync: false,
        conflictMode: null,
        unsavedChanges: false,
        isSaving: false,
        saveSuccess: false
      }
    }));
  },

  updateField: (field, value) => {
    const { invoice } = get().editorSlice;
    const { draftVersion } = get().syncSlice;
    if (!invoice) return;

    // 1. Immutable modifications
    const cloned = structuredClone(invoice);
    const corrections = [...cloned.corrections];
    const timestamp = new Date().toISOString();

    const target = (cloned as any)[field];
    
    if (target && typeof target === 'object' && 'value' in target) {
      const oldVal = target.value;
      if (oldVal !== value) {
        corrections.push({
          field: String(field),
          oldValue: String(oldVal),
          newValue: String(value),
          timestamp
        });
        
        (cloned as any)[field] = {
          ...target,
          value
        };
      }
    } else {
      (cloned as any)[field] = value;
    }

    // Call pure financial recalculation adapter
    const calc = recalculateFinancials(cloned.lineItems, 18, cloned.totalAmount.value);
    cloned.mathValid = calc.mathValid;
    cloned.corrections = corrections;

    const nextVersion = draftVersion + 1;
    const frozen = deepFreeze(cloned);

    // 2. Commit frozen state and transition state machine to DIRTY_LOCAL
    set((state) => ({
      invoice: frozen,
      unsavedChanges: true,
      editorSlice: {
        ...state.editorSlice,
        invoice: frozen
      },
      syncSlice: {
        ...state.syncSlice,
        syncState: 'DIRTY_LOCAL',
        draftVersion: nextVersion,
        unsavedChanges: true
      }
    }));

    // 3. Local storage persistence backup
    const { tenantId, user } = get().authSlice;
    const userId = user ? user.id : 'guest';
    if (tenantId) {
      persistenceAdapter.save(tenantId, userId, invoice.id, cloned, nextVersion);
    }

    // 4. Enqueue saving to the command queue for batch coalescing sync
    writeCommandQueue.enqueue(
      invoice.id,
      String(field),
      cloned,
      async () => {
        set((state) => ({
          syncSlice: { ...state.syncSlice, syncState: 'PENDING_WRITE', isSaving: true }
        }));
        return get().saveChangesToServer();
      }
    );
  },

  updateLineItem: (index, field, value) => {
    const { invoice } = get().editorSlice;
    const { draftVersion } = get().syncSlice;
    if (!invoice) return;

    const cloned = structuredClone(invoice);
    const lines = [...cloned.lineItems];
    const line = { ...lines[index] };

    (line as any)[field] = value;
    lines[index] = line;

    // Call stateless domain engine
    const calc = recalculateFinancials(lines, 18);
    cloned.lineItems = calc.lineItems;
    cloned.totalAmount = {
      ...cloned.totalAmount,
      value: calc.totalAmount
    };
    cloned.taxAmount = {
      ...cloned.taxAmount,
      value: calc.taxAmount
    };
    cloned.mathValid = calc.mathValid;

    const nextVersion = draftVersion + 1;
    const frozen = deepFreeze(cloned);

    set((state) => ({
      invoice: frozen,
      unsavedChanges: true,
      editorSlice: {
        ...state.editorSlice,
        invoice: frozen
      },
      syncSlice: {
        ...state.syncSlice,
        syncState: 'DIRTY_LOCAL',
        draftVersion: nextVersion,
        unsavedChanges: true
      }
    }));

    // Local storage persistence
    const { tenantId, user } = get().authSlice;
    const userId = user ? user.id : 'guest';
    if (tenantId) {
      persistenceAdapter.save(tenantId, userId, invoice.id, cloned, nextVersion);
    }

    // Enqueue saving to the command queue
    writeCommandQueue.enqueue(
      invoice.id,
      `lineItems:${index}:${String(field)}`,
      cloned,
      async () => {
        set((state) => ({
          syncSlice: { ...state.syncSlice, syncState: 'PENDING_WRITE', isSaving: true }
        }));
        return get().saveChangesToServer();
      }
    );
  },

  addLineItem: (item) => {
    const { invoice } = get().editorSlice;
    const { draftVersion } = get().syncSlice;
    if (!invoice) return;

    const cloned = structuredClone(invoice);
    const lines = [...cloned.lineItems, item];

    const calc = recalculateFinancials(lines, 18);
    cloned.lineItems = calc.lineItems;
    cloned.totalAmount = {
      ...cloned.totalAmount,
      value: calc.totalAmount
    };
    cloned.taxAmount = {
      ...cloned.taxAmount,
      value: calc.taxAmount
    };
    cloned.mathValid = calc.mathValid;

    const nextVersion = draftVersion + 1;
    const frozen = deepFreeze(cloned);

    set((state) => ({
      invoice: frozen,
      unsavedChanges: true,
      editorSlice: {
        ...state.editorSlice,
        invoice: frozen
      },
      syncSlice: {
        ...state.syncSlice,
        syncState: 'DIRTY_LOCAL',
        draftVersion: nextVersion,
        unsavedChanges: true
      }
    }));

    // Offline persistence
    const { tenantId, user } = get().authSlice;
    const userId = user ? user.id : 'guest';
    if (tenantId) {
      persistenceAdapter.save(tenantId, userId, invoice.id, cloned, nextVersion);
    }

    // Enqueue sync task
    writeCommandQueue.enqueue(
      invoice.id,
      'lineItems:add',
      cloned,
      async () => {
        set((state) => ({
          syncSlice: { ...state.syncSlice, syncState: 'PENDING_WRITE', isSaving: true }
        }));
        return get().saveChangesToServer();
      }
    );
  },

  removeLineItem: (index) => {
    const { invoice } = get().editorSlice;
    const { draftVersion } = get().syncSlice;
    if (!invoice) return;

    const cloned = structuredClone(invoice);
    const lines = cloned.lineItems.filter((_, i) => i !== index);

    const calc = recalculateFinancials(lines, 18);
    cloned.lineItems = calc.lineItems;
    cloned.totalAmount = {
      ...cloned.totalAmount,
      value: calc.totalAmount
    };
    cloned.taxAmount = {
      ...cloned.taxAmount,
      value: calc.taxAmount
    };
    cloned.mathValid = calc.mathValid;

    const nextVersion = draftVersion + 1;
    const frozen = deepFreeze(cloned);

    set((state) => ({
      invoice: frozen,
      unsavedChanges: true,
      editorSlice: {
        ...state.editorSlice,
        invoice: frozen
      },
      syncSlice: {
        ...state.syncSlice,
        syncState: 'DIRTY_LOCAL',
        draftVersion: nextVersion,
        unsavedChanges: true
      }
    }));

    // Offline persistence
    const { tenantId, user } = get().authSlice;
    const userId = user ? user.id : 'guest';
    if (tenantId) {
      persistenceAdapter.save(tenantId, userId, invoice.id, cloned, nextVersion);
    }

    // Enqueue sync
    writeCommandQueue.enqueue(
      invoice.id,
      'lineItems:remove',
      cloned,
      async () => {
        set((state) => ({
          syncSlice: { ...state.syncSlice, syncState: 'PENDING_WRITE', isSaving: true }
        }));
        return get().saveChangesToServer();
      }
    );
  },

  syncRawJson: (jsonString) => {
    const { invoice } = get().editorSlice;
    const { draftVersion } = get().syncSlice;
    if (!invoice) return false;

    try {
      const parsed = JSON.parse(jsonString);
      const cloned = {
        ...invoice,
        vendor: { ...invoice.vendor, value: parsed.vendor || invoice.vendor.value },
        recipient: { ...invoice.recipient, value: parsed.recipient || invoice.recipient.value },
        invoiceNumber: { ...invoice.invoiceNumber, value: parsed.invoiceNumber || invoice.invoiceNumber.value },
        date: { ...invoice.date, value: parsed.date || invoice.date.value },
        dueDate: { ...invoice.dueDate, value: parsed.dueDate || invoice.dueDate.value },
        currency: { ...invoice.currency, value: parsed.currency || invoice.currency.value },
        totalAmount: { ...invoice.totalAmount, value: parsed.totalAmount || invoice.totalAmount.value },
        taxAmount: { ...invoice.taxAmount, value: parsed.taxAmount || invoice.taxAmount.value },
        lineItems: parsed.lineItems || invoice.lineItems
      };

      const calc = recalculateFinancials(cloned.lineItems, 18, cloned.totalAmount.value);
      cloned.mathValid = calc.mathValid;

      const nextVersion = draftVersion + 1;
      const frozen = deepFreeze(cloned);

      set((state) => ({
        invoice: frozen,
        unsavedChanges: true,
        editorSlice: {
          ...state.editorSlice,
          invoice: frozen
        },
        syncSlice: {
          ...state.syncSlice,
          syncState: 'DIRTY_LOCAL',
          draftVersion: nextVersion,
          unsavedChanges: true
        }
      }));

      // Offline persist
      const { tenantId, user } = get().authSlice;
      const userId = user ? user.id : 'guest';
      if (tenantId) {
        persistenceAdapter.save(tenantId, userId, invoice.id, cloned, nextVersion);
      }

      // Enqueue sync
      writeCommandQueue.enqueue(
        invoice.id,
        'rawJson',
        cloned,
        async () => {
          set((state) => ({
            syncSlice: { ...state.syncSlice, syncState: 'PENDING_WRITE', isSaving: true }
          }));
          return get().saveChangesToServer();
        }
      );

      return true;
    } catch (e) {
      return false;
    }
  },

  saveChangesToServer: async () => {
    const { invoice } = get().editorSlice;
    const { draftVersion } = get().syncSlice;
    if (!invoice) return false;

    set((state) => ({
      syncSlice: {
        ...state.syncSlice,
        isSaving: true,
        saveSuccess: false
      }
    }));

    const payload = {
      vendor: invoice.vendor.value,
      recipient: invoice.recipient.value,
      invoiceNumber: invoice.invoiceNumber.value,
      date: invoice.date.value,
      dueDate: invoice.dueDate.value,
      currency: invoice.currency.value,
      totalAmount: invoice.totalAmount.value,
      taxAmount: invoice.taxAmount.value,
      lineItems: invoice.lineItems,
      versionNumber: draftVersion
    };

    const token = get().authSlice.token;
    
    // Execute forced, serialized flush via the sync engine
    const success = await syncEngine.sync(invoice.id, payload, token);

    set((state) => {
      const nextSyncState = success 
        ? (state.syncSlice.syncState === 'PENDING_WRITE' ? 'SYNCED' : state.syncSlice.syncState)
        : state.syncSlice.syncState;
        
      const nextUiSlice = {
        conflictMode: state.syncSlice.conflictMode,
        isSaving: false,
        saveSuccess: success
      };

      return {
        unsavedChanges: success ? false : state.unsavedChanges,
        uiSlice: nextUiSlice,
        syncSlice: {
          ...state.syncSlice,
          syncState: nextSyncState as any,
          lastSyncedVersion: success ? draftVersion : state.syncSlice.lastSyncedVersion,
          isSaving: false,
          saveSuccess: success,
          unsavedChanges: success ? false : state.syncSlice.unsavedChanges
        }
      };
    });

    if (success) {
      // Clear persistence cache upon successful server sync writes
      const { tenantId, user } = get().authSlice;
      const userId = user ? user.id : 'guest';
      if (tenantId) {
        persistenceAdapter.remove(tenantId, userId, invoice.id);
      }
    }

    return success;
  },

  receiveSSEUpdate: (incoming) => {
    // Backpressure Protection Gate: Throttles when SSE updates exceed 5/second
    const now = Date.now();
    const tracker = get().sseTracker;
    
    tracker.timestamps = tracker.timestamps.filter(t => now - t < 1000);
    tracker.timestamps.push(now);

    const isBackpressureTriggered = tracker.timestamps.length > 5;

    if (isBackpressureTriggered) {
      console.warn('[SSE-BACKPRESSURE] 🚨 SSE Event frequency exceeds 5 events/second! Throttling to 200ms batch window.');
      tracker.bufferedPayload = incoming;

      if (!tracker.timeoutId) {
        tracker.timeoutId = setTimeout(() => {
          const payload = tracker.bufferedPayload;
          tracker.timeoutId = null;
          tracker.bufferedPayload = null;
          if (payload) {
            get().applySSEEvent(payload);
          }
        }, 200);
      }
    } else {
      // Direct intake under normal circumstances
      get().applySSEEvent(incoming);
    }
  },

  applySSEEvent: (event: SSEPayload) => {
    const { invoice } = get().editorSlice;
    if (!invoice || invoice.id !== event.jobId) return;

    const serverResult = event.result;
    
    // Check if it is a completed snapshot ingestion
    if (serverResult) {
      const incomingVersion = serverResult.revisionHistory ? serverResult.revisionHistory.length : 0;
      const incomingHash = computeInvoiceHash(serverResult);
      const incomingVector: InvoiceStateVector = {
        version: incomingVersion,
        epoch: serverResult.epochId || get().syncSlice.epochId,
        hash: incomingHash,
        isSnapshotComplete: event.event === 'COMPLETED',
        isDirtyLocal: false
      };

      const localHash = computeInvoiceHash(invoice);
      const localVector: InvoiceStateVector = {
        version: get().syncSlice.draftVersion,
        epoch: get().syncSlice.epochId,
        hash: localHash,
        isSnapshotComplete: true,
        isDirtyLocal: get().syncSlice.syncState === 'DIRTY_LOCAL' || get().syncSlice.syncState === 'PENDING_WRITE'
      };

      const reconciled = reconcileState(invoice, localVector, serverResult, incomingVector);
      get().applyReconciledState(reconciled);
    } else {
      // Just progress telemetry: update status field without overwriting structural content
      const progressInvoice = {
        ...invoice,
        status: event.event.toLowerCase() as any
      };
      
      const frozen = deepFreeze(structuredClone(progressInvoice));
      set((state) => ({
        invoice: frozen,
        editorSlice: {
          ...state.editorSlice,
          invoice: frozen
        }
      }));
    }
  },

  applyReconciledState: (reconciled: ReconciledInvoiceState) => {
    const { decision, resolvedData, conflictDetails } = reconciled;

    if (decision === 'IGNORE_STALE') {
      return;
    }

    if (decision === 'CONFLICT') {
      set((state) => {
        const nextSyncSlice = {
          ...state.syncSlice,
          syncState: 'CONFLICT_DETECTED' as any,
          isOutOfSync: true,
          conflictMode: 'SMART_MERGE' as any
        };
        const nextUiSlice = {
          conflictMode: 'SMART_MERGE' as any,
          isSaving: state.syncSlice.isSaving,
          saveSuccess: state.syncSlice.saveSuccess
        };
        return {
          uiSlice: nextUiSlice,
          syncSlice: nextSyncSlice,
          editorSlice: {
            ...state.editorSlice,
            serverInvoice: deepFreeze(structuredClone(conflictDetails!.serverSnapshot))
          }
        };
      });
      return;
    }

    if (decision === 'APPLY') {
      const version = resolvedData.revisionHistory ? resolvedData.revisionHistory.length : 0;
      const frozen = deepFreeze(structuredClone(resolvedData));
      
      set((state) => ({
        invoice: frozen,
        unsavedChanges: false,
        uiSlice: {
          conflictMode: null,
          isSaving: false,
          saveSuccess: false
        },
        editorSlice: {
          ...state.editorSlice,
          invoice: frozen,
          serverInvoice: frozen
        },
        syncSlice: {
          ...state.syncSlice,
          syncState: 'SYNCED',
          draftVersion: version,
          lastSyncedVersion: version,
          isOutOfSync: false,
          conflictMode: null,
          unsavedChanges: false,
          isSaving: false,
          saveSuccess: false
        }
      }));

      // Remove localStorage backup draft since it has converged perfectly with the server
      const { tenantId, user } = get().authSlice;
      const userId = user ? user.id : 'guest';
      if (tenantId) {
        persistenceAdapter.remove(tenantId, userId, resolvedData.id);
      }
    }
  },

  resolveConflict: async (mode) => {
    const { invoice, serverInvoice } = get().editorSlice;
    if (!invoice || !serverInvoice) return;

    let resolvedInvoice = structuredClone(invoice);

    if (mode === 'PULL_SERVER') {
      resolvedInvoice = structuredClone(serverInvoice);
    } else if (mode === 'SMART_MERGE') {
      const mergedLines = resolveLineItemDiff(invoice.lineItems, serverInvoice.lineItems);
      const calc = recalculateFinancials(mergedLines, 18);
      
      resolvedInvoice = {
        ...serverInvoice,
        lineItems: calc.lineItems,
        totalAmount: {
          ...serverInvoice.totalAmount,
          value: calc.totalAmount
        },
        taxAmount: {
          ...serverInvoice.taxAmount,
          value: calc.taxAmount
        },
        mathValid: calc.mathValid
      };
    }

    const newVersion = serverInvoice.revisionHistory ? serverInvoice.revisionHistory.length : 0;
    const frozen = deepFreeze(resolvedInvoice);

    set((state) => {
      const nextSyncSlice = {
        ...state.syncSlice,
        syncState: 'RESOLVED' as any,
        draftVersion: newVersion,
        lastSyncedVersion: newVersion,
        isOutOfSync: false,
        conflictMode: null,
        unsavedChanges: mode !== 'PULL_SERVER'
      };
      const nextUiSlice = {
        conflictMode: null,
        isSaving: state.syncSlice.isSaving,
        saveSuccess: state.syncSlice.saveSuccess
      };
      return {
        invoice: frozen,
        unsavedChanges: mode !== 'PULL_SERVER',
        uiSlice: nextUiSlice,
        syncSlice: nextSyncSlice,
        editorSlice: {
          ...state.editorSlice,
          invoice: frozen,
          serverInvoice: deepFreeze(structuredClone(serverInvoice))
        }
      };
    });

    if (mode !== 'PULL_SERVER') {
      // Force sync immediately to push resolved state to the server
      await writeCommandQueue.forceFlush(invoice.id, async () => {
        set((state) => ({
          syncSlice: { ...state.syncSlice, syncState: 'PENDING_WRITE', isSaving: true }
        }));
        return get().saveChangesToServer();
      });
    } else {
      const { tenantId, user } = get().authSlice;
      const userId = user ? user.id : 'guest';
      if (tenantId) {
        persistenceAdapter.remove(tenantId, userId, invoice.id);
      }
    }
  }
}));
