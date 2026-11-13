import { Undo2 } from 'lucide-react'
import { useState } from 'react'
import { dinero } from '../lib/formato'
import { bloqueoReverso, reversarPago } from '../services/api'
import { Boton, Campo } from './ui'

/** Reverso de un pago con motivo obligatorio. Solo pagos del día y el último de la operación. */
export function ReversoPago({ pagoId, monto, onListo }: { pagoId: string; monto: number; onListo: (msg: string) => void }) {
  const bloqueo = bloqueoReverso(pagoId)
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (bloqueo) return <p className="rounded-[10px] bg-panel-2 px-3 py-2 text-[0.8rem] text-ink-2"><span className="font-medium">No se puede reversar:</span> {bloqueo}</p>
  if (!abierto) return <Boton variante="fantasma" onClick={() => setAbierto(true)} icono={<Undo2 size={15} />}>Reversar pago</Boton>

  async function confirmar() {
    setEnviando(true)
    setError('')
    try {
      await reversarPago(pagoId, motivo)
      onListo(`Pago ${pagoId} reversado. El saldo de la operación volvió a como estaba y se registró el asiento inverso.`)
    } catch (e) {
      setError((e as Error).message)
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-3 rounded-[12px] border border-bad/40 bg-bad-soft/25 p-4">
      <p className="text-[0.85rem] text-ink-2">Se anula el pago de <span className="tabular font-semibold">{dinero(monto)}</span>: la operación vuelve a su estado anterior y se registra un asiento contable inverso.</p>
      <Campo etiqueta="Motivo del reverso" error={error || undefined}>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} autoFocus placeholder="Ej.: se aplicó a la operación equivocada"
          className="w-full resize-none rounded-[9px] border border-line-strong bg-panel px-3 py-2 text-[0.875rem] focus-visible:border-rose focus-visible:ring-2 focus-visible:ring-rose/30 focus-visible:outline-none" />
      </Campo>
      <div className="flex justify-end gap-2">
        <Boton variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Boton>
        <Boton variante="primario" onClick={confirmar} disabled={enviando}>{enviando ? 'Reversando…' : 'Confirmar reverso'}</Boton>
      </div>
    </div>
  )
}
