import re
import unicodedata

from typing import Optional

from fastapi import APIRouter, Body, HTTPException, UploadFile

from db import supabase
from models.schemas import KycData
from services.extraction import extract_text_from_pdf, extract_with_llm, validate_kyc


def _sanitize_filename(name: str) -> str:
    """Remove accents, replace spaces and special chars for storage keys."""
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = re.sub(r"[^\w.\-]", "_", name)
    name = re.sub(r"_+", "_", name)
    return name.strip("_")

router = APIRouter(prefix="/kyc", tags=["kyc"])

TABLE = "kyc_data"


@router.post("/upload-docs/{investor_id}", response_model=KycData)
async def upload_docs(investor_id: str, files: list[UploadFile]):
    """
    Receive PDFs, extract text, call LLM, save extracted JSON to kyc_data.
    Also uploads files to Supabase Storage and records them in documents table.
    """
    # Verify investor exists
    inv = supabase.table("investors").select("id").eq("id", investor_id).execute()
    if not inv.data:
        raise HTTPException(status_code=404, detail="Inversor no encontrado")

    # Extract text from each PDF
    all_texts: list[str] = []
    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Solo se aceptan archivos PDF: {file.filename}")

        pdf_bytes = await file.read()

        # Upload to storage + save metadata
        safe_name = _sanitize_filename(file.filename)
        storage_path = f"{investor_id}/{safe_name}"
        supabase.storage.from_("documents").upload(
            path=storage_path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )
        supabase.table("documents").insert({
            "investor_id": investor_id,
            "filename": file.filename,
            "storage_path": storage_path,
            "doc_type": "otro",
        }).execute()

        text = extract_text_from_pdf(pdf_bytes, file.filename)
        if text:
            all_texts.append(f"=== DOCUMENTO: {file.filename} ===\n{text}")

    if not all_texts:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto de ningún PDF")

    combined_text = "\n\n".join(all_texts)

    # LLM extraction
    extracted = extract_with_llm(combined_text)

    # Upsert into kyc_data (one row per investor)
    existing = supabase.table(TABLE).select("id").eq("investor_id", investor_id).execute()
    if existing.data:
        result = (
            supabase.table(TABLE)
            .update({"extracted_json": extracted, "confirmed": False, "confirmed_at": None})
            .eq("investor_id", investor_id)
            .execute()
        )
    else:
        result = supabase.table(TABLE).insert({
            "investor_id": investor_id,
            "extracted_json": extracted,
        }).execute()

    # Update investor status
    supabase.table("investors").update({"status": "docs_uploaded"}).eq("id", investor_id).execute()

    return result.data[0]


@router.get("/kyc-data/{investor_id}", response_model=KycData)
async def get_kyc_data(investor_id: str):
    """Retrieve extracted KYC data for an investor."""
    result = supabase.table(TABLE).select("*").eq("investor_id", investor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Datos KYC no encontrados para este inversor")
    return result.data[0]


@router.patch("/kyc-data/{investor_id}/confirm", response_model=KycData)
async def confirm_kyc_data(
    investor_id: str,
    extracted_json: Optional[dict] = Body(None),
):
    """Mark KYC data as confirmed, optionally updating the extracted JSON with investor edits."""
    update_payload: dict = {"confirmed": True, "confirmed_at": "now()"}
    if extracted_json is not None:
        update_payload["extracted_json"] = extracted_json

    result = (
        supabase.table(TABLE)
        .update(update_payload)
        .eq("investor_id", investor_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Datos KYC no encontrados para este inversor")

    # Update investor status
    supabase.table("investors").update({"status": "data_confirmed"}).eq("id", investor_id).execute()

    return result.data[0]
