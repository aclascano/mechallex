import type { Cuota, Sistema } from './amortizacion'
import type { ISODate } from './fechas'

export type Producto = 'Consumo' | 'Microcrédito' | 'Vivienda' | 'Comercial'
export type OrigenCartera = 'Propia' | 'Cedida'
export type Tramo = 'al-dia' | '1-30' | '31-60' | '61-90' | '91-180' | '180+'
export type EtapaCobranza = 'preventiva' | 'administrativa' | 'extrajudicial' | 'judicial'
export type Canal = 'Llamada' | 'SMS' | 'WhatsApp' | 'Correo'
export type MedioPago = 'Ventanilla' | 'Transferencia' | 'Débito automático' | 'Corresponsal' | 'Pago web'

export type TipoPersona = 'Natural' | 'Jurídica'
export type TipoIdentificacion = 'Cédula' | 'RUC' | 'Pasaporte'
export type EstadoCivil = 'Soltero/a' | 'Casado/a' | 'Unión de hecho' | 'Divorciado/a' | 'Viudo/a'
export type SituacionLaboral = 'Dependiente' | 'Independiente' | 'Jubilado/a' | 'Empresa'
export type Segmento = 'Personas' | 'Microempresa' | 'Pyme'

export interface Direccion {
  ciudad: string
  calle: string
  referencia: string
}

export interface ReferenciaCliente {
  tipo: 'Personal' | 'Comercial'
  nombre: string
  relacion: string
  telefono: string
}

export interface Conyuge {
  nombre: string
  cedula: string
  telefono: string
  ingresos: number
}

/** Datos que se capturan al crear o editar un cliente. */
export interface DatosCliente {
  tipoPersona: TipoPersona
  tipoIdentificacion: TipoIdentificacion
  cedula: string
  /** Nombre completo (persona) o razón social (empresa). */
  nombre: string
  nombres: string
  apellidos: string
  fechaNacimiento: ISODate | ''
  genero: 'Femenino' | 'Masculino' | 'Otro' | ''
  estadoCivil: EstadoCivil | ''
  nacionalidad: string
  representanteLegal: string
  telefono: string
  telefonoAlterno: string
  email: string
  ciudad: string
  domicilio: Direccion
  trabajo: Direccion
  situacionLaboral: SituacionLaboral
  actividad: string
  empleador: string
  ingresos: number
  egresos: number
  patrimonio: number
  referencias: ReferenciaCliente[]
  conyuge: Conyuge | null
  consentimiento: Record<Canal, boolean>
  segmento: Segmento
  gestor: string
}

export interface Cliente extends DatosCliente {
  id: string
  clienteDesde: ISODate
  estado: 'Activo' | 'Inactivo'
  motivoInactivo?: string
}

export interface CambioCliente {
  id: string
  clienteId: string
  /** ISO con hora, p. ej. 2026-11-13T10:24 */
  fecha: string
  usuario: string
  accion: 'Creación' | 'Edición' | 'Inactivación' | 'Reactivación'
  cambios: { campo: string; antes: string; despues: string }[]
  nota?: string
}

export interface Operacion {
  id: string
  clienteId: string
  producto: Producto
  origen: OrigenCartera
  monto: number
  tasaAnual: number
  plazoMeses: number
  sistema: Sistema
  fechaDesembolso: ISODate
  tabla: Cuota[]
  /** Abonos extraordinarios a capital que recalcularon la tabla. */
  recalculos?: Recalculo[]
  primerVencimiento?: ISODate
  graciaMeses?: number
  /** Datos de originación cuando la operación se creó en la demo. */
  originacion?: { comision: number; seguro: number; neto: number; medio: string; cuentaDestino: string; aprobadaPor: string; observacion: string }
}

export interface Recalculo {
  fecha: ISODate
  pagoId: string
  abono: number
  modo: 'reducir-cuota' | 'reducir-plazo'
  cuotaAntes: number
  cuotaDespues: number
  plazoAntes: number
  plazoDespues: number
}

export interface Garante {
  id: string
  /** Si el garante también es cliente, su ficha. */
  clienteId?: string
  nombre: string
  cedula: string
  telefono: string
  relacion: string
  ingresos: number
}

export type TipoGarantia = 'Hipoteca' | 'Prenda comercial' | 'Prenda vehicular' | 'Ahorro encajado'

export interface GarantiaReal {
  id: string
  tipo: TipoGarantia
  descripcion: string
  valorAvaluo: number
  fechaAvaluo: ISODate
  detalle: string
  estado: 'Constituida' | 'En trámite' | 'Liberada'
}

export interface GarantiasOperacion {
  operacionId: string
  garantes: Garante[]
  reales: GarantiaReal[]
}

/** Un pago se aplica en orden: mora, interés y luego capital de la cuota más antigua. */
export interface Pago {
  id: string
  operacionId: string
  clienteId: string
  fecha: ISODate
  monto: number
  mora: number
  interes: number
  capital: number
  medio: MedioPago
  tipo: 'Cuota' | 'Abono parcial' | 'Abono a capital' | 'Precancelación'
  referencia: string
  conciliado: boolean
  registradoEnDemo?: boolean
}

/** Estado derivado de una operación a una fecha de corte. */
export interface EstadoOperacion {
  saldoCapital: number
  capitalPagado: number
  interesPagado: number
  cuotasPagadas: number
  cuotasVencidas: number
  valorVencido: number
  diasMora: number
  tramo: Tramo
  etapa: EtapaCobranza
  proximaCuota?: { n: number; fecha: ISODate; valor: number }
  /** pagado por cuota (capital+interés aplicados) */
  aplicadoPorCuota: number[]
  cancelada: boolean
}

export type EtapaJuicio = 'Preparación' | 'Demanda' | 'Citación' | 'Audiencia' | 'Sentencia' | 'Ejecución' | 'Embargo y remate'

export interface Costa {
  concepto: string
  fecha: ISODate
  monto: number
}

export interface EventoJuicio {
  fecha: ISODate
  titulo: string
  detalle: string
}

export interface Juicio {
  id: string
  numeroCausa: string
  operacionId: string
  clienteId: string
  etapa: EtapaJuicio
  juzgado: string
  abogado: string
  fechaInicio: ISODate
  cuantia: number
  costas: Costa[]
  eventos: EventoJuicio[]
  proximaDiligencia?: { fecha: ISODate; descripcion: string }
}

export interface Promesa {
  id: string
  operacionId: string
  clienteId: string
  fechaCompromiso: ISODate
  monto: number
  canal: Canal
  estado: 'Vigente' | 'Cumplida' | 'Incumplida'
}

export interface Campania {
  id: string
  nombre: string
  canal: Canal
  tramos: Tramo[]
  estado: 'Activa' | 'Pausada' | 'Programada' | 'Finalizada'
  inicio: ISODate
  enviados: number
  entregados: number
  respuestas: number
  promesas: number
  recuperado: number
  plantilla: string
  flujoN8n?: string
}

export interface Regla {
  id: string
  nombre: string
  disparador: string
  condicion: string
  accion: string
  canal: Canal
  activa: boolean
  ejecucionesMes: number
}

export interface FlujoN8n {
  id: string
  nombre: string
  descripcion: string
  activo: boolean
  ultimaEjecucion: string
  ejecuciones7d: number
  errores7d: number
  nodos: { id: string; tipo: 'trigger' | 'accion' | 'condicion' | 'canal'; etiqueta: string; detalle: string }[]
}

export interface Cuenta {
  codigo: string
  nombre: string
  naturaleza: 'Deudora' | 'Acreedora'
  tipo: 'Activo' | 'Pasivo' | 'Ingreso' | 'Gasto' | 'Patrimonio'
}

export interface LineaAsiento {
  cuenta: string
  debe: number
  haber: number
}

export interface Asiento {
  id: string
  fecha: ISODate
  glosa: string
  origen: 'Desembolso' | 'Pago' | 'Costas judiciales' | 'Ajuste'
  referencia: string
  lineas: LineaAsiento[]
}

export interface MovimientoBanco {
  id: string
  fecha: ISODate
  descripcion: string
  monto: number // + crédito, - débito
  pagoId?: string
}
