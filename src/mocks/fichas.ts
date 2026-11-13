// Datos de ficha de los clientes (direcciones, ingresos, referencias…) e historial inicial.
// Usan su propia semilla para no alterar la secuencia que genera la cartera.
import { addDays } from '../domain/fechas'
import type { CambioCliente, Cliente } from '../domain/tipos'
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
  return {
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
