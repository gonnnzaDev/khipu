import json, uuid, re
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from src.normalize.normalize import normalize_invoice

# MOCK del ground truth real (9 facturas validadas)
GROUND_TRUTH = {
    "F003-5551": {
        "tipo_comprobante": "FACTURA ELECTRÓNICA",
        "serie": "F003", "numero": "5551",
        "emisor": {"razon_social": "maxtire S.A.C", "ruc": "20610743464", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-06-05",
        "moneda": "USD",
        "items": [{"descripcion": "445/65R22.5 20PR CHAO YANG EZ334 TL", "cantidad": 2, "precio_unitario": 300.85, "descuento": 0, "total": 601.70}],
        "totales": {"subtotal": 601.69, "igv": 108.31, "total": 710.0}
    },
    "F001-00002289": {
        "tipo_comprobante": "FACTURA ELECTRÓNICA",
        "serie": "F001", "numero": "00002289",
        "emisor": {"razon_social": "Aquiva Publicidad", "ruc": "20609436451", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-07-01",
        "moneda": "PEN",
        "items": [{"descripcion": "4 LOGOS PUERTAS Y 4 ROMBOS", "cantidad": 1, "precio_unitario": 118.64, "descuento": 0, "total": 118.64}],
        "totales": {"subtotal": 118.64, "igv": 21.36, "total": 140.0}
    },
    "FP01-00236208": {
        "tipo_comprobante": "FACTURA ELECTRÓNICA",
        "serie": "FP01", "numero": "00236208",
        "emisor": {"razon_social": "SERVICENTRO PASAMAYO S.A.C", "ruc": "20510422121", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-07-12",
        "moneda": "PEN",
        "items": [{"descripcion": "DB5", "cantidad": 137.697, "precio_unitario": 17.661, "descuento": 0, "total": 2431.87}],
        "totales": {"subtotal": 2431.87, "igv": 437.74, "total": 2869.61}
    },

    "F090-127483": {
        "serie": "F090", "numero": "00127483",
        "emisor": {"razon_social": "CONECTA RETAIL S.A.", "ruc": "20141189850", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-07-30", "moneda": "PEN",
        "items": [
            {"descripcion": "Refrigeradora LG DoorCooling 374LT VT38S", "cantidad": 1, "precio_unitario": 1305.77},
            {"descripcion": "HORNO MICROONDAS LG 30LT MH7032JAS", "cantidad": 1, "precio_unitario": 345.08},
            {"descripcion": "INGRESO POR FLETE", "cantidad": 1, "precio_unitario": 57.63}
        ],
        "totales": {"subtotal": 1708.48, "igv": 307.52, "total": 2016.00}
    }
}

router = APIRouter()

def _detect_invoice_number(filename: str) -> str:
    """Extrae el numero de factura del nombre del archivo."""
    # Patrones: F001-00002289.png, FP01-00236208.png, etc.
    m = re.search(r'F\d{2,3}-\d+', filename)
    return m.group(0) if m else None

@router.post("/validate")
async def validate(
    invoice: UploadFile = File(...),
    oc: UploadFile = File(...),
    guide: UploadFile = File(...),
):
    run_id = str(uuid.uuid4())[:8]
    run_dir = Path("runs") / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Evidencia
    img_path = run_dir / (invoice.filename or "invoice.png")
    img_path.write_bytes(await invoice.read())
    oc_data = json.loads(await oc.read())
    guide_data = json.loads(await guide.read())
    (run_dir / "oc.json").write_text(json.dumps(oc_data, ensure_ascii=False))
    (run_dir / "guide.json").write_text(json.dumps(guide_data, ensure_ascii=False))

    # MOCK con ground truth real
    inv_number = _detect_invoice_number(invoice.filename or "")
    raw = GROUND_TRUTH.get(inv_number)
    
    if not raw:
        raise HTTPException(422, f"EXTRACTION_ERROR: factura '{inv_number}' no está en GROUND_TRUTH. Agregar manualmente.")
    
    (run_dir / "raw_extract.json").write_text(json.dumps(raw, ensure_ascii=False))

    # Normalize
    try:
        factura = normalize_invoice(raw, source_file=invoice.filename or "", model="MOCK_GROUND_TRUTH")
    except ValueError as e:
        raise HTTPException(422, str(e))

    # Reconcile (Julian)
    try:
        from src.reconcile.reconcile import reconcile
        
        reconc = reconcile(factura.model_dump(), oc_data, guide_data)
    except Exception as e:
        reconc = {"error": str(e), "status": "ERROR", "score": 0, "recommendation": "BLOCK"}

    (run_dir / "result.json").write_text(json.dumps(reconc, ensure_ascii=False, default=str))
    return {
        "run_id": run_id, 
        "invoice": factura.model_dump(), 
        "reconciliacion": reconc,
        "source": "MOCK_GROUND_TRUTH"
    }