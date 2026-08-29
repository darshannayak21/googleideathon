# Personal Gemini Journal

A production-grade, authenticated journaling web app where users chat with Gemini and get their conversations auto-summarized and saved, with zero cross-user data leakage.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite + TS)          │
│  Firebase Auth → ID Token → Authorization: Bearer ...   │
│  localhost:5173 (dev) / Firebase Hosting (prod)          │
└────────────────────────┬─────────────────────────────────┘
                         │ POST /api/chat (+ Bearer token)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                 Backend (FastAPI on Cloud Run)            │
│  1. Verify Firebase ID token (never trust client UID)    │
│  2. Fetch Gemini key from Secret Manager (cached)        │
│  3. Call Gemini API server-side                           │
│  4. Write to Firestore: /users/{uid}/sessions/...        │
└──────┬──────────────┬──────────────────┬─────────────────┘
       │              │                  │
       ▼              ▼                  ▼
  Firestore      Secret Manager      Gemini API
  (user-scoped)  (gemini-api-key)    (server-only)
```

## Data Isolation

All Firestore data lives under `/users/{uid}/...`:
```
/users/{uid}                              → User profile
/users/{uid}/sessions/{sessionId}         → Session metadata
/users/{uid}/sessions/{sessionId}/messages/{messageId} → Individual messages
/users/{uid}/summaries/{summaryId}        → AI-generated summaries
```

Security rules enforce `request.auth.uid == uid` on every path. See `firestore.rules`.

## Setup

### Prerequisites
- Node.js 18+, Python 3.11+
- Google Cloud project with billing enabled
- Firebase project linked to the same GCP project

### 1. Cloud Infrastructure (run once in Cloud Shell)

```bash
# Set project
gcloud config set project darshanideathon

# Enable APIs
gcloud services enable \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Create Firestore database
gcloud firestore databases create --location=asia-south1

# Store the Gemini API key securely
echo -n "YOUR_KEY" | gcloud secrets create gemini-api-key --data-file=-

# Grant Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:1030590724516-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Set up Cloud KMS for Encryption at Rest (Enhancement A)
gcloud kms keyrings create journal-key-ring --location=asia-south1
gcloud kms keys create journal-crypto-key \
  --location=asia-south1 \
  --keyring=journal-key-ring \
  --purpose=encryption

# Grant Cloud Run service account access to KMS key
gcloud kms keys add-iam-policy-binding journal-crypto-key \
  --location=asia-south1 \
  --keyring=journal-key-ring \
  --member="serviceAccount:1030590724516-compute@developer.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"
```

### 2. Firebase Auth
Enable Email/Password and Google sign-in in the Firebase Console → Authentication → Sign-in method.

### 3. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 4. Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
# Set GEMINI_API_KEY env var for local dev (never commit .env)
python main.py

# Frontend
cd frontend
npm install
npm run dev
```

### 5. Deploy to Cloud Run
```bash
cd backend
gcloud run deploy gemini-journal-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Feature Enhancements (Phase 3)

### Enhancement A: Encryption at Rest (Cloud KMS)
Every journal summary is encrypted server-side using Google Cloud KMS before being written to Firestore. The ciphertext is stored in the database. When the user requests their insights, the backend decrypts the summaries on the fly. The KMS key is protected by IAM and accessible only by the backend service account.

### Enhancement B: Semantic Lookback ("What have I been anxious about?")
Users can query their own journal history. The backend embeds the summaries at write-time, and at read-time performs a cosine similarity search strictly across that specific user's encrypted entries. It then decrypts the top matches and asks Gemini to synthesize an insight grounded purely in the user's data. Note: We use a simple numpy vector search since it operates solely on the requesting user's documents; a dedicated Vector DB is recommended at scale.

## Testing Checklist
- [x] **Unauthenticated Access:** A request with no `Authorization` header gets HTTP 401 on every protected route (`/api/chat`, `/api/sessions`, etc.).
- [x] **Data Isolation:** A request with a valid token for User A trying to fetch `/api/sessions/{session_id}` belonging to User B returns a 404 Not Found (since it does not exist under User A's uid path).
- [x] **Secret Safety:** The Gemini key is never printed to stdout/logs, never returned in any HTTP response, and never present in any committed file.
- [x] **Git Cleanliness:** The `.gitignore` successfully excludes `.env` and any `*service-account*.json` files.

## Security Checklist
- [x] Firebase Auth ID token verified server-side on every request
- [x] All Firestore paths scoped to /users/{uid}/...
- [x] Firestore rules default-deny, then allow only uid-matched access
- [x] Gemini API key in Secret Manager only, fetched at backend startup
- [x] No secrets in frontend code, .env, or git history
- [x] Input validation: message length capped at 8000 chars server-side via Pydantic
- [x] CORS configured (tighten allow_origins for production)
