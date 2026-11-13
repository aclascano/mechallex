// Saldos a la fecha, devengo de intereses y liquidación de una operación.
import { round2 } from './amortizacion'
import { TASA_MORA_DIARIA } from './cartera'
import { addDays, diffDays, type ISODate } from './fechas'
import type { EstadoOperacion, Operacion, Producto } from './tipos'

/**
 * Días de mora a partir de los cuales el interés deja de reconocerse como ingreso
 * y pasa a cuentas de orden. Valor de la demo; en producción es parámetro por producto.
 */
export const DIAS_SUSPENSION_DEVENGO = 60

/** Cobertura mínima de garantías reales sobre el saldo, por producto (0 = no exige garantía real). */
export const COBERTURA_MINIMA: Record<Producto, number> = { Vivienda: 1.4, Comercial: 1.25, Consumo: 0, Microcrédito: 0 }

const inicioPeriodo = (op: Operacion, i: number) => (i === 0 ? op.fechaDesembolso : op.tabla[i - 1].fecha)

export interface Saldos {
  capitalVencido: number
  capitalPorVencer: number
  interesVencido: number
  /** Interés del periodo en curso, devengado hasta la fecha y aún no cobrado. */
  interesEnCurso: number
  diasPeriodoEnCurso: number
  mora: number
  /** Lo que el cliente paga para ponerse al día. */
  exigible: number
  /** Lo que el cliente paga para cancelar toda la deuda hoy. */
  liquidacion: number
  interesDiario: number
}

export function saldosOperacion(op: Operacion, est: EstadoOperacion, corte: ISODate): Saldos {
  if (est.cancelada) {
    return { capitalVencido: 0, capitalPorVencer: 0, interesVencido: 0, interesEnCurso: 0, diasPeriodoEnCurso: 0, mora: 0, exigible: 0, liquidacion: 0, interesDiario: 0 }
  }
  let capitalVencido = 0
  let interesVencido = 0
  let interesEnCurso = 0
  let diasPeriodoEnCurso = 0
  let enCursoVisto = false
  op.tabla.forEach((c, i) => {
    const aplicado = est.aplicadoPorCuota[i] ?? 0
    const intCubierto = Math.min(aplicado, c.interes)
    const capCubierto = Math.max(0, aplicado - c.interes)
    if (c.fecha < corte) {
      interesVencido += c.interes - intCubierto
      capitalVencido += c.capital - capCubierto
    } else if (!enCursoVisto) {
      enCursoVisto = true
      const desde = inicioPeriodo(op, i)
      const total = Math.max(1, diffDays(c.fecha, desde))
      diasPeriodoEnCurso = Math.max(0, Math.min(total, diffDays(corte, desde)))
      interesEnCurso = Math.max(0, (c.interes * diasPeriodoEnCurso) / total - intCubierto)
    }
  })
  capitalVencido = round2(capitalVencido)
  interesVencido = round2(interesVencido)
  interesEnCurso = round2(interesEnCurso)
  const mora = est.diasMora > 3 ? round2(est.valorVencido * TASA_MORA_DIARIA * est.diasMora) : 0
  const capitalPorVencer = round2(est.saldoCapital - capitalVencido)
  return {
    capitalVencido,
    capitalPorVencer,
    interesVencido,
    interesEnCurso,
    diasPeriodoEnCurso,
    mora,
    exigible: round2(capitalVencido + interesVencido + mora),
    liquidacion: round2(est.saldoCapital + interesVencido + interesEnCurso + mora),
    interesDiario: round2((est.saldoCapital * op.tasaAnual) / 100 / 360),
  }
}

export type EstadoDevengo = 'Cobrado' | 'Por cobrar' | 'En curso' | 'Por devengar' | 'Suspendido'

export interface FilaDevengo {
  n: number
  desde: ISODate
  hasta: ISODate
  dias: number
  diasDevengados: number
  interes: number
  devengado: number
  cobrado: number
  porCobrar: number
  /** Devengado que, por la mora, va a cuentas de orden en vez de ingresos. */
  enOrden: number
  estado: EstadoDevengo
}

/**
 * Tabla devengada: cuánto interés generó cada periodo hasta la fecha de corte y cuánto se cobró.
 * El interés devenga por días dentro de cada periodo (base 30/360 de la tabla, prorrateado por días reales).
 */
export function tablaDevengo(op: Operacion, est: EstadoOperacion, corte: ISODate): FilaDevengo[] {
  const suspendido = est.diasMora > DIAS_SUSPENSION_DEVENGO
  return op.tabla.map((c, i) => {
    const desde = inicioPeriodo(op, i)
    const dias = Math.max(1, diffDays(c.fecha, desde))
    const diasDevengados = est.cancelada ? 0 : Math.max(0, Math.min(dias, diffDays(corte, desde)))
    const cobrado = round2(Math.min(est.aplicadoPorCuota[i] ?? 0, c.interes))
    let devengado = est.cancelada ? cobrado : diasDevengados >= dias ? c.interes : round2((c.interes * diasDevengados) / dias)
    devengado = Math.max(devengado, cobrado)
    const porCobrar = round2(devengado - cobrado)
    const enOrden = suspendido && porCobrar > 0 && c.fecha >= addDiasSuspension(est, corte) ? porCobrar : 0
    let estado: EstadoDevengo
    if (cobrado >= c.interes - 0.005) estado = 'Cobrado'
    else if (diasDevengados === 0) estado = 'Por devengar'
    else if (enOrden > 0) estado = 'Suspendido'
    else if (diasDevengados < dias) estado = 'En curso'
    else estado = 'Por cobrar'
    return { n: c.n, desde, hasta: c.fecha, dias, diasDevengados, interes: c.interes, devengado: round2(devengado), cobrado, porCobrar, enOrden: round2(enOrden), estado }
  })
}

/** Fecha desde la cual se suspende el devengo: primera cuota impaga + días de suspensión. */
const addDiasSuspension = (est: EstadoOperacion, corte: ISODate): ISODate => addDays(corte, DIAS_SUSPENSION_DEVENGO - est.diasMora)

export interface FilaPago {
  n: number
  fecha: ISODate
  diasAtraso: number
  pendienteAntes: number
  interes: number
  capital: number
  pendienteDespues: number
  queda: 'Cubierta' | 'Parcial'
}

/**
 * Detalle de cómo un monto neto (sin recargo) cubre las cuotas pendientes, en orden:
 * primero el interés y luego el capital de cada cuota.
 */
export function detallePago(op: Operacion, est: EstadoOperacion, montoNeto: number, corte: ISODate): FilaPago[] {
  let restante = round2(montoNeto)
  const filas: FilaPago[] = []
  op.tabla.forEach((c, i) => {
    if (restante <= 0) return
    const aplicado = est.aplicadoPorCuota[i] ?? 0
    const pendiente = round2(c.cuota - aplicado)
    if (pendiente <= 0.005) return
    const pendInteres = round2(Math.max(0, c.interes - aplicado))
    const ai = round2(Math.min(restante, pendInteres))
    restante = round2(restante - ai)
    const pendCapital = round2(pendiente - pendInteres)
    const ac = round2(Math.min(restante, pendCapital))
    restante = round2(restante - ac)
    const despues = round2(pendiente - ai - ac)
    filas.push({ n: c.n, fecha: c.fecha, diasAtraso: Math.max(0, diffDays(corte, c.fecha)), pendienteAntes: pendiente, interes: ai, capital: ac, pendienteDespues: despues, queda: despues <= 0.005 ? 'Cubierta' : 'Parcial' })
  })
  return filas
}

/** Valor para pagar las próximas `n` cuotas pendientes (sin recargo). */
export function valorCuotas(op: Operacion, est: EstadoOperacion, n: number): number {
  let suma = 0
  let k = 0
  op.tabla.forEach((c, i) => {
    const pendiente = round2(c.cuota - (est.aplicadoPorCuota[i] ?? 0))
    if (pendiente > 0.005 && k < n) {
      suma += pendiente
      k++
    }
  })
  return round2(suma)
}
