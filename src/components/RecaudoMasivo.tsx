import { FileUp, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { cx, dinero, plural } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { aplicarLote, archivoEjemplo, COLUMNAS_LOTE, listarLotes, validarLote } from '../services/api'
import { Aviso, Boton, Insignia, Panel, Tabla, Td, Th, Vacio } from './ui'

/** Recaudo masivo: carga de un archivo de pagos recibidos por bancos o corresponsales. */
export function RecaudoMasivo() {
  const [texto, setTexto] = useState('')
  const [archivo, setArchivo] = useState('')
  const [aplicando, setAplicando] = useState(false)
  const [resultado, setResultado] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const { data: lotes } = useServicio(listarLotes)
  const validacion = useMemo(() => (texto ? validarLote(texto) : null), [texto])
  const aplicables = validacion?.filas.filter((f) => f.aplicable) ?? []
  const total = aplicables.reduce((s, f) => s + f.monto, 0)

  function leer(f: File) {
    setResultado('')
    setArchivo(f.name)
    f.text().then(setTexto)
  }
  async function aplicar() {
    setAplicando(true)
    const lote = await aplicarLote(texto, archivo)
    setAplicando(false)
    setResultado(`Lote ${lote.id}: ${plural(lote.aplicados, 'pago aplicado', 'pagos aplicados')} por ${dinero(lote.monto)}; ${plural(lote.rechazados, 'línea rechazada', 'líneas rechazadas')}.`)
    setTexto('')
    setArchivo('')
  }

  return (
    <div className="space-y-4">
      <Panel titulo="Cargar archivo" detalle="Pagos que llegan de bancos y corresponsales. Se validan línea por línea antes de aplicar.">
        <div className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept=".csv,.txt" className="sr-only" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} />
          <Boton onClick={() => input.current?.click()} icono={<FileUp size={15} />}>Elegir archivo CSV</Boton>
          <Boton variante="fantasma" onClick={() => { setResultado(''); setArchivo('recaudo-ejemplo.csv'); setTexto(archivoEjemplo()) }}>Usar archivo de ejemplo</Boton>
          {archivo && <span className="text-[0.82rem] text-ink-2">{archivo}</span>}
        </div>
        <p className="mt-3 text-[0.78rem] text-ink-3">Formato: una línea de encabezado <code className="rounded bg-panel-2 px-1.5 py-0.5 text-ink-2">{COLUMNAS_LOTE}</code> y luego un pago por línea, separado por punto y coma. Los pagos se aplican con fecha de proceso de hoy y medio “Corresponsal”.</p>
        {resultado && <div className="mt-4"><Aviso>{resultado}</Aviso></div>}
      </Panel>

      {validacion && (
        <Panel
          titulo="Validación"
          detalle={validacion.error ?? `${plural(validacion.filas.length, 'línea', 'líneas')}: ${aplicables.length} listas, ${validacion.filas.length - aplicables.length} rechazadas`}
          acciones={!validacion.error && aplicables.length > 0 && <Boton variante="primario" onClick={aplicar} disabled={aplicando} icono={<Upload size={15} />}>{aplicando ? 'Aplicando…' : `Aplicar ${aplicables.length} por ${dinero(total)}`}</Boton>}
          cuerpo=""
        >
          {validacion.error ? <p role="alert" className="px-5 py-4 text-[0.85rem] font-medium text-bad">{validacion.error}</p> : (
            <Tabla etiqueta="Validación del archivo" className="max-h-[56vh]">
              <thead><tr><Th>Línea</Th><Th>Referencia</Th><Th>Cliente</Th><Th>Operación</Th><Th derecha>Monto</Th><Th>Resultado</Th></tr></thead>
              <tbody>
                {validacion.filas.map((f) => (
                  <tr key={f.linea} className={cx(!f.aplicable && 'bg-bad-soft/25')}>
                    <Td className="tabular text-ink-3">{f.linea}</Td>
                    <Td className="tabular">{f.referencia}</Td>
                    <Td>{f.cliente ?? <span className="text-ink-3">—</span>}<span className="tabular block text-[0.72rem] text-ink-3">{f.identificacion}</span></Td>
                    <Td className="tabular whitespace-nowrap">{f.aplicable ? <Link to={`/operaciones/${f.operacion}`} className="hover:text-rose-ink">{f.operacion}</Link> : f.operacion}</Td>
                    <Td derecha className="font-medium">{Number.isFinite(f.monto) ? dinero(f.monto) : '—'}</Td>
                    <Td><span className="flex flex-wrap items-center gap-2"><Insignia tono={f.aplicable ? 'ok' : 'bad'}>{f.aplicable ? 'Aplicable' : 'Rechazada'}</Insignia><span className="text-[0.78rem] text-ink-3">{f.motivo}</span></span></Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Panel>
      )}

      <Panel titulo="Lotes aplicados hoy" cuerpo="">
        {!lotes || lotes.length === 0 ? <Vacio titulo="Todavía no se aplicó ningún lote" /> : (
          <ul className="divide-y divide-line">
            {lotes.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                <span><span className="font-medium">{l.id}</span> <span className="text-ink-3">· {l.archivo} · {l.hora}</span></span>
                <span className="tabular">{plural(l.aplicados, 'pago', 'pagos')} · <span className="font-semibold">{dinero(l.monto)}</span>{l.rechazados > 0 && <span className="text-ink-3"> · {l.rechazados} rechazadas</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
