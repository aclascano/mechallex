// Reglas de gestión de cobranza: prioridad de la cola, ventanas de contacto, plantillas y convenios.
import { round2 } from './amortizacion'
import { addMonths, type ISODate } from './fechas'
import type { CanalGestion, Feriado, MotivoNoPago, ResultadoGestion, VentanaContacto } from './tipos'

export const RESULTADOS: ResultadoGestion[] = ['Promesa de pago', 'Contactado sin compromiso', 'No contesta', 'Mensaje dejado', 'Número equivocado', 'Se niega a pagar', 'Ya pagó']
export const MOTIVOS: MotivoNoPago[] = ['Desempleo', 'Baja de ventas', 'Enfermedad', 'Olvido', 'Sobreendeudamiento', 'Desacuerdo con el saldo', 'Otro']
export const CANALES_GESTION: CanalGestion[] = ['Llamada', 'WhatsApp', 'SMS', 'Correo', 'Visita']

/** Resultados en los que se habló con el deudor. */
export const hayContacto = (r: ResultadoGestion) => r === 'Promesa de pago' || r === 'Contactado sin compromiso' || r === 'Se niega a pagar' || r === 'Ya pagó'
export const pideMotivo = (r: ResultadoGestion) => r === 'Contactado sin compromiso' || r === 'Se niega a pagar' || r === 'Promesa de pago'

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** ¿Se puede contactar por este canal en esta fecha y hora? */
export function enHorario(canal: CanalGestion, fecha: ISODate, hora: string, ventanas: VentanaContacto[], feriados: Feriado[]): { ok: boolean; motivo?: string } {
  const v = ventanas.find((x) => x.canal === canal)
  if (!v) return { ok: true }
  const feriado = feriados.find((f) => f.fecha === fecha)
  if (feriado && canal !== 'Correo') return { ok: false, motivo: `Feriado: ${feriado.nombre}.` }
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay()
  if (!v.dias.includes(dia)) return { ok: false, motivo: `${canal}: no se contacta los ${DIAS_SEMANA[dia].toLowerCase()}.` }
  if (hora < v.desde || hora > v.hasta) return { ok: false, motivo: `${canal}: solo de ${v.desde} a ${v.hasta}.` }
  return { ok: true }
}

/** Reemplaza las variables de una plantilla: {nombre}, {monto}, {dias}, {fecha}, {operacion}, {enlace}, {gestor}, {entidad}. */
export function renderPlantilla(texto: string, v: Record<string, string>) {
  return texto.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m)
}
export const VARIABLES = ['nombre', 'monto', 'dias', 'fecha', 'operacion', 'enlace', 'gestor', 'entidad']

/** Prioridad de un caso en la cola del día: más vencido, más días y compromisos rotos suben. */
export function prioridad(c: { valorVencido: number; diasMora: number; promesaRota: boolean; agendadoHoy: boolean; promesaHoy: boolean; preventivo: boolean }) {
  let p = Math.sqrt(Math.max(0, c.valorVencido)) * (1 + Math.min(c.diasMora, 120) / 40)
  if (c.promesaRota) p *= 1.4
  if (c.agendadoHoy) p += 40
  if (c.promesaHoy) p += 30
  if (c.preventivo) p += 8
  return Math.round(p)
}

/** Plan de convenio: cuota inicial y el resto en cuotas mensuales iguales (la última absorbe el redondeo). */
export function planConvenio(deuda: number, inicialPct: number, cuotas: number, desde: ISODate) {
  const inicial = round2(deuda * inicialPct)
  const resto = round2(deuda - inicial)
  const base = round2(resto / cuotas)
  return {
    inicial,
    cuotas: Array.from({ length: cuotas }, (_, i) => ({
      n: i + 1,
      fecha: addMonths(desde, i + 1),
      monto: i === cuotas - 1 ? round2(resto - base * (cuotas - 1)) : base,
    })),
  }
}
