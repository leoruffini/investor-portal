# Investor Portal — Provalix (PVX)

## What this project is

Web system to automate KYC data collection from real estate investors. Provalix (property developer) needs investors to submit legal documents (incorporation deeds, board appointments, powers of attorney). The system extracts structured data from PDFs using AI, the investor reviews and confirms, and the system auto-generates the Investment Protocol (a legal Word document).

## Current state

There is a **working Streamlit prototype** (`app.py`, ~1,200 lines) deployed on Render. It does:
- PDF upload → text extraction (PyMuPDF + OCR) → LLM extraction (Claude/GPT) → review form → JSON → Word

**What it does NOT have** (to be built):
- Database (everything lives in session_state, lost on browser close)
- Authentication or roles (no distinction between Provalix admin and investor)
- Multi-investor flow (no concept of a "promotion" with N investors)
- Back office for Provalix (tracking each investor's status)
- Personalized links for each investor to upload their docs
- Persistent document storage

## Target architecture

### Backend: FastAPI (Python)
- Reuses existing logic from `scripts/agente_inversor.py`, `scripts/rellenar_protocolo.py`, `scripts/kyc_utils.py`
- REST endpoints for: promotion management, investor CRUD, doc upload/processing, protocol generation
- Directory: `/backend`

### Frontend: React (Next.js or Vite)
- Two interfaces: investor portal + Provalix back office
- Connects to FastAPI backend
- Directory: `/frontend`

### Database: Supabase
- PostgreSQL for structured data (promotions, investors, KYC data, statuses)
- Supabase Storage for PDFs and generated documents
- Auth with magic links for investors

### Deployment
- Backend: Render (Docker, as currently)
- Frontend: Vercel
- DB: Supabase Cloud

## Data model (core tables)

```
promotions
  - id, name, description, created_at

investors
  - id, promotion_id (FK), name, email, investment_amount, ownership_pct, status (pending/docs_uploaded/data_confirmed/complete), token (for personalized link), created_at

documents
  - id, investor_id (FK), filename, storage_path, doc_type (escritura_constitucion/nombramiento/poderes/otro), uploaded_at

kyc_data
  - id, investor_id (FK), extracted_json (JSONB), confirmed (boolean), confirmed_at
```

## Full flow

1. **Provalix** creates a promotion and adds investors (name, email, amount, %)
2. System generates a unique link per investor (signed token or magic link)
3. **First promotion**: Provalix uploads docs on behalf of investors (testing, avoids GDPR issues)
4. **Subsequent promotions**: each investor enters via their link and uploads their own docs
5. Backend processes PDFs → LLM extracts data → JSON saved to `kyc_data`
6. Investor (or Provalix) reviews and confirms data in a form
7. When all investors are `complete`, the Investment Protocol (Word) is generated
8. Provalix has a back office with per-investor status view

## Development phases

### Phase 1: `feature/api-backend` ← CURRENT
Set up FastAPI + Supabase + migrate existing Python logic.
- Create FastAPI structure in `/backend`
- Configure Supabase (tables, storage, auth)
- Migrate `agente_inversor.py` to endpoints: POST /upload-docs, GET /kyc-data/{investor_id}
- Migrate `rellenar_protocolo.py` to endpoint: POST /generate-protocol/{investor_id}
- CRUD endpoints: promotions, investors
- Basic tests with pytest

### Phase 2: `feature/investor-portal`
React frontend for the investor.
- Token/magic link access page
- Document upload
- Data review form (equivalent to current Streamlit Step 3)
- Confirmation

### Phase 3: `feature/backoffice`
Provalix admin panel.
- Create promotion + add investors
- Per-investor status view (docs uploaded, data confirmed)
- Generate protocol when all complete
- Upload docs on behalf of investors (first promotion)

## Repo structure

```
investor-portal/
├── CLAUDE.md                    ← this file
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── routers/                 # endpoints by domain
│   ├── services/                # business logic (extraction, protocol)
│   ├── models/                  # Pydantic schemas
│   ├── db.py                    # Supabase connection
│   └── requirements.txt
├── frontend/                    # (Phase 2)
├── scripts/                     # original code (reference)
│   ├── agente_inversor.py
│   ├── rellenar_protocolo.py
│   └── kyc_utils.py
├── app.py                       # original Streamlit app (reference, do not modify)
├── 02a. Plantilla Borrador...   # Word protocol template
└── assets/
```

## Conventions

- **Python**: 3.11+, type hints, async where possible
- **Style**: clean code, short functions, descriptive names in English for code, Spanish for UI/user-facing messages
- **Commits**: short descriptive messages in English (e.g., "add investor CRUD endpoints")
- **Branches**: `main` (production) → `feature/xxx` (development). Never commit directly to main.
- **Secrets**: never in code. Use environment variables (.env for local, Render/Vercel for prod)

## Useful commands

```bash
# Current Streamlit prototype
source venv/bin/activate
streamlit run app.py

# Backend (once created)
cd backend
uvicorn main:app --reload

# Git: create feature branch
git checkout -b feature/api-backend
git push -u origin feature/api-backend

# Git: switch back to main
git checkout main
```

## Business context

- **Provalix** is a real estate developer managing collective investments
- Investors are companies (not individuals), hence all documentation is corporate/legal
- The Investment Protocol is a legal document requiring exact data
- The Word template (`02a. Plantilla Borrador...`) has `[*]` placeholders that get auto-filled
- First promotion: ~10-15 investors. Low volume but repetitive process.
- All user-facing text and UI should be in **Spanish**

## Instructions for Claude Code

- **Do NOT modify `app.py`** — it is the working prototype kept as reference. All new work goes in `/backend` and `/frontend`.
- **Reuse logic from `scripts/`** — the text extraction, LLM call, and protocol filling functions already work. Wrap them in endpoints, do not rewrite them.
- **Supabase Python client**: use `supabase-py` (pip install supabase)
- **LLM provider is configurable**: support both Anthropic and OpenAI (env var LLM_PROVIDER)
- **PDFs can be scanned**: the current pipeline handles OCR with tesseract. Keep that capability.
- **Keep things simple**: this is a small internal tool for ~15 investors per promotion. Do not over-engineer.
