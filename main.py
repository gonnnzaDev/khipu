from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from src.modules.archivos import guardar
from src.pay.pay import PayRequest, create_payment_response

app = FastAPI(title="KHIPU")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/subir/factura/")
async def subir_factura(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "factura debe ser PNG/JPG/JPEG")
    return guardar(file, "data/private/invoices")

@app.post("/subir/oc/")
async def subir_oc(file: UploadFile = File(...)):
    if not file.filename.endswith(".json"):
        raise HTTPException(400, "OC debe ser .json")
    return guardar(file, "data/private/oc")

@app.post("/subir/guia/")
async def subir_guia(file: UploadFile = File(...)):
    if not file.filename.endswith(".json"):
        raise HTTPException(400, "guía debe ser .json")
    return guardar(file, "data/private/guides")

@app.delete("/eliminar-archivo")
async def archivo_delete(path: str):
    base = Path("data/private").resolve()
    target = (Path(path).resolve() if Path(path).is_absolute() else (base / path).resolve())
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(400, "path fuera de data/private")
    target.unlink(missing_ok=True)
    return {"ok": True}


@app.post("/pay")
async def pay(request: PayRequest):
    return create_payment_response(request)

# ---- REGISTRO DEL ROUTER DE VALIDATE ----
from src.validate.validate import router as validate_router
app.include_router(validate_router)
