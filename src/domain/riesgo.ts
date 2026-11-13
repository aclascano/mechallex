// Scoring de riesgo del deudor: probabilidad de no pago a 12 meses y su puntaje (300–850).
// Modelo logístico con pesos expertos de demostración (no entrenado ni validado con datos reales).
import type { Cliente } from './tipos'
import { capacidadPago, patrimonioNeto } from './clientes'

export interface HistorialPago {
  cuotasVencidas: number
  puntualidad: number
  atrasoPromedio: number
  moraActual: number
  aniosCliente: number
}

export interface EntradaRiesgo {
  cliente: Cliente
  edad: number | null
  /** Cuota del crédito que se evalúa (0 si se evalúa al cliente sin un crédito nuevo). */
  cuotaNueva: number
  /** Monto del crédito nuevo o, si no hay, la deuda vigente. */
  monto: number
  /** Cuotas mensuales que ya paga en la entidad. */
  cuotasVigentes: number
  garantia: 'real' | 'garante' | 'ninguna'
  coberturaReal: number
  historial?: HistorialPago
}

export interface Factor { id: string; nombre: string; valor: string; puntos: number }
export type Banda = 'Excelente' | 'Bueno' | 'Regular' | 'Alto riesgo'

export interface ResultadoRiesgo {
  modelo: 'Originación' | 'Comportamiento'
  pd: number
  score: number
  banda: Banda
  decision: { tono: 'ok' | 'aviso' | 'bloqueo'; texto: string }
  factores: Factor[]
}

// Escala: 40 puntos duplican las probabilidades de pagar (PDO). Perfil de referencia: PD 4 % = 690 puntos.
const PDO = 40
const B = PDO / Math.LN2
const PD_REF = 0.04
const SCORE_REF = 690
const B0 = Math.log(PD_REF / (1 - PD_REF))
// Ajuste de calibración: la cartera al día queda alrededor de 2–3 % de probabilidad de no pago.
const AJUSTE = 0.85

const pct = (x: number) => `${Math.round(x * 100)} %`
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

export function bandaDe(score: number): Banda {
  if (score >= 740) return 'Excelente'
  if (score >= 670) return 'Bueno'
  if (score >= 600) return 'Regular'
  return 'Alto riesgo'
}

export function evaluarRiesgo(e: EntradaRiesgo): ResultadoRiesgo {
  const c = e.cliente
  const s = c.socio
  const ingresos = Math.max(1, c.ingresos)
  const contribuciones: { id: string; nombre: string; valor: string; logit: number }[] = []
  const suma = (id: string, nombre: string, valor: string, logit: number) => contribuciones.push({ id, nombre, valor, logit })

  const carga = (e.cuotaNueva + e.cuotasVigentes) / ingresos
  suma('carga', 'Cuotas sobre el ingreso', pct(carga), 4 * (clamp(carga, 0, 1) - 0.25))

  const libre = capacidadPago(c) - e.cuotasVigentes
  const uso = e.cuotaNueva > 0 ? (libre > 0 ? e.cuotaNueva / libre : 2) : (libre > 0 ? 0.2 : 1.2)
  suma('capacidad', 'Uso de la capacidad libre', libre > 0 ? pct(Math.min(uso, 2)) : 'sin capacidad', 1.2 * (clamp(uso, 0, 2) - 0.4))

  if (c.situacionLaboral === 'Dependiente') {
    suma('antiguedad', 'Antigüedad laboral', `${s.empleo.antiguedadAnios} años`, -0.12 * (Math.min(10, s.empleo.antiguedadAnios) - 4))
    const k = s.empleo.contrato === 'Indefinido' ? -0.3 : s.empleo.contrato === 'Plazo fijo' ? 0.2 : 0.3
    suma('estabilidad', 'Tipo de contrato', s.empleo.contrato || 'sin dato', k)
  } else if (c.situacionLaboral === 'Independiente' || c.situacionLaboral === 'Empresa') {
    suma('antiguedad', 'Antigüedad del negocio', `${s.negocio.antiguedadAnios} años`, -0.12 * (Math.min(10, s.negocio.antiguedadAnios) - 4))
    suma('estabilidad', 'Formalidad del negocio', s.negocio.tieneRuc ? 'con RUC' : 'sin RUC', s.negocio.tieneRuc ? -0.1 : 0.4)
  } else {
    suma('estabilidad', 'Ingreso por jubilación', 'pensión estable', -0.2)
  }

  const neto = patrimonioNeto(s)
  const ratio = neto / Math.max(1, e.monto)
  suma('patrimonio', 'Patrimonio frente a la deuda', neto > 0 ? `${ratio.toFixed(1).replace('.', ',')} veces` : 'negativo', -0.35 * (Math.log1p(Math.max(0, ratio)) - Math.log1p(2)))

  const externas = s.pasivosExternos / (ingresos * 12)
  suma('externas', 'Deudas en otras entidades', pct(externas) + ' del ingreso anual', 1.5 * (clamp(externas, 0, 2) - 0.3))

  if (c.tipoPersona === 'Natural') {
    suma('vivienda', 'Vivienda', s.vivienda || 'sin dato', s.vivienda === 'Propia' ? -0.3 : s.vivienda === 'Arrendada' ? 0.2 : 0)
    suma('cargas', 'Cargas familiares', String(s.cargas), 0.12 * (s.cargas - 1.5))
    if (e.edad !== null) suma('edad', 'Edad', `${e.edad} años`, e.edad < 25 ? 0.4 : e.edad > 65 ? 0.2 : 0)
  }

  const g = e.garantia === 'real' ? (e.coberturaReal >= 1 ? -0.6 : -0.3) : e.garantia === 'garante' ? -0.25 : 0.2
  suma('garantia', 'Garantía', e.garantia === 'real' ? `real, cubre ${pct(e.coberturaReal)}` : e.garantia === 'garante' ? 'garante personal' : 'sin garantía', g)

  const h = e.historial
  const conHistorial = !!h && h.cuotasVencidas >= 3
  if (h && conHistorial) {
    suma('puntualidad', 'Puntualidad histórica', pct(h.puntualidad), -3 * (h.puntualidad - 0.85))
    suma('atraso', 'Atraso promedio', `${h.atrasoPromedio.toFixed(1).replace('.', ',')} días`, 0.04 * (Math.min(60, h.atrasoPromedio) - 3))
    suma('mora', 'Mora actual', `${h.moraActual} días`, 0.025 * Math.min(200, h.moraActual))
    suma('relacion', 'Antigüedad como cliente', `${h.aniosCliente.toFixed(1).replace('.', ',')} años`, -0.1 * (Math.min(8, h.aniosCliente) - 2))
  }

  const logit = B0 + AJUSTE + contribuciones.reduce((s2, x) => s2 + x.logit, 0)
  const pd = 1 / (1 + Math.exp(-logit))
  const score = Math.round(clamp(SCORE_REF - B * (logit - B0), 300, 850))
  const banda = bandaDe(score)
  const decision: ResultadoRiesgo['decision'] =
    banda === 'Excelente' || banda === 'Bueno' ? { tono: 'ok', texto: 'Perfil apto. Se sugiere aprobar en las condiciones propuestas.' }
    : banda === 'Regular' ? { tono: 'aviso', texto: 'Aprobar con condiciones: garante adicional, menor monto o plazo más corto.' }
    : { tono: 'bloqueo', texto: 'Riesgo alto. Se sugiere no aprobar o reestructurar la propuesta.' }
  return {
    modelo: conHistorial ? 'Comportamiento' : 'Originación',
    pd,
    score,
    banda,
    decision,
    factores: contribuciones.map((x) => ({ id: x.id, nombre: x.nombre, valor: x.valor, puntos: Math.round(-B * x.logit) })).sort((a, b) => Math.abs(b.puntos) - Math.abs(a.puntos)),
  }
}

/** Puntaje de referencia desde el que suman o restan los factores. */
export const SCORE_BASE = SCORE_REF
