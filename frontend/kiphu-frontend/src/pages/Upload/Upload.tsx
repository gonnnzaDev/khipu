import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header.tsx'
import InvoiceUpload from '../../components/InvoiceUpload/InvoiceUpload.tsx'
import './Upload.css'

export default function Upload() {
  const [files, setFiles] = useState<(File | null)[]>([null, null, null])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wallet, setWallet] = useState('')
  const [network, setNetwork] = useState('ethereum')
  const navigate = useNavigate()

  const handleFile = useCallback(
    (idx: number) => (f: File) => {
      setFiles((prev) => {
        const next = [...prev]
        next[idx] = f
        return next
      })
      setError(null)
    },
    [],
  )

  const handleDelete = useCallback((idx: number) => () => {
    setFiles((prev) => {
      const next = [...prev]
      next[idx] = null
      return next
    })
    setError(null)
  }, [])

  const handleValidate = useCallback(async () => {
    if (files.some((f) => f === null)) {
      setError('Faltan archivos: cargá factura + OC + guía para validar.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      // /validate espera campos exactamente: invoice, oc, guide (ver src/validate/validate.py:62)
      form.append('invoice', files[0] as File)
      form.append('oc', files[1] as File)
      form.append('guide', files[2] as File)

      const res = await fetch('/validate', { method: 'POST', body: form })
      if (!res.ok) {
        const txt = await res.text()
        // intenta extraer detail de FastAPI
        let detail = txt
        try {
          const j = JSON.parse(txt)
          detail = j.detail || j.message || txt
        } catch {
          // txt ya es el mensaje
        }
        throw new Error(detail)
      }
      const data = await res.json()
      const reconc = data.reconciliacion ?? data.reconciliation ?? {}
      const score = reconc.score ?? data.score ?? null
      navigate('/proposal', {
        state: {
          proposal: JSON.stringify(data, null, 2),
          score,
          wallet,
          network,
          status: score !== null ? undefined : 'proposal',
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al validar'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [files, navigate, network, wallet])

  const canValidate = files.every((f) => f !== null) && !loading

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
              <label className="upload-page__label">Red</label>
              <select className="upload-page__input" value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option value="ethereum">Ethereum</option>
                <option value="tron">TRON</option>
                <option value="solana">Solana</option>
              </select>
              <label className="upload-page__label">Enviar a wallet</label>
              <input
                type="text"
                className="upload-page__input"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder={network === 'ethereum' ? '0x...' : network === 'tron' ? 'T...' : 'Solana base58...'}
                spellCheck={false}
              />
              </div>
              {error && <p style={{ color: '#c0392b', fontSize: 14, marginTop: 12 }}>{error}</p>}
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
            <button type="button" className="upload-page__next" onClick={handleValidate} disabled={!canValidate}>
              {loading ? 'Validando…' : 'Validar →'}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
