from fastapi import FastAPI

app = FastAPI(title="KHIPU")

@app.get("/health")
def health():
    return {"status": "ok"}