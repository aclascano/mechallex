// Reglas del módulo de clientes: validación por paso, capacidad de pago y registro de cambios.
import { diffDays, type ISODate } from './fechas'
import { validarIdentificacion } from './identificacion'
import type { Canal, CambioCliente, DatosCliente, EstadoCivil, Socioeconomico } from './tipos'

export const PASOS_CLIENTE = [
  { id: 'identificacion', titulo: 'Identificación', detalle: 'Quién es' },
  { id: 'contacto', titulo: 'Contacto y dirección', detalle: 'Dónde ubicarlo' },
  { id: 'economia', titulo: 'Actividad económica', detalle: 'Ingresos y capacidad' },
  { id: 'referencias', titulo: 'Referencias y cónyuge', detalle: 'Personas de contacto' },
  { id: 'cobranza', titulo: 'Contacto y asignación', detalle: 'Canales y gestor' },
  { id: 'revision', titulo: 'Revisión', detalle: 'Confirmar y guardar' },
] as const
export type PasoCliente = (typeof PASOS_CLIENTE)[number]['id']

export const CANALES: Canal[] = ['Llamada', 'SMS', 'WhatsApp', 'Correo']
export const ESTADOS_CIVILES: EstadoCivil[] = ['Soltero/a', 'Casado/a', 'Unión de hecho', 'Divorciado/a', 'Viudo/a']
export const requiereConyuge = (e: DatosCliente['estadoCivil']) => e === 'Casado/a' || e === 'Unión de hecho'

export const SECTORES = ['Comercio', 'Servicios', 'Manufactura', 'Agricultura y ganadería', 'Transporte', 'Construcción', 'Turismo y alimentos', 'Educación y salud']

const suma = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + (v || 0), 0)
export const totalIngresos = (s: Socioeconomico) => suma(s.ingresos)
export const totalEgresos = (s: Socioeconomico) => suma(s.egresos)
export const totalActivos = (s: Socioeconomico) => suma(s.activos)
export const patrimonioNeto = (s: Socioeconomico) => totalActivos(s) - (s.pasivosExternos || 0)

/** Mantiene ingresos, egresos y patrimonio totales iguales al desglose. */
export function conTotales<T extends DatosCliente>(d: T): T {
  return { ...d, ingresos: totalIngresos(d.socio), egresos: totalEgresos(d.socio), patrimonio: patrimonioNeto(d.socio) }
}

/** Meses desde la última actualización de los datos socioeconómicos. */
export const mesesDesdeActualizacion = (s: Socioeconomico, hoy: ISODate) => Math.floor(diffDays(hoy, s.actualizado) / 30.4)
export const VIGENCIA_SOCIO_MESES = 6

export function socioVacio(hoy: ISODate): Socioeconomico {
  return {
    ingresos: { sueldo: 0, negocio: 0, otros: 0 },
    egresos: { vivienda: 0, alimentacion: 0, educacion: 0, deudas: 0, otros: 0 },
    activos: { inmuebles: 0, vehiculos: 0, ahorros: 0, otros: 0 },
    pasivosExternos: 0,
    empleo: { cargo: '', antiguedadAnios: 0, contrato: '' },
    negocio: { tieneRuc: false, ruc: '', sector: '', antiguedadAnios: 0 },
    vivienda: '',
    cargas: 0,
    actualizado: hoy,
  }
}

/** Ingresos menos egresos: lo que el cliente puede destinar al pago de cuotas. */
export const capacidadPago = (d: Pick<DatosCliente, 'ingresos' | 'egresos'>) => Math.max(0, (d.ingresos || 0) - (d.egresos || 0))

export function clienteVacio(gestor: string, hoy: ISODate): DatosCliente {
  return {
    tipoPersona: 'Natural', tipoIdentificacion: 'Cédula', cedula: '', nombre: '', nombres: '', apellidos: '',
    fechaNacimiento: '', genero: '', estadoCivil: '', nacionalidad: 'Ecuatoriana', representanteLegal: '',
    telefono: '', telefonoAlterno: '', email: '', ciudad: '',
    domicilio: { ciudad: '', calle: '', referencia: '' },
    trabajo: { ciudad: '', calle: '', referencia: '' },
    situacionLaboral: 'Dependiente', actividad: '', empleador: '', ingresos: 0, egresos: 0, patrimonio: 0, socio: socioVacio(hoy),
    referencias: [{ tipo: 'Personal', nombre: '', relacion: '', telefono: '' }],
    conyuge: null,
    consentimiento: { Llamada: true, SMS: true, WhatsApp: true, Correo: true },
    segmento: 'Personas', gestor,
  }
}

export type Errores = Partial<Record<string, string>>

const fmtUsd = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })
const usd = (n: number) => fmtUsd.format(n)

const telefonoValido = (t: string) => /^0\d{8,9}$/.test(t.replace(/\s/g, ''))

export function validarPaso(d: DatosCliente, paso: PasoCliente, opts: { hoy: ISODate; identificacionUsada: (n: string) => boolean; validarId: boolean }): Errores {
  const e: Errores = {}
  const natural = d.tipoPersona === 'Natural'
  if (paso === 'identificacion') {
    if (opts.validarId) {
      const err = validarIdentificacion(d.tipoIdentificacion, d.cedula, natural)
      if (err) e.cedula = err
      else if (opts.identificacionUsada(d.cedula.trim())) e.cedula = 'Ya existe un cliente con esta identificación.'
    }
    if (natural) {
      if (!d.nombres.trim()) e.nombres = 'Ingresa los nombres.'
      if (!d.apellidos.trim()) e.apellidos = 'Ingresa los apellidos.'
      if (!d.fechaNacimiento) e.fechaNacimiento = 'Ingresa la fecha de nacimiento.'
      else if (diffDays(opts.hoy, d.fechaNacimiento) < 18 * 365.25) e.fechaNacimiento = 'El cliente debe ser mayor de edad.'
      else if (diffDays(opts.hoy, d.fechaNacimiento) > 100 * 365.25) e.fechaNacimiento = 'Revisa el año de nacimiento.'
      if (!d.estadoCivil) e.estadoCivil = 'Elige el estado civil.'
    } else {
      if (!d.nombre.trim()) e.nombre = 'Ingresa la razón social.'
      if (!d.representanteLegal.trim()) e.representanteLegal = 'Ingresa el representante legal.'
    }
  }
  if (paso === 'contacto') {
    if (!telefonoValido(d.telefono)) e.telefono = 'Celular de 10 dígitos que empieza con 09.'
    if (d.telefonoAlterno && !telefonoValido(d.telefonoAlterno)) e.telefonoAlterno = 'Revisa el número.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Correo con formato nombre@dominio.'
    if (!d.domicilio.ciudad) e['domicilio.ciudad'] = 'Elige la ciudad.'
    if (!d.domicilio.calle.trim()) e['domicilio.calle'] = 'Ingresa la dirección.'
  }
  if (paso === 'economia') {
    if (!d.actividad.trim()) e.actividad = 'Describe la actividad económica.'
    if (d.situacionLaboral === 'Dependiente' && !d.empleador.trim()) e.empleador = 'Ingresa el empleador.'
    if (!(d.ingresos > 0)) e.ingresos = 'Ingresa al menos una fuente de ingresos.'
    if (d.egresos >= d.ingresos && d.ingresos > 0) e.egresos = 'Los egresos igualan o superan los ingresos: no hay capacidad de pago.'
    if (natural && d.situacionLaboral === 'Dependiente' && !d.socio.empleo.contrato) e.contrato = 'Elige el tipo de contrato.'
    if (d.situacionLaboral === 'Independiente' && d.socio.negocio.tieneRuc && !/^\d{13}$/.test(d.socio.negocio.ruc)) e.rucNegocio = 'RUC de 13 dígitos.'
    if ((d.situacionLaboral === 'Independiente' || d.situacionLaboral === 'Empresa') && !d.socio.negocio.sector) e.sector = 'Elige el sector.'
    if (natural && !d.socio.vivienda) e.vivienda = 'Elige el tipo de vivienda.'
  }
  if (paso === 'referencias') {
    d.referencias.forEach((r, i) => {
      if (!r.nombre.trim()) e[`ref.${i}.nombre`] = 'Ingresa el nombre.'
      if (!telefonoValido(r.telefono)) e[`ref.${i}.telefono`] = 'Revisa el teléfono.'
    })
    if (d.referencias.length === 0) e.referencias = 'Agrega al menos una referencia.'
    if (natural && requiereConyuge(d.estadoCivil)) {
      if (!d.conyuge?.nombre.trim()) e['conyuge.nombre'] = 'Ingresa el nombre del cónyuge.'
      if (!d.conyuge || validarIdentificacion('Cédula', d.conyuge.cedula, true)) e['conyuge.cedula'] = 'Cédula del cónyuge no válida.'
    }
  }
  if (paso === 'cobranza') {
    if (!Object.values(d.consentimiento).some(Boolean)) e.consentimiento = 'Autoriza al menos un canal para poder contactar al cliente.'
  }
  return e
}

/** Normaliza antes de guardar: nombre completo, cónyuge solo si aplica. */
export function normalizar(d: DatosCliente): DatosCliente {
  const natural = d.tipoPersona === 'Natural'
  return conTotales({
    ...d,
    cedula: d.cedula.trim(),
    nombres: natural ? d.nombres.trim() : '',
    apellidos: natural ? d.apellidos.trim() : '',
    nombre: natural ? `${d.nombres.trim()} ${d.apellidos.trim()}` : d.nombre.trim(),
    email: d.email.trim().toLowerCase(),
    ciudad: d.domicilio.ciudad,
    conyuge: natural && requiereConyuge(d.estadoCivil) ? d.conyuge : null,
    representanteLegal: natural ? '' : d.representanteLegal.trim(),
    estadoCivil: natural ? d.estadoCivil : '',
    fechaNacimiento: natural ? d.fechaNacimiento : '',
    genero: natural ? d.genero : '',
  })
}

const ETIQUETAS: [string, (d: DatosCliente) => string][] = [
  ['Tipo de persona', (d) => d.tipoPersona],
  ['Identificación', (d) => `${d.tipoIdentificacion} ${d.cedula}`],
  ['Nombre', (d) => d.nombre],
  ['Fecha de nacimiento', (d) => d.fechaNacimiento],
  ['Estado civil', (d) => d.estadoCivil],
  ['Representante legal', (d) => d.representanteLegal],
  ['Celular', (d) => d.telefono],
  ['Teléfono alterno', (d) => d.telefonoAlterno],
  ['Correo', (d) => d.email],
  ['Domicilio', (d) => [d.domicilio.calle, d.domicilio.ciudad].filter(Boolean).join(', ')],
  ['Dirección de trabajo', (d) => [d.trabajo.calle, d.trabajo.ciudad].filter(Boolean).join(', ')],
  ['Situación laboral', (d) => d.situacionLaboral],
  ['Actividad', (d) => d.actividad],
  ['Empleador', (d) => d.empleador],
  ['Ingresos', (d) => usd(d.ingresos)],
  ['Egresos', (d) => usd(d.egresos)],
  ['Patrimonio', (d) => usd(d.patrimonio)],
  ['Deudas en otras entidades', (d) => usd(d.socio.pasivosExternos)],
  ['Cargo y antigüedad', (d) => (d.socio.empleo.cargo ? `${d.socio.empleo.cargo}, ${d.socio.empleo.antiguedadAnios} años` : '')],
  ['Negocio', (d) => (d.socio.negocio.sector ? `${d.socio.negocio.sector}${d.socio.negocio.tieneRuc ? `, RUC ${d.socio.negocio.ruc}` : ', sin RUC'}` : '')],
  ['Vivienda', (d) => d.socio.vivienda],
  ['Cargas familiares', (d) => String(d.socio.cargas)],
  ['Referencias', (d) => d.referencias.map((r) => r.nombre).join(', ')],
  ['Cónyuge', (d) => d.conyuge?.nombre ?? ''],
  ['Canales autorizados', (d) => CANALES.filter((c) => d.consentimiento[c]).join(', ')],
  ['Segmento', (d) => d.segmento],
  ['Gestor', (d) => d.gestor],
]

export function diferencias(antes: DatosCliente, despues: DatosCliente): CambioCliente['cambios'] {
  return ETIQUETAS.flatMap(([campo, f]) => {
    const a = f(antes)
    const b = f(despues)
    return a === b ? [] : [{ campo, antes: a || '—', despues: b || '—' }]
  })
}
