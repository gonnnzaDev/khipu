import json
from pathlib import Path

from src.reconcile.reconcile import reconcile

ROOT = Path(__file__).resolve().parents[1]


def load_json(path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def checks_by_id(result):
    return {check["id"]: check for check in result["checks"]}


def aquiva_invoice(total="140.00"):
    return {
        "numero": "FA10-00000027",
        "emisor": {
            "ruc": "20609436451",
            "razon_social": "CORPORACION AQUIVA PUBLICIDAD S.A.C.",
        },
        "moneda": "PEN",
        "items": [
            {
                "descripcion": "4 LOGOS PUERTAS Y 4 ROMBOS",
                "cantidad": 1,
                "precio_unitario": "118.64",
            }
        ],
        "totales": {
            "subtotal": "118.64",
            "igv": "21.36",
            "total": total,
        },
    }


def test_green_aquiva_passes():
    oc = load_json(ROOT / "data/private/oc/oc-aquiva-green.json")
    guide = load_json(ROOT / "data/private/guides/guia-aquiva-green.json")

    result = reconcile(aquiva_invoice(), oc, guide)
    checks = checks_by_id(result)

    assert result["status"] == "GREEN"
    assert result["recommendation"] == "APPROVE"
    assert result["score"] >= 90
    assert checks["supplier_match"]["status"] == "PASS"
    assert checks["quantity_match"]["status"] == "PASS"
    assert checks["price_match"]["status"] == "PASS"
    assert checks["subtotal_math"]["status"] == "PASS"
    assert checks["total_math"]["status"] == "PASS"
    assert checks["delivery_match"]["status"] == "PASS"


def test_pasamayo_quantity_over_oc_is_red():
    oc = load_json(ROOT / "data/private/oc/oc-pasamayo-red.json")
    guide = load_json(ROOT / "data/private/guides/guia-pasamayo-red.json")
    invoice = {
        "numero": "FP01-00236208",
        "emisor": {
            "ruc": "20510422121",
            "razon_social": "SERVICENTRO PASAMAYO S.A.C",
        },
        "moneda": "PEN",
        "items": [
            {
                "descripcion": "DB5",
                "cantidad": 137,
                "precio_unitario": "17.6610",
            }
        ],
        "totales": {
            "subtotal": "2419.56",
            "igv": "435.52",
            "total": "2855.08",
        },
    }

    result = reconcile(invoice, oc, guide)
    checks = checks_by_id(result)

    assert result["status"] == "RED"
    assert result["recommendation"] == "BLOCK"
    assert result["score"] < 70
    assert checks["quantity_match"]["status"] == "FAIL"
    assert "Se facturan 137.00, OC autoriza 100.00" in checks["quantity_match"]["detail"]


def test_total_math_failure_blocks():
    oc = load_json(ROOT / "data/private/oc/oc-aquiva-green.json")
    guide = load_json(ROOT / "data/private/guides/guia-aquiva-green.json")

    result = reconcile(aquiva_invoice(total="150.00"), oc, guide)
    checks = checks_by_id(result)

    assert result["status"] == "RED"
    assert result["recommendation"] == "BLOCK"
    assert result["score"] < 70
    assert checks["total_math"]["status"] == "FAIL"
