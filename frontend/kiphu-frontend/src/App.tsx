import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home/Home.tsx'
import Footer from './components/Footer/Footer.tsx'

// bundle-dynamic-imports: páginas pesadas en chunk separado
const Upload = lazy(() => import('./pages/Upload/Upload.tsx'))
const Proposal = lazy(() => import('./pages/Proposal/Proposal.tsx'))
const Pay = lazy(() => import('./pages/Pay/Pay.tsx'))
const Receipt = lazy(() => import('./pages/Receipt/Receipt.tsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/upload"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <Upload />
            </Suspense>
          }
        />
        <Route
          path="/proposal"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <Proposal />
            </Suspense>
          }
        />
        <Route
          path="/pay"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <Pay />
            </Suspense>
          }
        />
        <Route
          path="/receipt"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <Receipt />
            </Suspense>
          }
        />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}
