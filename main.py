from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from src.pay.pay import PayRequest, create_payment_response

app = FastAPI(title="KHIPU")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
