import { CalendarClock, LayoutList, Columns3, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Dato, Encabezado, EsqueletoPagina, Panel, Segmentado, Tabla, Td, Th } from '../components/ui'
import { fmtFecha } from '../domain/fechas'
import type { EtapaJuicio } from '../domain/tipos'
import { cx, dinero, dineroCorto } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { listarJuicios } from '../services/api'

const COLUMNAS: EtapaJuicio[] = ['Preparación', 'Demanda', 'Citación', 'Audiencia', 'Sentencia', 'Ejecución', 'Embargo y remate']

type JuicioVista = Awaited<ReturnType<typeof listarJuicios>>[number]

function Expediente({ j, onCerrar }: { j: JuicioVista; onCerrar: () => void }) {
  const idx = COLUMNAS.indexOf(j.etapa)
  return (
    <Panel
      titulo={<>Causa <span className="tabular">{j.numeroCausa}</span></>}
      detalle={`${j.juzgado} · procedimiento ejecutivo`}
      acciones={<button onClick={onCerrar} className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink" aria-label="Cerrar expediente"><X size={16} /></button>}
      className="2xl:sticky 2xl:top-20"
    >
      <dl className="grid grid-cols-2 gap-4">
        <Dato etiqueta="Demandado"><Link to={`/clientes/${j.clienteId}`} className="hover:text-rose-ink">{j.cliente.nombre}</Link></Dato>
        <Dato etiqueta="Operación"><Link to={`/operaciones/${j.operacionId}`} className="hover:text-rose-ink">{j.operacionId}</Link></Dato>
        <Dato etiqueta="Cuantía">{dinero(j.cuantia)}</Dato>
        <Dato etiqueta="Abogado">{j.abogado}</Dato>
      </dl>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-3 text-[0.78rem] font-medium text-ink-3">Flujo procesal</p>
        <ol className="flex gap-1" aria-label={`Etapa ${idx + 1} de ${COLUMNAS.length}: ${j.etapa}`}>
          {COLUMNAS.map((c, i) => (
            <li key={c} className="flex-1" title={c}>
              <span className={cx('block h-1.5 rounded-full', i < idx ? 'bg-steel/50' : i === idx ? 'bg-rose' : 'bg-line')} />
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[0.8rem]"><span className="font-medium">{j.etapa}</span><span className="text-ink-3"> · etapa {idx + 1} de {COLUMNAS.length}</span></p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-3 text-[0.78rem] font-medium text-ink-3">Actuaciones</p>
        <ol className="relative space-y-4 border-l border-line-strong pl-5">
          {j.proximaDiligencia && (
            <li className="relative">
              <span className="absolute top-1 -left-[25px] grid h-[9px] w-[9px] place-items-center rounded-full border-2 border-rose bg-panel" aria-hidden="true" />
              <p className="flex items-center gap-1.5 text-[0.8rem] font-medium text-rose-ink"><CalendarClock size={14} aria-hidden="true" /> {fmtFecha(j.proximaDiligencia.fecha)} · pendiente</p>
              <p className="text-[0.8rem] text-ink-2">{j.proximaDiligencia.descripcion}</p>
            </li>
          )}
          {[...j.eventos].reverse().map((e) => (
            <li key={e.fecha + e.titulo} className="relative">
              <span className="absolute top-1.5 -left-[24px] h-[7px] w-[7px] rounded-full bg-steel" aria-hidden="true" />
              <p className="text-[0.8rem] font-medium">{e.titulo} <span className="font-normal text-ink-3">· {fmtFecha(e.fecha)}</span></p>
              <p className="text-[0.8rem] text-ink-2">{e.detalle}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-[0.78rem] font-medium text-ink-3">Costas judiciales</p>
        {j.costas.length === 0 ? <p className="text-[0.8rem] text-ink-3">Sin costas todavía: la demanda aún no se presenta.</p> : (
          <table className="tabular w-full text-[0.8rem]">
            <tbody>
              {j.costas.map((c) => (
                <tr key={c.concepto + c.fecha} className="border-b border-line">
                  <td className="py-1.5 pr-2">{c.concepto}<span className="block text-[0.72rem] text-ink-3">{fmtFecha(c.fecha)}</span></td>
                  <td className="py-1.5 text-right">{dinero(c.monto)}</td>
                </tr>
              ))}
              <tr className="font-semibold"><td className="pt-2">Total</td><td className="pt-2 text-right">{dinero(j.totalCostas)}</td></tr>
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[0.75rem] text-ink-3">Registradas como gasto judicial en contabilidad (cuenta 5.1.01).</p>
      </div>
    </Panel>
  )
}

export default function PaginaJuicios() {
  const { data } = useServicio(listarJuicios)
  const [params, setParams] = useSearchParams()
  const [vista, setVista] = useState<'tablero' | 'lista'>('tablero')
  const sel = params.get('causa')
  const seleccionado = useMemo(() => data?.find((j) => j.id === sel), [data, sel])
  const abrir = (id: string | null) => setParams(id ? { causa: id } : {})

  useEffect(() => {
    if (seleccionado) document.getElementById('expediente')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [seleccionado])

  if (!data) return <EsqueletoPagina />
  const cuantia = data.reduce((s, j) => s + j.cuantia, 0)
  const costas = data.reduce((s, j) => s + j.totalCostas, 0)

  return (
    <div>
      <Encabezado
        titulo="Juicios"
        descripcion={`${data.length} causas de cobro ejecutivo · cuantía ${dineroCorto(cuantia)} · costas ${dinero(costas)}. Las operaciones pasan a judicial después de 120 días de mora.`}
        acciones={<Segmentado etiqueta="Vista" valor={vista} onCambio={setVista} opciones={[{ id: 'tablero', label: 'Tablero' }, { id: 'lista', label: 'Lista' }]} />}
      />
      <div className={cx('grid gap-4', seleccionado && '2xl:grid-cols-[minmax(0,1fr)_380px]')}>
        <div className="min-w-0">
          {vista === 'tablero' ? (
            <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              <div className="grid min-w-[1080px] grid-cols-7 gap-3">
                {COLUMNAS.map((col) => {
                  const items = data.filter((j) => j.etapa === col)
                  return (
                    <section key={col} aria-label={col} className="flex min-h-[220px] flex-col rounded-[12px] bg-panel-2/70 p-2">
                      <h2 className="flex items-center justify-between px-1.5 pt-1 pb-2 text-[0.78rem] font-semibold text-ink-2">
                        {col}
                        <span className="tabular rounded-full bg-panel px-1.5 text-[0.7rem] font-medium text-ink-3">{items.length}</span>
                      </h2>
                      <ul className="space-y-2">
                        {items.map((j) => (
                          <li key={j.id}>
                            <button
                              onClick={() => abrir(j.id)}
                              aria-pressed={sel === j.id}
                              className={cx(
                                'w-full rounded-[10px] border bg-panel p-3 text-left shadow-[0_1px_2px_oklch(0.3_0.03_20/0.05)] transition-[border-color,box-shadow] duration-150 hover:border-line-strong',
                                sel === j.id ? 'border-rose ring-2 ring-rose/25' : 'border-line',
                              )}
                            >
                              <p className="truncate text-[0.8rem] font-medium">{j.cliente.nombre}</p>
                              <p className="tabular truncate text-[0.7rem] text-ink-3">{j.numeroCausa}</p>
                              <p className="tabular mt-2 text-[0.85rem] font-semibold">{dineroCorto(j.cuantia)}</p>
                              <p className="tabular mt-1 flex items-center justify-between gap-2 text-[0.7rem] whitespace-nowrap text-ink-3">
                                <span>costas {dineroCorto(j.totalCostas)}</span>
                                {j.proximaDiligencia && <span>{fmtFecha(j.proximaDiligencia.fecha).replace(/ \d{4}$/, '')}</span>}
                              </p>
                            </button>
                          </li>
                        ))}
                        {items.length === 0 && <li className="px-1.5 py-3 text-[0.75rem] text-ink-3">Sin causas</li>}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </div>
          ) : (
            <Panel cuerpo="">
              <Tabla etiqueta="Causas judiciales">
                <thead><tr><Th>Causa</Th><Th>Demandado</Th><Th>Etapa</Th><Th>Próxima diligencia</Th><Th derecha>Costas</Th><Th derecha>Cuantía</Th></tr></thead>
                <tbody>
                  {data.map((j) => (
                    <tr key={j.id} className={cx('cursor-pointer hover:bg-panel-2/60', sel === j.id && 'bg-rose-soft/40')} onClick={() => abrir(j.id)}>
                      <Td><button className="tabular font-medium hover:text-rose-ink" onClick={() => abrir(j.id)}>{j.numeroCausa}</button><span className="block text-[0.72rem] text-ink-3">{j.juzgado}</span></Td>
                      <Td>{j.cliente.nombre}</Td>
                      <Td>{j.etapa}</Td>
                      <Td className="text-ink-2">{j.proximaDiligencia ? <>{fmtFecha(j.proximaDiligencia.fecha)}<span className="block text-[0.72rem] text-ink-3">{j.proximaDiligencia.descripcion}</span></> : '—'}</Td>
                      <Td derecha>{dinero(j.totalCostas)}</Td>
                      <Td derecha className="font-medium">{dinero(j.cuantia)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </Panel>
          )}
          <p className="mt-3 flex items-center gap-2 text-[0.78rem] text-ink-3">
            {vista === 'tablero' ? <Columns3 size={14} aria-hidden="true" /> : <LayoutList size={14} aria-hidden="true" />}
            Selecciona una causa para ver su expediente, actuaciones y costas.
          </p>
        </div>
        {seleccionado && <div id="expediente"><Expediente j={seleccionado} onCerrar={() => abrir(null)} /></div>}
      </div>
    </div>
  )
}
