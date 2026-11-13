import { AlertTriangle, CheckCircle2, OctagonX } from 'lucide-react'
import type { ResultadoRiesgo } from '../domain/riesgo'
import { SCORE_BASE } from '../domain/riesgo'
import { cx, porcentaje } from '../lib/formato'

const MIN = 300
const MAX = 850
const TRAMOS = [
  { desde: 300, hasta: 600, color: 'var(--bad)', opacidad: 0.85 },
  { desde: 600, hasta: 670, color: 'var(--warn)', opacidad: 0.85 },
  { desde: 670, hasta: 740, color: 'var(--rose)', opacidad: 0.5 },
  { desde: 740, hasta: 850, color: 'var(--rose)', opacidad: 1 },
]

// Semicírculo de 180°: 300 a la izquierda, 850 a la derecha.
const angulo = (score: number) => Math.PI * (1 - (score - MIN) / (MAX - MIN))
const punto = (score: number, r: number) => [100 + r * Math.cos(angulo(score)), 100 - r * Math.sin(angulo(score))]
const arco = (a: number, b: number, r: number) => {
  const [x1, y1] = punto(a, r)
  const [x2, y2] = punto(b, r)
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
}

export function Aguja({ score }: { score: number }) {
  const [x, y] = punto(score, 62)
  return (
    <svg viewBox="-16 -14 232 128" className="w-full max-w-[260px]" role="img" aria-label={`Score ${score} de 850`}>
      {TRAMOS.map((t) => <path key={t.desde} d={arco(t.desde + 1.5, t.hasta - 1.5, 82)} fill="none" stroke={t.color} strokeOpacity={t.opacidad} strokeWidth={14} strokeLinecap="butt" />)}
      {[300, 600, 670, 740, 850].map((v) => {
        const [tx, ty] = punto(v, 100)
        return <text key={v} x={tx} y={ty + 3} textAnchor="middle" className="tabular" fontSize="8" fill="var(--ink-3)">{v}</text>
      })}
      <line x1={100} y1={100} x2={x} y2={y} stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" style={{ transition: 'all 400ms var(--ease-out-expo)' }} />
      <circle cx={100} cy={100} r={5} fill="var(--ink)" />
    </svg>
  )
}

const TONO = {
  ok: { icono: CheckCircle2, clase: 'text-ok bg-ok-soft' },
  aviso: { icono: AlertTriangle, clase: 'text-warn bg-warn-soft' },
  bloqueo: { icono: OctagonX, clase: 'text-bad bg-bad-soft' },
}

/** Medidor del score con probabilidad de no pago y los factores que lo explican. */
export function MedidorRiesgo({ r, titulo = 'Riesgo del deudor', compacto }: { r: ResultadoRiesgo; titulo?: string; compacto?: boolean }) {
  const D = TONO[r.decision.tono]
  const max = Math.max(20, ...r.factores.map((f) => Math.abs(f.puntos)))
  const factores = compacto ? r.factores.slice(0, 6) : r.factores
  return (
    <section aria-label={titulo} className="rounded-[14px] border border-line bg-panel">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-5 pt-4 pb-3.5">
        <div>
          <h2 className="text-[0.95rem] font-semibold">{titulo}</h2>
          <p className="mt-0.5 text-[0.8rem] text-ink-3">Modelo de {r.modelo.toLowerCase()} · pesos expertos de demostración</p>
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="flex flex-col items-center border-b border-line p-5 md:border-r md:border-b-0">
          <Aguja score={r.score} />
          <p className="display tabular -mt-2 text-[2.6rem] leading-none">{r.score}</p>
          <p className={cx('mt-1 text-[0.9rem] font-semibold', r.banda === 'Alto riesgo' ? 'text-bad' : r.banda === 'Regular' ? 'text-warn' : 'text-rose-ink')}>{r.banda}</p>
          <dl className="mt-4 w-full border-t border-line pt-3 text-center">
            <dt className="text-[0.75rem] text-ink-3">Probabilidad de no pago a 12 meses</dt>
            <dd className="display tabular mt-0.5 text-[1.5rem] leading-tight">{porcentaje(r.pd)}</dd>
          </dl>
          <p className={cx('mt-4 flex w-full items-start gap-2 rounded-[10px] px-3 py-2 text-[0.8rem] font-medium', D.clase)}><D.icono size={16} className="mt-px shrink-0" />{r.decision.texto}</p>
        </div>
        <div className="min-w-0 p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-[0.85rem] font-semibold">Por qué este puntaje</h3>
            <span className="tabular text-[0.75rem] text-ink-3">base {SCORE_BASE}</span>
          </div>
          <ul className="space-y-2">
            {factores.map((f) => {
              const ancho = (Math.abs(f.puntos) / max) * 50
              return (
                <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_3.2rem] items-center gap-3 text-[0.8rem]">
                  <span className="min-w-0"><span className="block truncate text-ink-2">{f.nombre}</span><span className="block truncate text-[0.72rem] text-ink-3">{f.valor}</span></span>
                  <span className="relative h-2.5" aria-hidden="true">
                    <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line-strong" />
                    <span className={cx('absolute inset-y-0 rounded-[3px]', f.puntos >= 0 ? 'left-1/2 bg-rose' : 'right-1/2 bg-bad')} style={{ width: `${ancho}%` }} />
                  </span>
                  <span className={cx('tabular text-right font-semibold', f.puntos >= 0 ? 'text-rose-ink' : 'text-bad')}>{f.puntos > 0 ? '+' : ''}{f.puntos}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-[0.72rem] text-ink-3">A la derecha, lo que mejora el puntaje; a la izquierda, lo que lo baja. Los pesos son reglas de demostración, no un modelo entrenado ni validado.</p>
        </div>
      </div>
    </section>
  )
}
