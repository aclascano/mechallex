import {
  BookOpenCheck, Calculator, FilePlus2, ChartColumnBig, Gavel, LayoutDashboard, Menu, Moon, Search, Sun, Users, Wallet, Workflow, X, Landmark,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { fmtFechaLarga } from '../domain/fechas'
import { ENTIDAD_DEMO, HOY, USUARIA_DEMO } from '../mocks/catalogos'
import { cx } from '../lib/formato'
import { BandaGuilloche, Marca } from './guilloche'

const NAV: { grupo: string; items: { to: string; label: string; icono: ReactNode }[] }[] = [
  { grupo: 'General', items: [{ to: '/', label: 'Panel', icono: <LayoutDashboard size={17} /> }] },
  {
    grupo: 'Cartera',
    items: [
      { to: '/clientes', label: 'Clientes', icono: <Users size={17} /> },
      { to: '/operaciones', label: 'Operaciones', icono: <Landmark size={17} /> },
      { to: '/obligaciones/nueva', label: 'Nueva obligación', icono: <FilePlus2 size={17} /> },
      { to: '/amortizacion', label: 'Simulador', icono: <Calculator size={17} /> },
      { to: '/pagos', label: 'Pagos y abonos', icono: <Wallet size={17} /> },
    ],
  },
  {
    grupo: 'Recuperación',
    items: [
      { to: '/cobranza', label: 'Cobranza automatizada', icono: <Workflow size={17} /> },
      { to: '/juicios', label: 'Juicios', icono: <Gavel size={17} /> },
    ],
  },
  {
    grupo: 'Finanzas',
    items: [
      { to: '/contabilidad', label: 'Contabilidad', icono: <BookOpenCheck size={17} /> },
      { to: '/reportes', label: 'Reportes', icono: <ChartColumnBig size={17} /> },
    ],
  },
]

function useTema() {
  const [oscuro, setOscuro] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro)
    try { localStorage.setItem('mx-theme', oscuro ? 'dark' : 'light') } catch { /* sin almacenamiento */ }
    // Al imprimir siempre en claro: tinta oscura sobre papel blanco.
    const antes = () => document.documentElement.classList.remove('dark')
    const despues = () => document.documentElement.classList.toggle('dark', oscuro)
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', despues)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', despues)
    }
  }, [oscuro])
  return [oscuro, setOscuro] as const
}

function Riel({ onNavegar }: { onNavegar?: () => void }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-rail text-rail-ink">
      <BandaGuilloche className="pointer-events-none absolute -top-1 left-0 h-16 w-full text-rail-rose opacity-[0.22]" alto={40} lineas={6} />
      <div className="relative flex h-16 items-center gap-2.5 px-5">
        <Marca className="h-8 w-8 text-rail-rose" />
        <div className="leading-none">
          <p className="display text-[1.35rem] font-medium tracking-[-0.01em]">Mechallex</p>
          <p className="mt-1 text-[0.68rem] tracking-[0.08em] text-rail-ink-2 uppercase">Cartera y cobranza</p>
        </div>
      </div>
      <nav aria-label="Principal" className="relative mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.grupo}>
            <p className="px-3 pb-1.5 text-[0.7rem] font-medium tracking-[0.08em] text-rail-ink-2 uppercase">{g.grupo}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.to === '/'}
                    onClick={onNavegar}
                    className={({ isActive }) =>
                      cx(
                        'group relative flex h-9 items-center gap-3 rounded-[9px] px-3 text-[0.875rem] transition-colors duration-150',
                        isActive ? 'bg-rail-2 font-medium text-rail-ink' : 'text-rail-ink-2 hover:bg-rail-2/60 hover:text-rail-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={cx('transition-colors', isActive ? 'text-rail-rose' : 'text-rail-ink-2 group-hover:text-rail-ink')}>{it.icono}</span>
                        {it.label}
                        {isActive && <span className="absolute top-1/2 right-2.5 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-rail-rose" aria-hidden="true" />}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="relative border-t border-rail-line px-5 py-4">
        <p className="text-[0.8rem] font-medium">{ENTIDAD_DEMO.nombre}</p>
        <div aria-hidden="true" className="microprint mt-3 text-rail-ink-2/60">{'MECHALLEX · CARTERA · COBRANZA · '.repeat(12)}</div>
      </div>
    </div>
  )
}

function Reloj() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setAhora(new Date()), 15_000)
    return () => window.clearInterval(t)
  }, [])
  const hora = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })
  return (
    <p className="hidden text-[0.8rem] text-ink-3 md:block">
      <time dateTime={HOY}><span className="font-medium text-ink-2">{fmtFechaLarga(HOY)}</span></time>
      <span aria-hidden="true"> · </span>
      <time className="tabular font-medium text-ink-2">{hora}</time>
    </p>
  )
}

export function Layout() {
  const [oscuro, setOscuro] = useTema()
  const [menu, setMenu] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    setMenu(false)
  }, [pathname])

  useEffect(() => {
    if (!menu) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [menu])

  return (
    <div className="min-h-dvh lg:pl-64 print:pl-0">
      <a href="#contenido" className="sr-only z-50 rounded-md bg-panel px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Saltar al contenido</a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block print:hidden">
        <Riel />
      </aside>

      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button className="absolute inset-0 bg-[oklch(0.1_0_0/0.5)] backdrop-blur-[2px]" aria-label="Cerrar menú" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 w-[272px] max-w-[85vw] shadow-2xl" style={{ animation: 'aparecer 220ms var(--ease-out-expo) both' }}>
            <Riel onNavegar={() => setMenu(false)} />
            <button onClick={() => setMenu(false)} className="absolute top-4 right-3 grid h-8 w-8 place-items-center rounded-md text-rail-ink-2 hover:text-rail-ink" aria-label="Cerrar menú">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button className="grid h-9 w-9 place-items-center rounded-[9px] border border-line-strong text-ink-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
            <Menu size={18} />
          </button>
          <Marca className="h-7 w-7 text-rose lg:hidden" />
          <form
            role="search"
            className="relative hidden max-w-sm flex-1 sm:block"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`/clientes?q=${encodeURIComponent(q)}`)
            }}
          >
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente, cédula u operación"
              aria-label="Buscar cliente, cédula u operación"
              className="h-9 w-full rounded-[9px] border border-line bg-panel pr-3 pl-9 text-[0.85rem] text-ink placeholder:text-ink-3 hover:border-line-strong focus-visible:border-rose focus-visible:outline-none"
            />
          </form>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Reloj />
            <button
              onClick={() => setOscuro(!oscuro)}
              className="grid h-9 w-9 place-items-center rounded-[9px] border border-line-strong bg-panel text-ink-2 transition-colors hover:text-ink"
              aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={oscuro ? 'Modo claro' : 'Modo oscuro'}
            >
              {oscuro ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-soft text-[0.8rem] font-semibold text-rose-ink" aria-hidden="true">{USUARIA_DEMO.iniciales}</span>
              <div className="hidden leading-tight xl:block">
                <p className="text-[0.82rem] font-medium">{USUARIA_DEMO.nombre}</p>
                <p className="text-[0.72rem] text-ink-3">{USUARIA_DEMO.cargo}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9 print:p-0">
        <Outlet />
      </main>
    </div>
  )
}
