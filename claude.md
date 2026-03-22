# Investor Portal — Provalix (PVX)

## What this project is

Web system to automate KYC data collection from real estate investors. Provalix (property developer) needs investors to submit legal documents (incorporation deeds, board appointments, powers of attorney). The system extracts structured data from PDFs using AI, the investor reviews and confirms, and the system auto-generates the Investment Protocol (a legal Word document).

## Current state

**All 3 phases** are complete and merged to `main`. The app is deployed.

What works today:
- FastAPI backend with Supabase (promotions, investors, documents, KYC data)
- PDF upload → text extraction (PyMuPDF + OCR) → LLM extraction (Claude/GPT) → review form → protocol generation
- Investor portal: personalized link (`/portal/{token}`) → upload docs → review extracted data → confirm
- Backoffice: admin panel at `/admin` with password protection

Original Streamlit prototype (`app.py`) is kept as reference only.

## Target architecture

### Backend: FastAPI (Python)
- Reuses existing logic from `scripts/agente_inversor.py`, `scripts/rellenar_protocolo.py`, `scripts/kyc_utils.py`
- REST endpoints for: promotion management, investor CRUD, doc upload/processing, protocol generation
- Directory: `/backend`

### Frontend: Next.js + Tailwind CSS + shadcn/ui
- Two interfaces: investor portal (`/portal/{token}`) + Provalix back office (`/admin`)
- Connects to FastAPI backend
- Directory: `/frontend`
- **Stack**: Next.js (App Router), Tailwind CSS, shadcn/ui for components
- **Brand tokens** (configured in `tailwind.config.js` as custom colors):
  - Navy: `#233348` (primary, headers, dark text, buttons)
  - Teal: `#3ABFC2` (accents, active states, highlights)
  - Light bg: `#f8f9fb`
  - Fonts: Inter (body), Playfair Display (headings)
- **Backoffice auth**: `ADMIN_PASSWORD` env var, HMAC-SHA256 signed cookie (`admin_session`), middleware guard on `/admin/*` routes. Middleware runs in **edge runtime** — only use Web Crypto API (`crypto.subtle`), not Node.js `crypto` module.

### Database: Supabase
- PostgreSQL for structured data (promotions, investors, KYC data, statuses)
- Supabase Storage for PDFs and generated documents
- Auth with magic links for investors

### Deployment (live)
- Backend: Render Starter ($7/mo, Docker) → `https://investor-portal-1.onrender.com`
  - Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `LLM_PROVIDER`, `CORS_ORIGINS`, `BACKEND_API_KEY`
  - Health check: `/health`
  - Swagger docs (`/docs`, `/redoc`, `/openapi.json`) are disabled in production (detected via `RENDER` env var)
  - All data endpoints require `X-API-Key` header matching `BACKEND_API_KEY`; if key is not set in prod, endpoints return 503
  - All path parameters (IDs) are validated as UUIDs; invalid values return 422
  - Starter tier includes: zero downtime deploys, SSH, scaling, one-off jobs, persistent disks
- Frontend: Vercel → `https://investor-portal-eosin-ten.vercel.app`
  - Env vars: `NEXT_PUBLIC_API_URL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_API_KEY` (must match `BACKEND_API_KEY`)
- DB: Supabase Cloud (`rwblntkhdwsfcmrtxiia`)

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

### Phase 1: `feature/api-backend` ✅ COMPLETE (merged to main)
Set up FastAPI + Supabase + migrate existing Python logic.
- FastAPI structure in `/backend` with routers, services, models
- Supabase: tables (promotions, investors, documents, kyc_data), storage buckets
- Endpoints: POST /upload-docs, GET /kyc-data/{investor_id}, POST /generate-protocol/{investor_id}
- CRUD: promotions, investors
- Tests with pytest

### Phase 2: `feature/investor-portal` ✅ COMPLETE (merged to main)
Next.js frontend for the investor.
- Token access page (`/portal/{token}`)
- Document upload (`/portal/{token}/upload`)
- Data review form (`/portal/{token}/review`)
- Confirmation page (`/portal/{token}/complete`)

### Phase 3: `feature/backoffice` ✅ COMPLETE (merged to main)
Provalix admin panel at `/admin`.
- **Auth**: password login (`/admin/login`), middleware guard, cookie-based session, `ADMIN_PASSWORD` env var
- **Dashboard** (`/admin`): promotion cards with investor counts and progress bars
- **Create promotion** (`/admin/promotions/new`): name + description form
- **Promotion detail** (`/admin/promotions/[id]`): stats (total/pending/in-progress/complete), investor table with status badges, copy portal link, delete investor
- **Add investors** (`/admin/promotions/[id]/investors/new`): individual form + CSV bulk import tab
- **Investor detail** (`/admin/promotions/[id]/investors/[investorId]`): info card, document list with download, upload docs on behalf, KYC review form, trigger protocol generation
- Shared components: `StatusBadge`, `CopyLinkButton`
- API helper: `lib/api.ts` extended with promotion/investor/document/protocol functions

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
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── portal/[token]/      # Investor portal (Phase 2)
│   │   │   ├── page.tsx         # Welcome / doc status
│   │   │   ├── upload/          # Document upload
│   │   │   ├── review/          # KYC data review
│   │   │   └── complete/        # Confirmation
│   │   └── admin/               # Backoffice (Phase 3)
│   │       ├── login/           # Password login
│   │       ├── page.tsx         # Dashboard
│   │       ├── api/auth/        # Login/logout API route
│   │       └── promotions/
│   │           ├── new/         # Create promotion
│   │           └── [id]/        # Promotion detail
│   │               └── investors/
│   │                   ├── new/           # Add investors
│   │                   └── [investorId]/  # Investor detail
│   ├── components/              # Shared UI (StatusBadge, CopyLinkButton, etc.)
│   ├── lib/api.ts               # Backend API client
│   └── middleware.ts            # Auth guard for /admin/*
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
# Backend
cd backend
uvicorn main:app --reload          # runs on :8000

# Frontend
cd frontend
npm run dev                        # runs on :3000

# Original Streamlit prototype (reference only)
source venv/bin/activate
streamlit run app.py

# Git
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
