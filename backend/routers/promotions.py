from uuid import UUID

from fastapi import APIRouter, HTTPException

from db import supabase
from models.schemas import Promotion, PromotionCreate, PromotionUpdate

router = APIRouter(prefix="/promotions", tags=["promotions"])

TABLE = "promotions"


@router.get("/", response_model=list[Promotion])
async def list_promotions():
    result = supabase.table(TABLE).select("*").order("created_at", desc=True).execute()
    return result.data


@router.get("/{promotion_id}", response_model=Promotion)
async def get_promotion(promotion_id: UUID):
    result = supabase.table(TABLE).select("*").eq("id", str(promotion_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    return result.data[0]


@router.post("/", response_model=Promotion, status_code=201)
async def create_promotion(payload: PromotionCreate):
    result = supabase.table(TABLE).insert(payload.model_dump()).execute()
    return result.data[0]


@router.patch("/{promotion_id}", response_model=Promotion)
async def update_promotion(promotion_id: UUID, payload: PromotionUpdate):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")
    result = (
        supabase.table(TABLE)
        .update(updates)
        .eq("id", str(promotion_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    return result.data[0]


@router.delete("/{promotion_id}")
async def delete_promotion(promotion_id: UUID):
    result = supabase.table(TABLE).delete().eq("id", str(promotion_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    return {"status": "deleted"}
