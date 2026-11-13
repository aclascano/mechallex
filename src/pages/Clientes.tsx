import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Campo, Encabezado, Entrada, EsqueletoPagina, InsigniaTramo, Panel, Selector, Tabla, Td, Th, Vacio } from '../components/ui'
import { GESTORES } from '../mocks/catalogos'
import { dinero, entero } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { listarClientes } from '../services/api'

export default function PaginaClientes() {
  const { data } = useServicio(listarClientes)
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [gestor, setGestor] = useState('')
  const [estado, setEstado] = useState('')

  const filas = useMemo(() => {
    if (!data) return []
    const t = q.trim().toLowerCase()
    return data
      .filter((c) => !t || c.nombre.toLowerCase().includes(t) || c.cedula.includes(t) || c.id.toLowerCase().includes(t) || c.ciudad.toLowerCase().includes(t))
      .filter((c) => !gestor || c.gestor === gestor)
      .filter((c) => !estado || (estado === 'mora' ? c.diasMora > 0 : c.diasMora === 0))
      .sort((a, b) => b.vencido - a.vencido || b.saldo - a.saldo)
  }, [data, q, gestor, estado])

  if (!data) return <EsqueletoPagina />

  return (
    <div>
      <Encabezado titulo="Clientes" descripcion={`${entero(data.length)} deudores registrados. Nombres, cédulas y contactos son ficticios.`} />
      <Panel cuerpo="">
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[minmax(0,2fr)_1fr_1fr]">
          <Campo etiqueta="Buscar">
            <span className="relative">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, cédula, ciudad u operación" className="pl-8" />
            </span>
          </Campo>
          <Campo etiqueta="Gestor asignado">
            <Selector value={gestor} onChange={(e) => setGestor(e.target.value)}>
              <option value="">Todos</option>
              {GESTORES.map((g) => <option key={g}>{g}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Situación">
            <Selector value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todas</option>
              <option value="mora">En mora</option>
              <option value="al-dia">Al día</option>
            </Selector>
          </Campo>
        </div>
        {filas.length === 0 ? (
          <Vacio titulo="Sin coincidencias">No hay clientes con “{q}”. Busca por apellido, cédula o ciudad.</Vacio>
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
                <tr key={c.id} className="transition-colors hover:bg-panel-2/60">
                  <Td>
                    <Link to={`/clientes/${c.id}`} className="font-medium hover:text-rose-ink">{c.nombre}</Link>
                    <span className="block text-[0.75rem] text-ink-3">{c.segmento} · {c.ciudad}</span>
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
