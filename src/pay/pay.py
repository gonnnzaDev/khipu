import re
import json
import subprocess
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Literal

from src.pay.wdk_adapter import EVM_NETWORKS, build_wdk_payload


WDK_RUNNER = Path(__file__).with_name("wdk_runner.js")


PaymentDecision = Literal["GREEN", "YELLOW", "RED", "APPROVED"]
PaymentToken = Literal["USDT", "USDT0"]


@dataclass
class PayRequest:
    invoice_id: str | None = None
    status: PaymentDecision = "GREEN"
    amount: Decimal = Decimal("0")
    token: PaymentToken = "USDT"
    network: str = "sepolia"
    recipient: str = ""
    confirm: bool = False
    override_reason: str | None = None
    token_address: str | None = None

    def __post_init__(self):
        self.amount = Decimal(str(self.amount))


def create_payment_response(payment: PayRequest):
    validation_error = _validate_payment_fields(payment)
    if validation_error:
        return _response("PAYMENT_INVALID", False, payment, validation_error)

    if payment.status == "RED":
        return _response("PAYMENT_BLOCKED", False, payment, "RED reconciliation status blocks payment.")

    if payment.status == "YELLOW" and not payment.override_reason:
        return _response("REVIEW_REQUIRED", False, payment, "YELLOW status requires an override reason before payment.")

    try:
        wdk_payload = build_wdk_payload(payment, "send" if payment.confirm else "preview")
    except ValueError as error:
        return _response("PAYMENT_INVALID", False, payment, str(error))

    if not payment.confirm:
        return _response("PAYMENT_PREVIEW", True, payment, None, wdk_payload)

    return _response_from_wdk_runner(payment, wdk_payload)


def _validate_payment_fields(payment: PayRequest):
    network = payment.network.lower()

    if payment.status not in {"GREEN", "YELLOW", "RED", "APPROVED"}:
        return f"Unsupported payment status: {payment.status}."

    if payment.token.upper() not in {"USDT", "USDT0"}:
        return f"Unsupported token: {payment.token}."

    if payment.amount <= 0:
        return "Amount must be greater than zero."

    if network not in EVM_NETWORKS:
        return f"Unsupported network: {payment.network}."

    if not _is_valid_evm_address(payment.recipient):
        return "Recipient must be a valid non-zero EVM address."

    if payment.token_address and not _is_valid_evm_address(payment.token_address):
        return "Token address must be a valid non-zero EVM address."

    return None


def _is_valid_evm_address(address):
    if not isinstance(address, str):
        return False
    if not re.fullmatch(r"0x[a-fA-F0-9]{40}", address):
        return False
    return int(address[2:], 16) != 0


def _response(payment_status, allowed, payment, reason=None, wdk_payload=None):
    return {
        "payment_status": payment_status,
        "allowed": allowed,
        "reason": reason,
        "invoice_id": payment.invoice_id,
        "network": payment.network.lower(),
        "token": payment.token.upper(),
        "amount": str(payment.amount),
        "recipient": payment.recipient,
        "tx_hash": None,
        "wdk_payload": wdk_payload,
    }


def _response_from_wdk_runner(payment, wdk_payload):
    try:
        result = subprocess.run(
            ["node", str(WDK_RUNNER)],
            input=json.dumps(wdk_payload),
            text=True,
            capture_output=True,
            check=False,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return _response("WDK_RUNNER_ERROR", False, payment, str(error), wdk_payload)

    if result.returncode != 0:
        return _response("WDK_RUNNER_ERROR", False, payment, result.stderr.strip() or result.stdout.strip(), wdk_payload)

    try:
        runner_response = json.loads(result.stdout)
    except json.JSONDecodeError:
        return _response("WDK_RUNNER_ERROR", False, payment, "WDK runner returned invalid JSON.", wdk_payload)

    response = _response(
        runner_response.get("payment_status", "WDK_RUNNER_ERROR"),
        bool(runner_response.get("ok")),
        payment,
        runner_response.get("reason"),
        wdk_payload,
    )
    response["tx_hash"] = runner_response.get("tx_hash")
    response["wdk_result"] = runner_response
    return response
