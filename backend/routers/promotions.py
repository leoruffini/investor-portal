from fastapi import APIRouter

from models.schemas import Promotion, PromotionCreate, PromotionUpdate

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get("/", response_model=list[Promotion])
async def list_promotions():
    # TODO: query Supabase
    return []


@router.get("/{promotion_id}", response_model=Promotion)
async def get_promotion(promotion_id: str):
    # TODO: query Supabase
    ...


@router.post("/", response_model=Promotion, status_code=201)
async def create_promotion(payload: PromotionCreate):
    # TODO: insert into Supabase
    ...


@router.patch("/{promotion_id}", response_model=Promotion)
async def update_promotion(promotion_id: str, payload: PromotionUpdate):
    # TODO: update in Supabase
    ...


@router.delete("/{promotion_id}", status_code=204)
async def delete_promotion(promotion_id: str):
    # TODO: delete from Supabase
    ...
