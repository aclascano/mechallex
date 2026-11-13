/**
 * Capa de servicios. Las pantallas solo hablan con estas funciones.
 * Hoy leen de `src/mocks/db.ts`; mañana pueden llamar a una API con fetch sin tocar las pantallas.
 */
import { recalcular, round2, type ModoRecalculo } from '../domain/amortizacion'
import { distribuirPago, estadoOperacion, TASA_MORA_DIARIA, TRAMOS } from '../domain/cartera'
import { addDays, addMonths, endOfMonth, monthKey, startOfMonth, type ISODate } from '../domain/fechas'
import { diferencias, normalizar } from '../domain/clientes'
import { COBERTURA_MINIMA, saldosOperacion, tablaDevengo } from '../domain/operacion'
import { costos, primerVencimiento, tablaObligacion, validarPaso, PASOS_OBLIGACION, type DatosObligacion, type ProductoCredito } from '../domain/obligacion'
import type { CambioCliente, Cliente, DatosCliente, EstadoOperacion, GarantiasOperacion, MedioPago, Operacion, Pago, Promesa, Tramo } from '../domain/tipos'
import { dinero } from '../lib/formato'
import { CIUDADES, CONDICIONES_PRODUCTO, GESTORES, HOY, MEDIOS, PRODUCTOS, USUARIA_DEMO } from '../mocks/catalogos'
import { ACTIVIDADES, PROVINCIA_DE, RELACIONES } from '../mocks/fichas'
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
  const historial = db.historial.filter((h) => h.clienteId === id).sort((a, b) => b.fecha.localeCompare(a.fecha) || Number(b.id.slice(3)) - Number(a.id.slice(3)))
  return esperar({ cliente, operaciones, pagos, promesas, juicios, historial, garantiasPrestadas: garantiasPrestadas(id) })
}

/** Listas para formularios y filtros. */
export const catalogosCliente = {
  ciudades: CIUDADES,
  gestores: GESTORES,
  actividades: ACTIVIDADES,
  relaciones: RELACIONES,
  provinciaDe: (ciudad: string) => PROVINCIA_DE[ciudad] ?? '',
}

/** ¿La identificación ya pertenece a otro cliente? */
export function identificacionUsada(numero: string, exceptoId?: string) {
  return db.clientes.some((c) => c.cedula === numero && c.id !== exceptoId)
}

export async function obtenerDatosCliente(id: string) {
  const c = db.clientes.find((x) => x.id === id)
  return esperar(c ? structuredClone(c) : null)
}

function ahora() {
  const d = new Date()
  return `${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function registrarCambio(c: Omit<CambioCliente, 'id' | 'fecha' | 'usuario'>) {
  db.historial.push({ ...c, id: `HC-${db.historial.length + 1}`, fecha: ahora(), usuario: USUARIA_DEMO.nombre })
}

export async function crearCliente(datos: DatosCliente) {
  const d = normalizar(datos)
  if (identificacionUsada(d.cedula)) throw new Error('Ya existe un cliente con esta identificación.')
  const id = `CL-${Math.max(...db.clientes.map((c) => Number(c.id.slice(3)))) + 1}`
  const cliente: Cliente = { ...d, id, clienteDesde: HOY, estado: 'Activo' }
  db.clientes.push(cliente)
  registrarCambio({ clienteId: id, accion: 'Creación', cambios: [], nota: 'Alta del cliente desde la ficha.' })
  notificar()
  return esperar(cliente)
}

export async function actualizarCliente(id: string, datos: DatosCliente) {
  const i = db.clientes.findIndex((c) => c.id === id)
  if (i < 0) throw new Error('Cliente no encontrado.')
  const antes = db.clientes[i]
  const d = normalizar(datos)
  if (identificacionUsada(d.cedula, id)) throw new Error('Ya existe un cliente con esta identificación.')
  const cambios = diferencias(antes, d)
  db.clientes[i] = { ...antes, ...d }
  if (cambios.length) registrarCambio({ clienteId: id, accion: 'Edición', cambios })
  notificar()
  return esperar({ cliente: db.clientes[i], cambios: cambios.length })
}

/** Un cliente con saldo pendiente no se puede inactivar. */
export function bloqueoInactivar(id: string): string | null {
  const ops = todasLasOperaciones().filter((o) => o.clienteId === id && !o.cancelada)
  if (ops.length) return `Tiene ${ops.length === 1 ? 'una operación vigente' : `${ops.length} operaciones vigentes`}. Se puede inactivar cuando todas estén canceladas.`
  if (db.juicios.some((j) => j.clienteId === id)) return 'Tiene una causa judicial abierta.'
  return null
}

export async function cambiarEstadoCliente(id: string, activo: boolean, motivo: string) {
  const c = db.clientes.find((x) => x.id === id)
  if (!c) throw new Error('Cliente no encontrado.')
  if (!activo) {
    const b = bloqueoInactivar(id)
    if (b) throw new Error(b)
  }
  c.estado = activo ? 'Activo' : 'Inactivo'
  c.motivoInactivo = activo ? undefined : motivo
  registrarCambio({ clienteId: id, accion: activo ? 'Reactivación' : 'Inactivación', cambios: [{ campo: 'Estado', antes: activo ? 'Inactivo' : 'Activo', despues: c.estado }], nota: motivo || undefined })
  notificar()
  return esperar(c)
}

// ── Operaciones ─────────────────────────────────────────────────────────────
export async function listarOperaciones() {
  return esperar(todasLasOperaciones())
}

export interface MovimientoCuenta {
  fecha: ISODate
  tipo: 'desembolso' | 'vencimiento' | 'pago'
  concepto: string
  detalle: string
  capital: number
  interes: number
  mora: number
  total: number
  saldoCapital: number
  pendiente?: boolean
}

function estadoDeCuenta(op: Operacion, est: EstadoOperacion): MovimientoCuenta[] {
  const movs: Omit<MovimientoCuenta, 'saldoCapital'>[] = [
    { fecha: op.fechaDesembolso, tipo: 'desembolso', concepto: 'Desembolso', detalle: `${op.producto} a ${op.plazoMeses} meses`, capital: op.monto, interes: 0, mora: 0, total: op.monto },
  ]
  op.tabla.forEach((c, i) => {
    if (c.fecha > HOY) return
    const pagada = (est.aplicadoPorCuota[i] ?? 0) >= c.cuota - 0.005
    movs.push({
      fecha: c.fecha, tipo: 'vencimiento', concepto: `Vence cuota ${c.n}`, detalle: pagada ? 'Cubierta' : est.cancelada ? 'Precancelada' : 'Pendiente',
      capital: c.capital, interes: c.interes, mora: 0, total: c.cuota, pendiente: !pagada && !est.cancelada,
    })
  })
  pagosDe(op.id).forEach((p) => movs.push({
    fecha: p.fecha, tipo: 'pago', concepto: p.tipo === 'Cuota' ? 'Pago de cuota' : p.tipo, detalle: `${p.medio} · ${p.referencia}`,
    capital: -p.capital, interes: -p.interes, mora: -p.mora, total: -p.monto,
  }))
  const orden = { desembolso: 0, vencimiento: 1, pago: 2 }
  let saldo = 0
  return movs
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || orden[a.tipo] - orden[b.tipo])
    .map((m) => {
      if (m.tipo !== 'vencimiento') saldo = round2(saldo + m.capital)
      return { ...m, saldoCapital: saldo }
    })
}

const NOMBRE_DOC: Record<string, string> = {
  Hipoteca: 'Escritura de hipoteca inscrita',
  'Prenda comercial': 'Contrato de prenda comercial',
  'Prenda vehicular': 'Contrato de reserva de dominio',
  'Ahorro encajado': 'Autorización de encaje',
}

export interface Documento { nombre: string; categoria: string; fecha: ISODate; estado: 'Recibido' | 'Pendiente' }

function documentosDe(op: Operacion, g: GarantiasOperacion | undefined): Documento[] {
  const n = Number(op.id.slice(-4))
  const docs: Documento[] = [
    { nombre: 'Solicitud de crédito', categoria: 'Crédito', fecha: addDays(op.fechaDesembolso, -12), estado: 'Recibido' },
    { nombre: 'Pagaré a la orden', categoria: 'Crédito', fecha: op.fechaDesembolso, estado: 'Recibido' },
    { nombre: 'Contrato de mutuo', categoria: 'Crédito', fecha: op.fechaDesembolso, estado: 'Recibido' },
    { nombre: 'Tabla de amortización firmada', categoria: 'Crédito', fecha: op.fechaDesembolso, estado: n % 9 === 4 ? 'Pendiente' : 'Recibido' },
  ]
  if (op.producto === 'Consumo' || op.producto === 'Vivienda') {
    docs.push({ nombre: 'Póliza de seguro de desgravamen', categoria: 'Seguros', fecha: op.fechaDesembolso, estado: n % 7 === 3 ? 'Pendiente' : 'Recibido' })
  }
  g?.reales.forEach((r) => {
    docs.push({ nombre: NOMBRE_DOC[r.tipo], categoria: 'Garantías', fecha: r.fechaAvaluo, estado: r.estado === 'En trámite' ? 'Pendiente' : 'Recibido' })
    if (r.tipo !== 'Ahorro encajado') docs.push({ nombre: `Informe de avalúo (${r.tipo.toLowerCase()})`, categoria: 'Garantías', fecha: r.fechaAvaluo, estado: 'Recibido' })
  })
  g?.garantes.forEach((x) => docs.push({ nombre: `Cédula y firma del garante ${x.nombre}`, categoria: 'Garantes', fecha: op.fechaDesembolso, estado: 'Recibido' }))
  return docs
}

/** Fecha en que quedó cubierta cada cuota, recorriendo los pagos en orden. */
function fechasDePago(op: Operacion): (ISODate | null)[] {
  const fechas: (ISODate | null)[] = op.tabla.map(() => null)
  let acumulado = 0
  let objetivo = 0
  let k = 0
  for (const p of pagosDe(op.id)) {
    if (p.tipo === 'Abono a capital') continue
    acumulado = round2(acumulado + p.interes + p.capital)
    if (p.tipo === 'Precancelación') {
      for (; k < op.tabla.length; k++) fechas[k] = p.fecha
      break
    }
    while (k < op.tabla.length && acumulado >= round2(objetivo + op.tabla[k].cuota) - 0.005) {
      objetivo = round2(objetivo + op.tabla[k].cuota)
      fechas[k++] = p.fecha
    }
  }
  return fechas
}

export const mediosPago = MEDIOS
export const usuariaActual = USUARIA_DEMO

// ── Nueva obligación ────────────────────────────────────────────────────────
export const catalogoProductos: ProductoCredito[] = PRODUCTOS.map((p) => ({ ...p, ...CONDICIONES_PRODUCTO[p.id] }))

/** Deudor con su exposición actual y, si corresponde, por qué no se le puede prestar. */
export function datosDeudor(clienteId: string) {
  const cliente = db.clientes.find((c) => c.id === clienteId)
  if (!cliente) return null
  const ops = todasLasOperaciones().filter((o) => o.clienteId === clienteId && !o.cancelada)
  const peorMora = ops.reduce((m, o) => Math.max(m, o.diasMora), 0)
  const exposicion = {
    saldo: round2(ops.reduce((s, o) => s + o.saldoCapital, 0)),
    peorMora,
    cuotasVigentes: round2(ops.reduce((s, o) => s + (o.proximaCuota?.valor ?? 0), 0)),
    operaciones: ops.length,
  }
  let bloqueo: string | null = null
  if (cliente.estado === 'Inactivo') bloqueo = 'El cliente está inactivo. Reactívalo desde su ficha para otorgarle crédito.'
  else if (peorMora > 30) bloqueo = `Tiene una operación con ${peorMora} días de mora. No se otorga crédito con mora mayor a 30 días.`
  else if (db.juicios.some((j) => j.clienteId === clienteId)) bloqueo = 'Tiene una causa judicial abierta.'
  return { cliente, exposicion, bloqueo }
}

export async function crearObligacion(d: DatosObligacion) {
  const p = catalogoProductos.find((x) => x.id === d.producto)!
  const deudor = datosDeudor(d.clienteId)
  if (!deudor) throw new Error('Deudor no encontrado.')
  for (const paso of PASOS_OBLIGACION) {
    const e = validarPaso(paso.id, d, p, { cliente: deudor.cliente, bloqueoDeudor: deudor.bloqueo })
    const primero = Object.values(e)[0]
    if (primero) throw new Error(`${paso.titulo}: ${primero}`)
  }
  const correlativo = Math.max(...db.operaciones.map((o) => Number(o.id.slice(-4)))) + 1
  const c = costos(d, p)
  const op: Operacion = {
    id: `OP-${HOY.slice(0, 4)}-${String(correlativo).padStart(4, '0')}`,
    clienteId: d.clienteId,
    producto: d.producto,
    origen: 'Propia',
    monto: d.monto,
    tasaAnual: d.tasaAnual,
    plazoMeses: d.plazoMeses,
    sistema: d.sistema,
    fechaDesembolso: HOY,
    primerVencimiento: primerVencimiento(HOY, d.diaPago),
    graciaMeses: d.graciaMeses,
    tabla: tablaObligacion(d, HOY),
    originacion: { ...c, medio: d.medio, cuentaDestino: d.cuentaDestino, aprobadaPor: USUARIA_DEMO.nombre, observacion: d.observacion },
  }
  db.operaciones.push(op)
  let nG = db.garantias.flatMap((g) => g.garantes).length + 1
  let nR = db.garantias.flatMap((g) => g.reales).length + 1
  db.garantias.push({
    operacionId: op.id,
    garantes: d.garantes.map((g) => ({ ...g, id: `GA-${nG++}` })),
    reales: d.reales.map((r) => ({ ...r, id: `GR-${nR++}`, estado: r.tipo === 'Hipoteca' ? 'En trámite' : 'Constituida' })),
  })
  const lineas = [
    { cuenta: '1.4.01', debe: op.monto, haber: 0 },
    { cuenta: '1.1.01', debe: 0, haber: c.neto },
    { cuenta: '4.1.03', debe: 0, haber: c.comision },
    { cuenta: '2.1.01', debe: 0, haber: c.seguro },
  ].filter((l) => l.debe > 0 || l.haber > 0)
  db.asientos.push({
    id: `AS-${String(db.asientos.length + 1).padStart(5, '0')}`, fecha: HOY, glosa: `Desembolso ${op.producto.toLowerCase()} ${op.id}`,
    origen: 'Desembolso', referencia: op.id, lineas,
  })
  notificar()
  return esperar(op)
}

function garantiasDe(opId: string, saldo: number) {
  const g = db.garantias.find((x) => x.operacionId === opId) ?? { operacionId: opId, garantes: [], reales: [] }
  const valorReal = round2(g.reales.filter((r) => r.estado !== 'Liberada').reduce((s, r) => s + r.valorAvaluo, 0))
  return { ...g, valorReal, cobertura: saldo > 0 ? valorReal / saldo : 0 }
}

export async function obtenerOperacion(id: string) {
  const op = db.operaciones.find((o) => o.id === id)
  if (!op) return esperar(null)
  const v = vistaOperacion(op)
  const g = garantiasDe(id, v.saldoCapital)
  return esperar({
    ...v,
    pagos: pagosDe(id).slice().reverse(),
    juicio: db.juicios.find((j) => j.operacionId === id),
    saldos: saldosOperacion(op, v, HOY),
    devengo: tablaDevengo(op, v, HOY),
    garantias: g,
    coberturaMinima: COBERTURA_MINIMA[op.producto],
    estadoCuenta: estadoDeCuenta(op, v),
    documentos: documentosDe(op, g),
    fechasPago: fechasDePago(op),
    promesas: db.promesas.filter((p) => p.operacionId === id).map((p) => ({ ...p, estado: estadoPromesa(p) })),
  })
}

/** Operaciones en las que el cliente es garante. */
function garantiasPrestadas(clienteId: string) {
  return db.garantias
    .filter((g) => g.garantes.some((x) => x.clienteId === clienteId))
    .map((g) => ({
      operacion: vistaOperacion(db.operaciones.find((o) => o.id === g.operacionId)!),
      relacion: g.garantes.find((x) => x.clienteId === clienteId)!.relacion,
    }))
}

// ── Precancelación y abono a capital ───────────────────────────────────────
export function liquidacion(operacionId: string) {
  const op = db.operaciones.find((o) => o.id === operacionId)!
  return saldosOperacion(op, estadoOperacion(op, pagosDe(op.id), HOY), HOY)
}

function nuevoIdPago() {
  return `PG-${String(Math.max(...db.pagos.map((x) => Number(x.id.slice(3)))) + 1).padStart(5, '0')}`
}
const referenciaDemo = () => `DEMO-${Date.now().toString().slice(-6)}`

export async function precancelar(input: { operacionId: string; medio: MedioPago }) {
  const op = db.operaciones.find((o) => o.id === input.operacionId)!
  const est = estadoOperacion(op, pagosDe(op.id), HOY)
  if (est.cancelada) throw new Error('La operación ya está cancelada.')
  const s = saldosOperacion(op, est, HOY)
  const pago: Pago = {
    id: nuevoIdPago(), operacionId: op.id, clienteId: op.clienteId, fecha: HOY,
    monto: s.liquidacion, mora: s.mora, interes: round2(s.interesVencido + s.interesEnCurso), capital: est.saldoCapital,
    medio: input.medio, tipo: 'Precancelación', referencia: referenciaDemo(), conciliado: false, registradoEnDemo: true,
  }
  db.pagos.push(pago)
  db.asientos.push(asientoDePago(pago, db.asientos.length + 1))
  db.garantias.find((x) => x.operacionId === op.id)?.reales.forEach((r) => { r.estado = 'Liberada' })
  notificar()
  return esperar(pago)
}

/** Simula un abono extraordinario a capital. Solo se permite con la operación al día. */
export function simularAbono(operacionId: string, monto: number, modo: ModoRecalculo) {
  const op = db.operaciones.find((o) => o.id === operacionId)!
  const est = estadoOperacion(op, pagosDe(op.id), HOY)
  const despuesDe = op.tabla.findIndex((c, i) => (est.aplicadoPorCuota[i] ?? 0) < c.cuota - 0.005)
  const siguiente = despuesDe >= 0 ? op.tabla[despuesDe] : undefined
  const maximo = round2(est.saldoCapital - 1)
  let bloqueo: string | null = null
  if (est.cancelada) bloqueo = 'La operación ya está cancelada.'
  else if (est.valorVencido > 0) bloqueo = `Tiene ${dinero(est.valorVencido)} vencidos. Primero debe ponerse al día.`
  else if (!siguiente) bloqueo = 'No quedan cuotas pendientes.'
  else if ((est.aplicadoPorCuota[despuesDe] ?? 0) > 0) bloqueo = `La cuota ${siguiente.n} tiene un abono parcial. Complétala antes de abonar a capital.`
  else if (!(monto > 0)) bloqueo = 'Escribe un monto mayor que cero.'
  else if (monto > maximo) bloqueo = `El abono no puede superar ${dinero(maximo)}. Para pagar todo, usa la precancelación.`
  if (bloqueo || !siguiente) return { bloqueo, maximo }
  const params = { monto: op.monto, tasaAnual: op.tasaAnual, plazoMeses: op.tabla.length, sistema: op.sistema, fechaDesembolso: op.fechaDesembolso, primerVencimiento: op.primerVencimiento, graciaMeses: op.graciaMeses }
  const tabla = recalcular(params, op.tabla, despuesDe, monto, modo)
  const antes = op.tabla.slice(despuesDe)
  const despues = tabla.slice(despuesDe)
  return {
    bloqueo: null,
    maximo,
    tabla,
    desde: siguiente.n,
    cuotaAntes: antes[0].cuota,
    cuotaDespues: despues[0]?.cuota ?? 0,
    plazoAntes: antes.length,
    plazoDespues: despues.length,
    interesAhorrado: round2(antes.reduce((s, c) => s + c.interes, 0) - despues.reduce((s, c) => s + c.interes, 0)),
  }
}

export async function abonarCapital(input: { operacionId: string; monto: number; modo: ModoRecalculo; medio: MedioPago }) {
  const sim = simularAbono(input.operacionId, input.monto, input.modo)
  if (sim.bloqueo !== null || !sim.tabla) throw new Error(sim.bloqueo ?? 'No se pudo calcular el abono.')
  const op = db.operaciones.find((o) => o.id === input.operacionId)!
  const pago: Pago = {
    id: nuevoIdPago(), operacionId: op.id, clienteId: op.clienteId, fecha: HOY, monto: round2(input.monto), mora: 0, interes: 0, capital: round2(input.monto),
    medio: input.medio, tipo: 'Abono a capital', referencia: referenciaDemo(), conciliado: false, registradoEnDemo: true,
  }
  op.recalculos = [...(op.recalculos ?? []), {
    fecha: HOY, pagoId: pago.id, abono: pago.monto, modo: input.modo,
    cuotaAntes: sim.cuotaAntes, cuotaDespues: sim.cuotaDespues, plazoAntes: sim.plazoAntes, plazoDespues: sim.plazoDespues,
  }]
  op.tabla = sim.tabla
  db.pagos.push(pago)
  db.asientos.push(asientoDePago(pago, db.asientos.length + 1))
  notificar()
  return esperar(pago)
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
    id: nuevoIdPago(),
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
