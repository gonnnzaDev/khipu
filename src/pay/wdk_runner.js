#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import WalletManagerTron from '@tetherto/wdk-wallet-tron'
import WalletManagerSolana from '@tetherto/wdk-wallet-solana'

const DEFAULT_RPC = {
  ethereum: 'https://eth.drpc.org',
  tron: 'https://api.trongrid.io',
  solana: 'https://api.mainnet-beta.solana.com',
}

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload, bigintReplacer)}\n`)
}

function bigintReplacer(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value
}

function requireSeedPhrase() {
  const seedPhrase = process.env.WDK_SEED_PHRASE?.trim()
  if (!seedPhrase) {
    throw new Error('WDK_SEED_PHRASE no está configurada. Definila en .env para usar la wallet WDK.')
  }
  return seedPhrase
}

function rpcFor(network) {
  const envName = `WDK_${network.toUpperCase()}_RPC_URL`
  return process.env[envName] || DEFAULT_RPC[network]
}

function registerNetwork(wdk, network) {
  if (network === 'ethereum') {
    return wdk.registerWallet('ethereum', WalletManagerEvm, {
      provider: rpcFor('ethereum'),
      chainId: 1,
    })
  }
  if (network === 'tron') {
    return wdk.registerWallet('tron', WalletManagerTron, {
      provider: rpcFor('tron'),
    })
  }
  if (network === 'solana') {
    return wdk.registerWallet('solana', WalletManagerSolana, {
      provider: rpcFor('solana'),
    })
  }
  throw new Error(`Unsupported WDK network: ${network}`)
}

function transferOptions(payload) {
  return {
    token: payload.tokenAddress,
    recipient: payload.recipient,
    amount: BigInt(payload.amount),
  }
}

function normalizeTransferResult(result) {
  return {
    hash: result?.hash ?? result?.txHash ?? result?.signature ?? null,
    fee: result?.fee ?? null,
    raw: result ?? null,
  }
}

function networkGasToken(network) {
  if (network === 'ethereum') return 'ETH'
  if (network === 'tron') return 'TRX'
  if (network === 'solana') return 'SOL'
  return 'native gas token'
}

async function getBalances(account, payload) {
  const tokenBalance = await account.getTokenBalance(payload.tokenAddress)
  const nativeBalance = await account.getBalance()

  return {
    token_balance: tokenBalance,
    native_balance: nativeBalance,
  }
}

async function validateBalances(account, payload) {
  const balances = await getBalances(account, payload)
  const amount = BigInt(payload.amount)

  if (balances.token_balance < amount) {
    return {
      ok: false,
      payment_status: 'WDK_INSUFFICIENT_TOKEN_BALANCE',
      reason: `La wallet WDK no tiene suficiente ${payload.token}. Balance: ${balances.token_balance}; requerido: ${amount}.`,
      balances,
    }
  }

  if (payload.action === 'send' && balances.native_balance === 0n) {
    return {
      ok: false,
      payment_status: 'WDK_INSUFFICIENT_GAS_BALANCE',
      reason: `La wallet WDK necesita ${networkGasToken(payload.network)} para pagar gas.`,
      balances,
    }
  }

  return { ok: true, balances }
}

loadDotEnv()

let account
let wdk

try {
  const payload = JSON.parse(await readStdin())
  if (!['preview', 'send'].includes(payload.action)) {
    respond({
      ok: false,
      payment_status: 'WDK_INVALID_ACTION',
      reason: 'wdk_runner.js only supports preview and send actions.',
      tx_hash: null,
    })
    process.exit(0)
  }

  const seedPhrase = requireSeedPhrase()
  const accountIndex = Number(process.env.WDK_ACCOUNT_INDEX ?? 0)
  wdk = registerNetwork(new WDK(seedPhrase), payload.network)
  account = await wdk.getAccount(payload.network, accountIndex)
  const sourceAddress = await account.getAddress()
  const options = transferOptions(payload)
  const balanceCheck = await validateBalances(account, payload)

  if (!balanceCheck.ok) {
    respond({
      ok: false,
      payment_status: balanceCheck.payment_status,
      reason: balanceCheck.reason,
      tx_hash: null,
      source_address: sourceAddress,
      balances: balanceCheck.balances,
    })
    process.exit(0)
  }

  if (payload.action === 'preview') {
    const quote = await account.quoteTransfer(options)
    respond({
      ok: true,
      payment_status: 'PAYMENT_PREVIEW',
      reason: null,
      tx_hash: null,
      source_address: sourceAddress,
      balances: balanceCheck.balances,
      fee: quote?.fee ?? null,
      quote,
    })
    process.exit(0)
  }

  const transfer = normalizeTransferResult(await account.transfer(options))
  respond({
    ok: Boolean(transfer.hash),
    payment_status: transfer.hash ? 'PAYMENT_SENT' : 'WDK_SEND_NO_HASH',
    reason: transfer.hash ? null : 'WDK transfer completed without returning a transaction hash.',
    tx_hash: transfer.hash,
    source_address: sourceAddress,
    balances: balanceCheck.balances,
    fee: transfer.fee,
    wdk_transfer: transfer.raw,
  })
} catch (error) {
  respond({
    ok: false,
    payment_status: 'WDK_RUNNER_ERROR',
    reason: error instanceof Error ? error.message : String(error),
    tx_hash: null,
  })
} finally {
  account?.dispose?.()
  wdk?.dispose?.()
}
