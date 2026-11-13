import { ArrowLeft, Building2, Mail, MapPin, Pencil, Phone, Power, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Aviso, Boton, Dato, Encabezado, EsqueletoPagina, Insignia, InsigniaTramo, Panel, Pestanas, RecorridoCobranza, Tabla, Td, Th, Vacio } from '../components/ui'
import { CANALES, capacidadPago } from '../domain/clientes'
import { diffDays, fmtFecha } from '../domain/fechas'
import type { CambioCliente, Cliente } from '../domain/tipos'
import { ICONO_CANAL } from '../lib/canales'
import { cx, dinero, plural } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { bloqueoInactivar, cambiarEstadoCliente, catalogosCliente, fechaCorte, obtenerCliente } from '../services/api'

type Tab = 'resumen' | 'datos' | 'operaciones' | 'pagos' | 'cobranza' | 'historial'

export default function PaginaCliente() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { data: d, cargando } = useServicio(() => obtenerCliente(id), [id])
  const [dialogo, setDialogo] = useState(false)
  const tab = (params.get('tab') as Tab) || 'resumen'

  if (!d) return cargando ? <EsqueletoPagina /> : <Vacio titulo="Cliente no encontrado"><Link to="/clientes" className="text-rose-ink underline">Volver a clientes</Link></Vacio>
  const { cliente: c } = d
  const vigentes = d.operaciones.filter((o) => !o.cancelada)
  const saldo = vigentes.reduce((s, o) => s + o.saldoCapital, 0)
  const vencido = vigentes.reduce((s, o) => s + o.valorVencido, 0)
  const peor = vigentes.reduce((m, o) => (o.diasMora > m.diasMora ? o : m), vigentes[0])
  const natural = c.tipoPersona === 'Natural'
  const creado = params.get('creado')
  const guardado = params.get('guardado')
  const cambiarTab = (t: Tab) => setParams(t === 'resumen' ? {} : { tab: t }, { replace: true })

  return (
    <div>
      <Link to="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-[0.8rem] text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Clientes</Link>
      <Encabezado
        titulo={c.nombre}
        descripcion={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Insignia tono={c.estado === 'Activo' ? 'ok' : 'neutro'}>{c.estado}</Insignia>
            <span>{natural ? 'Persona natural' : `Persona jurídica · ${c.segmento}`}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular">{c.tipoIdentificacion} {c.cedula}</span>
            <span aria-hidden="true">·</span>
            <span>cliente desde {fmtFecha(c.clienteDesde)}</span>
          </span>
        }
        acciones={
          <>
            <Boton variante="fantasma" onClick={() => setDialogo(true)} icono={<Power size={15} />}>{c.estado === 'Activo' ? 'Inactivar' : 'Reactivar'}</Boton>
            <Link to={`/clientes/${c.id}/editar`} className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-rail px-3.5 text-[0.85rem] font-medium text-rail-ink hover:bg-rail-2 dark:bg-rose dark:text-[oklch(0.15_0.01_290)] dark:hover:bg-rose-ink">
              <Pencil size={15} /> Editar datos
            </Link>
          </>
        }
      />

      {(creado || guardado) && (
        <div className="mb-4">
          <Aviso>{creado ? 'Cliente creado. Ya puedes registrarle una obligación.' : Number(guardado) > 0 ? `Cambios guardados: ${plural(Number(guardado), 'campo actualizado', 'campos actualizados')}. Quedó en el historial.` : 'No había cambios que guardar.'}</Aviso>
        </div>
      )}
      {c.estado === 'Inactivo' && (
        <p className="mb-4 rounded-[10px] border border-line bg-panel-2 px-3 py-2 text-[0.85rem] text-ink-2">
          Cliente inactivo{c.motivoInactivo ? `: ${c.motivoInactivo}` : ''}. No recibe campañas ni nuevas obligaciones hasta reactivarlo.
        </p>
      )}

      <section aria-label="Resumen financiero" className="mb-6 grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-panel lg:grid-cols-4">
        {[
          ['Saldo de capital', dinero(saldo), plural(vigentes.length, 'operación vigente', 'operaciones vigentes')],
          ['Valor vencido', dinero(vencido), peor && peor.diasMora > 0 ? <InsigniaTramo tramo={peor.tramo} /> : 'Al día'],
          ['Capacidad de pago', dinero(capacidadPago(c)), `ingresos ${dinero(c.ingresos)}`],
          ['Gestor asignado', c.gestor, `${c.domicilio.ciudad || c.ciudad}`],
        ].map(([k, v, pie], i) => (
          <div key={k as string} className={cx('min-w-0 p-4 sm:p-5', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line lg:border-t-0', i === 2 && 'lg:border-l')}>
            <p className="text-[0.75rem] text-ink-3">{k}</p>
            <p className={cx('tabular mt-1 truncate', i < 3 ? 'display text-[1.6rem] leading-tight sm:text-[1.85rem]' : 'text-[1.05rem] font-semibold leading-[2.2rem]')}>{v}</p>
            <div className="mt-1 text-[0.78rem] text-ink-3">{pie}</div>
          </div>
        ))}
      </section>

      <Pestanas<Tab>
        valor={tab}
        onCambio={cambiarTab}
        opciones={[
          { id: 'resumen', label: 'Resumen' },
          { id: 'datos', label: 'Datos' },
          { id: 'operaciones', label: 'Operaciones', cuenta: d.operaciones.length },
          { id: 'pagos', label: 'Pagos', cuenta: d.pagos.length },
          { id: 'cobranza', label: 'Cobranza', cuenta: d.promesas.length + d.juicios.length },
          { id: 'historial', label: 'Historial', cuenta: d.historial.length },
        ]}
      />

      {tab === 'resumen' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Contacto c={c} />
          <div className="min-w-0 space-y-4">
            <TablaOperaciones ops={d.operaciones} />
            <TablaPagos pagos={d.pagos.slice(0, 6)} titulo="Últimos pagos" acciones={d.pagos.length > 6 && <button onClick={() => cambiarTab('pagos')} className="text-[0.8rem] font-medium text-rose-ink hover:underline">Ver los {d.pagos.length}</button>} />
          </div>
        </div>
      )}
      {tab === 'datos' && <Datos c={c} />}
      {tab === 'operaciones' && <TablaOperaciones ops={d.operaciones} />}
      {tab === 'pagos' && <TablaPagos pagos={d.pagos} titulo="Pagos registrados" alto />}
      {tab === 'cobranza' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel titulo="Promesas de pago" cuerpo="">
            {d.promesas.length === 0 ? <Vacio titulo="Sin promesas registradas" /> : (
              <ul className="divide-y divide-line">
                {d.promesas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                    <span><span className="tabular block font-medium">{dinero(p.monto)}</span><span className="text-[0.75rem] text-ink-3">{fmtFecha(p.fechaCompromiso)} · {p.canal} · {p.operacionId}</span></span>
                    <Insignia tono={p.estado === 'Cumplida' ? 'ok' : p.estado === 'Vigente' ? 'rosa' : 'bad'}>{p.estado}</Insignia>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel titulo="Causas judiciales" cuerpo="">
            {d.juicios.length === 0 ? <Vacio titulo="Sin causas judiciales" /> : (
              <ul className="divide-y divide-line">
                {d.juicios.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                    <span><span className="tabular block font-medium">{j.numeroCausa}</span><span className="text-[0.75rem] text-ink-3">{j.etapa} · {j.juzgado} · cuantía {dinero(j.cuantia)}</span></span>
                    <Link to={`/juicios?causa=${j.id}`} className="text-[0.8rem] font-medium whitespace-nowrap text-rose-ink hover:underline">Ver expediente</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
      {tab === 'historial' && <Historial items={d.historial} />}

      {dialogo && <DialogoEstado c={c} onCerrar={() => setDialogo(false)} />}
    </div>
  )
}

// ── Bloques ─────────────────────────────────────────────────────────────────
function Contacto({ c }: { c: Cliente }) {
  return (
    <Panel titulo="Contacto">
      <ul className="space-y-2.5 text-[0.85rem] text-ink-2">
        <li className="flex items-center gap-2.5"><Phone size={15} className="shrink-0 text-ink-3" aria-hidden="true" /><span className="tabular">{c.telefono}{c.telefonoAlterno && <span className="text-ink-3"> · {c.telefonoAlterno}</span>}</span></li>
        <li className="flex items-center gap-2.5"><Mail size={15} className="shrink-0 text-ink-3" aria-hidden="true" /><span className="truncate">{c.email}</span></li>
        <li className="flex items-start gap-2.5"><MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" /><span>{c.domicilio.calle}, {c.domicilio.ciudad}{c.domicilio.referencia && <span className="block text-[0.78rem] text-ink-3">{c.domicilio.referencia}</span>}</span></li>
      </ul>
      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2.5 text-[0.75rem] text-ink-3">Canales autorizados para cobranza</p>
        <Canales c={c} />
      </div>
    </Panel>
  )
}

function Canales({ c }: { c: Cliente }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {CANALES.map((canal) => {
        const Icono = ICONO_CANAL[canal]
        const si = c.consentimiento[canal]
        return (
          <li key={canal} className={cx('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.78rem]', si ? 'bg-rose-soft text-rose-ink' : 'bg-panel-2 text-ink-3 line-through decoration-ink-3/60')}>
            <Icono size={13} aria-hidden="true" />{canal}<span className="sr-only">{si ? ' autorizado' : ' no autorizado'}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Seccion({ titulo, filas, children }: { titulo: string; filas: [string, ReactNode][]; children?: ReactNode }) {
  const visibles = filas.filter(([, v]) => v !== '' && v !== null && v !== undefined)
  return (
    <Panel titulo={titulo}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {visibles.map(([k, v]) => <Dato key={k} etiqueta={k} className={typeof v === 'string' && v.length > 28 ? 'col-span-2' : undefined}>{v}</Dato>)}
      </dl>
      {children}
    </Panel>
  )
}

function Datos({ c }: { c: Cliente }) {
  const natural = c.tipoPersona === 'Natural'
  const edad = c.fechaNacimiento ? Math.floor(diffDays(fechaCorte(), c.fechaNacimiento) / 365.25) : 0
  const dir = (x: Cliente['domicilio']) => (x.calle ? `${x.calle}, ${x.ciudad} (${catalogosCliente.provinciaDe(x.ciudad)})` : '')
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      <Seccion titulo="Identificación" filas={[
        ['Tipo de persona', c.tipoPersona],
        ['Identificación', `${c.tipoIdentificacion} ${c.cedula}`],
        [natural ? 'Nombres' : 'Razón social', natural ? c.nombres : c.nombre],
        ['Apellidos', natural ? c.apellidos : ''],
        ['Nacimiento', c.fechaNacimiento ? `${fmtFecha(c.fechaNacimiento)} · ${edad} años` : ''],
        ['Estado civil', c.estadoCivil],
        ['Género', c.genero],
        ['Nacionalidad', natural ? c.nacionalidad : ''],
        ['Representante legal', c.representanteLegal],
        ['Código', c.id],
      ]} />
      <Seccion titulo="Contacto y direcciones" filas={[
        ['Celular', c.telefono],
        ['Teléfono alterno', c.telefonoAlterno],
        ['Correo', c.email],
        ['Domicilio', dir(c.domicilio)],
        ['Referencia del domicilio', c.domicilio.referencia],
        [natural ? 'Trabajo' : 'Local u oficina', dir(c.trabajo)],
      ]} />
      <Seccion titulo="Actividad económica" filas={[
        ['Situación', c.situacionLaboral],
        ['Actividad', c.actividad],
        ['Empleador', c.empleador],
        ['Ingresos mensuales', dinero(c.ingresos)],
        ['Egresos mensuales', dinero(c.egresos)],
        ['Capacidad de pago', dinero(capacidadPago(c))],
        ['Patrimonio', c.patrimonio ? dinero(c.patrimonio) : ''],
      ]} />
      <Panel titulo="Referencias" cuerpo="">
        <ul className="divide-y divide-line">
          {c.referencias.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
              <span className="min-w-0"><span className="block truncate font-medium">{r.nombre}</span><span className="text-[0.75rem] text-ink-3">{r.tipo} · {r.relacion}</span></span>
              <span className="tabular whitespace-nowrap text-ink-2">{r.telefono}</span>
            </li>
          ))}
        </ul>
      </Panel>
      {c.conyuge && (
        <Seccion titulo="Cónyuge o conviviente" filas={[
          ['Nombre', c.conyuge.nombre],
          ['Cédula', c.conyuge.cedula],
          ['Celular', c.conyuge.telefono],
          ['Ingresos', c.conyuge.ingresos ? dinero(c.conyuge.ingresos) : ''],
        ]} />
      )}
      <Seccion titulo="Cobranza y asignación" filas={[['Gestor', c.gestor], ['Segmento', c.segmento]]}>
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2.5 text-[0.75rem] text-ink-3">Canales autorizados</p>
          <Canales c={c} />
        </div>
      </Seccion>
    </div>
  )
}

type Ops = NonNullable<Awaited<ReturnType<typeof obtenerCliente>>>['operaciones']
type Pagos = NonNullable<Awaited<ReturnType<typeof obtenerCliente>>>['pagos']

function TablaOperaciones({ ops }: { ops: Ops }) {
  return (
    <Panel titulo="Operaciones" cuerpo="">
      {ops.length === 0 ? <Vacio titulo="Sin operaciones">Este cliente aún no tiene obligaciones registradas.</Vacio> : (
        <Tabla etiqueta="Operaciones del cliente">
          <thead><tr><Th>Operación</Th><Th>Antigüedad</Th><Th>Etapa</Th><Th derecha>Vencido</Th><Th derecha>Saldo</Th></tr></thead>
          <tbody>
            {ops.map((o) => (
              <tr key={o.id} className="hover:bg-panel-2/60">
                <Td><Link to={`/operaciones/${o.id}`} className="font-medium whitespace-nowrap hover:text-rose-ink">{o.id}</Link><span className="block text-[0.75rem] text-ink-3">{o.producto} · {dinero(o.monto)} a {o.plazoMeses} meses</span></Td>
                <Td>{o.cancelada ? <span className="text-[0.8rem] text-ink-3">—</span> : <InsigniaTramo tramo={o.tramo} />}</Td>
                <Td>{o.cancelada ? <span className="text-[0.8rem] text-ink-3">—</span> : <RecorridoCobranza etapa={o.etapa} compacto />}</Td>
                <Td derecha>{dinero(o.valorVencido)}</Td>
                <Td derecha className="font-medium">{o.cancelada ? <Insignia tono="ok">Cancelada</Insignia> : dinero(o.saldoCapital)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Panel>
  )
}

function TablaPagos({ pagos, titulo, acciones, alto }: { pagos: Pagos; titulo: string; acciones?: ReactNode; alto?: boolean }) {
  return (
    <Panel titulo={titulo} acciones={acciones} cuerpo="">
      {pagos.length === 0 ? <Vacio titulo="Sin pagos registrados" /> : (
        <Tabla etiqueta={titulo} className={alto ? 'max-h-[65vh]' : undefined}>
          <thead><tr><Th>Fecha</Th><Th>Operación</Th><Th>Tipo</Th><Th>Medio</Th><Th derecha>Capital</Th><Th derecha>Interés</Th><Th derecha>Monto</Th></tr></thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap">{fmtFecha(p.fecha)}</Td>
                <Td><Link to={`/operaciones/${p.operacionId}`} className="whitespace-nowrap text-ink-2 hover:text-rose-ink">{p.operacionId}</Link></Td>
                <Td className="text-ink-2">{p.tipo}</Td>
                <Td className="whitespace-nowrap text-ink-2">{p.medio}</Td>
                <Td derecha className="text-ink-2">{dinero(p.capital)}</Td>
                <Td derecha className="text-ink-2">{dinero(p.interes)}</Td>
                <Td derecha className="font-medium">{dinero(p.monto)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Panel>
  )
}

const TONO_ACCION: Record<CambioCliente['accion'], 'rosa' | 'neutro' | 'bad' | 'ok'> = { Creación: 'rosa', Edición: 'neutro', Inactivación: 'bad', Reactivación: 'ok' }

function Historial({ items }: { items: CambioCliente[] }) {
  return (
    <Panel titulo="Historial de cambios" detalle="Quién cambió qué y cuándo. No se puede editar ni borrar.">
      <ol className="relative">
        {items.map((h, i) => {
          const [fecha, hora] = h.fecha.split('T')
          return (
            <li key={h.id} className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
              {i < items.length - 1 && <span aria-hidden="true" className="absolute top-4 bottom-0 left-[8.5px] w-px bg-line" />}
              <span aria-hidden="true" className={cx('relative mt-1 h-[11px] w-[11px] justify-self-center rounded-full border-2', h.accion === 'Creación' ? 'border-rose bg-rose' : 'border-line-strong bg-panel')} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem]">
                  <Insignia tono={TONO_ACCION[h.accion]}>{h.accion}</Insignia>
                  <span className="font-medium">{h.usuario}</span>
                  <span className="tabular text-ink-3">{fmtFecha(fecha)} · {hora}</span>
                </div>
                {h.nota && <p className="mt-1.5 text-[0.85rem] text-ink-2">{h.nota}</p>}
                {h.cambios.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-[10px] border border-line text-[0.8rem]">
                    {h.cambios.map((x) => (
                      <li key={x.campo} className="grid gap-1 border-b border-line px-3 py-2 last:border-b-0 sm:grid-cols-[160px_minmax(0,1fr)]">
                        <span className="text-ink-3">{x.campo}</span>
                        <span className="tabular break-words"><span className="text-ink-3 line-through decoration-ink-3/50">{x.antes}</span> <span aria-hidden="true" className="text-ink-3">→</span><span className="sr-only">cambió a</span> <span className="font-medium">{x.despues}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

function DialogoEstado({ c, onCerrar }: { c: Cliente; onCerrar: () => void }) {
  const activo = c.estado === 'Activo'
  const bloqueo = activo ? bloqueoInactivar(c.id) : null
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const caja = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    caja.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  async function confirmar() {
    if (activo && !motivo.trim()) return setError('Indica el motivo.')
    try {
      await cambiarEstadoCliente(c.id, !activo, motivo.trim())
      onCerrar()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="dlg-estado">
      <button className="absolute inset-0 bg-[oklch(0.1_0_0/0.45)] backdrop-blur-[2px]" aria-label="Cerrar" onClick={onCerrar} />
      <div className="relative w-full max-w-md rounded-[14px] border border-line bg-panel p-5 shadow-2xl" style={{ animation: 'aparecer 200ms var(--ease-out-expo) both' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-panel-2 text-ink-2">{c.tipoPersona === 'Natural' ? <UserRound size={17} /> : <Building2 size={17} />}</span>
            <h2 id="dlg-estado" className="text-[1rem] font-semibold">{activo ? 'Inactivar cliente' : 'Reactivar cliente'}</h2>
          </div>
          <button onClick={onCerrar} className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink" aria-label="Cerrar"><X size={17} /></button>
        </div>
        {bloqueo ? (
          <>
            <p className="mt-4 text-[0.875rem] text-ink-2">{c.nombre} no se puede inactivar todavía. {bloqueo}</p>
            <div className="mt-5 flex justify-end"><Boton autoFocus onClick={onCerrar}>Entendido</Boton></div>
          </>
        ) : (
          <>
            <p className="mt-4 text-[0.875rem] text-ink-2">
              {activo
                ? 'Los clientes no se eliminan: se inactivan. Conserva su historial, pero deja de recibir campañas y no se le pueden crear obligaciones.'
                : 'Vuelve a recibir campañas y se le pueden crear obligaciones.'}
            </p>
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-medium text-ink-2">Motivo{!activo && <span className="font-normal text-ink-3"> · opcional</span>}</span>
              <textarea ref={caja} value={motivo} onChange={(e) => { setMotivo(e.target.value); setError('') }} rows={3} aria-invalid={!!error}
                className="w-full resize-none rounded-[9px] border border-line-strong bg-panel px-3 py-2 text-[0.875rem] focus-visible:border-rose focus-visible:ring-2 focus-visible:ring-rose/30 focus-visible:outline-none aria-[invalid=true]:border-bad" />
              {error && <span role="alert" className="text-[0.75rem] font-medium text-bad">{error}</span>}
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Boton variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
              <Boton variante="primario" onClick={confirmar}>{activo ? 'Inactivar' : 'Reactivar'}</Boton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
