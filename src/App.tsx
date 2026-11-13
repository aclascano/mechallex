import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { EsqueletoPagina, Vacio } from './components/ui'
import PaginaPanel from './pages/Panel'

// Cada módulo se carga bajo demanda; el panel va en el paquete inicial.
const PaginaClientes = lazy(() => import('./pages/Clientes'))
const PaginaCliente = lazy(() => import('./pages/Cliente'))
const PaginaClienteFormulario = lazy(() => import('./pages/ClienteFormulario'))
const PaginaOperaciones = lazy(() => import('./pages/Operaciones'))
const PaginaOperacion = lazy(() => import('./pages/Operacion'))
const PaginaAmortizacion = lazy(() => import('./pages/Amortizacion'))
const PaginaNuevaObligacion = lazy(() => import('./pages/NuevaObligacion'))
const PaginaPagos = lazy(() => import('./pages/Pagos'))
const PaginaCobranza = lazy(() => import('./pages/Cobranza'))
const PaginaJuicios = lazy(() => import('./pages/Juicios'))
const PaginaContabilidad = lazy(() => import('./pages/Contabilidad'))
const PaginaReportes = lazy(() => import('./pages/Reportes'))

const conCarga = (el: React.ReactNode) => <Suspense fallback={<EsqueletoPagina />}>{el}</Suspense>

// HashRouter: la demo funciona en cualquier hosting estático y dentro de un iframe del portafolio.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PaginaPanel />} />
          <Route path="clientes" element={conCarga(<PaginaClientes />)} />
          <Route path="clientes/nuevo" element={conCarga(<PaginaClienteFormulario />)} />
          <Route path="clientes/:id" element={conCarga(<PaginaCliente />)} />
          <Route path="clientes/:id/editar" element={conCarga(<PaginaClienteFormulario key="editar" />)} />
          <Route path="operaciones" element={conCarga(<PaginaOperaciones />)} />
          <Route path="operaciones/:id" element={conCarga(<PaginaOperacion />)} />
          <Route path="obligaciones/nueva" element={conCarga(<PaginaNuevaObligacion />)} />
          <Route path="amortizacion" element={conCarga(<PaginaAmortizacion />)} />
          <Route path="pagos" element={conCarga(<PaginaPagos />)} />
          <Route path="cobranza" element={conCarga(<PaginaCobranza />)} />
          <Route path="juicios" element={conCarga(<PaginaJuicios />)} />
          <Route path="contabilidad" element={conCarga(<PaginaContabilidad />)} />
          <Route path="reportes" element={conCarga(<PaginaReportes />)} />
          <Route path="*" element={<Vacio titulo="Página no encontrada">Usa el menú lateral para volver a un módulo.</Vacio>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
