# 🌿 CropIndia — Regenerative Agriculture Backend

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_GenAI-886FBF?style=for-the-badge&logo=googlegemini&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**CropIndia** is an enterprise-grade, high-performance backend platform designed to empower smallholder farmers with AI-driven, non-chemical agronomic interventions. By synthesizing soil health telemetry, geospatial context, and multimodal vision diagnostics, the platform delivers actionable biological amendments, resilient crop rotation schedules, and localized, voice-ready regional advisory scripts.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Security & Best Practices](#-security--best-practices)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Key Features

- 🌿 **Multimodal Leaf Diagnostics (`/api/v1/diagnose`)**  
  Evaluates crop leaf imagery fused with geospatial coordinates, microclimate conditions, and regional soil data to accurately identify crop diseases and recommend targeted biological treatments.
- 📊 **Telemetry-Based Soil Evaluation (`/api/v1/soil/evaluate`)**  
  Ingests standardized Soil Health Card metrics, normalizes soil attributes, determines agro-climatic zones, and translates raw data into actionable, non-chemical soil restoration plans.
- 🔄 **Regenerative Action Planning (`/api/v1/soil/regenerative-plan`)**  
  Generates multi-season, non-chemical bio-amendment strategies (e.g., Jeevamrit, Trichoderma-enriched FYM), cover cropping schedules, and localized spoken summaries.
- 🛡️ **Resilient AI Model Fallbacks**  
  Implements multi-tier fallback mechanisms across Google Gemini models (`gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`) to guarantee high availability and sub-second latency during upstream API demand spikes.
- 🗄️ **Database & Identity Management (`/db/farmer`)**  
  Seamlessly onboards farmers while securely tracking field geography, acreage, and historical cropping patterns via Google Cloud Firestore.

---

 🏗 System Architecture

```text
backend/
├── agronomy/             # Agro-climatic zone resolution, soil normalization & telemetry logic
├── database/             # Firestore/GCP clients, connection pooling & credential handling
├── ml_engine/            # Gemini-powered soil advisor and multimodal vision diagnostics engines
├── routers/              # FastAPI route controllers (diagnostics, soil, database management)
├── schemas/              # Pydantic v2 models for strict data validation and API contracts
└── main.py               # FastAPI application entrypoint, middleware, and lifespan management







## 💻 Technology Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | [FastAPI](https://fastapi.tiangolo.com/) (High-performance ASGI) |
| **Server** | [Uvicorn](https://www.uvicorn.org/) (with Gunicorn for production) |
| **Validation** | [Pydantic v2](https://docs.pydantic.dev/) (Strict data modeling) |
| **AI & Reasoning** | Official `google-genai` SDK (Multimodal capabilities) |
| **Database** | Google Cloud Firestore / Firebase Admin SDK |
| **Environment** | `python-dotenv` for secure configuration management |

---

## 🚀 Getting Started

### Prerequisites
- **Python** 3.10 or higher
- **Google Gemini API Key** (with multimodal capabilities enabled)
- **Firebase Service Account Key** (`firebase-key.json`)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/<your-username>/CropIndia.git
   cd CropIndia
   ```

2. **Create and Activate a Virtual Environment**
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install --upgrade pip
   pip install fastapi uvicorn pydantic python-dotenv google-genai firebase-admin
   ```

### Environment Configuration

1. **Set Environment Variables**  
   Create a `.env` file in the project root directory:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ENVIRONMENT="development" # Use "production" in live environments
   ```

2. **Configure Firebase Credentials**  
   Place your Firebase service account private key in the designated credentials folder:
   ```text
   backend/database/credentials/firebase-key.json
   ```
   > **⚠️ Security Note:** The `backend/database/credentials/` directory is explicitly excluded via `.gitignore` to prevent accidental exposure of private secrets.

---

## ⚙️ Running the Server

Start the local Uvicorn development server with hot-reloading enabled:

```bash
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Once running, explore the interactive, auto-generated API documentation:
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 📡 API Documentation

### 1. Health Check
- **Endpoint:** `GET /health`
- **Description:** Verifies server status, database connectivity, and API health.
- **Response:** `200 OK` → `{"status": "healthy", "timestamp": "2026-09-10T12:00:00Z"}`

### 2. Farmer Management
- **Endpoint:** `POST /db/farmer`
- **Description:** Registers or updates a farmer's profile and geospatial land data.
- **Request Payload:**
  ```json
  {
    "farmer_id": "farmer_101",
    "name": "Ramesh Kumar",
    "phone": "9876543210",
    "village": "Pathardih",
    "district": "Dhanbad",
    "state": "Jharkhand",
    "land_area_acres": 2.5,
    "primary_crops": ["Paddy", "Maize"]
  }
  ```

### 3. Multimodal Plant Diagnostics
- **Endpoint:** `POST /api/v1/diagnose`
- **Description:** Fuses leaf imagery with coordinates and soil telemetry for disease diagnosis and biological treatment recommendations.
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: Leaf image binary (`.jpg`, `.jpeg`, or `.png`)
  - `latitude`: `float` (e.g., `23.66`)
  - `longitude`: `float` (e.g., `86.42`)
  - `target_language`: `string` (e.g., `"hi"` for Hindi)

### 4. Soil Evaluation & Advisory
- **Endpoint:** `POST /api/v1/soil/evaluate`
- **Description:** Evaluates soil health telemetry parameters and recommends non-chemical amendments.
- **Request Payload:**
  ```json
  {
    "organic_carbon_pct": 0.42,
    "ph": 6.8,
    "nitrogen_kg_ha": 180.5,
    "phosphorus_kg_ha": 14.2,
    "potassium_kg_ha": 165.0,
    "moisture_pct": 22.4,
    "target_language": "hi"
  }
  ```

### 5. Regenerative Action Plan
- **Endpoint:** `POST /api/v1/soil/regenerative-plan`
- **Description:** Produces multi-season crop rotation strategies and biological soil restoration steps tailored to the agro-climatic zone.
- **Request Payload:**
  ```json
  {
    "organic_carbon_pct": 0.35,
    "ph": 7.4,
    "texture": "Clay Loam",
    "current_crop": "Wheat",
    "target_language": "hi",
    "zone": "Trans-Gangetic Plains"
  }
  ```

---

## 🔒 Security & Best Practices

- **Zero Hardcoded Secrets:** All API keys and credentials are strictly injected via environment variables and excluded from version control.
- **Schema Safety:** All inbound requests undergo rigorous validation using Pydantic v2 models, ensuring type safety and normalized field lookups.
- **Fail-Safe Fallbacks:** Built-in biological advisory fallbacks guarantee an uninterrupted user experience, gracefully degrading if external AI APIs encounter transient `503 Service Unavailable` errors.
- **Rate Limiting & CORS:** Configured middleware to prevent abuse and restrict cross-origin requests to trusted domains in production.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).  
© 2026 CropIndia. All rights reserved.
```

