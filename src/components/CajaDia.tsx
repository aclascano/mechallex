import { Lock, Unlock } from 'lucide-react'
import { useState } from 'react'
import { fmtFechaLarga } from '../domain/fechas'
import { cx, dinero, entero, plural } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { abrirCaja, cerrarCaja, DENOMINACIONES, fechaCorte, obtenerCaja } from '../services/api'
import { Aviso, Boton, Campo, Entrada, EsqueletoPagina, Insignia, Panel, Tabla, Td, Th, Vacio } from './ui'

const HOY = fechaCorte()

/** Caja del día: lo recibido por medio, el efectivo que debería haber y el arqueo de cierre. */
export function CajaDia() {
  const { data: d } = useServicio(obtenerCaja)
  const [conteo, setConteo] = useState<Record<string, number>>({})
  const [obs, setObs] = useState('')
  const [fondo, setFondo] = useState('300')
  const [error, setError] = useState('')
  if (!d) return <EsqueletoPagina />
  const { caja } = d
  const contado = Object.entries(conteo).reduce((s, [den, n]) => s + Number(den) * (n || 0), 0)
  const diferencia = Math.round((contado - d.esperado) * 100) / 100

  async function cerrar() {
    setError('')
    try { await cerrarCaja(conteo, obs) } catch (e) { setError((e as Error).message) }
  }
  async function abrir() {
    setError('')
    try { await abrirCaja(Number(fondo)) } catch (e) { setError((e as Error).message) }
  }

  const estado = caja.estado === 'Abierta' ? <Insignia tono="ok"><Unlock size={12} />Abierta desde {caja.apertura}</Insignia>
    : caja.estado === 'Cuadrada' ? <Insignia tono="neutro"><Lock size={12} />Cerrada a las {caja.cierre?.hora}</Insignia>
    : <Insignia tono="warn"><Lock size={12} />Sin abrir</Insignia>
  const cifras: [string, string, string][] = [
    ['Recibido hoy', dinero(d.total), plural(d.pagos.length, 'pago', 'pagos')],
    ['Efectivo esperado en caja', dinero(d.esperado), `fondo ${dinero(caja.fondoInicial)} + ventanilla ${dinero(d.ingresosEfectivo)}${d.egresosEfectivo ? ` − desembolsos ${dinero(d.egresosEfectivo)}` : ''}`],
    ['Reversos del día', entero(d.reversos.length), d.reversos.length ? dinero(d.reversos.reduce((s, r) => s + r.pago.monto, 0)) : 'ninguno'],
  ]

  return (
    <div className="space-y-4">
      <section className="rounded-[14px] border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2 text-[0.85rem]"><span className="font-semibold">Caja de {caja.cajero}</span><span className="text-ink-3">· {fmtFechaLarga(HOY)}</span></div>
          {estado}
        </div>
        <div className="grid sm:grid-cols-3">
          {cifras.map(([k, v, n], i) => (
            <div key={k} className={cx('min-w-0 p-5', i > 0 && 'border-t border-line sm:border-t-0 sm:border-l')}>
              <p className="text-[0.75rem] text-ink-3">{k}</p>
              <p className="display tabular mt-1 text-[1.7rem] leading-tight">{v}</p>
              <p className="mt-1 text-[0.75rem] text-ink-3">{n}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4">
          <Panel titulo="Recaudado por medio" cuerpo="">
            <ul className="divide-y divide-line">
              {d.porMedio.map((m) => (
                <li key={m.medio} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 text-[0.85rem]">
                  <span className="text-ink-2">{m.medio}{m.medio === 'Ventanilla' && <span className="text-ink-3"> · efectivo</span>}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><span className="block h-full rounded-full bg-rose" style={{ width: `${d.total ? (m.monto / d.total) * 100 : 0}%` }} /></span>
                  <span className="tabular text-right"><span className="font-medium">{dinero(m.monto)}</span><span className="ml-2 text-ink-3">{m.n}</span></span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel titulo="Movimientos del día" cuerpo="">
            {d.pagos.length === 0 && d.reversos.length === 0 && d.desembolsosEfectivo.length === 0 ? <Vacio titulo="Sin movimientos todavía" /> : (
              <Tabla etiqueta="Movimientos del día" className="max-h-[420px]">
                <thead><tr><Th>Comprobante</Th><Th>Cliente</Th><Th>Medio</Th><Th derecha>Monto</Th></tr></thead>
                <tbody>
                  {d.pagos.map((p) => (
                    <tr key={p.id}><Td className="tabular">{p.id}<span className="block text-[0.72rem] text-ink-3">{p.tipo}</span></Td><Td>{p.cliente.nombre}<span className="block text-[0.72rem] text-ink-3">{p.operacionId}</span></Td><Td className="text-ink-2">{p.medio}</Td><Td derecha className="font-medium">{dinero(p.monto)}</Td></tr>
                  ))}
                  {d.desembolsosEfectivo.map((x) => (
                    <tr key={x.id}><Td className="tabular">{x.id}<span className="block text-[0.72rem] text-ink-3">Desembolso</span></Td><Td>{x.cliente}</Td><Td className="text-ink-2">Efectivo</Td><Td derecha className="font-medium text-bad">−{dinero(x.neto)}</Td></tr>
                  ))}
                  {d.reversos.map((r) => (
                    <tr key={r.pago.id} className="text-ink-3"><Td className="tabular line-through">{r.pago.id}<span className="block text-[0.72rem] no-underline">Reversado {r.hora}</span></Td><Td>{r.cliente.nombre}<span className="block text-[0.72rem]">{r.motivo}</span></Td><Td>{r.pago.medio}</Td><Td derecha className="line-through">{dinero(r.pago.monto)}</Td></tr>
                  ))}
                </tbody>
              </Tabla>
            )}
          </Panel>
        </div>

        <Panel titulo={caja.estado === 'Cerrada' ? 'Apertura de caja' : 'Arqueo y cierre'} detalle={caja.estado === 'Abierta' ? 'Cuenta el efectivo por denominación.' : undefined} className="self-start">
          {caja.estado === 'Cerrada' && (
            <div className="space-y-4">
              <Campo etiqueta="Fondo inicial (USD)" ayuda="Efectivo con el que empieza el día."><Entrada inputMode="decimal" value={fondo} onChange={(e) => setFondo(e.target.value)} /></Campo>
              {error && <p role="alert" className="text-[0.8rem] font-medium text-bad">{error}</p>}
              <Boton variante="primario" onClick={abrir} icono={<Unlock size={15} />}>Abrir caja</Boton>
            </div>
          )}
          {caja.estado === 'Abierta' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {DENOMINACIONES.map((den) => (
                  <label key={den} className="flex items-center gap-2 text-[0.82rem]">
                    <span className="tabular w-14 shrink-0 text-right text-ink-2">${Number(den) >= 1 ? Number(den) : den.replace('.', ',')}</span>
                    <span className="text-ink-3" aria-hidden="true">×</span>
                    <Entrada type="number" min={0} step={1} inputMode="numeric" value={conteo[den] || ''} placeholder="0" aria-label={`Cantidad de ${den}`} className="h-8 px-2 text-right"
                      onChange={(e) => setConteo((c) => ({ ...c, [den]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} />
                  </label>
                ))}
              </div>
              <dl className="tabular space-y-1.5 border-t border-line pt-3 text-[0.875rem]">
                <div className="flex justify-between"><dt className="text-ink-2">Contado</dt><dd className="font-semibold">{dinero(contado)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-2">Esperado</dt><dd>{dinero(d.esperado)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-2">Diferencia</dt><dd className={cx('font-semibold', diferencia === 0 ? 'text-ok' : 'text-bad')}>{diferencia === 0 ? 'Cuadra' : `${diferencia > 0 ? 'Sobrante' : 'Faltante'} ${dinero(Math.abs(diferencia))}`}</dd></div>
              </dl>
              <Campo etiqueta="Observación" opcional={diferencia === 0} ayuda={diferencia !== 0 ? 'Obligatoria si hay diferencia.' : undefined}>
                <Entrada value={obs} onChange={(e) => setObs(e.target.value)} />
              </Campo>
              {error && <p role="alert" className="text-[0.8rem] font-medium text-bad">{error}</p>}
              <Boton variante="primario" onClick={cerrar} icono={<Lock size={15} />}>Cerrar caja</Boton>
              <p className="text-[0.75rem] text-ink-3">Después del cierre no se recibe efectivo ni se reversan pagos en ventanilla por hoy.</p>
            </div>
          )}
          {caja.estado === 'Cuadrada' && caja.cierre && (
            <div className="space-y-3">
              <Aviso tono={caja.cierre.diferencia === 0 ? 'ok' : 'rosa'}>{caja.cierre.diferencia === 0 ? 'Caja cuadrada sin diferencias.' : `Cerrada con ${caja.cierre.diferencia > 0 ? 'sobrante' : 'faltante'} de ${dinero(Math.abs(caja.cierre.diferencia))}.`}</Aviso>
              <dl className="tabular space-y-1.5 text-[0.875rem]">
                <div className="flex justify-between"><dt className="text-ink-2">Contado</dt><dd className="font-semibold">{dinero(caja.cierre.contado)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-2">Esperado</dt><dd>{dinero(caja.cierre.esperado)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-2">Hora de cierre</dt><dd>{caja.cierre.hora}</dd></div>
              </dl>
              {caja.cierre.observacion && <p className="text-[0.82rem] text-ink-2">“{caja.cierre.observacion}”</p>}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
