import { useState } from 'react'
import { Link } from 'react-router'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ejeProps, Leyenda, rejillaProps, TooltipMx } from '../components/graficos'
import { Encabezado, EsqueletoPagina, Insignia, Panel, Tabla, Td, Th } from '../components/ui'
import { fmtMes } from '../domain/fechas'
import { CASTIGO_MENSUAL, ESTADOS } from '../domain/provisiones'
import { compacto, cx, dinero, entero, porcentaje } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { obtenerRiesgo } from '../services/api'

const NOMBRE_ESTADO: Record<string, string> = { 'al-dia': 'Al día', '1-30': '1–30', '31-60': '31–60', '61-90': '61–90', '91-180': '91–180', '180+': '+180', cancelada: 'Cancelada' }
const ESCENARIOS = [0, 0.1, 0.2, 0.3, 0.5]

export default function PaginaRiesgo() {
  const [estres, setEstres] = useState(0)
  const { data: d } = useServicio(() => obtenerRiesgo(estres), [estres])
  if (!d) return <EsqueletoPagina />

  const p3 = d.proyeccion[3]
  const p6 = d.proyeccion[6]
  const p12 = d.proyeccion[12]
  const cifras: [string, string, string, string?][] = [
    ['Provisión requerida', dinero(d.requerida), `${porcentaje(d.requerida / d.saldo)} del saldo de cartera`],
    ['Constituida al cierre anterior', dinero(d.constituida), 'provisión requerida al fin de octubre'],
    [d.porConstituir >= 0 ? 'Por constituir este mes' : 'Excedente de provisión', dinero(Math.abs(d.porConstituir)), 'gasto de provisión del mes', d.porConstituir > 0 ? 'text-bad' : 'text-ok'],
    ['Pérdida esperada a 12 meses', dinero(d.perdidaEsperada), `PD ponderada ${porcentaje(d.pdPromedio)} · cobertura de vencida ${porcentaje(d.coberturaVencida)}`],
  ]

  return (
    <div>
      <Encabezado
        titulo="Riesgo y provisiones"
        descripcion="Calificación de la cartera, provisiones requeridas, pérdida esperada y su proyección. Rodamiento y pérdida esperada se calculan sobre la cartera de la demo; porcentajes y pesos del score son parámetros de demostración."
      />

      <section aria-label="Resumen de provisiones" className="mb-4 grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-panel lg:grid-cols-4">
        {cifras.map(([k, v, n, color], i) => (
          <div key={k} className={cx('min-w-0 p-4 sm:p-5', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line lg:border-t-0', i === 2 && 'lg:border-l')}>
            <p className="text-[0.75rem] text-ink-3">{k}</p>
            <p className={cx('display tabular mt-1 text-[1.55rem] leading-tight sm:text-[1.85rem]', color)}>{v}</p>
            <p className="mt-1 text-[0.75rem] text-ink-3">{n}</p>
          </div>
        ))}
      </section>

      <Panel
        titulo="Proyección de provisiones"
        detalle={`Cartera actual sin nuevos desembolsos · rodamiento estimado con ${entero(d.observaciones)} observaciones mensuales · amortización ${porcentaje(d.amortizacion)} al mes · castigo de ${Math.round(CASTIGO_MENSUAL * 100)} % mensual de la cartera +180`}
        acciones={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.8rem] text-ink-3">Estrés</span>
            <div role="radiogroup" aria-label="Escenario de estrés" className="inline-flex rounded-[10px] border border-line-strong bg-panel p-0.5">
              {ESCENARIOS.map((s) => (
                <button key={s} role="radio" aria-checked={estres === s} onClick={() => setEstres(s)} className={cx('tabular h-8 rounded-[8px] px-2.5 text-[0.8rem] font-medium transition-colors', estres === s ? 'bg-rose-soft text-rose-ink' : 'text-ink-2 hover:text-ink')}>
                  {s === 0 ? 'Base' : `+${s * 100} %`}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <div className="mb-2"><Leyenda items={[{ color: 'var(--rose)', label: 'Provisión requerida' }, { color: 'var(--steel)', label: 'Saldo con más de 30 días', forma: 'linea' }]} /></div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.proyeccion.map((p, i) => ({ ...p, etiqueta: i === 0 ? 'Hoy' : fmtMes(p.mes, true) }))} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid {...rejillaProps} />
                  <XAxis dataKey="etiqueta" {...ejeProps} />
                  <YAxis {...ejeProps} tickFormatter={compacto} width={52} />
                  <Tooltip cursor={{ fill: 'var(--panel-2)' }} content={(p) => <TooltipMx {...p} formato={(v) => dinero(v)} />} />
                  <Bar isAnimationActive={false} dataKey="provision" name="Provisión requerida" fill="var(--rose)" radius={[4, 4, 0, 0]} maxBarSize={34} />
                  <Line isAnimationActive={false} dataKey="enMora" name="Saldo con más de 30 días" stroke="var(--steel)" strokeWidth={2} dot={false} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <dl className="grid content-start gap-3">
            {[['En 3 meses', p3], ['En 6 meses', p6], ['En 12 meses', p12]].map(([k, p]) => {
              const x = p as typeof p3
              const delta = x.provision - d.requerida
              return (
                <div key={k as string} className="rounded-[12px] border border-line p-3.5">
                  <dt className="text-[0.75rem] text-ink-3">{k as string}</dt>
                  <dd className="display tabular text-[1.35rem] leading-tight">{dinero(x.provision)}</dd>
                  <dd className={cx('tabular text-[0.78rem] font-medium', delta > 0 ? 'text-bad' : 'text-ok')}>{delta > 0 ? '+' : '−'}{dinero(Math.abs(delta))} frente a hoy</dd>
                  <dd className="tabular text-[0.75rem] text-ink-3">saldo vencido {dinero(x.enMora)}</dd>
                </div>
              )
            })}
          </dl>
        </div>
        <p className="mt-3 text-[0.75rem] text-ink-3">El estrés sube la probabilidad de pasar a un tramo peor (por ejemplo, +20 % = cada rodamiento hacia atrás es 1,2 veces más probable).</p>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel titulo="Calificación de la cartera" detalle="Por días de mora; cada categoría tiene su porcentaje de provisión." cuerpo="">
          <Tabla etiqueta="Calificación de la cartera">
            <thead><tr><Th>Categoría</Th><Th>Días de mora</Th><Th derecha>% provisión</Th><Th derecha>Saldo</Th><Th derecha>Provisión</Th></tr></thead>
            <tbody>
              {d.porCategoria.map((c) => (
                <tr key={c.id} className={cx(!c.operaciones && 'text-ink-3')}>
                  <Td className="font-semibold">{c.id}</Td>
                  <Td className="tabular text-ink-2">{c.hasta === Infinity ? `más de ${c.desde - 1}` : c.desde === c.hasta ? 'al día' : `${c.desde}–${c.hasta}`}</Td>
                  <Td derecha className="text-ink-2">{porcentaje(c.tasa)}</Td>
                  <Td derecha>{dinero(c.saldo)}<span className="block text-[0.72rem] text-ink-3">{c.operaciones} op.</span></Td>
                  <Td derecha className="font-medium">{dinero(c.provision)}</Td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold"><Td>Total</Td><Td /><Td /><Td derecha>{dinero(d.saldo)}</Td><Td derecha>{dinero(d.requerida)}</Td></tr></tfoot>
          </Tabla>
        </Panel>

        <Panel titulo="Cartera por score de riesgo" detalle="Score de comportamiento de cada deudor y cuántos tienen hoy más de 30 días de mora." cuerpo="">
          <ul className="divide-y divide-line">
            {d.porBanda.map((b) => {
              const tono = b.banda === 'Alto riesgo' ? 'bg-bad' : b.banda === 'Regular' ? 'bg-warn' : b.banda === 'Bueno' ? 'bg-rose/55' : 'bg-rose'
              return (
                <li key={b.banda} className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-[0.85rem]">
                  <span className="flex items-center gap-2 font-medium"><span className={cx('h-2.5 w-2.5 rounded-full', tono)} aria-hidden="true" />{b.banda}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className={cx('block h-full rounded-full', tono)} style={{ width: `${(b.saldo / d.saldo) * 100}%` }} /></span>
                  <span className="tabular text-right"><span className="font-semibold">{dinero(b.saldo)}</span><span className="block text-[0.72rem] text-ink-3">{b.operaciones} op. · {b.enMora} en mora</span></span>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel className="xl:col-span-2" titulo="Matriz de rodamiento mensual" detalle={`Probabilidad de pasar de un tramo (fila) a otro (columna) en un mes${estres ? `, con estrés +${estres * 100} %` : ''}.`} cuerpo="">
          <Tabla etiqueta="Matriz de rodamiento">
            <thead><tr><Th>Desde \ hacia</Th>{ESTADOS.map((e) => <Th key={e} derecha>{NOMBRE_ESTADO[e]}</Th>)}</tr></thead>
            <tbody>
              {d.matriz.slice(0, -1).map((fila, i) => (
                <tr key={ESTADOS[i]}>
                  <Td className="font-medium whitespace-nowrap">{NOMBRE_ESTADO[ESTADOS[i]]}</Td>
                  {fila.map((p, j) => (
                    <td key={j} className="border-b border-line px-2 py-2 text-right text-[0.8rem]">
                      <span className={cx('tabular inline-block min-w-[3.2rem] rounded-[6px] px-1.5 py-1', p === 0 && 'text-ink-3', j > i && j < ESTADOS.length - 1 && p > 0 && 'font-semibold')}
                        style={{ background: p > 0 ? `color-mix(in oklch, ${j > i && j < ESTADOS.length - 1 ? 'var(--bad)' : 'var(--rose)'} ${Math.round(Math.min(1, p) * 55)}%, transparent)` : undefined }}>
                        {p === 0 ? '—' : porcentaje(p)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Tabla>
        </Panel>

        <Panel className="xl:col-span-2" titulo="Pérdida esperada" detalle="PD × pérdida si no paga (según la garantía) × saldo." cuerpo="">
          <Tabla etiqueta="Pérdida esperada por producto y gestor">
            <thead><tr><Th>Grupo</Th><Th derecha>Saldo</Th><Th derecha>Provisión</Th><Th derecha>Pérdida esperada</Th></tr></thead>
            <tbody>
              <tr><Td className="text-[0.72rem] font-medium tracking-wide text-ink-3 uppercase">Por producto</Td><Td /><Td /><Td /></tr>
              {d.porProducto.map((g) => <tr key={'p' + g.clave}><Td>{g.clave}<span className="ml-1.5 text-[0.75rem] text-ink-3">{g.operaciones}</span></Td><Td derecha className="text-ink-2">{dinero(g.saldo)}</Td><Td derecha className="text-ink-2">{dinero(g.provision)}</Td><Td derecha className="font-medium">{dinero(g.perdidaEsperada)}</Td></tr>)}
              <tr><Td className="text-[0.72rem] font-medium tracking-wide text-ink-3 uppercase">Por gestor</Td><Td /><Td /><Td /></tr>
              {d.porGestor.map((g) => <tr key={'g' + g.clave}><Td>{g.clave}<span className="ml-1.5 text-[0.75rem] text-ink-3">{g.operaciones}</span></Td><Td derecha className="text-ink-2">{dinero(g.saldo)}</Td><Td derecha className="text-ink-2">{dinero(g.provision)}</Td><Td derecha className="font-medium">{dinero(g.perdidaEsperada)}</Td></tr>)}
            </tbody>
          </Tabla>
        </Panel>
      </div>

      <Panel titulo="Operaciones con mayor pérdida esperada" className="mt-4" cuerpo="">
        <Tabla etiqueta="Operaciones con mayor pérdida esperada">
          <thead><tr><Th>Operación</Th><Th>Cliente</Th><Th>Categoría</Th><Th derecha>Score</Th><Th derecha>PD</Th><Th derecha>Pérdida si no paga</Th><Th derecha>Saldo</Th><Th derecha>Pérdida esperada</Th></tr></thead>
          <tbody>
            {d.mayores.map((m) => (
              <tr key={m.id} className="hover:bg-panel-2/60">
                <Td><Link to={`/operaciones/${m.id}`} className="font-medium whitespace-nowrap hover:text-rose-ink">{m.id}</Link></Td>
                <Td><Link to={`/clientes/${m.clienteId}`} className="hover:text-rose-ink">{m.cliente}</Link></Td>
                <Td><Insignia tono={m.categoria.startsWith('A') ? 'neutro' : m.categoria.startsWith('B') ? 'warn' : 'bad'}>{m.categoria}</Insignia></Td>
                <Td derecha>{m.score}</Td>
                <Td derecha>{porcentaje(m.pd)}</Td>
                <Td derecha className="text-ink-2">{porcentaje(m.lgd)}</Td>
                <Td derecha className="text-ink-2">{dinero(m.saldo)}</Td>
                <Td derecha className="font-semibold">{dinero(m.perdidaEsperada)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Panel>
    </div>
  )
}
