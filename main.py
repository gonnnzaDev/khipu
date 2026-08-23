from http.client import HTTPException

from fastapi import FastAPI, UploadFile, File
from pathlib import Path
from modules.archivos import guardar
from src.pay.pay import PayRequest, create_payment_response

app = FastAPI(title="KHIPU")

@app.post("/subir/factura/")
async def subir_factura(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
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
    Path(path).unlink(missing_ok=True)
    return {"ok": True}


@app.post("/pay")
async def pay(request: PayRequest):
    return create_payment_response(request)

# ---- REGISTRO DEL ROUTER DE VALIDATE ----
from src.validate import router as validate_router
app.include_router(validate_router)
