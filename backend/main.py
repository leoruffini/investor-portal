from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import documents, investors, kyc, promotions, protocol

app = FastAPI(title="Investor Portal API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(promotions.router)
app.include_router(investors.router)
app.include_router(documents.router)
app.include_router(kyc.router)
app.include_router(protocol.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
