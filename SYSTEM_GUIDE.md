# 🚀 Smart Invoice Extractor – System Guide

---

# 📌 1. Overview

Smart Invoice Extractor is a full-stack system that:

- Extracts invoice data using AI
- Validates totals automatically
- Stores invoices securely
- Supports multi-user access
- Provides dashboard + PDF export

---

# 🏗️ 2. Architecture

Frontend → React + Vite  
Backend → Node.js + Express  
Database → Supabase  
Storage → Supabase Storage  
Auth → Supabase Auth  

---

# 🔄 3. Flow

1. Upload invoice
2. Backend extracts data
3. Validation engine checks totals
4. Data stored in Supabase
5. Frontend displays results

---

# 🧠 4. Backend System

## Responsibilities

- OCR + AI extraction
- Validation logic
- API handling
- Database operations

## Validation Logic

- items_total = sum(item.amount)
- fallback = quantity × unit_price
- difference = items_total - expected_total
- is_match = difference ≤ ±1

---

# 💾 5. Database & Storage

## Tables

- profiles → user info  
- subscriptions → quota  
- invoices → main data  
- agent_logs → logs  
- storage_delete_queue → cleanup  

## Storage

- Bucket: `invoice-files`
- Path: `${user_id}/filename`

---

# 🔐 6. Security

- Row Level Security (RLS)
- user_id isolation
- Users access only their data

---

# 🎨 7. Frontend System

## Features

- Upload invoices
- View table data
- Show validation
- Export CSV / PDF
- View JSON

## Components

- UploadZone
- TableView
- Dashboard
- JSONViewer

---

# 📊 8. Table Logic

- Uses `amount` first
- Fallback: quantity × unit_price
- Handles missing values
- Displays totals clearly

---

# 🖨️ 9. Print System

- Converts UI → document layout
- Shows full table
- Prevents row cutting
- Supports multi-page

---

# 🔐 10. Authentication

- Google OAuth
- Session persistence
- Auto profile creation

---

# ⚙️ 11. Environment Variables

Frontend:

VITE_API_BASE_URL  
VITE_SUPABASE_URL  
VITE_SUPABASE_ANON_KEY  

Backend:

SUPABASE_URL  
SUPABASE_SERVICE_ROLE_KEY  

---

# 📊 12. Quota System

- 100 invoices per user
- Enforced via DB trigger
- Prevents overflow

---

# 🗑️ 13. Cleanup System

- Files queued for deletion
- Edge function processes queue
- Runs via cron

---

# 🎯 14. Key Features

- AI extraction
- Validation engine
- Multi-user system
- Secure storage
- Real-time UI
- PDF export

---

# ✅ 15. Conclusion

System is:

- Scalable
- Secure
- Production-ready
- Fully integrated

---