# API Reference - Smart Invoice Extractor

All endpoints are hosted under the API prefix: `/api/v1`

---

## 1. Authentication Endpoints

### `POST /auth/signup`
Creates user profile.
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Bhoomi",
    "email": "you@domain.com",
    "password": "secure_password_123"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "token": "eyJhbG...",
    "user": {
      "id": "6654b...",
      "name": "Bhoomi",
      "email": "you@domain.com",
      "role": "user"
    }
  }
  ```

### `POST /auth/login`
Authenticates credential sets.
- **Request Body**:
  ```json
  {
    "email": "you@domain.com",
    "password": "secure_password_123"
  }
  ```
- **Response**: `200 OK` (token returns)

---

## 2. Ingestion & Extraction Endpoints

### `POST /invoices/upload`
Triggers document files upload.
- **Request Headers**: `Content-Type: multipart/form-data`, `Authorization: Bearer <token>`
- **Form Data**: `file` (binary PDF/JPG/PNG, max 10MB)
- **Response**: `202 Accepted`
  ```json
  {
    "message": "Invoice ingested and queued for extraction processing",
    "jobId": "a24b5d6f-...",
    "fileUrl": "/uploads/a24b5d6f-...",
    "isGuest": false
  }
  ```

### `GET /jobs/:id/stream`
SSE progress event channel.
- **Request Headers**: `Accept: text/event-stream`
- **Streams Events**: `queued` -> `processing` -> `ocr_running` -> `parsing` -> `validation` -> `completed` / `failed`

---

## 3. Invoice Records CRUD Endpoints

### `GET /invoices`
Fetches user extraction logs (paginated & searched).
- **Request Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` with paginated arrays.

### `PUT /invoices/:id`
Applies manual overrides (HITL Engine).
- **Request Body**: Zod schema elements (`vendor`, `recipient`, `totalAmount`, etc.)
- **Response**: `200 OK` with updated invoice details and corrections tracking.
