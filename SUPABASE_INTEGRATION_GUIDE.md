# 🚀 Supabase Integration Guide – Smart Invoice Extractor

Author: Bhoomika  
Project: Smart Invoice Extractor System  

---

# 📌 1. Overview

This guide details the production-ready integration of Supabase into the Smart Invoice Extractor. The system leverages Supabase for identity management, relational data storage, binary file hosting, and serverless background tasks. It is architected for multi-user isolation, high security, and scalable performance.

---

# 🏗️ 2. Architecture

The integration follows a decoupled, service-oriented architecture:

- **Authentication**: Managed via Supabase Auth (Google OAuth).
- **Database (PostgreSQL)**: Stores relational data (Invoices, Profiles) with Row Level Security (RLS).
- **Storage**: Binary files (PDFs/Images) are hosted in Supabase Storage buckets.
- **Edge Functions**: Serverless TypeScript functions handle asynchronous tasks like storage cleanup.

---

# 🔐 3. Authentication

The system utilizes Google OAuth for a seamless, passwordless login experience.

## Implementation Details:
- **Flow**: `signInWithGoogle()` triggers the OAuth redirect.
- **Persistence**: `persistSession: true` ensures users remain logged after page refreshes.
- **Auto-Redirect**: The logic automatically detects current environment (localhost vs production) for return URLs.

```ts
// authHandler.ts pattern
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: getURL() }
});
```

---

# 👤 4. Profile System

The system ensures every authenticated user has a profile record for personalization and metadata tracking.

## Auto-Create Logic:
- **`createDefaultProfileIfMissing()`**: Triggered immediately upon auth state change to `SIGNED_IN`.
- **Avatars**: Specifically uses **DiceBear API** to generate unique avatars based on user email (eliminating the need for profile image uploads).

---

# 🗄️ 5. Database Design

## Core Tables:
1. **`profiles`**: User metadata (Full Name, Avatar Style, Theme).
2. **`invoices`**: Main entity table (Vendor, Total, Line Items JSON, Validation Result).
3. **`storage_delete_queue`**: Tracking table for files that need to be purged from storage.

---

# 🛡️ 6. Row Level Security (RLS)

Every table operates under strict RLS policies to enforce multi-tenant isolation.

## Security Rule:
- **`user_id` Isolation**: No query returns data unless the row's `user_id` matches the session's `auth.uid()`.

```sql
CREATE POLICY "Users can only access own data"
ON public.invoices
FOR ALL
USING (auth.uid() = user_id);
```

---

# 💾 7. File Storage

## Configuration:
- **Bucket**: `invoice-files`.
- **Structure**: `${user_id}/filename.ext`.
- **Isolation**: Physical folder separation by user UUID ensures zero cross-user access.

---

# ⬆️ 8. File Upload Flow

1. **Validation**: Frontend checks file type (PDF/Image) and size (<10MB).
2. **Compression**: Images are automatically compressed using `canvas` logic before upload (Target: <500KB).
3. **Upload**: Binary is sent to the `invoice-files` bucket.
4. **Persistence**: Only the `file_url` and `storage_path` are saved to the Database; **Base64 is never stored.**

---

# 🗑️ 9. File Deletion Queue System

To prevent "dangling" files in storage when database records are deleted:

1. **Logic**: `queueFileForDeletion()` inserts the file path into the `storage_delete_queue` table instead of deleting it immediately.
2. **Trigger**: This entry signals the Edge Function to perform the actual storage purge asynchronously.

---

# ⚡ 10. Edge Function (cleanup-storage)

A serverless TypeScript function responsible for maintaining storage hygiene.

- **Operation**: Queries `storage_delete_queue` for unprocessed entries.
- **Batching**: Deletes files in batches (e.g., 10 per invocation) using the **Service Role Key**.
- **Automation**: Scheduled via Supabase Cron (hourly) or triggered on-demand.

---

# 🔌 11. Backend Integration Patterns

Backend controllers interact with Supabase using the Service Role for administrative tasks while respecting the user context.

```ts
// Example check
const { count } = await supabase
  .from('invoices')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);
```

---

# 💻 12. Frontend Integration

Managed via three dedicated utility services:

- **`authHandler.ts`**: Handles Google Login and Logout.
- **`profileManager.ts`**: Manages user preferences and DiceBear avatars.
- **`fileUploadManager.ts`**: Manages compression and storage uploads.

---

# ⚙️ 13. Environment Variables

Required variables for full-stack operation:

```bash
# Frontend
VITE_SUPABASE_URL=https://your-proj.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:5000

# Backend / Edge Functions
SUPABASE_URL=https://your-proj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

# 📊 14. Quota System

The system enforces a strict usage limit for the free/standard tier.

- **Limit**: **100 Invoices** per user.
- **Enforcement**: Backend checks the current invoice count before allowing a new extraction.
- **Action**: Returns a `402 Payment Required` or clear "Quota Exceeded" error if reached.

---

# 🚀 15. Deployment Steps

1. **Database**: Run the SQL schema (Tables + RLS) in the Supabase SQL Editor.
2. **Storage**: Create the `invoice-files` bucket and set it to Public (or configure RLS).
3. **Auth**: Configure Google OAuth Client ID and Secret in the Supabase Dashboard.
4. **Edge Function**: Deploy using `supabase functions deploy cleanup-storage`.
5. **Secrets**: Set `SUPABASE_SERVICE_ROLE_KEY` in the Edge Function settings.

---

# ✅ 16. Testing Checklist

- [ ] Google Redirect correctly returns to the dashboard.
- [ ] New user profile is automatically created in the database on first login.
- [ ] User A cannot see User B's invoices via direct API call.
- [ ] Images are compressed before appearing in the storage bucket.
- [ ] Deleting an invoice adds its path to the `storage_delete_queue`.
- [ ] File limit (100) blocks the 101st extraction attempt.

---

# 🛡️ 17. Security Features

- **Service Role Isolation**: Administrative keys are restricted to the backend/Edge Functions only.
- **JWT Validation**: All API routes verify the Supabase JWT.
- **Path Separation**: User UUIDs prevent brute-forcing file URLs across tenants.

---

# 🚀 18. Performance Notes

- **DiceBear Avatars**: No database storage used for avatars; strings are converted to SVG on the fly.
- **Batch Deletion**: Efficiently purges storage without blocking the main database transaction.
- **Vite Bundling**: All Supabase client logic is bundled and minified for sub-100ms load times.

---

# 🎯 19. Final Summary

The Supabase integration provides a robust, secure, and multi-tenant backbone for the Smart Invoice Extractor. By combining RLS, automated profile management, and an asynchronous storage cleanup system, the platform ensures data integrity while maintaining a high-performance user experience.

---
