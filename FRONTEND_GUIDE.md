# 🎨 Frontend Guide – Smart Invoice Extractor UI

Author: Bhoomika  
Project: Smart Invoice Extractor System  

---

# 📌 1. Overview

The Smart Invoice frontend is a modern, high-performance web application built using **React (TypeScript)** and **Vite**. It provides an interactive dashboard for uploading invoices, visualizing extracted data, validating financial accuracy, and exporting results.

The UI focuses on:

- Real-time invoice processing
- Clean and responsive dashboard design
- AI-powered data visualization
- Seamless backend integration

---

# 🏗️ 2. Frontend Architecture

The application follows a **component-based modular architecture**.

## Tech Stack

- React (TypeScript)
- Vite (build tool)
- Tailwind CSS (styling)
- Supabase JS Client (authentication + API)
- Context API (state management)

---

## Folder Structure

```text
frontend/
├── src/
│ ├── components/ # Reusable UI components
│ ├── pages/ # Main application views
│ ├── context/ # Global state management
│ ├── hooks/ # Custom React hooks
│ ├── App.tsx # Routing and layout
│ ├── main.tsx # Entry point
│ └── index.css # Global styles
```

---

# 🔄 3. Invoice Processing Flow

The frontend interacts with the backend using a structured flow:

1. **File Upload**
   - User uploads invoice via `UploadZone`
   - Supports drag-and-drop and manual selection

2. **API Request**
   - File sent to backend:
     ```
     POST /api/extract
     ```
   - Uses `multipart/form-data`

3. **Response Handling**
   - Receives structured JSON:
     - invoice details
     - line items
     - validation object

4. **UI Rendering**
   - Data displayed using:
     - TableView
     - Summary Cards
     - Validation indicators

5. **User Interaction**
   - Export CSV
   - Print PDF
   - View JSON

---

# 📊 4. Table Rendering System

The **TableView component** is responsible for displaying invoice data.

## Features

- Displays:
  - Item description
  - Quantity
  - Unit rate
  - Total amount

## Data Handling Logic

- Primary field: `amount`
- Fallback logic: `quantity × unit_price`
- Handles missing/null values safely

---

# ✅ 5. Validation Display System

The UI reflects backend validation results.

## Validation Object

```json
validation: {
  items_total,
  expected_total,
  difference,
  is_match
}
```

## UI Indicators

- ✅ **Verified** → totals match
- ⚠️ **Needs Review** → mismatch
- 🔴 **Mismatch Alert** → shown with difference

## Behavior

- Real-time updates after extraction
- Highlights discrepancies clearly

---

# 🧾 6. JSON Viewer (Debug Panel)

Provides raw extracted data for audit purposes.

## Features

- Collapsible viewer
- Syntax-highlighted JSON
- Shows:
  - raw_data
  - validation
  - corrected_total

## Use Case

- Debugging AI extraction
- Verification during audit

---

# 🖨️ 7. Print & PDF System

The frontend includes a **custom print rendering engine**.

## Key Features

### 1. Layout Transformation
- Converts dashboard UI → document layout
- Removes:
  - shadows
  - gradients
  - interactive elements

### 2. Table Optimization
- Full-width table rendering
- Prevents row splitting: `page-break-inside: avoid`

### 3. Header Repetition

```css
thead {
  display: table-header-group;
}
```

### 4. Multi-page Support
- Table flows across pages
- No clipping or overflow

### 5. Visibility Fixes
- Forces:
  - black text
  - white background
  - no hidden elements

---

# 🌐 8. API Integration

Frontend communicates with backend using REST APIs.

## Base URL

```text
VITE_API_BASE_URL=http://localhost:5000
```

## Example Request

```text
POST /api/extract
```

## Response Includes

- invoice data
- items
- validation object
- corrected totals

---

# 🔐 9. Authentication System

Handled via **Supabase Auth**

## Features

- Google OAuth login
- Session persistence
- Secure route protection

## Flow

1. User clicks "Continue with Google"
2. Redirect to Supabase
3. Callback returns session
4. App stores session in context

---

# ⚙️ 10. Environment Variables

Frontend requires:

```text
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key
```

---

# 🎯 11. Key Components

| Component              | Purpose |
|----------------------|--------|
| UploadZone           | File upload UI |
| TableView            | Displays invoice items |
| AnalyticsDashboard   | Visual insights |
| HistorySidebar       | Past invoices |
| IntelligenceLedger   | AI summary |
| JSONViewer           | Debug data |

---

# 🧠 12. State Management

Uses React Context API:

- AuthContext → user session
- DataContext → invoice data

Benefits:

- Centralized state
- Easy data sharing
- Cleaner component logic

---

# ⚠️ 13. Error Handling

Frontend handles:

- API failures
- Invalid file uploads
- Missing data
- Authentication errors

Displays user-friendly messages.

---

# 🚀 14. Best Practices

✔ Use environment variables  
✔ Never hardcode API URLs  
✔ Always validate API response  
✔ Keep components reusable  
✔ Separate UI and logic  

---

# 🎯 15. Summary

The frontend provides:

- Interactive invoice dashboard
- Real-time AI extraction display
- Validation visualization
- Export and print capabilities
- Secure authentication system

---

# ✅ Conclusion

The Smart Invoice frontend is a scalable, modular, and production-ready system that integrates AI extraction, validation, and analytics into a seamless user experience.

---
