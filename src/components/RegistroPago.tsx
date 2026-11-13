import { ArrowRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { tramoDe } from '../domain/cartera'
import { fmtFecha } from '../domain/fechas'
import type { MedioPago } from '../domain/tipos'
import { cx, dinero, plural } from '../lib/formato'
import { buscarOperacionesParaPago, mediosPago, presimularPago, registrarPago, resumenParaPago } from '../services/api'
import { Comprobante, type DatosComprobante } from './Comprobante'
import { Boton, Campo, Entrada, Insignia, InsigniaTramo, Segmentado, Selector, Tabla, Td, Th } from './ui'

type Modo = 'cuotas' | 'aldia' | 'libre'

/**
 * Registro de pago en tres pasos: elegir la operación, definir el valor y revisar la presimulación
 * (cómo se aplica a recargo, interés y capital de cada cuota) antes de confirmar.
 */
export function RegistroPago({ operacionFija, compacto }: { operacionFija?: string; compacto?: boolean }) {
  const [opId, setOpId] = useState(operacionFija ?? '')
  const [busqueda, setBusqueda] = useState('')
  const [modo, setModo] = useState<Modo>('cuotas')
  const [nCuotas, setNCuotas] = useState(1)
  const [libre, setLibre] = useState('')
  const [medio, setMedio] = useState<MedioPago>('Ventanilla')
  const [referencia, setReferencia] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState<DatosComprobante | null>(null)

  const resultados = useMemo(() => (opId ? [] : buscarOperacionesParaPago(busqueda)), [busqueda, opId])
  const r = opId ? resumenParaPago(opId) : null
  const tieneVencido = (r?.saldos.exigible ?? 0) > 0
  const monto = !r ? 0
    : modo === 'aldia' ? r.saldos.exigible
    : modo === 'cuotas' ? r.valorCuotas(nCuotas) + (r.saldos.mora)
    : Number(libre.replace(',', '.'))
  const valido = !!r && Number.isFinite(monto) && monto > 0
  const sim = valido ? presimularPago(r.operacion.id, monto) : null

  function reiniciar() {
    setHecho(null)
    setLibre('')
    setReferencia('')
    setNCuotas(1)
    if (!operacionFija) setOpId('')
  }

  async function confirmar() {
    if (!r || !valido) return
    setEnviando(true)
    const c = await registrarPago({ operacionId: r.operacion.id, monto, medio, referencia })
    setEnviando(false)
    setHecho(c)
  }

  if (hecho) {
    return <Comprobante c={hecho} acciones={<Boton variante="primario" onClick={reiniciar}>Registrar otro pago</Boton>} />
  }

  const formulario = (
    <div className="space-y-6">
      {/* 1. Operación */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-[0.875rem] font-semibold"><Num n={1} />Operación</h3>
        {!r ? (
          <div>
            <Campo etiqueta="Buscar por cliente, cédula u operación">
              <span className="relative">
                <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                <Entrada value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej.: Herrera, 0212… u OP-2025-0005" className="pl-8" autoComplete="off" autoFocus />
              </span>
            </Campo>
            {resultados.length > 0 && (
              <ul className="mt-2 overflow-hidden rounded-[12px] border border-line">
                {resultados.map((o) => (
                  <li key={o.id} className="border-b border-line last:border-b-0">
                    <button onClick={() => { setOpId(o.id); setBusqueda(''); setModo(o.valorVencido > 0 ? 'aldia' : 'cuotas') }} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-panel-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[0.875rem] font-medium">{o.cliente.nombre}</span>
                        <span className="tabular text-[0.75rem] text-ink-3">{o.id} · {o.producto} · {o.cliente.cedula}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3"><InsigniaTramo tramo={o.tramo} /><span className="text-[0.8rem] font-medium text-rose-ink">Elegir</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {busqueda.trim().length >= 2 && resultados.length === 0 && <p className="mt-2 text-[0.85rem] text-ink-3">No hay operaciones vigentes que coincidan con “{busqueda}”.</p>}
          </div>
        ) : (
          <div className="rounded-[12px] border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[0.9rem] font-semibold">{r.operacion.cliente.nombre}</p>
                <p className="tabular text-[0.78rem] text-ink-3"><Link to={`/operaciones/${r.operacion.id}`} className="hover:text-rose-ink">{r.operacion.id}</Link> · {r.operacion.producto} · cuota {dinero(r.operacion.proximaCuota?.valor ?? r.operacion.tabla.at(-1)!.cuota)}</p>
              </div>
              <div className="flex items-center gap-2">
                <InsigniaTramo tramo={r.operacion.tramo} />
                {!operacionFija && <Boton variante="fantasma" onClick={() => setOpId('')}>Cambiar</Boton>}
              </div>
            </div>
            <dl className="tabular mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3 text-[0.8rem]">
              <div><dt className="text-ink-3">Saldo</dt><dd className="font-medium">{dinero(r.operacion.saldoCapital)}</dd></div>
              <div><dt className="text-ink-3">Para ponerse al día</dt><dd className={cx('font-medium', tieneVencido && 'text-bad')}>{dinero(r.saldos.exigible)}</dd></div>
              <div><dt className="text-ink-3">Para cancelar</dt><dd className="font-medium">{dinero(r.saldos.liquidacion)}</dd></div>
            </dl>
          </div>
        )}
      </section>

      {r && (
        <>
          {/* 2. Valor */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-[0.875rem] font-semibold"><Num n={2} />Valor a pagar</h3>
            <Segmentado<Modo>
              etiqueta="Tipo de pago"
              valor={modo}
              onCambio={setModo}
              opciones={[
                ...(tieneVencido ? [{ id: 'aldia' as Modo, label: 'Ponerse al día' }] : []),
                { id: 'cuotas', label: 'Por cuotas' },
                { id: 'libre', label: 'Valor libre' },
              ]}
            />
            <div className="mt-4">
              {modo === 'aldia' && <p className="text-[0.85rem] text-ink-2">Cubre las {plural(r.operacion.cuotasVencidas, 'cuota vencida', 'cuotas vencidas')} y el recargo: <span className="tabular font-semibold text-ink">{dinero(r.saldos.exigible)}</span></p>}
              {modo === 'cuotas' && (
                <Campo etiqueta="Número de cuotas" ayuda={r.saldos.mora ? `Incluye ${dinero(r.saldos.mora)} de recargo por mora.` : 'Desde la cuota pendiente más antigua.'}>
                  <Selector value={nCuotas} onChange={(e) => setNCuotas(Number(e.target.value))}>
                    {Array.from({ length: Math.min(12, r.pendientes) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{plural(n, 'cuota', 'cuotas')} · {dinero(r.valorCuotas(n) + r.saldos.mora)}</option>
                    ))}
                  </Selector>
                </Campo>
              )}
              {modo === 'libre' && (
                <Campo etiqueta="Monto recibido (USD)" ayuda="Si no alcanza para una cuota completa, queda como abono parcial." error={libre !== '' && !(monto > 0) ? 'Escribe un monto mayor que cero.' : undefined}>
                  <Entrada inputMode="decimal" value={libre} onChange={(e) => setLibre(e.target.value)} placeholder="0,00" aria-invalid={libre !== '' && !(monto > 0)} />
                </Campo>
              )}
            </div>
          </section>

          {/* 3. Medio */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-[0.875rem] font-semibold"><Num n={3} />Medio de pago</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Medio">
                <Selector value={medio} onChange={(e) => setMedio(e.target.value as MedioPago)}>{mediosPago.map((m) => <option key={m}>{m}</option>)}</Selector>
              </Campo>
              <Campo etiqueta="Referencia o n.º de papeleta" opcional ayuda="Si la dejas vacía se genera una.">
                <Entrada value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </Campo>
            </div>
          </section>
        </>
      )}
    </div>
  )

  const presimulacion = r && (
    <section aria-label="Presimulación" className="rounded-[14px] border border-line bg-panel-2/40">
      <div className="border-b border-line px-5 pt-4 pb-3">
        <h3 className="text-[0.95rem] font-semibold">Presimulación</h3>
        <p className="text-[0.78rem] text-ink-3">Así se aplicará el pago. Nada se registra hasta confirmar.</p>
      </div>
      {!sim ? <p className="px-5 py-8 text-center text-[0.85rem] text-ink-3">Define el valor a pagar para ver cómo se aplica.</p> : (
        <div className="space-y-4 p-5">
          <dl className="tabular grid grid-cols-3 gap-3 text-[0.85rem]">
            <div><dt className="text-[0.72rem] text-ink-3">Recargo por mora</dt><dd className="font-medium">{dinero(sim.mora)}</dd></div>
            <div><dt className="text-[0.72rem] text-ink-3">Interés</dt><dd className="font-medium">{dinero(sim.interes)}</dd></div>
            <div><dt className="text-[0.72rem] text-ink-3">Capital</dt><dd className="font-medium">{dinero(sim.capital)}</dd></div>
          </dl>
          {sim.detalle.length > 0 && (
            <Tabla etiqueta="Aplicación por cuota" className="max-h-[260px] rounded-[10px] border border-line bg-panel">
              <thead><tr><Th>Cuota</Th><Th derecha>Pendiente</Th><Th derecha>Interés</Th><Th derecha>Capital</Th><Th>Queda</Th></tr></thead>
              <tbody>
                {sim.detalle.map((f) => (
                  <tr key={f.n}>
                    <Td className="whitespace-nowrap">{f.n}<span className="block text-[0.72rem] text-ink-3">{fmtFecha(f.fecha)}{f.diasAtraso > 0 && <span className="text-bad"> · {f.diasAtraso} d</span>}</span></Td>
                    <Td derecha className="text-ink-3">{dinero(f.pendienteAntes)}</Td>
                    <Td derecha className="text-ink-2">{dinero(f.interes)}</Td>
                    <Td derecha className="text-ink-2">{dinero(f.capital)}</Td>
                    <Td>{f.queda === 'Cubierta' ? <Insignia tono="ok">Cubierta</Insignia> : <Insignia tono="rosa">Faltan {dinero(f.pendienteDespues)}</Insignia>}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
          <div className="grid gap-2 text-[0.85rem]">
            <p className="flex flex-wrap items-center gap-2"><span className="w-24 text-ink-3">Saldo</span><span className="tabular">{dinero(sim.antes.saldoCapital)}</span><ArrowRight size={14} className="text-ink-3" aria-label="pasa a" /><span className="tabular font-semibold">{dinero(sim.despues.saldoCapital)}</span></p>
            <p className="flex flex-wrap items-center gap-2"><span className="w-24 text-ink-3">Antigüedad</span><InsigniaTramo tramo={tramoDe(sim.antes.diasMora)} /><ArrowRight size={14} className="text-ink-3" aria-label="pasa a" /><InsigniaTramo tramo={tramoDe(sim.despues.diasMora)} /></p>
          </div>
          {sim.excedente > 0.004 && <p role="alert" className="text-[0.8rem] font-medium text-warn">El monto supera la deuda; solo se aplicarán {dinero(sim.aplicado)}. Para cancelar todo usa la precancelación en la operación.</p>}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <div><p className="text-[0.75rem] text-ink-3">Total a recibir</p><p className="display tabular text-[1.7rem] leading-none">{dinero(sim.aplicado)}</p></div>
            <Boton variante="primario" onClick={confirmar} disabled={enviando}>{enviando ? 'Registrando…' : 'Confirmar pago'}</Boton>
          </div>
        </div>
      )}
    </section>
  )

  if (compacto) return <div className="space-y-6">{formulario}{presimulacion}</div>
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {formulario}
      <div className="xl:sticky xl:top-24 xl:self-start">{presimulacion ?? <p className="rounded-[14px] border border-dashed border-line-strong px-5 py-10 text-center text-[0.85rem] text-ink-3">Elige la operación para ver la presimulación del pago.</p>}</div>
    </div>
  )
}

function Num({ n }: { n: number }) {
  return <span className="tabular grid h-5 w-5 place-items-center rounded-full bg-rose-soft text-[0.7rem] font-semibold text-rose-ink" aria-hidden="true">{n}</span>
}
