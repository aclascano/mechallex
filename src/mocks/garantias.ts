// Garantes y garantías reales de cada operación. Semilla propia: no altera la cartera generada.
import { round2 } from '../domain/amortizacion'
import { addDays } from '../domain/fechas'
import type { Cliente, Garante, GarantiaReal, GarantiasOperacion, Operacion } from '../domain/tipos'
import { APELLIDOS, crearRng, NOMBRES } from './catalogos'

const r = crearRng(4417)
const RELACIONES_GARANTE = ['Hermano/a', 'Cónyuge de familiar', 'Amigo/a', 'Socio/a', 'Padre o madre', 'Compañero/a de trabajo']
const INMUEBLES = ['Casa de dos plantas', 'Departamento de tres dormitorios', 'Casa de una planta con patio', 'Local comercial en planta baja', 'Terreno con construcción']
const BIENES_PRENDA = ['Maquinaria de panificación', 'Inventario de mercadería', 'Equipo de refrigeración industrial', 'Maquinaria textil', 'Vehículo de carga liviana']

export function generarGarantias(ops: Operacion[], clientes: Cliente[], canceladas: Set<string>): GarantiasOperacion[] {
  const personas = clientes.filter((c) => c.tipoPersona === 'Natural')
  let nG = 1
  let nR = 1
  return ops.map((op) => {
    const deudor = clientes.find((c) => c.id === op.clienteId)!
    const garantes: Garante[] = []
    const reales: GarantiaReal[] = []
    const estado: GarantiaReal['estado'] = canceladas.has(op.id) ? 'Liberada' : 'Constituida'

    const garante = (): Garante => {
      if (r.chance(0.5)) {
        let g = r.pick(personas)
        while (g.id === deudor.id) g = r.pick(personas)
        return { id: `GA-${nG++}`, clienteId: g.id, nombre: g.nombre, cedula: g.cedula, telefono: g.telefono, relacion: r.pick(RELACIONES_GARANTE), ingresos: g.ingresos }
      }
      return {
        id: `GA-${nG++}`,
        nombre: `${r.pick(NOMBRES)} ${r.pick(APELLIDOS)} ${r.pick(APELLIDOS)}`,
        cedula: String(r.int(1, 24)).padStart(2, '0') + String(r.int(10_000_000, 99_999_999)),
        telefono: `09${r.int(80, 99)} ${r.int(100, 999)} ${r.int(100, 999)}`,
        relacion: r.pick(RELACIONES_GARANTE),
        ingresos: r.int(8, 30) * 100,
      }
    }
    const real = (tipo: GarantiaReal['tipo'], descripcion: string, factor: [number, number], detalle: string): GarantiaReal => ({
      id: `GR-${nR++}`,
      tipo,
      descripcion,
      valorAvaluo: tipo === 'Ahorro encajado' ? round2(op.monto * 0.1) : Math.round((op.monto * r.range(factor[0], factor[1])) / 100) * 100,
      fechaAvaluo: addDays(op.fechaDesembolso, -r.int(8, 30)),
      detalle,
      estado,
    })

    if (op.producto === 'Vivienda') {
      reales.push(real('Hipoteca', `${r.pick(INMUEBLES.slice(0, 3))}, ${r.int(90, 220)} m², ${deudor.ciudad}`, [1.5, 1.9], `Primera hipoteca abierta · inscripción n.º ${r.int(1200, 9800)}`))
    } else if (op.producto === 'Comercial') {
      if (r.chance(0.5)) reales.push(real('Hipoteca', `${INMUEBLES[3 + r.int(0, 1)]}, ${deudor.ciudad}`, [1.35, 1.7], `Primera hipoteca abierta · inscripción n.º ${r.int(1200, 9800)}`))
      else reales.push(real('Prenda comercial', r.pick(BIENES_PRENDA), [1.3, 1.6], `Contrato de prenda n.º ${r.int(300, 990)}`))
      if (r.chance(0.6)) garantes.push(garante())
    } else if (op.producto === 'Microcrédito') {
      garantes.push(garante())
      if (r.chance(0.35)) reales.push(real('Ahorro encajado', 'Ahorro encajado del 10 % del monto', [0.1, 0.1], `Cuenta de ahorros ${r.int(100000, 999999)}`))
    } else {
      if (op.monto > 6000 || r.chance(0.4)) garantes.push(garante())
      if (op.monto > 12000 && r.chance(0.4)) reales.push(real('Prenda vehicular', `Vehículo liviano modelo ${r.int(2018, 2025)}`, [1.2, 1.5], 'Reserva de dominio a favor de la entidad'))
    }
    return { operacionId: op.id, garantes, reales }
  })
}
