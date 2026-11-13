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
| `#/clientes` | Clientes | Búsqueda por nombre, cédula o ciudad; ficha con operaciones, pagos, promesas y causas. |
| `#/operaciones` | Operaciones | Cartera con filtros y orden; el detalle trae la tabla de amortización con el estado de cada cuota y un formulario de pago. |
| `#/amortizacion` | Amortización | Simulador francés / alemán, comparación de cuotas y recálculo con abono extraordinario (bajar cuota o acortar plazo). |
| `#/pagos` | Pagos y abonos | Historial filtrable y registro de pagos con vista previa del efecto en el saldo. |
| `#/cobranza` | Cobranza automatizada | Campañas (llamada, SMS, WhatsApp, correo), reglas por días de mora, promesas y la pantalla de integración con **n8n** (solo interfaz). |
| `#/juicios` | Juicios | Tablero kanban por etapa procesal, lista, expediente con actuaciones y costas. |
| `#/contabilidad` | Contabilidad | Libro diario, balance de comprobación, cuadre cartera-contabilidad y conciliación bancaria. |
| `#/reportes` | Reportes | Evolución de saldo y morosidad, composición de lo recuperado, cartera por producto, ciudad y gestor, con su tabla de valores. |

## Coherencia de los datos

Los datos no son números sueltos: se **generan** a partir de reglas, con una semilla fija para que salgan iguales en cada carga.

- Cada operación tiene su tabla de amortización real (`src/domain/amortizacion.ts`). La suma del capital es igual al monto desembolsado.
- Los pagos se aplican en orden: recargo por mora, luego interés y luego capital de la cuota más antigua (`src/domain/cartera.ts`). El saldo es `monto − capital pagado`.
- Los días de mora, el tramo de antigüedad y la etapa de cobranza se calculan a partir de la primera cuota impaga.
- Los juicios nacen de las operaciones con más de 120 días de mora; sus costas generan asientos de gasto.
- Cada desembolso, pago y costa genera su asiento contable. La cuenta *1.4.01 Cartera de créditos* cuadra al centavo con la suma de saldos de las operaciones (lo verás en **Contabilidad → Balance y cuadre**).
- Si registras un pago en la demo, baja el saldo de la operación, del cliente y del panel, sube lo recuperado del mes y aparece su asiento. Esto vive en memoria: al recargar la página se vuelve a los datos iniciales.

La fecha de corte de la demo está fija en **13 de noviembre de 2026** (`HOY` en `src/mocks/catalogos.ts`).

## Arquitectura

```
src/
  domain/      Reglas de negocio puras: fechas, amortización, estado de cartera, tipos
  mocks/       Datos ficticios: catálogos, generador con semilla, base en memoria (db.ts)
  services/    api.ts — la única puerta de entrada de las pantallas a los datos
  lib/         Formatos (USD es-EC), hook useServicio
  components/  Layout, UI base, gráficos y la roseta guilloché
  pages/       Una pantalla por módulo
```

Las pantallas **nunca** importan de `src/mocks`: solo llaman funciones asíncronas de `src/services/api.ts` (por ejemplo `obtenerPanel()` o `registrarPago()`).

## Cómo cambiar los datos

- **Cambiar nombres, ciudades, gestores o la entidad:** edita `src/mocks/catalogos.ts`.
- **Más o menos clientes:** `generarClientes(118)` en `src/mocks/generar.ts`.
- **Más o menos mora:** el reparto de perfiles (`puntual`, `atrasado`, `irregular`) y la lista `ATRASOS` (meses sin pagar) en `src/mocks/generar.ts`.
- **Otro conjunto aleatorio:** cambia la semilla en `crearRng(20261113)`.
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

Mundo visual: la **impresión de seguridad** de los títulos valor (pagaré, cheque, billete). Hay un riel verde tinta, un papel de seguridad rosado pálido, tinta palo de rosa, cifras en Bodoni, microimpresión como filete y una **roseta guilloché** cuyos anillos codifican la cartera por antigüedad. Tiene modo claro y oscuro (se recuerda en el navegador) y es responsive y navegable con teclado. Los detalles están en `DESIGN.md`.
