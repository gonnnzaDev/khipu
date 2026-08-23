import { memo, useCallback, useRef, useState, useTransition } from 'react'
import './InvoiceUpload.css'

type Props = {
  file: File | null
  onFile: (file: File) => void
  onDelete: () => void
  accept?: string
  hint?: string
  title?: string
}

function InvoiceUpload({
  file,
  onFile,
  onDelete,
  accept = 'image/png,image/jpeg',
  hint = 'PNG / JPG / JPEG',
  title = 'Arrastra tu factura o haz click',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0]
      if (!f) return
      const isJson = accept.includes('json')
      if (isJson) {
        if (!f.name.endsWith('.json') && f.type !== 'application/json') return
      } else if (!f.type.startsWith('image/')) return
      startTransition(() => onFile(f))
    },
    [onFile, accept],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files),
    [handleFiles],
  )

  if (file) {
    return (
      <div className="upload upload--filled">
        <span className="upload__file">{file.name}</span>
        <button type="button" className="upload__delete" onClick={onDelete} aria-label="Eliminar">
          ✕
        </button>
      </div>
    )
  }

  return (
    <div
      className={`upload ${dragOver ? 'upload--over' : ''} ${isPending ? 'upload--pending' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      aria-label="Subir factura"
    >
      <input ref={inputRef} type="file" accept={accept} onChange={onChange} hidden />
      <p className="upload__title">{title}</p>
      <p className="upload__hint">{hint}</p>
    </div>
  )
}

export default memo(InvoiceUpload)
