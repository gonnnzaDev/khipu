import { memo, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header.tsx'
import './Pay.css'

type State = {
  proposal?: string
  wallet?: string
  amount?: string
  score?: number
  status?: string
  invoiceId?: string
  riskFlags?: string[]
  recommendation?: string
}

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

function Pay() {
  const navigate = useNavigate()
  const location = useLocation() as { state: State | null }
  const proposal = location.state?.proposal ?? null
  const initialWallet = location.state?.wallet ?? '0x742d35Cc6634C0532925a3b8D4C9e4e6b7a8b9c0'
  const [wallet, setWallet] = useState(initialWallet)
  const [overrideReason, setOverrideReason] = useState('')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  const walletValid = isValidEvmAddress(wallet)
  const walletError = touchedWallet && !walletValid ? 'Wallet inválida: debe ser 0x + 40 hex y no ser 0x00...0 (re: pay.py:88)' : null

  const isRed = reconcStatus === 'RED'
  const isYellow = reconcStatus === 'YELLOW'
  const needsOverride = isYellow && overrideReason.trim().length === 0
  const amountNum = amountStr != null ? Number(amountStr) : NaN
  const amountValid = amountStr != null && !isNaN(amountNum) && amountNum > 0

  const canPay = walletValid && amountValid && !isRed && !needsOverride && !paying

  const handlePay = async () => {
    setError(null)
    if (!walletValid) {
      setError('Recipient must be a valid non-zero EVM address.')
      setTouchedWallet(true)
      return
    }
    if (!amountValid) {
      setError('Amount must be greater than zero.')
      return
    }
    if (isRed) {
      setError('RED reconciliation status blocks payment.')
      return
    }
    if (isYellow && !overrideReason.trim()) {
      setError('YELLOW status requires an override reason before payment.')
      return
    }

    setPaying(true)
    try {
      // contract exacto de src/pay/wdk_adapter.py:34 + pay.py:20
      const payload = {
        recipient: wallet,
        amount: String(amountStr),
        status: reconcStatus,
        network: 'ethereum',
        token: 'USDT',
        confirm: false,
        invoice_id: invoiceId,
        override_reason: overrideReason.trim() || null,
      }

      const res = await fetch('/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // FastAPI siempre responde 200 con {payment_status, allowed, reason}
      const data = await res.json().catch(() => ({} as any))

      // Si backend responde PAYMENT_INVALID / BLOCKED / REVIEW_REQUIRED, mostrar reason y no navegar
      if (data.payment_status === 'PAYMENT_INVALID' || data.payment_status === 'PAYMENT_BLOCKED' || data.payment_status === 'REVIEW_REQUIRED' || data.allowed === false) {
        // para PAYMENT_PREVIEW allowed=true es éxito
        if (data.payment_status === 'PAYMENT_PREVIEW' && data.allowed) {
          // ok -> ir a receipt
        } else {
          throw new Error(data.reason || data.detail || `Pago no permitido: ${data.payment_status}`)
        }
      }

      if (!res.ok) throw new Error(data.reason || data.detail || 'Pago falló')

      navigate('/receipt', {
        state: {
          hash: data.tx_hash ?? data.hash ?? data.txHash ?? null,
          receipt: JSON.stringify(data, null, 2),
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al pagar')
      setPaying(false)
    }
  }

  return (
    <>
      <Header />
      <main className="pay-page">
        <div className="pay-page__inner">
          <h1 className="pay-page__title">Confirmar pago</h1>

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
            <span className="pay-page__amount-value">{amountStr != null ? `${Number(amountStr).toFixed(2)} USDT` : '—'}</span>
            {!amountValid && amountStr !== null && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#ef4444' }}>Monto inválido, debe ser &gt; 0</span>}
          </div>

          {/* Wallet + override */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520, width: '100%', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Enviar a wallet (EVM)</label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => {
                  setWallet(e.target.value)
                  setTouchedWallet(true)
                }}
                onBlur={() => setTouchedWallet(true)}
                placeholder="0x..."
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
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)' }}>Validación re: pay.py:86 `0x[a-fA-F0-9]{40}` y no cero</span>
              )}
            </div>

            {isYellow && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Motivo override (requerido para YELLOW)</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
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
          </div>

          <div className="pay-page__actions">
            <button type="button" className="pay-page__back" onClick={() => navigate('/proposal', { state: location.state as any })}>
              Volver
            </button>
            <button
              type="button"
              className="pay-page__next"
              onClick={handlePay}
              disabled={!canPay}
              title={!walletValid ? 'Wallet inválida' : isRed ? 'Bloqueado en RED' : needsOverride ? 'Falta override' : !amountValid ? 'Monto inválido' : ''}
            >
              {paying ? 'Pagando…' : isRed ? 'Bloqueado' : 'Pagar'}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}

export default memo(Pay)
