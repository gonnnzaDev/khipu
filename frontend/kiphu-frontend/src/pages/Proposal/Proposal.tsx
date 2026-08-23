import { memo } from 'react'
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

function getScore(proposal: string | null): number | null {
  if (!proposal) return null
  try {
    const data = JSON.parse(proposal)
    return data.score ?? data.probabilidad ?? data.probability ?? null
  } catch {
    return null
  }
}

function Proposal() {
  const navigate = useNavigate()
  const location = useLocation() as { state: LocationState | null }
  const proposal = location.state?.proposal ?? null
  const status: Status = location.state?.status ?? (proposal ? 'proposal' : 'idle')
  const score = location.state?.score ?? getScore(proposal)
  const wallet = location.state?.wallet ?? null
  const semaforo: Status =
    score !== null ? (score >= 90 ? 'verde' : score >= 70 ? 'amarillo' : 'rojo') : status

  return (
    <>
      <Header />
      <section className={`proposal proposal--${semaforo}`}>
        <div className="proposal__inner">
          <div className="proposal__head">
            <h1 className="proposal__title">Revisar propuesta</h1>
            {score !== null && <span className={`proposal__score proposal__score--${semaforo}`}>{score}/100</span>}
          </div>

          <div className="proposal__card">
            {wallet && (
              <div className="proposal__wallet">
                <span className="proposal__wallet-label">Enviar a wallet</span>
                <span className="proposal__wallet-value">{wallet}</span>
              </div>
            )}
            {status === 'loading' ? (
              <p className="proposal__loading">Generando propuesta…</p>
            ) : proposal ? (
              <pre className="proposal__text">{proposal}</pre>
            ) : (
              <p className="proposal__placeholder">Espacio reservado para la propuesta de la IA. Aquí se mostrará el JSON/texto extraído.</p>
            )}
          </div>

          <div className="proposal__actions">
            <button type="button" className="proposal__btn proposal__btn--ghost" onClick={() => navigate('/upload')}>
              Volver
            </button>
            <button
              type="button"
              className="proposal__btn proposal__btn--primary"
              onClick={() => navigate('/pay', { state: { proposal, wallet } })}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

export default memo(Proposal)
