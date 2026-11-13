import { CalendarClock, CheckCircle2, ChevronDown, Handshake, Phone, ScrollText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CANALES_GESTION, MOTIVOS, pideMotivo, RESULTADOS } from '../domain/cobranza'
import { addDays, fmtFecha } from '../domain/fechas'
import type { CanalGestion, MotivoNoPago, ResultadoGestion } from '../domain/tipos'
import { ICONO_CANAL } from '../lib/canales'
import { cx, dinero, plural } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { catalogosCliente, colaDelDia, crearConvenio, fechaCorte, fichaGestion, registrarGestion, simularConvenio, validarGestion, type NuevaGestion } from '../services/api'
import { Aviso, Boton, Campo, Dialogo, Entrada, EsqueletoPagina, Insignia, InsigniaTramo, RecorridoCobranza, Segmentado, Selector, Vacio } from './ui'

const HOY = fechaCorte()
const ACCIONES = ['Volver a llamar', 'Enviar WhatsApp con enlace de pago', 'Visita domiciliaria', 'Confirmar pago', 'Notificar al garante']
const iconoCanal = (c: CanalGestion) => (c === 'Visita' ? CalendarClock : ICONO_CANAL[c])

/** Bandeja del gestor: cola priorizada del día, ficha resumida, guion y registro rápido de la gestión. */
export function BandejaGestor() {
  const [gestor, setGestor] = useState('')
  const { data } = useServicio(() => colaDelDia(gestor), [gestor])
  const [sel, setSel] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!data) return
    if (!sel || !data.items.some((i) => i.op.id === sel)) setSel(data.items.find((i) => !i.gestionadoHoy)?.op.id ?? data.items[0]?.op.id ?? null)
  }, [data, sel])

  if (!data) return <EsqueletoPagina />
  const siguiente = () => {
    const pend = data.items.filter((i) => !i.gestionadoHoy && i.op.id !== sel)
    setSel(pend[0]?.op.id ?? null)
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section aria-label="Cola del día" className="rounded-[14px] border border-line bg-panel xl:sticky xl:top-24 xl:self-start">
        <div className="space-y-3 border-b border-line p-4">
          <Campo etiqueta="Cola de">
            <Selector value={gestor} onChange={(e) => { setGestor(e.target.value); setSel(null) }}>
              <option value="">Todo el equipo</option>
              {catalogosCliente.gestores.map((g) => <option key={g}>{g}</option>)}
            </Selector>
          </Campo>
          <p className="tabular flex justify-between text-[0.8rem]"><span><span className="font-semibold">{data.pendientes}</span> <span className="text-ink-3">por gestionar</span></span><span><span className="font-semibold text-ok">{data.gestionadosHoy}</span> <span className="text-ink-3">gestionados hoy</span></span></p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><div className="h-full rounded-full bg-ok" style={{ width: `${(data.gestionadosHoy / Math.max(1, data.items.length)) * 100}%` }} /></div>
        </div>
        {data.items.length === 0 ? <Vacio titulo="Cola vacía">No hay casos para hoy.</Vacio> : (
          <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
            {data.items.map((i, k) => (
              <li key={i.op.id}>
                <button onClick={() => { setSel(i.op.id); setAviso('') }} aria-current={sel === i.op.id ? 'true' : undefined}
                  className={cx('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors', sel === i.op.id ? 'bg-rose-soft/40' : 'hover:bg-panel-2/60', i.gestionadoHoy && 'opacity-55')}>
                  <span className={cx('tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-semibold', i.gestionadoHoy ? 'bg-ok-soft text-ok' : 'bg-panel-2 text-ink-2')}>{i.gestionadoHoy ? <CheckCircle2 size={13} /> : k + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-[0.875rem] font-medium">{i.op.cliente.nombre}</span><span className="tabular shrink-0 text-[0.8rem] font-semibold">{dinero(i.op.valorVencido || i.op.proximaCuota?.valor || 0)}</span></span>
                    <span className="mt-0.5 flex items-center gap-2 text-[0.72rem] text-ink-3"><InsigniaTramo tramo={i.op.tramo} /><span className="truncate">{i.motivos.slice(1).join(' · ') || i.op.cliente.gestor}</span></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="min-w-0">
        {aviso && <div className="mb-3"><Aviso>{aviso}</Aviso></div>}
        {sel ? <Ficha key={sel} opId={sel} onListo={(m) => { setAviso(m); siguiente() }} /> : <Vacio titulo="Elige un caso de la cola" />}
      </div>
    </div>
  )
}

function Ficha({ opId, onListo }: { opId: string; onListo: (msg: string) => void }) {
  const f = useMemo(() => fichaGestion(opId), [opId])
  const { op, saldos } = f
  const c = op.cliente
  const [guion, setGuion] = useState(true)
  const [convenio, setConvenio] = useState(false)
  const [g, setG] = useState<NuevaGestion>({ operacionId: opId, canal: c.consentimiento.Llamada ? 'Llamada' : 'Visita', resultado: 'Contactado sin compromiso', nota: '' })
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState('')
  const errores = intento ? validarGestion(g) : {}
  const horario = f.horario(g.canal)
  const set = <K extends keyof NuevaGestion>(k: K, v: NuevaGestion[K]) => setG((x) => ({ ...x, [k]: v }))

  async function guardar() {
    setIntento(true)
    if (Object.keys(validarGestion(g)).length) return
    try {
      const r = await registrarGestion(g)
      onListo(`Gestión ${r.id} registrada para ${c.nombre}${g.resultado === 'Promesa de pago' ? ' con su promesa de pago' : ''}.`)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[14px] border border-line bg-panel">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <Link to={`/clientes/${c.id}`} className="display text-[1.5rem] leading-tight hover:text-rose-ink">{c.nombre}</Link>
            <p className="tabular mt-1 text-[0.8rem] text-ink-3"><Link to={`/operaciones/${op.id}`} className="hover:text-rose-ink">{op.id}</Link> · {op.producto} · gestor {c.gestor}</p>
          </div>
          <RecorridoCobranza etapa={op.etapa} />
        </div>
        <dl className="tabular grid grid-cols-2 gap-4 p-5 text-[0.85rem] sm:grid-cols-4">
          <div><dt className="text-[0.75rem] text-ink-3">Para ponerse al día</dt><dd className={cx('display text-[1.4rem] leading-tight', saldos.exigible > 0 && 'text-bad')}>{dinero(saldos.exigible)}</dd></div>
          <div><dt className="text-[0.75rem] text-ink-3">Días de mora</dt><dd className="display text-[1.4rem] leading-tight">{op.diasMora}</dd></div>
          <div><dt className="text-[0.75rem] text-ink-3">Saldo</dt><dd className="font-semibold">{dinero(op.saldoCapital)}</dd></div>
          <div><dt className="text-[0.75rem] text-ink-3">Próxima cuota</dt><dd className="font-semibold">{op.proximaCuota ? `${fmtFecha(op.proximaCuota.fecha)} · ${dinero(op.proximaCuota.valor)}` : '—'}</dd></div>
        </dl>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 text-[0.8rem]">
          <span className="flex items-center gap-1.5 text-ink-2"><Phone size={14} className="text-ink-3" />{c.telefono}{c.telefonoAlterno && ` · ${c.telefonoAlterno}`}</span>
          <span className="text-ink-3">·</span>
          {(['Llamada', 'SMS', 'WhatsApp', 'Correo'] as const).map((canal) => <Insignia key={canal} tono={c.consentimiento[canal] ? 'rosa' : 'neutro'} className={cx(!c.consentimiento[canal] && 'line-through')}>{canal}</Insignia>)}
          {f.convenio && <Insignia tono="ok"><Handshake size={12} />Convenio {f.convenio.id}</Insignia>}
          {f.promesas.some((p) => p.estado === 'Vigente') && <Insignia tono="rosa">Promesa vigente</Insignia>}
          {f.promesas.some((p) => p.estado === 'Incumplida') && <Insignia tono="bad">Promesa incumplida</Insignia>}
        </div>
      </section>

      <section className="rounded-[14px] border border-line bg-panel">
        <button onClick={() => setGuion((v) => !v)} aria-expanded={guion} className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left">
          <span className="flex items-center gap-2 text-[0.9rem] font-semibold"><ScrollText size={16} className="text-rose-ink" />Guion sugerido</span>
          <ChevronDown size={16} className={cx('text-ink-3 transition-transform', guion && 'rotate-180')} />
        </button>
        {guion && <p className="border-t border-line px-5 py-4 text-[0.875rem] leading-relaxed whitespace-pre-line text-ink-2">{f.guion}</p>}
      </section>

      <section className="rounded-[14px] border border-line bg-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[0.95rem] font-semibold">Registrar gestión</h3>
          {saldos.exigible > 0 && !f.convenio && <Boton variante="fantasma" onClick={() => setConvenio(true)} icono={<Handshake size={15} />}>Proponer convenio</Boton>}
        </div>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[0.8rem] font-medium text-ink-2">Canal</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Canal">
              {CANALES_GESTION.map((canal) => {
                const I = iconoCanal(canal)
                const permitido = canal === 'Visita' || c.consentimiento[canal]
                return (
                  <button key={canal} role="radio" aria-checked={g.canal === canal} disabled={!permitido} onClick={() => set('canal', canal)} title={permitido ? undefined : 'El cliente no autorizó este canal'}
                    className={cx('inline-flex h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[0.82rem] font-medium transition-colors', g.canal === canal ? 'border-rose bg-rose-soft text-rose-ink' : 'border-line-strong text-ink-2 hover:text-ink', !permitido && 'cursor-not-allowed line-through opacity-40')}>
                    <I size={14} />{canal}
                  </button>
                )
              })}
            </div>
            {!horario.ok && <p className="mt-2 text-[0.78rem] font-medium text-warn">Fuera de horario: {horario.motivo}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Resultado">
              <Selector value={g.resultado} onChange={(e) => set('resultado', e.target.value as ResultadoGestion)}>{RESULTADOS.map((r) => <option key={r}>{r}</option>)}</Selector>
            </Campo>
            {pideMotivo(g.resultado) && (
              <Campo etiqueta="Motivo del atraso" error={errores.motivo}>
                <Selector value={g.motivo ?? ''} onChange={(e) => set('motivo', (e.target.value || undefined) as MotivoNoPago | undefined)} aria-invalid={!!errores.motivo}>
                  <option value="">Elegir…</option>{MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                </Selector>
              </Campo>
            )}
            {g.resultado === 'Promesa de pago' && (
              <>
                <Campo etiqueta="Fecha del compromiso" error={errores.promesaFecha}>
                  <Entrada type="date" min={HOY} max={addDays(HOY, 30)} value={g.promesa?.fecha ?? ''} onChange={(e) => set('promesa', { fecha: e.target.value, monto: g.promesa?.monto ?? saldos.exigible })} aria-invalid={!!errores.promesaFecha} />
                </Campo>
                <Campo etiqueta="Monto comprometido" error={errores.promesaMonto} ayuda={`Vencido con recargo: ${dinero(saldos.exigible)}`}>
                  <Entrada inputMode="decimal" value={g.promesa?.monto ?? ''} onChange={(e) => set('promesa', { fecha: g.promesa?.fecha ?? '', monto: Number(e.target.value.replace(',', '.')) })} aria-invalid={!!errores.promesaMonto} />
                </Campo>
              </>
            )}
            {g.resultado !== 'Promesa de pago' && (
              <>
                <Campo etiqueta="Próxima acción" opcional>
                  <Selector value={g.proxima?.accion ?? ''} onChange={(e) => set('proxima', e.target.value ? { accion: e.target.value, fecha: g.proxima?.fecha ?? addDays(HOY, 2) } : undefined)}>
                    <option value="">Ninguna</option>{ACCIONES.map((a) => <option key={a}>{a}</option>)}
                  </Selector>
                </Campo>
                {g.proxima && <Campo etiqueta="Fecha de la próxima acción" error={errores.proxima}><Entrada type="date" min={HOY} value={g.proxima.fecha} onChange={(e) => set('proxima', { ...g.proxima!, fecha: e.target.value })} /></Campo>}
              </>
            )}
          </div>
          <Campo etiqueta="Nota" error={errores.nota}>
            <textarea value={g.nota} onChange={(e) => set('nota', e.target.value)} rows={2} placeholder="Qué dijo el cliente, acuerdos, datos nuevos…" aria-invalid={!!errores.nota}
              className="w-full resize-none rounded-[9px] border border-line-strong bg-panel px-3 py-2 text-[0.875rem] focus-visible:border-rose focus-visible:ring-2 focus-visible:ring-rose/30 focus-visible:outline-none aria-[invalid=true]:border-bad" />
          </Campo>
          {errores.canal && <p role="alert" className="text-[0.8rem] font-medium text-bad">{errores.canal}</p>}
          {error && <p role="alert" className="text-[0.8rem] font-medium text-bad">{error}</p>}
          <div className="flex justify-end"><Boton variante="primario" onClick={guardar}>Guardar y pasar al siguiente</Boton></div>
        </div>
      </section>

      <section className="rounded-[14px] border border-line bg-panel">
        <h3 className="border-b border-line px-5 py-3.5 text-[0.95rem] font-semibold">Historial de gestiones <span className="font-normal text-ink-3">· {f.gestiones.length}</span></h3>
        {f.gestiones.length === 0 ? <Vacio titulo="Sin gestiones previas" /> : (
          <ol className="max-h-[360px] divide-y divide-line overflow-y-auto">
            {f.gestiones.map((x) => {
              const I = iconoCanal(x.canal)
              return (
                <li key={x.id} className="flex gap-3 px-5 py-3 text-[0.82rem]">
                  <I size={15} className="mt-0.5 shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2"><span className="font-medium">{x.resultado}</span>{x.motivo && <span className="text-ink-3">· {x.motivo}</span>}<span className="tabular ml-auto text-[0.75rem] text-ink-3">{fmtFecha(x.fecha)} {x.hora} · {x.gestor}</span></p>
                    <p className="text-ink-2">{x.nota}</p>
                    {x.proxima && <p className="text-[0.75rem] text-ink-3">Próxima: {x.proxima.accion} el {fmtFecha(x.proxima.fecha)}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {convenio && <DialogoConvenio opId={opId} onCerrar={() => setConvenio(false)} onListo={(m) => { setConvenio(false); onListo(m) }} />}
    </div>
  )
}

export function DialogoConvenio({ opId, onCerrar, onListo }: { opId: string; onCerrar: () => void; onListo: (m: string) => void }) {
  const [cuotas, setCuotas] = useState(3)
  const [inicial, setInicial] = useState<'0.1' | '0.2' | '0.3'>('0.2')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const sim = simularConvenio(opId, cuotas, Number(inicial))
  async function confirmar() {
    try {
      const c = await crearConvenio(opId, cuotas, Number(inicial), nota)
      onListo(`Convenio ${c.id} firmado: inicial ${dinero(c.inicial)} y ${plural(cuotas, 'cuota', 'cuotas')}.`)
    } catch (e) { setError((e as Error).message) }
  }
  return (
    <Dialogo titulo="Convenio de pago" descripcion="Acuerdo para pagar en cuotas el valor vencido. No cambia la tabla de amortización." onCerrar={onCerrar}>
      {sim.bloqueo ? <p className="text-[0.875rem] text-ink-2">{sim.bloqueo}</p> : (
        <div className="space-y-4">
          <p className="text-[0.85rem] text-ink-2">Deuda a regularizar (vencido más recargo): <span className="tabular font-semibold text-ink">{dinero(sim.deuda)}</span></p>
          <div className="flex flex-wrap gap-4">
            <div><p className="mb-1.5 text-[0.8rem] font-medium text-ink-2">Cuota inicial</p><Segmentado etiqueta="Cuota inicial" valor={inicial} onCambio={setInicial} opciones={[{ id: '0.1', label: '10 %' }, { id: '0.2', label: '20 %' }, { id: '0.3', label: '30 %' }]} /></div>
            <Campo etiqueta="Cuotas mensuales"><Selector value={cuotas} onChange={(e) => setCuotas(Number(e.target.value))}>{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</Selector></Campo>
          </div>
          <ul className="tabular divide-y divide-line rounded-[12px] border border-line text-[0.85rem]">
            <li className="flex justify-between px-4 py-2"><span>Inicial · hoy</span><span className="font-semibold">{dinero(sim.inicial)}</span></li>
            {sim.cuotas.map((q) => <li key={q.n} className="flex justify-between px-4 py-2 text-ink-2"><span>Cuota {q.n} · {fmtFecha(q.fecha)}</span><span>{dinero(q.monto)}</span></li>)}
          </ul>
          <Campo etiqueta="Nota" opcional><Entrada value={nota} onChange={(e) => setNota(e.target.value)} /></Campo>
          {error && <p role="alert" className="text-[0.8rem] font-medium text-bad">{error}</p>}
          <div className="flex justify-end gap-2"><Boton variante="fantasma" onClick={onCerrar}>Cancelar</Boton><Boton variante="primario" onClick={confirmar}>Firmar convenio</Boton></div>
        </div>
      )}
    </Dialogo>
  )
}
