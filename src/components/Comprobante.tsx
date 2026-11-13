import { Printer } from 'lucide-react'
import { fmtFecha } from '../domain/fechas'
import { dinero } from '../lib/formato'
import type { comprobante } from '../services/api'
import { Marca } from './guilloche'
import { Boton, Microimpresion } from './ui'

export type DatosComprobante = ReturnType<typeof comprobante>

/** Comprobante de pago imprimible. */
export function Comprobante({ c, acciones }: { c: DatosComprobante; acciones?: React.ReactNode }) {
  const p = c.pago
  const filas: [string, number][] = [['Recargo por mora', p.mora], ['Interés', p.interes], ['Capital', p.capital]]
  return (
    <div>
      <article data-imprimir className="overflow-hidden rounded-[14px] border border-line bg-panel" aria-label={`Comprobante ${p.id}`}>
        <header className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <Marca className="h-9 w-9 text-rose" />
            <div>
              <p className="display text-[1.2rem] leading-none">Comprobante de pago</p>
              <p className="tabular mt-1 text-[0.78rem] text-ink-3">{p.id} · {c.emitido}</p>
            </div>
          </div>
          <span className="rounded-full bg-ok-soft px-2.5 py-1 text-[0.72rem] font-semibold text-ok">Aplicado</span>
        </header>
        <Microimpresion className="border-y border-line px-5 py-[3px] text-ink-3/70" />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <dl className="space-y-2 text-[0.85rem]">
            <div><dt className="text-[0.72rem] text-ink-3">Cliente</dt><dd className="font-medium">{c.cliente.nombre}</dd><dd className="tabular text-[0.78rem] text-ink-3">{c.cliente.tipoIdentificacion} {c.cliente.cedula}</dd></div>
            <div><dt className="text-[0.72rem] text-ink-3">Operación</dt><dd className="tabular">{c.operacion.id} · {c.operacion.producto}</dd></div>
            <div><dt className="text-[0.72rem] text-ink-3">Medio y referencia</dt><dd className="tabular">{p.medio} · {p.referencia}</dd></div>
          </dl>
          <div>
            <dl className="tabular space-y-1.5 text-[0.85rem]">
              {filas.map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-ink-2">{k}</dt><dd className={v ? '' : 'text-ink-3'}>{dinero(v)}</dd></div>)}
              <div className="flex items-baseline justify-between border-t border-line pt-2"><dt className="font-semibold">Total recibido</dt><dd className="display text-[1.6rem] leading-none">{dinero(p.monto)}</dd></div>
            </dl>
          </div>
        </div>
        <footer className="grid grid-cols-2 gap-4 border-t border-line bg-panel-2/40 px-5 py-4 text-[0.8rem]">
          <div><p className="text-ink-3">Saldo de capital después del pago</p><p className="tabular mt-0.5 font-semibold">{dinero(c.saldoDespues)}</p></div>
          <div><p className="text-ink-3">{c.cancelada ? 'Estado' : 'Próximo vencimiento'}</p><p className="tabular mt-0.5 font-semibold">{c.cancelada ? 'Operación cancelada' : c.proximaCuota ? `${fmtFecha(c.proximaCuota.fecha)} · ${dinero(c.proximaCuota.valor)}` : '—'}</p></div>
          <p className="col-span-2 text-[0.72rem] text-ink-3">Recibido por {c.cajero}. Cooperativa Nueve Volcanes.</p>
        </footer>
      </article>
      <div className="mt-4 flex flex-wrap justify-end gap-2 print:hidden">
        <Boton onClick={() => window.print()} icono={<Printer size={15} />}>Imprimir</Boton>
        {acciones}
      </div>
    </div>
  )
}
