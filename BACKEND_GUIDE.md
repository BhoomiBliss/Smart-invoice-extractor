# 🚀 Backend Guide – Smart Invoice Extractor

Author: Bhoomika  
Project: Smart Invoice Extractor System  

---

# 📌 1. Overview

The backend is responsible for:

- Extracting invoice data using OCR + AI
- Validating invoice totals
- Storing invoices securely in Supabase
- Managing multi-user data isolation
- Handling file storage and cleanup

---

# 🏗️ 2. Backend Architecture

Technology Stack:

- Node.js (Express)
- TypeScript
- Supabase (Database + Storage)
- Tesseract OCR
- AI Extraction (Gemini / OpenAI)

Folder Structure:

```text
backend/
├── controllers/
├── services/
├── middleware/
├── utils/
├── types/
├── routes.ts
├── server.ts
```

---

# 🔄 3. Invoice Processing Flow

1. User uploads invoice file
2. Backend receives file via API
3. OCR extracts raw text
4. AI extracts structured JSON
5. Validation engine verifies totals
6. Data is stored in Supabase

---

# 🧠 4. Validation Engine

The backend ensures invoice accuracy using a validation engine.

## Logic:

- Calculate total from items:
  - Sum all `item.amount`
  - Fallback: `quantity × unit_price`

- Compare with extracted invoice total

## Output:

```json
validation: {
  items_total: number,
  expected_total: number,
  difference: number,
  is_match: boolean
}
```

## Rules:

- difference = items_total - expected_total
- is_match = true if difference ≤ ±1

---

# 🗄️ 5. Database Design (Supabase)

## Main Table: invoices

Fields:

- id (UUID)
- user_id (auth.users reference)
- vendor_name
- invoice_number
- invoice_date
- total, subtotal, tax, shipping
- items (JSON)
- raw_data (JSON)
- validation (JSON)
- corrected_total
- file_url, storage_path

---

# 🔐 6. Security (Row Level Security)

Supabase enforces strict data isolation:

- Users can only access their own invoices
- Every query is filtered by `user_id`

## Policies:

- SELECT → user_id = auth.uid()
- INSERT → user_id must match
- UPDATE → user_id must match

---

# 💾 7. Invoice Storage Logic

When saving an invoice:

- Always attach `user_id`
- Store structured data only
- Store file in Supabase Storage
- Save:
  - file_url
  - storage_path

---

# 🔁 8. Data Retrieval

Backend supports:

- Fetch all invoices for user
- Fetch single invoice
- Pagination support

---

# 🗑️ 9. Invoice Deletion & File Cleanup

When deleting:

1. Fetch invoice
2. Add file to deletion queue
3. Delete database record

Cleanup is handled asynchronously via Supabase Edge Function.

---

# 📊 10. Quota Management

Each user has a limit (default: 100 invoices)

Backend checks:

- current count
- remaining quota

If limit exceeded:
→ throw error

---

# ⚠️ 11. Error Handling

Handled cases:

- Missing user_id
- Invalid invoice data
- Quota exceeded
- Storage failure
- Extraction failure

---

# 🔌 12. API Endpoints

| Method | Endpoint        | Description              |
|--------|---------------|--------------------------|
| POST   | /extract       | Upload & extract invoice |
| GET    | /invoices      | Get user invoices        |
| GET    | /invoice/:id   | Get single invoice       |
| DELETE | /invoice/:id   | Delete invoice           |

---

# 🧪 13. Testing

Backend includes:

- Unit tests (Jest)
- API testing
- Multi-user isolation tests

---

# ✅ 14. Best Practices

✔ Always validate totals  
✔ Never trust extracted data blindly  
✔ Always use user_id filtering  
✔ Keep raw_data minimal  
✔ Use async cleanup for storage  

---

# 🎯 15. Summary

The backend ensures:

- Accurate invoice extraction
- Secure multi-user data handling
- Scalable storage management
- Reliable validation system

---
