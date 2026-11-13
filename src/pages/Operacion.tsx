import { ArrowLeft, Banknote, FileCheck2, FileClock, Gavel, Home, Landmark, Printer, ShieldCheck, Truck, UserRound, Wallet } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { AbonoCapital, AvisoAccion, Precancelacion } from '../components/AccionesOperacion'
import { BarraCobertura } from '../components/Cobertura'
import { RegistroPago } from '../components/RegistroPago'
import {
  Boton, Dato, Dialogo, Encabezado, Entrada, EsqueletoPagina, Insignia, InsigniaTramo, Microimpresion, Panel, Pestanas, RecorridoCobranza, Segmentado, Tabla, Td, Th, Vacio, type Tono,
} from '../components/ui'
import { totales } from '../domain/amortizacion'
import { DIAS_SUSPENSION_DEVENGO, type EstadoDevengo } from '../domain/operacion'
import { diffDays, fmtFecha, fmtFechaLarga } from '../domain/fechas'
import type { TipoGarantia } from '../domain/tipos'
import { cx, dinero, plural, porcentaje } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { fechaCorte, listarOperaciones, obtenerOperacion } from '../services/api'

type Tab = 'resumen' | 'tabla' | 'devengo' | 'garantias' | 'pagos' | 'cuenta' | 'cobranza' | 'documentos'
type Accion = 'pago' | 'abono' | 'precancelar' | null
type Detalle = NonNullable<Awaited<ReturnType<typeof obtenerOperacion>>>

const HOY = fechaCorte()

export default function PaginaOperacion() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { data: d, cargando } = useServicio(() => obtenerOperacion(id), [id])
  const [accion, setAccion] = useState<Accion>(null)
  const [aviso, setAviso] = useState(() => (params.get('creada') ? 'Obligación desembolsada. Ya está en la cartera, en el panel y en contabilidad.' : ''))
  const tab = (params.get('tab') as Tab) || 'resumen'
  const cerrar = useCallback(() => setAccion(null), [])
  const listo = useCallback((msg: string) => { setAccion(null); setAviso(msg) }, [])

  if (!d) return cargando ? <EsqueletoPagina /> : <Vacio titulo="Operación no encontrada">Revisa el número o vuelve a la lista de operaciones.</Vacio>
  const cambiarTab = (t: Tab) => setParams(t === 'resumen' ? {} : { tab: t }, { replace: true })
  const estado: [string, Tono] = d.cancelada ? ['Cancelada', 'ok'] : d.juicio ? ['En juicio', 'bad'] : d.diasMora > 0 ? ['En mora', 'warn'] : ['Vigente', 'rosa']

  return (
    <div>
      <Link to="/operaciones" className="mb-3 inline-flex items-center gap-1.5 text-[0.8rem] text-ink-3 hover:text-ink print:hidden"><ArrowLeft size={14} /> Operaciones</Link>
      <Encabezado
        titulo={d.id}
        descripcion={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Insignia tono={estado[1]}>{estado[0]}</Insignia>
            <Link to={`/clientes/${d.clienteId}`} className="font-medium text-ink hover:text-rose-ink">{d.cliente.nombre}</Link>
            <span aria-hidden="true">·</span>
            <span>{d.producto}</span>
            <span aria-hidden="true">·</span>
            <span>sistema {d.sistema === 'frances' ? 'francés' : 'alemán'}</span>
            <span aria-hidden="true">·</span>
            <span>cartera {d.origen.toLowerCase()}</span>
          </span>
        }
        acciones={
          <div className="flex flex-wrap gap-2 print:hidden">
            {d.juicio && <Link to={`/juicios?causa=${d.juicio.id}`} className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-line-strong bg-panel px-3.5 text-[0.85rem] font-medium hover:bg-panel-2"><Gavel size={15} /> Causa</Link>}
            {!d.cancelada && (
              <>
                <Boton variante="fantasma" onClick={() => setAccion('precancelar')}>Precancelar</Boton>
                <Boton onClick={() => setAccion('abono')}>Abono a capital</Boton>
                <Boton variante="primario" onClick={() => setAccion('pago')} icono={<Wallet size={15} />}>Registrar pago</Boton>
              </>
            )}
          </div>
        }
      />

      {aviso && <AvisoAccion mensaje={aviso} />}

      <div className="print:hidden">
        <Pestanas<Tab>
          valor={tab}
          onCambio={(t) => { cambiarTab(t); setAviso('') }}
          opciones={[
            { id: 'resumen', label: 'Resumen' },
            { id: 'tabla', label: 'Tabla de amortización' },
            { id: 'devengo', label: 'Tabla devengada' },
            { id: 'garantias', label: 'Garantías', cuenta: d.garantias.garantes.length + d.garantias.reales.length },
            { id: 'pagos', label: 'Pagos', cuenta: d.pagos.length },
            { id: 'cuenta', label: 'Estado de cuenta' },
            { id: 'cobranza', label: 'Cobranza' },
            { id: 'documentos', label: 'Documentos', cuenta: d.documentos.length },
          ]}
        />
      </div>

      {tab === 'resumen' && <Resumen d={d} irA={cambiarTab} />}
      {tab === 'tabla' && <TablaAmortizacion d={d} />}
      {tab === 'devengo' && <TablaDevengada d={d} />}
      {tab === 'garantias' && <Garantias d={d} />}
      {tab === 'pagos' && <Pagos d={d} />}
      {tab === 'cuenta' && <EstadoCuenta d={d} />}
      {tab === 'cobranza' && <Cobranza d={d} />}
      {tab === 'documentos' && <Documentos d={d} />}

      {accion === 'pago' && (
        <Dialogo titulo="Registrar pago" descripcion={`${d.id} · ${d.cliente.nombre}`} onCerrar={cerrar}>
          <PagoDialogo opId={d.id} />
        </Dialogo>
      )}
      {accion === 'abono' && (
        <Dialogo titulo="Abono extraordinario a capital" descripcion="Reduce el saldo y recalcula las cuotas que faltan." onCerrar={cerrar}>
          <AbonoCapital operacionId={d.id} onListo={listo} />
        </Dialogo>
      )}
      {accion === 'precancelar' && (
        <Dialogo titulo="Precancelar la operación" descripcion={`Liquidación al ${fmtFechaLarga(HOY)}`} onCerrar={cerrar} ancho="max-w-md">
          <Precancelacion operacionId={d.id} saldoCapital={d.saldoCapital} saldos={d.saldos} onListo={listo} />
        </Dialogo>
      )}
    </div>
  )
}

function PagoDialogo({ opId }: { opId: string }) {
  const { data: todas } = useServicio(listarOperaciones)
  return todas ? <RegistroPago operaciones={todas} operacionInicial={opId} /> : <p className="text-ink-3">Cargando…</p>
}

// ── Resumen ─────────────────────────────────────────────────────────────────
function Resumen({ d, irA }: { d: Detalle; irA: (t: Tab) => void }) {
  const avance = d.capitalPagado / d.monto
  const s = d.saldos
  const pendientes = d.tabla.filter((_, i) => (d.aplicadoPorCuota[i] ?? 0) < d.tabla[i].cuota - 0.005 && !d.cancelada).slice(0, 4)
  const cuotaActual = pendientes[0] ?? d.tabla[d.tabla.length - 1]
  const filas: [string, number, string?][] = [
    ['Capital por vencer', s.capitalPorVencer],
    ['Capital vencido', s.capitalVencido],
    ['Interés vencido', s.interesVencido],
    ['Interés devengado del periodo', s.interesEnCurso, `${plural(s.diasPeriodoEnCurso, 'día', 'días')} transcurridos`],
    ['Recargo por mora', s.mora, d.diasMora > 3 ? `${d.diasMora} días sobre ${dinero(d.valorVencido)}` : undefined],
  ]
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-[14px] border border-line bg-panel" aria-label="Saldo de la operación">
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-[0.8rem] font-medium text-ink-2">Saldo de capital</p>
              <p className="display tabular mt-1 text-[2.4rem] leading-none font-medium">{dinero(d.saldoCapital)}</p>
              <div className="mt-3 flex items-center gap-3 text-[0.78rem] text-ink-3">
                <span className="relative h-1 w-full max-w-48 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="absolute inset-y-0 left-0 bg-rose" style={{ width: `${avance * 100}%` }} /></span>
                {porcentaje(avance)} del capital pagado
              </div>
            </div>
            {!d.cancelada && (
              <div className="flex flex-col gap-2 sm:items-end">
                <InsigniaTramo tramo={d.tramo} />
                <RecorridoCobranza etapa={d.etapa} />
              </div>
            )}
          </div>
          <Microimpresion className="border-y border-line px-5 py-[3px] text-ink-3/70" />
          <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <dl className="p-5">
              <p className="mb-2 text-[0.75rem] font-medium tracking-wide text-ink-3 uppercase">Saldos al {fmtFecha(HOY)}</p>
              {filas.map(([k, v, nota]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
                  <dt className="text-[0.85rem] text-ink-2">{k}{nota && <span className="block text-[0.72rem] text-ink-3">{nota}</span>}</dt>
                  <dd className={cx('tabular text-[0.875rem] font-medium', v === 0 && 'text-ink-3')}>{dinero(v)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col justify-between gap-4 border-t border-line bg-panel-2/40 p-5 md:border-t-0 md:border-l">
              <div>
                <p className="text-[0.8rem] text-ink-2">Para ponerse al día</p>
                <p className={cx('display tabular mt-1 text-[1.9rem] leading-none', s.exigible > 0 ? 'text-bad' : 'text-ink-3')}>{dinero(s.exigible)}</p>
                <p className="mt-1.5 text-[0.75rem] text-ink-3">{s.exigible > 0 ? `${plural(d.cuotasVencidas, 'cuota vencida', 'cuotas vencidas')} más recargo` : 'Sin valores vencidos'}</p>
              </div>
              <div>
                <p className="text-[0.8rem] text-ink-2">Para cancelar hoy</p>
                <p className="display tabular mt-1 text-[1.9rem] leading-none">{dinero(s.liquidacion)}</p>
                <p className="mt-1.5 text-[0.75rem] text-ink-3">Capital, interés devengado y recargo. Interés diario {dinero(s.interesDiario)}.</p>
              </div>
            </div>
          </div>
        </section>

        <Panel titulo="Cuotas pendientes" acciones={<button onClick={() => irA('tabla')} className="text-[0.8rem] font-medium text-rose-ink hover:underline">Ver tabla completa</button>} cuerpo="">
          {d.cancelada ? <Vacio titulo="Operación cancelada">No quedan cuotas por pagar.</Vacio> : (
            <Tabla etiqueta="Cuotas pendientes">
              <thead><tr><Th>N.º</Th><Th>Vence</Th><Th derecha>Capital</Th><Th derecha>Interés</Th><Th derecha>Cuota</Th><Th>Estado</Th></tr></thead>
              <tbody>
                {pendientes.map((c) => {
                  const i = c.n - 1
                  const ap = d.aplicadoPorCuota[i] ?? 0
                  return (
                    <tr key={c.n}>
                      <Td className="text-ink-3">{c.n}</Td>
                      <Td className="whitespace-nowrap">{fmtFecha(c.fecha)}</Td>
                      <Td derecha className="text-ink-2">{dinero(c.capital)}</Td>
                      <Td derecha className="text-ink-2">{dinero(c.interes)}</Td>
                      <Td derecha className="font-medium">{dinero(c.cuota)}</Td>
                      <Td>{c.fecha < HOY ? <Insignia tono="bad">Vencida{ap > 0 ? ` · abono ${dinero(ap)}` : ''}</Insignia> : ap > 0 ? <Insignia tono="rosa">Abono {dinero(ap)}</Insignia> : <Insignia>En {plural(diffDays(c.fecha, HOY), 'día', 'días')}</Insignia>}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </Tabla>
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel titulo="Condiciones">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Dato etiqueta="Monto desembolsado">{dinero(d.monto)}</Dato>
            <Dato etiqueta="Tasa nominal anual">{d.tasaAnual.toLocaleString('es-EC', { minimumFractionDigits: 2 })} %</Dato>
            <Dato etiqueta="Plazo">{d.tabla.length} meses{d.tabla.length !== d.plazoMeses && <span className="text-ink-3"> (orig. {d.plazoMeses})</span>}</Dato>
            <Dato etiqueta="Cuota actual">{dinero(cuotaActual.cuota)}</Dato>
            <Dato etiqueta="Desembolso">{fmtFecha(d.fechaDesembolso)}</Dato>
            <Dato etiqueta="Vencimiento final">{fmtFecha(d.tabla[d.tabla.length - 1].fecha)}</Dato>
            <Dato etiqueta="Día de pago">{Number(d.tabla[0].fecha.slice(8))} de cada mes</Dato>
            <Dato etiqueta="Cuotas pagadas">{d.cuotasPagadas} de {d.tabla.length}</Dato>
          </dl>
        </Panel>
        <Panel titulo="Garantías" acciones={<button onClick={() => irA('garantias')} className="text-[0.8rem] font-medium text-rose-ink hover:underline">Ver detalle</button>}>
          <ResumenGarantias d={d} />
        </Panel>
        {d.recalculos && d.recalculos.length > 0 && (
          <Panel titulo="Recálculos por abono a capital" cuerpo="">
            <ul className="divide-y divide-line">
              {d.recalculos.map((r) => (
                <li key={r.pagoId} className="px-5 py-3 text-[0.82rem]">
                  <p className="font-medium">{fmtFecha(r.fecha)} · abono {dinero(r.abono)}</p>
                  <p className="tabular text-ink-3">Cuota {dinero(r.cuotaAntes)} → {dinero(r.cuotaDespues)} · {r.plazoAntes} → {r.plazoDespues} cuotas restantes</p>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}

function ResumenGarantias({ d }: { d: Detalle }) {
  const g = d.garantias
  if (!g.garantes.length && !g.reales.length) return <p className="text-[0.85rem] text-ink-3">Crédito sin garantía (quirografario).</p>
  return (
    <div className="space-y-3 text-[0.85rem]">
      {g.reales.length > 0 && <BarraCobertura cobertura={g.cobertura} minima={d.coberturaMinima} valor={g.valorReal} cancelada={d.cancelada} />}
      <ul className="space-y-1.5 text-ink-2">
        {g.reales.map((r) => <li key={r.id} className="flex items-center gap-2"><IconoGarantia tipo={r.tipo} />{r.tipo} · {dinero(r.valorAvaluo)}</li>)}
        {g.garantes.map((x) => <li key={x.id} className="flex items-center gap-2"><UserRound size={15} className="text-ink-3" aria-hidden="true" />Garante: {x.nombre}</li>)}
      </ul>
    </div>
  )
}

const ICONOS_GARANTIA: Record<TipoGarantia, typeof Home> = { Hipoteca: Home, 'Prenda comercial': Landmark, 'Prenda vehicular': Truck, 'Ahorro encajado': Banknote }
function IconoGarantia({ tipo }: { tipo: TipoGarantia }) {
  const I = ICONOS_GARANTIA[tipo]
  return <I size={15} className="text-ink-3" aria-hidden="true" />
}

// ── Tabla de amortización ──────────────────────────────────────────────────
function TablaAmortizacion({ d }: { d: Detalle }) {
  const [filtro, setFiltro] = useState<'todas' | 'pendientes'>('todas')
  const t = totales(d.tabla)
  const filas = d.tabla.map((c, i) => ({ c, i })).filter(({ c, i }) => filtro === 'todas' || (!d.cancelada && (d.aplicadoPorCuota[i] ?? 0) < c.cuota - 0.005))
  return (
    <Panel
      titulo="Tabla de amortización"
      detalle={`Capital ${dinero(t.capital)} = monto desembolsado · intereses ${dinero(t.interes)}${d.recalculos?.length ? ' · recalculada por abono a capital' : ''}`}
      acciones={<Segmentado etiqueta="Cuotas a mostrar" valor={filtro} onCambio={setFiltro} opciones={[{ id: 'todas', label: 'Todas' }, { id: 'pendientes', label: 'Pendientes' }]} />}
      cuerpo=""
    >
      <Tabla etiqueta="Tabla de amortización" className="max-h-[68vh]">
        <thead>
          <tr><Th>N.º</Th><Th>Vence</Th><Th derecha>Saldo inicial</Th><Th derecha>Capital</Th><Th derecha>Interés</Th><Th derecha>Cuota</Th><Th derecha>Saldo</Th><Th>Estado</Th><Th>Pagada el</Th></tr>
        </thead>
        <tbody>
          {filas.map(({ c, i }) => {
            const aplicado = d.aplicadoPorCuota[i] ?? 0
            const fechaPago = d.fechasPago[i]
            const pagada = d.cancelada || aplicado >= c.cuota - 0.005
            const parcial = !pagada && aplicado > 0
            const vencida = !pagada && c.fecha < HOY
            const atraso = fechaPago ? diffDays(fechaPago, c.fecha) : 0
            const precancelada = d.cancelada && aplicado < c.cuota - 0.005
            return (
              <tr key={c.n} className={cx(vencida && 'bg-bad-soft/40', c.fecha >= HOY && i > 0 && d.tabla[i - 1].fecha < HOY && 'border-t-2 border-t-rose')}>
                <Td className="text-ink-3">{c.n}</Td>
                <Td className="whitespace-nowrap">{fmtFecha(c.fecha)}</Td>
                <Td derecha className="text-ink-3">{dinero(c.saldoInicial)}</Td>
                <Td derecha className="text-ink-2">{dinero(c.capital)}</Td>
                <Td derecha className="text-ink-2">{dinero(c.interes)}</Td>
                <Td derecha className="font-medium">{dinero(c.cuota)}</Td>
                <Td derecha>{dinero(c.saldo)}</Td>
                <Td>
                  {precancelada ? <Insignia tono="ok">Precancelada</Insignia>
                    : pagada ? <Insignia tono="ok">Pagada</Insignia>
                    : vencida ? <Insignia tono="bad">{parcial ? `Vencida · abono ${dinero(aplicado)}` : 'Vencida'}</Insignia>
                    : parcial ? <Insignia tono="rosa">Abono {dinero(aplicado)}</Insignia>
                    : <Insignia>Por vencer</Insignia>}
                </Td>
                <Td className="whitespace-nowrap text-ink-2">
                  {fechaPago ? <>{fmtFecha(fechaPago)}{atraso > 0 && <span className={cx('ml-1.5 text-[0.75rem]', atraso > 30 ? 'text-bad' : 'text-warn')}>+{atraso} d</span>}</> : <span className="text-ink-3">—</span>}
                </Td>
              </tr>
            )
          })}
        </tbody>
        {filtro === 'todas' && (
          <tfoot>
            <tr className="font-semibold"><Td>Total</Td><Td /><Td /><Td derecha>{dinero(t.capital)}</Td><Td derecha>{dinero(t.interes)}</Td><Td derecha>{dinero(t.cuota)}</Td><Td /><Td /><Td /></tr>
          </tfoot>
        )}
      </Tabla>
    </Panel>
  )
}

// ── Tabla devengada ─────────────────────────────────────────────────────────
const TONO_DEVENGO: Record<EstadoDevengo, Tono> = { Cobrado: 'ok', 'Por cobrar': 'bad', 'En curso': 'rosa', 'Por devengar': 'neutro', Suspendido: 'warn' }

function TablaDevengada({ d }: { d: Detalle }) {
  const [alcance, setAlcance] = useState<'hoy' | 'todas'>('hoy')
  const filas = alcance === 'todas' ? d.devengo : d.devengo.filter((f) => f.diasDevengados > 0 || f.estado === 'Cobrado')
  const sum = (k: 'devengado' | 'cobrado' | 'porCobrar' | 'enOrden') => d.devengo.reduce((s, f) => s + f[k], 0)
  const cifras: [string, number, string][] = [
    ['Devengado a la fecha', sum('devengado'), 'Interés generado desde el desembolso'],
    ['Cobrado', sum('cobrado'), 'Interés recibido en pagos'],
    ['Devengado por cobrar', sum('porCobrar'), 'Reconocido y aún no pagado'],
    ['En cuentas de orden', sum('enOrden'), `Suspendido por más de ${DIAS_SUSPENSION_DEVENGO} días de mora`],
  ]
  return (
    <div className="space-y-4">
      <section aria-label="Totales del devengo" className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-panel lg:grid-cols-4">
        {cifras.map(([k, v, nota], i) => (
          <div key={k} className={cx('min-w-0 p-4 sm:p-5', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line lg:border-t-0', i === 2 && 'lg:border-l')}>
            <p className="text-[0.75rem] text-ink-3">{k}</p>
            <p className={cx('display tabular mt-1 text-[1.5rem] leading-tight sm:text-[1.7rem]', v === 0 && i === 3 && 'text-ink-3')}>{dinero(v)}</p>
            <p className="mt-1 text-[0.75rem] text-ink-3">{nota}</p>
          </div>
        ))}
      </section>
      <Panel
        titulo="Tabla devengada"
        detalle={`El interés de cada cuota se reconoce día a día dentro de su periodo. Hoy genera ${dinero(d.saldos.interesDiario)} diarios.`}
        acciones={<Segmentado etiqueta="Periodos a mostrar" valor={alcance} onCambio={setAlcance} opciones={[{ id: 'hoy', label: 'Hasta hoy' }, { id: 'todas', label: 'Todos' }]} />}
        cuerpo=""
      >
        <Tabla etiqueta="Tabla devengada" className="max-h-[64vh]">
          <thead>
            <tr><Th>N.º</Th><Th>Periodo</Th><Th derecha>Días</Th><Th derecha>Interés de la cuota</Th><Th derecha>Devengado</Th><Th derecha>Cobrado</Th><Th derecha>Por cobrar</Th><Th>Estado</Th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.n} className={cx(f.estado === 'En curso' && 'bg-rose-soft/30')}>
                <Td className="text-ink-3">{f.n}</Td>
                <Td className="whitespace-nowrap text-ink-2">{fmtFecha(f.desde)} – {fmtFecha(f.hasta)}</Td>
                <Td derecha className="text-ink-2">{f.diasDevengados}/{f.dias}</Td>
                <Td derecha className="text-ink-3">{dinero(f.interes)}</Td>
                <Td derecha className="font-medium">
                  {dinero(f.devengado)}
                  {f.estado === "En curso" && <span className="mt-1 ml-auto block h-[3px] w-16 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="block h-full bg-rose" style={{ width: `${(f.devengado / Math.max(0.01, f.interes)) * 100}%` }} /></span>}
                </Td>
                <Td derecha className="text-ink-2">{dinero(f.cobrado)}</Td>
                <Td derecha className={cx(f.porCobrar > 0 ? 'font-medium' : 'text-ink-3')}>{dinero(f.porCobrar)}</Td>
                <Td><Insignia tono={TONO_DEVENGO[f.estado]}>{f.estado}</Insignia></Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold"><Td>Total</Td><Td /><Td /><Td /><Td derecha>{dinero(sum('devengado'))}</Td><Td derecha>{dinero(sum('cobrado'))}</Td><Td derecha>{dinero(sum('porCobrar'))}</Td><Td /></tr>
          </tfoot>
        </Tabla>
      </Panel>
    </div>
  )
}

// ── Garantías ───────────────────────────────────────────────────────────────
function Garantias({ d }: { d: Detalle }) {
  const g = d.garantias
  if (!g.garantes.length && !g.reales.length) {
    return <Panel titulo="Garantías"><Vacio titulo="Crédito sin garantía">Es un crédito quirografario: lo respalda solo la firma del deudor en el pagaré.</Vacio></Panel>
  }
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        {g.reales.length > 0 && (
          <Panel titulo="Garantías reales" detalle={`${plural(g.reales.length, 'bien', 'bienes')} · avalúo total ${dinero(g.reales.reduce((s, r) => s + r.valorAvaluo, 0))}`} cuerpo="">
            <ul className="divide-y divide-line">
              {g.reales.map((r) => (
                <li key={r.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-panel-2"><IconoGarantia tipo={r.tipo} /></span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[0.875rem] font-medium">{r.tipo}<Insignia tono={r.estado === 'Constituida' ? 'ok' : r.estado === 'Liberada' ? 'neutro' : 'warn'}>{r.estado}</Insignia></p>
                      <p className="mt-0.5 text-[0.85rem] text-ink-2">{r.descripcion}</p>
                      <p className="mt-1 text-[0.75rem] text-ink-3">{r.detalle} · avalúo del {fmtFecha(r.fechaAvaluo)}</p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[0.75rem] text-ink-3">Valor de avalúo</p>
                    <p className="display tabular text-[1.35rem] leading-tight">{dinero(r.valorAvaluo)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {g.garantes.length > 0 && (
          <Panel titulo="Garantes personales" detalle="Responden solidariamente si el deudor no paga." cuerpo="">
            <ul className="divide-y divide-line">
              {g.garantes.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-soft text-rose-ink"><UserRound size={17} /></span>
                    <div className="min-w-0">
                      <p className="text-[0.875rem] font-medium">
                        {x.clienteId ? <Link to={`/clientes/${x.clienteId}`} className="hover:text-rose-ink">{x.nombre}</Link> : x.nombre}
                        {x.clienteId && <Insignia className="ml-2 h-[18px] text-[0.68rem]">También es cliente</Insignia>}
                      </p>
                      <p className="tabular text-[0.78rem] text-ink-3">Cédula {x.cedula} · {x.relacion} · {x.telefono}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.75rem] text-ink-3">Ingresos declarados</p>
                    <p className="tabular font-medium">{dinero(x.ingresos)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
      <Panel titulo="Cobertura">
        {g.reales.length > 0
          ? <BarraCobertura cobertura={g.cobertura} minima={d.coberturaMinima} valor={g.valorReal} cancelada={d.cancelada} />
          : <p className="text-[0.85rem] text-ink-2">Respaldada solo con {plural(g.garantes.length, 'garante personal', 'garantes personales')}.</p>}
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
          <Dato etiqueta="Saldo de capital">{dinero(d.saldoCapital)}</Dato>
          <Dato etiqueta="Garantes">{g.garantes.length}</Dato>
        </dl>
      </Panel>
    </div>
  )
}

// ── Pagos ───────────────────────────────────────────────────────────────────
function Pagos({ d }: { d: Detalle }) {
  return (
    <Panel titulo="Pagos aplicados" detalle={`${plural(d.pagos.length, 'pago', 'pagos')} · capital ${dinero(d.capitalPagado)} · interés ${dinero(d.interesPagado)}`} cuerpo="">
      {d.pagos.length === 0 ? <Vacio titulo="Sin pagos todavía" /> : (
        <Tabla etiqueta="Pagos de la operación" className="max-h-[68vh]">
          <thead><tr><Th>Fecha</Th><Th>Tipo</Th><Th>Medio</Th><Th>Referencia</Th><Th derecha>Mora</Th><Th derecha>Interés</Th><Th derecha>Capital</Th><Th derecha>Total</Th></tr></thead>
          <tbody>
            {d.pagos.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap">{fmtFecha(p.fecha)}{p.registradoEnDemo && <Insignia tono="rosa" className="ml-1.5 h-[18px] text-[0.68rem]">Nuevo</Insignia>}</Td>
                <Td className="whitespace-nowrap text-ink-2">{p.tipo}</Td>
                <Td className="whitespace-nowrap text-ink-2">{p.medio}</Td>
                <Td className="text-ink-3">{p.referencia}</Td>
                <Td derecha className={p.mora ? 'text-ink-2' : 'text-ink-3'}>{dinero(p.mora)}</Td>
                <Td derecha className="text-ink-2">{dinero(p.interes)}</Td>
                <Td derecha className="text-ink-2">{dinero(p.capital)}</Td>
                <Td derecha className="font-medium">{dinero(p.monto)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Panel>
  )
}

// ── Estado de cuenta ────────────────────────────────────────────────────────
function EstadoCuenta({ d }: { d: Detalle }) {
  const [desde, setDesde] = useState(d.fechaDesembolso)
  const [hasta, setHasta] = useState(HOY)
  const [vencimientos, setVencimientos] = useState<'si' | 'no'>('si')
  const { filas, saldoInicial, tot } = useMemo(() => {
    const previos = d.estadoCuenta.filter((m) => m.fecha < desde)
    const filas = d.estadoCuenta.filter((m) => m.fecha >= desde && m.fecha <= hasta && (vencimientos === 'si' || m.tipo !== 'vencimiento'))
    const pagos = filas.filter((m) => m.tipo === 'pago')
    return {
      filas,
      saldoInicial: previos.length ? previos[previos.length - 1].saldoCapital : 0,
      tot: {
        pagado: -pagos.reduce((s, m) => s + m.total, 0),
        capital: -pagos.reduce((s, m) => s + m.capital, 0),
        interes: -pagos.reduce((s, m) => s + m.interes, 0),
        mora: -pagos.reduce((s, m) => s + m.mora, 0),
      },
    }
  }, [d.estadoCuenta, desde, hasta, vencimientos])
  const saldoFinal = d.estadoCuenta.filter((m) => m.fecha <= hasta).at(-1)?.saldoCapital ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col gap-1.5"><span className="text-[0.8rem] font-medium text-ink-2">Desde</span><Entrada type="date" value={desde} min={d.fechaDesembolso} max={hasta} onChange={(e) => setDesde(e.target.value || d.fechaDesembolso)} className="w-auto" /></label>
        <label className="flex flex-col gap-1.5"><span className="text-[0.8rem] font-medium text-ink-2">Hasta</span><Entrada type="date" value={hasta} min={desde} max={HOY} onChange={(e) => setHasta(e.target.value || HOY)} className="w-auto" /></label>
        <Segmentado etiqueta="Vencimientos" valor={vencimientos} onCambio={setVencimientos} opciones={[{ id: 'si', label: 'Con vencimientos' }, { id: 'no', label: 'Solo movimientos' }]} />
        <Boton className="ml-auto" onClick={() => window.print()} icono={<Printer size={15} />}>Imprimir o guardar PDF</Boton>
      </div>

      <section className="rounded-[14px] border border-line bg-panel print:border-0">
        <header className="grid gap-4 border-b border-line p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-[0.75rem] font-medium tracking-wide text-ink-3 uppercase">Estado de cuenta</p>
            <h2 className="display mt-1 text-[1.5rem] leading-tight">{d.cliente.nombre}</h2>
            <p className="tabular mt-1 text-[0.82rem] text-ink-2">{d.cliente.tipoIdentificacion} {d.cliente.cedula} · {d.id} · {d.producto} · tasa {d.tasaAnual.toLocaleString('es-EC', { minimumFractionDigits: 2 })} %</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.82rem] sm:text-right">
            <div><dt className="text-ink-3">Periodo</dt><dd className="tabular font-medium">{fmtFecha(desde)} – {fmtFecha(hasta)}</dd></div>
            <div><dt className="text-ink-3">Emitido</dt><dd className="tabular font-medium">{fmtFecha(HOY)}</dd></div>
            <div><dt className="text-ink-3">Saldo inicial</dt><dd className="tabular font-medium">{dinero(saldoInicial)}</dd></div>
            <div><dt className="text-ink-3">Saldo final</dt><dd className="tabular font-semibold">{dinero(saldoFinal)}</dd></div>
          </dl>
        </header>
        {filas.length === 0 ? <Vacio titulo="Sin movimientos en el periodo">Amplía el rango de fechas.</Vacio> : (
          <Tabla etiqueta="Movimientos" className="max-h-[64vh] print:max-h-none">
            <thead><tr><Th>Fecha</Th><Th>Concepto</Th><Th derecha>Capital</Th><Th derecha>Interés</Th><Th derecha>Mora</Th><Th derecha>Total</Th><Th derecha>Saldo de capital</Th></tr></thead>
            <tbody>
              {filas.map((m, i) => {
                const venc = m.tipo === 'vencimiento'
                return (
                  <tr key={i} className={cx(venc && 'text-ink-3', m.pendiente && 'bg-bad-soft/30')}>
                    <Td className="whitespace-nowrap">{fmtFecha(m.fecha)}</Td>
                    <Td>
                      <span className={cx(!venc && 'font-medium text-ink')}>{m.concepto}</span>
                      <span className={cx('block text-[0.75rem]', m.pendiente ? 'font-medium text-bad' : 'text-ink-3')}>{m.detalle}</span>
                    </Td>
                    <Td derecha>{dinero(m.capital)}</Td>
                    <Td derecha>{m.interes ? dinero(m.interes) : "—"}</Td>
                    <Td derecha>{m.mora ? dinero(m.mora) : '—'}</Td>
                    <Td derecha className={cx(!venc && 'font-medium text-ink')}>{dinero(m.total)}</Td>
                    <Td derecha className={cx(!venc && 'text-ink')}>{venc ? '' : dinero(m.saldoCapital)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        )}
        <footer className="grid grid-cols-2 gap-4 border-t border-line p-5 text-[0.82rem] sm:grid-cols-4">
          <Dato etiqueta="Pagado en el periodo">{dinero(tot.pagado)}</Dato>
          <Dato etiqueta="Capital amortizado">{dinero(tot.capital)}</Dato>
          <Dato etiqueta="Interés pagado">{dinero(tot.interes)}</Dato>
          <Dato etiqueta="Recargo por mora">{dinero(tot.mora)}</Dato>
        </footer>
      </section>
      <p className="text-[0.75rem] text-ink-3 print:hidden">Los vencimientos son informativos: muestran cuándo se hizo exigible cada cuota. El saldo de capital solo cambia con el desembolso y los pagos.</p>
    </div>
  )
}

// ── Cobranza ────────────────────────────────────────────────────────────────
function Cobranza({ d }: { d: Detalle }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel titulo="Situación de cobranza">
        {d.cancelada ? <p className="text-[0.85rem] text-ink-2">Operación cancelada. No está en gestión de cobranza.</p> : (
          <div className="space-y-4">
            <RecorridoCobranza etapa={d.etapa} />
            <dl className="grid grid-cols-2 gap-4">
              <Dato etiqueta="Días de mora">{d.diasMora}</Dato>
              <Dato etiqueta="Cuotas vencidas">{d.cuotasVencidas}</Dato>
              <Dato etiqueta="Valor vencido">{dinero(d.valorVencido)}</Dato>
              <Dato etiqueta="Gestor">{d.cliente.gestor}</Dato>
            </dl>
            {d.juicio && (
              <Link to={`/juicios?causa=${d.juicio.id}`} className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-3 py-2.5 text-[0.85rem] hover:bg-panel-2">
                <span className="flex items-center gap-2"><Gavel size={15} className="text-bad" />Causa {d.juicio.numeroCausa} · {d.juicio.etapa}</span>
                <span className="text-rose-ink">Ver expediente</span>
              </Link>
            )}
          </div>
        )}
      </Panel>
      <Panel titulo="Promesas de pago" cuerpo="">
        {d.promesas.length === 0 ? <Vacio titulo="Sin promesas registradas" /> : (
          <ul className="divide-y divide-line">
            {d.promesas.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                <span><span className="tabular block font-medium">{dinero(p.monto)}</span><span className="text-[0.75rem] text-ink-3">{fmtFecha(p.fechaCompromiso)} · {p.canal}</span></span>
                <Insignia tono={p.estado === 'Cumplida' ? 'ok' : p.estado === 'Vigente' ? 'rosa' : 'bad'}>{p.estado}</Insignia>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

// ── Documentos ──────────────────────────────────────────────────────────────
function Documentos({ d }: { d: Detalle }) {
  const grupos = [...new Set(d.documentos.map((x) => x.categoria))]
  const pendientes = d.documentos.filter((x) => x.estado === 'Pendiente').length
  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem] text-ink-2">
        <ShieldCheck size={16} className={pendientes ? 'text-warn' : 'text-ok'} aria-hidden="true" />
        {pendientes ? `${plural(pendientes, 'documento pendiente', 'documentos pendientes')} de recibir.` : 'Expediente completo.'}
        <span className="text-ink-3">En la demo se registra el documento; el archivo no se almacena.</span>
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {grupos.map((gr) => (
          <Panel key={gr} titulo={gr} cuerpo="">
            <ul className="divide-y divide-line">
              {d.documentos.filter((x) => x.categoria === gr).map((x) => (
                <li key={x.nombre} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                  <span className="flex min-w-0 items-center gap-3">
                    {x.estado === 'Recibido' ? <FileCheck2 size={17} className="shrink-0 text-ink-3" aria-hidden="true" /> : <FileClock size={17} className="shrink-0 text-warn" aria-hidden="true" />}
                    <span className="min-w-0"><span className="block truncate">{x.nombre}</span><span className="text-[0.75rem] text-ink-3">{fmtFecha(x.fecha)}</span></span>
                  </span>
                  <Insignia tono={x.estado === 'Recibido' ? 'neutro' : 'warn'}>{x.estado}</Insignia>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  )
}

