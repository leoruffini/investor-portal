import logging
import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from routers import documents, investors, kyc, promotion_investors, promotions, protocol

logger = logging.getLogger(__name__)

BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "")
IS_PRODUCTION = os.getenv("RENDER", "") != ""  # Render sets RENDER=true automatically

if not BACKEND_API_KEY:
    if IS_PRODUCTION:
        logger.critical(
            "BACKEND_API_KEY is not set in production! All data endpoints will reject requests."
        )
    else:
        logger.warning("BACKEND_API_KEY not set — API key auth disabled (local dev)")

# Disable Swagger docs in production
app = FastAPI(
    title="Investor Portal API",
    version="0.1.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def verify_api_key(request: Request):
    if not BACKEND_API_KEY:
        if IS_PRODUCTION:
            raise HTTPException(status_code=503, detail="Server misconfigured: API key not set")
        return  # no key configured — skip check (local dev)
    key = request.headers.get("X-API-Key")
    if key != BACKEND_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


app.include_router(promotions.router, dependencies=[Depends(verify_api_key)])
app.include_router(investors.router, dependencies=[Depends(verify_api_key)])
app.include_router(promotion_investors.router, dependencies=[Depends(verify_api_key)])
app.include_router(documents.router, dependencies=[Depends(verify_api_key)])
app.include_router(kyc.router, dependencies=[Depends(verify_api_key)])
app.include_router(protocol.router, dependencies=[Depends(verify_api_key)])


@app.get("/health")
async def health():
    return {"status": "ok"}
