"""
Adapter: convierte JSON de extract.py (espanol/snake_case) 
al contrato Invoice acordado (ingles/camelCase).
Aplica regla IGV determinista para facturas de Pewrú
"""

# para gonza 

from src.schema import Invoice, Item, Party

def _num(v):
    """Convierte string o número a float. None si no se puede."""
    if v is None:
        return None
    try:
        return float(str(v).replace(",", "").replace(" ", ""))
    except (TypeError, ValueError):
        return None

def normalize_invoice(raw: dict, source_file: str = "", model: str = "") -> Invoice:
    """
    Entrada: JSON crudo de extract.py (campos en español)
    Salida: Invoice validada con contrato acordado
    
    Regla IGV: si Σ(cant×precio) cierra contra el TOTAL (no subtotal),
    los precios vinieron CON IGV → dividir entre 1.18
    """
    emisor = raw.get("emisor") or {}
    cliente = raw.get("cliente") or {}
    totales = raw.get("totales") or {}
    
    # Validacion critica: RUC del emisor
    ruc_emisor = (emisor.get("ruc") or "").strip()
    if not ruc_emisor:
        raise ValueError("EXTRACTION_ERROR: ruc_emisor ausente")
    
    # Extraer items
    items = []
    for it in (raw.get("items") or []):
        q = _num(it.get("cantidad"))
        p = _num(it.get("precio_unitario"))
        if q is None or p is None:
            continue  # saltar items con datos faltantes
        items.append(Item(
            code=it.get("codigo"),
            description=(it.get("descripcion") or "SIN_DESCRIPCION").strip(),
            quantity=q,
            unitPrice=p
        ))
    
    if not items:
        raise ValueError("EXTRACTION_ERROR: no se extrajeron items válidos")
    
    # Valores monetarios
    subtotal = _num(totales.get("subtotal")) or 0.0
    tax = _num(totales.get("igv")) or 0.0
    total = _num(totales.get("total")) or 0.0
    
    # REGLA IGV determinista:
    # Si suma(cant×precio) cierra contra TOTAL (no subtotal), 
    # los precios vinieron CON IGV → dividir entre 1.18

    suma_items = sum(i.quantity * i.unitPrice for i in items)
    n = max(len(items), 1)
    tolerancia = 0.02 * n
    
    if subtotal and suma_items:
        cierra_con_subtotal = abs(suma_items - subtotal) <= tolerancia
        cierra_con_total = abs(suma_items - total) <= tolerancia
        
        if not cierra_con_subtotal and cierra_con_total:
            # Precios con IGV → normalizar a sin IGV
            for i in items:
                i.unitPrice = round(i.unitPrice / 1.18, 4)
            # Recalcular suma
            suma_items = sum(i.quantity * i.unitPrice for i in items)
    
    # Construir Invoice

    serie = raw.get("serie") or ""
    numero = raw.get("numero") or ""
    invoice_number = f"{serie}-{numero}".strip("-") or "SIN_NUMERO"
    
    return Invoice(
        invoiceNumber=invoice_number,
        supplier=Party(
            ruc=ruc_emisor,
            name=(emisor.get("razon_social") or "SIN_NOMBRE").strip()
        ),
        payer=Party(
            ruc=(cliente.get("ruc") or "00000000000").strip(),
            name=(cliente.get("razon_social") or "SIN_NOMBRE").strip()
        ),
        date=raw.get("fecha_emision") or "",
        currency=(raw.get("moneda") or "PEN").upper(),
        items=items,
        subtotal=subtotal,
        tax=tax,
        total=total
    )