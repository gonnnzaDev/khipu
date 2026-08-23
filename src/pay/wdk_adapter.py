from decimal import Decimal


USDT_DECIMALS = 6

TOKEN_ADDRESSES = {
    "ethereum": {
        "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    "tron": {
        "USDT": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    },
    "solana": {
        "USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    },
}

NETWORKS = {
    "ethereum": {"chain": "evm", "chain_id": 1, "rpc_env": "WDK_ETHEREUM_RPC_URL"},
    "tron": {"chain": "tron", "rpc_env": "WDK_TRON_RPC_URL"},
    "solana": {"chain": "solana", "rpc_env": "WDK_SOLANA_RPC_URL"},
}


def build_wdk_payload(payment, action):
    network = payment.network.lower()
    token = payment.token.upper()
    network_config = NETWORKS[network]
    token_address = payment.token_address or TOKEN_ADDRESSES.get(network, {}).get(token)

    if token_address is None:
        raise ValueError(f"Token address is required for {token} on {network}.")

    payload = {
        "action": action,
        "chain": network_config["chain"],
        "network": network,
        "rpcEnv": network_config["rpc_env"],
        "token": token,
        "tokenAddress": token_address,
        "recipient": payment.recipient,
        "amount": decimal_to_base_units(payment.amount, USDT_DECIMALS),
        "amountDecimal": str(payment.amount),
        "decimals": USDT_DECIMALS,
        "invoiceId": payment.invoice_id,
    }

    if "chain_id" in network_config:
        payload["chainId"] = network_config["chain_id"]

    return payload


def decimal_to_base_units(amount, decimals):
    multiplier = Decimal(10) ** decimals
    scaled = amount * multiplier

    if scaled != scaled.to_integral_value():
        raise ValueError(f"Amount has more than {decimals} decimal places.")

    return str(int(scaled))
