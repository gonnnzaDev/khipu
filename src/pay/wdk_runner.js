#!/usr/bin/env node

async function readStdin() {
  const chunks = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

try {
  const input = await readStdin()
  const payload = JSON.parse(input)

  if (payload.action !== 'send') {
    respond({
      ok: false,
      payment_status: 'WDK_INVALID_ACTION',
      reason: 'wdk_runner.js only executes confirmed send actions.'
    })
    process.exit(0)
  }

  respond({
    ok: false,
    payment_status: 'WDK_SEND_NOT_CONFIGURED',
    reason: 'WDK packages and wallet configuration are not wired yet; payment was not sent.',
    tx_hash: null,
    received: {
      network: payload.network,
      chainId: payload.chainId,
      token: payload.token,
      tokenAddress: payload.tokenAddress,
      recipient: payload.recipient,
      amount: payload.amount,
      invoiceId: payload.invoiceId
    }
  })
} catch (error) {
  respond({
    ok: false,
    payment_status: 'WDK_RUNNER_ERROR',
    reason: error instanceof Error ? error.message : String(error),
    tx_hash: null
  })
  process.exit(0)
}
