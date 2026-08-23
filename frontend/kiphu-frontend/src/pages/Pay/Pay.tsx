import { memo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header.tsx'
import './Pay.css'

type State = { proposal?: string; wallet?: string; amount?: string }

function Pay() {
  const navigate = useNavigate()
  const location = useLocation() as { state: State | null }
  const proposal = location.state?.proposal ?? null
  const wallet = location.state?.wallet ?? null
  const [paying, setPaying] = useState(false)

  // extraer monto del JSON si existe
  let amount: string | null = location.state?.amount ?? null
  if (!amount && proposal) {
    try {
      const data = JSON.parse(proposal)
      amount = data.totales?.total ?? data.total ?? data.amount ?? null
    } catch {
      amount = null
    }
  }

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, proposal }),
      })
      if (!res.ok) throw new Error('Pago falló')
      const data = await res.json().catch(() => ({}))
      navigate('/receipt', { state: { hash: data.hash ?? data.txHash, receipt: data.receipt ?? JSON.stringify(data, null, 2) } })
    } catch {
      setPaying(false)
    }
  }

  return (
    <>
      <Header />
      <main className="pay-page">
        <div className="pay-page__inner">
          <h1 className="pay-page__title">Confirmar pago</h1>
          <div className="pay-page__amount">
            <span className="pay-page__amount-label">Monto final</span>
            <span className="pay-page__amount-value">{amount ?? '—'}</span>
          </div>

          <div className="pay-page__actions">
            <button type="button" className="pay-page__back" onClick={() => navigate('/proposal')}>
              Cancelar
            </button>
            <button type="button" className="pay-page__next" onClick={handlePay} disabled={paying}>
              {paying ? 'Pagando…' : 'Pagar'}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}

export default memo(Pay)
