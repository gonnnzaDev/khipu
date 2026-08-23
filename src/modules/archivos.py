from pathlib import Path
from fastapi import UploadFile
import shutil, tempfile

def guardar(file: UploadFile, folder: str):
    dest = Path(folder) / file.filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    return {"path": str(dest)}