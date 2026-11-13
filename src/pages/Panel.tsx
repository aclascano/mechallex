import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { ICONO_CANAL } from '../lib/canales'
import { useState } from 'react'
import { Link } from 'react-router'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ejeProps, Leyenda, rejillaProps, TooltipMx } from '../components/graficos'
import { RosetaCartera } from '../components/guilloche'
import { COLOR_TRAMO, Encabezado, EsqueletoPagina, InsigniaTramo, Microimpresion, Panel as Caja, RecorridoCobranza, Tabla, Td, Th } from '../components/ui'
import { fmtFecha, fmtMes, nombreMes } from '../domain/fechas'
import { ENTIDAD_DEMO } from '../mocks/catalogos'
import { compacto, cx, dinero, dineroCorto, entero, plural, porcentaje , decimal } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { obtenerPanel, type Panel as DatosPanel } from '../services/api'


function Variacion({ actual, anterior, invertir, formato }: { actual: number; anterior: number; invertir?: boolean; formato: (n: number) => string }) {
  const delta = actual - anterior
  const sube = delta > 0
  const bueno = invertir ? !sube : sube
  const Icono = sube ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cx('inline-flex items-center gap-0.5 text-[0.78rem] font-medium', bueno ? 'text-ok' : 'text-bad')}>
      <Icono size={14} aria-hidden="true" />
      {formato(Math.abs(delta))}
      <span className="sr-only">{sube ? 'más' : 'menos'} que el mes anterior</span>
    </span>
  )
}

/** Banda de denominaciones: las cuatro cifras que la jefa de cartera lee primero. */
function Denominaciones({ d }: { d: DatosPanel }) {
  const mesActual = nombreMes(d.corte)
  const avance = d.exigibleMes ? d.recuperadoMes / d.exigibleMes : 0
  const cifras = [
    {
      etiqueta: 'Saldo de cartera',
      valor: dineroCorto(d.saldo),
      pie: <span className="text-ink-3">{entero(d.operacionesVigentes)} operaciones · {entero(d.clientesActivos)} clientes</span>,
    },
    {
      etiqueta: 'Índice de morosidad',
      valor: porcentaje(d.morosidad),
      pie: (
        <span className="flex flex-wrap items-center gap-x-1.5 text-ink-3">
          <Variacion actual={d.morosidad} anterior={d.morosidadAnterior} invertir formato={(n) => `${decimal(n * 100)} pp`} />
          {dineroCorto(d.vencida)} vencido
        </span>
      ),
    },
    {
      etiqueta: `Recuperado en ${mesActual}`,
      valor: dineroCorto(d.recuperadoMes),
      pie: (
        <span className="flex w-full items-center gap-2 text-ink-3">
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 rounded-full bg-rose" style={{ width: `${Math.min(100, avance * 100)}%` }} />
          </span>
          <span className="tabular">{porcentaje(avance)} de {compacto(d.exigibleMes)}</span>
        </span>
      ),
    },
    {
      etiqueta: 'Promesas vigentes',
      valor: dineroCorto(d.promesasVigentes.monto),
      pie: <span className="text-ink-3">{plural(d.promesasVigentes.cantidad, 'compromiso', 'compromisos')} · {plural(d.promesasIncumplidas, 'incumplido', 'incumplidos')}</span>,
    },
  ]
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4">
      {cifras.map((c, i) => (
        <div
          key={c.etiqueta}
          className={cx(
            'flex min-w-0 flex-col gap-1.5 px-5 py-5',
            i > 0 && 'border-t border-line sm:border-t-0',
            i % 2 === 1 && 'sm:border-l sm:border-line',
            i >= 2 && 'sm:border-t sm:border-line 2xl:border-t-0',
            i === 2 && '2xl:border-l 2xl:border-line',
          )}
        >
          <dt className="text-[0.8rem] font-medium text-ink-2">{c.etiqueta}</dt>
          <dd className="display tabular text-[2rem] leading-none font-medium text-ink">{c.valor}</dd>
          <dd className="mt-1 flex min-h-5 items-center text-[0.78rem]">{c.pie}</dd>
        </div>
      ))}
    </dl>
  )
}

function Antiguedad({ d }: { d: DatosPanel }) {
  const [activo, setActivo] = useState<string | null>(null)
  const sel = d.porTramo.find((t) => t.id === activo)
  return (
    <Caja titulo="Cartera por antigüedad" detalle="Saldo de capital por días de mora" className="flex flex-col" cuerpo="flex flex-1 flex-col gap-5 p-5">
      <RosetaCartera anillos={d.porTramo.map((t) => ({ id: t.id, etiqueta: t.label, valor: t.saldo, color: COLOR_TRAMO[t.id] }))} activo={activo} onActivo={setActivo}>
        <div className="text-center" aria-live="polite">
          <p className="text-[0.72rem] font-medium text-ink-3">{sel ? sel.label : 'Saldo total'}</p>
          <p className="display tabular text-[1.6rem] leading-tight font-medium text-ink">{compacto(sel ? sel.saldo : d.saldo)}</p>
          <p className="tabular text-[0.72rem] text-ink-3">{sel ? `${porcentaje(sel.saldo / d.saldo)} · ${sel.operaciones} op.` : `${d.operacionesVigentes} operaciones`}</p>
        </div>
      </RosetaCartera>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {d.porTramo.map((t) => (
          <li key={t.id}>
            <button
              onMouseEnter={() => setActivo(t.id)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(t.id)}
              onBlur={() => setActivo(null)}
              className={cx('flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-[0.8rem] transition-colors', activo === t.id ? 'bg-panel-2' : '')}
            >
              <span className="flex items-center gap-1.5 text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ background: COLOR_TRAMO[t.id] }} aria-hidden="true" />
                {t.corto}
              </span>
              <span className="tabular font-medium text-ink">{porcentaje(d.saldo ? t.saldo / d.saldo : 0)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Caja>
  )
}

function Recuperacion({ d }: { d: DatosPanel }) {
  const datos = d.meses.map((m) => ({ mes: fmtMes(m.mes, true), Exigible: m.exigible, Recuperado: m.recuperado }))
  return (
    <div className="px-5 pt-4 pb-3">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.95rem] font-semibold">Recuperación frente a lo exigible</h2>
        <Leyenda items={[{ color: 'var(--line-strong)', label: 'Cuotas que vencen en el mes' }, { color: 'var(--rose)', label: 'Pagos recibidos' }]} />
      </div>
      <div className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} barGap={-14} barCategoryGap="30%" margin={{ top: 6, right: 4, left: -6, bottom: 0 }}>
            <CartesianGrid {...rejillaProps} />
            <XAxis dataKey="mes" {...ejeProps} interval="preserveStartEnd" />
            <YAxis {...ejeProps} tickFormatter={compacto} width={52} />
            <Tooltip cursor={{ fill: 'var(--panel-2)' }} content={(p) => <TooltipMx {...p} formato={(v) => dinero(v)} />} />
            <Bar isAnimationActive={false} dataKey="Exigible" fill="var(--line-strong)" radius={[4, 4, 0, 0]} maxBarSize={14} />
            <Bar isAnimationActive={false} dataKey="Recuperado" fill="var(--rose)" radius={[4, 4, 0, 0]} maxBarSize={8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Morosidad({ d }: { d: DatosPanel }) {
  const datos = d.meses.map((m) => ({ mes: fmtMes(m.mes, true), Morosidad: m.morosidad * 100 }))
  // inicio del deterioro: el mes con el mayor salto
  let salto = 1
  for (let i = 1; i < datos.length; i++) if (datos[i].Morosidad - datos[i - 1].Morosidad > datos[salto].Morosidad - datos[salto - 1].Morosidad) salto = i
  return (
    <Caja titulo="Índice de morosidad" detalle="Saldo con más de 30 días de mora sobre la cartera total">
      <p className="mb-2 flex items-baseline gap-2">
        <span className="display tabular text-[1.75rem] leading-none font-medium">{porcentaje(d.morosidad)}</span>
        <Variacion actual={d.morosidad} anterior={d.morosidadAnterior} invertir formato={(n) => `${decimal(n * 100)} pp`} />
      </p>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="g-mora" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--rose)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--rose)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...rejillaProps} />
            <XAxis dataKey="mes" {...ejeProps} interval={2} />
            <YAxis {...ejeProps} tickFormatter={(v) => `${v}%`} width={44} domain={[0, 'dataMax + 2']} allowDecimals={false} />
            <Tooltip content={(p) => <TooltipMx {...p} formato={(v) => `${decimal(v)} %`} />} />
            <Area isAnimationActive={false} type="monotone" dataKey="Morosidad" stroke="var(--rose-ink)" strokeWidth={1.75} fill="url(#g-mora)" />
            <ReferenceDot x={datos[salto].mes} y={datos[salto].Morosidad} r={4} fill="var(--panel)" stroke="var(--bad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[0.78rem] text-ink-3">
        <span className="font-medium text-bad">●</span> Mayor alza en {datos[salto].mes}: +{decimal(datos[salto].Morosidad - datos[salto - 1].Morosidad)} pp.
      </p>
    </Caja>
  )
}

function Promesas({ d }: { d: DatosPanel }) {
  const total = d.promesasVigentes.cantidad + d.promesasCumplidas + d.promesasIncumplidas || 1
  const partes = [
    { label: 'Cumplidas', n: d.promesasCumplidas, color: 'var(--ok)' },
    { label: 'Vigentes', n: d.promesasVigentes.cantidad, color: 'var(--rose)' },
    { label: 'Incumplidas', n: d.promesasIncumplidas, color: 'var(--bad)' },
  ]
  return (
    <Caja titulo="Promesas de pago" detalle="Compromisos registrados por gestores y campañas" acciones={<Link to="/gestion?tab=compromisos" className="text-[0.8rem] font-medium text-rose-ink hover:underline">Ver todas</Link>}>
      <div className="flex h-2.5 overflow-hidden rounded-full" role="img" aria-label={partes.map((p) => `${p.label}: ${p.n}`).join(', ')}>
        {partes.map((p) => (
          <span key={p.label} style={{ width: `${(p.n / total) * 100}%`, background: p.color }} className="h-full first:rounded-l-full last:rounded-r-full [&+&]:ml-[2px]" />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {partes.map((p) => (
          <div key={p.label}>
            <dt className="flex items-center gap-1.5 text-[0.75rem] text-ink-3">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              {p.label}
            </dt>
            <dd className="display tabular mt-1 text-[1.5rem] leading-none font-medium">{p.n}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-line pt-3 text-[0.8rem] text-ink-2">
        Efectividad: <span className="tabular font-medium text-ink">{porcentaje(d.promesasCumplidas / Math.max(1, d.promesasCumplidas + d.promesasIncumplidas))}</span> de las promesas vencidas se pagaron.
      </p>
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-[0.75rem] font-medium text-ink-3">Próximos compromisos</p>
        {d.promesasProximas.length === 0 ? <p className="text-[0.8rem] text-ink-3">No hay compromisos pendientes.</p> : (
          <ul className="space-y-2">
            {d.promesasProximas.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 text-[0.8rem]">
                <span className="min-w-0">
                  <Link to={`/operaciones/${p.operacionId}`} className="block truncate font-medium text-ink hover:text-rose-ink">{p.cliente.nombre}</Link>
                  <span className="block text-ink-3">{fmtFecha(p.fechaCompromiso)} · {p.canal}</span>
                </span>
                <span className="tabular shrink-0 font-medium">{dinero(p.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Caja>
  )
}

function Juicios({ d }: { d: DatosPanel }) {
  const max = Math.max(...d.juicios.porEtapa.map((e) => e.cantidad), 1)
  return (
    <Caja titulo="Cobro judicial" detalle={`${d.juicios.activos} causas · cuantía ${compacto(d.juicios.cuantia)} · costas ${dineroCorto(d.juicios.costas)}`} acciones={<Link to="/juicios" className="text-[0.8rem] font-medium text-rose-ink hover:underline">Abrir tablero</Link>}>
      <ul className="space-y-1.5">
        {d.juicios.porEtapa.map((e) => (
          <li key={e.etapa} className="grid grid-cols-[7.5rem_1fr_1.5rem] items-center gap-2 text-[0.8rem]">
            <span className="truncate text-ink-2">{e.etapa}</span>
            <span className="h-1.5 rounded-full bg-panel-2">
              <span className="block h-full rounded-full bg-steel" style={{ width: `${(e.cantidad / max) * 100}%` }} />
            </span>
            <span className="tabular text-right font-medium">{e.cantidad}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-[0.75rem] font-medium text-ink-3">Próximas diligencias</p>
        <ul className="space-y-2">
          {d.juicios.proximas.map((j) => (
            <li key={j.id} className="flex items-start justify-between gap-3 text-[0.8rem]">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{j.cliente.nombre}</span>
                <span className="block truncate text-ink-3">{j.proximaDiligencia!.descripcion}</span>
              </span>
              <span className="tabular shrink-0 text-ink-2">{fmtFecha(j.proximaDiligencia!.fecha)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Caja>
  )
}

function Prioridad({ d }: { d: DatosPanel }) {
  return (
    <Caja titulo="Dónde actuar hoy" detalle="Operaciones con mayor valor vencido" cuerpo="" className="xl:col-span-2" acciones={<Link to="/operaciones?mora=1" className="inline-flex items-center gap-1 text-[0.8rem] font-medium text-rose-ink hover:underline">Toda la mora <ArrowRight size={14} /></Link>}>
      <Tabla etiqueta="Operaciones prioritarias">
        <thead>
          <tr>
            <Th>Cliente</Th>
            <Th>Antigüedad</Th>
            <Th>Etapa de cobranza</Th>
            <Th derecha>Vencido</Th>
            <Th derecha>Saldo</Th>
          </tr>
        </thead>
        <tbody>
          {d.prioridad.map((o) => (
            <tr key={o.id} className="transition-colors hover:bg-panel-2/60">
              <Td>
                <Link to={`/operaciones/${o.id}`} className="block font-medium text-ink hover:text-rose-ink">{o.cliente.nombre}</Link>
                <span className="text-[0.75rem] text-ink-3">{o.id} · {o.producto}</span>
              </Td>
              <Td>
                <InsigniaTramo tramo={o.tramo} />
                <span className="block text-[0.75rem] text-ink-3">{o.diasMora} días</span>
              </Td>
              <Td><RecorridoCobranza etapa={o.etapa} compacto /></Td>
              <Td derecha className="font-medium">{dinero(o.valorVencido)}</Td>
              <Td derecha className="text-ink-2">{dinero(o.saldoCapital)}</Td>
            </tr>
          ))}
        </tbody>
      </Tabla>
    </Caja>
  )
}

function Campanias({ d }: { d: DatosPanel }) {
  return (
    <Caja titulo="Campañas activas" detalle="Recuperación atribuida este mes" acciones={<Link to="/cobranza" className="text-[0.8rem] font-medium text-rose-ink hover:underline">Gestionar</Link>}>
      <ul className="space-y-3.5">
        {d.campanias.map((c) => {
          const Icono = ICONO_CANAL[c.canal]
          const tasa = c.entregados ? c.respuestas / c.entregados : 0
          return (
            <li key={c.id} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-rose-soft text-rose-ink" aria-hidden="true">
                <Icono size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.85rem] font-medium">{c.nombre}</p>
                <p className="tabular text-[0.75rem] text-ink-3">{c.canal} · {porcentaje(tasa)} respuesta · {c.promesas} promesas</p>
              </div>
              <span className="tabular shrink-0 text-[0.85rem] font-medium">{dineroCorto(c.recuperado)}</span>
            </li>
          )
        })}
      </ul>
    </Caja>
  )
}

export default function PaginaPanel() {
  const { data: d } = useServicio(obtenerPanel)
  if (!d) return <EsqueletoPagina />
  return (
    <div style={{ animation: 'aparecer 300ms var(--ease-out-expo) both' }}>
      <Encabezado
        titulo="Panel de cartera"
        descripcion={<>{ENTIDAD_DEMO.nombre}. Lo que cambió desde el cierre de octubre y dónde conviene actuar.</>}
        acciones={
          <>
            <Link to="/operaciones?mora=1" className="inline-flex h-9 items-center rounded-[9px] border border-line-strong bg-panel px-3.5 text-[0.85rem] font-medium hover:bg-panel-2">Cartera en mora</Link>
            <Link to="/pagos" className="inline-flex h-9 items-center rounded-[9px] bg-rail px-3.5 text-[0.85rem] font-medium text-rail-ink hover:bg-rail-2 dark:bg-rose dark:text-[oklch(0.15_0.01_290)]">Registrar pago</Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-[14px] border border-line bg-panel" aria-label="Indicadores principales">
          <Denominaciones d={d} />
          <Microimpresion className="border-y border-line px-5 py-[3px] text-ink-3/70" />
          <Recuperacion d={d} />
        </section>
        <Antiguedad d={d} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Morosidad d={d} />
        <Promesas d={d} />
        <Juicios d={d} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Prioridad d={d} />
        <Campanias d={d} />
      </div>
    </div>
  )
}
