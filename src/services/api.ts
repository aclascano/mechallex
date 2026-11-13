/**
 * Capa de servicios. Las pantallas solo hablan con estas funciones.
 * Hoy leen de `src/mocks/db.ts`; mañana pueden llamar a una API con fetch sin tocar las pantallas.
 */
import { round2 } from '../domain/amortizacion'
import { distribuirPago, estadoOperacion, TASA_MORA_DIARIA, TRAMOS } from '../domain/cartera'
import { addDays, addMonths, endOfMonth, monthKey, startOfMonth, type ISODate } from '../domain/fechas'
import type { Cliente, EstadoOperacion, MedioPago, Operacion, Pago, Promesa, Tramo } from '../domain/tipos'
import { HOY } from '../mocks/catalogos'
import { db, notificar } from '../mocks/db'
import { asientoDePago } from '../mocks/generar'

const LATENCIA = 140
const esperar = <T,>(valor: T): Promise<T> => new Promise((r) => setTimeout(() => r(valor), LATENCIA))

export const fechaCorte = () => HOY

// ── Vistas derivadas ────────────────────────────────────────────────────────
export interface OperacionVista extends Operacion, EstadoOperacion {
  cliente: Cliente
  tieneJuicio: boolean
}

const pagosDe = (opId: string) => db.pagos.filter((p) => p.operacionId === opId)

function vistaOperacion(op: Operacion, corte: ISODate = HOY): OperacionVista {
  const est = estadoOperacion(op, pagosDe(op.id), corte)
  return {
    ...op,
    ...est,
    cliente: db.clientes.find((c) => c.id === op.clienteId)!,
    tieneJuicio: db.juicios.some((j) => j.operacionId === op.id),
  }
}

function todasLasOperaciones(corte: ISODate = HOY) {
  return db.operaciones.filter((o) => o.fechaDesembolso <= corte).map((o) => vistaOperacion(o, corte))
}

function estadoPromesa(p: Promesa): Promesa['estado'] {
  const pagado = db.pagos.some((x) => x.operacionId === p.operacionId && x.fecha >= addDays(p.fechaCompromiso, -3) && x.fecha <= addDays(p.fechaCompromiso, 2))
  if (pagado) return 'Cumplida'
  return p.fechaCompromiso >= HOY ? 'Vigente' : 'Incumplida'
}

// ── Panel ───────────────────────────────────────────────────────────────────
export interface ResumenMes {
  mes: ISODate
  exigible: number
  recuperado: number
  saldo: number
  vencida: number
  morosidad: number
}

function resumenMensual(meses = 12): ResumenMes[] {
  const lista: ResumenMes[] = []
  for (let i = meses - 1; i >= 0; i--) {
    const inicio = startOfMonth(addMonths(HOY, -i))
    const fin = i === 0 ? HOY : endOfMonth(inicio)
    const mk = monthKey(inicio)
    const exigible = round2(db.operaciones.flatMap((o) => o.tabla).filter((c) => monthKey(c.fecha) === mk).reduce((s, c) => s + c.cuota, 0))
    const recuperado = round2(db.pagos.filter((p) => monthKey(p.fecha) === mk).reduce((s, p) => s + p.monto, 0))
    const ops = todasLasOperaciones(fin)
    const saldo = round2(ops.reduce((s, o) => s + o.saldoCapital, 0))
    const vencida = round2(ops.filter((o) => o.diasMora > 30).reduce((s, o) => s + o.saldoCapital, 0))
    lista.push({ mes: inicio, exigible, recuperado, saldo, vencida, morosidad: saldo ? vencida / saldo : 0 })
  }
  return lista
}

export async function obtenerPanel() {
  const ops = todasLasOperaciones()
  const vigentes = ops.filter((o) => !o.cancelada)
  const saldo = round2(vigentes.reduce((s, o) => s + o.saldoCapital, 0))
  const porTramo = TRAMOS.map((t) => {
    const del = vigentes.filter((o) => o.tramo === t.id)
    return { ...t, saldo: round2(del.reduce((s, o) => s + o.saldoCapital, 0)), operaciones: del.length }
  })
  const meses = resumenMensual(12)
  const actual = meses[meses.length - 1]
  const anterior = meses[meses.length - 2]
  const promesas = db.promesas.map((p) => ({ ...p, estado: estadoPromesa(p) }))
  const vigentesPromesas = promesas.filter((p) => p.estado === 'Vigente')
  const juicios = db.juicios
  const prioridad = vigentes
    .filter((o) => o.diasMora > 0)
    .sort((a, b) => b.valorVencido - a.valorVencido)
    .slice(0, 6)
  const campanias = obtenerCampaniasSync()
  return esperar({
    corte: HOY,
    saldo,
    operacionesVigentes: vigentes.length,
    clientesActivos: new Set(vigentes.map((o) => o.clienteId)).size,
    vencida: actual.vencida,
    morosidad: actual.morosidad,
    morosidadAnterior: anterior.morosidad,
    recuperadoMes: actual.recuperado,
    recuperadoAnterior: anterior.recuperado,
    exigibleMes: actual.exigible,
    porTramo,
    meses,
    promesasVigentes: { cantidad: vigentesPromesas.length, monto: round2(vigentesPromesas.reduce((s, p) => s + p.monto, 0)) },
    promesasProximas: [...vigentesPromesas].sort((a, b) => a.fechaCompromiso.localeCompare(b.fechaCompromiso)).slice(0, 3)
      .map((p) => ({ ...p, cliente: db.clientes.find((c) => c.id === p.clienteId)! })),
    promesasCumplidas: promesas.filter((p) => p.estado === 'Cumplida').length,
    promesasIncumplidas: promesas.filter((p) => p.estado === 'Incumplida').length,
    prioridad,
    juicios: {
      activos: juicios.length,
      cuantia: round2(juicios.reduce((s, j) => s + j.cuantia, 0)),
      costas: round2(juicios.reduce((s, j) => s + j.costas.reduce((a, c) => a + c.monto, 0), 0)),
      porEtapa: ['Preparación', 'Demanda', 'Citación', 'Audiencia', 'Sentencia', 'Ejecución', 'Embargo y remate'].map((e) => ({
        etapa: e, cantidad: juicios.filter((j) => j.etapa === e).length,
      })),
      proximas: [...juicios].filter((j) => j.proximaDiligencia).sort((a, b) => a.proximaDiligencia!.fecha.localeCompare(b.proximaDiligencia!.fecha)).slice(0, 3)
        .map((j) => ({ ...j, cliente: db.clientes.find((c) => c.id === j.clienteId)! })),
    },
    campanias: campanias.filter((c) => c.estado === 'Activa'),
  })
}

// ── Clientes ────────────────────────────────────────────────────────────────
export async function listarClientes() {
  const ops = todasLasOperaciones()
  return esperar(db.clientes.map((c) => {
    const propias = ops.filter((o) => o.clienteId === c.id)
    const peor = propias.reduce((m, o) => Math.max(m, o.diasMora), 0)
    return {
      ...c,
      operaciones: propias.length,
      saldo: round2(propias.reduce((s, o) => s + o.saldoCapital, 0)),
      vencido: round2(propias.reduce((s, o) => s + o.valorVencido, 0)),
      diasMora: peor,
      tramo: (propias.find((o) => o.diasMora === peor)?.tramo ?? 'al-dia') as Tramo,
    }
  }))
}

export async function obtenerCliente(id: string) {
  const cliente = db.clientes.find((c) => c.id === id)
  if (!cliente) return esperar(null)
  const operaciones = todasLasOperaciones().filter((o) => o.clienteId === id)
  const pagos = db.pagos.filter((p) => p.clienteId === id).slice().reverse()
  const promesas = db.promesas.filter((p) => p.clienteId === id).map((p) => ({ ...p, estado: estadoPromesa(p) }))
  const juicios = db.juicios.filter((j) => j.clienteId === id)
  return esperar({ cliente, operaciones, pagos, promesas, juicios })
}

// ── Operaciones ─────────────────────────────────────────────────────────────
export async function listarOperaciones() {
  return esperar(todasLasOperaciones())
}

export async function obtenerOperacion(id: string) {
  const op = db.operaciones.find((o) => o.id === id)
  if (!op) return esperar(null)
  return esperar({ ...vistaOperacion(op), pagos: pagosDe(id).slice().reverse(), juicio: db.juicios.find((j) => j.operacionId === id) })
}

// ── Pagos ───────────────────────────────────────────────────────────────────
export async function listarPagos() {
  return esperar(db.pagos.slice().reverse().map((p) => ({ ...p, cliente: db.clientes.find((c) => c.id === p.clienteId)! })))
}

export function previsualizarPago(operacionId: string, monto: number, fecha: ISODate = HOY) {
  const op = db.operaciones.find((o) => o.id === operacionId)!
  const previos = pagosDe(operacionId)
  const antes = estadoOperacion(op, previos, fecha)
  const mora = antes.diasMora > 3 ? round2(antes.valorVencido * TASA_MORA_DIARIA * antes.diasMora) : 0
  const neto = round2(Math.max(0, monto - mora))
  const moraCobrada = round2(Math.min(mora, monto))
  const { interes, capital, aplicado } = distribuirPago(op, previos, neto)
  const simulado: Pago = { id: 'tmp', operacionId, clienteId: op.clienteId, fecha, monto: round2(aplicado + moraCobrada), mora: moraCobrada, interes, capital, medio: 'Ventanilla', tipo: 'Cuota', referencia: '', conciliado: false }
  const despues = estadoOperacion(op, [...previos, simulado], fecha)
  return { antes, despues, mora: moraCobrada, interes, capital, aplicado: simulado.monto, excedente: round2(monto - simulado.monto) }
}

export async function registrarPago(input: { operacionId: string; monto: number; medio: MedioPago }) {
  const prev = previsualizarPago(input.operacionId, input.monto)
  const op = db.operaciones.find((o) => o.id === input.operacionId)!
  const pago: Pago = {
    id: `PG-${String(Math.max(...db.pagos.map((x) => Number(x.id.slice(3)))) + 1).padStart(5, '0')}`,
    operacionId: op.id,
    clienteId: op.clienteId,
    fecha: HOY,
    monto: prev.aplicado,
    mora: prev.mora,
    interes: prev.interes,
    capital: prev.capital,
    medio: input.medio,
    tipo: prev.despues.valorVencido > 0 && prev.antes.valorVencido > 0 ? 'Abono parcial' : 'Cuota',
    referencia: `DEMO-${Date.now().toString().slice(-6)}`,
    conciliado: false,
    registradoEnDemo: true,
  }
  db.pagos.push(pago)
  db.asientos.push({ ...asientoDePago(pago, db.asientos.length + 1) })
  notificar()
  return esperar(pago)
}

// ── Juicios ─────────────────────────────────────────────────────────────────
export async function listarJuicios() {
  return esperar(db.juicios.map((j) => ({
    ...j,
    cliente: db.clientes.find((c) => c.id === j.clienteId)!,
    operacion: vistaOperacion(db.operaciones.find((o) => o.id === j.operacionId)!),
    totalCostas: round2(j.costas.reduce((s, c) => s + c.monto, 0)),
  })))
}

// ── Cobranza automatizada ───────────────────────────────────────────────────
function obtenerCampaniasSync() {
  const mk = monthKey(HOY)
  const recuperadoMora = db.pagos.filter((p) => monthKey(p.fecha) === mk && (p.mora > 0 || p.tipo === 'Abono parcial')).reduce((s, p) => s + p.monto, 0)
  const recuperadoTotal = db.pagos.filter((p) => monthKey(p.fecha) === mk).reduce((s, p) => s + p.monto, 0)
  return db.campanias.map(({ participacion, ...c }) => ({
    ...c,
    recuperado: round2((c.tramos.includes('al-dia') ? recuperadoTotal - recuperadoMora : recuperadoMora) * participacion),
  }))
}

export async function obtenerCobranza() {
  const promesas = db.promesas.map((p) => ({ ...p, estado: estadoPromesa(p), cliente: db.clientes.find((c) => c.id === p.clienteId)! }))
  return esperar({ campanias: obtenerCampaniasSync(), reglas: db.reglas, flujos: db.flujos, promesas })
}

export async function alternarRegla(id: string) {
  const r = db.reglas.find((x) => x.id === id)
  if (r) r.activa = !r.activa
  notificar()
  return esperar(r)
}

export async function alternarFlujo(id: string) {
  const f = db.flujos.find((x) => x.id === id)
  if (f) f.activo = !f.activo
  notificar()
  return esperar(f)
}

// ── Contabilidad ────────────────────────────────────────────────────────────
export async function obtenerContabilidad() {
  const saldos = db.planCuentas.map((c) => {
    const debe = round2(db.asientos.flatMap((a) => a.lineas).filter((l) => l.cuenta === c.codigo).reduce((s, l) => s + l.debe, 0))
    const haber = round2(db.asientos.flatMap((a) => a.lineas).filter((l) => l.cuenta === c.codigo).reduce((s, l) => s + l.haber, 0))
    return { ...c, debe, haber, saldo: round2(c.naturaleza === 'Deudora' ? debe - haber : haber - debe) }
  })
  const carteraContable = saldos.find((s) => s.codigo === '1.4.01')!.saldo
  const carteraOperativa = round2(todasLasOperaciones().reduce((s, o) => s + o.saldoCapital, 0))
  const mk = monthKey(HOY)
  const pagosMes = db.pagos.filter((p) => monthKey(p.fecha) === mk)
  return esperar({
    asientos: db.asientos.slice().reverse(),
    saldos,
    cuadre: { carteraContable, carteraOperativa, diferencia: round2(carteraContable - carteraOperativa) },
    banco: db.banco,
    pagosMes: pagosMes.map((p) => ({ ...p, cliente: db.clientes.find((c) => c.id === p.clienteId)! })),
  })
}

// ── Reportes ────────────────────────────────────────────────────────────────
export async function obtenerReportes() {
  const ops = todasLasOperaciones().filter((o) => !o.cancelada)
  const agrupar = <K extends string>(clave: (o: OperacionVista) => K) => {
    const m = new Map<K, { saldo: number; vencida: number; n: number }>()
    ops.forEach((o) => {
      const k = clave(o)
      const v = m.get(k) ?? { saldo: 0, vencida: 0, n: 0 }
      v.saldo += o.saldoCapital
      if (o.diasMora > 30) v.vencida += o.saldoCapital
      v.n++
      m.set(k, v)
    })
    return [...m.entries()].map(([k, v]) => ({ clave: k, saldo: round2(v.saldo), vencida: round2(v.vencida), operaciones: v.n, morosidad: v.saldo ? v.vencida / v.saldo : 0 })).sort((a, b) => b.saldo - a.saldo)
  }
  const mk = monthKey(HOY)
  const porMedio = new Map<string, number>()
  db.pagos.filter((p) => p.fecha >= addMonths(startOfMonth(HOY), -2)).forEach((p) => porMedio.set(p.medio, (porMedio.get(p.medio) ?? 0) + p.monto))
  return esperar({
    meses: resumenMensual(12),
    porProducto: agrupar((o) => o.producto),
    porCiudad: agrupar((o) => o.cliente.ciudad),
    porGestor: agrupar((o) => o.cliente.gestor),
    porOrigen: agrupar((o) => o.origen),
    porMedio: [...porMedio.entries()].map(([medio, monto]) => ({ medio, monto: round2(monto) })).sort((a, b) => b.monto - a.monto),
    composicionMes: (() => {
      const ps = db.pagos.filter((p) => monthKey(p.fecha) === mk)
      return {
        capital: round2(ps.reduce((s, p) => s + p.capital, 0)),
        interes: round2(ps.reduce((s, p) => s + p.interes, 0)),
        mora: round2(ps.reduce((s, p) => s + p.mora, 0)),
      }
    })(),
  })
}

export type Panel = Awaited<ReturnType<typeof obtenerPanel>>
