import { CalendarClock, Handshake } from 'lucide-react'
import { fmtFecha } from '../domain/fechas'
import type { CanalGestion, Convenio, Gestion } from '../domain/tipos'
import { ICONO_CANAL } from '../lib/canales'
import { cx, dinero } from '../lib/formato'
import { Insignia, Panel, Vacio } from './ui'

const icono = (c: CanalGestion) => (c === 'Visita' ? CalendarClock : ICONO_CANAL[c])

/** Bitácora de gestiones de una operación o cliente. */
export function ListaGestiones({ gestiones, titulo = 'Gestiones de cobranza', conOperacion }: { gestiones: Gestion[]; titulo?: string; conOperacion?: boolean }) {
  return (
    <Panel titulo={titulo} detalle={`${gestiones.length} registradas`} cuerpo="">
      {gestiones.length === 0 ? <Vacio titulo="Sin gestiones" /> : (
        <ol className="max-h-[480px] divide-y divide-line overflow-y-auto">
          {gestiones.map((g) => {
            const I = icono(g.canal)
            return (
              <li key={g.id} className={cx('flex gap-3 px-5 py-3 text-[0.82rem]', g.automatica && 'text-ink-3')}>
                <I size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2"><span className="font-medium">{g.resultado}</span>{g.motivo && <span className="text-ink-3">· {g.motivo}</span>}{conOperacion && <span className="text-ink-3">· {g.operacionId}</span>}<span className="tabular ml-auto text-[0.75rem] text-ink-3">{fmtFecha(g.fecha)} {g.hora} · {g.gestor}</span></p>
                  <p className="text-ink-2">{g.nota}</p>
                  {g.proxima && <p className="text-[0.75rem] text-ink-3">Próxima: {g.proxima.accion} el {fmtFecha(g.proxima.fecha)}</p>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

export function ResumenConvenio({ c }: { c: Convenio & { estado: string; pagado: number; total: number; avance: number } }) {
  return (
    <Panel titulo={`Convenio ${c.id}`} detalle={`Firmado el ${fmtFecha(c.fecha)} · ${c.gestor}`} acciones={<Insignia tono={c.estado === 'Cumplido' ? 'ok' : c.estado === 'Roto' ? 'bad' : 'rosa'}>{c.estado}</Insignia>}>
      <p className="flex items-center gap-2 text-[0.85rem] text-ink-2"><Handshake size={15} className="text-rose-ink" />Inicial {dinero(c.inicial)} y {c.cuotas.length} cuotas de {dinero(c.cuotas[0].monto)}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><div className="h-full rounded-full bg-rose" style={{ width: `${c.avance * 100}%` }} /></div>
      <p className="tabular mt-1 text-[0.75rem] text-ink-3">{dinero(c.pagado)} pagados de {dinero(c.total)}</p>
    </Panel>
  )
}
