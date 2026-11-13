import { generarTabla, round2 } from '../domain/amortizacion'
import { distribuirPago, estadoOperacion, TASA_MORA_DIARIA } from '../domain/cartera'
import { addDays, addMonths, diffDays, monthKey, type ISODate } from '../domain/fechas'
import type {
  Asiento, Cliente, Costa, EtapaJuicio, EventoJuicio, Juicio, MedioPago, MovimientoBanco, Operacion, Pago, Producto, Promesa,
} from '../domain/tipos'
import { ABOGADOS, APELLIDOS, CIUDADES, crearRng, GESTORES, HOY, MEDIOS, NEGOCIOS, NOMBRES, PRODUCTOS } from './catalogos'
import { enriquecerCliente, generarHistorial } from './fichas'

const rng = crearRng(20261113)

type Perfil = 'puntual' | 'atrasado' | 'irregular'

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')
}

// ── Clientes ────────────────────────────────────────────────────────────────
function generarClientes(n: number): Cliente[] {
  const usados = new Set<string>()
  const lista: Cliente[] = []
  for (let i = 0; i < n; i++) {
    const esNegocio = i % 6 === 5 && lista.filter((c) => c.segmento !== 'Personas').length < NEGOCIOS.length
    let nombre = ''
    if (esNegocio) {
      nombre = NEGOCIOS[lista.filter((c) => c.segmento !== 'Personas').length]
    } else {
      do {
        nombre = `${rng.pick(NOMBRES)} ${rng.pick(APELLIDOS)} ${rng.pick(APELLIDOS)}`
      } while (usados.has(nombre))
    }
    usados.add(nombre)
    const provincia = String(rng.int(1, 24)).padStart(2, '0')
    const cedula = provincia + String(rng.int(10_000_000, 99_999_999))
    const ciudad = rng.chance(0.4) ? 'Quito' : rng.pick(CIUDADES)
    lista.push(enriquecerCliente({
      id: `CL-${String(1001 + i)}`,
      nombre,
      cedula: esNegocio ? cedula + '001' : cedula,
      ciudad,
      telefono: `09${rng.int(80, 99)} ${rng.int(100, 999)} ${rng.int(100, 999)}`,
      email: `${slug(nombre.split(' ').slice(0, 2).join(' '))}@correo.example`,
      segmento: esNegocio ? (rng.chance(0.5) ? 'Pyme' : 'Microempresa') : 'Personas',
      gestor: rng.pick(GESTORES),
      clienteDesde: addDays('2019-01-15', rng.int(0, 1500)),
    }))
  }
  return lista
}

// ── Operaciones y pagos ─────────────────────────────────────────────────────
interface Semilla {
  op: Operacion
  perfil: Perfil
  mesesSinPagar: number
}

const ATRASOS = [1, 6, 2, 9, 1, 5, 12, 3, 7, 1, 15, 4, 8, 3, 10, 2, 6, 11, 3, 5]

function generarOperaciones(clientes: Cliente[]): Semilla[] {
  const semillas: Semilla[] = []
  let atrasados = 0
  let correlativo = 1
  clientes.forEach((cli, idx) => {
    const cuantas = idx % 5 === 0 ? 2 : 1
    for (let k = 0; k < cuantas; k++) {
      const prod = cli.segmento === 'Personas'
        ? rng.pick(PRODUCTOS.filter((p) => p.id !== 'Comercial'))
        : rng.pick(PRODUCTOS.filter((p) => p.id === 'Comercial' || p.id === 'Microcrédito'))
      const plazo = Math.round(rng.int(prod.plazo[0], prod.plazo[1]) / 6) * 6
      const monto = Math.round(rng.range(prod.monto[0], prod.monto[1]) / 50) * 50
      // Desembolsos entre jun 2023 y oct 2026, sin pasar del plazo
      const mesesAtras = rng.int(1, Math.min(40, plazo - 2))
      const fechaDesembolso = addDays(addMonths(HOY, -mesesAtras), rng.int(-12, 12))
      const sistema = prod.id === 'Vivienda' || rng.chance(0.3) ? 'aleman' : 'frances'
      const tasaAnual = round2(rng.range(prod.tasa[0], prod.tasa[1]))
      const anio = fechaDesembolso.slice(0, 4)
      const params = { monto, tasaAnual, plazoMeses: plazo, sistema, fechaDesembolso } as const
      const op: Operacion = {
        id: `OP-${anio}-${String(correlativo++).padStart(4, '0')}`,
        clienteId: cli.id,
        producto: prod.id as Producto,
        origen: rng.chance(0.28) ? 'Cedida' : 'Propia',
        ...params,
        tabla: generarTabla(params),
      }
      const r = rng.next()
      const vencidas = op.tabla.filter((c) => c.fecha < HOY).length
      let perfil: Perfil = r < 0.78 ? 'puntual' : r < 0.92 ? 'atrasado' : 'irregular'
      // Atrasos repartidos para cubrir todos los tramos de antigüedad y etapas judiciales:
      // solo se consume el siguiente atraso cuando la operación es lo bastante antigua para tenerlo.
      let mesesSinPagar = 0
      if (perfil === 'atrasado') {
        const deseado = ATRASOS[atrasados % ATRASOS.length]
        if (deseado <= vencidas - 1) {
          mesesSinPagar = deseado
          atrasados++
        } else perfil = 'puntual'
      }
      semillas.push({ op, perfil, mesesSinPagar })
    }
  })
  return semillas
}

let correlativoPago = 1

function crearPago(op: Operacion, previos: Pago[], fecha: ISODate, montoNeto: number, medio: MedioPago, tipo: Pago['tipo']): Pago | null {
  const est = estadoOperacion(op, previos, addDays(fecha, -1))
  const { interes, capital, aplicado } = distribuirPago(op, previos, montoNeto)
  if (aplicado <= 0) return null
  const mora = est.diasMora > 3 ? round2(est.valorVencido * TASA_MORA_DIARIA * est.diasMora) : 0
  return {
    id: `PG-${String(correlativoPago++).padStart(5, '0')}`,
    operacionId: op.id,
    clienteId: op.clienteId,
    fecha,
    monto: round2(aplicado + mora),
    mora,
    interes,
    capital,
    medio,
    tipo,
    referencia: `${medio === 'Ventanilla' ? 'VEN' : medio === 'Transferencia' ? 'TRF' : medio === 'Débito automático' ? 'DEB' : medio === 'Corresponsal' ? 'COR' : 'WEB'}-${rng.int(100000, 999999)}`,
    conciliado: true,
  }
}

function generarPagos(s: Semilla): Pago[] {
  const { op, perfil, mesesSinPagar } = s
  const pagos: Pago[] = []
  const medioHabitual = rng.pick(MEDIOS) as MedioPago
  const vencidas = op.tabla.filter((c) => c.fecha <= HOY)
  const aPagar = perfil === 'atrasado' ? vencidas.length - mesesSinPagar : vencidas.length

  const push = (fecha: ISODate, monto: number, tipo: Pago['tipo']) => {
    if (fecha > HOY) return
    const medio = rng.chance(0.75) ? medioHabitual : (rng.pick(MEDIOS) as MedioPago)
    const p = crearPago(op, pagos, fecha, monto, medio, tipo)
    if (p) pagos.push(p)
  }

  for (let i = 0; i < aPagar; i++) {
    const c = vencidas[i]
    if (perfil === 'puntual') push(addDays(c.fecha, rng.int(-4, 2)), c.cuota, 'Cuota')
    else if (perfil === 'atrasado') push(addDays(c.fecha, rng.int(0, 9)), c.cuota, 'Cuota')
    else {
      // irregular: paga tarde, a veces junta dos cuotas, a veces deja un abono parcial
      if (i % 5 === 3 && i + 1 < aPagar) continue
      const dobles = i % 5 === 4 ? 2 : 1
      const monto = vencidas.slice(i - dobles + 1, i + 1).reduce((acc, x) => acc + x.cuota, 0)
      push(addDays(c.fecha, rng.int(6, 34)), round2(monto), 'Cuota')
    }
  }

  // Abonos parciales recientes de deudores en mora
  if (perfil === 'irregular' && vencidas.length > 0) {
    const ult = vencidas[vencidas.length - 1]
    if (rng.chance(0.6)) push(addDays(HOY, -rng.int(1, 20)), round2(ult.cuota * rng.range(0.25, 0.6)), 'Abono parcial')
  }
  if (perfil === 'atrasado' && mesesSinPagar > 1 && mesesSinPagar < 8 && rng.chance(0.4)) {
    const ref = vencidas[Math.max(0, vencidas.length - 1)]
    push(addDays(HOY, -rng.int(2, 40)), round2(ref.cuota * rng.range(0.2, 0.5)), 'Abono parcial')
  }

  pagos.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return pagos
}

// ── Juicios ─────────────────────────────────────────────────────────────────
const ETAPAS_JUICIO: { etapa: EtapaJuicio; desde: number }[] = [
  { etapa: 'Preparación', desde: 0 },
  { etapa: 'Demanda', desde: 18 },
  { etapa: 'Citación', desde: 45 },
  { etapa: 'Audiencia', desde: 95 },
  { etapa: 'Sentencia', desde: 150 },
  { etapa: 'Ejecución', desde: 205 },
  { etapa: 'Embargo y remate', desde: 290 },
]

const JUZGADOS: Record<string, string> = {
  Quito: 'Unidad Judicial Civil de Quito',
  Guayaquil: 'Unidad Judicial Civil de Guayaquil',
  Cuenca: 'Unidad Judicial Civil de Cuenca',
}

function generarJuicio(op: Operacion, cli: Cliente, pagos: Pago[], n: number): Juicio | null {
  const est = estadoOperacion(op, pagos, HOY)
  if (est.diasMora <= 120) return null
  const inicio = addDays(HOY, -(est.diasMora - 121))
  const transcurrido = diffDays(HOY, inicio)
  let idx = 0
  ETAPAS_JUICIO.forEach((e, i) => { if (transcurrido >= e.desde) idx = i })
  const etapa = ETAPAS_JUICIO[idx].etapa

  const interesVencido = op.tabla.reduce((s, c, i) => (c.fecha < HOY ? s + Math.max(0, c.interes - est.aplicadoPorCuota[i]) : s), 0)
  const cuantia = round2(est.saldoCapital + interesVencido)

  const f = (d: number) => addDays(inicio, d + (n % 4))
  const eventos: EventoJuicio[] = [{ fecha: f(0), titulo: 'Expediente abierto', detalle: `Operación ${op.id} pasa a cobro judicial con ${est.diasMora > 0 ? 121 : 0} días de mora.` }]
  const costas: Costa[] = []
  if (idx >= 1) {
    eventos.push({ fecha: f(18), titulo: 'Demanda presentada', detalle: 'Procedimiento ejecutivo con pagaré a la orden como título.' })
    costas.push({ concepto: 'Honorarios por demanda', fecha: f(18), monto: round2(Math.max(350, cuantia * 0.04)) })
    costas.push({ concepto: 'Reconocimiento de firmas', fecha: f(16), monto: 42 })
  }
  if (idx >= 2) {
    eventos.push({ fecha: f(45), titulo: 'Calificación y citación', detalle: 'Citación por boletas en el domicilio registrado.' })
    costas.push({ concepto: 'Citación por boletas', fecha: f(47), monto: 30 })
  }
  if (idx >= 3) {
    eventos.push({ fecha: f(95), titulo: 'Audiencia única', detalle: 'Se fija audiencia; el deudor no presenta excepciones.' })
    costas.push({ concepto: 'Honorarios por audiencia', fecha: f(95), monto: 260 })
  }
  if (idx >= 4) eventos.push({ fecha: f(150), titulo: 'Sentencia', detalle: 'Sentencia favorable: se ordena el pago de capital, intereses y costas.' })
  if (idx >= 5) {
    eventos.push({ fecha: f(205), titulo: 'Mandamiento de ejecución', detalle: 'Se dispone el pago en cinco días o la dimisión de bienes.' })
    costas.push({ concepto: 'Perito avaluador', fecha: f(220), monto: 310 })
  }
  if (idx >= 6) {
    eventos.push({ fecha: f(290), titulo: 'Embargo de bienes', detalle: 'Embargo de vehículo; se designa depositario judicial.' })
    costas.push({ concepto: 'Depositario judicial', fecha: f(292), monto: 220 })
    costas.push({ concepto: 'Publicación de remate', fecha: f(305), monto: 165 })
  }
  const siguiente = ETAPAS_JUICIO[idx + 1]
  const anio = inicio.slice(0, 4)
  return {
    id: `JU-${String(n + 1).padStart(3, '0')}`,
    numeroCausa: `17${rng.int(200, 299)}-${anio}-${String(rng.int(1000, 9999)).padStart(5, '0')}`,
    operacionId: op.id,
    clienteId: cli.id,
    etapa,
    juzgado: JUZGADOS[cli.ciudad] ?? `Unidad Judicial Civil de ${cli.ciudad}`,
    abogado: ABOGADOS[n % ABOGADOS.length],
    fechaInicio: inicio,
    cuantia,
    costas: costas.filter((c) => c.fecha <= HOY).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    eventos: eventos.filter((e) => e.fecha <= HOY),
    proximaDiligencia: siguiente
      ? { fecha: addDays(HOY, rng.int(3, 28)), descripcion: siguiente.etapa === 'Demanda' ? 'Presentar demanda' : `Siguiente etapa: ${siguiente.etapa.toLowerCase()}` }
      : { fecha: addDays(HOY, rng.int(5, 30)), descripcion: 'Señalamiento de fecha de remate' },
  }
}

// ── Promesas ────────────────────────────────────────────────────────────────
function generarPromesas(ops: Operacion[], pagos: Pago[]): Promesa[] {
  const lista: Promesa[] = []
  ops.forEach((op) => {
    const ps = pagos.filter((p) => p.operacionId === op.id)
    const est = estadoOperacion(op, ps, HOY)
    if (est.diasMora === 0 || est.diasMora > 150 || !rng.chance(0.7)) return
    const abono = ps.find((p) => p.tipo === 'Abono parcial')
    const fecha = abono && rng.chance(0.7) ? addDays(abono.fecha, rng.int(-2, 0)) : addDays(HOY, rng.int(-10, 18))
    const monto = abono ? round2(abono.monto + rng.int(0, 15)) : round2(Math.min(est.valorVencido, est.valorVencido * rng.range(0.4, 1)))
    lista.push({
      id: `PR-${String(lista.length + 1).padStart(3, '0')}`,
      operacionId: op.id,
      clienteId: op.clienteId,
      fechaCompromiso: fecha,
      monto,
      canal: rng.pick(['Llamada', 'WhatsApp', 'SMS', 'Correo'] as const),
      estado: 'Vigente', // se deriva en los servicios a partir de los pagos
    })
  })
  return lista
}

// ── Contabilidad ────────────────────────────────────────────────────────────
export const CAPITAL_INICIAL = 2_400_000

export function asientoDePago(p: Pago, n: number): Asiento {
  const lineas = [
    { cuenta: '1.1.01', debe: p.monto, haber: 0 },
    { cuenta: '1.4.01', debe: 0, haber: p.capital },
    { cuenta: '4.1.01', debe: 0, haber: p.interes },
  ]
  if (p.mora > 0) lineas.push({ cuenta: '4.1.02', debe: 0, haber: p.mora })
  return { id: `AS-${String(n).padStart(5, '0')}`, fecha: p.fecha, glosa: `Cobro ${p.tipo.toLowerCase()} ${p.operacionId}`, origen: 'Pago', referencia: p.id, lineas: lineas.filter((l) => l.debe > 0 || l.haber > 0) }
}

function generarAsientos(ops: Operacion[], pagos: Pago[], juicios: Juicio[]): Asiento[] {
  const base: Omit<Asiento, 'id'>[] = []
  base.push({
    fecha: '2023-01-02', glosa: 'Aporte de capital inicial', origen: 'Ajuste', referencia: 'APERTURA',
    lineas: [{ cuenta: '1.1.01', debe: CAPITAL_INICIAL, haber: 0 }, { cuenta: '3.1.01', debe: 0, haber: CAPITAL_INICIAL }],
  })
  ops.forEach((op) => base.push({
    fecha: op.fechaDesembolso, glosa: `Desembolso ${op.producto.toLowerCase()} ${op.id}`, origen: 'Desembolso', referencia: op.id,
    lineas: [{ cuenta: '1.4.01', debe: op.monto, haber: 0 }, { cuenta: '1.1.01', debe: 0, haber: op.monto }],
  }))
  juicios.forEach((j) => j.costas.forEach((c) => base.push({
    fecha: c.fecha, glosa: `${c.concepto} · causa ${j.numeroCausa}`, origen: 'Costas judiciales', referencia: j.id,
    lineas: [{ cuenta: '5.1.01', debe: c.monto, haber: 0 }, { cuenta: '1.1.01', debe: 0, haber: c.monto }],
  })))
  const conPagos = [...base.map((a) => ({ ...a, id: '' })), ...pagos.map((p) => asientoDePago(p, 0))]
  conPagos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.referencia.localeCompare(b.referencia))
  return conPagos.map((a, i) => ({ ...a, id: `AS-${String(i + 1).padStart(5, '0')}` }))
}

function generarBanco(ops: Operacion[], pagos: Pago[], juicios: Juicio[]): MovimientoBanco[] {
  const mes = monthKey(HOY)
  const movs: MovimientoBanco[] = []
  const delMes = pagos.filter((p) => monthKey(p.fecha) === mes)
  const enTransito = new Set(delMes.filter((p) => p.fecha >= addDays(HOY, -2) || p.medio === 'Ventanilla').slice(-4).map((p) => p.id))
  delMes.forEach((p) => {
    if (enTransito.has(p.id)) { p.conciliado = false; return }
    const diferido = p.medio === 'Transferencia' || p.medio === 'Pago web' ? 0 : 1
    const fecha = addDays(p.fecha, diferido) > HOY ? p.fecha : addDays(p.fecha, diferido)
    movs.push({ id: `BK-${movs.length + 1}`, fecha, descripcion: `${p.medio.toUpperCase()} ${p.referencia}`, monto: p.monto, pagoId: p.id })
  })
  ops.filter((o) => monthKey(o.fechaDesembolso) === mes).forEach((o) => movs.push({ id: `BK-${movs.length + 1}`, fecha: o.fechaDesembolso, descripcion: `TRANSF. DESEMBOLSO ${o.id}`, monto: -o.monto }))
  juicios.forEach((j) => j.costas.filter((c) => monthKey(c.fecha) === mes).forEach((c) => movs.push({ id: `BK-${movs.length + 1}`, fecha: c.fecha, descripcion: `PAGO ${c.concepto.toUpperCase()}`, monto: -c.monto })))
  movs.push({ id: `BK-${movs.length + 1}`, fecha: addDays(HOY, -6), descripcion: 'COMISIÓN MANTENIMIENTO CTA.', monto: -12.4 })
  movs.push({ id: `BK-${movs.length + 1}`, fecha: addDays(HOY, -3), descripcion: 'DEPÓSITO SIN REFERENCIA', monto: 185 })
  return movs.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// ── Ensamblado ─────────────────────────────────────────────────────────────
export function generarBaseDemo() {
  const clientes = generarClientes(118)
  const semillas = generarOperaciones(clientes)
  const operaciones = semillas.map((s) => s.op)
  const pagos = semillas.flatMap(generarPagos).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))
  const juicios: Juicio[] = []
  operaciones.forEach((op) => {
    const cli = clientes.find((c) => c.id === op.clienteId)!
    const j = generarJuicio(op, cli, pagos.filter((p) => p.operacionId === op.id), juicios.length)
    if (j) juicios.push(j)
  })
  const promesas = generarPromesas(operaciones, pagos)
  const banco = generarBanco(operaciones, pagos, juicios)
  const asientos = generarAsientos(operaciones, pagos, juicios)
  const historial = generarHistorial(clientes)
  return { clientes, operaciones, pagos, juicios, promesas, asientos, banco, historial }
}

export type BaseDemo = ReturnType<typeof generarBaseDemo>
