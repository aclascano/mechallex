import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ejeProps, Leyenda, rejillaProps, TooltipMx } from '../components/graficos'
import { Encabezado, EsqueletoPagina, Panel, Tabla, Td, Th } from '../components/ui'
import { fmtMes } from '../domain/fechas'
import { compacto, dinero, porcentaje , decimal } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { obtenerReportes } from '../services/api'

function Barras({ datos, alto = 220 }: { datos: { clave: string; saldo: number; vencida: number }[]; alto?: number }) {
  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos.map((x) => ({ ...x, vigente: x.saldo - x.vencida }))} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid {...rejillaProps} horizontal={false} vertical />
          <XAxis type="number" {...ejeProps} tickFormatter={compacto} />
          <YAxis type="category" dataKey="clave" {...ejeProps} width={96} />
          <Tooltip cursor={{ fill: 'var(--panel-2)' }} content={(p) => <TooltipMx {...p} formato={(v) => dinero(v)} />} />
          <Bar isAnimationActive={false} dataKey="vigente" name="Hasta 30 días" stackId="a" fill="var(--t0)" />
          <Bar isAnimationActive={false} dataKey="vencida" name="Vencida (+30 días)" stackId="a" fill="var(--rose)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function PaginaReportes() {
  const { data: d } = useServicio(obtenerReportes)
  if (!d) return <EsqueletoPagina />
  const evolucion = d.meses.map((m) => ({ mes: fmtMes(m.mes, true), Saldo: m.saldo, Morosidad: +(m.morosidad * 100).toFixed(2) }))
  const comp = d.composicionMes
  const totalComp = comp.capital + comp.interes + comp.mora || 1

  return (
    <div>
      <Encabezado titulo="Reportes" descripcion="Evolución y composición de la cartera. Cada gráfico tiene su tabla de valores para leerlo sin depender del color." />
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel titulo="Saldo de cartera y morosidad" detalle="Últimos 12 meses, al cierre de cada mes" className="xl:col-span-2" acciones={<Leyenda items={[{ color: 'var(--t0)', label: 'Saldo' }, { color: 'var(--rose-ink)', label: 'Morosidad', forma: 'linea' }]} />}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolucion} margin={{ top: 6, right: 0, left: -4, bottom: 0 }}>
                <CartesianGrid {...rejillaProps} />
                <XAxis dataKey="mes" {...ejeProps} />
                <YAxis yAxisId="s" {...ejeProps} tickFormatter={compacto} width={56} />
                <YAxis yAxisId="m" orientation="right" {...ejeProps} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip cursor={{ fill: 'var(--panel-2)' }} content={(p) => <TooltipMx {...p} formato={(v, it) => (it.dataKey === 'Morosidad' ? `${decimal(v)} %` : dinero(v))} />} />
                <Bar isAnimationActive={false} yAxisId="s" dataKey="Saldo" fill="var(--t0)" fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Line isAnimationActive={false} yAxisId="m" dataKey="Morosidad" stroke="var(--rose-ink)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--panel)', strokeWidth: 1.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel titulo="Composición de lo recuperado" detalle="Pagos del mes en curso">
          <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`Capital ${dinero(comp.capital)}, interés ${dinero(comp.interes)}, mora ${dinero(comp.mora)}`}>
            <span style={{ width: `${(comp.capital / totalComp) * 100}%` }} className="bg-t0" />
            <span style={{ width: `${(comp.interes / totalComp) * 100}%` }} className="bg-rose" />
            <span style={{ width: `${(comp.mora / totalComp) * 100}%` }} className="bg-t5" />
          </div>
          <dl className="tabular mt-5 space-y-3 text-[0.875rem]">
            {[['Capital', comp.capital, 'var(--t0)'], ['Interés', comp.interes, 'var(--rose)'], ['Recargo por mora', comp.mora, 'var(--t5)']].map(([k, v, c]) => (
              <div key={k as string} className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-ink-2"><span className="h-2 w-2 rounded-full" style={{ background: c as string }} aria-hidden="true" />{k}</dt>
                <dd><span className="font-medium">{dinero(v as number)}</span> <span className="text-[0.75rem] text-ink-3">{porcentaje((v as number) / totalComp)}</span></dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-line pt-3 text-[0.8rem] text-ink-3">Medios de pago, últimos tres meses</p>
          <ul className="tabular mt-2 space-y-1.5 text-[0.8rem]">
            {d.porMedio.map((m) => (
              <li key={m.medio} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2">
                <span className="truncate text-ink-2">{m.medio}</span>
                <span className="h-1.5 rounded-full bg-panel-2"><span className="block h-full rounded-full bg-steel" style={{ width: `${(m.monto / d.porMedio[0].monto) * 100}%` }} /></span>
                <span className="text-right font-medium">{compacto(m.monto)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel titulo="Cartera por producto" acciones={<Leyenda items={[{ color: 'var(--t0)', label: 'Hasta 30 días' }, { color: 'var(--rose)', label: 'Vencida' }]} />}>
          <Barras datos={d.porProducto} alto={300} />
        </Panel>
        <Panel titulo="Cartera por ciudad" acciones={<Leyenda items={[{ color: 'var(--t0)', label: 'Hasta 30 días' }, { color: 'var(--rose)', label: 'Vencida' }]} />}>
          <Barras datos={d.porCiudad.slice(0, 8)} alto={300} />
        </Panel>
        <Panel titulo="Desempeño por gestor" detalle="Cartera asignada y su morosidad" cuerpo="">
          <Tabla etiqueta="Desempeño por gestor">
            <thead><tr><Th>Gestor</Th><Th derecha>Operaciones</Th><Th derecha>Saldo</Th><Th derecha>Morosidad</Th></tr></thead>
            <tbody>
              {d.porGestor.map((g) => (
                <tr key={g.clave}>
                  <Td className="font-medium whitespace-nowrap">{g.clave}</Td>
                  <Td derecha>{g.operaciones}</Td>
                  <Td derecha>{compacto(g.saldo)}</Td>
                  <Td derecha className={g.morosidad > 0.1 ? 'font-medium text-bad' : ''}>{porcentaje(g.morosidad)}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <div className="border-t border-line px-5 py-4">
            <p className="mb-2 text-[0.8rem] text-ink-3">Propia frente a cedida</p>
            {d.porOrigen.map((o) => (
              <p key={o.clave} className="tabular flex justify-between text-[0.85rem]"><span className="text-ink-2">{o.clave}</span><span><span className="font-medium">{compacto(o.saldo)}</span> <span className="text-ink-3">· mora {porcentaje(o.morosidad)}</span></span></p>
            ))}
          </div>
        </Panel>
      </div>

      <Panel titulo="Valores mensuales" detalle="Datos de los gráficos de evolución" cuerpo="" className="mt-4">
        <Tabla etiqueta="Valores mensuales">
          <thead><tr><Th>Mes</Th><Th derecha>Cuotas exigibles</Th><Th derecha>Recuperado</Th><Th derecha>Saldo al cierre</Th><Th derecha>Vencida +30</Th><Th derecha>Morosidad</Th></tr></thead>
          <tbody>
            {d.meses.map((m) => (
              <tr key={m.mes}>
                <Td>{fmtMes(m.mes, true)}</Td>
                <Td derecha>{dinero(m.exigible)}</Td>
                <Td derecha>{dinero(m.recuperado)}</Td>
                <Td derecha>{dinero(m.saldo)}</Td>
                <Td derecha>{dinero(m.vencida)}</Td>
                <Td derecha className="font-medium">{porcentaje(m.morosidad)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Panel>
    </div>
  )
}
