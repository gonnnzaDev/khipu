import pytest

TestClient = pytest.importorskip("fastapi.testclient").TestClient

from main import app


def test_validate_rejects_invalid_oc_json():
    client = TestClient(app)

    response = client.post(
        "/validate",
        files={
            "invoice": ("F003-5551.png", b"fake-image", "image/png"),
            "oc": ("oc.json", b"{invalid", "application/json"),
            "guide": ("guide.json", b"{}", "application/json"),
        },
    )

    assert response.status_code == 422
    assert "OC JSON inv\u00e1lido" in response.json()["detail"]
