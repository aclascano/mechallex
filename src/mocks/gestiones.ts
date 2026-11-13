// Gestiones de cobranza, convenios y configuración de la cobranza automatizada (datos de la demo).
import { round2 } from '../domain/amortizacion'
import { estadoOperacion } from '../domain/cartera'
import { planConvenio } from '../domain/cobranza'
import { addDays, diffDays } from '../domain/fechas'
import type {
  Cliente, Convenio, EjecucionN8n, Feriado, Gestion, MotivoNoPago, Operacion, Pago, PasoEstrategia, Plantilla, Promesa, ResultadoGestion, VentanaContacto, WebhookEntrada,
} from '../domain/tipos'
import { crearRng, HOY } from './catalogos'

const r = crearRng(6021)
const hora = () => `${String(r.int(8, 18)).padStart(2, '0')}:${String(r.int(0, 59)).padStart(2, '0')}`
const NOTAS: Record<string, string[]> = {
  'Promesa de pago': ['Se compromete a pagar con el sueldo.', 'Pagará en ventanilla de su ciudad.', 'Acepta pagar el vencido por transferencia.'],
  'Contactado sin compromiso': ['Indica que revisará su presupuesto.', 'Pide que lo llamen la próxima semana.', 'Dice que está esperando un cobro.'],
  'No contesta': ['Timbra sin respuesta.', 'Buzón de voz.', 'Apagado.'],
  'Mensaje dejado': ['Se deja mensaje con familiar.', 'Mensaje de voz con datos de pago.'],
  'Número equivocado': ['El número pertenece a otra persona. Actualizar contacto.'],
  'Se niega a pagar': ['No reconoce el valor de la mora.', 'Indica que no tiene cómo pagar.'],
  'Ya pagó': ['Indica que pagó ayer; verificar en conciliación.'],
  Enviado: ['Mensaje automático entregado.'],
}

export function generarCobranza(ops: Operacion[], pagos: Pago[], promesas: Promesa[], clientes: Cliente[]) {
  const gestiones: Gestion[] = []
  const nueva = (g: Omit<Gestion, 'id'>) => gestiones.push({ ...g, id: `GS-${String(gestiones.length + 1).padStart(4, '0')}` })
  const pagosDe = (id: string) => pagos.filter((p) => p.operacionId === id)

  ops.forEach((op) => {
    const est = estadoOperacion(op, pagosDe(op.id), HOY)
    if (est.cancelada || est.diasMora === 0) return
    const cli = clientes.find((c) => c.id === op.clienteId)!
    const inicio = addDays(HOY, -Math.min(est.diasMora, 45))
    const n = Math.min(8, 1 + Math.floor(Math.min(est.diasMora, 90) / 12))
    for (let k = 0; k < n; k++) {
      const fecha = addDays(inicio, Math.round(((k + 1) / (n + 1)) * diffDays(HOY, inicio)))
      if (fecha >= HOY) continue
      const auto = r.chance(0.35)
      if (auto) {
        nueva({ operacionId: op.id, clienteId: cli.id, gestor: 'Automático', fecha, hora: '09:00', canal: r.pick(['SMS', 'WhatsApp', 'Correo'] as const), resultado: 'Enviado', nota: NOTAS.Enviado[0], automatica: true })
        continue
      }
      const resultado = r.pick(['No contesta', 'No contesta', 'Contactado sin compromiso', 'Mensaje dejado', 'Contactado sin compromiso', 'Se niega a pagar', 'Número equivocado'] as ResultadoGestion[])
      nueva({
        operacionId: op.id, clienteId: cli.id, gestor: cli.gestor, fecha, hora: hora(), canal: r.chance(0.75) ? 'Llamada' : r.chance(0.5) ? 'WhatsApp' : 'Visita', resultado,
        motivo: resultado === 'Contactado sin compromiso' || resultado === 'Se niega a pagar' ? r.pick(['Desempleo', 'Baja de ventas', 'Enfermedad', 'Sobreendeudamiento', 'Olvido', 'Desacuerdo con el saldo'] as MotivoNoPago[]) : undefined,
        nota: r.pick(NOTAS[resultado]),
      })
    }
    // Algunas próximas acciones quedan agendadas para hoy o mañana.
    const ultima = [...gestiones].reverse().find((g) => g.operacionId === op.id && !g.automatica)
    if (ultima && r.chance(0.45)) ultima.proxima = { fecha: addDays(HOY, r.int(-1, 2)), accion: r.pick(['Volver a llamar', 'Enviar WhatsApp con enlace de pago', 'Visita domiciliaria', 'Confirmar pago']) }
  })

  // Cada promesa nace de una gestión unos días antes del compromiso.
  promesas.forEach((p) => {
    const cli = clientes.find((c) => c.id === p.clienteId)!
    const fecha = addDays(p.fechaCompromiso, -r.int(2, 8))
    if (fecha > HOY) return
    nueva({
      operacionId: p.operacionId, clienteId: p.clienteId, gestor: cli.gestor, fecha, hora: hora(), canal: p.canal, resultado: 'Promesa de pago',
      motivo: r.pick(['Baja de ventas', 'Olvido', 'Enfermedad', 'Sobreendeudamiento'] as MotivoNoPago[]), nota: r.pick(NOTAS['Promesa de pago']), promesaId: p.id,
      proxima: { fecha: p.fechaCompromiso, accion: 'Verificar pago de la promesa' },
    })
  })
  gestiones.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
  gestiones.forEach((g, i) => { g.id = `GS-${String(i + 1).padStart(4, '0')}` })

  // Convenios sobre algunas operaciones con mora media.
  const convenios: Convenio[] = []
  ops.forEach((op) => {
    if (convenios.length >= 4) return
    const est = estadoOperacion(op, pagosDe(op.id), HOY)
    if (est.diasMora < 35 || est.diasMora > 150) return
    const cli = clientes.find((c) => c.id === op.clienteId)!
    const fecha = addDays(HOY, -r.int(18, 50))
    const deuda = round2(est.valorVencido * r.range(0.85, 1))
    const plan = planConvenio(deuda, 0.2, r.int(3, 5), fecha)
    convenios.push({ id: `CV-${String(convenios.length + 1).padStart(3, '0')}`, operacionId: op.id, clienteId: op.clienteId, fecha, gestor: cli.gestor, deuda, inicial: plan.inicial, cuotas: plan.cuotas, nota: 'Convenio de regularización del valor vencido.' })
  })
  return { gestiones, convenios }
}

export const PLANTILLAS: Plantilla[] = [
  { id: 'PL-01', nombre: 'Recordatorio antes del vencimiento', canal: 'SMS', texto: '{entidad}: Hola {nombre}, tu cuota de {monto} vence el {fecha}. Paga a tiempo y evita recargos: {enlace}' },
  { id: 'PL-02', nombre: 'Primer aviso de mora', canal: 'WhatsApp', texto: 'Hola {nombre} 👋 Tu operación {operacion} tiene {dias} días de atraso por {monto}. Puedes pagar aquí: {enlace} o responder 1 para que {gestor} te llame.' },
  { id: 'PL-03', nombre: 'Promesa pendiente', canal: 'WhatsApp', texto: '{nombre}, tu compromiso de pago del {fecha} quedó pendiente. ¿Lo reprogramamos hoy? Responde con la nueva fecha.' },
  { id: 'PL-04', nombre: 'Aviso extrajudicial', canal: 'Correo', asunto: 'Aviso previo a cobro judicial · {operacion}', texto: 'Estimado/a {nombre}:\n\nSu operación {operacion} registra {dias} días de mora y un valor vencido de {monto}. Le invitamos a regularizar o acordar un convenio de pago antes de iniciar acciones legales.\n\nAtentamente,\n{gestor}\n{entidad}' },
  { id: 'PL-05', nombre: 'Guion de llamada · mora administrativa', canal: 'Llamada', texto: '1. Saludo: "Buenos días, ¿hablo con {nombre}? Le llama {gestor} de {entidad}."\n2. Validar identidad (últimos 4 dígitos de la cédula).\n3. Informar: "Su operación {operacion} tiene {dias} días de atraso por {monto}."\n4. Preguntar el motivo del atraso y escuchar.\n5. Proponer: pago total hoy o compromiso con fecha y monto.\n6. Confirmar el compromiso y avisar que llegará por WhatsApp.' },
  { id: 'PL-06', nombre: 'Guion de llamada · extrajudicial', canal: 'Llamada', texto: '1. Saludo e identificación: {gestor}, de {entidad}.\n2. Informar con claridad: {dias} días de mora y {monto} vencidos en {operacion}.\n3. Explicar las consecuencias: reporte y paso a cobro judicial.\n4. Ofrecer un convenio: cuota inicial y el resto en cuotas.\n5. Registrar el compromiso y enviar el resumen por correo.' },
]

export const ESTRATEGIA: PasoEstrategia[] = [
  { id: 'ES-01', etapa: 'preventiva', dia: -3, canal: 'SMS', accion: 'Recordatorio de vencimiento', plantillaId: 'PL-01', activo: true },
  { id: 'ES-02', etapa: 'preventiva', dia: 0, canal: 'WhatsApp', accion: 'Aviso el día de pago con enlace', plantillaId: 'PL-01', activo: false },
  { id: 'ES-03', etapa: 'administrativa', dia: 1, canal: 'WhatsApp', accion: 'Primer aviso de mora', plantillaId: 'PL-02', activo: true },
  { id: 'ES-04', etapa: 'administrativa', dia: 5, canal: 'Llamada', accion: 'Llamada del gestor', plantillaId: 'PL-05', activo: true },
  { id: 'ES-05', etapa: 'administrativa', dia: 15, canal: 'Llamada', accion: 'Segunda llamada y propuesta de compromiso', plantillaId: 'PL-05', activo: true },
  { id: 'ES-06', etapa: 'administrativa', dia: 30, canal: 'Visita', accion: 'Visita domiciliaria o al negocio', activo: true },
  { id: 'ES-07', etapa: 'extrajudicial', dia: 46, canal: 'Correo', accion: 'Carta de aviso extrajudicial', plantillaId: 'PL-04', activo: true },
  { id: 'ES-08', etapa: 'extrajudicial', dia: 60, canal: 'Llamada', accion: 'Llamada del supervisor con oferta de convenio', plantillaId: 'PL-06', activo: true },
  { id: 'ES-09', etapa: 'extrajudicial', dia: 90, canal: 'Visita', accion: 'Notificación al garante', activo: true },
  { id: 'ES-10', etapa: 'judicial', dia: 121, canal: 'Correo', accion: 'Pase al área legal y apertura de expediente', activo: true },
]

export const VENTANAS: VentanaContacto[] = [
  { canal: 'Llamada', dias: [1, 2, 3, 4, 5, 6], desde: '08:00', hasta: '19:00' },
  { canal: 'Visita', dias: [1, 2, 3, 4, 5, 6], desde: '09:00', hasta: '18:00' },
  { canal: 'WhatsApp', dias: [1, 2, 3, 4, 5, 6], desde: '08:00', hasta: '20:00' },
  { canal: 'SMS', dias: [1, 2, 3, 4, 5, 6], desde: '08:00', hasta: '20:00' },
  { canal: 'Correo', dias: [0, 1, 2, 3, 4, 5, 6], desde: '00:00', hasta: '23:59' },
]

export const FERIADOS: Feriado[] = [
  { fecha: '2026-01-01', nombre: 'Año Nuevo' },
  { fecha: '2026-02-16', nombre: 'Carnaval' },
  { fecha: '2026-02-17', nombre: 'Carnaval' },
  { fecha: '2026-04-03', nombre: 'Viernes Santo' },
  { fecha: '2026-05-01', nombre: 'Día del Trabajo' },
  { fecha: '2026-05-25', nombre: 'Batalla de Pichincha' },
  { fecha: '2026-08-10', nombre: 'Primer Grito de Independencia' },
  { fecha: '2026-10-09', nombre: 'Independencia de Guayaquil' },
  { fecha: '2026-11-02', nombre: 'Día de Difuntos' },
  { fecha: '2026-11-03', nombre: 'Independencia de Cuenca' },
  { fecha: '2026-12-25', nombre: 'Navidad' },
]

const DETALLES_OK = ['Lote procesado', 'Mensajes entregados', 'Gestiones registradas en Mechallex']
const DETALLES_ERROR = ['Tiempo de espera agotado con el proveedor de WhatsApp', '3 números con formato inválido', 'Límite de envíos por minuto alcanzado']

export function generarEjecuciones(flujos: { id: string; activo: boolean }[]): EjecucionN8n[] {
  const re = crearRng(7710)
  const lista: EjecucionN8n[] = []
  for (let d = 6; d >= 0; d--) {
    flujos.forEach((f, i) => {
      if (!f.activo && d < 3) return
      const error = re.chance(i === 1 ? 0.15 : 0.04)
      lista.push({
        id: `EX-${String(lista.length + 1).padStart(4, '0')}`, flujoId: f.id, fecha: addDays(HOY, -d), hora: ['08:00', '09:00', '09:30', '07:00'][i] ?? '10:00',
        estado: error ? 'Error' : 'Éxito', duracionMs: re.int(900, 14000), registros: re.int(4, 120), detalle: error ? re.pick(DETALLES_ERROR) : re.pick(DETALLES_OK),
      })
    })
  }
  return lista.reverse()
}

export const WEBHOOKS: WebhookEntrada[] = [
  {
    id: 'WH-01', nombre: 'Respuesta de WhatsApp', ruta: '/api/webhooks/whatsapp', evento: 'mensaje.recibido', ultimo: 'Hoy, 10:42', recibidos7d: 214,
    ejemplo: '{\n  "evento": "mensaje.recibido",\n  "telefono": "0991234567",\n  "texto": "1",\n  "operacion": "OP-2026-0076",\n  "recibido": "2026-11-13T10:42:05-05:00"\n}',
  },
  {
    id: 'WH-02', nombre: 'Estado de entrega SMS', ruta: '/api/webhooks/sms', evento: 'sms.entregado', ultimo: 'Hoy, 08:03', recibidos7d: 1340,
    ejemplo: '{\n  "evento": "sms.entregado",\n  "mensaje": "MSG-88231",\n  "estado": "entregado"\n}',
  },
  {
    id: 'WH-03', nombre: 'Pago por botón web', ruta: '/api/webhooks/pagos', evento: 'pago.confirmado', ultimo: 'Ayer, 21:15', recibidos7d: 37,
    ejemplo: '{\n  "evento": "pago.confirmado",\n  "operacion": "OP-2025-0042",\n  "monto": 958.53,\n  "referencia": "WEB-551204"\n}',
  },
]
