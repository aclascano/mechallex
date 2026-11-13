import type { Campania, Cuenta, FlujoN8n, Regla } from '../domain/tipos'

// Campañas: el "recuperado" se recalcula en los servicios como una parte de los pagos reales del mes.
export const CAMPANIAS: (Omit<Campania, 'recuperado'> & { participacion: number })[] = [
  {
    id: 'CP-01', nombre: 'Recordatorio antes del vencimiento', canal: 'SMS', tramos: ['al-dia'], estado: 'Activa', inicio: '2026-09-01',
    enviados: 1840, entregados: 1796, respuestas: 214, promesas: 0, participacion: 0.18,
    plantilla: 'Hola {nombre}, tu cuota de {valor} vence el {fecha}. Paga a tiempo y evita recargos.', flujoN8n: 'WF-01',
  },
  {
    id: 'CP-02', nombre: 'Mora temprana por WhatsApp', canal: 'WhatsApp', tramos: ['1-30'], estado: 'Activa', inicio: '2026-10-05',
    enviados: 612, entregados: 598, respuestas: 287, promesas: 96, participacion: 0.27,
    plantilla: '{nombre}, registramos un saldo vencido de {valor}. ¿Te ayudamos con un compromiso de pago? Responde 1 para agendar.', flujoN8n: 'WF-02',
  },
  {
    id: 'CP-03', nombre: 'Llamadas de gestión 31–90 días', canal: 'Llamada', tramos: ['31-60', '61-90'], estado: 'Activa', inicio: '2026-10-12',
    enviados: 348, entregados: 231, respuestas: 158, promesas: 61, participacion: 0.16,
    plantilla: 'Guion: saludo, validación de identidad, valor vencido, propuesta de compromiso, confirmación por WhatsApp.', flujoN8n: 'WF-03',
  },
  {
    id: 'CP-04', nombre: 'Aviso extrajudicial por correo', canal: 'Correo', tramos: ['91-180'], estado: 'Activa', inicio: '2026-10-20',
    enviados: 126, entregados: 119, respuestas: 23, promesas: 9, participacion: 0.06,
    plantilla: 'Asunto: Aviso previo a cobro judicial. Estimado/a {nombre}: su operación {operacion} registra {dias} días de mora…', flujoN8n: 'WF-04',
  },
  {
    id: 'CP-05', nombre: 'Reactivación de promesas incumplidas', canal: 'WhatsApp', tramos: ['31-60', '61-90', '91-180'], estado: 'Pausada', inicio: '2026-08-15',
    enviados: 204, entregados: 199, respuestas: 61, promesas: 18, participacion: 0.03,
    plantilla: '{nombre}, tu compromiso del {fecha} quedó pendiente. Podemos reprogramarlo hoy mismo.',
  },
  {
    id: 'CP-06', nombre: 'Campaña navideña de regularización', canal: 'Correo', tramos: ['1-30', '31-60', '61-90'], estado: 'Programada', inicio: '2026-12-01',
    enviados: 0, entregados: 0, respuestas: 0, promesas: 0, participacion: 0,
    plantilla: 'Cierra el año al día: condona el recargo por mora si regularizas antes del 20 de diciembre.',
  },
]

export const REGLAS: Regla[] = [
  { id: 'RG-01', nombre: 'Recordatorio preventivo', disparador: 'Diario 08:00', condicion: 'Cuota vence en 3 días', accion: 'Enviar SMS de recordatorio', canal: 'SMS', activa: true, ejecucionesMes: 412 },
  { id: 'RG-02', nombre: 'Primer día de mora', disparador: 'Diario 09:00', condicion: 'Días de mora = 1', accion: 'WhatsApp con enlace de pago', canal: 'WhatsApp', activa: true, ejecucionesMes: 96 },
  { id: 'RG-03', nombre: 'Escalar a gestor', disparador: 'Diario 09:30', condicion: 'Días de mora ≥ 15 y sin respuesta', accion: 'Crear tarea de llamada para el gestor asignado', canal: 'Llamada', activa: true, ejecucionesMes: 58 },
  { id: 'RG-04', nombre: 'Seguimiento de promesa', disparador: 'Al vencer una promesa', condicion: 'Promesa sin pago registrado', accion: 'WhatsApp de reprogramación', canal: 'WhatsApp', activa: true, ejecucionesMes: 21 },
  { id: 'RG-05', nombre: 'Aviso extrajudicial', disparador: 'Semanal, lunes', condicion: 'Días de mora entre 91 y 120', accion: 'Correo con carta de aviso en PDF', canal: 'Correo', activa: true, ejecucionesMes: 14 },
  { id: 'RG-06', nombre: 'Pase a judicial', disparador: 'Diario 18:00', condicion: 'Días de mora > 120 y saldo > $1.000', accion: 'Notificar al área legal y abrir expediente', canal: 'Correo', activa: false, ejecucionesMes: 0 },
]

export const FLUJOS_N8N: FlujoN8n[] = [
  {
    id: 'WF-01', nombre: 'Recordatorios preventivos', descripcion: 'Lee cuotas por vencer y envía SMS por lotes.', activo: true, ultimaEjecucion: 'Hoy, 08:00', ejecuciones7d: 7, errores7d: 0,
    nodos: [
      { id: 'n1', tipo: 'trigger', etiqueta: 'Cron', detalle: 'Todos los días 08:00' },
      { id: 'n2', tipo: 'accion', etiqueta: 'Mechallex · Cuotas por vencer', detalle: 'GET /api/cuotas?vence_en=3' },
      { id: 'n3', tipo: 'condicion', etiqueta: 'Tiene celular válido', detalle: 'IF telefono ≠ vacío' },
      { id: 'n4', tipo: 'canal', etiqueta: 'Proveedor SMS', detalle: 'Plantilla CP-01' },
      { id: 'n5', tipo: 'accion', etiqueta: 'Mechallex · Registrar gestión', detalle: 'POST /api/gestiones' },
    ],
  },
  {
    id: 'WF-02', nombre: 'Mora temprana WhatsApp', descripcion: 'Contacta deudores de 1 a 30 días y captura promesas.', activo: true, ultimaEjecucion: 'Hoy, 09:00', ejecuciones7d: 7, errores7d: 1,
    nodos: [
      { id: 'n1', tipo: 'trigger', etiqueta: 'Webhook', detalle: 'evento: mora.dia_1' },
      { id: 'n2', tipo: 'canal', etiqueta: 'WhatsApp Business', detalle: 'Plantilla CP-02' },
      { id: 'n3', tipo: 'condicion', etiqueta: 'Respondió "1"', detalle: 'Espera hasta 24 h' },
      { id: 'n4', tipo: 'accion', etiqueta: 'Mechallex · Crear promesa', detalle: 'POST /api/promesas' },
    ],
  },
  {
    id: 'WF-03', nombre: 'Agenda de llamadas', descripcion: 'Arma la cola diaria de llamadas por gestor.', activo: true, ultimaEjecucion: 'Hoy, 09:30', ejecuciones7d: 5, errores7d: 0,
    nodos: [
      { id: 'n1', tipo: 'trigger', etiqueta: 'Cron', detalle: 'Lunes a viernes 09:30' },
      { id: 'n2', tipo: 'accion', etiqueta: 'Mechallex · Cartera 31–90', detalle: 'GET /api/operaciones?tramo=31-90' },
      { id: 'n3', tipo: 'accion', etiqueta: 'Repartir por gestor', detalle: 'Code · round-robin' },
      { id: 'n4', tipo: 'canal', etiqueta: 'Central telefónica', detalle: 'Crear campaña de marcación' },
    ],
  },
  {
    id: 'WF-04', nombre: 'Cartas extrajudiciales', descripcion: 'Genera el PDF de aviso y lo envía por correo.', activo: false, ultimaEjecucion: 'Lun 10 nov, 07:00', ejecuciones7d: 1, errores7d: 0,
    nodos: [
      { id: 'n1', tipo: 'trigger', etiqueta: 'Cron', detalle: 'Lunes 07:00' },
      { id: 'n2', tipo: 'accion', etiqueta: 'Mechallex · Mora 91–120', detalle: 'GET /api/operaciones?dias=91-120' },
      { id: 'n3', tipo: 'accion', etiqueta: 'Generar PDF', detalle: 'Plantilla carta de aviso' },
      { id: 'n4', tipo: 'canal', etiqueta: 'Correo SMTP', detalle: 'Plantilla CP-04' },
    ],
  },
]

export const PLAN_CUENTAS: Cuenta[] = [
  { codigo: '1.1.01', nombre: 'Bancos', naturaleza: 'Deudora', tipo: 'Activo' },
  { codigo: '1.4.01', nombre: 'Cartera de créditos', naturaleza: 'Deudora', tipo: 'Activo' },
  { codigo: '2.1.01', nombre: 'Primas de seguro por pagar', naturaleza: 'Acreedora', tipo: 'Pasivo' },
  { codigo: '3.1.01', nombre: 'Capital social', naturaleza: 'Acreedora', tipo: 'Patrimonio' },
  { codigo: '4.1.01', nombre: 'Intereses ganados', naturaleza: 'Acreedora', tipo: 'Ingreso' },
  { codigo: '4.1.02', nombre: 'Intereses de mora', naturaleza: 'Acreedora', tipo: 'Ingreso' },
  { codigo: '4.1.03', nombre: 'Comisiones por apertura', naturaleza: 'Acreedora', tipo: 'Ingreso' },
  { codigo: '5.1.01', nombre: 'Gastos judiciales', naturaleza: 'Deudora', tipo: 'Gasto' },
]
