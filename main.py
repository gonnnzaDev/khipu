from fastapi import FastAPI
from fastapi import APIRouter, UploadFile, File
import shutil, tempfile
from pathlib import Path

from src.pay.pay import PayRequest, create_payment_response

app = FastAPI(title="KHIPU")

@app.post("/subir-archivo")
async def archivo_post(file: UploadFile = File(...)):
    try:
        
        dest = Path("data/private/invoices") / file.filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("wb") as out:
            shutil.copyfileobj(file.file, out)

        #devueolve el path para despues eliminarlo 
        return {"path": str(dest)} 
    
    except Exception as e: 
        return {
        "mensaje": e
    }

@app.delete("/eliminar-archivo")
async def archivo_delete(path: str):
    Path(path).unlink(missing_ok=True)
    return {"ok": True}


@app.post("/pay")
async def pay(request: PayRequest):
    return create_payment_response(request)

