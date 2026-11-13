# CLAUDE.md · Mechallex

Guía para trabajar en este repositorio (personas y Claude). Última actualización: **13 de noviembre de 2026**.

## Qué es

Mechallex es un ERP de **gestión de cartera y cobranza** de la familia Mechal, de Andrea Lascano. Esta versión es **solo frontend con datos inventados** y sirve como demo de portafolio. El backend todavía no está definido.

## Reglas firmes (no negociables)

- **Producto propio, hecho desde cero.** No se copia código, pantallas, nombres, logos, textos ni datos de NISA ni de la empresa de Andrea. Solo se usa lógica general del sector.
- **Todos los datos son inventados:** personas, cédulas, montos, causas y la entidad "Cooperativa Nueve Volcanes". Nunca se usan datos reales.
- **Mechaltrendy** (`D:\PRIVATE\invitaciones_digitales`) es código privado: no se enlaza desde el portafolio.
- Si Andrea menciona cómo lo hacía en otro sistema (por ejemplo, "como en Fenix"), se le pide que describa el **comportamiento** en palabras y se diseña desde cero.
- Idioma: **español** en la interfaz, los textos y la comunicación.

## Diseño

- Gusto de Andrea: **minimalista, elegante, tech**. Paleta **negro, blanco y grises con ~10 % de morado**. La paleta rosa fue rechazada por "muy girl".
- Mundo visual: impresión de seguridad (pagaré, billete). Cifras en Bodoni Moda e interfaz en Hanken Grotesk, roseta guilloché y microimpresión. Detalle en `DESIGN.md` y `PRODUCT.md`.
- Los tokens se llaman `--rose*` por compatibilidad, pero guardan el acento morado.
- Modo claro y oscuro, responsive (probar a 375 px) y accesible.

## Cómo correrlo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build → dist/ (rutas relativas, HashRouter)
```

- Requisitos: Node 20.19 o superior (Vite 8). Aquí se usó Node 24.
- En la app de escritorio de Claude, el servidor de vista previa se llama **mechallex** y usa el puerto 5180 (`D:\PRIVATE\.claude\launch.json`).

## Arquitectura (respetarla)

```
src/
  domain/      Reglas puras: fechas, amortizacion, cartera, operacion (saldos, devengo, detalle de pago),
               clientes, identificacion, obligacion, riesgo (score), provisiones, cobranza, contabilidad, tipos
  mocks/       Datos de la demo: catalogos, generar (semilla 20261113), fichas, garantias, gestiones, cobranza, db
  services/    api.ts: la ÚNICA puerta de las pantallas a los datos (funciones async con 140 ms de latencia)
  lib/         formato (USD es-EC), useServicio (refresca al cambiar la base), canales
  components/  ui, Layout, gráficos, roseta, Pasos, Dialogo, medidor de riesgo, bandeja del gestor…
  pages/       Una pantalla por módulo
```

- Las pantallas **no** importan de `src/mocks`, solo de `services/api.ts` (y de `domain` para cálculos puros).
- Fecha de la demo fija: `HOY = '2026-11-13'` en `src/mocks/catalogos.ts`.
- Cada parte de los datos usa **su propia semilla**, para que agregar datos no cambie la cartera:

  | Datos | Semilla |
  |---|---|
  | Fichas | 7031 |
  | Datos socioeconómicos | 5120 |
  | Altas | 9902 |
  | Ingresos | 3307 |
  | Garantías | 4417 |
  | Gestiones | 6021 |
  | Ejecuciones de n8n | 7710 |

- Las mutaciones llaman a `notificar()` y las pantallas se recargan solas. Todo vive en memoria: al recargar, la demo vuelve al estado inicial.
- **Coherencia que no se debe romper** (verificar después de cada cambio):
  - Saldo del panel: **$1.786.196**, con 142 operaciones.
  - Morosidad: **11,1 %**.
  - Contabilidad → Balance y cuadre: diferencia de **$0,00** entre cartera y contabilidad.
  - Debe igual a haber.

## Cómo verificar

- `npx tsc -b` y `npx vite build`, ambos sin errores.
- Capturas de escritorio con Chrome headless, a 1440 px:

  ```bash
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=6000 --window-size=1440,1100 --screenshot='D:\PRIVATE\mechallex\.impeccable\review\x.png' 'http://localhost:5180/#/ruta'
  ```

- La captura headless **no sirve para móvil**: tiene un ancho mínimo y aparenta desbordes que no existen. Para móvil, usa el panel del navegador a 375 px y comprueba que `document.documentElement.scrollWidth === 375`.
- Las capturas van a `.impeccable/review/`, que está en `.gitignore`.

## Módulos (estado al 13 nov 2026)

Todos están hechos. El detalle por pantalla está en `README.md` y el alcance en `REQUERIMIENTOS.md`.

| Módulo | Ruta | Qué tiene |
|---|---|---|
| Panel | `#/` | Indicadores y roseta de antigüedad |
| Clientes | `#/clientes` | Alta y edición en 6 pasos (cédula/RUC validados), situación socioeconómica completa (vence a los 6 meses), score de riesgo, comportamiento de pago, historial de cambios, inactivar en lugar de borrar, garantías que presta, indicadores de la base |
| Operaciones | `#/operaciones` | Saldos a la fecha, tabla de amortización con fecha y atraso de pago, tabla devengada, garantías y cobertura, estado de cuenta imprimible, cobranza, documentos. Acciones: pago, abono a capital, precancelación, castigo |
| Nueva obligación | `#/obligaciones/nueva` | Deudor → condiciones → garantías → tabla → aprobación con score (riesgo alto solo como excepción justificada) → desembolso con asiento |
| Pagos | `#/pagos` | Registro con presimulación y comprobante, consulta por tipo de búsqueda, reverso, caja del día con arqueo, recaudo masivo CSV |
| Gestión de cobranza | `#/gestion` | Bandeja del gestor, bitácora, promesas y convenios, asignación y balanceo, desempeño |
| Cobranza automatizada | `#/cobranza` | Estrategia por etapa, plantillas, campañas, reglas, horarios y feriados, n8n (ejecuciones y webhooks, solo interfaz) |
| Juicios | `#/juicios` | Kanban, lista, expediente y costas |
| Riesgo y provisiones | `#/riesgo` | Calificación A1–E, pérdida esperada, matriz de rodamiento, proyección a 12 meses con estrés |
| Contabilidad | `#/contabilidad` | Diario, mayor, balance y cuadre, plan de cuentas editable, esquemas contables editables, provisiones, conciliación, cierre de mes con bloqueo del periodo |
| Reportes | `#/reportes` | Gráficos y tablas de cartera |

## Historial de cambios de esta sesión (13 nov 2026)

| Commit | Cambio |
|---|---|
| `fd6a639` | Demo inicial: layout, panel y módulos base |
| `41bc309` | Paleta monocroma con acento morado |
| `f979eff` | Clientes: alta y edición por pasos, ficha con pestañas e historial; fecha y hora en la barra; se quitó "entidad ficticia" |
| `58f2f27` | Operaciones: saldos, tabla devengada, garantías, estado de cuenta, abono a capital, precancelación |
| `141108e` | Nueva obligación en seis pasos |
| `a55f422` | Pagos con presimulación y búsqueda; estadísticas de clientes |
| `8b8fb42` | Reverso de pago, caja del día y recaudo masivo |
| `493bc3e` | Riesgo: datos socioeconómicos, score 300–850 y provisiones con proyección |
| `f830bb0` | Cobranza: gestión diaria y automatización ampliada |
| (este commit) | Contabilidad completa (mayor, plan, esquemas, provisiones, castigo, cierre de mes) y este CLAUDE.md |

Datos de la demo que se ajustaron en el camino (sin cambiar las cifras del panel):

- Ingresos coherentes con los créditos.
- Fechas de alta cercanas al primer crédito.
- Asiento de provisión acumulada al 31 de octubre.

## Pendientes conocidos

- **Reestructurar o refinanciar** una operación (crear una nueva y cancelar la anterior).
- **Frecuencia quincenal** en nuevas obligaciones (hoy solo mensual).
- Al precancelar o castigar una operación en juicio, la causa sigue abierta: falta cerrarla o archivarla desde Juicios.
- Documentos: solo se registran, no se suben archivos.
- Pagos de recuperación sobre cartera castigada (cuenta 4.2.01 lista, falta el flujo).
- Backend real: reemplazar los cuerpos de `services/api.ts` por `fetch` (guía en `README.md`).
- Montar la demo dentro del portafolio (`D:\PRIVATE\andrea-portafolio`) en el mockup de laptop: `npm run build` y servir `dist/`, o publicarla y usar un iframe.

## Qué tiene que hacer Andrea en casa

1. **Antes de irte**, sube los cambios desde esta computadora. La rama `main` va adelantada respecto de GitHub y sin esto en casa no tendrás nada:
   ```bash
   git push
   ```
2. **En casa, la primera vez:**
   ```bash
   git clone https://github.com/aclascano/mechallex.git
   cd mechallex
   ```
   Si ya lo tenías clonado: `git pull`.
3. Revisa que tengas **Node 20.19 o superior**: `node -v`. Si no, instala Node 22 LTS.
4. Instala y levanta la demo:
   ```bash
   npm install
   npm run dev
   ```
   Abre http://localhost:5173.
5. **Recorrido sugerido para revisar**:
   1. Panel.
   2. Clientes → un cliente → Score de riesgo.
   3. Nueva obligación, de punta a punta.
   4. Pagos → presimulación → comprobante.
   5. Gestión de cobranza → bandeja.
   6. Riesgo y provisiones → estrés.
   7. Contabilidad → Provisiones → registrar.
   8. Contabilidad → Cierre de mes.
6. **Decisiones que quedan para ti:**
   - Qué pendiente sigue: reestructuración, frecuencia quincenal o cierre de juicios.
   - Cuándo montar la demo en el portafolio.
   - Revisar los textos y los parámetros de demostración: porcentajes de provisión, pesos del score y política del 40 %.
