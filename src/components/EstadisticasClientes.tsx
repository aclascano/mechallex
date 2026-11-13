import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cx, dinero, entero, porcentaje } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { estadisticasClientes } from '../services/api'
import { COLOR_TRAMO, Esqueleto } from './ui'

const CLAVE = 'mx-clientes-indicadores'
const leer = () => { try { return localStorage.getItem(CLAVE) !== '0' } catch { return true } }

function Barras({ items, formato = entero }: { items: { label: string; n: number; nota?: string }[]; formato?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.n))
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-2.5 text-[0.8rem]">
          <span className="truncate text-ink-2">{i.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="block h-full rounded-full bg-rose" style={{ width: `${(i.n / max) * 100}%` }} /></span>
          <span className="tabular text-right font-medium">{formato(i.n)}{i.nota && <span className="ml-1 font-normal text-ink-3">{i.nota}</span>}</span>
        </li>
      ))}
    </ul>
  )
}

function Tarjeta({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-[12px] border border-line p-4', className)}>
      <h3 className="mb-3 text-[0.8rem] font-semibold text-ink-2">{titulo}</h3>
      {children}
    </section>
  )
}

/** Indicadores de la base de clientes: tamaño, crecimiento, mora y composición. */
export function EstadisticasClientes() {
  const { data: e } = useServicio(estadisticasClientes)
  const [abierto, setAbierto] = useState(leer)
  const alternar = () => {
    setAbierto((v) => {
      try { localStorage.setItem(CLAVE, v ? '0' : '1') } catch { /* sin almacenamiento */ }
      return !v
    })
  }
  if (!e) return <Esqueleto className="mb-4 h-32" />
  const cifras: [string, string, string][] = [
    ['Clientes activos', entero(e.activos), `${entero(e.nuevosAnio)} nuevos este año · ${entero(e.inactivos)} inactivos`],
    ['Con deuda vigente', entero(e.conDeuda), `${porcentaje(e.conDeuda / Math.max(1, e.activos))} de los activos`],
    ['En mora', entero(e.enMora), `${porcentaje(e.enMora / Math.max(1, e.conDeuda))} de los que deben`],
    ['Saldo promedio', dinero(e.saldoPromedio), `ingreso promedio ${dinero(e.ingresoPromedio)}`],
  ]
  const totalTramo = Math.max(1, e.porTramo.reduce((s, t) => s + t.n, 0))
  const maxAltas = Math.max(1, ...e.altasPorAnio.map((a) => a.n))
  return (
    <section aria-label="Indicadores de clientes" className="mb-4 rounded-[14px] border border-line bg-panel">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {cifras.map(([k, v, nota], i) => (
          <div key={k} className={cx('min-w-0 p-4 sm:p-5', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line lg:border-t-0', i === 2 && 'lg:border-l')}>
            <p className="text-[0.75rem] text-ink-3">{k}</p>
            <p className="display tabular mt-1 text-[1.6rem] leading-tight sm:text-[1.85rem]">{v}</p>
            <p className="mt-1 text-[0.75rem] text-ink-3">{nota}</p>
          </div>
        ))}
      </div>
      <button onClick={alternar} aria-expanded={abierto} className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2 text-[0.78rem] font-medium text-ink-3 hover:text-ink">
        {abierto ? 'Ocultar detalle' : 'Ver detalle de la base'}<ChevronDown size={14} className={cx('transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-3" style={{ animation: 'aparecer 220ms var(--ease-out-expo) both' }}>
          <Tarjeta titulo="Clientes con deuda por antigüedad de mora">
            <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
              {e.porTramo.filter((t) => t.n).map((t) => <span key={t.id} style={{ width: `${(t.n / totalTramo) * 100}%`, background: COLOR_TRAMO[t.id] }} />)}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[0.78rem]">
              {e.porTramo.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_TRAMO[t.id] }} aria-hidden="true" />{t.corto === 'Al día' ? 'Al día' : `${t.corto} días`}</span>
                  <span className="tabular font-medium">{t.n}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
          <Tarjeta titulo="Altas de clientes por año">
            <div className="flex h-[92px] items-end gap-1.5" role="img" aria-label={e.altasPorAnio.map((a) => `${a.anio}: ${a.n}`).join(', ')}>
              {e.altasPorAnio.map((a) => (
                <div key={a.anio} className="flex flex-1 flex-col items-center gap-1">
                  <span className="tabular text-[0.68rem] text-ink-3">{a.n}</span>
                  <span className="w-full rounded-t-[4px] bg-rose" style={{ height: `${Math.max(4, (a.n / maxAltas) * 60)}px` }} />
                  <span className="tabular text-[0.68rem] text-ink-3">{a.anio.slice(2)}</span>
                </div>
              ))}
            </div>
          </Tarjeta>
          <Tarjeta titulo="Edad (personas naturales)">
            <Barras items={e.porEdad.map((x) => ({ label: `${x.label} años`, n: x.n }))} />
          </Tarjeta>
          <Tarjeta titulo="Ciudades con más clientes">
            <Barras items={e.porCiudad.map((x) => ({ label: x.clave, n: x.n, nota: x.mora ? `· ${x.mora} en mora` : undefined }))} />
          </Tarjeta>
          <Tarjeta titulo="Por gestor">
            <Barras items={e.porGestor.map((x) => ({ label: x.clave, n: x.n, nota: `· ${porcentaje(x.mora / Math.max(1, x.n))} mora` }))} />
          </Tarjeta>
          <Tarjeta titulo="Por segmento">
            <Barras items={e.porSegmento.map((x) => ({ label: x.clave, n: x.n, nota: `· ${dinero(x.saldo)}` }))} />
          </Tarjeta>
        </div>
      )}
    </section>
  )
}
