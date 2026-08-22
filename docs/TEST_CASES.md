# Casos de Prueba para Reconcile

## Caso 1: VERDE (AQUIVA)
**Archivos:** `data/fixtures/case-green/`
- Score esperado: 100
- Status: GREEN
- Recommendation: APPROVE
- Todos los checks PASS

## Caso 2: ROJO (PASAMAYO cantidad incorrecta)
**Archivos:** `data/fixtures/case-red/`
- Score esperado: 30
- Status: RED
- Recommendation: BLOCK
- Checks que fallan: quantity_match, delivery_match
- Discrepancia: "Cantidad facturada (137.697) supera OC autorizada (100)"

## Caso 3: AMARILLO (LA CURACAO flete no autorizado)
**JSON a crear en tests:**
```json
// invoice: 3 items (refri + microondas + flete)
{"invoiceNumber": "F090-000127", "supplier": {"ruc": "20600000005", "name": "RETAIL SAC"}, "items": [
  {"description": "Refrigeradora", "quantity": 1, "unitPrice": 1305.77},
  {"description": "Microondas", "quantity": 1, "unitPrice": 345.08},
  {"description": "FLETE", "quantity": 1, "unitPrice": 57.63}
], "subtotal": 1708.48, "tax": 307.52, "total": 2016.00}

// oc: solo 2 items (sin flete)
{"ocNumber": "OC-2026-0003", "items": [
  {"description": "Refrigeradora", "quantity": 1, "unitPrice": 1305.77},
  {"description": "Microondas", "quantity": 1, "unitPrice": 345.08}
]}

// guide: solo 2 items (sin flete)
{"guideNumber": "GR-000003", "items": [
  {"description": "Refrigeradora", "receivedQty": 1},
  {"description": "Microondas", "receivedQty": 1}
]}