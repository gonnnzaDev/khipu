import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.png'
import './Presentation.css'

function Presentation() {
  const navigate = useNavigate()

  return (
    <section className="presentation">
      <div className="presentation__hero">
        <p className="presentation__eyebrow">Aleph Hackathon 2026 · MVP 24H · USD₮ Testnet</p>
        <img className="presentation__logo" src={logo} alt="Logo KHIPU" />
        <h1 className="presentation__title">KHIPU</h1>
        <p className="presentation__subtitle">AI-Powered Invoice Guardian</p>
        <div className="presentation__pipeline">
          <span>IA interpreta</span>
          <i />
          <span>Reglas verifican</span>
          <i />
          <span>Humano autoriza</span>
          <i />
          <span>Blockchain registra</span>
        </div>
        <p className="presentation__desc">
          Agente de control de cuentas por pagar. Verifica facturas contra OC y guía, genera semáforo explicable y
          deja evidencia en testnet. Demo en 60–90s.
        </p>
        <div className="presentation__actions">
          <button type="button" className="presentation__btn" onClick={() => navigate('/upload')}>
            <span>Siguiente</span> <em>→</em>
          </button>
        </div>
      </div>

      <div className="presentation__divider" aria-hidden="true" />

      <div className="presentation__body">
        <div className="presentation__intro">
          <span className="presentation__kicker">Resumen ejecutivo</span>
          <p>
            KHIPU prioriza una sola experiencia de extremo a extremo que funciona en 24 horas. No automatiza toda la
            contabilidad: resuelve el momento crítico de decidir si una factura está suficientemente respaldada para ser
            pagada, con trazabilidad completa.
          </p>
        </div>

        <div className="presentation__split">
          <div className="presentation__block">
            <span className="presentation__kicker">Problema</span>
            <h3>Revisión manual, pagos indebidos y falta de evidencia</h3>
            <ul>
              <li>Factura vs OC inconsistente → pago indebido</li>
              <li>Factura vs guía inconsistente → sobrepago</li>
              <li>Duplicados, totales mal calculados, IA opaca</li>
            </ul>
          </div>
          <div className="presentation__block presentation__block--accent">
            <span className="presentation__kicker">Propuesta</span>
            <h3>Decisión explicable en segundos</h3>
            <p>Extracción automática, comparación con reglas, semáforo y log con hash. Validación → aprobación → pago en un flujo.</p>
            <p className="presentation__note">No es ERP, no usa dinero real, no deja que el LLM autorice solo.</p>
          </div>
        </div>

        <div className="presentation__section">
          <span className="presentation__kicker">MVP 24H — 6 capacidades</span>
          <ol>
            <li><strong>Cargar</strong> factura + OC + guía</li>
            <li><strong>Extraer</strong> y normalizar con OCR y LLM local</li>
            <li><strong>Conciliar</strong> determinista (proveedor, cantidad, precio, totales, duplicados)</li>
            <li><strong>Puntuar</strong> 0–100 y semáforo 🟢90–100 🟡70–89 🔴0–69</li>
            <li><strong>Aprobar</strong> con humano (verde/amarillo/rojo)</li>
            <li><strong>Pagar</strong> preview + WDK testnet + hash</li>
          </ol>
        </div>

        <div className="presentation__section">
          <span className="presentation__kicker">Arquitectura</span>
          <p className="presentation__flowline">FACTURA → OCR → EXTRACT → ZOD → CONCILIA → SCORE → SEMÁFORO → HUMANO → WDK → HASH</p>
          <div className="presentation__stack">
            <span>Node 22 + TS</span><span>Zod</span><span>QVAC SDK</span><span>LLM local</span><span>WDK</span><span>commander</span>
          </div>
        </div>

        <div className="presentation__section">
          <span className="presentation__kicker">Demo — 3 casos</span>
          <div className="presentation__cases">
            <div><strong>🟢 96/100</strong> Perfecta → aprueba → hash</div>
            <div><strong>🔴 54/100</strong> 12 vs 10 unidades → bloquea</div>
            <div><strong>🟡 78/100</strong> Ambiguo → revisión con motivo</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default memo(Presentation)
