// Calificación de cartera, provisiones, pérdida esperada y proyección por tasas de rodamiento.
// Porcentajes y pérdidas por garantía son parámetros de la demo.
import type { Tramo } from './tipos'

export interface Categoria { id: string; desde: number; hasta: number; tasa: number }

/** Calificación por días de mora y porcentaje de provisión de cada categoría. */
export const CATEGORIAS: Categoria[] = [
  { id: 'A1', desde: 0, hasta: 0, tasa: 0.01 },
  { id: 'A2', desde: 1, hasta: 15, tasa: 0.02 },
  { id: 'A3', desde: 16, hasta: 30, tasa: 0.03 },
  { id: 'B1', desde: 31, hasta: 45, tasa: 0.06 },
  { id: 'B2', desde: 46, hasta: 60, tasa: 0.1 },
  { id: 'C1', desde: 61, hasta: 75, tasa: 0.2 },
  { id: 'C2', desde: 76, hasta: 90, tasa: 0.4 },
  { id: 'D', desde: 91, hasta: 120, tasa: 0.6 },
  { id: 'E', desde: 121, hasta: Infinity, tasa: 1 },
]

export const categoriaDe = (diasMora: number) => CATEGORIAS.find((c) => diasMora >= c.desde && diasMora <= c.hasta)!

/** Tasa de provisión promedio de cada tramo de antigüedad (para proyectar). */
export const TASA_TRAMO: Record<Tramo, number> = { 'al-dia': 0.01, '1-30': 0.025, '31-60': 0.08, '61-90': 0.3, '91-180': 0.8, '180+': 1 }

/** Pérdida si no paga (LGD) según la garantía: lo que no se recupera tras ejecutarla. */
export const LGD = { hipoteca: 0.25, prenda: 0.45, encaje: 0.6, garante: 0.65, ninguna: 0.8 }

export const ESTADOS = ['al-dia', '1-30', '31-60', '61-90', '91-180', '180+', 'cancelada'] as const
export type EstadoRodamiento = (typeof ESTADOS)[number]
export type Matriz = number[][]

/** Matriz de transición mensual a partir de pares (estado del mes, estado del mes siguiente). */
export function estimarMatriz(pares: [EstadoRodamiento, EstadoRodamiento][]): Matriz {
  const n = ESTADOS.length
  const conteo = Array.from({ length: n }, () => Array(n).fill(0) as number[])
  pares.forEach(([a, b]) => { conteo[ESTADOS.indexOf(a)][ESTADOS.indexOf(b)]++ })
  return conteo.map((fila, i) => {
    const total = fila.reduce((s, v) => s + v, 0)
    if (!total) return fila.map((_, j) => (j === i ? 1 : 0))
    return fila.map((v) => v / total)
  })
}

/**
 * Estrés: las probabilidades de empeorar (pasar a un tramo peor) suben un `s` (0,2 = +20 %).
 * La masa añadida sale, en proporción, de mantenerse o mejorar.
 */
export function estresar(m: Matriz, s: number): Matriz {
  if (s <= 0) return m
  const ultimoTramo = ESTADOS.length - 2
  return m.map((fila, i) => {
    if (i >= ultimoTramo) return fila
    const peores = fila.map((p, j) => (j > i && j <= ultimoTramo ? p : 0))
    const empeora = peores.reduce((a, b) => a + b, 0)
    const resto = fila.map((p, j) => (j > i && j <= ultimoTramo ? 0 : p))
    const totalResto = resto.reduce((a, b) => a + b, 0)
    const extra = Math.min(totalResto, empeora * s)
    const sube = empeora ? (empeora + extra) / empeora : 1
    const baja = totalResto ? 1 - extra / totalResto : 1
    return fila.map((p, j) => (peores[j] ? p * sube : p * baja))
  })
}

/** Fracción mensual de la cartera con más de 180 días que se castiga (sale del balance). Supuesto de la demo. */
export const CASTIGO_MENSUAL = 1 / 6

/** Proyecta el saldo por estado: rueda con la matriz, amortiza lo que sigue pagando y castiga lo muy vencido. */
export function proyectar(saldo: number[], m: Matriz, meses: number, amortizacion: number) {
  const serie: number[][] = []
  let v = [...saldo]
  for (let k = 0; k < meses; k++) {
    const sig = Array(ESTADOS.length).fill(0) as number[]
    v.forEach((monto, i) => m[i].forEach((p, j) => { sig[j] += monto * p }))
    sig[0] *= 1 - amortizacion
    sig[1] *= 1 - amortizacion / 2
    sig[ESTADOS.length - 2] *= 1 - CASTIGO_MENSUAL
    sig[ESTADOS.length - 1] = 0
    v = sig
    serie.push(v)
  }
  return serie
}

export const provisionDe = (saldoPorEstado: number[]) =>
  ESTADOS.slice(0, -1).reduce((s, e, i) => s + saldoPorEstado[i] * TASA_TRAMO[e as Tramo], 0)
