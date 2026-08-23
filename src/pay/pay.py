import re
import json
import subprocess
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Literal

from src.pay.wdk_adapter import NETWORKS, build_wdk_payload


WDK_RUNNER = Path(__file__).with_name("wdk_runner.js")


PaymentDecision = Literal["GREEN", "YELLOW", "RED", "APPROVED"]
PaymentToken = Literal["USDT"]


@dataclass
class PayRequest:
    invoice_id: str | None = None
    status: PaymentDecision = "GREEN"
    amount: Decimal = Decimal("0")
    token: PaymentToken = "USDT"
    network: str = "ethereum"
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

    return _response_from_wdk_runner(payment, wdk_payload)


def _validate_payment_fields(payment: PayRequest):
    network = payment.network.lower()

    if payment.status not in {"GREEN", "YELLOW", "RED", "APPROVED"}:
        return f"Unsupported payment status: {payment.status}."

    if payment.token.upper() != "USDT":
        return f"Unsupported token: {payment.token}."

    if payment.amount <= 0:
        return "Amount must be greater than zero."

    if network not in NETWORKS:
        return f"Unsupported network: {payment.network}."

    address_error = _validate_recipient(payment.recipient, NETWORKS[network]["chain"])
    if address_error:
        return address_error

    token_address_error = _validate_token_address(payment.token_address, NETWORKS[network]["chain"])
    if token_address_error:
        return token_address_error

    return None


def _is_valid_evm_address(address):
    if not isinstance(address, str):
        return False
    if not re.fullmatch(r"0x[a-fA-F0-9]{40}", address):
        return False
    return int(address[2:], 16) != 0


def _validate_recipient(address, chain):
    if chain == "evm" and not _is_valid_evm_address(address):
        return "Recipient must be a valid non-zero EVM address."
    if chain == "tron" and not _is_valid_tron_address(address):
        return "Recipient must be a valid TRON address."
    if chain == "solana" and not _is_valid_solana_address(address):
        return "Recipient must be a valid Solana address."
    return None


def _validate_token_address(address, chain):
    if not address:
        return None
    if chain == "evm" and not _is_valid_evm_address(address):
        return "Token address must be a valid non-zero EVM address."
    if chain == "tron" and not _is_valid_tron_address(address):
        return "Token address must be a valid TRON address."
    if chain == "solana" and not _is_valid_solana_address(address):
        return "Token address must be a valid Solana address."
    return None


def _is_valid_tron_address(address):
    return isinstance(address, str) and re.fullmatch(r"T[1-9A-HJ-NP-Za-km-z]{33}", address) is not None


def _is_valid_solana_address(address):
    return isinstance(address, str) and re.fullmatch(r"[1-9A-HJ-NP-Za-km-z]{32,44}", address) is not None


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
        "wallet_action": _wallet_action(payment_status, allowed, wdk_payload),
    }


def _wallet_action(payment_status, allowed, wdk_payload):
    if not allowed or wdk_payload is None:
        return None

    method = "quoteTransfer" if wdk_payload["action"] == "preview" else "transfer"
    return {
        "type": "OPEN_WALLET_TRANSFER",
        "provider": "WDK",
        "method": method,
        "requires_human_confirmation": True,
        "payment_status": payment_status,
        "payload": wdk_payload,
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
    response["source_address"] = runner_response.get("source_address")
    response["balances"] = runner_response.get("balances")
    response["fee"] = runner_response.get("fee")
    response["quote"] = runner_response.get("quote")
    return response
