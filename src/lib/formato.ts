const usd = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usd0 = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('es-EC')
const pct = new Intl.NumberFormat('es-EC', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const dinero = (n: number) => (n < 0 ? `−${usd.format(-n)}` : usd.format(n))
export const dineroCorto = (n: number) => usd0.format(n)
export const entero = (n: number) => num.format(n)
export const porcentaje = (n: number) => pct.format(n)

/** $1,2 M / $845 k: para ejes y cifras compactas. */
export function compacto(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-EC', { maximumFractionDigits: 2 })} M`
  if (abs >= 1_000) return `$${(n / 1_000).toLocaleString('es-EC', { maximumFractionDigits: 0 })} k`
  return `$${n.toFixed(0)}`
}

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

/** 1 incumplido / 3 incumplidos */
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Número con coma decimal: 4,8 */
export const decimal = (n: number, d = 1) => n.toLocaleString('es-EC', { minimumFractionDigits: d, maximumFractionDigits: d })
