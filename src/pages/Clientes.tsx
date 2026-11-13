import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Campo, Encabezado, Entrada, EsqueletoPagina, Insignia, InsigniaTramo, Panel, Selector, Tabla, Td, Th, Vacio } from '../components/ui'
import { EstadisticasClientes } from '../components/EstadisticasClientes'
import { cx, dinero, entero } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { catalogosCliente, fechaCorte, listarClientes } from '../services/api'

const hoy = fechaCorte()

export default function PaginaClientes() {
  const { data } = useServicio(listarClientes)
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [gestor, setGestor] = useState('')
  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [activo, setActivo] = useState('Activo')

  const filas = useMemo(() => {
    if (!data) return []
    const t = q.trim().toLowerCase()
    return data
      .filter((c) => !t || c.nombre.toLowerCase().includes(t) || c.cedula.includes(t) || c.id.toLowerCase().includes(t) || c.ciudad.toLowerCase().includes(t))
      .filter((c) => !gestor || c.gestor === gestor)
      .filter((c) => !estado || (estado === 'mora' ? c.diasMora > 0 : c.diasMora === 0))
      .filter((c) => !tipo || c.tipoPersona === tipo)
      .filter((c) => !ciudad || c.ciudad === ciudad)
      .filter((c) => !activo || c.estado === activo)
      .sort((a, b) => Number(b.clienteDesde === hoy) - Number(a.clienteDesde === hoy) || b.vencido - a.vencido || b.saldo - a.saldo)
  }, [data, q, gestor, estado, tipo, ciudad, activo])

  if (!data) return <EsqueletoPagina />

  return (
    <div>
      <Encabezado
        titulo="Clientes"
        descripcion={`${entero(data.filter((c) => c.estado === 'Activo').length)} clientes activos. Busca por nombre, cédula, RUC o ciudad, o registra uno nuevo.`}
        acciones={
          <Link to="/clientes/nuevo" className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-rail px-3.5 text-[0.85rem] font-medium text-rail-ink hover:bg-rail-2 dark:bg-rose dark:text-[oklch(0.15_0.01_290)] dark:hover:bg-rose-ink">
            <Plus size={16} /> Nuevo cliente
          </Link>
        }
      />
      <EstadisticasClientes />
      <Panel cuerpo="">
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]">
          <Campo etiqueta="Buscar">
            <span className="relative">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, cédula, ciudad u operación" className="pl-8" />
            </span>
          </Campo>
          <Campo etiqueta="Gestor asignado">
            <Selector value={gestor} onChange={(e) => setGestor(e.target.value)}>
              <option value="">Todos</option>
              {catalogosCliente.gestores.map((g) => <option key={g}>{g}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Situación">
            <Selector value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todas</option>
              <option value="mora">En mora</option>
              <option value="al-dia">Al día</option>
            </Selector>
          </Campo>
          <Campo etiqueta="Tipo">
            <Selector value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="Natural">Persona natural</option>
              <option value="Jurídica">Persona jurídica</option>
            </Selector>
          </Campo>
          <Campo etiqueta="Ciudad">
            <Selector value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
              <option value="">Todas</option>
              {catalogosCliente.ciudades.map((c) => <option key={c}>{c}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Estado">
            <Selector value={activo} onChange={(e) => setActivo(e.target.value)}>
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
              <option value="">Todos</option>
            </Selector>
          </Campo>
        </div>
        {filas.length === 0 ? (
          <Vacio titulo="Sin coincidencias">{q ? <>No hay clientes con “{q}” y estos filtros.</> : 'Ningún cliente cumple estos filtros.'} Prueba quitando alguno.</Vacio>
        ) : (
          <Tabla etiqueta="Clientes" className="max-h-[70vh]">
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Cédula / RUC</Th>
                <Th>Contacto</Th>
                <Th>Gestor</Th>
                <Th>Situación</Th>
                <Th derecha>Vencido</Th>
                <Th derecha>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((c) => (
                <tr key={c.id} className={cx('transition-colors hover:bg-panel-2/60', c.estado === 'Inactivo' && 'text-ink-3')}>
                  <Td>
                    <Link to={`/clientes/${c.id}`} className="font-medium hover:text-rose-ink">{c.nombre}</Link>
                    <span className="block text-[0.75rem] text-ink-3">{c.segmento} · {c.ciudad}{c.estado === 'Inactivo' && <> · <Insignia className="h-[18px] align-middle">Inactivo</Insignia></>}</span>
                  </Td>
                  <Td className="tabular text-ink-2">{c.cedula}</Td>
                  <Td className="text-ink-2">{c.telefono}<span className="block max-w-[22ch] truncate text-[0.75rem] text-ink-3">{c.email}</span></Td>
                  <Td className="whitespace-nowrap text-ink-2">{c.gestor}</Td>
                  <Td><InsigniaTramo tramo={c.tramo} /><span className="block text-[0.75rem] text-ink-3">{c.operaciones} {c.operaciones === 1 ? 'operación' : 'operaciones'}</span></Td>
                  <Td derecha className={c.vencido > 0 ? 'font-medium' : 'text-ink-3'}>{dinero(c.vencido)}</Td>
                  <Td derecha className="font-medium">{dinero(c.saldo)}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </div>
  )
}
