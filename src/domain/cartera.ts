import { round2 } from './amortizacion'
import { diffDays, type ISODate } from './fechas'
import type { EtapaCobranza, EstadoOperacion, Operacion, Pago, Tramo } from './tipos'

export const TRAMOS: { id: Tramo; label: string; corto: string }[] = [
  { id: 'al-dia', label: 'Al día', corto: 'Al día' },
  { id: '1-30', label: '1 a 30 días', corto: '1–30' },
  { id: '31-60', label: '31 a 60 días', corto: '31–60' },
  { id: '61-90', label: '61 a 90 días', corto: '61–90' },
  { id: '91-180', label: '91 a 180 días', corto: '91–180' },
  { id: '180+', label: 'Más de 180 días', corto: '+180' },
]

export const ETAPAS: { id: EtapaCobranza; label: string; regla: string }[] = [
  { id: 'preventiva', label: 'Preventiva', regla: 'Sin atraso' },
  { id: 'administrativa', label: 'Administrativa', regla: '1 a 45 días' },
  { id: 'extrajudicial', label: 'Extrajudicial', regla: '46 a 120 días' },
  { id: 'judicial', label: 'Judicial', regla: 'Más de 120 días' },
]

export function tramoDe(diasMora: number): Tramo {
  if (diasMora <= 0) return 'al-dia'
  if (diasMora <= 30) return '1-30'
  if (diasMora <= 60) return '31-60'
  if (diasMora <= 90) return '61-90'
  if (diasMora <= 180) return '91-180'
  return '180+'
}

export function etapaDe(diasMora: number): EtapaCobranza {
  if (diasMora <= 0) return 'preventiva'
  if (diasMora <= 45) return 'administrativa'
  if (diasMora <= 120) return 'extrajudicial'
  return 'judicial'
}

/** Recargo por mora: 0,02 % diario sobre el valor vencido (valor ficticio de la demo). */
export const TASA_MORA_DIARIA = 0.0002

/**
 * Estado de una operación a la fecha de corte.
 * Los pagos (interés + capital) cubren las cuotas en orden: primero el interés y luego el capital de cada cuota.
 */
export function estadoOperacion(op: Operacion, pagos: Pago[], corte: ISODate): EstadoOperacion {
  const aplicables = pagos.filter((p) => p.fecha <= corte)
  let bolsa = round2(aplicables.reduce((s, p) => s + p.interes + p.capital, 0))
  const interesPagado = round2(aplicables.reduce((s, p) => s + p.interes, 0))
  const capitalPagado = round2(aplicables.reduce((s, p) => s + p.capital, 0))

  const aplicadoPorCuota: number[] = []
  let cuotasPagadas = 0
  let cuotasVencidas = 0
  let valorVencido = 0
  let primeraImpaga: ISODate | undefined
  let proximaCuota: EstadoOperacion['proximaCuota']

  for (const c of op.tabla) {
    const cubierto = round2(Math.min(c.cuota, bolsa))
    bolsa = round2(bolsa - cubierto)
    aplicadoPorCuota.push(cubierto)
    const completa = cubierto >= c.cuota - 0.005
    if (completa) cuotasPagadas++
    if (!completa && c.fecha < corte) {
      cuotasVencidas++
      valorVencido = round2(valorVencido + c.cuota - cubierto)
      if (!primeraImpaga) primeraImpaga = c.fecha
    }
    if (!completa && c.fecha >= corte && !proximaCuota) {
      proximaCuota = { n: c.n, fecha: c.fecha, valor: round2(c.cuota - cubierto) }
    }
  }

  const diasMora = primeraImpaga ? diffDays(corte, primeraImpaga) : 0
  const saldoCapital = round2(op.monto - capitalPagado)
  return {
    saldoCapital,
    capitalPagado,
    interesPagado,
    cuotasPagadas,
    cuotasVencidas,
    valorVencido,
    diasMora,
    tramo: tramoDe(diasMora),
    etapa: etapaDe(diasMora),
    proximaCuota,
    aplicadoPorCuota,
    cancelada: saldoCapital <= 0.005,
  }
}

/** Reparte un monto neto (sin mora) entre interés y capital de las cuotas pendientes, en orden. */
export function distribuirPago(op: Operacion, pagosPrevios: Pago[], montoNeto: number): { interes: number; capital: number; aplicado: number } {
  let bolsa = round2(pagosPrevios.reduce((s, p) => s + p.interes + p.capital, 0))
  let restante = round2(montoNeto)
  let interes = 0
  let capital = 0
  for (const c of op.tabla) {
    if (restante <= 0) break
    const cubiertoPrevio = Math.min(c.cuota, bolsa)
    bolsa = round2(bolsa - cubiertoPrevio)
    const pendienteInteres = round2(Math.max(0, c.interes - cubiertoPrevio))
    const pendienteCapital = round2(c.cuota - Math.max(cubiertoPrevio, c.interes))
    const ai = Math.min(restante, pendienteInteres)
    restante = round2(restante - ai)
    const ac = Math.min(restante, Math.max(0, pendienteCapital))
    restante = round2(restante - ac)
    interes = round2(interes + ai)
    capital = round2(capital + ac)
  }
  return { interes, capital, aplicado: round2(interes + capital) }
}
