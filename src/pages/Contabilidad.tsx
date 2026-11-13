import { CheckCircle2, ChevronRight, CircleAlert, Lock, Plus, Unlock } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Aviso, Boton, Campo, Encabezado, Entrada, EsqueletoPagina, Insignia, Interruptor, Panel, Pestanas, Selector, Tabla, Td, Th, Vacio } from '../components/ui'
import { round2 } from '../domain/amortizacion'
import { CONCEPTOS, nivelDe } from '../domain/contabilidad'
import { fmtFecha, fmtMes, monthKey, nombreMes, startOfMonth } from '../domain/fechas'
import { CATEGORIAS } from '../domain/provisiones'
import type { EventoContable } from '../domain/tipos'
import { cx, dinero, entero, porcentaje } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import {
  actualizarCuenta, actualizarEsquema, bloqueoDesactivar, cerrarPeriodo, checklistCierre, crearCuenta, estadoProvision, fechaCorte, libroMayor, obtenerContabilidad,
  obtenerRiesgo, reabrirPeriodo, registrarProvision,
} from '../services/api'

type Tab = 'diario' | 'mayor' | 'balance' | 'plan' | 'esquemas' | 'provisiones' | 'conciliacion' | 'cierre'
type Datos = Awaited<ReturnType<typeof obtenerContabilidad>>
const HOY = fechaCorte()
const ORIGENES = ['Desembolso', 'Pago', 'Costas judiciales', 'Provisión', 'Castigo', 'Reverso', 'Ajuste']
const TONO_ORIGEN: Record<string, 'ok' | 'acero' | 'rosa' | 'bad' | 'warn' | 'neutro'> = { Pago: 'ok', Desembolso: 'acero', 'Costas judiciales': 'rosa', Reverso: 'bad', Provisión: 'warn', Castigo: 'bad' }

export default function PaginaContabilidad() {
  const { data } = useServicio(obtenerContabilidad)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'diario'
  if (!data) return <EsqueletoPagina />
  const periodo = data.periodos.find((p) => p.mes === monthKey(HOY))!
  return (
    <div>
      <Encabezado
        titulo="Contabilidad"
        descripcion="Cada desembolso, pago, costa, provisión y castigo genera su asiento según los esquemas contables. Partida doble: el debe siempre iguala al haber."
        acciones={<Insignia tono={periodo.estado === 'Abierto' ? 'ok' : 'neutro'}>{periodo.estado === 'Abierto' ? <Unlock size={12} /> : <Lock size={12} />}{nombreMes(HOY)} {periodo.estado.toLowerCase()}</Insignia>}
      />
      <Pestanas<Tab>
        valor={tab}
        onCambio={(t) => setParams(t === 'diario' ? {} : { tab: t }, { replace: true })}
        opciones={[
          { id: 'diario', label: 'Libro diario' },
          { id: 'mayor', label: 'Libro mayor' },
          { id: 'balance', label: 'Balance y cuadre' },
          { id: 'plan', label: 'Plan de cuentas' },
          { id: 'esquemas', label: 'Esquemas contables' },
          { id: 'provisiones', label: 'Provisiones' },
          { id: 'conciliacion', label: 'Conciliación bancaria' },
          { id: 'cierre', label: 'Cierre de mes' },
        ]}
      />
      {tab === 'diario' && <Diario d={data} />}
      {tab === 'mayor' && <Mayor d={data} />}
      {tab === 'balance' && <Balance d={data} />}
      {tab === 'plan' && <Plan d={data} />}
      {tab === 'esquemas' && <Esquemas d={data} />}
      {tab === 'provisiones' && <Provisiones />}
      {tab === 'conciliacion' && <Conciliacion d={data} />}
      {tab === 'cierre' && <Cierre d={data} />}
    </div>
  )
}

const nombreDe = (d: Datos, c: string) => d.saldos.find((s) => s.codigo === c)?.nombre ?? c

// ── Libro diario ────────────────────────────────────────────────────────────
function Diario({ d }: { d: Datos }) {
  const [mes, setMes] = useState(monthKey(HOY))
  const [origen, setOrigen] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const meses = useMemo(() => [...new Set(d.asientos.map((a) => monthKey(a.fecha)))].slice(0, 14), [d])
  const filas = d.asientos.filter((a) => (!mes || monthKey(a.fecha) === mes) && (!origen || a.origen === origen))
  const debe = round2(filas.reduce((s, a) => s + a.lineas.reduce((x, l) => x + l.debe, 0), 0))
  const haber = round2(filas.reduce((s, a) => s + a.lineas.reduce((x, l) => x + l.haber, 0), 0))
  return (
    <Panel cuerpo="">
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_1fr_2fr]">
        <Campo etiqueta="Mes"><Selector value={mes} onChange={(e) => setMes(e.target.value)}>{meses.map((m) => <option key={m} value={m}>{fmtMes(m + '-01', true)}</option>)}</Selector></Campo>
        <Campo etiqueta="Origen"><Selector value={origen} onChange={(e) => setOrigen(e.target.value)}><option value="">Todos</option>{ORIGENES.map((o) => <option key={o}>{o}</option>)}</Selector></Campo>
        <div className="tabular flex flex-wrap items-end gap-x-5 gap-y-1 text-[0.8rem] text-ink-3 sm:justify-end">
          <span>{entero(filas.length)} asientos</span>
          <span>Debe <span className="font-medium text-ink">{dinero(debe)}</span></span>
          <span>Haber <span className="font-medium text-ink">{dinero(haber)}</span></span>
          {debe === haber && <span className="flex items-center gap-1 text-ok"><CheckCircle2 size={14} aria-hidden="true" /> Cuadra</span>}
        </div>
      </div>
      <Tabla etiqueta="Libro diario" className="max-h-[64vh]">
        <thead><tr><Th className="w-8"><span className="sr-only">Detalle</span></Th><Th>Asiento</Th><Th>Fecha</Th><Th>Glosa</Th><Th>Origen</Th><Th derecha>Debe</Th><Th derecha>Haber</Th></tr></thead>
        <tbody>
          {filas.slice(0, 250).map((a) => {
            const esta = abierto === a.id
            const total = round2(a.lineas.reduce((s, l) => s + l.debe, 0))
            return (
              <Fragment key={a.id}>
                <tr className="cursor-pointer hover:bg-panel-2/60" onClick={() => setAbierto(esta ? null : a.id)}>
                  <Td><button aria-expanded={esta} aria-label={`Ver líneas del asiento ${a.id}`} className="grid h-6 w-6 place-items-center rounded text-ink-3"><ChevronRight size={14} className={cx('transition-transform duration-150', esta && 'rotate-90')} /></button></Td>
                  <Td className="tabular font-medium">{a.id}</Td>
                  <Td className="whitespace-nowrap text-ink-2">{fmtFecha(a.fecha)}</Td>
                  <Td>{a.glosa}</Td>
                  <Td><Insignia tono={TONO_ORIGEN[a.origen] ?? 'neutro'}>{a.origen}</Insignia></Td>
                  <Td derecha>{dinero(total)}</Td>
                  <Td derecha>{dinero(total)}</Td>
                </tr>
                {esta && a.lineas.map((l, i) => (
                  <tr key={a.id + i} className="bg-panel-2/50 text-[0.8rem]">
                    <Td /><Td className="tabular text-ink-3">{l.cuenta}</Td><Td />
                    <Td className={cx(l.haber > 0 && 'pl-10')}>{nombreDe(d, l.cuenta)}</Td><Td />
                    <Td derecha>{l.debe ? dinero(l.debe) : ''}</Td>
                    <Td derecha>{l.haber ? dinero(l.haber) : ''}</Td>
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </Tabla>
    </Panel>
  )
}

// ── Libro mayor ─────────────────────────────────────────────────────────────
function Mayor({ d }: { d: Datos }) {
  const cuentas = d.saldos.filter((c) => c.movimiento)
  const [cuenta, setCuenta] = useState('1.4.01')
  const [desde, setDesde] = useState(startOfMonth(HOY))
  const [hasta, setHasta] = useState(HOY)
  const { data: m } = useServicio(() => libroMayor(cuenta, desde, hasta), [cuenta, desde, hasta])
  return (
    <Panel cuerpo="">
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Campo etiqueta="Cuenta"><Selector value={cuenta} onChange={(e) => setCuenta(e.target.value)}>{cuentas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}</Selector></Campo>
        <Campo etiqueta="Desde"><Entrada type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} /></Campo>
        <Campo etiqueta="Hasta"><Entrada type="date" value={hasta} max={HOY} onChange={(e) => setHasta(e.target.value)} /></Campo>
      </div>
      {!m ? <EsqueletoPagina /> : (
        <>
          <dl className="tabular grid grid-cols-2 gap-4 border-b border-line px-5 py-4 text-[0.85rem] sm:grid-cols-4">
            <div><dt className="text-[0.75rem] text-ink-3">Saldo inicial</dt><dd className="font-semibold">{dinero(m.inicial)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Débitos</dt><dd className="font-semibold">{dinero(m.debe)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Créditos</dt><dd className="font-semibold">{dinero(m.haber)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Saldo final ({m.cuenta.naturaleza.toLowerCase()})</dt><dd className="display text-[1.3rem] leading-tight">{dinero(m.final)}</dd></div>
          </dl>
          {m.movimientos.length === 0 ? <Vacio titulo="Sin movimientos en el rango" /> : (
            <Tabla etiqueta="Libro mayor" className="max-h-[60vh]">
              <thead><tr><Th>Fecha</Th><Th>Asiento</Th><Th>Glosa</Th><Th derecha>Debe</Th><Th derecha>Haber</Th><Th derecha>Saldo</Th></tr></thead>
              <tbody>
                {m.movimientos.slice(0, 400).map((x, i) => (
                  <tr key={i}>
                    <Td className="whitespace-nowrap text-ink-2">{fmtFecha(x.fecha)}</Td>
                    <Td className="tabular text-ink-3">{x.asiento}</Td>
                    <Td>{x.glosa}</Td>
                    <Td derecha>{x.debe ? dinero(x.debe) : ''}</Td>
                    <Td derecha>{x.haber ? dinero(x.haber) : ''}</Td>
                    <Td derecha className="font-medium">{dinero(x.saldo)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </>
      )}
    </Panel>
  )
}

// ── Balance de comprobación y cuadre ───────────────────────────────────────
function Balance({ d }: { d: Datos }) {
  const movs = d.saldos.filter((c) => c.movimiento)
  const debe = round2(movs.reduce((s, c) => s + c.debe, 0))
  const haber = round2(movs.reduce((s, c) => s + c.haber, 0))
  const total = (codigo: string) => d.saldos.find((c) => c.codigo === codigo)?.saldo ?? 0
  const resultado = round2(total('4') - total('5'))
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel titulo="Balance de comprobación" detalle={`Acumulado al ${fmtFecha(HOY)}`} cuerpo="">
        <Tabla etiqueta="Balance de comprobación">
          <thead><tr><Th>Cuenta</Th><Th derecha>Debe</Th><Th derecha>Haber</Th><Th derecha>Saldo</Th></tr></thead>
          <tbody>
            {d.saldos.filter((c) => c.activa && (c.debe || c.haber || !c.movimiento)).map((c) => (
              <tr key={c.codigo} className={cx(!c.movimiento && c.nivel === 1 && 'bg-panel-2/60')}>
                <Td><span style={{ paddingLeft: `${(c.nivel - 1) * 14}px` }} className={cx('inline-block', !c.movimiento && 'font-semibold')}><span className="tabular text-ink-3">{c.codigo}</span><span className="ml-2">{c.nombre}</span></span></Td>
                <Td derecha className={cx(!c.movimiento && 'text-ink-3')}>{dinero(c.debe)}</Td>
                <Td derecha className={cx(!c.movimiento && 'text-ink-3')}>{dinero(c.haber)}</Td>
                <Td derecha className={cx(c.movimiento ? 'font-medium' : 'font-semibold')}>{dinero(c.saldo)}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="font-semibold"><Td>Sumas de cuentas de movimiento</Td><Td derecha>{dinero(debe)}</Td><Td derecha>{dinero(haber)}</Td><Td derecha>{debe === haber ? <span className="text-ok">Iguales</span> : <span className="text-bad">Descuadre</span>}</Td></tr></tfoot>
        </Tabla>
      </Panel>
      <div className="space-y-4">
        <Panel titulo="Cuadre con la cartera" detalle="La cuenta contable debe igualar la suma de saldos de las operaciones vigentes (sin castigadas).">
          <dl className="tabular space-y-3 text-[0.875rem]">
            <div className="flex justify-between gap-3"><dt className="text-ink-2">1.4.01 Cartera de créditos</dt><dd className="font-medium">{dinero(d.cuadre.carteraContable)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-2">Saldos de operaciones</dt><dd className="font-medium">{dinero(d.cuadre.carteraOperativa)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-3"><dt className="font-medium">Diferencia</dt><dd className={cx('font-semibold', d.cuadre.diferencia === 0 ? 'text-ok' : 'text-bad')}>{dinero(d.cuadre.diferencia)}</dd></div>
          </dl>
          <p className={cx('mt-4 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[0.8rem]', d.cuadre.diferencia === 0 ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad')}>
            {d.cuadre.diferencia === 0 ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <CircleAlert size={15} className="mt-0.5 shrink-0" />}
            {d.cuadre.diferencia === 0 ? 'Contabilidad y cartera cuadran al centavo.' : 'Hay diferencias: revisa si un esquema contable apunta a otra cuenta de cartera.'}
          </p>
        </Panel>
        <Panel titulo="Resultado acumulado">
          <dl className="tabular space-y-2 text-[0.875rem]">
            <div className="flex justify-between"><dt className="text-ink-2">Ingresos</dt><dd>{dinero(total('4'))}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Gastos</dt><dd>−{dinero(total('5'))}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>{resultado >= 0 ? 'Utilidad' : 'Pérdida'}</dt><dd className={resultado >= 0 ? 'text-ok' : 'text-bad'}>{dinero(resultado)}</dd></div>
          </dl>
        </Panel>
      </div>
    </div>
  )
}

// ── Plan de cuentas ─────────────────────────────────────────────────────────
function Plan({ d }: { d: Datos }) {
  const grupos = d.saldos.filter((c) => !c.movimiento && nivelDe(c.codigo) === 2)
  const [padre, setPadre] = useState(grupos[0]?.codigo ?? '')
  const [nombre, setNombre] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const intentar = async (f: () => Promise<unknown>, ok: string) => {
    try { await f(); setMsg({ ok: true, t: ok }) } catch (e) { setMsg({ ok: false, t: (e as Error).message }) }
  }
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel titulo="Plan de cuentas" detalle="Grupos en negrita; las cuentas de movimiento reciben asientos." cuerpo="">
        <Tabla etiqueta="Plan de cuentas">
          <thead><tr><Th>Código</Th><Th>Nombre</Th><Th>Naturaleza</Th><Th derecha>Saldo</Th><Th>Activa</Th></tr></thead>
          <tbody>
            {d.saldos.map((c) => {
              const bloqueo = c.movimiento ? bloqueoDesactivar(c.codigo) : 'Es un grupo.'
              return (
                <tr key={c.codigo} className={cx(!c.activa && 'text-ink-3')}>
                  <Td className={cx('tabular whitespace-nowrap', !c.movimiento && 'font-semibold')}><span style={{ paddingLeft: `${(c.nivel - 1) * 14}px` }}>{c.codigo}</span></Td>
                  <Td className={cx(!c.movimiento && 'font-semibold')}>
                    {editando === c.codigo ? (
                      <span className="flex gap-2"><Entrada value={texto} onChange={(e) => setTexto(e.target.value)} className="h-8" /><Boton onClick={() => intentar(() => actualizarCuenta(c.codigo, { nombre: texto }), 'Nombre actualizado.').then(() => setEditando(null))}>Guardar</Boton></span>
                    ) : (
                      <span className="flex items-center gap-2">{c.nombre}{c.movimiento && <button onClick={() => { setEditando(c.codigo); setTexto(c.nombre) }} className="text-[0.75rem] font-normal text-rose-ink hover:underline">Renombrar</button>}</span>
                    )}
                  </Td>
                  <Td className="text-ink-2">{c.naturaleza}</Td>
                  <Td derecha className={cx(c.movimiento ? '' : 'font-semibold')}>{dinero(c.saldo)}</Td>
                  <Td>{c.movimiento ? <span title={bloqueo ?? undefined}><Interruptor activo={c.activa} onCambio={() => intentar(() => actualizarCuenta(c.codigo, { activa: !c.activa }), c.activa ? 'Cuenta desactivada.' : 'Cuenta activada.')} etiqueta={`Activar ${c.nombre}`} /></span> : null}</Td>
                </tr>
              )
            })}
          </tbody>
        </Tabla>
      </Panel>
      <div className="space-y-4">
        <Panel titulo="Nueva cuenta de movimiento">
          <div className="space-y-4">
            <Campo etiqueta="Grupo"><Selector value={padre} onChange={(e) => setPadre(e.target.value)}>{grupos.map((g) => <option key={g.codigo} value={g.codigo}>{g.codigo} · {g.nombre}</option>)}</Selector></Campo>
            <Campo etiqueta="Nombre" ayuda="El código se asigna solo. Hereda la naturaleza del grupo."><Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Gastos de cobranza" /></Campo>
            <Boton variante="primario" onClick={() => intentar(() => crearCuenta(padre, nombre), 'Cuenta creada.').then(() => setNombre(''))} icono={<Plus size={15} />}>Crear cuenta</Boton>
          </div>
        </Panel>
        {msg && (msg.ok ? <Aviso>{msg.t}</Aviso> : <p role="alert" className="rounded-[10px] bg-bad-soft px-3 py-2 text-[0.85rem] font-medium text-bad">{msg.t}</p>)}
        <p className="text-[0.78rem] text-ink-3">Una cuenta solo se desactiva si no tiene saldo y ningún esquema contable la usa.</p>
      </div>
    </div>
  )
}

// ── Esquemas contables ─────────────────────────────────────────────────────
function Esquemas({ d }: { d: Datos }) {
  const cuentas = d.saldos.filter((c) => c.movimiento && c.activa)
  const [msg, setMsg] = useState('')
  return (
    <div className="space-y-4">
      <p className="text-[0.85rem] text-ink-2">Qué cuentas mueve cada evento. Los asientos se arman solos con estos esquemas: cambia una cuenta aquí y los próximos asientos la usarán. Los ya registrados no cambian.</p>
      {msg && <Aviso>{msg}</Aviso>}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {d.esquemas.map((e) => (
          <Panel key={e.evento} titulo={e.evento} detalle={e.descripcion} cuerpo="">
            <Tabla etiqueta={`Esquema ${e.evento}`}>
              <thead><tr><Th>Concepto</Th><Th>Lado</Th><Th>Cuenta</Th></tr></thead>
              <tbody>
                {e.lineas.map((l, i) => (
                  <tr key={i}>
                    <Td className="text-ink-2">{CONCEPTOS[l.concepto] ?? l.concepto}</Td>
                    <Td><Insignia tono={l.lado === 'Debe' ? 'acero' : 'rosa'}>{l.lado}</Insignia></Td>
                    <Td>
                      <Selector value={l.cuenta} aria-label={`Cuenta para ${CONCEPTOS[l.concepto]}`} className="h-8 min-w-[15rem]"
                        onChange={async (ev) => { await actualizarEsquema(e.evento as EventoContable, i, ev.target.value); setMsg(`Esquema de ${e.evento.toLowerCase()} actualizado.`) }}>
                        {cuentas.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
                      </Selector>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </Panel>
        ))}
        <Panel titulo="Reverso" detalle="No tiene esquema propio.">
          <p className="text-[0.85rem] text-ink-2">El reverso de un pago invierte las mismas cuentas y montos del asiento original: lo que fue al debe va al haber y viceversa.</p>
        </Panel>
      </div>
    </div>
  )
}

// ── Provisiones ─────────────────────────────────────────────────────────────
function Provisiones() {
  const { data: r } = useServicio(() => obtenerRiesgo(0))
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const e = estadoProvision()
  if (!r) return <EsqueletoPagina />
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 overflow-hidden rounded-[14px] border border-line bg-panel sm:grid-cols-3">
        {[
          ['Provisión requerida', e.requerida, 'según calificación de la cartera'],
          ['Constituida en libros', e.constituida, 'saldo de la cuenta 1.4.99'],
          [e.diferencia >= 0 ? 'Por constituir' : 'Por liberar', Math.abs(e.diferencia), e.diferencia >= 0 ? 'gasto de provisión del mes' : 'la requerida bajó'],
        ].map(([k, v, n], i) => (
          <div key={k as string} className={cx('p-5', i > 0 && 'border-t border-line sm:border-t-0 sm:border-l')}>
            <p className="text-[0.75rem] text-ink-3">{k as string}</p>
            <p className={cx('display tabular mt-1 text-[1.8rem] leading-tight', i === 2 && Math.abs(e.diferencia) >= 1 && 'text-bad')}>{dinero(v as number)}</p>
            <p className="mt-1 text-[0.75rem] text-ink-3">{n as string}</p>
          </div>
        ))}
      </section>
      <Panel
        titulo="Asiento del mes"
        detalle="Ajusta la provisión contable a la requerida: debe Provisión para cartera (gasto) / haber Provisión para créditos incobrables."
        acciones={<Boton variante="primario" disabled={Math.abs(e.diferencia) < 0.01} onClick={async () => { try { const x = await registrarProvision(); setMsg({ ok: true, t: `Asiento ${x.id} registrado por ${dinero(Math.abs(x.monto))}.` }) } catch (er) { setMsg({ ok: false, t: (er as Error).message }) } }}>
          {Math.abs(e.diferencia) < 0.01 ? 'Provisión al día' : e.diferencia > 0 ? `Registrar provisión de ${dinero(e.diferencia)}` : `Liberar ${dinero(-e.diferencia)}`}
        </Boton>}
      >
        {msg ? (msg.ok ? <Aviso>{msg.t}</Aviso> : <p role="alert" className="text-[0.85rem] font-medium text-bad">{msg.t}</p>) : <p className="text-[0.85rem] text-ink-2">{e.registradaMes ? 'Ya hay un asiento de provisión este mes; si la cartera cambió, se registra el ajuste por la diferencia.' : `Aún no se registra la provisión de ${nombreMes(HOY)}.`} La proyección y el estrés están en <Link to="/riesgo" className="font-medium text-rose-ink hover:underline">Riesgo y provisiones</Link>.</p>}
      </Panel>
      <Panel titulo="Provisión por categoría" cuerpo="">
        <Tabla etiqueta="Provisión por categoría">
          <thead><tr><Th>Categoría</Th><Th derecha>% provisión</Th><Th derecha>Saldo</Th><Th derecha>Provisión</Th></tr></thead>
          <tbody>{r.porCategoria.map((c) => <tr key={c.id} className={cx(!c.operaciones && 'text-ink-3')}><Td className="font-semibold">{c.id}</Td><Td derecha>{porcentaje(c.tasa)}</Td><Td derecha>{dinero(c.saldo)}<span className="block text-[0.72rem] text-ink-3">{c.operaciones} op.</span></Td><Td derecha className="font-medium">{dinero(c.provision)}</Td></tr>)}</tbody>
          <tfoot><tr className="font-semibold"><Td>Total</Td><Td /><Td derecha>{dinero(r.saldo)}</Td><Td derecha>{dinero(r.requerida)}</Td></tr></tfoot>
        </Tabla>
      </Panel>
      <p className="text-[0.75rem] text-ink-3">Porcentajes por categoría (parámetros de la demo): {CATEGORIAS.map((c) => `${c.id} ${porcentaje(c.tasa)}`).join(' · ')}.</p>
    </div>
  )
}

// ── Conciliación bancaria ───────────────────────────────────────────────────
function Conciliacion({ d }: { d: Datos }) {
  const conciliados = d.pagosMes.filter((p) => p.conciliado)
  const pendientes = d.pagosMes.filter((p) => !p.conciliado)
  const soloBanco = d.banco.filter((m) => !m.pagoId && !m.descripcion.startsWith('TRANSF. DESEMBOLSO') && !m.descripcion.startsWith('PAGO '))
  const saldoBanco = round2(d.banco.reduce((s, m) => s + m.monto, 0))
  return (
    <div className="space-y-4">
      <dl className="tabular grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-panel md:grid-cols-4">
        {[
          ['Movimientos del banco', `${d.banco.length}`, `neto ${dinero(saldoBanco)}`],
          ['Pagos conciliados', `${conciliados.length}`, dinero(conciliados.reduce((s, p) => s + p.monto, 0))],
          ['Pagos en tránsito', `${pendientes.length}`, dinero(pendientes.reduce((s, p) => s + p.monto, 0))],
          ['Solo en el banco', `${soloBanco.length}`, dinero(soloBanco.reduce((s, m) => s + m.monto, 0))],
        ].map(([k, v, sub], i) => (
          <div key={k} className={cx('px-5 py-4', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line md:border-t-0', i === 2 && 'md:border-l')}>
            <dt className="text-[0.78rem] text-ink-3">{k}</dt>
            <dd className="display mt-1 text-[1.6rem] leading-none font-medium">{v}</dd>
            <dd className="mt-1 text-[0.75rem] text-ink-3">{sub}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel titulo="Partidas por conciliar" detalle="Requieren revisión antes del cierre" cuerpo="">
          <ul className="divide-y divide-line">
            {pendientes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                <span className="flex items-start gap-2"><CircleAlert size={15} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" /><span><span className="block font-medium">{p.cliente.nombre}</span><span className="text-[0.75rem] text-ink-3">{p.id} · {p.medio} · {fmtFecha(p.fecha)} · no aparece aún en el banco</span></span></span>
                <span className="tabular font-medium">{dinero(p.monto)}</span>
              </li>
            ))}
            {soloBanco.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                <span className="flex items-start gap-2"><CircleAlert size={15} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" /><span><span className="block font-medium">{m.descripcion}</span><span className="text-[0.75rem] text-ink-3">{fmtFecha(m.fecha)} · sin registro en Mechallex</span></span></span>
                <span className={cx('tabular font-medium', m.monto < 0 && 'text-bad')}>{dinero(m.monto)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel titulo={`Estado de cuenta · ${nombreMes(HOY)}`} detalle="Cuenta recaudadora" cuerpo="">
          <Tabla etiqueta="Movimientos bancarios" className="max-h-[420px]">
            <thead><tr><Th>Fecha</Th><Th>Descripción</Th><Th>Estado</Th><Th derecha>Monto</Th></tr></thead>
            <tbody>
              {[...d.banco].reverse().map((m) => {
                const enlazado = !!m.pagoId || m.descripcion.startsWith('TRANSF. DESEMBOLSO') || m.descripcion.startsWith('PAGO ')
                return (
                  <tr key={m.id}>
                    <Td className="whitespace-nowrap text-ink-2">{fmtFecha(m.fecha)}</Td>
                    <Td className="tabular text-[0.8rem]">{m.descripcion}</Td>
                    <Td>{enlazado ? <Insignia tono="ok">Conciliado</Insignia> : <Insignia tono="bad">Sin pareja</Insignia>}</Td>
                    <Td derecha className={cx('font-medium', m.monto < 0 && 'text-bad')}>{dinero(m.monto)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        </Panel>
      </div>
    </div>
  )
}

// ── Cierre de mes ───────────────────────────────────────────────────────────
function Cierre({ d }: { d: Datos }) {
  const actual = d.periodos.find((p) => p.mes === monthKey(HOY))!
  const lista = checklistCierre()
  const listo = lista.every((x) => !x.bloquea || x.ok)
  const [nota, setNota] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const intentar = async (f: () => Promise<unknown>, ok: string) => {
    try { await f(); setMsg({ ok: true, t: ok }); setNota('') } catch (e) { setMsg({ ok: false, t: (e as Error).message }) }
  }
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel titulo={`Cierre de ${nombreMes(HOY)} ${HOY.slice(0, 4)}`} detalle="Al cerrar, el periodo no admite pagos, desembolsos, reversos ni ajustes hasta que se reabra.">
        <ul className="space-y-2.5">
          {lista.map((x) => (
            <li key={x.id} className="flex items-start gap-3 rounded-[10px] border border-line px-3.5 py-3 text-[0.85rem]">
              {x.ok ? <CheckCircle2 size={17} className="mt-px shrink-0 text-ok" /> : <CircleAlert size={17} className={cx('mt-px shrink-0', x.bloquea ? 'text-bad' : 'text-warn')} />}
              <span className="min-w-0 flex-1"><span className="block font-medium">{x.texto}</span><span className="text-[0.78rem] text-ink-3">{x.detalle}</span></span>
              {!x.ok && <Insignia tono={x.bloquea ? 'bad' : 'warn'}>{x.bloquea ? 'Obligatorio' : 'Aviso'}</Insignia>}
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <Campo etiqueta={actual.estado === 'Abierto' ? 'Nota del cierre' : 'Motivo para reabrir'} opcional={actual.estado === 'Abierto'}><Entrada value={nota} onChange={(e) => setNota(e.target.value)} /></Campo>
          {msg && (msg.ok ? <Aviso>{msg.t}</Aviso> : <p role="alert" className="text-[0.85rem] font-medium text-bad">{msg.t}</p>)}
          {actual.estado === 'Abierto' ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.8rem] text-ink-3">{listo ? 'Todo listo para cerrar.' : 'Completa los puntos obligatorios. La provisión se registra en la pestaña Provisiones y la caja en Pagos → Caja del día.'}</p>
              <Boton variante="primario" disabled={!listo} onClick={() => intentar(() => cerrarPeriodo(nota), `${nombreMes(HOY)} cerrado.`)} icono={<Lock size={15} />}>Cerrar el mes</Boton>
            </div>
          ) : (
            <Boton onClick={() => intentar(() => reabrirPeriodo(nota), `${nombreMes(HOY)} reabierto.`)} icono={<Unlock size={15} />}>Reabrir el mes</Boton>
          )}
        </div>
      </Panel>
      <Panel titulo="Periodos" cuerpo="">
        <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {d.periodos.map((p) => (
            <li key={p.mes} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[0.85rem]">
              <span><span className="font-medium capitalize">{fmtMes(`${p.mes}-01`, true)}</span>{p.cerradoPor && <span className="block text-[0.72rem] text-ink-3">{p.estado === 'Cerrado' ? `cerrado ${p.fecha} · ${p.cerradoPor}` : p.nota}</span>}</span>
              <Insignia tono={p.estado === 'Abierto' ? 'ok' : 'neutro'}>{p.estado === 'Abierto' ? <Unlock size={11} /> : <Lock size={11} />}{p.estado}</Insignia>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
