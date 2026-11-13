// Fechas como texto ISO 'YYYY-MM-DD' en UTC, para que los cálculos no dependan de la zona horaria.

export type ISODate = string

const toDate = (iso: ISODate) => new Date(iso + 'T00:00:00Z')
const toISO = (d: Date): ISODate => d.toISOString().slice(0, 10)

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = toDate(iso)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return toISO(d)
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toISO(d)
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86_400_000)
}

export function endOfMonth(iso: ISODate): ISODate {
  const d = toDate(iso)
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

export function startOfMonth(iso: ISODate): ISODate {
  return iso.slice(0, 8) + '01'
}

export const monthKey = (iso: ISODate) => iso.slice(0, 7)

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function fmtFecha(iso: ISODate): string {
  const d = toDate(iso)
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function fmtFechaLarga(iso: ISODate): string {
  const d = toDate(iso)
  return `${d.getUTCDate()} de ${MESES_LARGO[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}

export function fmtMes(iso: ISODate, conAnio = false): string {
  const d = toDate(iso)
  return conAnio ? `${MESES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : MESES[d.getUTCMonth()]
}

export function nombreMes(iso: ISODate): string {
  return MESES_LARGO[toDate(iso).getUTCMonth()]
}
