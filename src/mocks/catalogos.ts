// Catálogos inventados para la demo. Ningún nombre, cédula ni dato corresponde a personas reales.

export const HOY = '2026-11-13'

export const ENTIDAD_DEMO = {
  nombre: 'Cooperativa Nueve Volcanes',
  nota: 'Entidad ficticia',
}

export const USUARIA_DEMO = { nombre: 'Valeria Rivas', cargo: 'Jefa de cartera y cobranza', iniciales: 'VR' }

export const NOMBRES = [
  'María José', 'Daniela', 'Andrés', 'Carlos', 'Gabriela', 'Luis', 'Verónica', 'Jorge', 'Paola', 'Diego',
  'Fernanda', 'Santiago', 'Lucía', 'Esteban', 'Carolina', 'Mateo', 'Valentina', 'Patricio', 'Sofía', 'Marco',
  'Elena', 'Ricardo', 'Camila', 'Fabián', 'Isabel', 'Javier', 'Natalia', 'Hernán', 'Rocío', 'Tomás',
]

export const APELLIDOS = [
  'Andrade', 'Benítez', 'Cevallos', 'Delgado', 'Espinoza', 'Flores', 'Guerrero', 'Herrera', 'Iturralde', 'Jaramillo',
  'León', 'Mora', 'Naranjo', 'Ortiz', 'Paredes', 'Quintana', 'Rivadeneira', 'Salazar', 'Torres', 'Ubidia',
  'Vásquez', 'Yépez', 'Zambrano', 'Carrera', 'Montalvo', 'Pazmiño', 'Sánchez', 'Villacís', 'Aguirre', 'Bravo',
]

export const NEGOCIOS = [
  'Panadería La Espiga', 'Café Altura', 'Taller Mecánico Vega', 'Florícola Pétalo Alto', 'Distribuidora Cumbre',
  'Textiles Lana Viva', 'Ferretería El Perno', 'Imprenta Tinta Fina', 'Heladería Nevado', 'Agroinsumos Valle Verde',
]

export const CIUDADES = ['Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Loja', 'Manta', 'Riobamba', 'Ibarra', 'Machala', 'Latacunga', 'Santo Domingo', 'Portoviejo']

export const GESTORES = ['Lorena Cruz', 'Pablo Ibarra', 'Inés Salcedo', 'Raúl Mena']

export const ABOGADOS = ['Ab. Martina Lozada', 'Ab. Sebastián Chiriboga', 'Ab. Gloria Pinto']

export const MEDIOS = ['Ventanilla', 'Transferencia', 'Débito automático', 'Corresponsal', 'Pago web'] as const

export const PRODUCTOS = [
  { id: 'Consumo', tasa: [15.5, 16.8], plazo: [12, 48], monto: [1500, 18000] },
  { id: 'Microcrédito', tasa: [20.5, 23.5], plazo: [12, 36], monto: [1200, 12000] },
  { id: 'Vivienda', tasa: [9.8, 10.9], plazo: [48, 60], monto: [25000, 48000] },
  { id: 'Comercial', tasa: [11.2, 12.8], plazo: [18, 48], monto: [8000, 40000] },
] as const

/** Generador pseudoaleatorio con semilla: los mismos datos en cada carga. */
export function crearRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    range: (min: number, max: number) => next() * (max - min) + min,
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
  }
}
