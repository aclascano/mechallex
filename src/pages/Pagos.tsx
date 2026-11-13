import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { RegistroPago } from '../components/RegistroPago'
import { Campo, Encabezado, Entrada, EsqueletoPagina, Insignia, Panel, Selector, Tabla, Td, Th, Vacio } from '../components/ui'
import { fmtFecha, fmtMes, monthKey } from '../domain/fechas'
import { HOY, MEDIOS } from '../mocks/catalogos'
import { dinero, entero } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { listarOperaciones, listarPagos } from '../services/api'

export default function PaginaPagos() {
  const { data: pagos } = useServicio(listarPagos)
  const { data: ops } = useServicio(listarOperaciones)
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [medio, setMedio] = useState('')
  const [mes, setMes] = useState(monthKey(HOY))
  const meses = useMemo(() => [...new Set((pagos ?? []).map((p) => monthKey(p.fecha)))].slice(0, 12), [pagos])

  const filas = useMemo(() => {
    if (!pagos) return []
    const t = q.trim().toLowerCase()
    return pagos
      .filter((p) => !mes || monthKey(p.fecha) === mes)
      .filter((p) => !medio || p.medio === medio)
      .filter((p) => !t || p.cliente.nombre.toLowerCase().includes(t) || p.operacionId.toLowerCase().includes(t) || p.referencia.toLowerCase().includes(t))
  }, [pagos, q, medio, mes])

  if (!pagos || !ops) return <EsqueletoPagina />
  const suma = (k: 'monto' | 'capital' | 'interes' | 'mora') => filas.reduce((s, p) => s + p[k], 0)

  return (
    <div>
      <Encabezado titulo="Pagos y abonos" descripcion="Cada pago se aplica primero al recargo por mora, luego al interés y al final al capital de la cuota más antigua. Lo que registres aquí reduce el saldo de la operación en todas las pantallas." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel cuerpo="" className="order-2 xl:order-1">
          <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[minmax(0,2fr)_1fr_1fr]">
            <Campo etiqueta="Buscar">
              <span className="relative">
                <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, operación o referencia" className="pl-8" />
              </span>
            </Campo>
            <Campo etiqueta="Mes">
              <Selector value={mes} onChange={(e) => setMes(e.target.value)}>
                <option value="">Todos</option>
                {meses.map((m) => <option key={m} value={m}>{fmtMes(m + '-01', true)}</option>)}
              </Selector>
            </Campo>
            <Campo etiqueta="Medio">
              <Selector value={medio} onChange={(e) => setMedio(e.target.value)}>
                <option value="">Todos</option>
                {MEDIOS.map((m) => <option key={m}>{m}</option>)}
              </Selector>
            </Campo>
          </div>
          <dl className="tabular grid grid-cols-2 gap-4 border-b border-line px-5 py-4 sm:grid-cols-4">
            <div><dt className="text-[0.75rem] text-ink-3">Recibido · {entero(filas.length)} pagos</dt><dd className="display text-[1.4rem] font-medium">{dinero(suma('monto'))}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">A capital</dt><dd className="mt-1 font-medium">{dinero(suma('capital'))}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">A interés</dt><dd className="mt-1 font-medium">{dinero(suma('interes'))}</dd></div>
            <div><dt className="text-[0.75rem] text-ink-3">Recargo por mora</dt><dd className="mt-1 font-medium">{dinero(suma('mora'))}</dd></div>
          </dl>
          {filas.length === 0 ? <Vacio titulo="No hay pagos con esos filtros">Cambia el mes o el medio de pago.</Vacio> : (
            <Tabla etiqueta="Pagos" className="max-h-[64vh]">
              <thead>
                <tr><Th>Fecha</Th><Th>Cliente</Th><Th>Tipo</Th><Th>Medio</Th><Th derecha>Capital</Th><Th derecha>Interés</Th><Th derecha>Mora</Th><Th derecha>Total</Th></tr>
              </thead>
              <tbody>
                {filas.slice(0, 300).map((p) => (
                  <tr key={p.id} className="hover:bg-panel-2/60">
                    <Td className="whitespace-nowrap">{fmtFecha(p.fecha)}<span className="block text-[0.72rem] text-ink-3">{p.id}</span></Td>
                    <Td><Link to={`/operaciones/${p.operacionId}`} className="hover:text-rose-ink">{p.cliente.nombre}</Link><span className="block text-[0.72rem] text-ink-3">{p.operacionId}</span></Td>
                    <Td>{p.tipo === 'Abono parcial' ? <Insignia tono="rosa">Abono parcial</Insignia> : <span className="text-ink-2">{p.tipo}</span>}{p.registradoEnDemo && <Insignia tono="ok" className="ml-1">Nuevo</Insignia>}</Td>
                    <Td className="whitespace-nowrap text-ink-2">{p.medio}<span className="block text-[0.72rem] text-ink-3">{p.referencia}</span></Td>
                    <Td derecha className="text-ink-2">{dinero(p.capital)}</Td>
                    <Td derecha className="text-ink-2">{dinero(p.interes)}</Td>
                    <Td derecha className="text-ink-2">{dinero(p.mora)}</Td>
                    <Td derecha className="font-medium">{dinero(p.monto)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Panel>
        <Panel titulo="Registrar pago o abono" detalle="Vista previa del efecto en el saldo antes de confirmar." className="order-1 self-start xl:order-2" id={params.get('nuevo') ? 'nuevo' : undefined}>
          <RegistroPago operaciones={ops} />
        </Panel>
      </div>
    </div>
  )
}
