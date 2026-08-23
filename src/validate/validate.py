import json, uuid, time
from json import JSONDecodeError
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from src.normalize.normalize import normalize_invoice

MODEL_ID = "QWEN3VL_2B_MULTIMODAL_Q4_K"

# FALLBACK de resiliencia (SOLO si QVAC no disponible; nunca camino de demo)
GROUND_TRUTH = {
    "F001-00002289": {
        "serie": "F001", "numero": "00002289",
        "emisor": {"razon_social": "Aquiva Publicidad", "ruc": "20609436451", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-07-01", "moneda": "PEN",
        "items": [{"descripcion": "4 LOGOS PUERTAS Y 4 ROMBOS", "cantidad": 1, "precio_unitario": 118.64}],
        "totales": {"subtotal": 118.64, "igv": 21.36, "total": 140.0}
    },
    "F003-5551": {
        "serie": "F003", "numero": "5551",
        "emisor": {"razon_social": "maxtire S.A.C", "ruc": "20610743464", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-06-05", "moneda": "USD",
        "items": [{"descripcion": "445/65R22.5 20PR CHAO YANG EZ334 TL", "cantidad": 2, "precio_unitario": 300.85}],
        "totales": {"subtotal": 601.69, "igv": 108.31, "total": 710.0}
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
    },
    "FP01-00236208": {
        "serie": "FP01", "numero": "00236208",
        "emisor": {"razon_social": "SERVICENTRO PASAMAYO S.A.C", "ruc": "20510422121", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-07-12", "moneda": "PEN",
        "items": [{"descripcion": "DB5", "cantidad": 137.697, "precio_unitario": 17.661}],
        "totales": {"subtotal": 2431.87, "igv": 437.74, "total": 2869.61}
    },
    "FP01-00235556": {
        "serie": "FP01", "numero": "00235556",
        "emisor": {"razon_social": "SERVICENTRO PASAMAYO S.A.C", "ruc": "20510422121", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-07-15", "moneda": "PEN",
        "items": [{"descripcion": "DB5", "cantidad": 127.34717, "precio_unitario": 16.8136}],
        "totales": {"subtotal": 2141.16, "igv": 385.41, "total": 2526.57}
    },
    "FP02-00157272": {
        "serie": "FP02", "numero": "00157272",
        "emisor": {"razon_social": "SERVICENTRO PASAMAYO S.A.C", "ruc": "20510422121", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-07-23", "moneda": "PEN",
        "items": [{"descripcion": "DB5", "cantidad": 105.54677, "precio_unitario": 17.7966}],
        "totales": {"subtotal": 1878.36, "igv": 338.11, "total": 2216.47}
    },
    "F581-07942046": {
        "serie": "F581", "numero": "07942046",
        "emisor": {"razon_social": "PROVEEDOR RUC 20100041953", "ruc": "20100041953", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-07-17", "moneda": "PEN",
        "items": [{"descripcion": "SERVICIO FACTURADO", "cantidad": 1, "precio_unitario": 50.00}],
        "totales": {"subtotal": 50.00, "igv": 9.00, "total": 59.00}
    },
    "F004-0020066": {
        "serie": "F004", "numero": "0020066",
        "emisor": {"razon_social": "PROVEEDOR RUC 20502797230", "ruc": "20502797230", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-06-26", "moneda": "PEN",
        "items": [{"descripcion": "00301 07018 CORREA DE DISTRIBUCION CONTITECH", "cantidad": 3, "precio_unitario": 75.93}],
        "totales": {"subtotal": 227.79, "igv": 41.00, "total": 268.79}
    },
    "FA10-00000027": {
        "serie": "FA10", "numero": "00000027",
        "emisor": {"razon_social": "PROVEEDOR RUC 20543158033", "ruc": "20543158033", "direccion": ""},
        "cliente": {"razon_social": "ANGELUZ EXPRESS E.I.R.L.", "ruc": "20603012942", "direccion": ""},
        "fecha_emision": "2026-06-26", "moneda": "PEN",
        "items": [{"descripcion": "00301 07018 CORREA DE DISTRIBUCION CONTITECH", "cantidad": 1, "precio_unitario": 110.00}],
        "totales": {"subtotal": 110.00, "igv": 19.80, "total": 129.80}
    }
}

router = APIRouter()

def _detect_invoice_number(filename: str):
    for key in GROUND_TRUTH:
        if key in filename:
            return key
    return None


async def _read_json_upload(upload: UploadFile, label: str):
    try:
        return json.loads(await upload.read())
    except UnicodeDecodeError as error:
        raise HTTPException(422, f"{label} no es UTF-8 válido.") from error
    except JSONDecodeError as error:
        raise HTTPException(
            422,
            f"{label} JSON inválido: {error.msg} en línea {error.lineno}, columna {error.colno}.",
        ) from error

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
    oc_data = await _read_json_upload(oc, "OC")
    guide_data = await _read_json_upload(guide, "Guía")
    (run_dir / "oc.json").write_text(json.dumps(oc_data, ensure_ascii=False))
    (run_dir / "guide.json").write_text(json.dumps(guide_data, ensure_ascii=False))

    # 1) QVAC REAL: OCR + extracción local hacen el trabajo de verdad
    t0 = time.time()
    raw, qvac_error, texto = None, None, ""
    try:
        from src.ocr.ocr import extraer_datos_imagen_ocr
        from src.extract.extract import estructurar_texto_a_json

        texto = await extraer_datos_imagen_ocr(str(img_path))
        (run_dir / "ocr_text.txt").write_text(texto or "")
        for _ in range(3):
            try:
                raw = await estructurar_texto_a_json(str(img_path), texto=texto)
                break
            except Exception:
                continue
        if raw is None:
            qvac_error = "JSON inválido tras 3 intentos"
    except Exception as e:
        qvac_error = str(e)
    latencia = round(time.time() - t0, 1)
    (run_dir / "qvac_meta.json").write_text(json.dumps({
        "model": MODEL_ID, "quant": "Q4_K",
        "latencia_s": latencia, "error": qvac_error}))

    # 2) Fallback SOLO resiliencia, marcado claro (nunca camino de demo)
    if raw is None:
        inv_number = _detect_invoice_number(invoice.filename or "")
        raw = GROUND_TRUTH.get(inv_number)
        if raw is None:
            raise HTTPException(422, f"EXTRACTION_ERROR: QVAC falló ({qvac_error}) y sin fallback.")
        source = "MOCK_FALLBACK_QVAC_NO_DISPONIBLE"
    else:
        source = f"QVAC_{MODEL_ID}"

    (run_dir / "raw_extract.json").write_text(json.dumps(raw, ensure_ascii=False))

    # Normalize
    try:
        factura = normalize_invoice(raw, source_file=invoice.filename or "", model=source)
    except ValueError as e:
        raise HTTPException(422, str(e))

    # Reconcile (Julián)
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
        "source": source,
        "qvac_latencia_s": latencia,
    }
