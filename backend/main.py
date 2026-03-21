from fastapi import FastAPI

from routers import documents, investors, kyc, promotions, protocol

app = FastAPI(title="Investor Portal API", version="0.1.0")

app.include_router(promotions.router)
app.include_router(investors.router)
app.include_router(documents.router)
app.include_router(kyc.router)
app.include_router(protocol.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
