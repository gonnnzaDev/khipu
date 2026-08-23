from pathlib import Path
from typing import Any


def create_comprobante_pdf(payload: dict[str, Any], output_path: str | Path = "comprobante.pdf") -> Path:
    """Create a minimal payment receipt PDF with USDT amount and receiver hash."""
    total_usdt = _first_value(payload, "total_usdt", "amount", "amountDecimal", "total")
    receiver_hash = _first_value(payload, "receiver_hash", "recipient", "receiver", "to")

    if total_usdt is None:
        raise ValueError("Missing total USDT amount in payload.")
    if receiver_hash is None:
        raise ValueError("Missing receiver hash in payload.")

    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(_build_pdf_bytes(str(total_usdt), str(receiver_hash)))
    return path


def _first_value(payload: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return value

    wdk_payload = payload.get("wdk_payload")
    if isinstance(wdk_payload, dict):
        for key in keys:
            value = wdk_payload.get(key)
            if value not in (None, ""):
                return value

    return None


def _build_pdf_bytes(total_usdt: str, receiver_hash: str) -> bytes:
    lines = [
        "KHIPU - Comprobante de pago",
        f"Total transferido: {total_usdt} USDT",
        f"Hash receptor: {receiver_hash}",
    ]
    content = "BT\n/F1 18 Tf\n72 760 Td\n"
    for index, line in enumerate(lines):
        if index:
            content += "0 -32 Td\n"
        content += f"({_escape_pdf_text(line)}) Tj\n"
    content += "ET\n"

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(content.encode('latin-1'))} >>\nstream\n{content}endstream".encode("latin-1"),
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


def _escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
