from decimal import Decimal


USDT_DECIMALS = 6

TOKEN_ADDRESSES = {
    "arbitrum": {
        "USDT0": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
    "polygon": {
        "USDT0": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
    "plasma": {
        "USDT0": "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    },
}

EVM_NETWORKS = {
    "sepolia": {"chain_id": 11155111, "rpc_env": "WDK_SEPOLIA_RPC_URL"},
    "arbitrum": {"chain_id": 42161, "rpc_env": "WDK_ARBITRUM_RPC_URL"},
    "polygon": {"chain_id": 137, "rpc_env": "WDK_POLYGON_RPC_URL"},
    "plasma": {"chain_id": 9745, "rpc_env": "WDK_PLASMA_RPC_URL"},
}


def build_wdk_payload(payment, action):
    network = payment.network.lower()
    token = payment.token.upper()
    token_address = payment.token_address or TOKEN_ADDRESSES.get(network, {}).get(token)

    if token_address is None:
        raise ValueError(f"Token address is required for {token} on {network}.")

    return {
        "action": action,
        "chain": "evm",
        "network": network,
        "chainId": EVM_NETWORKS[network]["chain_id"],
        "rpcEnv": EVM_NETWORKS[network]["rpc_env"],
        "token": token,
        "tokenAddress": token_address,
        "recipient": payment.recipient,
        "amount": decimal_to_base_units(payment.amount, USDT_DECIMALS),
        "amountDecimal": str(payment.amount),
        "decimals": USDT_DECIMALS,
        "invoiceId": payment.invoice_id,
    }


def decimal_to_base_units(amount, decimals):
    multiplier = Decimal(10) ** decimals
    scaled = amount * multiplier

    if scaled != scaled.to_integral_value():
        raise ValueError(f"Amount has more than {decimals} decimal places.")

    return str(int(scaled))
