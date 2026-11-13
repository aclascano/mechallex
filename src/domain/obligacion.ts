// Reglas para crear una obligación: condiciones del producto, garantías exigidas, costos y alertas de aprobación.
import { generarTabla, round2, totales, type Cuota, type Sistema } from './amortizacion'
import { capacidadPago } from './clientes'
import { addMonths, diffDays, type ISODate } from './fechas'
import { COBERTURA_MINIMA } from './operacion'
import type { Cliente, Garante, GarantiaReal, Producto } from './tipos'

export interface ProductoCredito {
  id: Producto
  descripcion: string
  tasa: readonly [number, number]
  plazo: readonly [number, number]
  monto: readonly [number, number]
  comision: number
  seguroAnual: number
  seguroObligatorio: boolean
  graciaMax: number
}

export type GaranteNuevo = Omit<Garante, 'id'>
export type GarantiaNueva = Omit<GarantiaReal, 'id' | 'estado'>

export interface DatosObligacion {
  clienteId: string
  producto: Producto
  monto: number
  plazoMeses: number
  tasaAnual: number
  sistema: Sistema
  diaPago: number
  graciaMeses: number
  seguro: boolean
  garantes: GaranteNuevo[]
  reales: GarantiaNueva[]
  aprobada: boolean
  observacion: string
  medio: 'Transferencia' | 'Cheque' | 'Efectivo'
  cuentaDestino: string
}

export const PASOS_OBLIGACION = [
  { id: 'deudor', titulo: 'Deudor', detalle: 'A quién se presta' },
  { id: 'condiciones', titulo: 'Producto y condiciones', detalle: 'Monto, plazo y tasa' },
  { id: 'garantias', titulo: 'Garantes y garantías', detalle: 'Respaldo del crédito' },
  { id: 'tabla', titulo: 'Tabla de amortización', detalle: 'Cuotas resultantes' },
  { id: 'aprobacion', titulo: 'Revisión y aprobación', detalle: 'Capacidad y alertas' },
  { id: 'desembolso', titulo: 'Desembolso', detalle: 'Entrega del dinero' },
] as const
export type PasoObligacion = (typeof PASOS_OBLIGACION)[number]['id']

/** Primer vencimiento: el día de pago elegido, al menos 20 días después del desembolso. */
export function primerVencimiento(desembolso: ISODate, diaPago: number): ISODate {
  const base = `${desembolso.slice(0, 8)}${String(diaPago).padStart(2, '0')}`
  let f = addMonths(base, 1)
  if (diffDays(f, desembolso) < 20) f = addMonths(f, 1)
  return f
}

export function tablaObligacion(d: Pick<DatosObligacion, 'monto' | 'plazoMeses' | 'tasaAnual' | 'sistema' | 'diaPago' | 'graciaMeses'>, desembolso: ISODate, sistema: Sistema = d.sistema): Cuota[] {
  if (!(d.monto > 0) || !(d.plazoMeses > 0) || !(d.tasaAnual >= 0)) return []
  return generarTabla({
    monto: d.monto, tasaAnual: d.tasaAnual, plazoMeses: d.plazoMeses, sistema, fechaDesembolso: desembolso,
    primerVencimiento: primerVencimiento(desembolso, d.diaPago), graciaMeses: d.graciaMeses,
  })
}

/** Comisión de apertura y seguro de desgravamen (prima única): se descuentan del desembolso. */
export function costos(d: Pick<DatosObligacion, 'monto' | 'plazoMeses' | 'seguro'>, p: ProductoCredito) {
  const comision = round2(d.monto * p.comision)
  const seguro = d.seguro ? round2(d.monto * p.seguroAnual * (d.plazoMeses / 12)) : 0
  return { comision, seguro, neto: round2(d.monto - comision - seguro) }
}

export function requisitosGarantia(producto: Producto, monto: number) {
  const coberturaMinima = COBERTURA_MINIMA[producto]
  const garantesMinimos = producto === 'Microcrédito' || (producto === 'Consumo' && monto > 6000) ? 1 : 0
  const partes: string[] = []
  if (coberturaMinima) partes.push(`garantía real que cubra al menos el ${Math.round(coberturaMinima * 100)} % del monto`)
  if (garantesMinimos) partes.push('un garante personal')
  return { coberturaMinima, garantesMinimos, texto: partes.length ? `Este producto exige ${partes.join(' y ')}.` : 'Este producto no exige garantía para este monto. Puedes agregar una si la hay.' }
}

export type Errores = Partial<Record<string, string>>

export function validarPaso(paso: PasoObligacion, d: DatosObligacion, p: ProductoCredito | undefined, ctx: { cliente?: Cliente; bloqueoDeudor?: string | null }): Errores {
  const e: Errores = {}
  if (paso === 'deudor') {
    if (!ctx.cliente) e.clienteId = 'Elige el deudor.'
    else if (ctx.bloqueoDeudor) e.clienteId = ctx.bloqueoDeudor
  }
  if (paso === 'condiciones' && p) {
    if (!(d.monto >= p.monto[0] && d.monto <= p.monto[1])) e.monto = `Entre $${p.monto[0].toLocaleString('es-EC')} y $${p.monto[1].toLocaleString('es-EC')}.`
    if (!(d.plazoMeses >= p.plazo[0] && d.plazoMeses <= p.plazo[1])) e.plazoMeses = `Entre ${p.plazo[0]} y ${p.plazo[1]} meses.`
    if (!(d.tasaAnual >= p.tasa[0] && d.tasaAnual <= p.tasa[1])) e.tasaAnual = `Entre ${p.tasa[0].toLocaleString('es-EC')} % y ${p.tasa[1].toLocaleString('es-EC')} % (techo del producto).`
    if (d.graciaMeses > p.graciaMax) e.graciaMeses = p.graciaMax ? `Máximo ${p.graciaMax} meses.` : 'Este producto no admite gracia.'
    if (d.graciaMeses >= d.plazoMeses) e.graciaMeses = 'La gracia debe ser menor que el plazo.'
  }
  if (paso === 'garantias') {
    const req = requisitosGarantia(d.producto, d.monto)
    const valor = d.reales.reduce((s, r) => s + (r.valorAvaluo || 0), 0)
    if (req.coberturaMinima && valor < d.monto * req.coberturaMinima) e.reales = `La cobertura es ${Math.round((valor / d.monto) * 100)} %; el producto exige ${Math.round(req.coberturaMinima * 100)} %.`
    if (d.garantes.length < req.garantesMinimos) e.garantes = 'Agrega un garante personal.'
    d.garantes.forEach((g, i) => {
      if (!g.nombre.trim()) e[`g.${i}.nombre`] = 'Ingresa el nombre.'
      if (!/^\d{10}$/.test(g.cedula)) e[`g.${i}.cedula`] = 'Cédula de 10 dígitos.'
      if (g.clienteId && g.clienteId === d.clienteId) e[`g.${i}.nombre`] = 'El deudor no puede ser su propio garante.'
    })
    d.reales.forEach((r, i) => {
      if (!r.descripcion.trim()) e[`r.${i}.descripcion`] = 'Describe el bien.'
      if (!(r.valorAvaluo > 0)) e[`r.${i}.valorAvaluo`] = 'Ingresa el avalúo.'
    })
  }
  if (paso === 'aprobacion' && !d.aprobada) e.aprobada = 'Marca la aprobación para continuar.'
  if (paso === 'desembolso' && d.medio === 'Transferencia' && !/^\d{6,12}$/.test(d.cuentaDestino.replace(/\s/g, ''))) e.cuentaDestino = 'Número de cuenta de 6 a 12 dígitos.'
  return e
}

export interface Alerta { nivel: 'ok' | 'aviso' | 'bloqueo'; texto: string }

/** Indicadores para decidir: cuánto pesa la cuota sobre los ingresos y la capacidad de pago. */
export function evaluar(tabla: Cuota[], cliente: Cliente, exposicion: { saldo: number; peorMora: number; cuotasVigentes: number }) {
  const cuotaMax = tabla.reduce((m, c) => Math.max(m, c.cuota), 0)
  const capacidad = capacidadPago(cliente)
  const libre = Math.max(0, capacidad - exposicion.cuotasVigentes)
  const relacionIngreso = cliente.ingresos ? (cuotaMax + exposicion.cuotasVigentes) / cliente.ingresos : 1
  const usoCapacidad = libre ? cuotaMax / libre : Infinity
  const alertas: Alerta[] = []
  if (relacionIngreso > 0.4) alertas.push({ nivel: 'aviso', texto: `Las cuotas suman ${Math.round(relacionIngreso * 100)} % del ingreso mensual; la política recomienda hasta 40 %.` })
  else alertas.push({ nivel: 'ok', texto: `Las cuotas suman ${Math.round(relacionIngreso * 100)} % del ingreso mensual (límite 40 %).` })
  if (usoCapacidad > 1) alertas.push({ nivel: 'bloqueo', texto: 'La cuota supera la capacidad de pago disponible después de sus otras deudas.' })
  else if (usoCapacidad > 0.8) alertas.push({ nivel: 'aviso', texto: `La cuota usa ${Math.round(usoCapacidad * 100)} % de la capacidad de pago disponible.` })
  else alertas.push({ nivel: 'ok', texto: `La cuota usa ${Math.round(usoCapacidad * 100)} % de la capacidad de pago disponible.` })
  if (exposicion.peorMora > 0) alertas.push({ nivel: 'aviso', texto: `Tiene otra operación con ${exposicion.peorMora} días de mora.` })
  const t = totales(tabla)
  return { cuotaMax, capacidad, libre, relacionIngreso, usoCapacidad, alertas, totalInteres: t.interes, totalPagar: t.cuota }
}
