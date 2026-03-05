# 📄 Smart Invoice Extractor

This project is a **Smart Invoice-to-JSON Converter** using OpenRouter's multimodal AI models. It allows you to upload an invoice image and automatically extract the invoice line items, vendor details, and totals into JSON and a clean table format.

---

## Features

- Upload JPG/PNG invoices.
- Extract **line items**: Description, Quantity, Unit Price, Total.
- Extract **Vendor Name, Tax ID, Invoice Number, Date, Due Date**.
- Automatically calculate **Subtotal, Tax, Shipping, Total**.
- Highlight mismatches in totals.
- Minimal, clean, and aesthetic UI.

---

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **AI**: OpenRouter's multimodal vision models (e.g., `qwen/qwen-2-vl-7b-instruct`)
- **Environment Variables**: `.env` for API key

---

## System Architecture

![System Architecture](System%20Architecture/Sys-arch.jpg)

**Workflow:**

1. User uploads an invoice image.
2. Frontend converts the image to Base64 and sends it to the backend.
3. Backend calls **OpenRouter API** with the multimodal model.
4. Model returns structured JSON containing invoice items and metadata.
5. Frontend displays:
   - Extracted JSON
   - A clean table with totals, highlighting mismatches.

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/BhoomiBliss/Smart-invoice-extractor.git
cd Smart-invoice-extractor/backend
