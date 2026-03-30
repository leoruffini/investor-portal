from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io

from db import supabase
from services.extraction import build_protocol_json
from services.protocol import generate_protocol

router = APIRouter(prefix="/protocol", tags=["protocol"])


@router.post("/generate/{enrollment_id}")
async def generate_protocol_endpoint(enrollment_id: UUID):
    """
    Generate the Investment Protocol Word document for an enrollment.
    Requires confirmed KYC data and an investment_amount on the enrollment record.
    """
    enr_id = str(enrollment_id)

    # Get enrollment
    enr_result = (
        supabase.table("promotion_investors")
        .select("*")
        .eq("id", enr_id)
        .execute()
    )
    if not enr_result.data:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    enrollment = enr_result.data[0]

    if not enrollment.get("investment_amount"):
        raise HTTPException(status_code=400, detail="La inscripción no tiene importe de inversión definido")

    investor_id = enrollment["investor_id"]

    # Get investor name for filename
    inv_result = supabase.table("investors").select("name").eq("id", investor_id).execute()
    if not inv_result.data:
        raise HTTPException(status_code=404, detail="Inversor no encontrado")
    investor_name = inv_result.data[0]["name"]

    # Get confirmed KYC data
    kyc_result = supabase.table("kyc_data").select("*").eq("investor_id", investor_id).execute()
    if not kyc_result.data:
        raise HTTPException(status_code=400, detail="No hay datos KYC para este inversor")

    kyc = kyc_result.data[0]
    if not kyc.get("confirmed"):
        raise HTTPException(status_code=400, detail="Los datos KYC aún no han sido confirmados")

    # Get promotion settings for disbursement percentages
    promo_result = (
        supabase.table("promotions")
        .select("settings")
        .eq("id", enrollment["promotion_id"])
        .execute()
    )
    promotion_settings = promo_result.data[0].get("settings") if promo_result.data else None

    # Build protocol JSON and generate Word
    protocol_data = build_protocol_json(kyc["extracted_json"], enrollment["investment_amount"], promotion_settings)
    docx_bytes = generate_protocol(protocol_data)

    # Upload to Supabase Storage (use enrollment_id to avoid cross-promotion collisions)
    filename = f"Protocolo_Inversion_{investor_name.replace(' ', '_').upper()}.docx"
    storage_path = f"{enr_id}/{filename}"

    # Remove previous version if exists
    supabase.storage.from_("documents").remove([storage_path])

    supabase.storage.from_("documents").upload(
        path=storage_path,
        file=docx_bytes,
        file_options={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    )

    # Update enrollment status
    supabase.table("promotion_investors").update({"status": "complete"}).eq("id", enr_id).execute()

    # Return the file
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
