import { ArrowLeft, Gavel } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { RegistroPago } from '../components/RegistroPago'
import { Dato, Encabezado, EsqueletoPagina, Insignia, InsigniaTramo, Microimpresion, Panel, RecorridoCobranza, Tabla, Td, Th, Vacio } from '../components/ui'
import { totales } from '../domain/amortizacion'
import { fmtFecha } from '../domain/fechas'
import { HOY } from '../mocks/catalogos'
import { cx, dinero, porcentaje } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { listarOperaciones, obtenerOperacion } from '../services/api'

export default function PaginaOperacion() {
  const { id = '' } = useParams()
  const { data: d, cargando } = useServicio(() => obtenerOperacion(id), [id])
  const { data: todas } = useServicio(listarOperaciones)
  if (!d) return cargando ? <EsqueletoPagina /> : <Vacio titulo="Operación no encontrada">Revisa el número o vuelve a la lista de operaciones.</Vacio>

  const t = totales(d.tabla)
  const avance = d.capitalPagado / d.monto

  return (
    <div>
      <Link to="/operaciones" className="mb-3 inline-flex items-center gap-1.5 text-[0.8rem] text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Operaciones</Link>
      <Encabezado
        titulo={d.id}
        descripcion={<><Link to={`/clientes/${d.clienteId}`} className="font-medium text-ink hover:text-rose-ink">{d.cliente.nombre}</Link> · {d.producto} · cartera {d.origen.toLowerCase()} · sistema {d.sistema === 'frances' ? 'francés (cuota fija)' : 'alemán (capital fijo)'}</>}
        acciones={d.juicio && <Link to={`/juicios?causa=${d.juicio.id}`} className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-line-strong bg-panel px-3.5 text-[0.85rem] font-medium hover:bg-panel-2"><Gavel size={15} /> Causa {d.juicio.numeroCausa}</Link>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-[14px] border border-line bg-panel" aria-label="Resumen de la operación">
            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-[0.8rem] font-medium text-ink-2">Saldo de capital</p>
                <p className="display tabular mt-1 text-[2.4rem] leading-none font-medium">{dinero(d.saldoCapital)}</p>
                <div className="mt-3 flex items-center gap-3 text-[0.78rem] text-ink-3">
                  <span className="relative h-1 w-full max-w-48 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="absolute inset-y-0 left-0 bg-rose" style={{ width: `${avance * 100}%` }} /></span>
                  {porcentaje(avance)} del capital pagado
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <InsigniaTramo tramo={d.tramo} />
                <RecorridoCobranza etapa={d.etapa} />
              </div>
            </div>
            <Microimpresion className="border-y border-line px-5 py-[3px] text-ink-3/70" />
            <dl className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
              <Dato etiqueta="Monto desembolsado">{dinero(d.monto)}</Dato>
              <Dato etiqueta="Tasa nominal anual">{d.tasaAnual.toLocaleString('es-EC', { minimumFractionDigits: 2 })} %</Dato>
              <Dato etiqueta="Plazo">{d.plazoMeses} meses</Dato>
              <Dato etiqueta="Desembolso">{fmtFecha(d.fechaDesembolso)}</Dato>
              <Dato etiqueta="Cuotas pagadas">{d.cuotasPagadas} de {d.plazoMeses}</Dato>
              <Dato etiqueta="Cuotas vencidas">{d.cuotasVencidas}</Dato>
              <Dato etiqueta="Valor vencido">{dinero(d.valorVencido)}</Dato>
              <Dato etiqueta="Días de mora">{d.diasMora}</Dato>
            </dl>
          </section>

          <Panel titulo="Tabla de amortización" detalle={`Capital total ${dinero(t.capital)} = monto desembolsado · intereses ${dinero(t.interes)}`} cuerpo="">
            <Tabla etiqueta="Tabla de amortización" className="max-h-[560px]">
              <thead>
                <tr>
                  <Th>N.º</Th>
                  <Th>Vence</Th>
                  <Th derecha>Cuota</Th>
                  <Th derecha>Interés</Th>
                  <Th derecha>Capital</Th>
                  <Th derecha>Saldo</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {d.tabla.map((c, i) => {
                  const aplicado = d.aplicadoPorCuota[i]
                  const pagada = aplicado >= c.cuota - 0.005
                  const parcial = !pagada && aplicado > 0
                  const vencida = !pagada && c.fecha < HOY
                  return (
                    <tr key={c.n} className={cx(vencida && 'bg-bad-soft/40')}>
                      <Td className="text-ink-3">{c.n}</Td>
                      <Td className="whitespace-nowrap">{fmtFecha(c.fecha)}</Td>
                      <Td derecha className="font-medium">{dinero(c.cuota)}</Td>
                      <Td derecha className="text-ink-2">{dinero(c.interes)}</Td>
                      <Td derecha className="text-ink-2">{dinero(c.capital)}</Td>
                      <Td derecha>{dinero(c.saldo)}</Td>
                      <Td>
                        {pagada ? <Insignia tono="ok">Pagada</Insignia>
                          : vencida ? <Insignia tono="bad">{parcial ? `Vencida · abono ${dinero(aplicado)}` : 'Vencida'}</Insignia>
                          : parcial ? <Insignia tono="rosa">Abono {dinero(aplicado)}</Insignia>
                          : <Insignia>Por vencer</Insignia>}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <Td>Total</Td>
                  <Td />
                  <Td derecha>{dinero(t.cuota)}</Td>
                  <Td derecha>{dinero(t.interes)}</Td>
                  <Td derecha>{dinero(t.capital)}</Td>
                  <Td />
                  <Td />
                </tr>
              </tfoot>
            </Tabla>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel titulo="Registrar pago" detalle="El pago cubre recargo, interés y capital de la cuota más antigua.">
            {todas && <RegistroPago operaciones={todas} operacionInicial={d.id} key={d.id} />}
          </Panel>
          <Panel titulo="Pagos aplicados" detalle={`${d.pagos.length} pagos · capital ${dinero(d.capitalPagado)} · interés ${dinero(d.interesPagado)}`} cuerpo="">
            {d.pagos.length === 0 ? <Vacio titulo="Sin pagos todavía" /> : (
              <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
                {d.pagos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[0.82rem]">
                    <span className="min-w-0">
                      <span className="block font-medium">{fmtFecha(p.fecha)} {p.registradoEnDemo && <Insignia tono="rosa" className="ml-1 h-[18px] text-[0.68rem]">Nuevo</Insignia>}</span>
                      <span className="block truncate text-[0.75rem] text-ink-3">{p.tipo} · {p.medio}</span>
                    </span>
                    <span className="tabular shrink-0 text-right">
                      <span className="block font-medium">{dinero(p.monto)}</span>
                      <span className="block text-[0.72rem] text-ink-3">cap. {dinero(p.capital)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
