import re
import unicodedata
from decimal import Decimal, InvalidOperation

from src.score.score import FAIL, PASS, REVIEW, calculate_score, recommendation_from_status, status_from_score

LINE_TOLERANCE = Decimal("0.02")
TOTAL_TOLERANCE = Decimal("0.01")
PRICE_PASS_TOLERANCE = Decimal("0.02")
PRICE_REVIEW_TOLERANCE = Decimal("0.10")


def reconcile(invoice, oc, guide, processed_invoices=None, ocr_confidence=None):
    processed_invoices = processed_invoices or []

    checks = [
        _check_supplier_match(invoice, oc),
        _check_quantity_match(invoice, oc),
        _check_price_match(invoice, oc),
        _check_subtotal_math(invoice),
        _check_total_math(invoice),
        _check_duplicate_invoice(invoice, processed_invoices),
        _check_delivery_match(invoice, guide),
    ]

    score = calculate_score(checks, ocr_confidence=ocr_confidence)
    status = status_from_score(score)
    discrepancies = [check["detail"] for check in checks if check["status"] != PASS]
    risk_flags = [check["id"] for check in checks if check["status"] == FAIL]

    return {
        "score": score,
        "status": status,
        "checks": checks,
        "discrepancies": discrepancies,
        "risk_flags": risk_flags,
        "recommendation": recommendation_from_status(status),
    }


def _check_supplier_match(invoice, oc):
    invoice_ruc = _get(invoice, "emisor.ruc") or _get(invoice, "supplier.ruc")
    oc_ruc = _get(oc, "supplier.ruc")

    if not invoice_ruc or not oc_ruc:
        return _check("supplier_match", FAIL, "Campo crítico ausente: RUC de emisor o proveedor OC.")

    if str(invoice_ruc).strip() == str(oc_ruc).strip():
        return _check("supplier_match", PASS, "Proveedor coincide por RUC.")

    return _check("supplier_match", FAIL, f"Proveedor distinto: factura RUC {invoice_ruc}, OC RUC {oc_ruc}.")


def _check_quantity_match(invoice, oc):
    invoice_items, oc_items = _matched_items(invoice, oc)
    if not invoice_items:
        return _check("quantity_match", FAIL, "Campo crítico ausente: factura sin items.")
    if not oc_items:
        return _check("quantity_match", FAIL, "Campo crítico ausente: OC sin items.")

    for invoice_item, oc_item in invoice_items:
        invoice_qty = _number(invoice_item.get("cantidad") or invoice_item.get("quantity"))
        oc_qty = _number(oc_item.get("quantity") or oc_item.get("cantidad"))
        if invoice_qty is None or oc_qty is None:
            return _check("quantity_match", FAIL, "Campo crítico ausente: cantidad de factura u OC.")
        if invoice_qty > oc_qty + LINE_TOLERANCE:
            detail = f"Se facturan {_format_number(invoice_qty)}, OC autoriza {_format_number(oc_qty)}."
            return _check("quantity_match", FAIL, detail)

    return _check("quantity_match", PASS, "Cantidad facturada compatible con OC.")


def _check_price_match(invoice, oc):
    invoice_items, oc_items = _matched_items(invoice, oc)
    if not invoice_items or not oc_items:
        return _check("price_match", FAIL, "No se pudo comparar precios porque faltan items.")

    worst_status = PASS
    worst_detail = "Precio unitario dentro de tolerancia de OC."

    for invoice_item, oc_item in invoice_items:
        invoice_price = _number(invoice_item.get("precio_unitario") or invoice_item.get("unitPrice") or invoice_item.get("unit_price"))
        oc_price = _number(oc_item.get("unitPrice") or oc_item.get("precio_unitario") or oc_item.get("unit_price"))
        if invoice_price is None or oc_price is None:
            return _check("price_match", FAIL, "Campo crítico ausente: precio unitario de factura u OC.")
        if oc_price == 0:
            return _check("price_match", FAIL, "Precio OC no puede ser cero para comparar tolerancia.")

        diff = abs(invoice_price - oc_price) / abs(oc_price)
        if diff > PRICE_REVIEW_TOLERANCE:
            detail = f"Precio fuera de tolerancia: factura {_format_number(invoice_price)}, OC {_format_number(oc_price)} ({_format_percent(diff)})."
            return _check("price_match", FAIL, detail)
        if diff > PRICE_PASS_TOLERANCE:
            worst_status = REVIEW
            worst_detail = f"Precio requiere revisión: factura {_format_number(invoice_price)}, OC {_format_number(oc_price)} ({_format_percent(diff)})."

    return _check("price_match", worst_status, worst_detail)


def _check_subtotal_math(invoice):
    items = invoice.get("items") or []
    if not items:
        return _check("subtotal_math", FAIL, "Campo crítico ausente: factura sin items para subtotal.")

    calculated = Decimal("0")
    for item in items:
        quantity = _number(item.get("cantidad") or item.get("quantity"))
        price = _number(item.get("precio_unitario") or item.get("unitPrice") or item.get("unit_price"))
        if quantity is None or price is None:
            return _check("subtotal_math", FAIL, "Campo crítico ausente: cantidad o precio para calcular subtotal.")
        calculated += quantity * price

    subtotal = _number(_get(invoice, "totales.subtotal") or invoice.get("subtotal"))
    if subtotal is None:
        return _check("subtotal_math", FAIL, "Campo crítico ausente: subtotal de factura.")

    if abs(calculated - subtotal) <= LINE_TOLERANCE:
        return _check("subtotal_math", PASS, "Subtotal coincide con suma de líneas.")

    detail = f"Subtotal no cuadra: líneas {_format_number(calculated)}, factura {_format_number(subtotal)}."
    return _check("subtotal_math", FAIL, detail)


def _check_total_math(invoice):
    subtotal = _number(_get(invoice, "totales.subtotal") or invoice.get("subtotal"))
    tax = _number(_get(invoice, "totales.igv") or _get(invoice, "totales.tax") or invoice.get("tax"))
    total = _number(_get(invoice, "totales.total") or invoice.get("total"))

    if subtotal is None or tax is None or total is None:
        return _check("total_math", FAIL, "Campo crítico ausente: subtotal, impuesto o total.")

    calculated = subtotal + tax
    if abs(calculated - total) <= TOTAL_TOLERANCE:
        return _check("total_math", PASS, "Total coincide con subtotal más impuesto.")

    detail = f"Total no cuadra: subtotal + impuesto = {_format_number(calculated)}, factura {_format_number(total)}."
    return _check("total_math", FAIL, detail)


def _check_duplicate_invoice(invoice, processed_invoices):
    supplier_ruc = _get(invoice, "emisor.ruc") or _get(invoice, "supplier.ruc")
    invoice_number = invoice.get("numero") or invoice.get("invoiceNumber") or invoice.get("invoice_number")

    if not supplier_ruc or not invoice_number:
        return _check("duplicate_invoice", FAIL, "Campo crítico ausente: proveedor o número de factura.")

    current_key = _invoice_key(supplier_ruc, invoice_number)
    processed_keys = {_processed_invoice_key(item) for item in processed_invoices}
    if current_key in processed_keys:
        return _check("duplicate_invoice", FAIL, f"Factura duplicada: proveedor {supplier_ruc}, número {invoice_number}.")

    return _check("duplicate_invoice", PASS, "Factura no aparece como procesada previamente.")


def _check_delivery_match(invoice, guide):
    invoice_items, guide_items = _matched_items(invoice, guide, guide=True)
    if not invoice_items:
        return _check("delivery_match", FAIL, "Campo crítico ausente: factura sin items.")
    if not guide_items:
        return _check("delivery_match", FAIL, "Campo crítico ausente: guía sin items.")

    for invoice_item, guide_item in invoice_items:
        invoice_qty = _number(invoice_item.get("cantidad") or invoice_item.get("quantity"))
        received_qty = _number(guide_item.get("receivedQty") or guide_item.get("delivered_quantity") or guide_item.get("quantity"))
        if invoice_qty is None or received_qty is None:
            return _check("delivery_match", FAIL, "Campo crítico ausente: cantidad facturada o recibida.")
        if received_qty + LINE_TOLERANCE < invoice_qty:
            detail = f"Guía respalda {_format_number(received_qty)}, factura cobra {_format_number(invoice_qty)}."
            return _check("delivery_match", FAIL, detail)

    return _check("delivery_match", PASS, "Guía respalda la cantidad facturada.")


def _matched_items(invoice, other_document, guide=False):
    invoice_items = invoice.get("items") or []
    other_items = other_document.get("items") or []
    other_index = {_item_key(item): item for item in other_items if _item_key(item)}
    matches = []

    for invoice_item in invoice_items:
        key = _item_key(invoice_item)
        match = other_index.get(key)
        if match is None:
            match = _find_by_description(invoice_item, other_items)
        if match is None and len(invoice_items) == 1 and len(other_items) == 1:
            match = other_items[0]
        if match is not None:
            matches.append((invoice_item, match))

    return matches, other_items


def _find_by_description(invoice_item, items):
    invoice_description = _normalize_text(invoice_item.get("descripcion") or invoice_item.get("description"))
    if not invoice_description:
        return None

    for item in items:
        description = _normalize_text(item.get("description") or item.get("descripcion"))
        if description and (description == invoice_description or description in invoice_description or invoice_description in description):
            return item
    return None


def _item_key(item):
    code = item.get("codigo") or item.get("code")
    if code:
        return f"code:{_normalize_text(code)}"
    description = item.get("descripcion") or item.get("description")
    if description:
        return f"description:{_normalize_text(description)}"
    return None


def _processed_invoice_key(item):
    if isinstance(item, str):
        return _normalize_text(item)
    supplier_ruc = _get(item, "emisor.ruc") or _get(item, "supplier.ruc") or item.get("supplier_ruc")
    invoice_number = item.get("numero") or item.get("invoiceNumber") or item.get("invoice_number")
    return _invoice_key(supplier_ruc, invoice_number)


def _invoice_key(supplier_ruc, invoice_number):
    return _normalize_text(f"{supplier_ruc}:{invoice_number}")


def _get(data, path):
    current = data
    for key in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(key)
        if current is None:
            return None
    return current


def _number(value):
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    cleaned = str(value).strip().replace(" ", "")
    if cleaned.count(",") == 1 and cleaned.count(".") == 0:
        cleaned = cleaned.replace(",", ".")
    else:
        cleaned = cleaned.replace(",", "")
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None


def _normalize_text(value):
    if value is None:
        return ""
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).strip().lower()
    return re.sub(r"\s+", " ", text)


def _format_number(value):
    return format(value.quantize(Decimal("0.01")), "f")


def _format_percent(value):
    return f"{(value * 100).quantize(Decimal('0.01'))}%"


def _check(check_id, status, detail):
    return {"id": check_id, "status": status, "detail": detail}
