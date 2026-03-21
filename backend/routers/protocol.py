from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io

from db import supabase
from services.extraction import build_protocol_json
from services.protocol import generate_protocol

router = APIRouter(prefix="/protocol", tags=["protocol"])


@router.post("/generate/{investor_id}")
async def generate_protocol_endpoint(investor_id: str):
    """
    Generate the Investment Protocol Word document for an investor.
    Requires confirmed KYC data and an investment_amount on the investor record.
    """
    # Get investor
    inv_result = supabase.table("investors").select("*").eq("id", investor_id).execute()
    if not inv_result.data:
        raise HTTPException(status_code=404, detail="Inversor no encontrado")
    investor = inv_result.data[0]

    if not investor.get("investment_amount"):
        raise HTTPException(status_code=400, detail="El inversor no tiene importe de inversión definido")

    # Get confirmed KYC data
    kyc_result = supabase.table("kyc_data").select("*").eq("investor_id", investor_id).execute()
    if not kyc_result.data:
        raise HTTPException(status_code=400, detail="No hay datos KYC para este inversor")

    kyc = kyc_result.data[0]
    if not kyc.get("confirmed"):
        raise HTTPException(status_code=400, detail="Los datos KYC aún no han sido confirmados")

    # Build protocol JSON and generate Word
    protocol_data = build_protocol_json(kyc["extracted_json"], investor["investment_amount"])
    docx_bytes = generate_protocol(protocol_data)

    # Upload to Supabase Storage
    filename = f"Protocolo_Inversion_{investor['name'].replace(' ', '_').upper()}.docx"
    storage_path = f"{investor_id}/{filename}"

    # Remove previous version if exists
    supabase.storage.from_("documents").remove([storage_path])

    supabase.storage.from_("documents").upload(
        path=storage_path,
        file=docx_bytes,
        file_options={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    )

    # Update investor status
    supabase.table("investors").update({"status": "complete"}).eq("id", investor_id).execute()

    # Return the file
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
