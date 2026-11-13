import { addMonths, diffDays, type ISODate } from './fechas'

export type Sistema = 'frances' | 'aleman'

export interface ParamsCredito {
  monto: number
  tasaAnual: number // en %, nominal anual
  plazoMeses: number
  sistema: Sistema
  fechaDesembolso: ISODate
  /** Si se fija, las cuotas vencen ese día cada mes y el interés del primer periodo se prorratea por días. */
  primerVencimiento?: ISODate
  /** Meses iniciales en que solo se paga interés (gracia de capital). */
  graciaMeses?: number
}

export interface Cuota {
  n: number
  fecha: ISODate
  saldoInicial: number
  cuota: number
  interes: number
  capital: number
  saldo: number
}

export const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100

/**
 * Genera la tabla de amortización.
 * - Francés: cuota fija; el interés baja y el capital sube.
 * - Alemán: capital fijo; la cuota baja con el saldo.
 * La última cuota absorbe el redondeo para que el capital sume exactamente el monto.
 */
export const fechaCuota = (p: Pick<ParamsCredito, 'fechaDesembolso' | 'primerVencimiento'>, num: number) =>
  p.primerVencimiento ? addMonths(p.primerVencimiento, num - 1) : addMonths(p.fechaDesembolso, num)

export function generarTabla(p: ParamsCredito, desdeCuota = 1, saldoInicial = p.monto, plazoRestante = p.plazoMeses): Cuota[] {
  const i = p.tasaAnual / 100 / 12
  const n = plazoRestante
  const filas: Cuota[] = []
  let saldo = round2(saldoInicial)
  const gracia = Math.max(0, Math.min(n - 1, (p.graciaMeses ?? 0) - (desdeCuota - 1)))
  const nAmort = n - gracia
  const cuotaFija = i === 0 ? saldo / nAmort : (saldo * i) / (1 - Math.pow(1 + i, -nAmort))
  const capitalFijo = saldo / nAmort

  for (let k = 0; k < n; k++) {
    const num = desdeCuota + k
    // Primer periodo irregular: interés por los días reales entre desembolso y primer vencimiento.
    const factor = num === 1 && p.primerVencimiento ? diffDays(p.primerVencimiento, p.fechaDesembolso) / 30 : 1
    const interesNormal = round2(saldo * i)
    const interes = factor === 1 ? interesNormal : round2(saldo * i * factor)
    const ultima = k === n - 1
    let capital = k < gracia ? 0 : p.sistema === 'frances' ? round2(cuotaFija - interesNormal) : round2(capitalFijo)
    if (ultima || capital > saldo) capital = saldo
    const cuota = round2(capital + interes)
    const saldoFinal = round2(saldo - capital)
    filas.push({
      n: num,
      fecha: fechaCuota(p, num),
      saldoInicial: saldo,
      cuota,
      interes,
      capital,
      saldo: saldoFinal,
    })
    saldo = saldoFinal
  }
  return filas
}

export type ModoRecalculo = 'reducir-cuota' | 'reducir-plazo'

/**
 * Aplica un abono extraordinario a capital después de la cuota `despuesDe` y recalcula el resto.
 * - reducir-cuota: mantiene el plazo, baja la cuota.
 * - reducir-plazo: mantiene (aprox.) la cuota, acorta el plazo.
 */
export function recalcular(p: ParamsCredito, tabla: Cuota[], despuesDe: number, abono: number, modo: ModoRecalculo): Cuota[] {
  const previas = tabla.slice(0, despuesDe)
  const saldoBase = despuesDe === 0 ? p.monto : tabla[despuesDe - 1].saldo
  const abonoReal = round2(Math.min(abono, saldoBase))
  const nuevoSaldo = round2(saldoBase - abonoReal)
  if (nuevoSaldo <= 0) return previas

  const restantes = p.plazoMeses - despuesDe
  if (modo === 'reducir-cuota') {
    return [...previas, ...generarTabla(p, despuesDe + 1, nuevoSaldo, restantes)]
  }

  // reducir-plazo: buscar el menor plazo cuya primera cuota no supere la cuota actual
  const i = p.tasaAnual / 100 / 12
  const ref = tabla[despuesDe] ?? tabla[tabla.length - 1]
  let plazo = restantes
  if (p.sistema === 'frances') {
    const cuotaRef = ref.cuota
    plazo = i === 0 ? Math.ceil(nuevoSaldo / cuotaRef) : Math.ceil(-Math.log(1 - (nuevoSaldo * i) / cuotaRef) / Math.log(1 + i))
  } else {
    plazo = Math.ceil(nuevoSaldo / ref.capital)
  }
  plazo = Math.max(1, Math.min(restantes, plazo))
  return [...previas, ...generarTabla(p, despuesDe + 1, nuevoSaldo, plazo)]
}

export function totales(tabla: Cuota[]) {
  return tabla.reduce(
    (acc, c) => ({ cuota: round2(acc.cuota + c.cuota), interes: round2(acc.interes + c.interes), capital: round2(acc.capital + c.capital) }),
    { cuota: 0, interes: 0, capital: 0 },
  )
}
