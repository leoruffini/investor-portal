from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, EmailStr


# --- Enums ---

class InvestorStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    processing_failed = "processing_failed"
    docs_uploaded = "docs_uploaded"
    data_confirmed = "data_confirmed"
    complete = "complete"


class DocType(str, Enum):
    escritura_constitucion = "escritura_constitucion"
    nombramiento = "nombramiento"
    poderes = "poderes"
    otro = "otro"


# --- Promotions ---

class PromotionBase(BaseModel):
    name: str
    description: str | None = None


class PromotionCreate(PromotionBase):
    pass


class PromotionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class Promotion(PromotionBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Investors ---

class InvestorBase(BaseModel):
    name: str
    email: EmailStr
    investment_amount: float | None = None
    ownership_pct: float | None = None


class InvestorCreate(InvestorBase):
    promotion_id: str


class InvestorUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    investment_amount: float | None = None
    ownership_pct: float | None = None
    status: InvestorStatus | None = None


class Investor(InvestorBase):
    id: str
    promotion_id: str
    status: InvestorStatus = InvestorStatus.pending
    token: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Documents ---

class DocumentBase(BaseModel):
    filename: str
    doc_type: DocType = DocType.otro


class Document(DocumentBase):
    id: str
    investor_id: str
    storage_path: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# --- KYC Data ---

class KycData(BaseModel):
    id: str
    investor_id: str
    extracted_json: dict[str, Any]
    confirmed: bool = False
    confirmed_at: datetime | None = None

    model_config = {"from_attributes": True}
