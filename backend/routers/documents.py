from fastapi import APIRouter, HTTPException, UploadFile
from models.schemas import DocType, Document

from db import supabase

router = APIRouter(prefix="/documents", tags=["documents"])

TABLE = "documents"
BUCKET = "documents"


@router.post("/{investor_id}", response_model=Document, status_code=201)
async def upload_document(
    investor_id: str,
    file: UploadFile,
    doc_type: DocType = DocType.otro,
):
    # Verify investor exists
    inv = supabase.table("investors").select("id").eq("id", investor_id).execute()
    if not inv.data:
        raise HTTPException(status_code=404, detail="Inversor no encontrado")

    storage_path = f"{investor_id}/{file.filename}"
    content = await file.read()

    # Upload to Supabase Storage
    supabase.storage.from_(BUCKET).upload(
        path=storage_path,
        file=content,
        file_options={"content-type": file.content_type or "application/pdf"},
    )

    # Save metadata to DB
    row = {
        "investor_id": investor_id,
        "filename": file.filename,
        "storage_path": storage_path,
        "doc_type": doc_type.value,
    }
    result = supabase.table(TABLE).insert(row).execute()
    return result.data[0]


@router.get("/{investor_id}", response_model=list[Document])
async def list_documents(investor_id: str):
    result = (
        supabase.table(TABLE)
        .select("*")
        .eq("investor_id", investor_id)
        .order("uploaded_at", desc=True)
        .execute()
    )
    return result.data
