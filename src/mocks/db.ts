// Base de datos en memoria de la demo. Es lo único que se reemplaza al conectar una API real.
import type { Caja, LoteRecaudo, Reverso } from '../domain/tipos'
import { HOY, USUARIA_DEMO } from './catalogos'
import { CAMPANIAS, FLUJOS_N8N, PLAN_CUENTAS, REGLAS } from './cobranza'
import { generarBaseDemo } from './generar'
import { ESTRATEGIA, FERIADOS, generarCobranza, generarEjecuciones, PLANTILLAS, VENTANAS, WEBHOOKS } from './gestiones'

const base = generarBaseDemo()
const cobranza = generarCobranza(base.operaciones, base.pagos, base.promesas, base.clientes)

export const db = {
  ...base,
  campanias: CAMPANIAS.map((c) => ({ ...c })),
  reglas: REGLAS.map((r) => ({ ...r })),
  flujos: FLUJOS_N8N.map((f) => ({ ...f })),
  planCuentas: PLAN_CUENTAS,
  reversos: [] as Reverso[],
  // La caja del día arranca abierta para que la demo pueda recibir efectivo de inmediato.
  caja: { fecha: HOY, cajero: USUARIA_DEMO.nombre, estado: 'Abierta', fondoInicial: 300, apertura: '08:30' } as Caja,
  lotes: [] as LoteRecaudo[],
  gestiones: cobranza.gestiones,
  convenios: cobranza.convenios,
  estrategia: ESTRATEGIA.map((p) => ({ ...p })),
  plantillas: PLANTILLAS.map((p) => ({ ...p })),
  ventanas: VENTANAS,
  feriados: FERIADOS,
  ejecuciones: generarEjecuciones(FLUJOS_N8N),
  webhooks: WEBHOOKS,
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
