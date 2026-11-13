// Base de datos en memoria de la demo. Es lo único que se reemplaza al conectar una API real.
import { round2 } from '../domain/amortizacion'
import { estadoOperacion } from '../domain/cartera'
import { addMonths, monthKey } from '../domain/fechas'
import { categoriaDe } from '../domain/provisiones'
import type { Caja, LoteRecaudo, Periodo, Reverso } from '../domain/tipos'
import { HOY, USUARIA_DEMO } from './catalogos'
import { CAMPANIAS, ESQUEMAS, FLUJOS_N8N, PLAN_CUENTAS, REGLAS } from './cobranza'
import { generarBaseDemo } from './generar'
import { ESTRATEGIA, FERIADOS, generarCobranza, generarEjecuciones, PLANTILLAS, VENTANAS, WEBHOOKS } from './gestiones'

const base = generarBaseDemo()
const cobranza = generarCobranza(base.operaciones, base.pagos, base.promesas, base.clientes)

// Provisión constituida al cierre de octubre: la requerida a esa fecha por calificación de cartera.
const CIERRE_ANTERIOR = '2026-10-31'
const provisionInicial = round2(base.operaciones.filter((o) => o.fechaDesembolso <= CIERRE_ANTERIOR).reduce((s, o) => {
  const est = estadoOperacion(o, base.pagos.filter((p) => p.operacionId === o.id), CIERRE_ANTERIOR)
  return est.cancelada ? s : s + est.saldoCapital * categoriaDe(est.diasMora).tasa
}, 0))
base.asientos.push({
  id: '', fecha: CIERRE_ANTERIOR, glosa: 'Provisión acumulada de cartera al cierre de octubre', origen: 'Provisión', referencia: 'PROV-2026-10',
  lineas: [{ cuenta: '5.4.01', debe: provisionInicial, haber: 0 }, { cuenta: '1.4.99', debe: 0, haber: provisionInicial }],
})
base.asientos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.referencia.localeCompare(b.referencia))
base.asientos.forEach((a, i) => { a.id = `AS-${String(i + 1).padStart(5, '0')}` })

// Últimos 12 meses cerrados y el mes en curso abierto.
const periodos: Periodo[] = Array.from({ length: 12 }, (_, i) => {
  const mes = monthKey(addMonths(HOY, -12 + i))
  return { mes, estado: 'Cerrado' as const, cerradoPor: USUARIA_DEMO.nombre, fecha: `${monthKey(addMonths(`${mes}-01`, 1))}-05` }
})
periodos.push({ mes: monthKey(HOY), estado: 'Abierto' })

export const db = {
  ...base,
  campanias: CAMPANIAS.map((c) => ({ ...c })),
  reglas: REGLAS.map((r) => ({ ...r })),
  flujos: FLUJOS_N8N.map((f) => ({ ...f })),
  planCuentas: PLAN_CUENTAS.map((c) => ({ ...c })),
  esquemas: ESQUEMAS.map((e) => ({ ...e, lineas: e.lineas.map((l) => ({ ...l })) })),
  periodos,
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
