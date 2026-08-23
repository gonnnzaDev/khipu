import { useEffect, useRef, useState, type ReactNode } from 'react'
import './NetworkSelect.css'

export type NetworkOption = {
  value: string
  label: string
  color: string
  hint: string
  icon?: ReactNode
}

function EthIcon() {
  return (
    <svg className="netselect__icon" viewBox="0 0 32 32" aria-hidden="true">
      <g fill="none" stroke="#1c71d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9.5,16 16,5.17 22.5,16 16,26.83" />
        <line x1="16" y1="26.83" x2="9.5" y2="16" />
        <line x1="17.99" y1="13.74" x2="22.5" y2="16" />
        <line x1="9.5" y1="16" x2="14.01" y2="13.74" />
        <polygon points="16,26.83 9.5,16 16,19.25 22.5,16" />
        <line x1="16" y1="18.87" x2="16" y2="9" />
        <polygon points="16,5.17 9.5,16 16,26.83 22.5,16" />
        <circle cx="16" cy="16" r="14.5" />
      </g>
    </svg>
  )
}

function TronIcon() {
  return (
    <svg className="netselect__icon" viewBox="0 0 32 32" aria-hidden="true">
      <g fill="none" stroke="#c01c28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="16" r="14.5" />
        <line x1="25.5" y1="13.54" x2="17" y2="14.8" />
        <line x1="8.5" y1="7.87" x2="17" y2="14.8" />
        <polyline points="15.43,26.13 17,14.8 22.16,10.26" />
        <polygon points="8.5,7.87 15.43,26.13 25.5,13.54 22.16,10.26" />
      </g>
    </svg>
  )
}

function SolanaIcon() {
  return (
    <svg className="netselect__icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="#14f195">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.08398 5.22265C7.17671 5.08355 7.33282 5 7.5 5H18.5C18.6844 5 18.8538 5.10149 18.9408 5.26407C19.0278 5.42665 19.0183 5.62392 18.916 5.77735L16.916 8.77735C16.8233 8.91645 16.6672 9 16.5 9H5.5C5.3156 9 5.14617 8.89851 5.05916 8.73593C4.97215 8.57335 4.98169 8.37608 5.08398 8.22265L7.08398 5.22265ZM7.76759 6L6.43426 8H16.2324L17.5657 6H7.76759Z"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.08398 15.2226C7.17671 15.0836 7.33282 15 7.5 15H18.5C18.6844 15 18.8538 15.1015 18.9408 15.2641C19.0278 15.4267 19.0183 15.6239 18.916 15.7774L16.916 18.7774C16.8233 18.9164 16.6672 19 16.5 19H5.5C5.3156 19 5.14617 18.8985 5.05916 18.7359C4.97215 18.5734 4.98169 18.3761 5.08398 18.2226L7.08398 15.2226ZM7.76759 16L6.43426 18H16.2324L17.5657 16H7.76759Z"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.08398 13.7774C7.17671 13.9164 7.33282 14 7.5 14H18.5C18.6844 14 18.8538 13.8985 18.9408 13.7359C19.0278 13.5733 19.0183 13.3761 18.916 13.2226L16.916 10.2226C16.8233 10.0836 16.6672 10 16.5 10H5.5C5.3156 10 5.14617 10.1015 5.05916 10.2641C4.97215 10.4267 4.98169 10.6239 5.08398 10.7774L7.08398 13.7774ZM7.76759 13L6.43426 11H16.2324L17.5657 13H7.76759Z"
        />
      </g>
    </svg>
  )
}

const OPTIONS: NetworkOption[] = [
  { value: 'ethereum', label: 'Ethereum', color: '#627eea', hint: 'Sepolia · USDT', icon: <EthIcon /> },
  { value: 'tron', label: 'TRON', color: '#ef4444', hint: 'Shasta · USDT', icon: <TronIcon /> },
  { value: 'solana', label: 'Solana', color: '#14f195', hint: 'Devnet · USDT', icon: <SolanaIcon /> },
]

type Props = {
  value: string
  onChange: (value: string) => void
}

function Asset({ option }: { option: NetworkOption }) {
  if (option.icon) {
    return <span className="netselect__asset netselect__asset--icon">{option.icon}</span>
  }
  return <span className="netselect__asset" style={{ background: option.color }} />
}

export default function NetworkSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]

  const openList = () => {
    setHighlighted(OPTIONS.findIndex((o) => o.value === value))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const commit = (value: string) => {
    onChange(value)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => (h + 1) % OPTIONS.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => (h - 1 + OPTIONS.length) % OPTIONS.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(OPTIONS[highlighted].value)
    }
  }

  return (
    <div className="netselect" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`netselect__trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <Asset option={selected} />
        <span className="netselect__label">{selected.label}</span>
        <span className="netselect__hint">{selected.hint}</span>
        <svg
          className="netselect__chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className="netselect__list" role="listbox">
          {OPTIONS.map((option, i) => {
            const isSelected = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`netselect__option${i === highlighted ? ' is-highlighted' : ''}${isSelected ? ' is-selected' : ''}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => commit(option.value)}
                >
                  <Asset option={option} />
                  <span className="netselect__option-text">
                    <span className="netselect__label">{option.label}</span>
                    <span className="netselect__hint">{option.hint}</span>
                  </span>
                  {isSelected && (
                    <svg className="netselect__check" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
