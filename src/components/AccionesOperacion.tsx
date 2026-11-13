import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import type { ModoRecalculo } from '../domain/amortizacion'
import type { Saldos } from '../domain/operacion'
import type { MedioPago } from '../domain/tipos'
import { cx, dinero } from '../lib/formato'
import { abonarCapital, mediosPago, precancelar, simularAbono } from '../services/api'
import { Aviso, Boton, Campo, Entrada, Segmentado, Selector } from './ui'

function SelectorMedio({ valor, onCambio }: { valor: MedioPago; onCambio: (m: MedioPago) => void }) {
  return (
    <Campo etiqueta="Medio de pago">
      <Selector value={valor} onChange={(e) => onCambio(e.target.value as MedioPago)}>
        {mediosPago.map((m) => <option key={m}>{m}</option>)}
      </Selector>
    </Campo>
  )
}

function Fila({ etiqueta, valor, fuerte, tenue }: { etiqueta: string; valor: string; fuerte?: boolean; tenue?: boolean }) {
  return (
    <div className={cx('flex items-baseline justify-between gap-3 py-1.5', fuerte && 'mt-1 border-t border-line pt-3')}>
      <dt className={cx('text-[0.85rem]', fuerte ? 'font-semibold text-ink' : 'text-ink-2', tenue && 'text-ink-3')}>{etiqueta}</dt>
      <dd className={cx('tabular', fuerte ? 'display text-[1.5rem] leading-none' : 'text-[0.875rem] font-medium')}>{valor}</dd>
    </div>
  )
}

/** Liquidación a la fecha y registro de la precancelación. */
export function Precancelacion({ operacionId, saldoCapital, saldos, onListo }: { operacionId: string; saldoCapital: number; saldos: Saldos; onListo: (msg: string) => void }) {
  const [medio, setMedio] = useState<MedioPago>('Transferencia')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  async function confirmar() {
    setEnviando(true)
    try {
      const p = await precancelar({ operacionId, medio })
      onListo(`Operación precancelada con el pago ${p.id} por ${dinero(p.monto)}. Sus garantías quedaron liberadas.`)
    } catch (e) {
      setError((e as Error).message)
      setEnviando(false)
    }
  }
  return (
    <div className="space-y-5">
      <dl>
        <Fila etiqueta="Saldo de capital" valor={dinero(saldoCapital)} />
        <Fila etiqueta="Interés vencido" valor={dinero(saldos.interesVencido)} tenue={!saldos.interesVencido} />
        <Fila etiqueta={`Interés del periodo (${saldos.diasPeriodoEnCurso} días)`} valor={dinero(saldos.interesEnCurso)} />
        <Fila etiqueta="Recargo por mora" valor={dinero(saldos.mora)} tenue={!saldos.mora} />
        <Fila etiqueta="Total a pagar hoy" valor={dinero(saldos.liquidacion)} fuerte />
      </dl>
      <p className="text-[0.8rem] text-ink-3">Solo se cobra el interés generado hasta hoy, no el de las cuotas futuras. Las garantías se liberan al registrar el pago.</p>
      <SelectorMedio valor={medio} onCambio={setMedio} />
      {error && <p role="alert" className="text-[0.8rem] font-medium text-bad">{error}</p>}
      <div className="flex justify-end">
        <Boton variante="primario" onClick={confirmar} disabled={enviando}>{enviando ? 'Registrando…' : `Precancelar por ${dinero(saldos.liquidacion)}`}</Boton>
      </div>
    </div>
  )
}

/** Abono extraordinario a capital con simulación del recálculo. */
export function AbonoCapital({ operacionId, onListo }: { operacionId: string; onListo: (msg: string) => void }) {
  const [monto, setMonto] = useState('')
  const [modo, setModo] = useState<ModoRecalculo>('reducir-plazo')
  const [medio, setMedio] = useState<MedioPago>('Transferencia')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const valor = Number(monto.replace(',', '.'))
  const sim = simularAbono(operacionId, monto === '' ? NaN : valor, modo)
  const r = sim.bloqueo ? null : (sim as Required<typeof sim>)
  const bloqueoGeneral = sim.bloqueo && monto === '' && !sim.bloqueo.startsWith('Escribe') ? sim.bloqueo : null

  async function confirmar() {
    setEnviando(true)
    try {
      const p = await abonarCapital({ operacionId, monto: valor, modo, medio })
      onListo(`Abono ${p.id} por ${dinero(p.monto)} aplicado a capital. La tabla de amortización se recalculó.`)
    } catch (e) {
      setError((e as Error).message)
      setEnviando(false)
    }
  }

  if (bloqueoGeneral) return <p className="rounded-[10px] bg-panel-2 px-3 py-2.5 text-[0.875rem] text-ink-2">{bloqueoGeneral}</p>

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Monto del abono (USD)" ayuda={`Máximo ${dinero(sim.maximo)}`} error={monto !== '' && sim.bloqueo ? sim.bloqueo : undefined}>
          <Entrada inputMode="decimal" value={monto} onChange={(e) => { setMonto(e.target.value); setError('') }} placeholder="0,00" aria-invalid={monto !== '' && !!sim.bloqueo} />
        </Campo>
        <SelectorMedio valor={medio} onCambio={setMedio} />
      </div>
      <div>
        <p className="mb-2 text-[0.8rem] font-medium text-ink-2">Después del abono</p>
        <Segmentado<ModoRecalculo> etiqueta="Modo de recálculo" valor={modo} onCambio={setModo} opciones={[{ id: 'reducir-plazo', label: 'Mantener cuota, acortar plazo' }, { id: 'reducir-cuota', label: 'Mantener plazo, bajar cuota' }]} />
      </div>
      {r && (
        <div className="grid grid-cols-3 gap-3 rounded-[12px] border border-line bg-panel-2/50 p-4 text-[0.85rem]">
          <div>
            <p className="text-[0.75rem] text-ink-3">Cuota</p>
            <p className="tabular mt-1 flex flex-wrap items-center gap-1"><span className="text-ink-3">{dinero(r.cuotaAntes)}</span><ArrowRight size={13} className="text-ink-3" aria-label="pasa a" /><span className="font-semibold">{dinero(r.cuotaDespues)}</span></p>
          </div>
          <div>
            <p className="text-[0.75rem] text-ink-3">Cuotas restantes</p>
            <p className="tabular mt-1 flex items-center gap-1"><span className="text-ink-3">{r.plazoAntes}</span><ArrowRight size={13} className="text-ink-3" aria-label="pasa a" /><span className="font-semibold">{r.plazoDespues}</span></p>
          </div>
          <div>
            <p className="text-[0.75rem] text-ink-3">Interés que se ahorra</p>
            <p className="tabular mt-1 font-semibold text-ok">{dinero(r.interesAhorrado)}</p>
          </div>
          <p className="col-span-3 text-[0.75rem] text-ink-3">Se recalcula desde la cuota {r.desde}. Las cuotas ya pagadas no cambian.</p>
        </div>
      )}
      {error && <p role="alert" className="text-[0.8rem] font-medium text-bad">{error}</p>}
      <div className="flex justify-end">
        <Boton variante="primario" onClick={confirmar} disabled={!!sim.bloqueo || enviando}>{enviando ? 'Aplicando…' : 'Aplicar abono'}</Boton>
      </div>
    </div>
  )
}

export function AvisoAccion({ mensaje }: { mensaje: string }) {
  return <div className="mb-4"><Aviso>{mensaje}</Aviso></div>
}
