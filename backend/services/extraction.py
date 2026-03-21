"""
KYC data extraction service.

Wraps the logic from scripts/agente_inversor.py:
  PDF bytes → text extraction (PyMuPDF + OCR) → LLM structured extraction → JSON
"""

import gc
import io
import json
import os
import re
from datetime import date
from typing import Any

# PDF extraction
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    from pdf2image import convert_from_bytes
    import pytesseract
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

# LLM clients
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


# ---------------------------------------------------------------------------
# Prompt (from scripts/agente_inversor.py)
# ---------------------------------------------------------------------------
EXTRACTION_PROMPT = """Eres un experto en derecho mercantil español. Analiza el siguiente texto extraído de documentos legales de un inversor y extrae TODOS los datos estructurados posibles.

Devuelve un JSON con exactamente esta estructura (rellena lo que encuentres, usa null para lo que no):

{
  "datos_societarios": {
    "denominacion_actual": "nombre actual de la sociedad",
    "denominaciones_anteriores": ["lista de nombres anteriores si los hay"],
    "nif": "NIF/CIF de la sociedad",
    "forma_juridica": "S.L., S.A., etc.",
    "domicilio_social": {
      "calle": "calle y número",
      "codigo_postal": "CP",
      "localidad": "ciudad",
      "provincia": "provincia"
    },
    "objeto_social": "descripción del objeto social",
    "cnae": "código CNAE",
    "duracion": "indefinida o la que sea"
  },
  "datos_constitucion": {
    "notario": "nombre completo del notario",
    "localidad_notario": "ciudad donde se otorgó",
    "fecha": "DD de MES de AAAA",
    "numero_protocolo": "número de protocolo"
  },
  "capital_social": {
    "importe": 0.00,
    "moneda": "EUR",
    "num_participaciones": 0,
    "valor_nominal_unitario": 0.00
  },
  "datos_registrales": {
    "registro_mercantil": "localidad del RM",
    "tomo": "tomo",
    "folio": "folio",
    "hoja": "hoja",
    "inscripcion": "inscripción"
  },
  "organo_administracion": {
    "tipo": "Administrador Único / Consejo de Administración / etc.",
    "cargos": [
      {
        "cargo": "Presidente / Secretario / etc.",
        "nombre": "nombre completo",
        "documento_identidad": "DNI/NIE/Pasaporte"
      }
    ]
  },
  "representante_legal_firmante": {
    "nombre_completo": "nombre del que firma",
    "dni": "DNI/NIE",
    "cargo_en_sociedad": "cargo que ostenta",
    "domicilio": "domicilio del representante"
  }
}

IMPORTANTE:
- Extrae datos de la versión MÁS RECIENTE de cada campo (si hay cambios de nombre, usa el último)
- El representante legal firmante es quien tiene poderes para firmar en nombre de la sociedad
- Si hay conflicto entre documentos, prioriza el más reciente
- Solo devuelve el JSON, sin explicaciones adicionales

TEXTO DE LOS DOCUMENTOS:
"""

MAX_CHARS = 400_000


# ---------------------------------------------------------------------------
# PDF text extraction
# ---------------------------------------------------------------------------
def extract_text_from_pdf(pdf_bytes: bytes, filename: str = "doc.pdf") -> str:
    """Extract text from PDF bytes. Uses PyMuPDF per page, OCR for scanned pages."""
    text_parts: list[str] = []

    if fitz:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        num_pages = len(doc)

        for page_num in range(num_pages):
            page_text = doc[page_num].get_text()

            # If page has little text and OCR is available, try OCR
            if len(page_text.strip()) < 50 and HAS_OCR:
                images = convert_from_bytes(
                    pdf_bytes, dpi=200, grayscale=True,
                    first_page=page_num + 1, last_page=page_num + 1,
                )
                page_text = pytesseract.image_to_string(images[0], lang="spa")
                del images
                gc.collect()

            if page_text.strip():
                text_parts.append(page_text)

        doc.close()

    elif HAS_OCR:
        images = convert_from_bytes(pdf_bytes, dpi=200, grayscale=True)
        for img in images:
            page_text = pytesseract.image_to_string(img, lang="spa")
            if page_text.strip():
                text_parts.append(page_text)
        del images
        gc.collect()

    else:
        raise RuntimeError(
            "No hay backend de extracción disponible. "
            "Instala PyMuPDF (pip install pymupdf) o pytesseract + pdf2image."
        )

    return "\n".join(text_parts)


# ---------------------------------------------------------------------------
# LLM extraction
# ---------------------------------------------------------------------------
def extract_with_llm(text: str, llm_provider: str | None = None) -> dict[str, Any]:
    """Send text to LLM and get structured KYC data back."""
    if llm_provider is None:
        llm_provider = os.getenv("LLM_PROVIDER", "anthropic")

    prompt = EXTRACTION_PROMPT + text[:MAX_CHARS]

    if llm_provider == "anthropic" and HAS_ANTHROPIC:
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text

    elif llm_provider == "openai" and HAS_OPENAI:
        client = openai.OpenAI()
        response = client.chat.completions.create(
            model="gpt-5.2",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=8192,
            reasoning_effort="medium",
        )
        raw = response.choices[0].message.content

    else:
        raise RuntimeError(
            f"LLM '{llm_provider}' no disponible. "
            "Instala el SDK correspondiente (pip install anthropic / pip install openai)."
        )

    return _parse_json_from_llm(raw)


def _parse_json_from_llm(raw: str) -> dict[str, Any]:
    """Extract the first balanced JSON object from LLM output."""
    start = raw.find("{")
    if start == -1:
        raise ValueError(f"No se encontró JSON en la respuesta del LLM:\n{raw[:500]}")

    depth = 0
    end = start
    for i, c in enumerate(raw[start:], start):
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    try:
        return json.loads(raw[start:end])
    except json.JSONDecodeError as e:
        raise ValueError(
            f"JSON inválido en respuesta del LLM (posición {e.pos}): {e.msg}\n"
            f"Fragmento: {raw[start:start+200]}..."
        ) from e


# ---------------------------------------------------------------------------
# Build protocol JSON
# ---------------------------------------------------------------------------
def numero_a_texto(n: float) -> str:
    """Convert a number to Spanish text (simplified)."""
    n = int(n)
    unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
    decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA",
               "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    especiales = {
        11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
        16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
        21: "VEINTIÚN", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 24: "VEINTICUATRO",
        25: "VEINTICINCO", 26: "VEINTISÉIS", 27: "VEINTISIETE", 28: "VEINTIOCHO",
        29: "VEINTINUEVE",
    }
    centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS",
                "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    if n == 0:
        return "CERO"
    if n == 100:
        return "CIEN"

    parts: list[str] = []

    if n >= 1_000_000:
        millones = n // 1_000_000
        if millones == 1:
            parts.append("UN MILLÓN")
        else:
            parts.append(f"{numero_a_texto(millones)} MILLONES")
        n %= 1_000_000

    if n >= 1000:
        miles = n // 1000
        if miles == 1:
            parts.append("MIL")
        else:
            parts.append(f"{numero_a_texto(miles)} MIL")
        n %= 1000

    if n >= 100:
        if n == 100:
            parts.append("CIEN")
            return " ".join(parts)
        parts.append(centenas[n // 100])
        n %= 100

    if n > 0:
        if n in especiales:
            parts.append(especiales[n])
        elif n < 10:
            parts.append(unidades[n])
        else:
            d = decenas[n // 10]
            u = unidades[n % 10]
            if u:
                parts.append(f"{d} Y {u}")
            else:
                parts.append(d)

    return " ".join(parts)


def build_protocol_json(datos_llm: dict, investment_amount: float) -> dict[str, Any]:
    """Build the full protocol JSON from LLM-extracted data + investment amount."""
    ds = datos_llm.get("datos_societarios", {})
    dc = datos_llm.get("datos_constitucion", {})
    dr = datos_llm.get("datos_registrales", {})
    rl = datos_llm.get("representante_legal_firmante", {})

    # Parse incorporation date
    fecha = dc.get("fecha") or ""
    dia, mes, anio = "", "", ""
    if fecha:
        parts = fecha.replace(" de ", "/").split("/")
        if len(parts) >= 3:
            dia = parts[0].strip()
            mes = parts[1].strip()
            anio = parts[2].strip()

    domicilio = ds.get("domicilio_social") or {}
    calle = domicilio.get("calle") or ""
    if domicilio.get("complemento"):
        calle += f", {domicilio['complemento']}"

    tramo_30 = investment_amount * 0.30
    tramo_70 = investment_amount * 0.70

    return {
        "metadata": {
            "fecha_extraccion": str(date.today()),
            "metodo": "agente_inversor_automatizado",
        },
        "datos_societarios": ds,
        "datos_constitucion": dc,
        "capital_social": datos_llm.get("capital_social", {}),
        "datos_registrales": dr,
        "organo_administracion": datos_llm.get("organo_administracion", {}),
        "representante_legal_firmante": rl,
        "campos_protocolo_inversion": {
            "inversor": {
                "sr_representante": rl.get("nombre_completo") or "",
                "denominacion_sociedad": ds.get("denominacion_actual") or "",
                "calle": calle or "",
                "numero": domicilio.get("numero") or "s/n",
                "localidad_notario_constitucion": dc.get("localidad_notario") or "",
                "nombre_notario_constitucion": dc.get("notario") or "",
                "dia_constitucion": dia or "",
                "mes_constitucion": mes or "",
                "anio_constitucion": anio or "",
                "numero_protocolo_constitucion": dc.get("numero_protocolo") or "",
                "registro_mercantil": dr.get("registro_mercantil") or "",
                "nif": ds.get("nif") or "",
            },
            "importe_inversion": {
                "total": investment_amount,
                "total_texto": numero_a_texto(investment_amount),
                "moneda": "EUR",
                "tramo_30_porciento": tramo_30,
                "tramo_30_texto": numero_a_texto(tramo_30),
                "tramo_70_porciento": tramo_70,
                "tramo_70_texto": numero_a_texto(tramo_70),
            },
        },
    }


# ---------------------------------------------------------------------------
# KYC validation (from scripts/kyc_utils.py)
# ---------------------------------------------------------------------------
CAMPOS_REQUERIDOS = [
    "datos_societarios.denominacion_actual",
    "datos_societarios.nif",
    "representante_legal_firmante.nombre_completo",
    "representante_legal_firmante.dni",
]

LABELS_CAMPOS = {
    "datos_societarios.denominacion_actual": "Denominación social",
    "datos_societarios.nif": "NIF",
    "representante_legal_firmante.nombre_completo": "Nombre del representante legal",
    "representante_legal_firmante.dni": "DNI/NIE del representante legal",
}


def validate_kyc(datos: dict) -> list[str]:
    """Return list of human-readable labels for missing required fields."""
    missing: list[str] = []
    for campo in CAMPOS_REQUERIDOS:
        val: Any = datos
        for part in campo.split("."):
            if isinstance(val, dict):
                val = val.get(part)
            else:
                val = None
                break
        if not val:
            missing.append(LABELS_CAMPOS.get(campo, campo))
    return missing
