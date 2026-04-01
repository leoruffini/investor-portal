from uuid import UUID

from fastapi import APIRouter, HTTPException

from db import supabase
from models.schemas import Investor, InvestorCreate, InvestorUpdate

router = APIRouter(prefix="/investors", tags=["investors"])

TABLE = "investors"


@router.get("/", response_model=list[Investor])
async def list_investors(email: str | None = None, cif: str | None = None):
    query = supabase.table(TABLE).select("*").order("created_at", desc=True)
    if email:
        query = query.eq("email", email)
    if cif:
        query = query.eq("cif", cif)
    result = query.execute()
    return result.data


@router.get("/{investor_id}", response_model=Investor)
async def get_investor(investor_id: UUID):
    result = supabase.table(TABLE).select("*").eq("id", str(investor_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Inversor no encontrado")
    return result.data[0]


@router.post("/", response_model=Investor, status_code=201)
async def create_investor(payload: InvestorCreate):
    result = supabase.table(TABLE).insert(payload.model_dump()).execute()
    return result.data[0]


@router.patch("/{investor_id}", response_model=Investor)
async def update_investor(investor_id: UUID, payload: InvestorUpdate):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")
    result = (
        supabase.table(TABLE)
        .update(updates)
        .eq("id", str(investor_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Inversor no encontrado")
    return result.data[0]


@router.delete("/{investor_id}")
async def delete_investor(investor_id: UUID):
    result = supabase.table(TABLE).delete().eq("id", str(investor_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Inversor no encontrado")
    return {"status": "deleted"}
