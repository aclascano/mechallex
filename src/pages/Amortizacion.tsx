import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ejeProps, Leyenda, rejillaProps, TooltipMx } from '../components/graficos'
import { Campo, Encabezado, Entrada, Panel, Segmentado, Selector, Tabla, Td, Th } from '../components/ui'
import { generarTabla, recalcular, round2, totales, type ModoRecalculo, type Sistema } from '../domain/amortizacion'
import { fmtFecha } from '../domain/fechas'
import { HOY } from '../mocks/catalogos'
import { compacto, cx, dinero } from '../lib/formato'

const num = (s: string) => Number(s.replace(',', '.'))

export default function PaginaAmortizacion() {
  const [monto, setMonto] = useState('12000')
  const [tasa, setTasa] = useState('15.6')
  const [plazo, setPlazo] = useState('24')
  const [sistema, setSistema] = useState<Sistema>('frances')
  const [abono, setAbono] = useState('2000')
  const [despuesDe, setDespuesDe] = useState('6')
  const [modo, setModo] = useState<ModoRecalculo>('reducir-cuota')
  const [conAbono, setConAbono] = useState(true)

  const errores: string[] = []
  if (!(num(monto) >= 100)) errores.push('El monto debe ser de al menos $100.')
  if (!(num(tasa) >= 0 && num(tasa) <= 60)) errores.push('La tasa debe estar entre 0 % y 60 %.')
  if (!(Number.isInteger(num(plazo)) && num(plazo) >= 1 && num(plazo) <= 360)) errores.push('El plazo debe ser un número entero de meses (1 a 360).')
  const ok = errores.length === 0

  const params = useMemo(() => ({ monto: num(monto), tasaAnual: num(tasa), plazoMeses: num(plazo), sistema, fechaDesembolso: HOY }), [monto, tasa, plazo, sistema])
  const base = useMemo(() => (ok ? generarTabla(params) : []), [params, ok])
  const k = Math.min(Math.max(0, Math.round(num(despuesDe) || 0)), Math.max(0, num(plazo) - 1))
  const nueva = useMemo(() => (ok && conAbono && num(abono) > 0 ? recalcular(params, base, k, num(abono), modo) : base), [ok, conAbono, abono, params, base, k, modo])
  const tb = totales(base)
  const tn = totales(nueva)
  const ahorro = round2(tb.interes - tn.interes)

  // comparación francés vs alemán con los mismos parámetros
  const otro = useMemo(() => (ok ? generarTabla({ ...params, sistema: sistema === 'frances' ? 'aleman' : 'frances' }) : []), [params, sistema, ok])
  const datos = base.map((c, i) => ({ n: c.n, [sistema === 'frances' ? 'Francés' : 'Alemán']: c.cuota, [sistema === 'frances' ? 'Alemán' : 'Francés']: otro[i]?.cuota }))

  return (
    <div>
      <Encabezado titulo="Tabla de amortización" descripcion="Simula un crédito con sistema francés (cuota fija) o alemán (capital fijo) y recalcula el saldo con un abono extraordinario a capital." />
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel titulo="Condiciones del crédito">
            <div className="space-y-4">
              <Segmentado etiqueta="Sistema de amortización" valor={sistema} onCambio={setSistema} opciones={[{ id: 'frances', label: 'Francés' }, { id: 'aleman', label: 'Alemán' }]} />
              <Campo etiqueta="Monto (USD)"><Entrada inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Tasa nominal anual (%)"><Entrada inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)} /></Campo>
                <Campo etiqueta="Plazo (meses)"><Entrada inputMode="numeric" value={plazo} onChange={(e) => setPlazo(e.target.value)} /></Campo>
              </div>
              {errores.map((e) => <p key={e} role="alert" className="text-[0.8rem] text-bad">{e}</p>)}
            </div>
          </Panel>
          <Panel titulo="Abono extraordinario" acciones={<label className="flex items-center gap-2 text-[0.8rem] text-ink-2"><input type="checkbox" checked={conAbono} onChange={(e) => setConAbono(e.target.checked)} className="h-4 w-4 accent-[var(--rose)]" /> Aplicar</label>}>
            <fieldset disabled={!conAbono} className={cx('space-y-4 transition-opacity', !conAbono && 'opacity-50')}>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Monto a capital"><Entrada inputMode="decimal" value={abono} onChange={(e) => setAbono(e.target.value)} /></Campo>
                <Campo etiqueta="Después de la cuota"><Entrada inputMode="numeric" value={despuesDe} onChange={(e) => setDespuesDe(e.target.value)} /></Campo>
              </div>
              <Campo etiqueta="Recalcular">
                <Selector value={modo} onChange={(e) => setModo(e.target.value as ModoRecalculo)}>
                  <option value="reducir-cuota">Mantener plazo, bajar la cuota</option>
                  <option value="reducir-plazo">Mantener cuota, acortar el plazo</option>
                </Selector>
              </Campo>
            </fieldset>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="grid overflow-hidden rounded-[14px] border border-line bg-panel sm:grid-cols-4" aria-label="Resumen">
            {[
              ['Primera cuota', dinero(nueva[0]?.cuota ?? 0)],
              ['Total de intereses', dinero(tn.interes)],
              ['Cuotas', String(nueva.length)],
              ['Ahorro en intereses', conAbono ? dinero(Math.max(0, ahorro)) : '—'],
            ].map(([k2, v], i) => (
              <div key={k2} className={cx('px-5 py-4', i > 0 && 'border-t border-line sm:border-t-0 sm:border-l')}>
                <p className="text-[0.78rem] text-ink-3">{k2}</p>
                <p className={cx('display tabular mt-1 text-[1.5rem] leading-none font-medium', i === 3 && conAbono && ahorro > 0 && 'text-ok')}>{v}</p>
              </div>
            ))}
          </section>

          <Panel titulo="Cuota mes a mes" detalle="Mismo monto, tasa y plazo en ambos sistemas" acciones={<Leyenda items={[{ color: 'var(--rose)', label: sistema === 'frances' ? 'Francés' : 'Alemán', forma: 'linea' }, { color: 'var(--steel)', label: sistema === 'frances' ? 'Alemán' : 'Francés', forma: 'linea' }]} />}>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={datos} margin={{ top: 6, right: 6, left: -4, bottom: 0 }}>
                  <CartesianGrid {...rejillaProps} />
                  <XAxis dataKey="n" {...ejeProps} />
                  <YAxis {...ejeProps} tickFormatter={compacto} width={50} domain={['auto', 'auto']} />
                  <Tooltip content={(p) => <TooltipMx {...p} titulo={(l) => `Cuota ${l}`} formato={(v) => dinero(v)} />} />
                  <Area isAnimationActive={false} type="stepAfter" dataKey={sistema === 'frances' ? 'Alemán' : 'Francés'} stroke="var(--steel)" fill="var(--steel)" fillOpacity={0.06} strokeWidth={1.5} />
                  <Area isAnimationActive={false} type="stepAfter" dataKey={sistema === 'frances' ? 'Francés' : 'Alemán'} stroke="var(--rose-ink)" fill="var(--rose)" fillOpacity={0.12} strokeWidth={1.75} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel titulo={conAbono ? 'Tabla recalculada' : 'Tabla de amortización'} detalle={`El capital suma ${dinero(round2(tn.capital + (conAbono ? Math.min(num(abono), base[k - 1]?.saldo ?? num(monto)) : 0)))} = monto del crédito${conAbono ? ' (incluye el abono)' : ''}`} cuerpo="">
            <Tabla etiqueta="Tabla de amortización simulada" className="max-h-[520px]">
              <thead><tr><Th>N.º</Th><Th>Vence</Th><Th derecha>Saldo inicial</Th><Th derecha>Cuota</Th><Th derecha>Interés</Th><Th derecha>Capital</Th><Th derecha>Saldo</Th></tr></thead>
              <tbody>
                {nueva.map((c) => (
                  <tr key={c.n} className={cx(conAbono && c.n === k + 1 && 'bg-rose-soft/50')}>
                    <Td className="text-ink-3">{c.n}</Td>
                    <Td className="whitespace-nowrap">{fmtFecha(c.fecha)}</Td>
                    <Td derecha className="text-ink-2">{dinero(c.saldoInicial)}</Td>
                    <Td derecha className="font-medium">{dinero(c.cuota)}</Td>
                    <Td derecha className="text-ink-2">{dinero(c.interes)}</Td>
                    <Td derecha className="text-ink-2">{dinero(c.capital)}</Td>
                    <Td derecha>{dinero(c.saldo)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-semibold"><Td>Total</Td><Td /><Td /><Td derecha>{dinero(tn.cuota)}</Td><Td derecha>{dinero(tn.interes)}</Td><Td derecha>{dinero(tn.capital)}</Td><Td /></tr></tfoot>
            </Tabla>
          </Panel>
        </div>
      </div>
    </div>
  )
}
