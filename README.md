# Helpvoice AI - Enhanced AI & Environment Configuration

Helpvoice AI is a resilient, offline-first emergency assistance and triage platform designed to provide uninterrupted emergency classification, multilingual guidance, and emergency services coordination.

---

## Key Architecture Principles

1. **Emergency-First Resilience**: AI is an enhancement, not the emergency system itself. The core emergency triage, guidance, location tracking, and 112 emergency calling continue functioning even during total external API outages, rate limits (HTTP 429), or absent internet connectivity.
2. **Four-Tier Groq Model Fallback**: Dynamically executes across configured Groq models sequentially without hard-coding model names.
3. **Deterministic Multilingual Local AI**: 100% offline, zero-dependency keyword and rule-based classifier supporting English, Hindi (हिन्दी), and Marathi (मराठी).
4. **Circuit Breaker**: Detects repeated API failures and immediately switches to local fallback to avoid blocking emergency users.
5. **No Secret Leaks**: Strict separation between backend secrets and public frontend configs. API errors (such as 429/500) are sanitized before reaching users.

---

## Complete Environment Variable Reference

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `MONGODB_URI` | Yes for persistence | MongoDB connection string |
| `GROQ_API_KEY` | Optional | Groq AI authorization key (system falls back to local AI if omitted) |
| `GROQ_PRIMARY_MODEL` | Optional | Primary AI model slot |
| `GROQ_SECONDARY_MODEL` | Optional | Secondary fallback AI model |
| `GROQ_TERTIARY_MODEL` | Optional | Tertiary fallback AI model |
| `GROQ_QUATERNARY_MODEL` | Optional | Final lightweight Groq fallback model |
| `GROQ_STT_MODEL` | Optional | Speech-to-text model for voice transcription |
| `DEFAULT_EMERGENCY_NUMBER` | Yes | Default emergency phone number (default: `112`) |
| `HOSPITAL_PROVIDER` | No | Hospital provider (`demo`, `osm`, etc.) |
| `OSM_OVERPASS_URL` | No | OpenStreetMap Overpass API endpoint for hospital search |
| `ENABLE_DEMO_MODE` | No | Toggle demo simulation mode (`true`/`false`) |
| `AI_REQUEST_TIMEOUT_MS` | No | Max AI request duration before falling back (default: `8000`) |
| `AI_LOCAL_FALLBACK_ENABLED` | No | Toggle offline local keyword classifier (`true`/`false`) |
| `AI_FALLBACK_ENABLED` | No | Toggle multi-tier model fallback cascading (`true`/`false`) |
| `AI_CONFIDENCE_THRESHOLD` | No | Threshold under which emergency is treated as uncertain (default: `0.60`) |
| `AI_MAX_RETRIES_PER_MODEL` | No | Max retry attempts per model before switching (default: `1`) |
| `PORT` | No | Backend HTTP server port (default: `3000`) |
| `FRONTEND_URL` | No | Allowed frontend origin for CORS (default: `http://localhost:4200`) |

---

## Fallback Architecture Flow

```text
                    USER
                      │
                      ▼
                 VOICE INPUT
                      │
                      ▼
                SPEECH TO TEXT
                      │
          ┌───────────┴───────────┐
          │                       │
       Groq STT              Device STT
          │                       │
          └───────────┬───────────┘
                      │
                      ▼
              EMERGENCY ANALYSIS
                      │
          ┌───────────┴────────────┐
          │                        │
     GROQ PRIMARY             If unavailable
          │                        │
          ▼                        ▼
     SECONDARY                 TERTIARY
          │                        │
          └──────────┬─────────────┘
                     │
                     ▼
                 QUATERNARY
                     │
                     ▼
              LOCAL FALLBACK AI
                     │
                     ▼
              SAFE CLASSIFICATION
                     │
                     ▼
             EMERGENCY WORKFLOW
```

---

## Backend Startup Behavior

### 1. Groq Configured (With API Key)
```text
==========================================
       HELPVOICE AI BACKEND STARTUP       
==========================================
✓ MongoDB configuration loaded
✓ Groq AI enabled
✓ Multi-model fallback enabled
✓ Local fallback enabled
✓ Hospital provider: demo
==========================================
Server listening on port 3000 [development]
```

### 2. Groq Not Configured (Missing or Empty API Key)
```text
==========================================
       HELPVOICE AI BACKEND STARTUP       
==========================================
✓ MongoDB configuration loaded
⚠ Groq AI unavailable
✓ Local fallback AI enabled
✓ Application running in free fallback mode
==========================================
Server listening on port 3000 [development]
```

---

## API Endpoints

### 1. System Health Check
`GET /api/health`
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "groq": "available",
    "localAI": "available",
    "hospitalProvider": "demo"
  }
}
```

### 2. AI Diagnostics
`GET /api/ai/status`
```json
{
  "groqEnabled": true,
  "configuredModels": 4,
  "localFallbackEnabled": true
}
```

### 3. Emergency Triage Analysis
`POST /api/emergency/analyze`
**Request Body**:
```json
{
  "text": "खूप रक्त येत आहे, अपघात झाला आहे"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "language": "Marathi",
    "emergencyType": "Severe Bleeding",
    "category": "Trauma",
    "severity": "CRITICAL",
    "confidence": 0.88,
    "summary": "Possible severe bleeding reported with keywords: खूप रक्त, अपघात",
    "keywords": ["खूप रक्त", "अपघात"],
    "locationRequired": true,
    "recommendedActions": [
      "Contact emergency services (112)",
      "Apply direct, firm pressure over the wound using a clean cloth or sterile bandage.",
      "Maintain continuous pressure without lifting the cloth."
    ],
    "source": "local-fallback"
  }
}
```

### 4. Emergency Guidance
`GET /api/emergency/guidance/:type`
Retrieves immediate steps, what not to do, and emergency call directions for any of the 13 emergency categories (Accident, Severe Bleeding, Chest Pain, Breathing Difficulty, Fire, Burn, Poisoning, Stroke, Fracture, etc.).

---

## Running the Application

### Backend
```bash
cd backend
npm install
npm run dev
```

### Running Tests
```bash
cd backend
npm test
```
