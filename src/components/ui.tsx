import { Check } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from 'react'
import { ETAPAS, TRAMOS } from '../domain/cartera'
import type { EtapaCobranza, Tramo } from '../domain/tipos'
import { cx } from '../lib/formato'

// ── Estructura de página ────────────────────────────────────────────────────
export function Encabezado({ titulo, descripcion, acciones }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="display text-[2rem] leading-[1.1] font-medium text-ink sm:text-[2.35rem]">{titulo}</h1>
        {descripcion && <p className="mt-1.5 max-w-[68ch] text-[0.9rem] text-ink-2">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  )
}

export function Panel({ titulo, detalle, acciones, children, className, cuerpo = 'p-5', id }: {
  titulo?: ReactNode; detalle?: ReactNode; acciones?: ReactNode; children: ReactNode; className?: string; cuerpo?: string; id?: string
}) {
  return (
    <section id={id} className={cx('min-w-0 rounded-[14px] border border-line bg-panel', className)} aria-labelledby={id ? `${id}-t` : undefined}>
      {(titulo || acciones) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 pt-4 pb-3.5">
          <div className="min-w-0">
            {titulo && <h2 id={id ? `${id}-t` : undefined} className="text-[0.95rem] font-semibold text-ink">{titulo}</h2>}
            {detalle && <p className="mt-0.5 text-[0.8rem] text-ink-3">{detalle}</p>}
          </div>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </div>
      )}
      <div className={cuerpo}>{children}</div>
    </section>
  )
}

export function Microimpresion({ texto = 'MECHALLEX · CARTERA · COBRANZA · ', className }: { texto?: string; className?: string }) {
  return (
    <div aria-hidden="true" className={cx('microprint', className)}>
      {texto.repeat(40)}
    </div>
  )
}

// ── Controles ───────────────────────────────────────────────────────────────
type Variante = 'primario' | 'secundario' | 'fantasma'
export function Boton({ variante = 'secundario', className, children, icono, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; icono?: ReactNode }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex h-9 items-center justify-center gap-2 rounded-[9px] px-3.5 text-[0.85rem] font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50',
        variante === 'primario' && 'bg-rail text-rail-ink shadow-[0_1px_0_oklch(1_0_0/0.08)_inset] hover:bg-rail-2 active:translate-y-px dark:bg-rose dark:text-[oklch(0.15_0.01_290)] dark:hover:bg-rose-ink',
        variante === 'secundario' && 'border border-line-strong bg-panel text-ink hover:border-ink-3 hover:bg-panel-2',
        variante === 'fantasma' && 'text-ink-2 hover:bg-panel-2 hover:text-ink',
        className,
      )}
    >
      {icono}
      {children}
    </button>
  )
}

export function Campo({ etiqueta, ayuda, children, className }: { etiqueta: string; ayuda?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="text-[0.8rem] font-medium text-ink-2">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-[0.75rem] text-ink-3">{ayuda}</span>}
    </label>
  )
}

const control = 'h-9 w-full rounded-[9px] border border-line-strong bg-panel px-3 text-[0.875rem] text-ink placeholder:text-ink-3 transition-colors duration-150 hover:border-ink-3 focus-visible:border-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/30'

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(control, 'tabular', props.className)} />
}

export function Selector({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(control, 'appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8', props.className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' fill='none' stroke='%23888' stroke-width='1.4'/%3E%3C/svg%3E\")" }}>
      {children}
    </select>
  )
}

export function Segmentado<T extends string>({ opciones, valor, onCambio, etiqueta }: { opciones: { id: T; label: string }[]; valor: T; onCambio: (v: T) => void; etiqueta: string }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex rounded-[10px] border border-line-strong bg-panel p-0.5">
      {opciones.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={valor === o.id}
          onClick={() => onCambio(o.id)}
          className={cx(
            'h-8 rounded-[8px] px-3 text-[0.8rem] font-medium transition-colors duration-150',
            valor === o.id ? 'bg-rose-soft text-rose-ink' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Pestanas<T extends string>({ opciones, valor, onCambio }: { opciones: { id: T; label: string; cuenta?: number }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <div role="tablist" className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1">
      {opciones.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={valor === o.id}
          onClick={() => onCambio(o.id)}
          className={cx(
            '-mb-px flex h-10 items-center gap-2 border-b-2 px-3 text-[0.875rem] font-medium whitespace-nowrap transition-colors duration-150',
            valor === o.id ? 'border-rose text-ink' : 'border-transparent text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
          {o.cuenta !== undefined && <span className="tabular rounded-full bg-panel-2 px-1.5 text-[0.72rem] text-ink-2">{o.cuenta}</span>}
        </button>
      ))}
    </div>
  )
}

export function Interruptor({ activo, onCambio, etiqueta }: { activo: boolean; onCambio: () => void; etiqueta: string }) {
  return (
    <button
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={onCambio}
      className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200', activo ? 'bg-ok' : 'bg-line-strong')}
    >
      <span className={cx('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-panel shadow transition-transform duration-200 ease-out', activo && 'translate-x-4')} />
    </button>
  )
}

// ── Insignias de estado ─────────────────────────────────────────────────────
const TONOS = {
  neutro: 'bg-panel-2 text-ink-2',
  rosa: 'bg-rose-soft text-rose-ink',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  acero: 'bg-steel-soft text-steel',
}
export type Tono = keyof typeof TONOS

export function Insignia({ tono = 'neutro', children, className }: { tono?: Tono; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[0.75rem] font-medium whitespace-nowrap', TONOS[tono], className)}>{children}</span>
}

export const COLOR_TRAMO: Record<Tramo, string> = {
  'al-dia': 'var(--t0)', '1-30': 'var(--t1)', '31-60': 'var(--t2)', '61-90': 'var(--t3)', '91-180': 'var(--t4)', '180+': 'var(--t5)',
}

export function InsigniaTramo({ tramo }: { tramo: Tramo }) {
  const t = TRAMOS.find((x) => x.id === tramo)!
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.8rem] whitespace-nowrap text-ink-2">
      <span className="h-2 w-2 rounded-full" style={{ background: COLOR_TRAMO[tramo] }} aria-hidden="true" />
      {t.corto === 'Al día' ? 'Al día' : `${t.corto} días`}
    </span>
  )
}

/** Recorrido de cobranza: preventiva → administrativa → extrajudicial → judicial. */
export function RecorridoCobranza({ etapa, compacto }: { etapa: EtapaCobranza; compacto?: boolean }) {
  const idx = ETAPAS.findIndex((e) => e.id === etapa)
  return (
    <div className="flex items-center gap-2" aria-label={`Etapa de cobranza: ${ETAPAS[idx].label}`}>
      <div className="flex items-center gap-[3px]" aria-hidden="true">
        {ETAPAS.map((e, i) => (
          <span
            key={e.id}
            className={cx('h-1.5 rounded-full transition-colors', compacto ? 'w-3' : 'w-5', i < idx ? 'bg-rose/45' : i === idx ? (idx === 3 ? 'bg-bad' : 'bg-rose') : 'bg-line')}
          />
        ))}
      </div>
      <span className={cx('text-[0.78rem] whitespace-nowrap', idx === 3 ? 'font-medium text-bad' : 'text-ink-2')}>{ETAPAS[idx].label}</span>
    </div>
  )
}

// ── Carga y vacíos ──────────────────────────────────────────────────────────
export function Esqueleto({ className }: { className?: string }) {
  return <div className={cx('rounded-md bg-panel-2', className)} style={{ animation: 'brillo 1.4s ease-in-out infinite' }} />
}

export function EsqueletoPagina() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-4">
      <Esqueleto className="h-10 w-72" />
      <Esqueleto className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 pt-4 lg:grid-cols-3">
        <Esqueleto className="h-40 lg:col-span-2" />
        <Esqueleto className="h-40" />
      </div>
      <Esqueleto className="h-72" />
    </div>
  )
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
      <p className="font-medium text-ink">{titulo}</p>
      {children && <p className="max-w-[46ch] text-[0.85rem] text-ink-3">{children}</p>}
    </div>
  )
}

export function Aviso({ children, tono = 'ok' }: { children: ReactNode; tono?: 'ok' | 'rosa' }) {
  return (
    <div role="status" className={cx('flex items-center gap-2 rounded-[10px] px-3 py-2 text-[0.85rem]', tono === 'ok' ? 'bg-ok-soft text-ok' : 'bg-rose-soft text-rose-ink')} style={{ animation: 'aparecer 240ms var(--ease-out-expo) both' }}>
      <Check size={16} aria-hidden="true" />
      {children}
    </div>
  )
}

// ── Tablas ──────────────────────────────────────────────────────────────────
export function Tabla({ children, className, etiqueta }: { children: ReactNode; className?: string; etiqueta?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)} role="region" aria-label={etiqueta} tabIndex={0}>
      <table className="tabular w-full border-collapse text-left text-[0.85rem]">{children}</table>
    </div>
  )
}

export function Th({ children, derecha, className }: { children?: ReactNode; derecha?: boolean; className?: string }) {
  return <th scope="col" className={cx('sticky top-0 z-[1] border-b border-line bg-panel px-4 py-2.5 text-[0.75rem] font-medium whitespace-nowrap text-ink-3', derecha && 'text-right', className)}>{children}</th>
}

export function Td({ children, derecha, className }: { children?: ReactNode; derecha?: boolean; className?: string }) {
  return <td className={cx('border-b border-line px-4 py-2.5 align-middle', derecha && 'text-right whitespace-nowrap', className)}>{children}</td>
}

/** Fila de cifra: etiqueta y valor, en listas de detalle. */
export function Dato({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      <dt className="text-[0.75rem] text-ink-3">{etiqueta}</dt>
      <dd className="tabular mt-0.5 truncate font-medium text-ink">{children}</dd>
    </div>
  )
}
