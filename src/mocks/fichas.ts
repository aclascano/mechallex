// Datos de ficha de los clientes (direcciones, ingresos, referencias…) e historial inicial.
// Usan su propia semilla para no alterar la secuencia que genera la cartera.
import { addDays } from '../domain/fechas'
import { conTotales, SECTORES } from '../domain/clientes'
import type { CambioCliente, Cliente, Socioeconomico } from '../domain/tipos'
import { APELLIDOS, crearRng, HOY, NOMBRES } from './catalogos'

export const PROVINCIA_DE: Record<string, string> = {
  Quito: 'Pichincha', Guayaquil: 'Guayas', Cuenca: 'Azuay', Ambato: 'Tungurahua', Loja: 'Loja', Manta: 'Manabí',
  Riobamba: 'Chimborazo', Ibarra: 'Imbabura', Machala: 'El Oro', Latacunga: 'Cotopaxi',
  'Santo Domingo': 'Santo Domingo de los Tsáchilas', Portoviejo: 'Manabí',
}

const CALLES = [
  'Av. Los Cedros', 'Calle Las Orquídeas', 'Pasaje Los Alisos', 'Av. del Cóndor', 'Calle Los Arrayanes', 'Av. Río Verde',
  'Calle El Mirador', 'Av. Las Palmeras', 'Calle Los Guabos', 'Pasaje El Cedrón', 'Av. Tres Cerros', 'Calle La Ladera',
]
const REFERENCIAS_UBICACION = [
  'Frente al parque', 'Junto a la farmacia', 'Casa esquinera, portón negro', 'Edificio de tres pisos, depto. 2B',
  'A media cuadra de la escuela', 'Diagonal a la panadería', 'Conjunto Los Pinos, casa 14',
]
export const ACTIVIDADES = [
  'Comercio al por menor', 'Servicios profesionales', 'Transporte de carga liviana', 'Docencia', 'Atención de salud',
  'Construcción', 'Confección textil', 'Agricultura', 'Venta de comida preparada', 'Mantenimiento técnico',
]
const EMPLEADORES = [
  'Constructora Andina Sur', 'Clínica Valle Claro', 'Unidad Educativa Horizonte', 'Transportes Ruta Norte',
  'Supermercados La Cosecha', 'Laboratorio Biomar', 'Textiles del Pacífico', 'Hotel Mirador del Sur',
]
export const RELACIONES = ['Hermano/a', 'Amigo/a', 'Compañero/a de trabajo', 'Vecino/a', 'Primo/a', 'Tío/a', 'Proveedor', 'Cliente']

export type ClienteBase = Pick<Cliente, 'id' | 'nombre' | 'cedula' | 'ciudad' | 'telefono' | 'email' | 'segmento' | 'gestor' | 'clienteDesde'>

const fmtUsd = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })
const usd = (n: number) => fmtUsd.format(n)
const r = crearRng(7031)
const celular = () => `09${r.int(80, 99)} ${r.int(100, 999)} ${r.int(100, 999)}`
const fijo = () => `0${r.int(2, 7)} ${r.int(200, 299)} ${r.int(1000, 9999)}`

export function enriquecerCliente(b: ClienteBase): Cliente {
  const esNegocio = b.segmento !== 'Personas'
  const partes = b.nombre.split(' ')
  const situacion = esNegocio ? 'Empresa' : r.pick(['Dependiente', 'Dependiente', 'Independiente', 'Independiente', 'Jubilado/a'] as const)
  const ingresos = esNegocio ? r.int(60, 260) * 100 : situacion === 'Jubilado/a' ? r.int(6, 14) * 100 : r.int(7, 42) * 100
  const estadoCivil = esNegocio ? '' : r.pick(['Soltero/a', 'Casado/a', 'Casado/a', 'Unión de hecho', 'Divorciado/a'] as const)
  const casado = estadoCivil === 'Casado/a' || estadoCivil === 'Unión de hecho'
  const otroNombre = () => `${r.pick(NOMBRES)} ${r.pick(APELLIDOS)}`
  const dir = () => ({ ciudad: b.ciudad, calle: `${r.pick(CALLES)} N${r.int(10, 78)}-${r.int(10, 240)}`, referencia: r.pick(REFERENCIAS_UBICACION) })
  const c: Omit<Cliente, 'socio'> = {
    ...b,
    tipoPersona: esNegocio ? 'Jurídica' : 'Natural',
    tipoIdentificacion: esNegocio ? 'RUC' : 'Cédula',
    nombres: esNegocio ? '' : partes.slice(0, -2).join(' '),
    apellidos: esNegocio ? '' : partes.slice(-2).join(' '),
    fechaNacimiento: esNegocio ? '' : addDays('1962-01-01', r.int(0, 365 * 38)),
    genero: esNegocio ? '' : r.chance(0.5) ? 'Femenino' : 'Masculino',
    estadoCivil,
    nacionalidad: 'Ecuatoriana',
    representanteLegal: esNegocio ? otroNombre() : '',
    telefonoAlterno: r.chance(0.45) ? fijo() : '',
    domicilio: dir(),
    trabajo: situacion === 'Jubilado/a' ? { ciudad: '', calle: '', referencia: '' } : dir(),
    situacionLaboral: situacion,
    actividad: esNegocio ? r.pick(['Elaboración y venta de alimentos', 'Comercio al por mayor', 'Servicios de mantenimiento', 'Producción agrícola']) : r.pick(ACTIVIDADES),
    empleador: situacion === 'Dependiente' ? r.pick(EMPLEADORES) : '',
    ingresos,
    egresos: Math.round((ingresos * r.range(0.35, 0.62)) / 10) * 10,
    patrimonio: r.int(2, 90) * 1000,
    referencias: [
      { tipo: 'Personal', nombre: otroNombre(), relacion: r.pick(RELACIONES.slice(0, 6)), telefono: celular() },
      ...(r.chance(0.6) ? [{ tipo: 'Comercial' as const, nombre: r.pick(EMPLEADORES), relacion: 'Proveedor', telefono: fijo() }] : []),
    ],
    conyuge: casado
      ? { nombre: `${r.pick(NOMBRES)} ${r.pick(APELLIDOS)} ${r.pick(APELLIDOS)}`, cedula: String(r.int(1, 24)).padStart(2, '0') + String(r.int(10_000_000, 99_999_999)), telefono: celular(), ingresos: r.int(0, 18) * 100 }
      : null,
    consentimiento: { Llamada: true, SMS: r.chance(0.9), WhatsApp: r.chance(0.8), Correo: r.chance(0.85) },
    estado: 'Activo',
  }
  return conTotales({ ...c, socio: socioDe(c) })
}

// Semilla propia para el desglose socioeconómico.
const rs = crearRng(5120)
const CARGOS = ['Asistente administrativo', 'Docente', 'Enfermero/a', 'Técnico de mantenimiento', 'Vendedor/a', 'Contador/a', 'Supervisor/a de planta', 'Chofer profesional']
const reparte = (total: number, pesos: number[]) => {
  const suma = pesos.reduce((a, b) => a + b, 0)
  const partes = pesos.map((p) => Math.round((total * p) / suma / 10) * 10)
  partes[0] += total - partes.reduce((a, b) => a + b, 0)
  return partes
}

function socioDe(c: Omit<Cliente, 'socio'>): Socioeconomico {
  const empresa = c.situacionLaboral === 'Empresa'
  const total = c.ingresos
  const [sueldo, negocio, otros] = c.situacionLaboral === 'Dependiente' ? reparte(total, [rs.range(0.82, 1), 0, rs.range(0, 0.18)])
    : c.situacionLaboral === 'Jubilado/a' ? [0, 0, total]
    : reparte(total, [0, rs.range(0.8, 1), rs.range(0, 0.2)]).map((v, i) => (i === 0 ? 0 : v)).map((v, i, a) => (i === 1 ? v + (total - a[1] - a[2]) : v))
  const egresoTotal = Math.round((total * rs.range(0.35, 0.62)) / 10) * 10
  const [vivienda, alimentacion, educacion, deudas, otrosE] = reparte(egresoTotal, [rs.range(0.15, 0.3), rs.range(0.25, 0.38), rs.range(0, 0.15), rs.range(0, 0.25), rs.range(0.05, 0.15)])
  const propia = empresa || rs.chance(0.45)
  const activos = {
    inmuebles: propia ? rs.int(18, 140) * 1000 : 0,
    vehiculos: rs.chance(0.45) ? rs.int(5, 28) * 1000 : 0,
    ahorros: rs.int(2, 150) * 100,
    otros: rs.chance(0.3) ? rs.int(5, 60) * 100 : 0,
  }
  const independiente = c.situacionLaboral === 'Independiente' || empresa
  const meses = rs.chance(0.35) ? rs.int(7, 20) : rs.int(0, 5)
  return {
    ingresos: { sueldo, negocio, otros },
    egresos: { vivienda, alimentacion, educacion, deudas, otros: otrosE },
    activos,
    pasivosExternos: rs.chance(0.55) ? rs.int(5, 180) * 100 : 0,
    empleo: c.situacionLaboral === 'Dependiente'
      ? { cargo: rs.pick(CARGOS), antiguedadAnios: Math.round(rs.range(0.5, 18) * 2) / 2, contrato: rs.pick(['Indefinido', 'Indefinido', 'Indefinido', 'Plazo fijo', 'Servicios profesionales'] as const) }
      : { cargo: '', antiguedadAnios: 0, contrato: '' },
    negocio: independiente
      ? { tieneRuc: empresa || rs.chance(0.65), ruc: empresa ? c.cedula : `${c.cedula}001`, sector: rs.pick(SECTORES), antiguedadAnios: rs.int(1, 16) }
      : { tieneRuc: false, ruc: '', sector: '', antiguedadAnios: 0 },
    vivienda: empresa ? '' : propia ? 'Propia' : rs.chance(0.6) ? 'Arrendada' : 'Familiar',
    cargas: empresa ? 0 : rs.int(0, 4),
    actualizado: addDays(HOY, -Math.round(meses * 30.4) - rs.int(0, 20)),
  }
}

/**
 * Ingresos coherentes con los créditos: las cuotas en la entidad ocupan entre 15 % y 38 % del ingreso
 * y la capacidad de pago las cubre con holgura. Se escala el desglose para que los totales cuadren.
 */
export function ajustarIngresos(clientes: Cliente[], ops: { clienteId: string; tabla: { cuota: number }[] }[]) {
  const ri = crearRng(3307)
  clientes.forEach((c, i) => {
    const cuotas = ops.filter((o) => o.clienteId === c.id).reduce((s, o) => s + Math.max(...o.tabla.map((x) => x.cuota)), 0)
    if (!cuotas) return
    const minimo = Math.ceil(cuotas / ri.range(0.15, 0.38) / 100) * 100
    const s = c.socio
    if (c.ingresos < minimo) {
      const f = minimo / c.ingresos
      s.ingresos = { sueldo: Math.round(s.ingresos.sueldo * f), negocio: Math.round(s.ingresos.negocio * f), otros: Math.round(s.ingresos.otros * f) }
    }
    const ingresos = s.ingresos.sueldo + s.ingresos.negocio + s.ingresos.otros
    const maxEgresos = Math.max(0, ingresos - cuotas * ri.range(1.25, 2.4))
    const egresos = s.egresos.vivienda + s.egresos.alimentacion + s.egresos.educacion + s.egresos.deudas + s.egresos.otros
    if (egresos > maxEgresos) {
      const f = maxEgresos / egresos
      ;(Object.keys(s.egresos) as (keyof typeof s.egresos)[]).forEach((k) => { s.egresos[k] = Math.round((s.egresos[k] * f) / 10) * 10 })
    }
    clientes[i] = conTotales(c)
  })
}

/** El cliente se registra poco antes de su primer crédito: así las altas se reparten en el tiempo. */
export function ajustarAltas(clientes: Cliente[], ops: { clienteId: string; fechaDesembolso: string }[]) {
  const ra = crearRng(9902)
  clientes.forEach((c) => {
    const primera = ops.filter((o) => o.clienteId === c.id).map((o) => o.fechaDesembolso).sort()[0]
    if (primera) c.clienteDesde = addDays(primera, -ra.int(6, 75))
  })
}

/** Historial inicial: alta de cada cliente y, en algunos, una actualización de ingresos. */
export function generarHistorial(clientes: Cliente[]): CambioCliente[] {
  const h: CambioCliente[] = []
  const hh = (n: number) => String(n).padStart(2, '0')
  clientes.forEach((c, i) => {
    h.push({
      id: `HC-${h.length + 1}`, clienteId: c.id, fecha: `${c.clienteDesde}T${hh(9 + (i % 8))}:${hh((i * 7) % 60)}`,
      usuario: c.gestor, accion: 'Creación', cambios: [], nota: 'Alta del cliente con su primera solicitud de crédito.',
    })
    if (i % 3 === 0) {
      const f = addDays(c.clienteDesde, 200 + (i % 9) * 40)
      if (f < HOY) {
        h.push({
          id: `HC-${h.length + 1}`, clienteId: c.id, fecha: `${f}T11:${hh((i * 13) % 60)}`, usuario: c.gestor, accion: 'Edición',
          cambios: [{ campo: 'Ingresos', antes: usd(c.ingresos - 300), despues: usd(c.ingresos) }],
          nota: 'Actualización de ingresos con el último rol de pagos.',
        })
      }
    }
  })
  return h
}
