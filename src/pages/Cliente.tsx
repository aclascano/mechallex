import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Dato, Encabezado, EsqueletoPagina, Insignia, InsigniaTramo, Panel, RecorridoCobranza, Tabla, Td, Th, Vacio } from '../components/ui'
import { fmtFecha } from '../domain/fechas'
import { dinero } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { obtenerCliente } from '../services/api'

export default function PaginaCliente() {
  const { id = '' } = useParams()
  const { data: d, cargando } = useServicio(() => obtenerCliente(id), [id])
  if (!d) return cargando ? <EsqueletoPagina /> : <Vacio titulo="Cliente no encontrado" />
  const { cliente: c } = d
  const saldo = d.operaciones.reduce((s, o) => s + o.saldoCapital, 0)
  const vencido = d.operaciones.reduce((s, o) => s + o.valorVencido, 0)

  return (
    <div>
      <Link to="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-[0.8rem] text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Clientes</Link>
      <Encabezado titulo={c.nombre} descripcion={<>{c.segmento} · cliente desde {fmtFecha(c.clienteDesde)} · gestor {c.gestor}</>} />
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel titulo="Ficha">
            <dl className="grid grid-cols-2 gap-4">
              <Dato etiqueta="Cédula / RUC">{c.cedula}</Dato>
              <Dato etiqueta="Código">{c.id}</Dato>
              <Dato etiqueta="Saldo total">{dinero(saldo)}</Dato>
              <Dato etiqueta="Vencido">{dinero(vencido)}</Dato>
            </dl>
            <ul className="mt-5 space-y-2 border-t border-line pt-4 text-[0.85rem] text-ink-2">
              <li className="flex items-center gap-2"><Phone size={15} className="text-ink-3" aria-hidden="true" />{c.telefono}</li>
              <li className="flex items-center gap-2"><Mail size={15} className="text-ink-3" aria-hidden="true" /><span className="truncate">{c.email}</span></li>
              <li className="flex items-center gap-2"><MapPin size={15} className="text-ink-3" aria-hidden="true" />{c.ciudad}</li>
            </ul>
          </Panel>
          <Panel titulo="Promesas de pago" cuerpo="">
            {d.promesas.length === 0 ? <Vacio titulo="Sin promesas registradas" /> : (
              <ul className="divide-y divide-line">
                {d.promesas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                    <span><span className="block font-medium">{dinero(p.monto)}</span><span className="text-[0.75rem] text-ink-3">{fmtFecha(p.fechaCompromiso)} · {p.canal}</span></span>
                    <Insignia tono={p.estado === 'Cumplida' ? 'ok' : p.estado === 'Vigente' ? 'rosa' : 'bad'}>{p.estado}</Insignia>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="min-w-0 space-y-4">
          <Panel titulo="Operaciones" cuerpo="">
            <Tabla etiqueta="Operaciones del cliente">
              <thead><tr><Th>Operación</Th><Th>Antigüedad</Th><Th>Etapa</Th><Th derecha>Vencido</Th><Th derecha>Saldo</Th></tr></thead>
              <tbody>
                {d.operaciones.map((o) => (
                  <tr key={o.id} className="hover:bg-panel-2/60">
                    <Td><Link to={`/operaciones/${o.id}`} className="font-medium hover:text-rose-ink">{o.id}</Link><span className="block text-[0.75rem] text-ink-3">{o.producto} · {dinero(o.monto)} a {o.plazoMeses} meses</span></Td>
                    <Td><InsigniaTramo tramo={o.tramo} /></Td>
                    <Td><RecorridoCobranza etapa={o.etapa} compacto /></Td>
                    <Td derecha>{dinero(o.valorVencido)}</Td>
                    <Td derecha className="font-medium">{o.cancelada ? <Insignia tono="ok">Cancelada</Insignia> : dinero(o.saldoCapital)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </Panel>
          <Panel titulo="Últimos pagos" cuerpo="">
            <Tabla etiqueta="Pagos del cliente" className="max-h-[420px]">
              <thead><tr><Th>Fecha</Th><Th>Operación</Th><Th>Tipo</Th><Th>Medio</Th><Th derecha>Monto</Th></tr></thead>
              <tbody>
                {d.pagos.slice(0, 30).map((p) => (
                  <tr key={p.id}>
                    <Td className="whitespace-nowrap">{fmtFecha(p.fecha)}</Td>
                    <Td className="text-ink-2">{p.operacionId}</Td>
                    <Td className="text-ink-2">{p.tipo}</Td>
                    <Td className="text-ink-2">{p.medio}</Td>
                    <Td derecha className="font-medium">{dinero(p.monto)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </Panel>
          {d.juicios.map((j) => (
            <Panel key={j.id} titulo={`Causa ${j.numeroCausa}`} detalle={`${j.juzgado} · ${j.abogado}`} acciones={<Link to={`/juicios?causa=${j.id}`} className="text-[0.8rem] font-medium text-rose-ink hover:underline">Ver expediente</Link>}>
              <p className="text-[0.85rem] text-ink-2">Etapa actual: <span className="font-medium text-ink">{j.etapa}</span> · cuantía {dinero(j.cuantia)}</p>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  )
}
