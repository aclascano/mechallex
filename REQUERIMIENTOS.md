# Mechallex · Requerimientos v2

Borrador para revisar con Andrea (13 nov 2026). Usa solo lógica general del sector; ninguna pantalla, texto ni dato se copia de otro sistema. Todo sigue siendo frontend con datos inventados.

Marca: ✅ hecho · 🟡 propuesta (confirmar) · ❓ duda abierta

## 0. Generales

- ✅ Quitar "entidad ficticia" del panel y del riel.
- ✅ La barra superior muestra fecha y hora (ya no "Corte al").
- ✅ Nueva navegación:
  - **General:** Panel
  - **Cartera:** Clientes · Operaciones · Nueva obligación
  - **Recaudo:** Pagos · Caja
  - **Recuperación:** Cobranza · Juicios
  - **Finanzas:** Contabilidad · Reportes
- ✅ Los formularios largos se llenan por pasos, con validación en línea y un borrador que se mantiene mientras navegas.

## 1. Clientes: módulo completo ✅

- **Listado:** búsqueda por nombre, cédula o RUC; filtros por ciudad, gestor, estado (al día / en mora / en juicio) y tipo (natural / jurídica).
- **Crear cliente** (por pasos):
  1. Identificación: tipo, cédula o RUC con validación del dígito verificador, nombres, fecha de nacimiento, estado civil.
  2. Contacto: teléfonos, correo, direcciones de domicilio y trabajo, y la referencia de ubicación.
  3. Actividad económica: actividad, ingresos, egresos y patrimonio, además de la capacidad de pago calculada.
  4. Referencias personales y comerciales.
  5. Cónyuge, si aplica.
  6. Consentimiento de contacto por canal (llamada, SMS, WhatsApp, correo). Lo usa Cobranza.
- **Editar:** los mismos pasos. Cada cambio queda en el historial ("quién cambió qué y cuándo").
- **Ficha del cliente:**
  - Pestañas: Resumen · Datos · Operaciones · Garantías que presta · Gestiones de cobranza · Documentos · Historial.
  - Exposición total: lo que debe como deudor y lo que respalda como garante.
- ✅ Sin eliminar: se **inactiva** con motivo, y solo si no tiene operaciones vigentes ni juicios.
- Pendiente para módulos siguientes: pestañas *Garantías que presta*, *Gestiones* y *Documentos* (llegan con Operaciones y Cobranza).

## 2. Operaciones (Cartera) ✅

- **Listado:** el actual, con más filtros (producto, oficina, gestor, etapa de cobranza).
- **Detalle de la operación**, con pestañas:
  - **Resumen:** condiciones, saldo, cuotas vencidas, días de mora, próxima cuota y etapa de cobranza.
  - **Tabla de amortización:** cada cuota con su estado (pagada, parcial, vencida o por vencer) y la fecha y monto efectivamente pagados.
  - **Garantes y garantías:**
    - Garantes personales, con un enlace a su ficha.
    - Garantías reales: hipoteca, prenda o encaje, con su avalúo y la cobertura sobre el saldo.
  - **Pagos:** pagos aplicados y su distribución entre mora, interés y capital.
  - **Estado de cuenta:**
    - Movimientos (desembolso, cuotas, pagos, cargos) con saldo corrido.
    - Rango de fechas configurable.
    - Vista imprimible / PDF del navegador.
  - **Cobranza:** etapa, promesas, causa judicial, convenios y bitácora de gestiones. ✅
  - **Documentos:** pagaré, tabla firmada y contrato. En la demo son solo nombres de archivo.
- **Acciones:**
  - Registrar pago y precancelación (liquidación a la fecha).
  - Abono a capital con recálculo.
  - Reestructurar o refinanciar (crea una operación nueva y cancela la anterior). 🟡 Pendiente.
  - Castigo (pasa a cuentas de orden). ✅
- ✅ Agregado: **tabla devengada** (interés reconocido por días, cobrado, por cobrar y en cuentas de orden).

## 3. Nueva obligación (reemplaza "Amortización") ✅

La pantalla actual era solo un simulador. Pasa a ser la **creación de la obligación**, por pasos:

1. **Deudor:** se busca un cliente existente o se crea uno sin salir del flujo.
2. **Producto y condiciones:**
   - Producto, monto, plazo, tasa (con el límite del producto), sistema francés o alemán, y frecuencia (mensual o quincenal). 🟡 Por ahora solo mensual.
   - Día de pago, periodo de gracia, seguro de desgravamen y gastos de apertura.
3. **Garantes y garantías:** quién garantiza y con qué. Se valida la cobertura mínima que exige el producto.
4. **Tabla de amortización:** vista previa con totales, gráfico capital/interés y la comparación francés vs. alemán.
5. **Revisión y aprobación:** resumen, capacidad de pago (cuota / ingreso neto) y alertas, por ejemplo si la cuota supera el 40 % del ingreso.
6. **Desembolso:**
   - Medio de desembolso y cuenta.
   - Genera la operación, su tabla y el asiento contable. Todo aparece al instante en Cartera, Panel y Contabilidad.

- ✅ El **simulador** sigue existiendo como acción rápida ("Simular"), sin crear nada.

## 4. Pagos y Caja ✅

- ✅ Registrar pago con **presimulación** (detalle por cuota) y comprobante imprimible.
- ✅ Consulta por tipo de búsqueda (cliente, operación, comprobante, fecha); ya no se listan todos los pagos.
- ✅ Reverso de pago con motivo y asiento inverso (solo del día y el último de la operación).
- ✅ Caja del día: recaudado por medio, efectivo esperado, arqueo por denominación y cierre.
- ✅ Recaudo masivo: archivo CSV, validación por línea y aplicación del lote.
- ✅ Clientes: indicadores de la base en el listado y comportamiento de pago en la ficha.


- **Registrar pago:**
  - Se busca la operación por cliente, cédula o número.
  - Vista previa de la distribución: mora, interés, capital y cuotas que cubre.
  - Tipos de pago:
    - cuota normal
    - pago parcial
    - varias cuotas
    - abono a capital
    - precancelación total
  - Medios: efectivo, transferencia, depósito, débito automático o cheque, con su referencia.
- **Comprobante de pago** imprimible.
- **Reverso de pago** con motivo. Recalcula el saldo y genera el asiento inverso.
- **Caja diaria:** apertura, pagos del día por medio, cuadre de efectivo y cierre.
- **Recaudo masivo:** carga de un archivo de pagos bancarios.
  - En la demo, un archivo de ejemplo.
  - Se muestra qué se aplicó, qué quedó pendiente y qué no se encontró.

## 5. Contabilidad ✅

Construida en ocho pestañas: diario, mayor, balance y cuadre, plan de cuentas, esquemas contables, provisiones, conciliación y cierre de mes. Incluye el castigo de operaciones.

- **Plan de cuentas:** árbol editable (activo, pasivo, patrimonio, ingresos, gastos y cuentas de orden).
- **Configuración contable:** qué cuentas mueve cada evento. Es la pieza clave, porque así el usuario ve que todo es automático.
  - desembolso, pago, mora
  - costas judiciales
  - castigo, provisión, reverso
- **Libros:** diario, mayor por cuenta y balance de comprobación.
- **Provisiones:** calificación de la cartera por días de mora (categorías de riesgo con su porcentaje) y el asiento mensual de provisión.
- **Conciliación y cierre:**
  - Cuadre cartera-contabilidad.
  - Conciliación bancaria.
  - Cierre de mes con checklist (pagos aplicados, provisión, conciliación, cuadre). Bloquea el periodo cerrado.

## 6. Cobranza automatizada: ampliación ✅

Se separó en dos módulos: **Gestión de cobranza** (trabajo diario) y **Cobranza automatizada** (configuración).

Lo que ya existe (campañas, reglas, promesas, n8n) se mantiene y se agrega:

- **Estrategias por segmento:** flujo visual por etapa (preventiva → administrativa → extrajudicial → judicial). Cada etapa define:
  - canales y frecuencia
  - plantilla
  - escalamiento si no hay respuesta
- **Plantillas de mensajes:** SMS, WhatsApp y correo con variables (nombre, monto, días de mora, enlace de pago) y una vista previa con un cliente real de la demo.
- **Bandeja del gestor:**
  - Cola priorizada del día con la ficha resumida, y el guion de llamada.
  - Registro rápido de la gestión: resultado, motivo de no pago, promesa y próxima acción.
- **Bitácora de gestiones:** el historial completo por operación y por gestor.
- **Asignación de cartera:** reparto de operaciones entre gestores, por tramo o ciudad, con su carga.
- **Convenios de pago:** acuerdos en cuotas sobre la deuda vencida, con su seguimiento.
- **Desempeño:** contactabilidad, tasa de promesas, cumplimiento y recuperado por gestor y por canal.
- **Calendario y horarios:** ventanas permitidas de contacto y feriados. No se contacta fuera de horario.
- **n8n:** se agregan una bitácora de ejecuciones (éxitos y errores) y webhooks de entrada (por ejemplo, la respuesta de WhatsApp). Sigue siendo solo interfaz.

## 7. Riesgo: scoring y provisiones ✅ (13 nov 2026)

### 7.1 Información socioeconómica más completa (en la ficha del cliente)

- **Ingresos desglosados:** sueldo, ingresos del negocio y otros.
- **Egresos desglosados:** vivienda, alimentación, educación, cuotas de otras deudas y otros.
- **Patrimonio:**
  - Activos: inmuebles, vehículos, ahorros y otros.
  - Pasivos: deudas en otras entidades.
  - Patrimonio neto calculado.
- **Empleo:**
  - Empresa donde trabaja, cargo, antigüedad laboral y tipo de contrato.
  - Si es independiente: si tiene RUC, su número, el tipo de actividad (sector) y la antigüedad del negocio.
- **Hogar:** tipo de vivienda (propia, arrendada o familiar) y cargas familiares.
- En Nueva obligación, un paso de **evaluación** muestra estos datos.
  - Si tienen más de 6 meses, avisa y pide actualizarlos antes de seguir.

### 7.2 Medidor de riesgo del deudor (scoring)

- **Score de 300 a 850** con una aguja, la banda (excelente, bueno, regular, alto riesgo) y la **probabilidad de no pago a 12 meses**.
- **Por qué sale ese puntaje:** cada variable suma o resta puntos y se ve en un gráfico.
  - Variables: carga de la cuota sobre el ingreso, capacidad libre, antigüedad laboral, patrimonio neto, deudas externas, puntualidad histórica, mora actual, garantía, etc.
- **Dos modelos:**
  - **De originación** para solicitantes nuevos: usa solo datos socioeconómicos.
  - **De comportamiento** para clientes con historial: además usa cómo ha pagado.
- **Dónde aparece:** en la aprobación de Nueva obligación (con sugerencia de aprobar, aprobar con condiciones o rechazar) y en la ficha del cliente.

### 7.3 Provisiones y su proyección (nuevo módulo "Riesgo y provisiones")

- **Provisión requerida hoy**, por calificación de cartera:
  - Categorías A1 a E según los días de mora.
  - Un porcentaje por categoría (parámetros de la demo).
- **Pérdida esperada** por operación (probabilidad de no pago × pérdida si no paga × saldo).
  - La pérdida si no paga depende de la garantía: es menor con hipoteca y mayor sin garantía.
- **Proyección a 3, 6 y 12 meses:**
  - Se usan las tasas de rodamiento entre tramos de mora, calculadas con los últimos 12 meses de la propia cartera.
  - Resultado: cuánto saldo pasará a mora y cuánta provisión adicional habrá que constituir mes a mes.
- **Comparaciones:** provisión requerida frente a la constituida y frente a la pérdida esperada, con desglose por producto, gestor y calificación.
- **Simulador de estrés:** "¿y si la mora sube 20 %?".

**Transparencia:**
- Los datos son inventados.
- Los cálculos (rodamiento, pérdida esperada) se hacen de verdad sobre la cartera de la demo.
- Los pesos del scoring son reglas expertas de demostración, no un modelo entrenado ni validado.

## 8. Orden sugerido de construcción

1. Clientes (crear, editar, ficha), porque las demás partes dependen de él. ✅
2. Operación: detalle con garantes y estado de cuenta. ✅
3. Nueva obligación. ✅
4. Pagos y Caja. ✅
5. Riesgo: datos socioeconómicos, scoring y provisiones. ✅
6. Cobranza ampliada. ✅
7. Contabilidad (con el asiento mensual de provisiones que sale de 7.3). ✅
