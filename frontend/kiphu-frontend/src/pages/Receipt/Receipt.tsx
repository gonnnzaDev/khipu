import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header.tsx'
import './Receipt.css'

type State = { hash?: string | null; receipt?: string; paymentStatus?: string }

export default function Receipt() {
  const navigate = useNavigate()
  const location = useLocation() as { state: State | null }
  const hash = location.state?.hash ?? null
  const receipt = location.state?.receipt ?? 'No hay comprobante disponible para esta sesión.'
  const paymentStatus = location.state?.paymentStatus ?? null
  const missingHash = !hash

  const handleDownload = () => {
    const content = `Hash: ${hash ?? 'NO_RECIBIDO'}\n\nComprobante:\n${receipt}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comprobante-${(hash ?? 'sin-hash').slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Header />
      <main className="receipt-page">
        <div className="receipt-page__inner">
          <h1 className="receipt-page__title">{missingHash ? 'Preview de pago' : 'Pago registrado'}</h1>

          {missingHash && (
            <div style={{ color: '#eab308', border: '1px solid rgba(234,179,8,0.35)', background: 'rgba(234,179,8,0.1)', padding: '12px 14px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 13 }}>
              No se recibió hash de transacción. Estado: {paymentStatus ?? 'desconocido'}. Esto no confirma un pago on-chain.
            </div>
          )}

          <div className="receipt-page__grid">
            <div className="receipt-page__card">
              <span className="receipt-page__label">Comprobante</span>
              <pre className="receipt-page__receipt">{receipt}</pre>
              {hash ? (
                <button type="button" className="receipt-page__download" onClick={handleDownload}>
                  Descargar
                </button>
              ) : (
                <p style={{ margin: '12px 0 0', color: '#eab308', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  Descarga deshabilitada hasta recibir un hash real.
                </p>
              )}
            </div>

            <div className="receipt-page__card">
              <span className="receipt-page__label">Hash</span>
              <code className="receipt-page__hash">{hash ?? 'NO_RECIBIDO'}</code>
            </div>
          </div>

          <button type="button" className="receipt-page__btn" onClick={() => navigate('/')}>
            Volver al home
          </button>
        </div>
      </main>
    </>
  )
}
