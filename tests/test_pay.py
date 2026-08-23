import json
from subprocess import CompletedProcess

import pytest

import src.pay.pay as pay_module
from src.pay.pay import PayRequest, create_payment_response

RECIPIENT = "0x1111111111111111111111111111111111111111"
TOKEN_ADDRESS = "0x2222222222222222222222222222222222222222"
ETHEREUM_USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
SOLANA_USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"


@pytest.fixture(autouse=True)
def mock_wdk_runner(monkeypatch):
    def fake_run(_args, input, **_kwargs):
        payload = json.loads(input)
        if payload["action"] == "send":
            response = {
                "ok": False,
                "payment_status": "WDK_SEND_NOT_CONFIGURED",
                "reason": "WDK packages and wallet configuration are not wired yet; transfer() was not called.",
                "tx_hash": None,
            }
        else:
            response = {
                "ok": True,
                "payment_status": "PAYMENT_PREVIEW",
                "reason": None,
                "tx_hash": None,
                "source_address": "0x3333333333333333333333333333333333333333",
                "fee": "1000",
                "quote": {"fee": "1000"},
            }
        return CompletedProcess(_args, 0, stdout=json.dumps(response), stderr="")

    monkeypatch.setattr(pay_module.subprocess, "run", fake_run)


def payment_payload(**overrides):
    payload = {
        "invoice_id": "demo-green-001",
        "status": "GREEN",
        "amount": "10.50",
        "token": "USDT",
        "network": "ethereum",
        "recipient": RECIPIENT,
        "confirm": False,
    }
    payload.update(overrides)
    return payload


def test_pay_green_returns_wdk_preview_payload():
    data = create_payment_response(PayRequest(**payment_payload()))

    assert data["payment_status"] == "PAYMENT_PREVIEW"
    assert data["allowed"] is True
    assert data["tx_hash"] is None
    assert data["wdk_payload"] == {
        "action": "preview",
        "chain": "evm",
        "network": "ethereum",
        "rpcEnv": "WDK_ETHEREUM_RPC_URL",
        "token": "USDT",
        "tokenAddress": ETHEREUM_USDT,
        "recipient": RECIPIENT,
        "amount": "10500000",
        "amountDecimal": "10.50",
        "decimals": 6,
        "invoiceId": "demo-green-001",
        "chainId": 1,
    }
    assert data["wallet_action"] == {
        "type": "OPEN_WALLET_TRANSFER",
        "provider": "WDK",
        "method": "quoteTransfer",
        "requires_human_confirmation": True,
        "payment_status": "PAYMENT_PREVIEW",
        "payload": data["wdk_payload"],
    }


def test_pay_red_blocks_payment():
    data = create_payment_response(PayRequest(**payment_payload(status="RED")))

    assert data["payment_status"] == "PAYMENT_BLOCKED"
    assert data["allowed"] is False
    assert data["wdk_payload"] is None
    assert data["wallet_action"] is None


def test_pay_yellow_requires_override_reason():
    data = create_payment_response(PayRequest(**payment_payload(status="YELLOW")))

    assert data["payment_status"] == "REVIEW_REQUIRED"
    assert data["allowed"] is False
    assert data["wdk_payload"] is None


def test_pay_yellow_with_override_returns_preview():
    data = create_payment_response(
        PayRequest(**payment_payload(status="YELLOW", override_reason="Approved after manual review."))
    )

    assert data["payment_status"] == "PAYMENT_PREVIEW"
    assert data["allowed"] is True
    assert data["wdk_payload"]["action"] == "preview"


def test_pay_confirmed_send_is_not_configured_yet():
    data = create_payment_response(PayRequest(**payment_payload(confirm=True)))

    assert data["payment_status"] == "WDK_SEND_NOT_CONFIGURED"
    assert data["allowed"] is False
    assert data["tx_hash"] is None
    assert data["wdk_payload"]["action"] == "send"
    assert data["wallet_action"] is None


def test_pay_rejects_invalid_recipient():
    data = create_payment_response(PayRequest(**payment_payload(recipient="0x0")))

    assert data["payment_status"] == "PAYMENT_INVALID"
    assert data["allowed"] is False


def test_pay_rejects_non_mvp_networks():
    data = create_payment_response(PayRequest(**payment_payload(network="arbitrum")))

    assert data["payment_status"] == "PAYMENT_INVALID"
    assert data["allowed"] is False
    assert data["reason"] == "Unsupported network: arbitrum."


def test_pay_rejects_non_mvp_tokens():
    data = create_payment_response(PayRequest(**payment_payload(token="USDT0")))

    assert data["payment_status"] == "PAYMENT_INVALID"
    assert data["allowed"] is False
    assert data["reason"] == "Unsupported token: USDT0."


def test_pay_accepts_explicit_token_address_override():
    data = create_payment_response(PayRequest(**payment_payload(token_address=TOKEN_ADDRESS)))

    assert data["payment_status"] == "PAYMENT_PREVIEW"
    assert data["wdk_payload"]["tokenAddress"] == TOKEN_ADDRESS


def test_pay_tron_returns_realistic_wdk_preview_payload():
    data = create_payment_response(
        PayRequest(**payment_payload(network="tron", recipient=TRON_USDT))
    )

    assert data["payment_status"] == "PAYMENT_PREVIEW"
    assert data["wdk_payload"]["chain"] == "tron"
    assert data["wdk_payload"]["rpcEnv"] == "WDK_TRON_RPC_URL"
    assert data["wdk_payload"]["tokenAddress"] == TRON_USDT
    assert "chainId" not in data["wdk_payload"]


def test_pay_solana_returns_realistic_wdk_preview_payload():
    data = create_payment_response(
        PayRequest(**payment_payload(network="solana", recipient=SOLANA_USDT))
    )

    assert data["payment_status"] == "PAYMENT_PREVIEW"
    assert data["wdk_payload"]["chain"] == "solana"
    assert data["wdk_payload"]["rpcEnv"] == "WDK_SOLANA_RPC_URL"
    assert data["wdk_payload"]["tokenAddress"] == SOLANA_USDT
    assert "chainId" not in data["wdk_payload"]
