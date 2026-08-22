import json
from pathlib import Path

from src.reconcile.reconcile import reconcile

ROOT = Path(__file__).resolve().parents[1]


def load_json(path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def checks_by_id(result):
    return {check["id"]: check for check in result["checks"]}


def load_case(name):
    case_path = ROOT / "data/fixtures" / name
    return (
        load_json(case_path / "invoice.json"),
        load_json(case_path / "oc.json"),
        load_json(case_path / "guide.json"),
    )


def test_green_aquiva_passes():
    invoice, oc, guide = load_case("case-green")

    result = reconcile(invoice, oc, guide)
    checks = checks_by_id(result)

    assert result["status"] == "GREEN"
    assert result["recommendation"] == "APPROVE"
    assert result["score"] == 100
    assert checks["supplier_match"]["status"] == "PASS"
    assert checks["quantity_match"]["status"] == "PASS"
    assert checks["price_match"]["status"] == "PASS"
    assert checks["subtotal_math"]["status"] == "PASS"
    assert checks["total_math"]["status"] == "PASS"
    assert checks["delivery_match"]["status"] == "PASS"


def test_pasamayo_quantity_over_oc_is_red():
    invoice, oc, guide = load_case("case-red")

    result = reconcile(invoice, oc, guide)
    checks = checks_by_id(result)

    assert result["status"] == "RED"
    assert result["recommendation"] == "BLOCK"
    assert result["score"] == 30
    assert checks["quantity_match"]["status"] == "FAIL"
    assert checks["delivery_match"]["status"] == "FAIL"
    assert "Se facturan 137.70, OC autoriza 100.00" in checks["quantity_match"]["detail"]


def test_total_math_failure_blocks():
    invoice, oc, guide = load_case("case-green")
    invoice["total"] = 150

    result = reconcile(invoice, oc, guide)
    checks = checks_by_id(result)

    assert result["status"] == "RED"
    assert result["recommendation"] == "BLOCK"
    assert result["score"] == 69
    assert checks["total_math"]["status"] == "FAIL"
