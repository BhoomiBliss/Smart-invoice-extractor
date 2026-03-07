# 📄 Smart Invoice Extractor

This project is a **Smart Invoice-to-JSON Converter** using OpenRouter's multimodal AI models. It allows you to upload an invoice image and automatically extract the invoice line items, vendor details, and totals into JSON and a clean table format.

---


## Features

- Upload JPG/PNG invoices.
- Extract **line items**: Description, Quantity, Unit Price, Total.
- Extract **Vendor Name, Tax ID, Invoice Number, Date, Due Date**.
- Automatically calculate **Subtotal, Tax, Shipping, Total**.
- Highlight mismatches in totals.
- Rate limit retry logic for AI API
- **Automated backend testing** using Jest
- Minimal, clean, and aesthetic UI.

---

## 🧰 Tech Stack

| Layer           | Technology                                             |
| :-------------- | :----------------------------------------------------- |
| **Frontend**    | HTML, CSS, JavaScript                                  |
| **Backend**     | Node.js, Express, TypeScript                           |
| **AI Model**    | OpenRouter Vision Model (`qwen/qwen-2-vl-7b-instruct`) |
| **Testing**     | Jest + Supertest                                       |
| **Environment** | dotenv (`.env` for API key)                            |


---

## System Architecture

![System Architecture](System%20Architecture/Sys-arch.jpg)

**Workflow:**

1. User uploads an invoice image.
2. Frontend converts the image to Base64 format.
3. Image is sent to the Node.js backend API.
4. Backend calls the OpenRouter multimodal model.
5. AI extracts invoice details and returns a JSON response.
6. Backend validates the JSON.
7. Frontend displays:

- Extracted JSON
- Table of invoice items
- Subtotal and Total

---

## 🧠 How the AI Extraction Works

1. The uploaded invoice image is converted to a Base64 string in the frontend.
2. The Base64 image is sent to the backend API.
3. The backend sends the image and prompt to the OpenRouter Vision model.
4. The AI analyzes the spatial layout of the invoice and extracts structured data.
5. The backend validates the JSON and verifies invoice totals.
6. The frontend displays the extracted data as a table and JSON view.

---

## 📸 Screenshots

### Upload Invoice

![System Architecture](uploadimage.jpg)

### Extracted Table

![System Architecture](resultpage.png)

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/BhoomiBliss/Smart-invoice-extractor.git
cd Smart-invoice-extractor/backend
```

## Install backend dependencies:

```bash
cd backend
pnpm install
```

---

## ▶️ Run the Backend Server

```bash
pnpm run dev
```

---

## 🌐 Using the Application

- Open the frontend in browser
- Upload an invoice image
- Click **Extract Table Data**
- The system will show:
  - Extracted JSON
  - Invoice table
  - Subtotal and total

## 🧪 Testing

This project includes automated backend testing using Jest and Supertest.
Testing ensures the API behaves correctly under different scenarios.

### Install Testing Dependencies

```bash
pnpm add -D jest supertest ts-jest @types/jest @types/supertest cross-env
```

---

## 📂 Test Files

```plaintext
backend/tests
│
├── invoice.test.ts
└── mock-ai.test.ts
```

### ▶️ Running Tests

Run all tests using:

```bash
pnpm test
```

# Example output:

```Plaintext
PASS tests/mock-ai.test.ts
PASS tests/invoice.test.ts

Test Suites: 2 passed
Tests: 3 passed
```

## This confirms that the backend API works correctly.

---

## 📁 Project Structure

```text
Smart-invoice-extractor
│
├── frontend
│   └── index.html
│
├── backend
│   │
│   ├── src
│   │   └── server.ts
│   │
│   ├── tests
│   │   ├── invoice.test.ts
│   │   └── mock-ai.test.ts
│   │
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## ⚠️ Error Handling

The system handles the following errors:

| Scenario              | Handling                 |
| --------------------- | ------------------------ |
| Missing image         | Returns 400 error        |
| Invalid JSON from AI  | Safe JSON extraction     |
| Rate limit from API   | Automatic retry          |
| Invalid invoice image | Returns fallback message |

## 📌 Future Improvements

- Support PDF invoice upload
- Improve multi-invoice detection
- Add database storage
- Deploy using Docker + Cloud

## 👨‍💻 Author

**BhoomiBliss** GitHub Repository: [https://github.com/BhoomiBliss/Smart-invoice-extractor](https://github.com/BhoomiBliss/Smart-invoice-extractor)
