from src.pay.pay import PayRequest, create_payment_response

RECIPIENT = "0x1111111111111111111111111111111111111111"
TOKEN_ADDRESS = "0x2222222222222222222222222222222222222222"


def payment_payload(**overrides):
    payload = {
        "invoice_id": "demo-green-001",
        "status": "GREEN",
        "amount": "10.50",
        "token": "USDT",
        "network": "sepolia",
        "recipient": RECIPIENT,
        "confirm": False,
        "token_address": TOKEN_ADDRESS,
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
        "network": "sepolia",
        "chainId": 11155111,
        "rpcEnv": "WDK_SEPOLIA_RPC_URL",
        "token": "USDT",
        "tokenAddress": TOKEN_ADDRESS,
        "recipient": RECIPIENT,
        "amount": "10500000",
        "amountDecimal": "10.50",
        "decimals": 6,
        "invoiceId": "demo-green-001",
    }


def test_pay_red_blocks_payment():
    data = create_payment_response(PayRequest(**payment_payload(status="RED")))

    assert data["payment_status"] == "PAYMENT_BLOCKED"
    assert data["allowed"] is False
    assert data["wdk_payload"] is None


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


def test_pay_rejects_invalid_recipient():
    data = create_payment_response(PayRequest(**payment_payload(recipient="0x0")))

    assert data["payment_status"] == "PAYMENT_INVALID"
    assert data["allowed"] is False
