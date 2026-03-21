from fastapi import APIRouter

from models.schemas import Investor, InvestorCreate, InvestorUpdate

router = APIRouter(prefix="/investors", tags=["investors"])


@router.get("/", response_model=list[Investor])
async def list_investors(promotion_id: str | None = None):
    # TODO: query Supabase, optionally filter by promotion_id
    return []


@router.get("/{investor_id}", response_model=Investor)
async def get_investor(investor_id: str):
    # TODO: query Supabase
    ...


@router.post("/", response_model=Investor, status_code=201)
async def create_investor(payload: InvestorCreate):
    # TODO: insert into Supabase
    ...


@router.patch("/{investor_id}", response_model=Investor)
async def update_investor(investor_id: str, payload: InvestorUpdate):
    # TODO: update in Supabase
    ...


@router.delete("/{investor_id}", status_code=204)
async def delete_investor(investor_id: str):
    # TODO: delete from Supabase
    ...
