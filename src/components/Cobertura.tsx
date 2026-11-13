import { cx, dinero, porcentaje } from '../lib/formato'

/** Cobertura de las garantías reales sobre el saldo, con marca del mínimo que exige el producto. */
export function BarraCobertura({ cobertura, minima, valor, cancelada = false, base = 'el saldo' }: { cobertura: number; minima: number; valor: number; cancelada?: boolean; base?: string }) {
  if (cancelada) return <p className="text-ink-3">Garantías liberadas al cancelar la operación.</p>
  const escala = Math.max(2, minima * 1.3, cobertura)
  const cumple = minima === 0 || cobertura >= minima
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-ink-2">Cobertura sobre {base}</span>
        <span className={cx('tabular font-semibold', cumple ? 'text-ink' : 'text-bad')}>{porcentaje(cobertura)}</span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-line" aria-hidden="true">
        <div className={cx('h-full rounded-full', cumple ? 'bg-rose' : 'bg-bad')} style={{ width: `${Math.min(1, cobertura / escala) * 100}%` }} />
        {minima > 0 && <span className="absolute -top-1 h-4 w-px bg-ink" style={{ left: `${(minima / escala) * 100}%` }} />}
      </div>
      <p className="mt-1.5 text-[0.75rem] text-ink-3">{dinero(valor)} en garantías reales{minima > 0 ? ` · mínimo del producto ${porcentaje(minima)}` : ''}</p>
    </div>
  )
}
