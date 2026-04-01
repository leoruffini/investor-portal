import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException

from db import supabase
from models.schemas import (
    PromotionInvestor,
    PromotionInvestorCreate,
    PromotionInvestorUpdate,
    PromotionInvestorWithInvestor,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/promotion-investors", tags=["promotion-investors"])

TABLE = "promotion_investors"


def _flatten_investor(row: dict) -> dict:
    """Move nested investors{name, email, cif} to top-level fields."""
    investor = row.pop("investors", None) or {}
    row["investor_name"] = investor.get("name", "")
    row["investor_email"] = investor.get("email", "")
    row["investor_cif"] = investor.get("cif", "")
    return row


def _find_or_create_investor(name: str, email: str, cif: str) -> str:
    """Find an investor by CIF or create a new one. Returns investor id."""
    existing = (
        supabase.table("investors")
        .select("id")
        .eq("cif", cif)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]

    result = (
        supabase.table("investors")
        .insert({"name": name, "email": email, "cif": cif})
        .execute()
    )
    return result.data[0]["id"]


@router.get("/", response_model=list[PromotionInvestorWithInvestor])
async def list_enrollments(
    promotion_id: str | None = None,
    token: str | None = None,
):
    if not promotion_id and not token:
        raise HTTPException(status_code=400, detail="Debe indicar promotion_id o token")

    query = (
        supabase.table(TABLE)
        .select("*, investors(name, email, cif)")
        .order("created_at", desc=True)
    )
    if promotion_id:
        query = query.eq("promotion_id", promotion_id)
    if token:
        query = query.eq("token", token)

    result = query.execute()
    return [_flatten_investor(row) for row in result.data]


@router.get("/{enrollment_id}", response_model=PromotionInvestorWithInvestor)
async def get_enrollment(enrollment_id: UUID):
    result = (
        supabase.table(TABLE)
        .select("*, investors(name, email, cif)")
        .eq("id", str(enrollment_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return _flatten_investor(result.data[0])


@router.post("/", response_model=PromotionInvestor, status_code=201)
async def create_enrollment(payload: PromotionInvestorCreate):
    # Verify promotion exists
    promo = (
        supabase.table("promotions")
        .select("id")
        .eq("id", payload.promotion_id)
        .execute()
    )
    if not promo.data:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")

    # Find or create investor by CIF
    investor_id = _find_or_create_investor(payload.name, payload.email, payload.cif)

    # Create enrollment
    enrollment_data = {
        "promotion_id": payload.promotion_id,
        "investor_id": investor_id,
        "investment_amount": payload.investment_amount,
        "ownership_pct": payload.ownership_pct,
    }
    try:
        result = supabase.table(TABLE).insert(enrollment_data).execute()
    except Exception as exc:
        err = str(exc).lower()
        if "unique" in err or "duplicate" in err or "23505" in err:
            raise HTTPException(
                status_code=409,
                detail="Este inversor ya está inscrito en esta promoción",
            )
        raise

    return result.data[0]


@router.patch("/{enrollment_id}", response_model=PromotionInvestor)
async def update_enrollment(enrollment_id: UUID, payload: PromotionInvestorUpdate):
    updates = payload.model_dump(mode="json", exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    result = (
        supabase.table(TABLE)
        .update(updates)
        .eq("id", str(enrollment_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return result.data[0]


@router.delete("/{enrollment_id}")
async def delete_enrollment(enrollment_id: UUID):
    result = supabase.table(TABLE).delete().eq("id", str(enrollment_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return {"status": "deleted"}
