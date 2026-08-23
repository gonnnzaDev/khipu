import { memo } from 'react'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <span className="header__logo">KIPHU</span>
      </div>
    </header>
  )
}

export default memo(Header)
