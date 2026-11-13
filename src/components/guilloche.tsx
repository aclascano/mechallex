import { useMemo, useState } from 'react'
import { cx } from '../lib/formato'

/** Curva guilloché: radio base + dos senoides. Devuelve un path SVG cerrado. */
function curva(cx0: number, cy0: number, R: number, a: number, k: number, fase: number, b = 0, m = 0, pasos = 480) {
  let d = ''
  for (let i = 0; i <= pasos; i++) {
    const t = (i / pasos) * Math.PI * 2
    const r = R + a * Math.sin(k * t + fase) + b * Math.sin(m * t - fase * 0.5)
    const x = cx0 + r * Math.cos(t)
    const y = cy0 + r * Math.sin(t)
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d + 'Z'
}

export interface Anillo {
  id: string
  etiqueta: string
  valor: number
  color: string
}

/**
 * Roseta de cartera: cada anillo es un tramo de antigüedad; su ondulación crece con la participación del tramo.
 * Se dibuja una vez al cargar, como el trazo de un torno guilloché.
 */
export function RosetaCartera({ anillos, activo, onActivo, children }: { anillos: Anillo[]; activo: string | null; onActivo: (id: string | null) => void; children?: React.ReactNode }) {
  const total = anillos.reduce((s, a) => s + a.valor, 0) || 1
  const paths = useMemo(
    () =>
      anillos.map((an, i) => {
        const share = an.valor / total
        const R = 70 + i * 14
        const amp = 1.4 + Math.sqrt(share) * 9
        const k = 14 + i * 2
        return [0, 1, 2].map((s) => curva(160, 160, R, amp, k, (s * Math.PI * 2) / (3 * k) * 1.5, amp * 0.25, k / 2))
      }),
    [anillos, total],
  )

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox="0 0 320 320" className="h-full w-full overflow-visible" role="img" aria-label={`Cartera por antigüedad: ${anillos.map((a) => `${a.etiqueta} ${Math.round((a.valor / total) * 100)}%`).join(', ')}`}>
        {/* Roseta interior decorativa, en tinta muy tenue */}
        <g aria-hidden="true" opacity="0.5">
          {[0, 1, 2, 3].map((s) => (
            <path key={s} d={curva(160, 160, 40, 9, 9, s * 0.35, 3, 18)} fill="none" stroke="var(--rose)" strokeWidth="0.45" pathLength={1} strokeDasharray="1" style={{ animation: `trazo 1.6s var(--ease-out-expo) ${s * 0.06}s both` }} />
          ))}
        </g>
        {paths.map((grupo, i) => {
          const an = anillos[i]
          const atenuado = activo !== null && activo !== an.id
          return (
            <g
              key={an.id}
              onMouseEnter={() => onActivo(an.id)}
              onMouseLeave={() => onActivo(null)}
              style={{ opacity: atenuado ? 0.18 : 1, transition: 'opacity 200ms ease-out' }}
            >
              {grupo.map((d, s) => (
                <path
                  key={s}
                  d={d}
                  fill="none"
                  stroke={an.color}
                  strokeWidth={activo === an.id ? 1.3 : 0.85}
                  pathLength={1}
                  strokeDasharray="1"
                  style={{ animation: `trazo 1.8s var(--ease-out-expo) ${0.15 + i * 0.09 + s * 0.04}s both`, transition: 'stroke-width 200ms ease-out' }}
                />
              ))}
              {/* zona de captura invisible para el puntero */}
              <circle cx="160" cy="160" r={70 + i * 14} fill="none" stroke="transparent" strokeWidth="14" />
            </g>
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

/** Marca de Mechallex: roseta mínima. */
export function Marca({ className }: { className?: string }) {
  const d = useMemo(() => [0, 1, 2].map((s) => curva(16, 16, 9.5, 2.6, 6, s * 0.7, 0.8, 12, 240)), [])
  return (
    <svg viewBox="0 0 32 32" className={cx('shrink-0', className)} aria-hidden="true">
      {d.map((p, i) => (
        <path key={i} d={p} fill="none" stroke="currentColor" strokeWidth="0.9" />
      ))}
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  )
}

/** Banda de ondas entrelazadas, como el borde de un billete. */
export function BandaGuilloche({ className, alto = 36, lineas = 7 }: { className?: string; alto?: number; lineas?: number }) {
  const ancho = 600
  const ds = useMemo(() => {
    const out: string[] = []
    for (let l = 0; l < lineas; l++) {
      let d = ''
      for (let x = 0; x <= ancho; x += 3) {
        const t = x / ancho
        const y = alto / 2 + Math.sin(t * Math.PI * 14 + l * 0.55) * (alto * 0.32) + Math.sin(t * Math.PI * 5 - l * 0.4) * (alto * 0.1)
        d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(2)}`
      }
      out.push(d)
    }
    return out
  }, [alto, lineas])
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      {ds.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

/** Hook mínimo para sincronizar la roseta y su leyenda. */
export function useAnilloActivo() {
  return useState<string | null>(null)
}
