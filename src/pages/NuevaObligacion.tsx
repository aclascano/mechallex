import { AlertTriangle, ArrowLeft, ArrowRight, Calculator, CheckCircle2, OctagonX, Plus, Search, Trash2, UserPlus, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarraCobertura } from '../components/Cobertura'
import { ejeProps, Leyenda, rejillaProps, TooltipMx } from '../components/graficos'
import { Pasos } from '../components/Pasos'
import { Boton, Campo, Encabezado, Entrada, EsqueletoPagina, Insignia, InsigniaTramo, Interruptor, Panel, Segmentado, Selector, Tabla, Td, Th } from '../components/ui'
import { totales, type Sistema } from '../domain/amortizacion'
import { capacidadPago } from '../domain/clientes'
import { fmtFecha, fmtFechaLarga } from '../domain/fechas'
import {
  costos, evaluar, PASOS_OBLIGACION, primerVencimiento, requisitosGarantia, tablaObligacion, validarPaso,
  type DatosObligacion, type Errores, type GarantiaNueva, type ProductoCredito,
} from '../domain/obligacion'
import type { Producto, TipoGarantia } from '../domain/tipos'
import { compacto, cx, dinero, dineroCorto, plural, porcentaje } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { catalogoProductos, crearObligacion, datosDeudor, fechaCorte, listarClientes, usuariaActual } from '../services/api'

const HOY = fechaCorte()
const USUARIA = usuariaActual

function inicial(clienteId = ''): DatosObligacion {
  const p = catalogoProductos[0]
  return {
    clienteId, producto: p.id, monto: 5000, plazoMeses: 24, tasaAnual: p.tasa[1], sistema: 'frances', diaPago: 5, graciaMeses: 0,
    seguro: true, garantes: [], reales: [], aprobada: false, observacion: '', medio: 'Transferencia', cuentaDestino: '',
  }
}

// Borrador: se conserva mientras se navega (por ejemplo, para crear al deudor y volver).
let borrador: { datos: DatosObligacion; paso: number } | null = null

export default function PaginaNuevaObligacion() {
  const [params] = useSearchParams()
  const desdeCliente = params.get('cliente')
  const [datos, setDatos] = useState<DatosObligacion>(() => {
    if (desdeCliente) return { ...(borrador?.datos ?? inicial()), clienteId: desdeCliente }
    return borrador?.datos ?? inicial()
  })
  const [paso, setPaso] = useState(() => (desdeCliente && !borrador ? 1 : borrador?.paso ?? 0))
  const [intentado, setIntentado] = useState<Set<number>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const titulo = useRef<HTMLHeadingElement>(null)
  const navigate = useNavigate()

  useEffect(() => { borrador = { datos, paso } }, [datos, paso])

  const producto = catalogoProductos.find((p) => p.id === datos.producto)!
  const deudor = datos.clienteId ? datosDeudor(datos.clienteId) : null
  const tabla = useMemo(() => tablaObligacion(datos, HOY), [datos])
  const ctx = { cliente: deudor?.cliente, bloqueoDeudor: deudor?.bloqueo }
  const pasos = PASOS_OBLIGACION
  const actual = pasos[paso].id
  const erroresDe = (i: number) => validarPaso(pasos[i].id, datos, producto, ctx)
  const valido = (i: number) => Object.keys(erroresDe(i)).length === 0
  const errores: Errores = intentado.has(paso) ? erroresDe(paso) : {}
  const ev = deudor ? evaluar(tabla, deudor.cliente, deudor.exposicion) : null
  const bloqueada = ev?.alertas.some((a) => a.nivel === 'bloqueo') ?? false

  const set = <K extends keyof DatosObligacion>(k: K, v: DatosObligacion[K]) => setDatos((d) => ({ ...d, [k]: v, ...(k !== 'aprobada' && k !== 'observacion' && k !== 'medio' && k !== 'cuentaDestino' ? { aprobada: false } : {}) }))
  const ir = (i: number) => {
    setPaso(i)
    requestAnimationFrame(() => titulo.current?.focus())
  }
  const siguiente = () => {
    setIntentado((s) => new Set(s).add(paso))
    if (valido(paso) && !(actual === 'aprobacion' && bloqueada)) ir(paso + 1)
  }
  const puedeIrA = (i: number) => i <= paso || pasos.slice(0, i).every((_, j) => valido(j))

  async function desembolsar() {
    setIntentado((s) => new Set(s).add(paso))
    if (!valido(paso)) return
    setEnviando(true)
    setErrorEnvio('')
    try {
      const op = await crearObligacion(datos)
      borrador = null
      navigate(`/operaciones/${op.id}?creada=1`)
    } catch (e) {
      setErrorEnvio((e as Error).message)
      setEnviando(false)
    }
  }

  const c = costos(datos, producto)
  const ultimo = paso === pasos.length - 1

  return (
    <div>
      <Encabezado
        titulo="Nueva obligación"
        descripcion="Del deudor al desembolso en seis pasos. Al desembolsar se crean la operación, su tabla de amortización, sus garantías y el asiento contable."
        acciones={
          <>
            {(datos.clienteId || datos.garantes.length > 0) && (
              <Boton variante="fantasma" onClick={() => { borrador = null; setDatos(inicial()); setIntentado(new Set()); ir(0) }}>Empezar de nuevo</Boton>
            )}
            <Link to="/amortizacion" className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-line-strong bg-panel px-3.5 text-[0.85rem] font-medium hover:bg-panel-2">
              <Calculator size={15} /> Solo simular
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Pasos pasos={pasos} actual={paso} hecho={valido} conError={(i) => intentado.has(i) && !valido(i)} puedeIrA={puedeIrA} onIr={ir} />
          <div className="mt-5 hidden rounded-[14px] border border-line bg-panel p-4 lg:block">
            <p className="truncate text-[0.875rem] font-medium">{deudor?.cliente.nombre ?? <span className="text-ink-3">Sin deudor</span>}</p>
            <p className="text-[0.75rem] text-ink-3">{datos.producto} · {datos.sistema === 'frances' ? 'francés' : 'alemán'}</p>
            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[0.8rem]">
              <div className="flex justify-between gap-2"><dt className="text-ink-3">Monto</dt><dd className="tabular font-medium">{dinero(datos.monto || 0)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-3">Plazo</dt><dd className="tabular">{datos.plazoMeses} meses</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-3">Cuota</dt><dd className="tabular font-medium">{tabla.length ? dinero(tabla[Math.min(datos.graciaMeses + 1, tabla.length - 1)].cuota) : '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-3">Neto a recibir</dt><dd className="tabular">{dinero(c.neto)}</dd></div>
            </dl>
          </div>
        </aside>

        <div className="min-w-0">
          <Panel cuerpo="p-5 sm:p-6">
            <div className="mb-6">
              <p className="text-[0.75rem] font-medium tracking-wide text-ink-3 uppercase">Paso {paso + 1} · {pasos[paso].detalle}</p>
              <h2 ref={titulo} tabIndex={-1} className="display mt-1 text-[1.6rem] leading-tight focus:outline-none">{pasos[paso].titulo}</h2>
            </div>
            <div key={actual} style={{ animation: 'aparecer 220ms var(--ease-out-expo) both' }}>
              {actual === 'deudor' && <PasoDeudor datos={datos} set={set} e={errores} deudor={deudor} />}
              {actual === 'condiciones' && <PasoCondiciones datos={datos} setDatos={setDatos} e={errores} producto={producto} />}
              {actual === 'garantias' && <PasoGarantias datos={datos} set={set} e={errores} />}
              {actual === 'tabla' && <PasoTabla datos={datos} set={set} />}
              {actual === 'aprobacion' && deudor && ev && <PasoAprobacion datos={datos} set={set} e={errores} deudor={deudor} ev={ev} bloqueada={bloqueada} />}
              {actual === 'desembolso' && <PasoDesembolso datos={datos} set={set} e={errores} producto={producto} />}
            </div>
          </Panel>
          {errorEnvio && <p role="alert" className="mt-3 rounded-[10px] bg-bad-soft px-3 py-2 text-[0.85rem] font-medium text-bad">{errorEnvio}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Boton variante="fantasma" onClick={() => ir(paso - 1)} disabled={paso === 0} icono={<ArrowLeft size={16} />}>Atrás</Boton>
            {ultimo ? (
              <Boton variante="primario" onClick={desembolsar} disabled={enviando}>{enviando ? 'Desembolsando…' : `Desembolsar ${dinero(c.neto)}`}</Boton>
            ) : (
              <Boton variante="primario" onClick={siguiente} disabled={actual === 'aprobacion' && bloqueada}>Siguiente <ArrowRight size={16} /></Boton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Utilidades de los pasos ─────────────────────────────────────────────────
type Fijar = <K extends keyof DatosObligacion>(k: K, v: DatosObligacion[K]) => void

function DineroEntrada({ valor, onCambio, invalido, paso = 100 }: { valor: number; onCambio: (v: number) => void; invalido?: boolean; paso?: number }) {
  return (
    <span className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[0.85rem] text-ink-3" aria-hidden="true">$</span>
      <Entrada type="number" min={0} step={paso} inputMode="decimal" value={valor || ''} onChange={(ev) => onCambio(ev.target.value === '' ? 0 : Math.max(0, Number(ev.target.value)))} className="pl-6 text-right" aria-invalid={invalido} placeholder="0" />
    </span>
  )
}

function Cifra({ etiqueta, valor, nota, grande }: { etiqueta: string; valor: ReactNode; nota?: ReactNode; grande?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.75rem] text-ink-3">{etiqueta}</p>
      <p className={cx('tabular mt-0.5', grande ? 'display text-[1.7rem] leading-tight' : 'text-[0.95rem] font-semibold')}>{valor}</p>
      {nota && <p className="text-[0.72rem] text-ink-3">{nota}</p>}
    </div>
  )
}

// ── 1. Deudor ───────────────────────────────────────────────────────────────
function PasoDeudor({ datos, set, e, deudor }: { datos: DatosObligacion; set: Fijar; e: Errores; deudor: ReturnType<typeof datosDeudor> }) {
  const { data: clientes } = useServicio(listarClientes)
  const [q, setQ] = useState('')
  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!clientes || !t) return []
    return clientes.filter((c) => c.nombre.toLowerCase().includes(t) || c.cedula.includes(t)).slice(0, 6)
  }, [clientes, q])
  if (!clientes) return <EsqueletoPagina />
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Campo etiqueta="Buscar cliente" className="flex-1" error={!deudor ? e.clienteId : undefined}>
          <span className="relative">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <Entrada value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Nombre, cédula o RUC" className="pl-8" autoComplete="off" />
          </span>
        </Campo>
        <Link to="/clientes/nuevo?volver=obligacion" className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-line-strong bg-panel px-3.5 text-[0.85rem] font-medium hover:bg-panel-2">
          <UserPlus size={15} /> Crear cliente nuevo
        </Link>
      </div>
      {resultados.length > 0 && (
        <ul className="overflow-hidden rounded-[12px] border border-line" aria-label="Resultados">
          {resultados.map((c) => (
            <li key={c.id} className="border-b border-line last:border-b-0">
              <button onClick={() => { set('clienteId', c.id); setQ('') }} className={cx('flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-panel-2', c.estado === 'Inactivo' && 'text-ink-3')}>
                <span className="min-w-0">
                  <span className="block truncate text-[0.875rem] font-medium">{c.nombre}</span>
                  <span className="tabular text-[0.75rem] text-ink-3">{c.cedula} · {c.ciudad}{c.estado === 'Inactivo' ? ' · inactivo' : ''}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {c.operaciones > 0 && <InsigniaTramo tramo={c.tramo} />}
                  <span className="text-[0.8rem] font-medium text-rose-ink">Elegir</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && resultados.length === 0 && <p className="text-[0.85rem] text-ink-3">Ningún cliente coincide con “{q}”. Puedes crearlo sin perder lo avanzado.</p>}

      {deudor && (
        <div className={cx('rounded-[14px] border p-5', deudor.bloqueo ? 'border-bad/50 bg-bad-soft/30' : 'border-rose/40 bg-rose-soft/25')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-panel text-rose-ink"><UserRound size={19} /></span>
              <div>
                <Link to={`/clientes/${deudor.cliente.id}`} className="text-[1rem] font-semibold hover:text-rose-ink">{deudor.cliente.nombre}</Link>
                <p className="tabular text-[0.8rem] text-ink-3">{deudor.cliente.tipoIdentificacion} {deudor.cliente.cedula} · {deudor.cliente.ciudad} · gestor {deudor.cliente.gestor}</p>
              </div>
            </div>
            <Boton variante="fantasma" onClick={() => set('clienteId', '')}>Cambiar</Boton>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Cifra etiqueta="Ingresos mensuales" valor={dinero(deudor.cliente.ingresos)} />
            <Cifra etiqueta="Capacidad de pago" valor={dinero(capacidadPago(deudor.cliente))} nota="ingresos − egresos" />
            <Cifra etiqueta="Deuda vigente" valor={dinero(deudor.exposicion.saldo)} nota={plural(deudor.exposicion.operaciones, 'operación', 'operaciones')} />
            <Cifra etiqueta="Cuotas que ya paga" valor={dinero(deudor.exposicion.cuotasVigentes)} nota="por mes" />
          </dl>
          {deudor.bloqueo && <p role="alert" className="mt-4 flex items-start gap-2 text-[0.85rem] font-medium text-bad"><OctagonX size={17} className="mt-px shrink-0" />{deudor.bloqueo}</p>}
        </div>
      )}
      {!deudor && !q && <p className="text-[0.85rem] text-ink-3">Busca al deudor por nombre o cédula. Solo se le puede prestar a un cliente activo, sin mora mayor a 30 días ni juicios.</p>}
      <input type="hidden" value={datos.clienteId} />
    </div>
  )
}

// ── 2. Condiciones ──────────────────────────────────────────────────────────
function PasoCondiciones({ datos, setDatos, e, producto }: { datos: DatosObligacion; setDatos: (f: (d: DatosObligacion) => DatosObligacion) => void; e: Errores; producto: ProductoCredito }) {
  const fijar = <K extends keyof DatosObligacion>(k: K, v: DatosObligacion[K]) => setDatos((d) => ({ ...d, [k]: v, aprobada: false }))
  const elegir = (id: Producto) => setDatos((d) => {
    const p = catalogoProductos.find((x) => x.id === id)!
    const clamp = (v: number, [a, b]: readonly [number, number]) => Math.min(b, Math.max(a, v))
    return {
      ...d, producto: id, aprobada: false,
      monto: clamp(d.monto, p.monto), plazoMeses: Math.round(clamp(d.plazoMeses, p.plazo) / 6) * 6, tasaAnual: p.tasa[1],
      seguro: p.seguroObligatorio || (p.seguroAnual > 0 && d.seguro), graciaMeses: Math.min(d.graciaMeses, p.graciaMax),
      sistema: id === 'Vivienda' ? 'aleman' : d.sistema,
    }
  })
  const plazos = Array.from({ length: Math.floor((producto.plazo[1] - producto.plazo[0]) / 6) + 1 }, (_, i) => producto.plazo[0] + i * 6)
  const tabla = tablaObligacion(datos, HOY)
  const c = costos(datos, producto)
  const cuotaRef = tabla[Math.min(datos.graciaMeses + 1, tabla.length - 1)]
  const primera = tabla[datos.graciaMeses]
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-[0.875rem] font-semibold">Producto</legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
          {catalogoProductos.map((p) => (
            <button key={p.id} role="radio" aria-checked={datos.producto === p.id} onClick={() => elegir(p.id)}
              className={cx('rounded-[12px] border p-4 text-left transition-colors', datos.producto === p.id ? 'border-rose bg-rose-soft/40' : 'border-line hover:border-line-strong')}>
              <span className="flex items-center justify-between gap-2"><span className="text-[0.9rem] font-semibold">{p.id}</span>{datos.producto === p.id && <CheckCircle2 size={17} className="text-rose-ink" />}</span>
              <span className="mt-0.5 block text-[0.8rem] text-ink-2">{p.descripcion}</span>
              <span className="tabular mt-2 block text-[0.75rem] text-ink-3">{p.tasa[0].toLocaleString('es-EC')}–{p.tasa[1].toLocaleString('es-EC')} % · {p.plazo[0]}–{p.plazo[1]} meses · hasta {compacto(p.monto[1])}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Campo etiqueta="Monto" error={e.monto} ayuda={`Entre ${dineroCorto(producto.monto[0])} y ${dineroCorto(producto.monto[1])}`}><DineroEntrada valor={datos.monto} onCambio={(v) => fijar('monto', v)} invalido={!!e.monto} /></Campo>
          <Campo etiqueta="Plazo" error={e.plazoMeses}>
            <Selector value={datos.plazoMeses} onChange={(ev) => fijar('plazoMeses', Number(ev.target.value))}>
              {plazos.map((p) => <option key={p} value={p}>{p} meses</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Tasa nominal anual (%)" error={e.tasaAnual} ayuda={`Techo del producto: ${producto.tasa[1].toLocaleString('es-EC')} %`}>
            <Entrada type="number" step={0.01} min={producto.tasa[0]} max={producto.tasa[1]} value={datos.tasaAnual} onChange={(ev) => fijar('tasaAnual', Number(ev.target.value))} aria-invalid={!!e.tasaAnual} className="text-right" />
          </Campo>
          <Campo etiqueta="Día de pago" ayuda={`Primer vencimiento: ${fmtFecha(primerVencimiento(HOY, datos.diaPago))}`}>
            <Selector value={datos.diaPago} onChange={(ev) => fijar('diaPago', Number(ev.target.value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d} de cada mes</option>)}
            </Selector>
          </Campo>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[0.8rem] font-medium text-ink-2">Sistema de amortización</p>
            <Segmentado<Sistema> etiqueta="Sistema de amortización" valor={datos.sistema} onCambio={(v) => fijar('sistema', v)} opciones={[{ id: 'frances', label: 'Francés · cuota fija' }, { id: 'aleman', label: 'Alemán · capital fijo' }]} />
          </div>
          <Campo etiqueta="Gracia de capital" error={e.graciaMeses} ayuda={producto.graciaMax ? 'Meses iniciales en que solo paga interés.' : 'Este producto no admite gracia.'}>
            <Selector value={datos.graciaMeses} onChange={(ev) => fijar('graciaMeses', Number(ev.target.value))} disabled={!producto.graciaMax}>
              {Array.from({ length: producto.graciaMax + 1 }, (_, i) => i).map((g) => <option key={g} value={g}>{g === 0 ? 'Sin gracia' : `${g} ${g === 1 ? 'mes' : 'meses'}`}</option>)}
            </Selector>
          </Campo>
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.8rem] font-medium text-ink-2">Seguro de desgravamen</span>
            <div className="flex h-9 items-center gap-3">
              <Interruptor activo={datos.seguro} onCambio={() => !producto.seguroObligatorio && producto.seguroAnual > 0 && fijar('seguro', !datos.seguro)} etiqueta="Seguro de desgravamen" />
              <span className="text-[0.8rem] text-ink-2">{producto.seguroAnual === 0 ? 'No aplica a este producto' : producto.seguroObligatorio ? 'Obligatorio en este producto' : datos.seguro ? 'Incluido' : 'Sin seguro'}</span>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[14px] border border-line bg-panel-2/50 p-5">
          <Cifra etiqueta={datos.graciaMeses ? `Cuota después de la gracia` : datos.sistema === 'frances' ? 'Cuota fija' : 'Primera cuota'} valor={cuotaRef ? dinero(cuotaRef.cuota) : '—'} grande nota={datos.graciaMeses && tabla[0] ? `Durante la gracia: ${dinero(tabla[0].cuota)} (solo interés)` : primera && cuotaRef && Math.abs(primera.cuota - cuotaRef.cuota) > 0.5 ? `La primera es ${dinero(primera.cuota)}: su periodo no es de un mes exacto.` : undefined} />
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[0.82rem]">
            <div className="flex justify-between gap-2"><dt className="text-ink-3">Total de intereses</dt><dd className="tabular">{dinero(totales(tabla).interes)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-ink-3">Comisión de apertura</dt><dd className="tabular">{dinero(c.comision)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-ink-3">Seguro (prima única)</dt><dd className="tabular">{dinero(c.seguro)}</dd></div>
            <div className="flex justify-between gap-2 border-t border-line pt-2 font-semibold"><dt>Neto a recibir</dt><dd className="tabular">{dinero(c.neto)}</dd></div>
          </dl>
          <p className="mt-3 text-[0.72rem] text-ink-3">La comisión ({porcentaje(producto.comision)}) y el seguro se descuentan del desembolso.</p>
        </aside>
      </div>
    </div>
  )
}

// ── 3. Garantías ────────────────────────────────────────────────────────────
const TIPOS_GARANTIA: TipoGarantia[] = ['Hipoteca', 'Prenda comercial', 'Prenda vehicular', 'Ahorro encajado']

function PasoGarantias({ datos, set, e }: { datos: DatosObligacion; set: Fijar; e: Errores }) {
  const { data: clientes } = useServicio(listarClientes)
  const [q, setQ] = useState('')
  const req = requisitosGarantia(datos.producto, datos.monto)
  const valor = datos.reales.reduce((s, r) => s + (r.valorAvaluo || 0), 0)
  const candidatos = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!clientes || !t) return []
    return clientes.filter((c) => c.tipoPersona === 'Natural' && c.estado === 'Activo' && c.id !== datos.clienteId && !datos.garantes.some((g) => g.clienteId === c.id)
      && (c.nombre.toLowerCase().includes(t) || c.cedula.includes(t))).slice(0, 5)
  }, [clientes, q, datos.clienteId, datos.garantes])
  const cambiarG = (i: number, k: keyof DatosObligacion['garantes'][number], v: string | number) => set('garantes', datos.garantes.map((g, j) => (j === i ? { ...g, [k]: v } : g)))
  const cambiarR = <K extends keyof GarantiaNueva>(i: number, k: K, v: GarantiaNueva[K]) => set('reales', datos.reales.map((r, j) => (j === i ? { ...r, [k]: v } : r)))

  return (
    <div className="space-y-7">
      <p className="flex items-start gap-2 rounded-[10px] bg-panel-2 px-3.5 py-2.5 text-[0.85rem] text-ink-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-ink-3" />{req.texto}</p>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-[0.875rem] font-semibold">Garantes personales</h3>
            <p className="text-[0.8rem] text-ink-3">Responden solidariamente si el deudor no paga.</p>
          </div>
        </div>
        {e.garantes && <p role="alert" className="mb-3 text-[0.8rem] font-medium text-bad">{e.garantes}</p>}
        <ul className="space-y-3">
          {datos.garantes.map((g, i) => (
            <li key={i} className="rounded-[12px] border border-line p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[0.85rem] font-medium"><UserRound size={15} className="text-ink-3" />Garante {i + 1}{g.clienteId && <Insignia className="h-[18px] text-[0.68rem]">Cliente {g.clienteId}</Insignia>}</span>
                <Boton variante="fantasma" onClick={() => set('garantes', datos.garantes.filter((_, j) => j !== i))} icono={<Trash2 size={15} />} aria-label={`Quitar garante ${i + 1}`}>Quitar</Boton>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Campo etiqueta="Nombre completo" error={e[`g.${i}.nombre`]}><Entrada value={g.nombre} readOnly={!!g.clienteId} onChange={(ev) => cambiarG(i, 'nombre', ev.target.value)} aria-invalid={!!e[`g.${i}.nombre`]} /></Campo>
                <Campo etiqueta="Cédula" error={e[`g.${i}.cedula`]}><Entrada value={g.cedula} readOnly={!!g.clienteId} inputMode="numeric" maxLength={10} onChange={(ev) => cambiarG(i, 'cedula', ev.target.value.replace(/\D/g, ''))} aria-invalid={!!e[`g.${i}.cedula`]} /></Campo>
                <Campo etiqueta="Relación con el deudor"><Entrada value={g.relacion} onChange={(ev) => cambiarG(i, 'relacion', ev.target.value)} placeholder="Ej.: hermano/a" /></Campo>
                <Campo etiqueta="Ingresos mensuales"><DineroEntrada valor={g.ingresos} onCambio={(v) => cambiarG(i, 'ingresos', v)} /></Campo>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-3 rounded-[12px] border border-dashed border-line-strong p-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <Campo etiqueta="Agregar un cliente como garante">
              <span className="relative">
                <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                <Entrada value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Nombre o cédula" className="pl-8" autoComplete="off" />
              </span>
            </Campo>
            {candidatos.length > 0 && (
              <ul className="mt-2 overflow-hidden rounded-[10px] border border-line">
                {candidatos.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-b-0">
                    <button className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[0.85rem] hover:bg-panel-2"
                      onClick={() => { set('garantes', [...datos.garantes, { clienteId: c.id, nombre: c.nombre, cedula: c.cedula, telefono: c.telefono, relacion: '', ingresos: c.ingresos }]); setQ('') }}>
                      <span className="min-w-0 truncate">{c.nombre} <span className="tabular text-ink-3">· {c.cedula}</span></span>
                      <span className="shrink-0 font-medium text-rose-ink">Agregar</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Boton className="sm:mt-[26px]" onClick={() => set('garantes', [...datos.garantes, { nombre: '', cedula: '', telefono: '', relacion: '', ingresos: 0 }])} icono={<Plus size={15} />}>Persona que no es cliente</Boton>
        </div>
      </section>

      <section>
        <h3 className="text-[0.875rem] font-semibold">Garantías reales</h3>
        <p className="mb-3 text-[0.8rem] text-ink-3">Bienes que respaldan el crédito, por su valor de avalúo.</p>
        {e.reales && <p role="alert" className="mb-3 text-[0.8rem] font-medium text-bad">{e.reales}</p>}
        <ul className="space-y-3">
          {datos.reales.map((r, i) => (
            <li key={i} className="rounded-[12px] border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[180px_minmax(0,1fr)_160px_150px_auto] xl:items-start">
                <Campo etiqueta="Tipo">
                  <Selector value={r.tipo} onChange={(ev) => cambiarR(i, 'tipo', ev.target.value as TipoGarantia)}>{TIPOS_GARANTIA.map((t) => <option key={t}>{t}</option>)}</Selector>
                </Campo>
                <Campo etiqueta="Descripción del bien" error={e[`r.${i}.descripcion`]}><Entrada value={r.descripcion} onChange={(ev) => cambiarR(i, 'descripcion', ev.target.value)} placeholder="Ej.: casa de dos plantas, 150 m²" aria-invalid={!!e[`r.${i}.descripcion`]} /></Campo>
                <Campo etiqueta="Valor de avalúo" error={e[`r.${i}.valorAvaluo`]}><DineroEntrada valor={r.valorAvaluo} onCambio={(v) => cambiarR(i, 'valorAvaluo', v)} invalido={!!e[`r.${i}.valorAvaluo`]} paso={500} /></Campo>
                <Campo etiqueta="Fecha de avalúo"><Entrada type="date" value={r.fechaAvaluo} max={HOY} onChange={(ev) => cambiarR(i, 'fechaAvaluo', ev.target.value)} /></Campo>
                <Boton variante="fantasma" className="xl:mt-[26px]" onClick={() => set('reales', datos.reales.filter((_, j) => j !== i))} icono={<Trash2 size={15} />} aria-label={`Quitar garantía ${i + 1}`}>Quitar</Boton>
                <Campo etiqueta="Inscripción o contrato" opcional className="sm:col-span-2 xl:col-span-5"><Entrada value={r.detalle} onChange={(ev) => cambiarR(i, 'detalle', ev.target.value)} placeholder="Ej.: inscripción en el Registro de la Propiedad" /></Campo>
              </div>
            </li>
          ))}
        </ul>
        <Boton className="mt-3" onClick={() => set('reales', [...datos.reales, { tipo: datos.producto === 'Vivienda' ? 'Hipoteca' : 'Prenda comercial', descripcion: '', valorAvaluo: 0, fechaAvaluo: HOY, detalle: '' }])} icono={<Plus size={15} />}>Agregar garantía real</Boton>
        {(datos.reales.length > 0 || req.coberturaMinima > 0) && (
          <div className="mt-5 max-w-md text-[0.85rem]">
            <BarraCobertura cobertura={datos.monto ? valor / datos.monto : 0} minima={req.coberturaMinima} valor={valor} base="el monto" />
          </div>
        )}
      </section>
    </div>
  )
}

// ── 4. Tabla ────────────────────────────────────────────────────────────────
function PasoTabla({ datos, set }: { datos: DatosObligacion; set: Fijar }) {
  const tabla = tablaObligacion(datos, HOY)
  const alternativas = (['frances', 'aleman'] as Sistema[]).map((s) => {
    const t = tablaObligacion(datos, HOY, s)
    const amort = t.slice(datos.graciaMeses)
    const cuotas = amort.map((c) => c.cuota)
    return { s, alta: Math.max(0, ...cuotas), baja: cuotas.length ? Math.min(...cuotas) : 0, interes: totales(t).interes }
  })
  const t = totales(tabla)
  const serie = tabla.map((c) => ({ n: c.n, Capital: c.capital, Interés: c.interes }))
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Comparar sistemas">
        {alternativas.map((a) => {
          const elegido = datos.sistema === a.s
          const otro = alternativas.find((x) => x.s !== a.s)!
          return (
            <button key={a.s} role="radio" aria-checked={elegido} onClick={() => set('sistema', a.s)}
              className={cx('rounded-[12px] border p-4 text-left transition-colors', elegido ? 'border-rose bg-rose-soft/40' : 'border-line hover:border-line-strong')}>
              <span className="flex items-center justify-between"><span className="text-[0.9rem] font-semibold">{a.s === 'frances' ? 'Francés · cuota fija' : 'Alemán · capital fijo'}</span>{elegido && <Insignia tono="rosa">Elegido</Insignia>}</span>
              <span className="tabular mt-3 grid grid-cols-3 gap-2 text-[0.8rem]">
                <span><span className="block text-ink-3">Cuota más alta</span><span className="font-semibold">{dinero(a.alta)}</span></span>
                <span><span className="block text-ink-3">Cuota más baja</span><span className="font-semibold">{dinero(a.baja)}</span></span>
                <span><span className="block text-ink-3">Intereses</span><span className="font-semibold">{dinero(a.interes)}</span></span>
              </span>
              <span className="mt-2 block text-[0.75rem] text-ink-3">{a.interes < otro.interes ? `Paga ${dinero(otro.interes - a.interes)} menos de interés.` : `Su cuota más alta es ${dinero(otro.alta - a.alta)} menor.`}</span>
            </button>
          )
        })}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[0.875rem] font-semibold">Composición de cada cuota</h3>
          <Leyenda items={[{ color: 'var(--rose)', label: 'Capital' }, { color: 'var(--steel)', label: 'Interés' }]} />
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={1}>
              <CartesianGrid {...rejillaProps} />
              <XAxis dataKey="n" {...ejeProps} interval="preserveStartEnd" />
              <YAxis {...ejeProps} tickFormatter={compacto} width={48} />
              <Tooltip cursor={{ fill: 'var(--panel-2)' }} content={(p) => <TooltipMx {...p} titulo={(l) => `Cuota ${l}`} formato={(v) => dinero(v)} />} />
              <Bar isAnimationActive={false} dataKey="Capital" stackId="c" fill="var(--rose)" />
              <Bar isAnimationActive={false} dataKey="Interés" stackId="c" fill="var(--steel)" fillOpacity={0.55} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Tabla etiqueta="Tabla de amortización propuesta" className="max-h-[420px] rounded-[12px] border border-line">
        <thead><tr><Th>N.º</Th><Th>Vence</Th><Th derecha>Capital</Th><Th derecha>Interés</Th><Th derecha>Cuota</Th><Th derecha>Saldo</Th></tr></thead>
        <tbody>
          {tabla.map((c) => (
            <tr key={c.n} className={cx(c.n <= datos.graciaMeses && 'bg-panel-2/50')}>
              <Td className="text-ink-3">{c.n}{c.n <= datos.graciaMeses && <span className="ml-1.5 text-[0.7rem]">gracia</span>}</Td>
              <Td className="whitespace-nowrap">{fmtFecha(c.fecha)}</Td>
              <Td derecha className="text-ink-2">{dinero(c.capital)}</Td>
              <Td derecha className="text-ink-2">{dinero(c.interes)}</Td>
              <Td derecha className="font-medium">{dinero(c.cuota)}</Td>
              <Td derecha>{dinero(c.saldo)}</Td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="font-semibold"><Td>Total</Td><Td /><Td derecha>{dinero(t.capital)}</Td><Td derecha>{dinero(t.interes)}</Td><Td derecha>{dinero(t.cuota)}</Td><Td /></tr></tfoot>
      </Tabla>
      <p className="text-[0.75rem] text-ink-3">La primera cuota cubre los días reales entre el desembolso ({fmtFecha(HOY)}) y el primer vencimiento, por eso su interés puede ser distinto.</p>
    </div>
  )
}

// ── 5. Aprobación ───────────────────────────────────────────────────────────
function PasoAprobacion({ datos, set, e, deudor, ev, bloqueada }: {
  datos: DatosObligacion; set: Fijar; e: Errores; deudor: NonNullable<ReturnType<typeof datosDeudor>>; ev: ReturnType<typeof evaluar>; bloqueada: boolean
}) {
  const ICONO = { ok: CheckCircle2, aviso: AlertTriangle, bloqueo: OctagonX }
  const COLOR = { ok: 'text-ok', aviso: 'text-warn', bloqueo: 'text-bad' }
  const medidor = (valor: number, limite: number) => (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
      <div className={cx('h-full rounded-full', valor > limite ? 'bg-bad' : valor > limite * 0.8 ? 'bg-warn' : 'bg-ok')} style={{ width: `${Math.min(1, valor) * 100}%` }} />
    </div>
  )
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[12px] border border-line p-4"><Cifra etiqueta="Cuota máxima" valor={dinero(ev.cuotaMax)} grande /></div>
        <div className="rounded-[12px] border border-line p-4"><Cifra etiqueta="Total a pagar" valor={dinero(ev.totalPagar)} grande nota={`intereses ${dinero(ev.totalInteres)}`} /></div>
        <div className="rounded-[12px] border border-line p-4">
          <Cifra etiqueta="Cuotas / ingreso" valor={porcentaje(ev.relacionIngreso)} grande nota="límite de política 40 %" />
          {medidor(ev.relacionIngreso, 0.4)}
        </div>
        <div className="rounded-[12px] border border-line p-4">
          <Cifra etiqueta="Uso de la capacidad libre" valor={Number.isFinite(ev.usoCapacidad) ? porcentaje(ev.usoCapacidad) : 'Sin capacidad'} grande nota={`libre ${dinero(ev.libre)} al mes`} />
          {medidor(Number.isFinite(ev.usoCapacidad) ? ev.usoCapacidad : 1.2, 1)}
        </div>
      </div>

      <ul className="space-y-2">
        {ev.alertas.map((a, i) => {
          const I = ICONO[a.nivel]
          return <li key={i} className="flex items-start gap-2.5 text-[0.875rem]"><I size={17} className={cx('mt-0.5 shrink-0', COLOR[a.nivel])} aria-hidden="true" /><span><span className="sr-only">{a.nivel}: </span>{a.texto}</span></li>
        })}
      </ul>

      <dl className="grid gap-x-6 gap-y-3 rounded-[12px] border border-line p-4 text-[0.85rem] sm:grid-cols-2">
        {[
          ['Deudor', `${deudor.cliente.nombre} · ${deudor.cliente.cedula}`],
          ['Producto', `${datos.producto} · ${datos.sistema === 'frances' ? 'francés' : 'alemán'}`],
          ['Monto y plazo', `${dinero(datos.monto)} a ${datos.plazoMeses} meses`],
          ['Tasa', `${datos.tasaAnual.toLocaleString('es-EC', { minimumFractionDigits: 2 })} % nominal anual`],
          ['Garantes', datos.garantes.length ? datos.garantes.map((g) => g.nombre).join(', ') : 'Ninguno'],
          ['Garantías reales', datos.reales.length ? datos.reales.map((r) => `${r.tipo} (${dinero(r.valorAvaluo)})`).join(', ') : 'Ninguna'],
        ].map(([k, v]) => <div key={k}><dt className="text-[0.75rem] text-ink-3">{k}</dt><dd className="tabular mt-0.5">{v}</dd></div>)}
      </dl>

      <Campo etiqueta="Observaciones de la aprobación" opcional>
        <textarea value={datos.observacion} onChange={(ev) => set('observacion', ev.target.value)} rows={3}
          className="w-full resize-none rounded-[9px] border border-line-strong bg-panel px-3 py-2 text-[0.875rem] focus-visible:border-rose focus-visible:ring-2 focus-visible:ring-rose/30 focus-visible:outline-none" />
      </Campo>

      {bloqueada ? (
        <p role="alert" className="flex items-start gap-2 rounded-[10px] bg-bad-soft px-3.5 py-2.5 text-[0.85rem] font-medium text-bad"><OctagonX size={17} className="mt-px shrink-0" />No se puede aprobar: la cuota supera la capacidad de pago. Baja el monto, alarga el plazo o elige el sistema francés.</p>
      ) : (
        <label className={cx('flex cursor-pointer items-start gap-3 rounded-[12px] border p-4 transition-colors', datos.aprobada ? 'border-rose bg-rose-soft/40' : e.aprobada ? 'border-bad' : 'border-line hover:border-line-strong')}>
          <input type="checkbox" checked={datos.aprobada} onChange={(ev) => set('aprobada', ev.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--rose)]" />
          <span>
            <span className="block text-[0.875rem] font-medium">Apruebo esta obligación</span>
            <span className="block text-[0.8rem] text-ink-3">{USUARIA.nombre} · {USUARIA.cargo} · {fmtFechaLarga(HOY)}. Si cambias las condiciones, la aprobación se anula.</span>
            {e.aprobada && <span role="alert" className="mt-1 block text-[0.75rem] font-medium text-bad">{e.aprobada}</span>}
          </span>
        </label>
      )}
    </div>
  )
}

// ── 6. Desembolso ───────────────────────────────────────────────────────────
function PasoDesembolso({ datos, set, e, producto }: { datos: DatosObligacion; set: Fijar; e: Errores; producto: ProductoCredito }) {
  const c = costos(datos, producto)
  const asiento = [
    ['1.4.01 Cartera de créditos', datos.monto, 0],
    [`1.1.01 Bancos`, 0, c.neto],
    ['4.1.03 Comisiones por apertura', 0, c.comision],
    ['2.1.01 Primas de seguro por pagar', 0, c.seguro],
  ].filter(([, d, h]) => Number(d) > 0 || Number(h) > 0) as [string, number, number][]
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-[0.8rem] font-medium text-ink-2">Medio de desembolso</p>
          <Segmentado<DatosObligacion['medio']> etiqueta="Medio de desembolso" valor={datos.medio} onCambio={(v) => set('medio', v)} opciones={[{ id: 'Transferencia', label: 'Transferencia' }, { id: 'Cheque', label: 'Cheque' }, { id: 'Efectivo', label: 'Efectivo' }]} />
        </div>
        {datos.medio === 'Transferencia' && (
          <Campo etiqueta="Cuenta de ahorros del cliente" error={e.cuentaDestino} ayuda="Cuenta en la misma entidad.">
            <Entrada value={datos.cuentaDestino} onChange={(ev) => set('cuentaDestino', ev.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={12} aria-invalid={!!e.cuentaDestino} />
          </Campo>
        )}
        {datos.medio !== 'Transferencia' && <p className="text-[0.85rem] text-ink-2">{datos.medio === 'Cheque' ? 'Se emite un cheque a nombre del deudor.' : 'Se entrega en ventanilla con firma del deudor.'}</p>}
        <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4">
          <Cifra etiqueta="Fecha de desembolso" valor={fmtFecha(HOY)} />
          <Cifra etiqueta="Primer vencimiento" valor={fmtFecha(primerVencimiento(HOY, datos.diaPago))} />
        </dl>
      </div>
      <div className="space-y-4">
        <div className="rounded-[14px] border border-line bg-panel-2/50 p-5">
          <p className="text-[0.75rem] font-medium tracking-wide text-ink-3 uppercase">Liquidación del desembolso</p>
          <dl className="mt-3 space-y-2 text-[0.875rem]">
            <div className="flex justify-between"><dt className="text-ink-2">Monto aprobado</dt><dd className="tabular">{dinero(datos.monto)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Comisión de apertura</dt><dd className="tabular">−{dinero(c.comision)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Seguro de desgravamen</dt><dd className="tabular">−{dinero(c.seguro)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-3"><dt className="font-semibold">Neto a entregar</dt><dd className="display tabular text-[1.7rem] leading-none">{dinero(c.neto)}</dd></div>
          </dl>
        </div>
        <div>
          <p className="mb-2 text-[0.8rem] font-medium text-ink-2">Asiento que se registrará</p>
          <Tabla etiqueta="Asiento contable del desembolso" className="rounded-[12px] border border-line">
            <thead><tr><Th>Cuenta</Th><Th derecha>Debe</Th><Th derecha>Haber</Th></tr></thead>
            <tbody>{asiento.map(([cta, d, h]) => <tr key={cta}><Td className="text-ink-2">{cta}</Td><Td derecha>{d ? dinero(d) : ''}</Td><Td derecha>{h ? dinero(h) : ''}</Td></tr>)}</tbody>
          </Tabla>
        </div>
      </div>
    </div>
  )
}
