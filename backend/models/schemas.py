from datetime import datetime
from enum import Enum
from typing import Any

import re

from pydantic import BaseModel, EmailStr, field_validator, model_validator


def _normalize_cif(v: str) -> str:
    """Strip spaces, hyphens, dots and uppercase so B-1234-5678 == B12345678."""
    return re.sub(r"[\s\-.]", "", v).upper()


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


# --- Promotion Settings ---

class PromotionSettings(BaseModel):
    total_investment: float | None = None
    total_shares: int | None = None
    first_disbursement_pct: float | None = None
    second_disbursement_pct: float | None = None

    @model_validator(mode="after")
    def check_disbursement_sum(self):
        first = self.first_disbursement_pct
        second = self.second_disbursement_pct
        if first is not None and second is not None:
            if abs(first + second - 100) > 0.01:
                raise ValueError("Los porcentajes de desembolso deben sumar 100")
        return self


# --- Promotions ---

class PromotionBase(BaseModel):
    name: str
    description: str | None = None
    settings: PromotionSettings | None = None


class PromotionCreate(PromotionBase):
    pass


class PromotionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    settings: PromotionSettings | None = None


class Promotion(PromotionBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Investors (identity only) ---

class InvestorBase(BaseModel):
    name: str
    email: EmailStr
    cif: str

    @field_validator("cif")
    @classmethod
    def normalize_cif(cls, v: str) -> str:
        return _normalize_cif(v)


class InvestorCreate(InvestorBase):
    pass


class InvestorUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    cif: str | None = None

    @field_validator("cif")
    @classmethod
    def normalize_cif(cls, v: str | None) -> str | None:
        return _normalize_cif(v) if v is not None else None


class Investor(InvestorBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Promotion–Investor enrollments ---

class PromotionInvestorCreate(BaseModel):
    promotion_id: str
    name: str
    email: EmailStr
    cif: str
    investment_amount: float | None = None
    ownership_pct: float | None = None

    @field_validator("cif")
    @classmethod
    def normalize_cif(cls, v: str) -> str:
        return _normalize_cif(v)


class PromotionInvestorUpdate(BaseModel):
    investment_amount: float | None = None
    ownership_pct: float | None = None
    status: InvestorStatus | None = None


class PromotionInvestor(BaseModel):
    id: str
    promotion_id: str
    investor_id: str
    investment_amount: float | None = None
    ownership_pct: float | None = None
    status: InvestorStatus = InvestorStatus.pending
    token: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PromotionInvestorWithInvestor(PromotionInvestor):
    """Enrollment enriched with investor identity fields."""
    investor_name: str
    investor_email: str
    investor_cif: str


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
