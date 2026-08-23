import { memo, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header.tsx'
import './Pay.css'

type State = {
  proposal?: string
  wallet?: string
  network?: Network
  amount?: string
  invoiceCurrency?: string
  score?: number
  status?: string
  invoiceId?: string
  riskFlags?: string[]
  recommendation?: string
}

type Network = 'ethereum' | 'tron' | 'solana'

function isValidEvmAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false
  // src/pay/pay.py:88 non-zero check
  try {
    return BigInt(address) !== BigInt(0)
  } catch {
    return false
  }
}

function isValidTronAddress(address: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)
}

function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
}

function isValidRecipient(address: string, network: Network): boolean {
  if (network === 'ethereum') return isValidEvmAddress(address)
  if (network === 'tron') return isValidTronAddress(address)
  return isValidSolanaAddress(address)
}

function recipientHelp(network: Network): string {
  if (network === 'ethereum') return 'Wallet EVM: 0x + 40 hex y no cero'
  if (network === 'tron') return 'Wallet TRON: empieza con T y tiene 34 caracteres base58'
  return 'Wallet Solana: dirección base58 de 32 a 44 caracteres'
}

function recipientPlaceholder(network: Network): string {
  if (network === 'ethereum') return '0x...'
  if (network === 'tron') return 'T...'
  return 'Solana base58...'
}

function Pay() {
  const navigate = useNavigate()
  const location = useLocation() as { state: State | null }
  const proposal = location.state?.proposal ?? null
  const initialWallet = location.state?.wallet ?? ''
  const initialNetwork = location.state?.network ?? 'ethereum'
  const [wallet, setWallet] = useState(initialWallet)
  const [network, setNetwork] = useState<Network>(initialNetwork)
  const [usdtAmount, setUsdtAmount] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any | null>(null)
  const [touchedWallet, setTouchedWallet] = useState(false)

  const parsed = useMemo(() => {
    if (!proposal) return null
    try {
      return JSON.parse(proposal)
    } catch {
      return null
    }
  }, [proposal])

  // extraer datos según nuevo contract Upload.tsx:42 {invoice, reconciliacion}
  const reconciliacion = parsed?.reconciliacion ?? parsed?.reconciliation ?? null
  const invoice = parsed?.invoice ?? null

  const amountStr: string | null = useMemo(() => {
    // prioridad: state.amount -> invoice.total -> totales.total
    const fromState = location.state?.amount
    if (fromState) return String(fromState)
    const v = invoice?.total ?? invoice?.totales?.total ?? parsed?.total ?? parsed?.totales?.total ?? parsed?.amount ?? null
    return v != null ? String(v) : null
  }, [invoice, location.state?.amount, parsed])

  const invoiceCurrency = (location.state?.invoiceCurrency ?? invoice?.currency ?? invoice?.moneda ?? parsed?.currency ?? parsed?.moneda ?? 'USDT').toString().toUpperCase()
  const requiresManualUsdtAmount = invoiceCurrency !== 'USDT'
  const transferAmountStr = requiresManualUsdtAmount ? usdtAmount.trim() : amountStr

  const invoiceId: string | null = useMemo(() => {
    return location.state?.invoiceId ?? invoice?.invoiceNumber ?? invoice?.numero ?? parsed?.invoiceNumber ?? null
  }, [invoice, location.state?.invoiceId, parsed])

  const reconcStatus: string = useMemo(() => {
    // normalizar a GREEN/YELLOW/RED
    const s = (location.state?.status ?? reconciliacion?.status ?? 'GREEN').toString().toUpperCase()
    if (['GREEN', 'YELLOW', 'RED', 'APPROVED'].includes(s)) return s
    // fallback por score si no hay status
    const sc = location.state?.score ?? reconciliacion?.score ?? null
    if (sc !== null) {
      if (sc >= 90) return 'GREEN'
      if (sc >= 70) return 'YELLOW'
      return 'RED'
    }
    return 'GREEN'
  }, [location.state?.status, location.state?.score, reconciliacion])

  const riskFlags: string[] = reconciliacion?.risk_flags ?? reconciliacion?.riskFlags ?? location.state?.riskFlags ?? []
  const score: number | null = location.state?.score ?? reconciliacion?.score ?? null

  const walletValid = isValidRecipient(wallet, network)
  const walletError = touchedWallet && !walletValid ? `Wallet inválida para ${network}: ${recipientHelp(network)}` : null

  const isRed = reconcStatus === 'RED'
  const isYellow = reconcStatus === 'YELLOW'
  const needsOverride = isYellow && overrideReason.trim().length === 0
  const amountNum = transferAmountStr != null ? Number(transferAmountStr) : NaN
  const amountValid = transferAmountStr != null && transferAmountStr !== '' && !isNaN(amountNum) && amountNum > 0

  const canPay = walletValid && amountValid && !isRed && !needsOverride && !paying

  const buildPayload = (confirm: boolean) => ({
    recipient: wallet,
    amount: String(transferAmountStr),
    status: reconcStatus,
    network,
    token: 'USDT',
    confirm,
    invoice_id: invoiceId,
    override_reason: overrideReason.trim() || null,
  })

  const validatePaymentInputs = () => {
    setError(null)
    if (!walletValid) {
      setError(`Recipient inválido para ${network}. ${recipientHelp(network)}.`)
      setTouchedWallet(true)
      return false
    }
    if (!amountValid) {
      setError('Amount must be greater than zero.')
      return false
    }
    if (isRed) {
      setError('RED reconciliation status blocks payment.')
      return false
    }
    if (isYellow && !overrideReason.trim()) {
      setError('YELLOW status requires an override reason before payment.')
      return false
    }
    return true
  }

  const postPayment = async (confirm: boolean) => {
    const res = await fetch('/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(confirm)),
    })

    const data = await res.json().catch(() => ({} as any))
    if (!res.ok) throw new Error(data.reason || data.detail || 'Pago falló')
    if (data.payment_status === 'PAYMENT_INVALID' || data.payment_status === 'PAYMENT_BLOCKED' || data.payment_status === 'REVIEW_REQUIRED' || data.allowed === false) {
      throw new Error(data.reason || data.detail || `Pago no permitido: ${data.payment_status}`)
    }
    return data
  }

  const handlePreview = async () => {
    if (!validatePaymentInputs()) return

    setPaying(true)
    try {
      const data = await postPayment(false)
      setPreview(data)
    } catch (e) {
      setPreview(null)
      setError(e instanceof Error ? e.message : 'Error al cotizar con WDK')
    } finally {
      setPaying(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview) {
      setError('Primero generá un quote WDK.')
      return
    }
    if (!validatePaymentInputs()) return

    setPaying(true)
    try {
      const data = await postPayment(true)
      const hash = data.tx_hash ?? data.hash ?? data.txHash ?? null
      if (!hash) throw new Error(data.reason || 'WDK no devolvió hash de transacción.')
      navigate('/receipt', {
        state: {
          hash,
          receipt: JSON.stringify(data, null, 2),
          paymentStatus: data.payment_status,
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al transferir con WDK')
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <Header />
      <main className="pay-page">
        <div className="pay-page__inner">
          <h1 className="pay-page__title">Previsualizar pago</h1>

          {/* Resumen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '12px 0' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {score !== null && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 800, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: isRed ? '#ef4444' : isYellow ? '#eab308' : '#22c55e' }}>
                  {score}/100 · {reconcStatus}
                </span>
              )}
              {invoiceId && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}>
                  {invoiceId}
                </span>
              )}
            </div>
            {riskFlags.length > 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>Risk: {riskFlags.join(', ')}</div>
            )}
            {isRed && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 14px', borderRadius: 10, textAlign: 'center', maxWidth: 520 }}>
                🔴 Bloqueado por reconciliación RED. No se puede pagar hasta corregir factura/OC/guía.
              </div>
            )}
            {isYellow && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#eab308', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', padding: '10px 14px', borderRadius: 10, textAlign: 'center', maxWidth: 520 }}>
                🟡 Requiere revisión humana. Agregá motivo de override para continuar.
              </div>
            )}
          </div>

          <div className="pay-page__amount">
            <span className="pay-page__amount-label">Monto final</span>
            <span className="pay-page__amount-value">{amountValid ? `${Number(transferAmountStr).toFixed(2)} USDT` : '—'}</span>
            {!amountValid && transferAmountStr !== null && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#ef4444' }}>Monto USDT inválido, debe ser &gt; 0</span>}
            {requiresManualUsdtAmount && amountStr != null && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#eab308', textAlign: 'center' }}>
                Factura original: {Number(amountStr).toFixed(2)} {invoiceCurrency}. Ingresá el monto USDT a transferir; no hay conversión FX automática en el MVP.
              </span>
            )}
          </div>

          {/* Wallet + override */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520, width: '100%', margin: '0 auto' }}>
            {requiresManualUsdtAmount && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Monto USDT a transferir</label>
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={usdtAmount}
                  onChange={(e) => {
                    setUsdtAmount(e.target.value)
                    setPreview(null)
                  }}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1px solid ${!amountValid && usdtAmount ? '#ef4444' : 'var(--border)'}`,
                    background: 'var(--bg-card)',
                    color: 'var(--text-h)',
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Red</label>
              <select
                value={network}
                onChange={(e) => {
                  setNetwork(e.target.value as Network)
                  setTouchedWallet(Boolean(wallet))
                  setPreview(null)
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-h)',
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  outline: 'none',
                }}
              >
                <option value="ethereum">Ethereum</option>
                <option value="tron">TRON</option>
                <option value="solana">Solana</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Enviar a wallet</label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => {
                  setWallet(e.target.value)
                  setTouchedWallet(true)
                  setPreview(null)
                }}
                onBlur={() => setTouchedWallet(true)}
                placeholder={recipientPlaceholder(network)}
                spellCheck={false}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `1px solid ${walletError || (touchedWallet && !walletValid) ? '#ef4444' : 'var(--border)'}`,
                  background: 'var(--bg-card)',
                  color: 'var(--text-h)',
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              {walletError ? (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#ef4444' }}>{walletError}</span>
              ) : (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)' }}>{recipientHelp(network)}</span>
              )}
            </div>

            {isYellow && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Motivo override (requerido para YELLOW)</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => {
                    setOverrideReason(e.target.value)
                    setPreview(null)
                  }}
                  placeholder="Aprobado tras revisión manual porque..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1px solid ${needsOverride ? '#eab308' : 'var(--border)'}`,
                    background: 'var(--bg-card)',
                    color: 'var(--text-h)',
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                {needsOverride && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#eab308' }}>YELLOW requiere override_reason (pay.py:43)</span>}
              </div>
            )}

            {error && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 12px', borderRadius: 10, textAlign: 'left', wordBreak: 'break-word' }}>
                {error}
              </div>
            )}

            {preview && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', padding: '12px', borderRadius: 10, textAlign: 'left', wordBreak: 'break-word' }}>
                <div style={{ color: '#22c55e', fontWeight: 800, marginBottom: 6 }}>Quote WDK generado</div>
                <div>Wallet origen WDK: {preview.source_address ?? '—'}</div>
                <div>Fee estimado: {preview.fee ?? preview.quote?.fee ?? '—'}</div>
                <div>Estado: {preview.payment_status}</div>
              </div>
            )}
          </div>

          <div className="pay-page__actions">
            <button type="button" className="pay-page__back" onClick={() => navigate('/proposal', { state: location.state as any })}>
              Volver
            </button>
            <button
              type="button"
              className="pay-page__next"
              onClick={handlePreview}
              disabled={!canPay}
              title={!walletValid ? 'Wallet inválida' : isRed ? 'Bloqueado en RED' : needsOverride ? 'Falta override' : !amountValid ? 'Monto inválido' : ''}
            >
              {paying ? 'Cotizando…' : isRed ? 'Bloqueado' : 'Cotizar con WDK'}
            </button>
            <button
              type="button"
              className="pay-page__next"
              onClick={handleConfirm}
              disabled={!canPay || !preview}
              title={!preview ? 'Primero generá un quote WDK' : ''}
            >
              {paying ? 'Transfiriendo…' : 'Confirmar transferencia WDK'}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}

export default memo(Pay)
