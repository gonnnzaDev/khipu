import { memo } from 'react'
import logo from '../../assets/logo.png'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <span className="header__logo">
          <img className="header__logo-img" src={logo} alt="KHIPU" />
          KHIPU
        </span>
      </div>
    </header>
  )
}

export default memo(Header)
