import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header.tsx'
import './Receipt.css'

type State = { hash?: string; receipt?: string }

export default function Receipt() {
  const navigate = useNavigate()
  const location = useLocation() as { state: State | null }
  const hash = location.state?.hash ?? '0x9f8c...3a2b (hash de testnet)'
  const receipt = location.state?.receipt ?? 'Comprobante de pago generado. Hash registrado en testnet.'

  const handleDownload = () => {
    const content = `Hash: ${hash}\n\nComprobante:\n${receipt}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comprobante-${hash.slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Header />
      <main className="receipt-page">
        <div className="receipt-page__inner">
          <h1 className="receipt-page__title">Pago registrado</h1>

          <div className="receipt-page__grid">
            <div className="receipt-page__card">
              <span className="receipt-page__label">Comprobante</span>
              <pre className="receipt-page__receipt">{receipt}</pre>
              <button type="button" className="receipt-page__download" onClick={handleDownload}>
                Descargar
              </button>
            </div>

            <div className="receipt-page__card">
              <span className="receipt-page__label">Hash</span>
              <code className="receipt-page__hash">{hash}</code>
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
