import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Campo, Encabezado, Entrada, EsqueletoPagina, Insignia, InsigniaTramo, Panel, RecorridoCobranza, Selector, Tabla, Td, Th, Vacio } from '../components/ui'
import { ETAPAS, TRAMOS } from '../domain/cartera'
import { fmtFecha } from '../domain/fechas'
import { cx, dinero, entero } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { catalogosCliente, listarOperaciones, type OperacionVista } from '../services/api'

type Orden = 'saldoCapital' | 'diasMora' | 'valorVencido' | 'fechaDesembolso'

export default function PaginaOperaciones() {
  const { data } = useServicio(listarOperaciones)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [producto, setProducto] = useState('')
  const [tramo, setTramo] = useState(params.get('mora') ? 'mora' : '')
  const [origen, setOrigen] = useState('')
  const [gestor, setGestor] = useState('')
  const [etapa, setEtapa] = useState('')
  const [estado, setEstado] = useState('vigentes')
  const [orden, setOrden] = useState<{ campo: Orden; desc: boolean }>({ campo: params.get('mora') ? 'diasMora' : 'saldoCapital', desc: true })

  const filas = useMemo(() => {
    if (!data) return []
    const t = q.trim().toLowerCase()
    return data
      .filter((o) => estado === 'todas' || (estado === 'canceladas' ? o.cancelada : !o.cancelada))
      .filter((o) => !gestor || o.cliente.gestor === gestor)
      .filter((o) => !etapa || (!o.cancelada && o.etapa === etapa))
      .filter((o) => !t || o.id.toLowerCase().includes(t) || o.cliente.nombre.toLowerCase().includes(t) || o.cliente.cedula.includes(t))
      .filter((o) => !producto || o.producto === producto)
      .filter((o) => !origen || o.origen === origen)
      .filter((o) => !tramo || (tramo === 'mora' ? o.diasMora > 0 : o.tramo === tramo))
      .sort((a, b) => {
        const va = a[orden.campo]
        const vb = b[orden.campo]
        const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return orden.desc ? -r : r
      })
  }, [data, q, producto, tramo, origen, gestor, etapa, estado, orden])

  if (!data) return <EsqueletoPagina />
  const total = filas.reduce((s, o) => s + o.saldoCapital, 0)
  const vencido = filas.reduce((s, o) => s + o.valorVencido, 0)

  const Orden = ({ campo, children, derecha }: { campo: Orden; children: React.ReactNode; derecha?: boolean }) => (
    <Th derecha={derecha}>
      <button
        className={cx('inline-flex items-center gap-1 hover:text-ink', orden.campo === campo && 'text-ink')}
        onClick={() => setOrden((o) => ({ campo, desc: o.campo === campo ? !o.desc : true }))}
        aria-label={`Ordenar por ${String(children).toLowerCase()}`}
      >
        {children}
        {orden.campo === campo && (orden.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    </Th>
  )

  return (
    <div>
      <Encabezado titulo="Operaciones de crédito" descripcion="Cartera con su saldo, antigüedad y etapa de cobranza. Abre una operación para ver su tabla de amortización, devengo, garantías y estado de cuenta." />
      <Panel cuerpo="">
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(0,1.6fr)_repeat(6,minmax(0,1fr))]">
          <Campo etiqueta="Buscar">
            <span className="relative">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Operación, cliente o cédula" className="pl-8" />
            </span>
          </Campo>
          <Campo etiqueta="Antigüedad">
            <Selector value={tramo} onChange={(e) => { setTramo(e.target.value); if (params.get('mora')) setParams({}) }}>
              <option value="">Todas</option>
              <option value="mora">Solo en mora</option>
              {TRAMOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Producto">
            <Selector value={producto} onChange={(e) => setProducto(e.target.value)}>
              <option value="">Todos</option>
              {['Consumo', 'Microcrédito', 'Vivienda', 'Comercial'].map((p) => <option key={p}>{p}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Origen">
            <Selector value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">Propia y cedida</option>
              <option>Propia</option>
              <option>Cedida</option>
            </Selector>
          </Campo>
          <Campo etiqueta="Etapa de cobranza">
            <Selector value={etapa} onChange={(e) => setEtapa(e.target.value)}>
              <option value="">Todas</option>
              {ETAPAS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Gestor">
            <Selector value={gestor} onChange={(e) => setGestor(e.target.value)}>
              <option value="">Todos</option>
              {catalogosCliente.gestores.map((g) => <option key={g}>{g}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Estado">
            <Selector value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="vigentes">Vigentes</option>
              <option value="canceladas">Canceladas</option>
              <option value="todas">Todas</option>
            </Selector>
          </Campo>
        </div>
        <p className="tabular flex flex-wrap gap-x-5 gap-y-1 px-5 py-3 text-[0.8rem] text-ink-3">
          <span><span className="font-medium text-ink">{entero(filas.length)}</span> operaciones</span>
          <span>Saldo <span className="font-medium text-ink">{dinero(total)}</span></span>
          <span>Vencido <span className="font-medium text-ink">{dinero(vencido)}</span></span>
        </p>
        {filas.length === 0 ? (
          <Vacio titulo="Ninguna operación coincide">Prueba quitando algún filtro o borra la búsqueda.</Vacio>
        ) : (
          <Tabla etiqueta="Operaciones" className="max-h-[68vh]">
            <thead>
              <tr>
                <Th>Operación</Th>
                <Th>Cliente</Th>
                <Orden campo="fechaDesembolso">Desembolso</Orden>
                <Th>Sistema</Th>
                <Orden campo="diasMora">Antigüedad</Orden>
                <Th>Etapa</Th>
                <Orden campo="valorVencido" derecha>Vencido</Orden>
                <Orden campo="saldoCapital" derecha>Saldo</Orden>
              </tr>
            </thead>
            <tbody>
              {filas.map((o) => <FilaOperacion key={o.id} o={o} />)}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </div>
  )
}

function FilaOperacion({ o }: { o: OperacionVista }) {
  return (
    <tr className="transition-colors hover:bg-panel-2/60">
      <Td>
        <Link to={`/operaciones/${o.id}`} className="font-medium whitespace-nowrap text-ink hover:text-rose-ink">{o.id}</Link>
        <span className="flex items-center gap-1.5 text-[0.75rem] text-ink-3">{o.producto}{o.origen === 'Cedida' && <Insignia tono="acero" className="h-[18px] px-1.5 text-[0.68rem]">Cedida</Insignia>}</span>
      </Td>
      <Td>
        <Link to={`/clientes/${o.clienteId}`} className="hover:text-rose-ink">{o.cliente.nombre}</Link>
        <span className="block text-[0.75rem] text-ink-3">{o.cliente.ciudad}</span>
      </Td>
      <Td className="whitespace-nowrap text-ink-2">{fmtFecha(o.fechaDesembolso)}</Td>
      <Td className="text-ink-2">{o.sistema === 'frances' ? 'Francés' : 'Alemán'}<span className="block text-[0.75rem] text-ink-3">{o.cuotasPagadas}/{o.tabla.length} cuotas</span></Td>
      <Td>{o.cancelada ? <Insignia tono="ok">Cancelada</Insignia> : <><InsigniaTramo tramo={o.tramo} />{o.diasMora > 0 && <span className="block text-[0.75rem] text-ink-3">{o.diasMora} días</span>}</>}</Td>
      <Td>{o.cancelada ? <span className="text-ink-3">—</span> : <RecorridoCobranza etapa={o.etapa} compacto />}</Td>
      <Td derecha className={o.valorVencido > 0 ? 'font-medium' : 'text-ink-3'}>{dinero(o.valorVencido)}</Td>
      <Td derecha className="font-medium">{dinero(o.saldoCapital)}</Td>
    </tr>
  )
}
