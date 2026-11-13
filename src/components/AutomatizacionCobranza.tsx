import { CalendarClock, CircleCheck, CircleX, Save } from 'lucide-react'
import { useRef, useState } from 'react'
import { ETAPAS } from '../domain/cartera'
import { CANALES_GESTION, DIAS_SEMANA, renderPlantilla, VARIABLES } from '../domain/cobranza'
import { fmtFecha } from '../domain/fechas'
import type { CanalGestion, PasoEstrategia, Plantilla } from '../domain/tipos'
import { ICONO_CANAL } from '../lib/canales'
import { cx, entero, plural } from '../lib/formato'
import { actualizarPaso, fechaCorte, guardarPlantilla, type obtenerAutomatizacion } from '../services/api'
import { Aviso, Boton, Campo, Entrada, Insignia, Interruptor, Panel, Selector, Tabla, Td, Th } from './ui'

type Datos = Awaited<ReturnType<typeof obtenerAutomatizacion>>
const HOY = fechaCorte()
const icono = (c: CanalGestion) => (c === 'Visita' ? CalendarClock : ICONO_CANAL[c])
const diaTexto = (d: number) => (d === 0 ? 'Día del vencimiento' : d < 0 ? `${-d} días antes` : `Día ${d} de mora`)

// ── Estrategia por etapa ────────────────────────────────────────────────────
export function Estrategia({ d }: { d: Datos }) {
  const [editando, setEditando] = useState<string | null>(null)
  return (
    <div className="space-y-4">
      <p className="text-[0.85rem] text-ink-2">Qué se hace con cada operación según sus días de mora. Las acciones automáticas (SMS, WhatsApp, correo) las ejecuta n8n; las llamadas y visitas entran a la bandeja del gestor.</p>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {ETAPAS.map((e, idx) => {
          const pasos = d.estrategia.filter((p) => p.etapa === e.id)
          return (
            <section key={e.id} className="rounded-[14px] border border-line bg-panel">
              <header className="border-b border-line px-4 py-3">
                <p className="flex items-center gap-2 text-[0.9rem] font-semibold"><span className={cx('tabular grid h-5 w-5 place-items-center rounded-full text-[0.68rem]', idx === 3 ? 'bg-bad-soft text-bad' : 'bg-rose-soft text-rose-ink')}>{idx + 1}</span>{e.label}</p>
                <p className="text-[0.75rem] text-ink-3">{e.regla}</p>
              </header>
              <ol className="relative space-y-3 p-4">
                {pasos.map((p) => <Paso key={p.id} p={p} plantillas={d.plantillas} editando={editando === p.id} onEditar={() => setEditando(editando === p.id ? null : p.id)} />)}
              </ol>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Paso({ p, plantillas, editando, onEditar }: { p: PasoEstrategia; plantillas: Plantilla[]; editando: boolean; onEditar: () => void }) {
  const I = icono(p.canal)
  const pl = plantillas.find((x) => x.id === p.plantillaId)
  return (
    <li className={cx('rounded-[12px] border p-3 transition-colors', p.activo ? 'border-line-strong' : 'border-dashed border-line opacity-60')}>
      <div className="flex items-start gap-2.5">
        <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-[9px]', p.activo ? 'bg-rose-soft text-rose-ink' : 'bg-panel-2 text-ink-3')}><I size={15} /></span>
        <div className="min-w-0 flex-1">
          <p className="tabular text-[0.72rem] font-medium text-ink-3">{diaTexto(p.dia)}</p>
          <p className="text-[0.85rem] font-medium">{p.accion}</p>
          <p className="text-[0.75rem] text-ink-3">{p.canal}{pl ? ` · ${pl.nombre}` : ''}</p>
        </div>
        <Interruptor activo={p.activo} onCambio={() => actualizarPaso(p.id, { activo: !p.activo })} etiqueta={`Activar ${p.accion}`} />
      </div>
      <button onClick={onEditar} className="mt-2 text-[0.75rem] font-medium text-rose-ink hover:underline">{editando ? 'Cerrar' : 'Editar'}</button>
      {editando && (
        <div className="mt-3 grid gap-3 border-t border-line pt-3">
          <Campo etiqueta="Día respecto al vencimiento"><Entrada type="number" value={p.dia} onChange={(e) => actualizarPaso(p.id, { dia: Number(e.target.value) })} className="text-right" /></Campo>
          <Campo etiqueta="Canal"><Selector value={p.canal} onChange={(e) => actualizarPaso(p.id, { canal: e.target.value as CanalGestion })}>{CANALES_GESTION.map((c) => <option key={c}>{c}</option>)}</Selector></Campo>
          <Campo etiqueta="Plantilla"><Selector value={p.plantillaId ?? ''} onChange={(e) => actualizarPaso(p.id, { plantillaId: e.target.value || undefined })}><option value="">Sin plantilla</option>{plantillas.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</Selector></Campo>
        </div>
      )}
    </li>
  )
}

// ── Plantillas ──────────────────────────────────────────────────────────────
export function Plantillas({ d }: { d: Datos }) {
  const [sel, setSel] = useState(d.plantillas[0].id)
  const p = d.plantillas.find((x) => x.id === sel)!
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel titulo="Plantillas" cuerpo="">
        <ul className="divide-y divide-line">
          {d.plantillas.map((x) => {
            const I = ICONO_CANAL[x.canal]
            return (
              <li key={x.id}>
                <button onClick={() => setSel(x.id)} aria-current={sel === x.id ? 'true' : undefined} className={cx('flex w-full items-center gap-3 px-4 py-3 text-left', sel === x.id ? 'bg-rose-soft/40' : 'hover:bg-panel-2/60')}>
                  <I size={15} className="shrink-0 text-ink-3" />
                  <span className="min-w-0"><span className="block truncate text-[0.85rem] font-medium">{x.nombre}</span><span className="text-[0.72rem] text-ink-3">{x.canal} · {x.id}</span></span>
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>
      <Editor key={p.id} p={p} ejemplo={d.ejemploPlantilla} />
    </div>
  )
}

function Editor({ p, ejemplo }: { p: Plantilla; ejemplo: Datos['ejemploPlantilla'] }) {
  const [texto, setTexto] = useState(p.texto)
  const [asunto, setAsunto] = useState(p.asunto ?? '')
  const [guardado, setGuardado] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  const vista = renderPlantilla(texto, ejemplo.variables)
  const sms = p.canal === 'SMS'
  const insertar = (v: string) => {
    const pos = area.current?.selectionStart ?? texto.length
    setTexto(texto.slice(0, pos) + `{${v}}` + texto.slice(pos))
    setGuardado(false)
  }
  const desconocidas = [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => !VARIABLES.includes(v))
  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
      <Panel titulo={p.nombre} detalle={`${p.canal} · ${p.id}`}>
        <div className="space-y-4">
          {p.canal === 'Correo' && <Campo etiqueta="Asunto"><Entrada value={asunto} onChange={(e) => { setAsunto(e.target.value); setGuardado(false) }} /></Campo>}
          <Campo etiqueta={p.canal === 'Llamada' ? 'Guion' : 'Mensaje'} error={desconocidas.length ? `Variable desconocida: {${desconocidas[0]}}` : undefined}>
            <textarea ref={area} value={texto} onChange={(e) => { setTexto(e.target.value); setGuardado(false) }} rows={p.canal === 'SMS' ? 4 : 9}
              className="w-full rounded-[9px] border border-line-strong bg-panel px-3 py-2 text-[0.85rem] leading-relaxed focus-visible:border-rose focus-visible:ring-2 focus-visible:ring-rose/30 focus-visible:outline-none" />
          </Campo>
          <div>
            <p className="mb-1.5 text-[0.75rem] text-ink-3">Insertar variable</p>
            <div className="flex flex-wrap gap-1.5">{VARIABLES.map((v) => <button key={v} onClick={() => insertar(v)} className="rounded-[7px] bg-panel-2 px-2 py-1 font-mono text-[0.72rem] text-ink-2 hover:bg-rose-soft hover:text-rose-ink">{`{${v}}`}</button>)}</div>
          </div>
          {sms && <p className={cx('tabular text-[0.78rem]', vista.length > 160 ? 'text-warn' : 'text-ink-3')}>{vista.length} caracteres con datos reales · {plural(vista.length <= 160 ? 1 : Math.ceil(vista.length / 153), 'mensaje', 'mensajes')}{vista.length > 160 ? ' (se cobra más de un SMS)' : ''}</p>}
          <div className="flex items-center justify-between gap-3">
            {guardado ? <Aviso>Plantilla guardada.</Aviso> : <span />}
            <Boton variante="primario" disabled={desconocidas.length > 0} onClick={async () => { await guardarPlantilla(p.id, { texto, asunto: asunto || undefined }); setGuardado(true) }} icono={<Save size={15} />}>Guardar</Boton>
          </div>
        </div>
      </Panel>
      <Panel titulo="Vista previa" detalle={`Con los datos de ${ejemplo.cliente} · ${ejemplo.operacion}`}>
        {p.canal === 'WhatsApp' || p.canal === 'SMS' ? (
          <div className="rounded-[14px] bg-panel-2 p-4">
            <div className={cx('max-w-[85%] rounded-[14px] rounded-tl-[4px] px-3.5 py-2.5 text-[0.85rem] leading-relaxed whitespace-pre-line shadow-sm', p.canal === 'WhatsApp' ? 'bg-ok-soft text-ink' : 'bg-panel text-ink')}>{vista}</div>
            <p className="tabular mt-1.5 text-[0.7rem] text-ink-3">{p.canal} · 09:00</p>
          </div>
        ) : p.canal === 'Correo' ? (
          <article className="rounded-[12px] border border-line">
            <p className="border-b border-line px-4 py-2.5 text-[0.85rem]"><span className="text-ink-3">Asunto: </span><span className="font-medium">{renderPlantilla(asunto, ejemplo.variables)}</span></p>
            <p className="px-4 py-3 text-[0.85rem] leading-relaxed whitespace-pre-line text-ink-2">{vista}</p>
          </article>
        ) : (
          <p className="rounded-[12px] bg-panel-2 px-4 py-3 text-[0.85rem] leading-relaxed whitespace-pre-line text-ink-2">{vista}</p>
        )}
      </Panel>
    </div>
  )
}

// ── Horarios y feriados ─────────────────────────────────────────────────────
export function Horarios({ d }: { d: Datos }) {
  const proximo = d.feriados.find((f) => f.fecha >= HOY)
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Panel titulo="Ventanas de contacto" detalle="Fuera de estas horas no se envían mensajes automáticos y la bandeja avisa al gestor." cuerpo="">
        <Tabla etiqueta="Ventanas de contacto">
          <thead><tr><Th>Canal</Th><Th>Días</Th><Th>Horario</Th><Th>Ahora</Th></tr></thead>
          <tbody>
            {d.ventanas.map((v) => {
              const I = icono(v.canal)
              return (
                <tr key={v.canal}>
                  <Td><span className="flex items-center gap-2 font-medium"><I size={15} className="text-ink-3" />{v.canal}</span></Td>
                  <Td><span className="flex flex-wrap gap-1">{DIAS_SEMANA.map((x, i) => <span key={x} className={cx('rounded-[6px] px-1.5 py-0.5 text-[0.7rem]', v.dias.includes(i) ? 'bg-rose-soft text-rose-ink' : 'bg-panel-2 text-ink-3 line-through')}>{x}</span>)}</span></Td>
                  <Td className="tabular whitespace-nowrap">{v.desde === '00:00' && v.hasta === '23:59' ? 'Todo el día' : `${v.desde} – ${v.hasta}`}</Td>
                  <Td>{v.ahora.ok ? <span className="flex items-center gap-1.5 text-[0.8rem] text-ok"><CircleCheck size={14} />Permitido</span> : <span className="flex items-center gap-1.5 text-[0.8rem] text-warn" title={v.ahora.motivo}><CircleX size={14} />Fuera de horario</span>}</Td>
                </tr>
              )
            })}
          </tbody>
        </Tabla>
      </Panel>
      <Panel titulo="Feriados" detalle="Sin llamadas, visitas ni mensajes; el correo sí sale." cuerpo="">
        <ul className="divide-y divide-line">
          {d.feriados.map((f) => (
            <li key={f.fecha} className={cx('flex items-center justify-between px-5 py-2.5 text-[0.85rem]', f.fecha < HOY && 'text-ink-3')}>
              <span>{f.nombre}</span>
              <span className="flex items-center gap-2"><span className="tabular">{fmtFecha(f.fecha)}</span>{f === proximo && <Insignia tono="rosa">Próximo</Insignia>}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

// ── n8n: ejecuciones y webhooks ─────────────────────────────────────────────
export function EjecucionesN8n({ d }: { d: Datos }) {
  const errores = d.ejecuciones.filter((e) => e.estado === 'Error').length
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel titulo="Bitácora de ejecuciones" detalle={`Últimos 7 días · ${entero(d.ejecuciones.length)} ejecuciones, ${errores} con error`} cuerpo="">
        <Tabla etiqueta="Ejecuciones de n8n" className="max-h-[440px]">
          <thead><tr><Th>Fecha</Th><Th>Flujo</Th><Th>Estado</Th><Th derecha>Registros</Th><Th derecha>Duración</Th><Th>Detalle</Th></tr></thead>
          <tbody>
            {d.ejecuciones.map((e) => (
              <tr key={e.id}>
                <Td className="tabular whitespace-nowrap">{fmtFecha(e.fecha)}<span className="block text-[0.72rem] text-ink-3">{e.hora}</span></Td>
                <Td className="whitespace-nowrap">{e.flujo}<span className="block text-[0.72rem] text-ink-3">{e.flujoId}</span></Td>
                <Td><Insignia tono={e.estado === 'Éxito' ? 'ok' : 'bad'}>{e.estado}</Insignia></Td>
                <Td derecha>{e.registros}</Td>
                <Td derecha className="text-ink-2">{(e.duracionMs / 1000).toFixed(1).replace('.', ',')} s</Td>
                <Td className={cx('text-[0.8rem]', e.estado === 'Error' ? 'text-bad' : 'text-ink-3')}>{e.detalle}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Panel>
      <Panel titulo="Webhooks de entrada" detalle="Eventos que n8n o los proveedores envían a Mechallex (solo interfaz)." cuerpo="divide-y divide-line">
        {d.webhooks.map((w) => (
          <div key={w.id} className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{w.nombre}</p>
              <span className="tabular text-[0.75rem] text-ink-3">{entero(w.recibidos7d)} en 7 días · último {w.ultimo}</span>
            </div>
            <p className="mt-1 text-[0.8rem]"><code className="rounded bg-panel-2 px-1.5 py-0.5">POST {w.ruta}</code> <span className="text-ink-3">· evento {w.evento}</span></p>
            <pre className="mt-3 overflow-x-auto rounded-[10px] bg-panel-2 px-3 py-2.5 text-[0.75rem] leading-relaxed text-ink-2">{w.ejemplo}</pre>
          </div>
        ))}
      </Panel>
    </div>
  )
}
