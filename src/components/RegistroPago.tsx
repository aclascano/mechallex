import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { round2 } from '../domain/amortizacion'
import type { MedioPago } from '../domain/tipos'
import { MEDIOS } from '../mocks/catalogos'
import { dinero } from '../lib/formato'
import { previsualizarPago, registrarPago, type OperacionVista } from '../services/api'
import { Aviso, Boton, Campo, Entrada, InsigniaTramo, Selector } from './ui'
import { tramoDe } from '../domain/cartera'

/** Formulario de pago: muestra cómo se aplica el monto (mora → interés → capital) antes de registrarlo. */
export function RegistroPago({ operaciones, operacionInicial }: { operaciones: OperacionVista[]; operacionInicial?: string }) {
  const elegibles = useMemo(() => operaciones.filter((o) => !o.cancelada).sort((a, b) => b.diasMora - a.diasMora || a.cliente.nombre.localeCompare(b.cliente.nombre)), [operaciones])
  const [opId, setOpId] = useState(operacionInicial ?? elegibles[0]?.id ?? '')
  const op = elegibles.find((o) => o.id === opId)
  const sugerido = op ? round2(op.valorVencido > 0 ? op.valorVencido : op.proximaCuota?.valor ?? 0) : 0
  const [monto, setMonto] = useState(String(sugerido))
  const [medio, setMedio] = useState<MedioPago>('Transferencia')
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState<string | null>(null)

  useEffect(() => {
    setMonto(String(sugerido))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opId])

  const valor = Number(monto.replace(',', '.'))
  const valido = op && Number.isFinite(valor) && valor > 0
  const prev = valido ? previsualizarPago(op.id, valor) : null
  const error = monto !== '' && !(Number.isFinite(valor) && valor > 0) ? 'Escribe un monto mayor que cero.' : prev && prev.excedente > 0.004 ? `El monto supera la deuda total; se aplicarán ${dinero(prev.aplicado)}.` : null

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!op || !valido) return
    setEnviando(true)
    const p = await registrarPago({ operacionId: op.id, monto: valor, medio })
    setEnviando(false)
    setHecho(`Pago ${p.id} por ${dinero(p.monto)} aplicado a ${p.operacionId}.`)
  }

  if (!elegibles.length) return <p className="text-ink-3">No hay operaciones vigentes.</p>

  return (
    <form onSubmit={enviar} className="space-y-4">
      {!operacionInicial && (
        <Campo etiqueta="Operación">
          <Selector value={opId} onChange={(e) => { setOpId(e.target.value); setHecho(null) }}>
            {elegibles.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.cliente.nombre}{o.diasMora > 0 ? ` · ${o.diasMora} días de mora` : ''}
              </option>
            ))}
          </Selector>
        </Campo>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Monto recibido (USD)" ayuda={op ? (op.valorVencido > 0 ? `Vencido: ${dinero(op.valorVencido)}` : `Próxima cuota: ${dinero(op.proximaCuota?.valor ?? 0)}`) : undefined}>
          <Entrada inputMode="decimal" value={monto} onChange={(e) => { setMonto(e.target.value); setHecho(null) }} aria-invalid={!!error && !(valor > 0)} />
        </Campo>
        <Campo etiqueta="Medio de pago">
          <Selector value={medio} onChange={(e) => setMedio(e.target.value as MedioPago)}>
            {MEDIOS.map((m) => <option key={m}>{m}</option>)}
          </Selector>
        </Campo>
      </div>

      {prev && op && (
        <div className="rounded-[12px] border border-line bg-panel-2/60 p-4">
          <p className="mb-3 text-[0.78rem] font-medium text-ink-3">Cómo se aplica</p>
          <dl className="tabular grid grid-cols-3 gap-3 text-[0.85rem]">
            <div><dt className="text-[0.75rem] text-ink-3">Recargo por mora</dt><dd className="font-medium">{dinero(prev.mora)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Interés</dt><dd className="font-medium">{dinero(prev.interes)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Capital</dt><dd className="font-medium">{dinero(prev.capital)}</dd></div>
          </dl>
          <div className="mt-4 grid gap-2 border-t border-line pt-3 text-[0.85rem]">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-ink-3">Saldo capital</span>
              <span className="tabular">{dinero(prev.antes.saldoCapital)}</span>
              <ArrowRight size={14} className="text-ink-3" aria-label="pasa a" />
              <span className="tabular font-semibold text-ink">{dinero(prev.despues.saldoCapital)}</span>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-ink-3">Mora</span>
              <InsigniaTramo tramo={tramoDe(prev.antes.diasMora)} />
              <ArrowRight size={14} className="text-ink-3" aria-label="pasa a" />
              <InsigniaTramo tramo={tramoDe(prev.despues.diasMora)} />
            </p>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-[0.8rem] text-bad">{error}</p>}
      {hecho && <Aviso>{hecho}</Aviso>}

      <div className="flex justify-end">
        <Boton variante="primario" type="submit" disabled={!valido || enviando}>{enviando ? 'Registrando…' : 'Registrar pago'}</Boton>
      </div>
    </form>
  )
}
