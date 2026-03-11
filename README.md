# 📄 Smart Invoice Extractor

A **SOTA (State-of-the-Art) Invoice-to-JSON Engine** using an advanced **Multi-Model Consensus pipeline**. This project transcends simple API wrappers by deploying a robust inference engineering layer that orchestrates multiple vision models concurrently, guaranteeing high-fidelity structured data extraction from complex invoice layouts.

---

## ✨ Features

- **Multi-Model Consensus Pipeline**: Cross-validates extraction across three leading AI models.
- **High-Reasoning OCR**: Powered by native Google SDK integration.
- **Dense Table Extraction**: Line items, descriptions, quantities, and totals perfectly mapped.
- **Discrepancy Flagging**: Automatically detects and flags mismatches in total amounts or dates.
- **Fault-Tolerant Fallbacks**: Seamless failover routing if the primary model goes offline.
- **Structured Output Compliance**: 100% strict JSON schema conformity.
- **Automated Testing**: Comprehensive backend unit tests using Jest.
- **Minimal Aesthetic UI**: Upload, preview, and review extracted data instantly.

---

## 🏗️ Advanced AI Architecture

Our **Inference Engineering** layer relies on a specialized three-tier model hierarchy:

1. **Primary (Extraction) — `gemini-3.1-flash-lite-preview`**: 
   - Uses native Google SDK (`@google/genai`) for blazing-fast OCR and high-reasoning extraction.
2. **Secondary (Structural) — `qwen/qwen-2.5-vl-72b-instruct`**: 
   - Routed via OpenRouter. Specifically chosen for its superior spatial awareness and dense table layout precision.
3. **Tertiary (Validation) — `meta-llama/llama-3.2-11b-vision-instruct`**: 
   - Routed via OpenRouter. Acts as a high-speed cross-checker and tie-breaker for conflicting data.

---

## ⚖️ Consensus Validation Logic

The backend uses `Promise.allSettled` to execute all three models concurrently, eliminating waterfall delays. 

**How it works:**
- The engine compares the output from `Gemini` (Primary) and `Qwen` (Secondary).
- If models disagree on critical fields like `total_amount`, `invoice_date`, or `vendor`, a flag is raised.
- The `Llama` (Tertiary) model's output is then used as a tie-breaker. The system programmatically calculates a consensus score and accepts the structurally verified JSON, appending `consensus_flags` for human review if necessary.

---

## 🧰 Tech Stack Update

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), TypeScript, CSS |
| **Backend** | Node.js, Express, TypeScript |
| **AI Integration** | `@google/genai` SDK, OpenRouter API |
| **Infrastructure** | Hybrid Routing (Native Google AI Studio + OpenRouter Fallback) |
| **Testing** | Jest + Supertest |

---

## ⚙️ Environment Setup

To run this pipeline locally, you must provide API keys for both native Google routing and OpenRouter fallbacks.

Create a `.env` file in the `/backend` directory:

```env
PRIMARY_MODEL=gemini-3.1-flash-lite-preview
SECONDARY_MODEL=qwen/qwen-2.5-vl-72b-instruct
TERTIARY_MODEL=meta-llama/llama-3.2-11b-vision-instruct

GOOGLE_API_KEY=your_google_ai_studio_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
NODE_ENV=development
PORT=5000
```

---

## 🚀 Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/BhoomiBliss/Smart-invoice-extractor.git
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd Smart-invoice-extractor/backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Start the Development Servers:**
   ```bash
   # In the backend directory
   npm run dev

   # In the frontend directory
   npm run dev
   ```

---

## 📸 System Architecture & Previews

### Architecture Workflow
1. User uploads an invoice (JPG/PNG/WEBP).
2. Frontend dispatches the Base64 image to the backend.
3. Backend triggers the `Promise.allSettled` Concurrent Model racing.
4. Consensus Engine validates the JSON structures and calculates tie-breakers.
5. Frontend renders the structured Extracted JSON and Invoice Table.

### Application Preview
![Upload Invoice](System%20Architecture/uploadimage.jpg)

![Extracted Table](System%20Architecture/resultpage.png)

---

## 🧪 Testing

The backend includes a complete suite of automated testing for the pipeline and fallback simulation.

```bash
cd backend
npm test
```

---

## 📌 Future Improvements

- [ ] **PDF Support**: Add OCR parsing and conversion for multipage PDF invoices.
- [ ] **Cloud Deployment**: Containerize with Docker and deploy the Node.js consensus engine on **GCP (Google Cloud Platform)**.
- [ ] **Database Integration**: Persist extracted invoices to PostgreSQL for historical tracking.
- [ ] **Multi-Invoice Batching**: Process multiple invoice images simultaneously.

---

## 👨‍💻 Author

**BhoomiBliss**  
GitHub Repository: [Smart-invoice-extractor](https://github.com/BhoomiBliss/Smart-invoice-extractor)
