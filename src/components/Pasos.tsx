import { Check } from 'lucide-react'
import { cx } from '../lib/formato'

/** Indicador de pasos de un formulario largo: barra de avance en móvil, lista vertical en escritorio. */
export function Pasos({ pasos, actual, hecho, conError, puedeIrA, onIr }: {
  pasos: readonly { id: string; titulo: string; detalle: string }[]
  actual: number
  hecho: (i: number) => boolean
  conError: (i: number) => boolean
  puedeIrA: (i: number) => boolean
  onIr: (i: number) => void
}) {
  return (
    <>
      <div className="mb-3 lg:hidden">
        <div className="flex items-baseline justify-between text-[0.8rem]">
          <span className="font-medium text-ink">Paso {actual + 1} de {pasos.length}</span>
          <span className="text-ink-3">{pasos[actual].titulo}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-rose transition-[width] duration-300 ease-out" style={{ width: `${((actual + 1) / pasos.length) * 100}%` }} />
        </div>
      </div>
      <ol className="hidden lg:block" aria-label="Pasos">
        {pasos.map((p, i) => {
          const listo = i < actual && hecho(i)
          const activo = i === actual
          const error = conError(i)
          const habilitado = puedeIrA(i)
          return (
            <li key={p.id} className="relative pb-1">
              {i < pasos.length - 1 && <span aria-hidden="true" className={cx('absolute top-9 bottom-0 left-[17px] w-px', listo ? 'bg-rose/50' : 'bg-line')} />}
              <button
                onClick={() => habilitado && onIr(i)}
                disabled={!habilitado}
                aria-current={activo ? 'step' : undefined}
                className={cx('group flex w-full items-start gap-3 rounded-[10px] px-1.5 py-1.5 text-left transition-colors', activo ? 'bg-panel' : 'hover:bg-panel/60', !habilitado && 'cursor-not-allowed opacity-50')}
              >
                <span className={cx(
                  'tabular relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[0.72rem] font-semibold',
                  activo ? 'border-rose bg-rose text-white dark:text-[oklch(0.15_0.01_290)]' : listo ? 'border-rose/50 bg-rose-soft text-rose-ink' : error ? 'border-bad text-bad' : 'border-line-strong bg-paper text-ink-3',
                )}>
                  {listo && !activo ? <Check size={13} strokeWidth={2.6} /> : i + 1}
                </span>
                <span className="min-w-0 pt-px">
                  <span className={cx('block text-[0.85rem] font-medium', activo ? 'text-ink' : 'text-ink-2')}>{p.titulo}</span>
                  <span className={cx('block text-[0.75rem]', error ? 'text-bad' : 'text-ink-3')}>{error ? 'Faltan datos' : p.detalle}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}
