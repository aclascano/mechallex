import { Receipt, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Comprobante } from '../components/Comprobante'
import { RegistroPago } from '../components/RegistroPago'
import { Boton, Campo, Dialogo, Encabezado, Entrada, Insignia, Panel, Pestanas, Segmentado, Selector, Tabla, Td, Th, Vacio } from '../components/ui'
import { addDays, fmtFecha, startOfMonth } from '../domain/fechas'
import { dinero, entero } from '../lib/formato'
import { buscarPagos, comprobanteDe, fechaCorte, mediosPago, type CriterioPagos } from '../services/api'

type Tab = 'registrar' | 'consultar'
type Resultado = Awaited<ReturnType<typeof buscarPagos>>

const HOY = fechaCorte()
const TIPOS = ['Cuota', 'Abono parcial', 'Abono a capital', 'Precancelación']
const ETIQUETA_POR: Record<CriterioPagos['por'], { label: string; campo: string; ejemplo: string }> = {
  cliente: { label: 'Cliente', campo: 'Nombre o cédula', ejemplo: 'Ej.: Herrera o 0212699664' },
  operacion: { label: 'Operación', campo: 'Número de operación', ejemplo: 'Ej.: OP-2025-0005' },
  referencia: { label: 'Comprobante', campo: 'Referencia o n.º de comprobante', ejemplo: 'Ej.: TRF-614369 o PG-01234' },
  fecha: { label: 'Fecha', campo: '', ejemplo: '' },
}

export default function PaginaPagos() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'registrar'
  return (
    <div>
      <Encabezado titulo="Pagos y abonos" descripcion="Registra un pago revisando antes cómo se aplica (presimulación), o busca pagos ya recibidos para ver su comprobante." />
      <Pestanas<Tab> valor={tab} onCambio={(t) => setParams(t === 'registrar' ? {} : { tab: t }, { replace: true })} opciones={[{ id: 'registrar', label: 'Registrar pago' }, { id: 'consultar', label: 'Consultar pagos' }]} />
      {tab === 'registrar' ? <Panel cuerpo="p-5 sm:p-6"><RegistroPago /></Panel> : <Consulta />}
    </div>
  )
}

function Consulta() {
  const [c, setC] = useState<CriterioPagos>({ por: 'cliente', texto: '', desde: '', hasta: HOY, medio: '', tipo: '' })
  const [res, setRes] = useState<Resultado | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [verId, setVerId] = useState<string | null>(null)
  const set = <K extends keyof CriterioPagos>(k: K, v: CriterioPagos[K]) => setC((x) => ({ ...x, [k]: v }))

  async function buscar(criterio = c, e?: FormEvent) {
    e?.preventDefault()
    if (criterio.por !== 'fecha' && criterio.texto.trim().length < 2) return setError('Escribe al menos 2 caracteres.')
    if (criterio.desde && criterio.hasta && criterio.desde > criterio.hasta) return setError('La fecha inicial es posterior a la final.')
    setError('')
    setBuscando(true)
    setRes(await buscarPagos(criterio))
    setBuscando(false)
  }
  const rapido = (desde: string) => {
    const nuevo: CriterioPagos = { ...c, por: 'fecha', texto: '', desde, hasta: HOY }
    setC(nuevo)
    buscar(nuevo)
  }
  const meta = ETIQUETA_POR[c.por]
  const comp = verId ? comprobanteDe(verId) : null

  return (
    <div className="space-y-4">
      <Panel cuerpo="">
        <form onSubmit={(e) => buscar(c, e)} className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-1.5 text-[0.8rem] font-medium text-ink-2">Buscar por</p>
              <Segmentado<CriterioPagos['por']> etiqueta="Tipo de búsqueda" valor={c.por} onCambio={(v) => { setC((x) => ({ ...x, por: v, desde: v === 'fecha' ? addDays(HOY, -30) : '' })); setRes(null); setError('') }} opciones={(Object.keys(ETIQUETA_POR) as CriterioPagos['por'][]).map((k) => ({ id: k, label: ETIQUETA_POR[k].label }))} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Boton type="button" variante="fantasma" onClick={() => rapido(HOY)}>Pagos de hoy</Boton>
              <Boton type="button" variante="fantasma" onClick={() => rapido(startOfMonth(HOY))}>Este mes</Boton>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end">
            {c.por !== 'fecha' ? (
              <Campo etiqueta={meta.campo} error={error || undefined}>
                <span className="relative">
                  <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                  <Entrada value={c.texto} onChange={(e) => set('texto', e.target.value)} placeholder={meta.ejemplo} className="pl-8" autoFocus />
                </span>
              </Campo>
            ) : <p className="self-center text-[0.85rem] text-ink-3">{error || 'Todos los pagos del rango de fechas.'}</p>}
            <Campo etiqueta="Desde" opcional={c.por !== 'fecha'}><Entrada type="date" value={c.desde} max={c.hasta || HOY} onChange={(e) => set('desde', e.target.value)} /></Campo>
            <Campo etiqueta="Hasta"><Entrada type="date" value={c.hasta} max={HOY} onChange={(e) => set('hasta', e.target.value)} /></Campo>
            <Campo etiqueta="Medio">
              <Selector value={c.medio} onChange={(e) => set('medio', e.target.value)}><option value="">Todos</option>{mediosPago.map((m) => <option key={m}>{m}</option>)}</Selector>
            </Campo>
            <Campo etiqueta="Tipo">
              <Selector value={c.tipo} onChange={(e) => set('tipo', e.target.value)}><option value="">Todos</option>{TIPOS.map((t) => <option key={t}>{t}</option>)}</Selector>
            </Campo>
            <Boton type="submit" variante="primario" disabled={buscando} icono={<Search size={15} />}>{buscando ? 'Buscando…' : 'Buscar'}</Boton>
          </div>
        </form>
      </Panel>

      {!res ? (
        <Panel>
          <Vacio titulo="Busca para ver pagos">Elige cómo buscar: por cliente, operación, comprobante o rango de fechas. No se listan todos los pagos de la cartera a la vez.</Vacio>
        </Panel>
      ) : (
        <Panel cuerpo="">
          <dl className="tabular grid grid-cols-2 gap-4 border-b border-line px-5 py-4 sm:grid-cols-4">
            <div><dt className="text-[0.75rem] text-ink-3">{res.total === 1 ? '1 pago encontrado' : `${entero(res.total)} pagos encontrados`}</dt><dd className="display text-[1.4rem] font-medium">{dinero(res.sumas.monto)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">A capital</dt><dd className="mt-1 font-medium">{dinero(res.sumas.capital)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">A interés</dt><dd className="mt-1 font-medium">{dinero(res.sumas.interes)}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Recargo por mora</dt><dd className="mt-1 font-medium">{dinero(res.sumas.mora)}</dd></div>
          </dl>
          {res.total > res.limite && <p className="border-b border-line bg-warn-soft/50 px-5 py-2 text-[0.8rem] text-warn">Se muestran los {res.limite} más recientes de {entero(res.total)}. Acota la búsqueda para ver el resto; los totales sí incluyen todos.</p>}
          {res.filas.length === 0 ? <Vacio titulo="Sin resultados">No hay pagos con esos criterios. Prueba ampliar el rango de fechas.</Vacio> : (
            <Tabla etiqueta="Pagos encontrados" className="max-h-[60vh]">
              <thead><tr><Th>Fecha</Th><Th>Cliente</Th><Th>Tipo</Th><Th>Medio</Th><Th derecha>Capital</Th><Th derecha>Interés</Th><Th derecha>Mora</Th><Th derecha>Total</Th><Th><span className="sr-only">Comprobante</span></Th></tr></thead>
              <tbody>
                {res.filas.map((p) => (
                  <tr key={p.id} className="hover:bg-panel-2/60">
                    <Td className="whitespace-nowrap">{fmtFecha(p.fecha)}<span className="block text-[0.72rem] text-ink-3">{p.id}</span></Td>
                    <Td><Link to={`/clientes/${p.clienteId}`} className="hover:text-rose-ink">{p.cliente.nombre}</Link><Link to={`/operaciones/${p.operacionId}`} className="block text-[0.72rem] whitespace-nowrap text-ink-3 hover:text-rose-ink">{p.operacionId}</Link></Td>
                    <Td className="whitespace-nowrap">{p.tipo === 'Cuota' ? <span className="text-ink-2">Cuota</span> : <Insignia tono={p.tipo === 'Abono parcial' ? 'rosa' : 'neutro'}>{p.tipo}</Insignia>}{p.registradoEnDemo && <Insignia tono="ok" className="ml-1">Nuevo</Insignia>}</Td>
                    <Td className="whitespace-nowrap text-ink-2">{p.medio}<span className="block text-[0.72rem] text-ink-3">{p.referencia}</span></Td>
                    <Td derecha className="text-ink-2">{dinero(p.capital)}</Td>
                    <Td derecha className="text-ink-2">{dinero(p.interes)}</Td>
                    <Td derecha className={p.mora ? 'text-ink-2' : 'text-ink-3'}>{dinero(p.mora)}</Td>
                    <Td derecha className="font-medium">{dinero(p.monto)}</Td>
                    <Td><button onClick={() => setVerId(p.id)} className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium whitespace-nowrap text-rose-ink hover:underline"><Receipt size={14} />Comprobante</button></Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Panel>
      )}

      {comp && (
        <Dialogo titulo="Comprobante" descripcion={comp.pago.id} onCerrar={() => setVerId(null)} ancho="max-w-xl">
          <Comprobante c={comp} />
        </Dialogo>
      )}
    </div>
  )
}
