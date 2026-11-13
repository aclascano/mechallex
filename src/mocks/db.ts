// Base de datos en memoria de la demo. Es lo único que se reemplaza al conectar una API real.
import { CAMPANIAS, FLUJOS_N8N, PLAN_CUENTAS, REGLAS } from './cobranza'
import { generarBaseDemo } from './generar'

const base = generarBaseDemo()

export const db = {
  ...base,
  campanias: CAMPANIAS.map((c) => ({ ...c })),
  reglas: REGLAS.map((r) => ({ ...r })),
  flujos: FLUJOS_N8N.map((f) => ({ ...f })),
  planCuentas: PLAN_CUENTAS,
}

export type Db = typeof db

// Suscripción simple para que las pantallas se refresquen tras una mutación (p. ej. registrar un pago).
const oyentes = new Set<() => void>()
export function suscribir(fn: () => void) {
  oyentes.add(fn)
  return () => { oyentes.delete(fn) }
}
export function notificar() {
  version++
  oyentes.forEach((fn) => fn())
}
export let version = 0
