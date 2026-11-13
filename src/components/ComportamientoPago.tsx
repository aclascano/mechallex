import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtFecha } from '../domain/fechas'
import { cx, decimal, dinero, porcentaje } from '../lib/formato'
import type { comportamientoCliente } from '../services/api'
import { ejeProps, Leyenda, rejillaProps } from './graficos'
import { Panel } from './ui'

type Datos = ReturnType<typeof comportamientoCliente>

const DESCRIPCION: Record<string, string> = {
  A: 'Paga a tiempo casi siempre y está al día.',
  B: 'Buen pagador con atrasos cortos ocasionales.',
  C: 'Atrasos frecuentes; conviene seguimiento preventivo.',
  D: 'Mora entre 61 y 120 días.',
  E: 'Mora mayor a 120 días.',
}

const colorDias = (dias: number, pagada: boolean) => (!pagada ? 'var(--bad)' : dias <= 3 ? 'var(--rose)' : dias <= 30 ? 'var(--warn)' : 'var(--bad)')

/** Comportamiento de pago del cliente: puntualidad, atrasos y calificación interna. */
export function ComportamientoPago({ d }: { d: Datos }) {
  if (d.cuotasVencidas === 0) {
    return <Panel titulo="Comportamiento de pago"><p className="text-[0.85rem] text-ink-3">Todavía no tiene cuotas vencidas: no hay historial de pago que evaluar.</p></Panel>
  }
  const partes = [
    { label: 'A tiempo', n: d.aTiempo, color: 'var(--rose)' },
    { label: 'Con atraso', n: d.conAtraso, color: 'var(--warn)' },
    { label: 'Impagas', n: d.impagas, color: 'var(--bad)' },
  ]
  return (
    <Panel titulo="Comportamiento de pago" detalle={`${d.cuotasVencidas} cuotas vencidas en su historial · ${d.pagos} pagos`} cuerpo="">
      <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="border-b border-line p-5 lg:border-r lg:border-b-0">
          <div className="flex items-center gap-4">
            <span className={cx('display grid h-16 w-16 shrink-0 place-items-center rounded-[14px] text-[2.2rem] leading-none', d.calificacion <= 'B' ? 'bg-rose-soft text-rose-ink' : d.calificacion === 'C' ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad')} aria-label={`Calificación ${d.calificacion}`}>{d.calificacion}</span>
            <div>
              <p className="text-[0.75rem] text-ink-3">Calificación interna</p>
              <p className="text-[0.85rem] text-ink-2">{DESCRIPCION[d.calificacion]}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div><dt className="text-[0.75rem] text-ink-3">Puntualidad</dt><dd className="display tabular text-[1.5rem] leading-tight">{porcentaje(d.puntualidad)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Atraso promedio</dt><dd className="display tabular text-[1.5rem] leading-tight">{decimal(d.atrasoPromedio)} d</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Atraso máximo</dt><dd className="tabular font-semibold">{d.atrasoMax} días</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Mora actual</dt><dd className={cx('tabular font-semibold', d.moraActual > 0 && 'text-bad')}>{d.moraActual} días</dd></div>
          </dl>
          <div className="mt-5">
            <div className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
              {partes.filter((p) => p.n).map((p) => <span key={p.label} style={{ width: `${(p.n / d.cuotasVencidas) * 100}%`, background: p.color }} />)}
            </div>
            <ul className="mt-2 space-y-1 text-[0.78rem]">
              {partes.map((p) => <li key={p.label} className="flex justify-between"><span className="flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />{p.label}</span><span className="tabular font-medium">{p.n}</span></li>)}
            </ul>
          </div>
          <p className="mt-4 text-[0.72rem] text-ink-3">“A tiempo” admite hasta 3 días de tolerancia. La calificación es una regla de la demo.</p>
        </div>
        <div className="min-w-0 p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[0.85rem] font-semibold">Días de atraso por cuota <span className="font-normal text-ink-3">· últimas {d.serie.length}</span></h3>
            <Leyenda items={[{ color: 'var(--rose)', label: 'A tiempo' }, { color: 'var(--warn)', label: 'Hasta 30 días' }, { color: 'var(--bad)', label: 'Más de 30 o impaga' }]} />
          </div>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.serie.map((s) => ({ ...s, valor: Math.max(s.dias, 0.6) }))} margin={{ top: 6, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid {...rejillaProps} />
                <XAxis dataKey="etiqueta" {...ejeProps} interval="preserveStartEnd" tick={{ ...ejeProps.tick, fontSize: 10.5 }} />
                <YAxis {...ejeProps} width={34} allowDecimals={false} />
                <ReferenceLine y={3} stroke="var(--ink-3)" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ fill: 'var(--panel-2)' }}
                  content={({ active, payload }) => {
                    const s = active && payload?.[0]?.payload as (Datos['serie'][number] | undefined)
                    if (!s) return null
                    return (
                      <div className="tabular rounded-[10px] border border-line bg-panel px-3 py-2 text-[0.78rem] shadow-panel">
                        <p className="font-medium">{s.op} · cuota {s.n}</p>
                        <p className="text-ink-3">Vence {fmtFecha(s.fecha)}</p>
                        <p>{s.pagada ? (s.dias ? `Pagada con ${s.dias} días de atraso` : 'Pagada a tiempo') : `Impaga hace ${s.dias} días`}</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="valor" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                  {d.serie.map((s, i) => <Cell key={i} fill={colorDias(s.dias, s.pagada)} fillOpacity={s.pagada ? 1 : 0.55} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <dl className="tabular mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[0.82rem] sm:grid-cols-4">
            <div><dt className="text-ink-3">Total pagado</dt><dd className="font-semibold">{dinero(d.totalPagado)}</dd></div>
            <div><dt className="text-ink-3">Intereses pagados</dt><dd className="font-semibold">{dinero(d.interesPagado)}</dd></div>
            <div><dt className="text-ink-3">Recargos pagados</dt><dd className="font-semibold">{dinero(d.moraPagada)}</dd></div>
            <div><dt className="text-ink-3">Medio habitual</dt><dd className="font-semibold">{d.porMedio[0]?.medio ?? '—'}</dd></div>
          </dl>
        </div>
      </div>
    </Panel>
  )
}
