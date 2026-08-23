import { memo, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header.tsx'
import './Proposal.css'

type Status = 'idle' | 'loading' | 'proposal' | 'error' | 'verde' | 'amarillo' | 'rojo'

type LocationState = {
  proposal?: string
  status?: Status
  score?: number
  wallet?: string
}

type Check = { id: string; status: 'PASS' | 'FAIL' | 'REVIEW'; detail: string }

function getScore(proposal: string | null): number | null {
  if (!proposal) return null
  try {
    const data = JSON.parse(proposal)
    // soporta {score}, {reconciliacion:{score}}, {reconciliation:{score}}, probabilidad
    return (
      data.score ??
      data.reconciliacion?.score ??
      data.reconciliation?.score ??
      data.probabilidad ??
      data.probability ??
      data.reconciliacion?.probabilidad ??
      null
    )
  } catch {
    return null
  }
}

function parseProposal(proposal: string | null): any | null {
  if (!proposal) return null
  try {
    return JSON.parse(proposal)
  } catch {
    return null
  }
}

function Proposal() {
  const navigate = useNavigate()
  const location = useLocation() as { state: LocationState | null }
  const proposal = location.state?.proposal ?? null
  const rawStatus: Status = location.state?.status ?? (proposal ? 'proposal' : 'idle')
  const wallet = location.state?.wallet ?? null

  const parsed = useMemo(() => parseProposal(proposal), [proposal])
  const reconciliacion = parsed?.reconciliacion ?? parsed?.reconciliation ?? parsed?.reconcile ?? null
  const checks: Check[] = reconciliacion?.checks ?? parsed?.checks ?? []
  const riskFlags: string[] = reconciliacion?.risk_flags ?? reconciliacion?.riskFlags ?? parsed?.risk_flags ?? []
  const discrepancies: string[] = reconciliacion?.discrepancies ?? reconciliacion?.discrepancias ?? []
  const recommendation: string | null = reconciliacion?.recommendation ?? reconciliacion?.recomendacion ?? null
  const reconcStatus: string | null = reconciliacion?.status ?? null
  const invoice = parsed?.invoice ?? null
  const invoiceNumber = invoice?.invoiceNumber ?? invoice?.numero ?? parsed?.invoiceNumber ?? null
  const invoiceTotal = invoice?.total ?? invoice?.totales?.total ?? parsed?.total ?? parsed?.amount ?? null
  const invoiceCurrency = invoice?.currency ?? invoice?.moneda ?? 'PEN'

  const scoreFromState = location.state?.score
  const score = scoreFromState ?? getScore(proposal)

  const semaforo: Status =
    score !== null ? (score >= 90 ? 'verde' : score >= 70 ? 'amarillo' : 'rojo') : rawStatus

  const handleNext = () => {
    // pasar todo lo necesario a Pay para que arme el contract correcto sin tocar backend
    navigate('/pay', {
      state: {
        proposal,
        wallet,
        score,
        status: reconcStatus,
        amount: invoiceTotal != null ? String(invoiceTotal) : undefined,
        invoiceId: invoiceNumber,
        riskFlags,
        recommendation,
      } as any,
    })
  }

  const showStructured = parsed && (checks.length > 0 || reconciliacion)

  return (
    <>
      <Header />
      <section className={`proposal proposal--${semaforo}`}>
        <div className="proposal__inner">
          <div className="proposal__head">
            <h1 className="proposal__title">Revisar propuesta</h1>
            {score !== null && <span className={`proposal__score proposal__score--${semaforo}`}>{score}/100</span>}
            {reconcStatus && (
              <span className={`proposal__score proposal__score--${semaforo}`} style={{ fontSize: 12 }}>
                {reconcStatus}
              </span>
            )}
          </div>

          <div className="proposal__card">
            {wallet && (
              <div className="proposal__wallet">
                <span className="proposal__wallet-label">Enviar a wallet</span>
                <span className="proposal__wallet-value">{wallet}</span>
              </div>
            )}

            {rawStatus === 'loading' ? (
              <p className="proposal__loading">Generando propuesta…</p>
            ) : !proposal ? (
              <p className="proposal__placeholder">Espacio reservado para la propuesta de la IA. Aquí se mostrará el JSON/texto extraído.</p>
            ) : showStructured ? (
              <>
                {/* Resumen factura */}
                {invoice && (
                  <div style={{ marginBottom: 16, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, background: '#0a0a0f' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Factura {invoiceNumber ?? ''} {invoiceCurrency ? `· ${invoiceCurrency}` : ''}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-h)', lineHeight: 1.5 }}>
                      {invoice.supplier?.name ?? invoice.emisor?.razon_social ?? ''} {invoice.supplier?.ruc ?? invoice.emisor?.ruc ? `· RUC ${invoice.supplier?.ruc ?? invoice.emisor?.ruc}` : ''}
                    </div>
                    {invoiceTotal != null && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 800, color: 'var(--text-h)', marginTop: 4 }}>
                        Total: {Number(invoiceTotal).toFixed(2)} {invoiceCurrency}
                      </div>
                    )}
                    {recommendation && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, marginTop: 6, color: semaforo === 'verde' ? '#22c55e' : semaforo === 'amarillo' ? '#eab308' : '#ef4444' }}>
                        Recomendación: {recommendation}
                      </div>
                    )}
                  </div>
                )}

                {/* Checks estructurados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
                    Validaciones deterministas ({checks.length})
                  </span>
                  {checks.length === 0 ? (
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', margin: 0 }}>Sin checks disponibles</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {checks.map((c) => {
                        const isPass = c.status === 'PASS'
                        const isReview = c.status === 'REVIEW'
                        const color = isPass ? '#22c55e' : isReview ? '#eab308' : '#ef4444'
                        const bg = isPass ? 'rgba(34,197,94,0.1)' : isReview ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)'
                        const border = isPass ? 'rgba(34,197,94,0.3)' : isReview ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'
                        const icon = isPass ? '✓' : isReview ? '◐' : '✕'
                        return (
                          <li
                            key={c.id}
                            style={{
                              display: 'flex',
                              gap: 10,
                              alignItems: 'flex-start',
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: `1px solid ${border}`,
                              background: bg,
                            }}
                          >
                            <span
                              style={{
                                minWidth: 22,
                                height: 22,
                                borderRadius: 999,
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 11,
                                fontWeight: 800,
                                color: isPass ? '#22c55e' : isReview ? '#eab308' : '#ef4444',
                                border: `1px solid ${border}`,
                                background: 'var(--bg-card)',
                              }}
                            >
                              {icon}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                {c.id} · {c.status}
                              </div>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-h)', marginTop: 2, lineHeight: 1.5 }}>{c.detail}</div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {/* Discrepancias / risk */}
                {(discrepancies.length > 0 || riskFlags.length > 0) && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {discrepancies.length > 0 && (
                      <div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Discrepancias</span>
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontFamily: 'var(--mono)', fontSize: 13, color: '#ef4444', lineHeight: 1.6 }}>
                          {discrepancies.map((d: string, i: number) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {riskFlags.length > 0 && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>
                        <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>Risk flags:</span>{' '}
                        <span style={{ color: '#ef4444', wordBreak: 'break-word' }}>{riskFlags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Raw colapsable para debug */}
                <details style={{ marginTop: 16 }}>
                  <summary style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>Ver JSON crudo</summary>
                  <pre className="proposal__text" style={{ marginTop: 10, maxHeight: 240, overflow: 'auto', background: '#0a0a0f', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                    {proposal}
                  </pre>
                </details>
              </>
            ) : (
              <pre className="proposal__text">{proposal}</pre>
            )}
          </div>

          <div className="proposal__actions">
            <button type="button" className="proposal__btn proposal__btn--ghost" onClick={() => navigate('/upload')}>
              Volver
            </button>
            <button type="button" className="proposal__btn proposal__btn--primary" onClick={handleNext}>
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

export default memo(Proposal)
