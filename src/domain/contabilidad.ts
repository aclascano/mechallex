// Reglas contables: jerarquía del plan de cuentas, esquemas por evento y verificación de cuadre.
import { round2 } from './amortizacion'
import type { Asiento, Cuenta, EsquemaContable, LineaAsiento } from './tipos'

/** Cuenta padre por código: 1.4.01 → 1.4 → 1. */
export const padreDe = (codigo: string) => (codigo.includes('.') ? codigo.slice(0, codigo.lastIndexOf('.')) : null)
export const nivelDe = (codigo: string) => codigo.split('.').length

export const CONCEPTOS: Record<string, string> = {
  monto: 'Monto desembolsado',
  neto: 'Neto entregado al cliente',
  comision: 'Comisión de apertura',
  seguro: 'Prima de seguro',
  total: 'Total recibido',
  capital: 'Capital',
  interes: 'Interés',
  mora: 'Recargo por mora',
  costa: 'Valor de la costa',
  provision: 'Provisión del mes',
  saldo: 'Saldo castigado',
  conProvision: 'Parte cubierta con provisión',
  aGasto: 'Parte sin provisión (al gasto)',
}

/** Arma las líneas de un asiento aplicando el esquema del evento a los montos. Omite líneas en cero. */
export function lineasSegun(esquema: EsquemaContable, montos: Record<string, number>): LineaAsiento[] {
  return esquema.lineas
    .map((l) => {
      const v = round2(montos[l.concepto] ?? 0)
      return { cuenta: l.cuenta, debe: l.lado === 'Debe' ? v : 0, haber: l.lado === 'Haber' ? v : 0 }
    })
    .filter((l) => l.debe > 0 || l.haber > 0)
}

export const invertir = (lineas: LineaAsiento[]) => lineas.map((l) => ({ cuenta: l.cuenta, debe: l.haber, haber: l.debe }))

export function cuadra(a: Pick<Asiento, 'lineas'>) {
  const d = round2(a.lineas.reduce((s, l) => s + l.debe, 0))
  const h = round2(a.lineas.reduce((s, l) => s + l.haber, 0))
  return Math.abs(d - h) < 0.005
}

/** Siguiente código libre bajo un grupo: 1.4 → 1.4.02. */
export function siguienteCodigo(padre: string, plan: Cuenta[]) {
  const hijos = plan.filter((c) => padreDe(c.codigo) === padre).map((c) => Number(c.codigo.split('.').at(-1)))
  const n = (hijos.length ? Math.max(...hijos.filter((x) => x < 90)) : 0) + 1
  return `${padre}.${String(n).padStart(2, '0')}`
}
