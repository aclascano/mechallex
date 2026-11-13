import { ArrowRight, Copy, GitBranch, Play, PlugZap, Radio, Timer, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Boton, Campo, Encabezado, Entrada, EsqueletoPagina, Insignia, Interruptor, Panel, Pestanas, Tabla, Td, Th, type Tono } from '../components/ui'
import { TRAMOS } from '../domain/cartera'
import { fmtFecha } from '../domain/fechas'
import type { Campania, FlujoN8n } from '../domain/tipos'
import { cx, dinero, dineroCorto, entero, plural, porcentaje } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { alternarFlujo, alternarRegla, obtenerCobranza } from '../services/api'
import { ICONO_CANAL } from '../lib/canales'

type Tab = 'campanias' | 'reglas' | 'promesas' | 'n8n'

const TONO_ESTADO: Record<Campania['estado'], Tono> = { Activa: 'ok', Pausada: 'warn', Programada: 'acero', Finalizada: 'neutro' }

function Embudo({ c }: { c: Campania }) {
  const pasos = [
    { label: 'Enviados', n: c.enviados },
    { label: 'Entregados', n: c.entregados },
    { label: 'Respuestas', n: c.respuestas },
    { label: 'Promesas', n: c.promesas },
  ]
  const max = Math.max(c.enviados, 1)
  return (
    <ul className="space-y-1.5" aria-label="Embudo de la campaña">
      {pasos.map((p) => (
        <li key={p.label} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-2 text-[0.75rem]">
          <span className="text-ink-3">{p.label}</span>
          <span className="h-1.5 rounded-full bg-panel-2"><span className="block h-full rounded-full bg-rose" style={{ width: `${(p.n / max) * 100}%`, opacity: 0.35 + (p.n / max) * 0.65 }} /></span>
          <span className="tabular text-right font-medium">{entero(p.n)}</span>
        </li>
      ))}
    </ul>
  )
}

function Campanias({ campanias }: { campanias: Campania[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {campanias.map((c) => {
        const Icono = ICONO_CANAL[c.canal]
        return (
          <article key={c.id} className="flex flex-col rounded-[14px] border border-line bg-panel p-5">
            <header className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-rose-soft text-rose-ink" aria-hidden="true"><Icono size={17} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{c.nombre}</h3>
                <p className="text-[0.75rem] text-ink-3">{c.canal} · {c.tramos.map((t) => TRAMOS.find((x) => x.id === t)!.corto).join(', ')} {c.tramos.includes('al-dia') ? '' : 'días'} · desde {fmtFecha(c.inicio)}</p>
              </div>
              <Insignia tono={TONO_ESTADO[c.estado]}>{c.estado}</Insignia>
            </header>
            <p className="mt-4 rounded-[10px] bg-panel-2/70 px-3 py-2 text-[0.8rem] text-ink-2">{c.plantilla}</p>
            <div className="mt-4 flex-1">{c.enviados > 0 ? <Embudo c={c} /> : <p className="text-[0.8rem] text-ink-3">Empieza el {fmtFecha(c.inicio)}. Aún sin envíos.</p>}</div>
            <footer className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[0.8rem]">
              <span className="text-ink-3">{c.flujoN8n ? <>Flujo n8n <span className="font-medium text-ink-2">{c.flujoN8n}</span></> : 'Sin automatizar'}</span>
              <span><span className="text-ink-3">Recuperado </span><span className="tabular font-semibold">{dineroCorto(c.recuperado)}</span></span>
            </footer>
          </article>
        )
      })}
    </div>
  )
}

function DiagramaFlujo({ f }: { f: FlujoN8n }) {
  const ICONO = { trigger: Timer, accion: Zap, condicion: GitBranch, canal: Radio }
  return (
    <ol className="flex flex-wrap items-center gap-y-3" aria-label={`Nodos del flujo ${f.nombre}`}>
      {f.nodos.map((n, i) => {
        const Icono = ICONO[n.tipo]
        return (
          <li key={n.id} className="flex items-center">
            <div className={cx('w-[164px] rounded-[10px] border bg-panel px-3 py-2', n.tipo === 'trigger' ? 'border-rose/60' : 'border-line-strong')}>
              <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold"><Icono size={13} className={n.tipo === 'trigger' ? 'text-rose-ink' : 'text-steel'} aria-hidden="true" /> <span className="truncate">{n.etiqueta}</span></p>
              <p className="truncate text-[0.7rem] text-ink-3">{n.detalle}</p>
            </div>
            {i < f.nodos.length - 1 && <ArrowRight size={14} className="mx-1.5 shrink-0 text-ink-3" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

function IntegracionN8n({ flujos }: { flujos: FlujoN8n[] }) {
  const [url, setUrl] = useState('https://n8n.tu-dominio.example')
  const [probado, setProbado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const webhook = 'https://n8n.tu-dominio.example/webhook/mechallex-eventos'
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel titulo="Conexión con n8n" detalle="n8n ejecuta los envíos; Mechallex decide a quién y cuándo.">
          <div className="mb-4 flex items-center gap-2 rounded-[10px] bg-warn-soft px-3 py-2 text-[0.8rem] text-warn">
            <PlugZap size={15} aria-hidden="true" /> Modo demostración: sin conexión real.
          </div>
          <div className="space-y-4">
            <Campo etiqueta="URL de la instancia"><Entrada value={url} onChange={(e) => { setUrl(e.target.value); setProbado(false) }} /></Campo>
            <Campo etiqueta="Clave de API" ayuda="Se guarda cifrada cuando exista el backend."><Entrada type="password" value="demo-demo-demo-demo" readOnly /></Campo>
            <Campo etiqueta="Webhook de eventos de Mechallex" ayuda="Eventos: mora.dia_1, promesa.vencida, pago.registrado">
              <span className="flex gap-2">
                <Entrada value={webhook} readOnly className="text-[0.78rem]" />
                <Boton aria-label="Copiar webhook" onClick={() => { navigator.clipboard?.writeText(webhook).catch(() => {}); setCopiado(true) }} icono={<Copy size={14} />}>{copiado ? 'Copiado' : ''}</Boton>
              </span>
            </Campo>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.8rem] text-ink-3">{probado ? 'Respuesta simulada: 200 OK en 184 ms' : 'Sin probar'}</span>
              <Boton variante="primario" onClick={() => setProbado(true)} icono={<Play size={14} />}>Probar conexión</Boton>
            </div>
          </div>
        </Panel>
      </div>
      <Panel titulo="Flujos" detalle="Cada campaña y regla dispara un flujo de n8n" cuerpo="divide-y divide-line">
        {flujos.map((f) => (
          <div key={f.id} className="p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{f.nombre} <span className="tabular text-[0.75rem] font-normal text-ink-3">· {f.id}</span></p>
                <p className="text-[0.8rem] text-ink-3">{f.descripcion}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="tabular text-right text-[0.75rem] text-ink-3">{plural(f.ejecuciones7d, 'ejecución', 'ejecuciones')} en 7 días{f.errores7d > 0 && <span className="text-bad"> · {plural(f.errores7d, 'error', 'errores')}</span>}<span className="block">Última: {f.ultimaEjecucion}</span></span>
                <Interruptor activo={f.activo} onCambio={() => alternarFlujo(f.id)} etiqueta={`Activar flujo ${f.nombre}`} />
              </div>
            </div>
            <DiagramaFlujo f={f} />
          </div>
        ))}
      </Panel>
    </div>
  )
}

export default function PaginaCobranza() {
  const { data } = useServicio(obtenerCobranza)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'campanias'
  if (!data) return <EsqueletoPagina />
  const activas = data.campanias.filter((c) => c.estado === 'Activa')
  const recuperado = data.campanias.reduce((s, c) => s + c.recuperado, 0)
  const enviados = activas.reduce((s, c) => s + c.enviados, 0)
  const promesas = activas.reduce((s, c) => s + c.promesas, 0)

  return (
    <div>
      <Encabezado
        titulo="Cobranza automatizada"
        descripcion="Campañas por llamada, SMS, WhatsApp y correo, con reglas por días de mora. Las ejecuta n8n; aquí defines a quién, cuándo y con qué mensaje."
      />
      <dl className="tabular mb-5 grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-panel md:grid-cols-4">
        {[
          ['Campañas activas', String(activas.length)],
          ['Mensajes y llamadas', entero(enviados)],
          ['Promesas generadas', entero(promesas)],
          ['Recuperado atribuido', dineroCorto(recuperado)],
        ].map(([k, v], i) => (
          <div key={k} className={cx('px-5 py-4', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line md:border-t-0', i === 2 && 'md:border-l')}>
            <dt className="text-[0.78rem] text-ink-3">{k}</dt>
            <dd className="display mt-1 text-[1.6rem] leading-none font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <Pestanas<Tab>
        valor={tab}
        onCambio={(t) => setParams({ tab: t })}
        opciones={[
          { id: 'campanias', label: 'Campañas', cuenta: data.campanias.length },
          { id: 'reglas', label: 'Reglas', cuenta: data.reglas.length },
          { id: 'promesas', label: 'Promesas de pago', cuenta: data.promesas.length },
          { id: 'n8n', label: 'Integración n8n' },
        ]}
      />

      {tab === 'campanias' && <Campanias campanias={data.campanias} />}

      {tab === 'reglas' && (
        <Panel cuerpo="" titulo="Reglas de gestión" detalle="Se evalúan contra la cartera en cada disparo; cada ejecución queda registrada como gestión.">
          <Tabla etiqueta="Reglas">
            <thead><tr><Th>Regla</Th><Th>Cuándo</Th><Th>Condición</Th><Th>Acción</Th><Th derecha>Ejecuciones del mes</Th><Th>Activa</Th></tr></thead>
            <tbody>
              {data.reglas.map((r) => {
                const Icono = ICONO_CANAL[r.canal]
                return (
                  <tr key={r.id} className={cx(!r.activa && 'text-ink-3')}>
                    <Td className="font-medium">{r.nombre}</Td>
                    <Td className="whitespace-nowrap text-ink-2">{r.disparador}</Td>
                    <Td><code className="rounded bg-panel-2 px-1.5 py-0.5 text-[0.78rem]">{r.condicion}</code></Td>
                    <Td><span className="flex items-center gap-1.5 text-ink-2"><Icono size={14} aria-hidden="true" />{r.accion}</span></Td>
                    <Td derecha>{entero(r.ejecucionesMes)}</Td>
                    <Td><Interruptor activo={r.activa} onCambio={() => alternarRegla(r.id)} etiqueta={`Activar regla ${r.nombre}`} /></Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        </Panel>
      )}

      {tab === 'promesas' && (
        <Panel cuerpo="" titulo="Promesas de pago" detalle="El estado se calcula solo: cumplida si llegó un pago cerca de la fecha comprometida.">
          <Tabla etiqueta="Promesas">
            <thead><tr><Th>Cliente</Th><Th>Operación</Th><Th>Compromiso</Th><Th>Canal</Th><Th>Estado</Th><Th derecha>Monto</Th></tr></thead>
            <tbody>
              {[...data.promesas].sort((a, b) => b.fechaCompromiso.localeCompare(a.fechaCompromiso)).map((p) => (
                <tr key={p.id}>
                  <Td><Link to={`/clientes/${p.clienteId}`} className="font-medium hover:text-rose-ink">{p.cliente.nombre}</Link></Td>
                  <Td><Link to={`/operaciones/${p.operacionId}`} className="text-ink-2 hover:text-rose-ink">{p.operacionId}</Link></Td>
                  <Td className="whitespace-nowrap">{fmtFecha(p.fechaCompromiso)}</Td>
                  <Td className="text-ink-2">{p.canal}</Td>
                  <Td><Insignia tono={p.estado === 'Cumplida' ? 'ok' : p.estado === 'Vigente' ? 'rosa' : 'bad'}>{p.estado}</Insignia></Td>
                  <Td derecha className="font-medium">{dinero(p.monto)}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <p className="border-t border-line px-5 py-3 text-[0.78rem] text-ink-3">Efectividad: {porcentaje(data.promesas.filter((p) => p.estado === 'Cumplida').length / Math.max(1, data.promesas.filter((p) => p.estado !== 'Vigente').length))} de las promesas vencidas se cumplieron.</p>
        </Panel>
      )}

      {tab === 'n8n' && <IntegracionN8n flujos={data.flujos} />}
    </div>
  )
}
