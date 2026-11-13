import type { ReactNode } from 'react'

interface ItemTooltip {
  name?: string | number
  value?: unknown
  color?: string
  dataKey?: unknown
  payload?: unknown
}

/** Tooltip de gráficos con la tipografía y los colores del sistema. */
export function TooltipMx({ active, payload, label, formato, titulo }: {
  active?: boolean
  payload?: readonly ItemTooltip[]
  label?: ReactNode
  formato: (v: number, item: ItemTooltip) => string
  titulo?: (label: ReactNode, payload: readonly ItemTooltip[]) => ReactNode
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="tabular min-w-40 rounded-[10px] border border-line bg-panel px-3 py-2.5 text-[0.8rem] shadow-panel">
      <p className="mb-1.5 font-medium text-ink">{titulo ? titulo(label, payload) : label}</p>
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              {p.name}
            </span>
            <span className="font-medium text-ink">{formato(Number(p.value), p)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const ejeProps = {
  tick: { fill: 'var(--ink-3)', fontSize: 11.5, fontFamily: 'var(--font-sans)' },
  axisLine: false,
  tickLine: false,
} as const

export const rejillaProps = { stroke: 'var(--line)', strokeDasharray: '0', vertical: false } as const

/** Leyenda HTML (más legible y accesible que la de la librería). */
export function Leyenda({ items }: { items: { color: string; label: string; forma?: 'punto' | 'linea' }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem] text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={i.forma === 'linea' ? 'h-0.5 w-3.5 rounded-full' : 'h-2 w-2 rounded-[3px]'} style={{ background: i.color }} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
