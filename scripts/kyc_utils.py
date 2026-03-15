"""KYC storage and validation utilities."""

import json
import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
KYC_OUTPUT_DIR = BASE_DIR / "output" / "kyc"

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


def guardar_kyc(datos: dict, nombre: str) -> Path:
    """Save KYC JSON to output/kyc/{nombre_safe}_{timestamp}.json."""
    KYC_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    nombre_safe = nombre.strip().replace(" ", "_").upper()
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{nombre_safe}_{timestamp}.json"
    path = KYC_OUTPUT_DIR / filename

    payload = {
        "metadata": {
            "fecha_registro": str(datetime.date.today()),
            "timestamp": timestamp,
            "version": "1.0",
        },
        **datos,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return path


def validar_kyc(datos: dict) -> list[str]:
    """Return list of human-readable labels for missing required fields."""
    missing = []
    for campo in CAMPOS_REQUERIDOS:
        parts = campo.split(".")
        val = datos
        for p in parts:
            if isinstance(val, dict):
                val = val.get(p)
            else:
                val = None
                break
        if not val:
            missing.append(LABELS_CAMPOS.get(campo, campo))
    return missing
