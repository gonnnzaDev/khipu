import { memo } from 'react'
import './InvoicePreview.css'

// rendering-hoist-jsx: JSX estático fuera
const emptyJsx = <p className="preview__empty">Sin factura cargada</p>

type Props = {
  file: File | null
}

function InvoicePreview({ file }: Props) {
  if (!file) return emptyJsx
  return (
    <div className="preview">
      <span className="preview__name">{file.name}</span>
    </div>
  )
}

export default memo(InvoicePreview)
