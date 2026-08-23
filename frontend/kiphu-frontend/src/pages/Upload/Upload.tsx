import { useCallback, useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header.tsx'
import InvoiceUpload from '../../components/InvoiceUpload/InvoiceUpload.tsx'
import './Upload.css'

export default function Upload() {
  const [files, setFiles] = useState<(File | null)[]>([null, null, null])
  const [result, setResult] = useState<string | null>(() => null)
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [wallet, setWallet] = useState('0x742d35Cc6634C0532925a3b8D4C9e4e6b7a8b9c0')
  const [, startTransition] = useTransition()
  const navigate = useNavigate()

  const handleFile = useCallback(
    (idx: number) => async (f: File) => {
      setFiles((prev) => {
        const next = [...prev]
        next[idx] = f
        return next
      })
      setResult(null)
      setIsError(false)
      setLoading(true)
      try {
        const form = new FormData()
        form.append('file', f)
        const res = await fetch('/api/facturas', { method: 'POST', body: form })
        if (!res.ok) throw new Error('OCR falló')
        const data = await res.text()
        startTransition(() => {
          setResult(data)
          setIsError(false)
        })
      } catch (e) {
        startTransition(() => {
          setResult(e instanceof Error ? e.message : 'Error')
          setIsError(true)
        })
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const handleDelete = useCallback((idx: number) => () => {
    setFiles((prev) => {
      const next = [...prev]
      next[idx] = null
      return next
    })
  }, [])

  const handleNext = useCallback(() => {
    if (isError) {
      navigate('/proposal', { state: { proposal: result, wallet, status: 'error' } })
    } else {
      navigate('/proposal', { state: { proposal: result, wallet, status: result ? 'proposal' : 'idle' } })
    }
  }, [navigate, result, wallet, isError])

  return (
    <>
      <Header />
      <main className="upload-page">
        <div className="upload-page__inner">
          <div className="upload-page__row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
              <h1 className="upload-page__title" style={{ textAlign: 'left', fontSize: '56px', marginTop: '32px', lineHeight: 1.05, letterSpacing: '-0.03em' }}>Cargar información</h1>
              <div className="upload-page__section" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                <span className="upload-page__kicker">Destino</span>
              <label className="upload-page__label">Enviar a wallet</label>
              <input
                type="text"
                className="upload-page__input"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x..."
                spellCheck={false}
              />
              </div>
            </div>

            <div className="upload-page__section upload-page__section--plain">
              <div className="upload-page__stack">
                {[
                  { label: 'Factura', title: 'Arrastra tu factura', accept: 'image/png,image/jpeg', hint: 'PNG / JPG / JPEG' },
                  { label: 'Orden de Compra', title: 'Arrastra tu orden de compra', accept: '.json,application/json', hint: 'JSON' },
                  { label: 'Guía', title: 'Arrastra tu guía', accept: '.json,application/json', hint: 'JSON' },
                ].map((item, i) => (
                  <div key={i} className="upload-page__doc">
                    <span className="upload-page__doc-label">{item.label}</span>
                    <InvoiceUpload
                      file={files[i]}
                      onFile={handleFile(i)}
                      onDelete={handleDelete(i)}
                      accept={item.accept}
                      hint={item.hint}
                      title={item.title}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="upload-page__actions">
            <button type="button" className="upload-page__back" onClick={() => navigate('/')}>
              ← Volver
            </button>
            <button type="button" className="upload-page__next" onClick={handleNext} disabled={loading}>
              Siguiente →
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
