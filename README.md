# Mechallex

ERP de gestión de cartera y cobranza de la familia **Mechal**. Esta versión es **solo frontend con datos ficticios** y sirve como demo para el portafolio. El backend todavía no está definido.

> Todos los nombres, cédulas, teléfonos, montos, causas judiciales y la entidad ("Cooperativa Nueve Volcanes") son inventados.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # compila a dist/ (rutas relativas, sirve en cualquier hosting estático o iframe)
npm run preview
```

Stack: Vite + React + TypeScript + Tailwind CSS v4 + Recharts, React Router (HashRouter) e íconos de Lucide. Tipografías autoalojadas: Bodoni Moda (títulos y cifras) y Hanken Grotesk (interfaz).

## Módulos

| Ruta | Módulo | Qué muestra |
|---|---|---|
| `#/` | Panel | Saldo, morosidad, recuperado vs. exigible, cartera por antigüedad (roseta guilloché), promesas, juicios, campañas y dónde actuar hoy. |
| `#/clientes` | Clientes | Listado con filtros; alta y edición en seis pasos (identificación con validación de cédula/RUC, contacto, actividad económica y capacidad de pago, referencias y cónyuge, canales autorizados y gestor); ficha con pestañas, historial de cambios y **comportamiento de pago** (puntualidad, atrasos, calificación interna). El listado trae indicadores de la base: activos, nuevos, en mora, antigüedad, altas por año, edad, ciudades, gestores y segmentos. Los clientes no se borran: se inactivan, y solo si no tienen operaciones vigentes ni juicios. |
| `#/operaciones` | Operaciones | Cartera con filtros (antigüedad, producto, origen, etapa, gestor, estado) y orden. El detalle tiene pestañas: resumen con saldos a la fecha (para ponerse al día y para cancelar hoy), tabla de amortización con fecha y atraso de cada pago, **tabla devengada**, garantías y cobertura, pagos, **estado de cuenta** imprimible, cobranza y documentos. Acciones: registrar pago, abono a capital con recálculo y precancelación. |
| `#/obligaciones/nueva` | Nueva obligación | Originación en seis pasos: deudor (o alta de cliente sin salir del flujo), producto y condiciones (tasa con techo, día de pago, gracia, seguro), garantes y garantías con cobertura mínima, tabla con comparación francés/alemán, aprobación con capacidad de pago y alertas, y desembolso con su asiento contable. |
| `#/amortizacion` | Simulador | Simulación rápida francés / alemán sin crear nada. |
| `#/pagos` | Pagos y abonos | **Registrar:** buscar la operación, elegir el valor (ponerse al día, por cuotas o valor libre) y revisar la **presimulación** cuota por cuota antes de confirmar; emite comprobante imprimible. **Consultar:** búsqueda por cliente, operación, comprobante o fecha (no lista toda la cartera), con totales y comprobante de cada pago. |
| `#/cobranza` | Cobranza automatizada | Campañas (llamada, SMS, WhatsApp, correo), reglas por días de mora, promesas y la pantalla de integración con **n8n** (solo interfaz). |
| `#/juicios` | Juicios | Tablero kanban por etapa procesal, lista, expediente con actuaciones y costas. |
| `#/contabilidad` | Contabilidad | Libro diario, balance de comprobación, cuadre cartera-contabilidad y conciliación bancaria. |
| `#/reportes` | Reportes | Evolución de saldo y morosidad, composición de lo recuperado, cartera por producto, ciudad y gestor, con su tabla de valores. |

## Coherencia de los datos

Los datos no son números sueltos: se **generan** a partir de reglas, con una semilla fija para que salgan iguales en cada carga.

- Cada operación tiene su tabla de amortización real (`src/domain/amortizacion.ts`). La suma del capital es igual al monto desembolsado.
- Los pagos se aplican en orden: recargo por mora, luego interés y luego capital de la cuota más antigua (`src/domain/cartera.ts`). El saldo es `monto − capital pagado`.
- Los días de mora, el tramo de antigüedad y la etapa de cobranza se calculan a partir de la primera cuota impaga.
- La tabla devengada reconoce el interés de cada cuota día a día. Con más de 60 días de mora (parámetro de la demo, `DIAS_SUSPENSION_DEVENGO`), el interés pasa a cuentas de orden.
- Un abono a capital recalcula las cuotas futuras (bajar cuota o acortar plazo). La precancelación cobra capital, interés devengado hasta hoy y recargo, y libera las garantías.
- Los juicios nacen de las operaciones con más de 120 días de mora; sus costas generan asientos de gasto.
- Cada desembolso, pago y costa genera su asiento contable. La cuenta *1.4.01 Cartera de créditos* cuadra al centavo con la suma de saldos de las operaciones (lo verás en **Contabilidad → Balance y cuadre**).
- Al desembolsar una nueva obligación se crean la operación, su tabla, sus garantías y el asiento (cartera al debe; bancos, comisión y seguro al haber). Aparece de inmediato en Operaciones, Panel y Contabilidad.
- Si creas o editas un cliente, el cambio queda en su historial con usuario, fecha y hora.
- Si registras un pago en la demo, baja el saldo de la operación, del cliente y del panel, sube lo recuperado del mes y aparece su asiento. Esto vive en memoria: al recargar la página se vuelve a los datos iniciales.

La fecha de corte de la demo está fija en **13 de noviembre de 2026** (`HOY` en `src/mocks/catalogos.ts`).

## Arquitectura

```
src/
  domain/      Reglas de negocio puras: fechas, amortización, estado de cartera, clientes, identificación, tipos
  mocks/       Datos ficticios: catálogos, generador con semilla, base en memoria (db.ts)
  services/    api.ts — la única puerta de entrada de las pantallas a los datos
  lib/         Formatos (USD es-EC), hook useServicio
  components/  Layout, UI base, gráficos y la roseta guilloché
  pages/       Una pantalla por módulo
```

Las pantallas **nunca** importan de `src/mocks`: solo llaman funciones asíncronas de `src/services/api.ts` (por ejemplo `obtenerPanel()` o `registrarPago()`).

## Cómo cambiar los datos

- **Cambiar nombres, ciudades, gestores o la entidad:** edita `src/mocks/catalogos.ts`.
- **Más o menos clientes:** `generarClientes(118)` en `src/mocks/generar.ts`. Los datos de ficha (direcciones, ingresos, referencias) salen de `src/mocks/fichas.ts`, con su propia semilla.
- **Más o menos mora:** el reparto de perfiles (`puntual`, `atrasado`, `irregular`) y la lista `ATRASOS` (meses sin pagar) en `src/mocks/generar.ts`.
- **Otro conjunto aleatorio:** cambia la semilla en `crearRng(20261113)`.
- **Garantes y garantías:** `src/mocks/garantias.ts`; la cobertura mínima por producto está en `COBERTURA_MINIMA` (`src/domain/operacion.ts`).
- **Condiciones de producto para nuevas obligaciones** (comisión, seguro, gracia máxima): `CONDICIONES_PRODUCTO` en `src/mocks/catalogos.ts`; rangos de tasa, plazo y monto en `PRODUCTOS`.
- **Campañas, reglas, flujos n8n y plan de cuentas:** `src/mocks/cobranza.ts`.
- **Fecha de corte:** `HOY` en `src/mocks/catalogos.ts`.

## Cómo conectarlo a una API real

1. Mantén las firmas de `src/services/api.ts` (lo que devuelve cada función).
2. Reemplaza el cuerpo de cada función por un `fetch` a tu backend, por ejemplo:
   ```ts
   export async function listarOperaciones() {
     const r = await fetch('/api/operaciones')
     return (await r.json()) as OperacionVista[]
   }
   ```
3. Cuando ya no se use, elimina `src/mocks`. Las pantallas no cambian.

Las reglas de `src/domain` (amortización, aplicación de pagos) pueden quedarse en el frontend para simulaciones o moverse al backend.

## Diseño

Mundo visual: la **impresión de seguridad** de los títulos valor (pagaré, cheque, billete). La paleta es monocroma: negro, blanco y grises, con un acento morado (alrededor del 10 %). Lleva cifras en Bodoni, microimpresión como filete y una **roseta guilloché** cuyos anillos codifican la cartera por antigüedad. Tiene modo claro y oscuro (se recuerda en el navegador) y es responsive y navegable con teclado. Los detalles están en `DESIGN.md`.
