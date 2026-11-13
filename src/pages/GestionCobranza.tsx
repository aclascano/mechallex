import { Handshake, Scale, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BandejaGestor } from '../components/BandejaGestor'
import { ejeProps, Leyenda, rejillaProps, TooltipMx } from '../components/graficos'
import { Aviso, Boton, Campo, COLOR_TRAMO, Dialogo, Encabezado, Entrada, EsqueletoPagina, Insignia, InsigniaTramo, Panel, Pestanas, Selector, Tabla, Td, Th, Vacio, type Tono } from '../components/ui'
import { TRAMOS } from '../domain/cartera'
import { CANALES_GESTION, RESULTADOS } from '../domain/cobranza'
import { addDays, fmtFecha, fmtMes } from '../domain/fechas'
import { cx, dinero, entero, plural, porcentaje } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import {
  catalogosCliente, fechaCorte, listarConvenios, listarGestiones, obtenerAsignacion, obtenerCobranza, obtenerDesempeno, propuestaBalanceo, reasignar, type FiltroGestiones,
} from '../services/api'

type Tab = 'bandeja' | 'gestiones' | 'compromisos' | 'asignacion' | 'desempeno'
const HOY = fechaCorte()

export default function PaginaGestionCobranza() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'bandeja'
  return (
    <div>
      <Encabezado titulo="Gestión de cobranza" descripcion="El trabajo diario del equipo: la cola priorizada de cada gestor, lo que se gestionó, los compromisos y convenios, el reparto de la cartera y el desempeño." />
      <Pestanas<Tab>
        valor={tab}
        onCambio={(t) => setParams(t === 'bandeja' ? {} : { tab: t }, { replace: true })}
        opciones={[
          { id: 'bandeja', label: 'Bandeja del gestor' },
          { id: 'gestiones', label: 'Bitácora de gestiones' },
          { id: 'compromisos', label: 'Promesas y convenios' },
          { id: 'asignacion', label: 'Asignación de cartera' },
          { id: 'desempeno', label: 'Desempeño' },
        ]}
      />
      {tab === 'bandeja' && <BandejaGestor />}
      {tab === 'gestiones' && <Bitacora />}
      {tab === 'compromisos' && <Compromisos />}
      {tab === 'asignacion' && <Asignacion />}
      {tab === 'desempeno' && <Desempeno />}
    </div>
  )
}

// ── Bitácora ────────────────────────────────────────────────────────────────
const TONO_RESULTADO: Partial<Record<string, Tono>> = { 'Promesa de pago': 'rosa', 'Ya pagó': 'ok', 'Se niega a pagar': 'bad', 'Número equivocado': 'warn', Enviado: 'acero' }

function Bitacora() {
  const [f, setF] = useState<FiltroGestiones>({ gestor: '', resultado: '', canal: '', desde: addDays(HOY, -30), hasta: HOY, texto: '', incluirAutomaticas: false })
  const { data } = useServicio(() => listarGestiones(f), [f])
  const set = <K extends keyof FiltroGestiones>(k: K, v: FiltroGestiones[K]) => setF((x) => ({ ...x, [k]: v }))
  return (
    <Panel cuerpo="">
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]">
        <Campo etiqueta="Buscar">
          <span className="relative"><Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" /><Entrada value={f.texto} onChange={(e) => set('texto', e.target.value)} placeholder="Cliente, cédula u operación" className="pl-8" /></span>
        </Campo>
        <Campo etiqueta="Gestor"><Selector value={f.gestor} onChange={(e) => set('gestor', e.target.value)}><option value="">Todos</option>{catalogosCliente.gestores.map((g) => <option key={g}>{g}</option>)}<option>Valeria Rivas</option></Selector></Campo>
        <Campo etiqueta="Resultado"><Selector value={f.resultado} onChange={(e) => set('resultado', e.target.value)}><option value="">Todos</option>{RESULTADOS.map((r) => <option key={r}>{r}</option>)}</Selector></Campo>
        <Campo etiqueta="Canal"><Selector value={f.canal} onChange={(e) => set('canal', e.target.value)}><option value="">Todos</option>{CANALES_GESTION.map((c) => <option key={c}>{c}</option>)}</Selector></Campo>
        <Campo etiqueta="Desde"><Entrada type="date" value={f.desde} max={f.hasta} onChange={(e) => set('desde', e.target.value)} /></Campo>
        <Campo etiqueta="Hasta"><Entrada type="date" value={f.hasta} max={HOY} onChange={(e) => set('hasta', e.target.value)} /></Campo>
      </div>
      <label className="flex items-center gap-2 border-b border-line px-5 py-2.5 text-[0.82rem] text-ink-2">
        <input type="checkbox" checked={f.incluirAutomaticas} onChange={(e) => set('incluirAutomaticas', e.target.checked)} className="h-4 w-4 accent-[var(--rose)]" />
        Incluir envíos automáticos de campañas y reglas
        {data && <span className="tabular ml-auto text-ink-3">{entero(data.total)} gestiones</span>}
      </label>
      {!data ? <EsqueletoPagina /> : data.filas.length === 0 ? <Vacio titulo="Sin gestiones con estos filtros" /> : (
        <Tabla etiqueta="Bitácora de gestiones" className="max-h-[64vh]">
          <thead><tr><Th>Fecha</Th><Th>Cliente</Th><Th>Canal</Th><Th>Resultado</Th><Th>Nota</Th><Th>Gestor</Th></tr></thead>
          <tbody>
            {data.filas.map((g) => (
              <tr key={g.id} className={cx(g.automatica && 'text-ink-3')}>
                <Td className="tabular whitespace-nowrap">{fmtFecha(g.fecha)}<span className="block text-[0.72rem] text-ink-3">{g.hora}</span></Td>
                <Td><Link to={`/clientes/${g.clienteId}`} className="hover:text-rose-ink">{g.cliente.nombre}</Link><Link to={`/operaciones/${g.operacionId}?tab=cobranza`} className="block text-[0.72rem] whitespace-nowrap text-ink-3 hover:text-rose-ink">{g.operacionId}</Link></Td>
                <Td className="whitespace-nowrap text-ink-2">{g.canal}</Td>
                <Td><Insignia tono={TONO_RESULTADO[g.resultado] ?? 'neutro'}>{g.resultado}</Insignia>{g.motivo && <span className="block text-[0.72rem] text-ink-3">{g.motivo}</span>}</Td>
                <Td className="max-w-[32ch] text-ink-2">{g.nota}{g.proxima && <span className="block text-[0.72rem] text-ink-3">Próxima: {g.proxima.accion.toLowerCase()} · {fmtFecha(g.proxima.fecha)}</span>}</Td>
                <Td className="whitespace-nowrap text-ink-2">{g.gestor}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Panel>
  )
}

// ── Promesas y convenios ────────────────────────────────────────────────────
function Compromisos() {
  const { data: convenios } = useServicio(listarConvenios)
  const { data: cob } = useServicio(obtenerCobranza)
  if (!convenios || !cob) return <EsqueletoPagina />
  const vencidas = cob.promesas.filter((p) => p.estado !== 'Vigente')
  return (
    <div className="space-y-4">
      <Panel titulo="Convenios de pago" detalle="Acuerdos para pagar el valor vencido en cuotas. El cumplimiento se calcula con los pagos recibidos desde la firma." cuerpo="">
        {convenios.length === 0 ? <Vacio titulo="Sin convenios" /> : (
          <ul className="divide-y divide-line">
            {convenios.map((c) => (
              <li key={c.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium"><Handshake size={15} className="text-rose-ink" /><Link to={`/clientes/${c.clienteId}`} className="truncate hover:text-rose-ink">{c.cliente.nombre}</Link></p>
                  <p className="tabular text-[0.75rem] text-ink-3">{c.id} · <Link to={`/operaciones/${c.operacionId}`} className="hover:text-rose-ink">{c.operacionId}</Link> · firmado {fmtFecha(c.fecha)} · {c.gestor}</p>
                </div>
                <div>
                  <ol className="flex flex-wrap gap-1.5" aria-label="Cuotas del convenio">
                    <li className={cx('tabular rounded-[7px] px-2 py-1 text-[0.72rem]', c.inicialCubierta ? 'bg-ok-soft text-ok' : 'bg-panel-2 text-ink-2')}>Inicial {dinero(c.inicial)}</li>
                    {c.cuotas.map((q) => <li key={q.n} className={cx('tabular rounded-[7px] px-2 py-1 text-[0.72rem]', q.cubierta ? 'bg-ok-soft text-ok' : q.vencida ? 'bg-bad-soft text-bad' : 'bg-panel-2 text-ink-2')} title={fmtFecha(q.fecha)}>{fmtFecha(q.fecha).slice(0, 6)} · {dinero(q.monto)}</li>)}
                  </ol>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><div className="h-full rounded-full bg-rose" style={{ width: `${c.avance * 100}%` }} /></div>
                  <p className="tabular mt-1 text-[0.72rem] text-ink-3">{dinero(c.pagado)} de {dinero(c.total)}</p>
                </div>
                <Insignia tono={c.estado === 'Cumplido' ? 'ok' : c.estado === 'Roto' ? 'bad' : 'rosa'}>{c.estado}</Insignia>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel titulo="Promesas de pago" detalle={`Cumplida si llega un pago entre 3 días antes y 2 después de la fecha. Efectividad: ${porcentaje(vencidas.filter((p) => p.estado === 'Cumplida').length / Math.max(1, vencidas.length))} de las vencidas.`} cuerpo="">
        <Tabla etiqueta="Promesas" className="max-h-[60vh]">
          <thead><tr><Th>Cliente</Th><Th>Operación</Th><Th>Compromiso</Th><Th>Canal</Th><Th>Estado</Th><Th derecha>Monto</Th></tr></thead>
          <tbody>
            {[...cob.promesas].sort((a, b) => b.fechaCompromiso.localeCompare(a.fechaCompromiso)).map((p) => (
              <tr key={p.id}>
                <Td><Link to={`/clientes/${p.clienteId}`} className="font-medium hover:text-rose-ink">{p.cliente.nombre}</Link></Td>
                <Td><Link to={`/operaciones/${p.operacionId}`} className="whitespace-nowrap text-ink-2 hover:text-rose-ink">{p.operacionId}</Link></Td>
                <Td className="whitespace-nowrap">{fmtFecha(p.fechaCompromiso)}</Td>
                <Td className="text-ink-2">{p.canal}</Td>
                <Td><Insignia tono={p.estado === 'Cumplida' ? 'ok' : p.estado === 'Vigente' ? 'rosa' : 'bad'}>{p.estado}</Insignia></Td>
                <Td derecha className="font-medium">{dinero(p.monto)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Panel>
    </div>
  )
}

// ── Asignación ──────────────────────────────────────────────────────────────
function Asignacion() {
  const { data } = useServicio(obtenerAsignacion)
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [destino, setDestino] = useState(catalogosCliente.gestores[0])
  const [filtroTramo, setFiltroTramo] = useState('')
  const [balanceo, setBalanceo] = useState<ReturnType<typeof propuestaBalanceo> | null>(null)
  const [aviso, setAviso] = useState('')
  const filas = useMemo(() => (data?.enMora ?? []).filter((o) => !filtroTramo || o.tramo === filtroTramo), [data, filtroTramo])
  if (!data) return <EsqueletoPagina />
  const clientesMarcados = [...new Set(filas.filter((o) => marcados.has(o.id)).map((o) => o.clienteId))]
  const alternar = (id: string) => setMarcados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <div className="space-y-4">
      {aviso && <Aviso>{aviso}</Aviso>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.gestores.map((g) => {
          const total = Math.max(1, g.porTramo.reduce((a, b) => a + b, 0))
          return (
            <section key={g.gestor} className="rounded-[14px] border border-line bg-panel p-4">
              <p className="flex items-center gap-2 text-[0.9rem] font-semibold"><Users size={15} className="text-ink-3" />{g.gestor}</p>
              <dl className="tabular mt-3 grid grid-cols-3 gap-2 text-[0.8rem]">
                <div><dt className="text-[0.72rem] text-ink-3">Clientes</dt><dd className="font-semibold">{g.clientes}</dd></div>
                <div><dt className="text-[0.72rem] text-ink-3">En mora</dt><dd className="font-semibold">{g.enMora}</dd></div>
                <div><dt className="text-[0.72rem] text-ink-3">Vencido</dt><dd className="font-semibold">{dinero(g.vencido)}</dd></div>
              </dl>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full" aria-label="Operaciones por tramo">
                {g.porTramo.map((n, i) => n ? <span key={i} style={{ width: `${(n / total) * 100}%`, background: COLOR_TRAMO[TRAMOS[i].id] }} title={`${TRAMOS[i].label}: ${n}`} /> : null)}
              </div>
            </section>
          )
        })}
      </div>

      <Panel
        titulo="Cartera en mora"
        detalle="Marca operaciones y pásalas a otro gestor, o pide una propuesta de reparto equilibrado por valor vencido. Las causas judiciales no se reasignan aquí."
        acciones={<Boton onClick={() => setBalanceo(propuestaBalanceo())} icono={<Scale size={15} />}>Balancear carga</Boton>}
        cuerpo=""
      >
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <Campo etiqueta="Tramo"><Selector value={filtroTramo} onChange={(e) => setFiltroTramo(e.target.value)}><option value="">Todos</option>{TRAMOS.filter((t) => t.id !== 'al-dia').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Selector></Campo>
          <Campo etiqueta="Pasar a"><Selector value={destino} onChange={(e) => setDestino(e.target.value)}>{catalogosCliente.gestores.map((g) => <option key={g}>{g}</option>)}</Selector></Campo>
          <Boton variante="primario" disabled={!clientesMarcados.length} onClick={async () => { const n = await reasignar(clientesMarcados, destino); setMarcados(new Set()); setAviso(`${plural(n, 'cliente reasignado', 'clientes reasignados')} a ${destino}. Queda en el historial de cada cliente.`) }}>
            Reasignar {clientesMarcados.length ? plural(clientesMarcados.length, 'cliente', 'clientes') : ''}
          </Boton>
        </div>
        <Tabla etiqueta="Cartera en mora" className="max-h-[56vh]">
          <thead><tr><Th><span className="sr-only">Marcar</span></Th><Th>Cliente</Th><Th>Ciudad</Th><Th>Antigüedad</Th><Th>Gestor</Th><Th derecha>Vencido</Th></tr></thead>
          <tbody>
            {filas.map((o) => (
              <tr key={o.id} className={cx(marcados.has(o.id) && 'bg-rose-soft/30')}>
                <Td><input type="checkbox" checked={marcados.has(o.id)} onChange={() => alternar(o.id)} aria-label={`Marcar ${o.cliente}`} className="h-4 w-4 accent-[var(--rose)]" /></Td>
                <Td><Link to={`/clientes/${o.clienteId}`} className="font-medium hover:text-rose-ink">{o.cliente}</Link><span className="block text-[0.72rem] text-ink-3">{o.id}</span></Td>
                <Td className="text-ink-2">{o.ciudad}</Td>
                <Td><InsigniaTramo tramo={o.tramo} /></Td>
                <Td className="whitespace-nowrap text-ink-2">{o.gestor}</Td>
                <Td derecha className="font-medium">{dinero(o.vencido)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Panel>

      {balanceo && (
        <Dialogo titulo="Propuesta de reparto" descripcion="Cada cliente en mora va al gestor con menos valor vencido acumulado, empezando por los de mayor deuda." onCerrar={() => setBalanceo(null)} ancho="max-w-xl">
          <div className="space-y-4">
            <ul className="tabular grid grid-cols-2 gap-2 text-[0.82rem]">{balanceo.carga.map((c) => <li key={c.gestor} className="flex justify-between rounded-[9px] bg-panel-2 px-3 py-2"><span>{c.gestor}</span><span className="font-semibold">{dinero(c.vencido)}</span></li>)}</ul>
            {balanceo.cambios.length === 0 ? <p className="text-[0.85rem] text-ink-2">La carga ya está equilibrada.</p> : (
              <ul className="max-h-[300px] divide-y divide-line overflow-y-auto rounded-[12px] border border-line text-[0.82rem]">
                {balanceo.cambios.map((c) => <li key={c.clienteId} className="flex justify-between gap-3 px-3 py-2"><span className="truncate">{c.cliente}</span><span className="shrink-0 text-ink-3">{c.de} → <span className="font-medium text-ink">{c.a}</span></span></li>)}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Boton variante="fantasma" onClick={() => setBalanceo(null)}>Cancelar</Boton>
              <Boton variante="primario" disabled={!balanceo.cambios.length} onClick={async () => {
                for (const g of catalogosCliente.gestores) await reasignar(balanceo.cambios.filter((c) => c.a === g).map((c) => c.clienteId), g)
                setAviso(`${plural(balanceo.cambios.length, 'cliente reasignado', 'clientes reasignados')} para equilibrar la carga.`)
                setBalanceo(null)
              }}>Aplicar {balanceo.cambios.length} cambios</Boton>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  )
}

// ── Desempeño ───────────────────────────────────────────────────────────────
function Desempeno() {
  const [dias, setDias] = useState(90)
  const { data: d } = useServicio(() => obtenerDesempeno(dias), [dias])
  if (!d) return <EsqueletoPagina />
  const maxMotivo = Math.max(1, ...d.motivos.map((m) => m.n))
  return (
    <div className="space-y-4">
      <Panel titulo="Por gestor" detalle={`Últimos ${d.dias} días. Contactabilidad: gestiones en las que se habló con el deudor. Cumplimiento: promesas vencidas que se pagaron.`} acciones={<Selector value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo" className="w-auto"><option value={30}>30 días</option><option value={90}>90 días</option><option value={180}>180 días</option></Selector>} cuerpo="">
        <Tabla etiqueta="Desempeño por gestor">
          <thead><tr><Th>Gestor</Th><Th derecha>Gestiones</Th><Th derecha>Contactabilidad</Th><Th derecha>Promesas</Th><Th derecha>Cumplimiento</Th><Th derecha>Recuperado</Th></tr></thead>
          <tbody>
            {d.porGestor.map((g) => (
              <tr key={g.gestor}>
                <Td className="font-medium">{g.gestor}</Td>
                <Td derecha>{g.gestiones}</Td>
                <Td derecha><Medida v={g.contactabilidad} /></Td>
                <Td derecha>{g.promesas}</Td>
                <Td derecha><Medida v={g.cumplimiento} /></Td>
                <Td derecha className="font-semibold">{dinero(g.recuperado)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Panel>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel titulo="Gestiones por día" detalle="Últimas dos semanas.">
          <div className="mb-2"><Leyenda items={[{ color: 'var(--rose)', label: 'Del equipo' }, { color: 'var(--steel)', label: 'Automáticas' }]} /></div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.porDia.map((x) => ({ ...x, dia: `${Number(x.fecha.slice(8))} ${fmtMes(x.fecha)}` }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...rejillaProps} />
                <XAxis dataKey="dia" {...ejeProps} interval="preserveStartEnd" />
                <YAxis {...ejeProps} width={30} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--panel-2)' }} content={(p) => <TooltipMx {...p} formato={(v) => entero(v)} />} />
                <Bar isAnimationActive={false} dataKey="manuales" name="Del equipo" stackId="a" fill="var(--rose)" />
                <Bar isAnimationActive={false} dataKey="automaticas" name="Automáticas" stackId="a" fill="var(--steel)" fillOpacity={0.5} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel titulo="Motivos de no pago" detalle="Lo que declaran los deudores contactados.">
          {d.motivos.length === 0 ? <Vacio titulo="Sin datos" /> : (
            <ul className="space-y-2.5">
              {d.motivos.map((m) => (
                <li key={m.motivo} className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_2rem] items-center gap-3 text-[0.82rem]">
                  <span className="truncate text-ink-2">{m.motivo}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="block h-full rounded-full bg-rose" style={{ width: `${(m.n / maxMotivo) * 100}%` }} /></span>
                  <span className="tabular text-right font-medium">{m.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel titulo="Por canal" cuerpo="">
          <Tabla etiqueta="Desempeño por canal">
            <thead><tr><Th>Canal</Th><Th derecha>Gestiones</Th><Th derecha>Contacto o entrega</Th><Th derecha>Promesas</Th></tr></thead>
            <tbody>{d.porCanal.map((c) => <tr key={c.canal}><Td className="font-medium">{c.canal}</Td><Td derecha>{c.gestiones}</Td><Td derecha><Medida v={c.contactabilidad} /></Td><Td derecha>{c.promesas}</Td></tr>)}</tbody>
          </Tabla>
        </Panel>
        <Panel titulo="Resultados" cuerpo="">
          <ul className="divide-y divide-line">
            {d.porResultado.filter((r) => r.n).map((r) => <li key={r.resultado} className="flex items-center justify-between px-5 py-2.5 text-[0.85rem]"><Insignia tono={TONO_RESULTADO[r.resultado] ?? 'neutro'}>{r.resultado}</Insignia><span className="tabular font-medium">{r.n} <span className="font-normal text-ink-3">· {porcentaje(r.n / Math.max(1, d.total))}</span></span></li>)}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Medida({ v }: { v: number | null }) {
  if (v === null) return <span className="text-ink-3">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-line sm:inline-block" aria-hidden="true"><span className="block h-full rounded-full bg-rose" style={{ width: `${v * 100}%` }} /></span>
      <span className="tabular w-12 text-right">{porcentaje(v)}</span>
    </span>
  )
}
