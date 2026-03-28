import logging
import re
import unicodedata
from datetime import datetime, timezone
from uuid import UUID

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Body, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from db import supabase
from models.schemas import KycData
from services.extraction import extract_text_from_pdf, extract_with_llm, validate_kyc

logger = logging.getLogger(__name__)


def _sanitize_filename(name: str) -> str:
    """Remove accents, replace spaces and special chars for storage keys."""
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = re.sub(r"[^\w.\-]", "_", name)
    name = re.sub(r"_+", "_", name)
    return name.strip("_")

router = APIRouter(prefix="/kyc", tags=["kyc"])

TABLE = "kyc_data"

# Keywords to infer doc_type from filename
_DOC_TYPE_KEYWORDS: list[tuple[str, list[str]]] = [
    ("escritura_constitucion", ["constitucion", "constitución", "escritura"]),
    ("nombramiento", ["nombramiento", "cargo", "administrador"]),
    ("poderes", ["poder", "poderes", "apoderamiento"]),
]


def _infer_doc_type(filename: str) -> str:
    """Infer document type from filename keywords."""
    lower = filename.lower()
    for doc_type, keywords in _DOC_TYPE_KEYWORDS:
        if any(kw in lower for kw in keywords):
            return doc_type
    return "otro"


def _process_docs_background(investor_id: str, file_texts: list[tuple[str, bytes]]):
    """Background task: extract text from PDFs, call LLM, save results."""
    try:
        all_texts: list[str] = []
        for filename, pdf_bytes in file_texts:
            text = extract_text_from_pdf(pdf_bytes, filename)
            if text:
                all_texts.append(f"=== DOCUMENTO: {filename} ===\n{text}")

        if not all_texts:
            logger.error("No text extracted from any PDF for investor %s", investor_id)
            supabase.table("investors").update({"status": "processing_failed"}).eq("id", investor_id).execute()
            return

        combined_text = "\n\n".join(all_texts)
        extracted = extract_with_llm(combined_text)

        # Upsert into kyc_data
        existing = supabase.table(TABLE).select("id").eq("investor_id", investor_id).execute()
        if existing.data:
            supabase.table(TABLE).update({
                "extracted_json": extracted,
                "confirmed": False,
                "confirmed_at": None,
            }).eq("investor_id", investor_id).execute()
        else:
            supabase.table(TABLE).insert({
                "investor_id": investor_id,
                "extracted_json": extracted,
            }).execute()

        # Update investor status
        supabase.table("investors").update({"status": "docs_uploaded"}).eq("id", investor_id).execute()
        logger.info("Background processing complete for investor %s", investor_id)
    except Exception:
        logger.exception("Background processing failed for investor %s", investor_id)
        try:
            supabase.table("investors").update({"status": "processing_failed"}).eq("id", investor_id).execute()
        except Exception:
            logger.exception("Failed to update status to processing_failed for investor %s", investor_id)


@router.post("/upload-docs/{investor_id}")
async def upload_docs(investor_id: UUID, files: list[UploadFile], background_tasks: BackgroundTasks):
    """
    Receive PDFs, save to storage, then process (OCR + LLM) in background.
    Returns 202 immediately so the frontend doesn't time out.
    """
    inv_id = str(investor_id)

    # Verify investor exists
    inv = supabase.table("investors").select("id").eq("id", inv_id).execute()
    if not inv.data:
        raise HTTPException(status_code=404, detail="Inversor no encontrado")

    # Save files to storage and read bytes for background processing
    file_texts: list[tuple[str, bytes]] = []
    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Solo se aceptan archivos PDF: {file.filename}")

        pdf_bytes = await file.read()

        # Upload to storage + save metadata (fast)
        safe_name = _sanitize_filename(file.filename)
        storage_path = f"{inv_id}/{safe_name}"
        supabase.storage.from_("documents").upload(
            path=storage_path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )

        # Upsert document record to avoid duplicates on re-upload
        doc_type = _infer_doc_type(file.filename)
        existing_doc = (
            supabase.table("documents")
            .select("id")
            .eq("investor_id", inv_id)
            .eq("storage_path", storage_path)
            .execute()
        )
        if existing_doc.data:
            supabase.table("documents").update({
                "filename": file.filename,
                "doc_type": doc_type,
            }).eq("id", existing_doc.data[0]["id"]).execute()
        else:
            supabase.table("documents").insert({
                "investor_id": inv_id,
                "filename": file.filename,
                "storage_path": storage_path,
                "doc_type": doc_type,
            }).execute()

        file_texts.append((file.filename, pdf_bytes))

    # Mark investor as processing before kicking off background task
    supabase.table("investors").update({"status": "processing"}).eq("id", inv_id).execute()

    # Kick off heavy processing (OCR + LLM) in background
    background_tasks.add_task(_process_docs_background, inv_id, file_texts)

    return JSONResponse(status_code=202, content={"status": "processing", "investor_id": inv_id})


@router.get("/kyc-data/{investor_id}", response_model=KycData)
async def get_kyc_data(investor_id: UUID):
    """Retrieve extracted KYC data for an investor."""
    result = supabase.table(TABLE).select("*").eq("investor_id", str(investor_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Datos KYC no encontrados para este inversor")
    return result.data[0]


@router.patch("/kyc-data/{investor_id}/confirm", response_model=KycData)
async def confirm_kyc_data(
    investor_id: UUID,
    extracted_json: Optional[dict] = Body(None),
):
    """Mark KYC data as confirmed, optionally updating the extracted JSON with investor edits."""
    inv_id = str(investor_id)
    update_payload: dict = {"confirmed": True, "confirmed_at": datetime.now(timezone.utc).isoformat()}
    if extracted_json is not None:
        update_payload["extracted_json"] = extracted_json

    result = (
        supabase.table(TABLE)
        .update(update_payload)
        .eq("investor_id", inv_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Datos KYC no encontrados para este inversor")

    # Update investor status
    supabase.table("investors").update({"status": "data_confirmed"}).eq("id", inv_id).execute()

    return result.data[0]
