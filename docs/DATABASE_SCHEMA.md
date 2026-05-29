# Database Schemas - Smart Invoice Extractor

We persist data models in MongoDB using Mongoose.

---

## 1. User Schema (`User` collection)
Holds authenticated user metadata.

| Field | Type | Options | Description |
| --- | --- | --- | --- |
| `name` | String | required, trimmed | Full user name |
| `email` | String | required, unique, lowercase | Email logins identifier |
| `password` | String | required | Hashed credentials |
| `role` | String | enum, default: `'user'` | `'admin' \| 'manager' \| 'viewer' \| 'user'` |
| `createdAt` | Date | default: `Date.now` | Registration timestamp |

---

## 2. Invoice Schema (`Invoice` collection)
Primary data model storing AI extracted invoice fields and corrections history.

| Field | Type | Options | Description |
| --- | --- | --- | --- |
| `userId` | ObjectId | ref: `'User'`, required, index | Tenancy boundary link |
| `schemaVersion` | String | default: `'v1'` | Schema tracking parameter |
| `vendor` | Object | required | `{ value: String, confidence: Number }` |
| `recipient` | Object | required | `{ value: String, confidence: Number }` |
| `invoiceNumber` | Object | required | `{ value: String, confidence: Number }` |
| `date` | Object | required | `{ value: String, confidence: Number }` |
| `dueDate` | Object | required | `{ value: String, confidence: Number }` |
| `currency` | Object | required | `{ value: String, confidence: Number }` |
| `totalAmount` | Object | required | `{ value: Number, confidence: Number }` |
| `lineItems` | Array | default: `[]` | `Array` of description, quantity, price, amount |
| `confidenceScore` | Number | required | Consensus confidence score |
| `status` | String | enum | `'queued' \| 'processing' \| 'completed' \| 'failed'` |
| `mathValid` | Boolean | default: `true` | Math audit flag |
| `corrections` | Array | default: `[]` | Manual edits track logs |

### Compound & Operational Indexes (Invoice Schema)
To secure maximum query performance across high-volume tenant spaces, the following indexes are actively configured:
*   `{ tenantId: 1, createdAt: -1 }`: Compound index for paginated dashboard history.
*   `{ tenantId: 1, status: 1 }`: Compound index for operational filters.
*   `{ tenantId: 1, 'vendor.value': 1 }`: Compound index for vendor search.
*   `{ status: 1 }`: Global index for worker ingestion sweeps (inline duplicate index removed in Sprint 2 for clean logs).
*   `{ checksumHash: 1 }`: Index for file duplicate checking.
*   `{ tenantId: 1, 'vendor.value': 1, 'invoiceNumber.value': 1 }`: Unique compound index (partialFilterExpression: `{ status: 'completed', isDeleted: false }`) enforcing SaaS-wide document idempotency.

---

## 3. QueueJob Schema (`QueueJob` collection)
Tracks background BullMQ progress traces.
- `jobId`: String, unique
- `userId`: ObjectId, ref: 'User'
- `status`: String, enum: queued, processing, completed, failed
- `progress`: Number
- `latencyMs`: Number
- `costUsd`: Number
