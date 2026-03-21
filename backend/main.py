import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from routers import documents, investors, kyc, promotions, protocol

app = FastAPI(title="Investor Portal API", version="0.1.0")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "")


async def verify_api_key(request: Request):
    if not BACKEND_API_KEY:
        return  # no key configured — skip check (local dev)
    key = request.headers.get("X-API-Key")
    if key != BACKEND_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


app.include_router(promotions.router, dependencies=[Depends(verify_api_key)])
app.include_router(investors.router, dependencies=[Depends(verify_api_key)])
app.include_router(documents.router, dependencies=[Depends(verify_api_key)])
app.include_router(kyc.router, dependencies=[Depends(verify_api_key)])
app.include_router(protocol.router, dependencies=[Depends(verify_api_key)])


@app.get("/health")
async def health():
    return {"status": "ok"}
