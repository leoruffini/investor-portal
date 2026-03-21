from fastapi import FastAPI

from routers import investors, promotions

app = FastAPI(title="Investor Portal API", version="0.1.0")

app.include_router(promotions.router)
app.include_router(investors.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
