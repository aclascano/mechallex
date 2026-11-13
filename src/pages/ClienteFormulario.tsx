import { ArrowLeft, ArrowRight, Building2, Check, Plus, Trash2, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Pasos } from '../components/Pasos'
import { Boton, Campo, Encabezado, Entrada, EsqueletoPagina, Interruptor, Panel, Segmentado, Selector, Vacio } from '../components/ui'
import {
  CANALES, capacidadPago, clienteVacio, conTotales, SECTORES, ESTADOS_CIVILES, PASOS_CLIENTE, requiereConyuge, validarPaso, type Errores, type PasoCliente,
} from '../domain/clientes'
import { fmtFecha } from '../domain/fechas'
import type { DatosCliente, Direccion, SituacionLaboral, Socioeconomico } from '../domain/tipos'
import { ICONO_CANAL } from '../lib/canales'
import { cx, dinero, porcentaje } from '../lib/formato'
import { actualizarCliente, catalogosCliente as cat, crearCliente, fechaCorte, identificacionUsada, obtenerDatosCliente } from '../services/api'

// Borrador del alta: sobrevive mientras se navega por la app (no al recargar).
let borrador: { datos: DatosCliente; paso: number } | null = null

export default function PaginaClienteFormulario() {
  const { id } = useParams()
  const editando = Boolean(id)
  const [datos, setDatos] = useState<DatosCliente | null>(() => (editando ? null : borrador?.datos ?? clienteVacio(cat.gestores[0], fechaCorte())))
  const [original, setOriginal] = useState<DatosCliente | null>(null)
  const [paso, setPaso] = useState(() => (editando ? 0 : borrador?.paso ?? 0))
  const [intentado, setIntentado] = useState<Set<number>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')
  const [noEncontrado, setNoEncontrado] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const volverAObligacion = params.get('volver') === 'obligacion'
  const titulo = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!id) return
    obtenerDatosCliente(id).then((c) => {
      if (!c) return setNoEncontrado(true)
      setDatos(c)
      setOriginal(structuredClone(c))
    })
  }, [id])

  useEffect(() => {
    if (!editando && datos) borrador = { datos, paso }
  }, [datos, paso, editando])

  const opts = useMemo(() => ({
    hoy: fechaCorte(),
    identificacionUsada: (n: string) => identificacionUsada(n, id),
    validarId: !editando || (original !== null && datos !== null && (original.cedula !== datos.cedula || original.tipoIdentificacion !== datos.tipoIdentificacion)),
  }), [id, editando, original, datos])

  if (noEncontrado) return <Vacio titulo="Cliente no encontrado"><Link to="/clientes" className="text-rose-ink underline">Volver a clientes</Link></Vacio>
  if (!datos) return <EsqueletoPagina />

  const pasos = PASOS_CLIENTE
  const actual = pasos[paso].id
  const erroresDe = (p: PasoCliente) => validarPaso(datos, p, opts)
  const errores: Errores = intentado.has(paso) ? erroresDe(actual) : {}
  const pasoValido = (i: number) => Object.keys(erroresDe(pasos[i].id)).length === 0
  const ultimo = paso === pasos.length - 1

  const set = <K extends keyof DatosCliente>(k: K, v: DatosCliente[K]) => setDatos((d) => (d ? conTotales({ ...d, [k]: v }) : d))
  const ir = (i: number) => {
    setPaso(i)
    requestAnimationFrame(() => titulo.current?.focus())
  }
  const siguiente = () => {
    setIntentado((s) => new Set(s).add(paso))
    if (pasoValido(paso)) ir(paso + 1)
  }
  const puedeIrA = (i: number) => editando || i <= paso || pasos.slice(0, i).every((_, j) => pasoValido(j))

  async function guardar() {
    const invalido = pasos.findIndex((_, i) => i < pasos.length - 1 && !pasoValido(i))
    if (invalido >= 0) {
      setIntentado((s) => new Set(s).add(invalido))
      return ir(invalido)
    }
    setGuardando(true)
    setErrorGuardar('')
    try {
      if (editando && id) {
        const r = await actualizarCliente(id, datos!)
        navigate(volverAObligacion ? `/obligaciones/nueva?cliente=${id}` : `/clientes/${id}?guardado=${r.cambios}`)
      } else {
        const c = await crearCliente(datos!)
        borrador = null
        navigate(volverAObligacion ? `/obligaciones/nueva?cliente=${c.id}` : `/clientes/${c.id}?creado=1`)
      }
    } catch (e) {
      setErrorGuardar((e as Error).message)
      setGuardando(false)
    }
  }

  const natural = datos.tipoPersona === 'Natural'
  const nombreVista = natural ? `${datos.nombres} ${datos.apellidos}`.trim() : datos.nombre

  return (
    <div>
      <Link to={volverAObligacion ? '/obligaciones/nueva' : editando ? `/clientes/${id}` : '/clientes'} className="mb-3 inline-flex items-center gap-1.5 text-[0.8rem] text-ink-3 hover:text-ink">
        <ArrowLeft size={14} /> {volverAObligacion ? 'Volver a la obligación' : editando ? 'Volver a la ficha' : 'Clientes'}
      </Link>
      <Encabezado
        titulo={editando ? 'Editar cliente' : 'Nuevo cliente'}
        descripcion={editando
          ? <>Los cambios quedan en el historial con tu nombre, la fecha y la hora. Al guardar, los datos socioeconómicos quedan verificados hoy{volverAObligacion ? ' y vuelves a la obligación' : ''}.</>
          : volverAObligacion
            ? <>Al guardarlo vuelves a la nueva obligación con este cliente como deudor.</>
            : <>Seis pasos. Lo que llenes se guarda como borrador mientras navegas por la aplicación.</>}
        acciones={!editando && borrador && (datos.cedula || datos.nombres || datos.nombre) ? (
          <Boton variante="fantasma" onClick={() => { borrador = null; setDatos(clienteVacio(cat.gestores[0], fechaCorte())); setIntentado(new Set()); ir(0) }}>Descartar borrador</Boton>
        ) : undefined}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-8">
        {/* Pasos */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Pasos pasos={pasos} actual={paso} hecho={pasoValido} conError={(i) => intentado.has(i) && !pasoValido(i) && i !== pasos.length - 1} puedeIrA={puedeIrA} onIr={ir} />

          <div className="mt-5 hidden rounded-[14px] border border-line bg-panel p-4 lg:block">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-soft text-rose-ink">
                {natural ? <UserRound size={18} /> : <Building2 size={18} />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[0.875rem] font-medium">{nombreVista || <span className="text-ink-3">Sin nombre aún</span>}</p>
                <p className="tabular truncate text-[0.75rem] text-ink-3">{datos.cedula ? `${datos.tipoIdentificacion} ${datos.cedula}` : 'Sin identificación'}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[0.8rem]">
              <div className="flex justify-between gap-2"><dt className="text-ink-3">Ciudad</dt><dd className="truncate">{datos.domicilio.ciudad || '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-3">Capacidad de pago</dt><dd className="tabular font-medium">{datos.ingresos ? dinero(capacidadPago(datos)) : '—'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-3">Gestor</dt><dd className="truncate">{datos.gestor}</dd></div>
            </dl>
          </div>
        </aside>

        {/* Contenido del paso */}
        <div className="min-w-0">
          <Panel cuerpo="p-5 sm:p-6">
            <div className="mb-6">
              <p className="text-[0.75rem] font-medium tracking-wide text-ink-3 uppercase">Paso {paso + 1} · {pasos[paso].detalle}</p>
              <h2 ref={titulo} tabIndex={-1} className="display mt-1 text-[1.6rem] leading-tight focus:outline-none">{pasos[paso].titulo}</h2>
            </div>
            <div key={actual} style={{ animation: 'aparecer 220ms var(--ease-out-expo) both' }}>
              {actual === 'identificacion' && <PasoIdentificacion d={datos} set={set} setDatos={setDatos} e={errores} editando={editando} />}
              {actual === 'contacto' && <PasoContacto d={datos} set={set} e={errores} />}
              {actual === 'economia' && <PasoEconomia d={datos} set={set} e={errores} />}
              {actual === 'referencias' && <PasoReferencias d={datos} set={set} e={errores} />}
              {actual === 'cobranza' && <PasoCobranza d={datos} set={set} e={errores} />}
              {actual === 'revision' && <PasoRevision d={datos} ir={ir} />}
            </div>
          </Panel>

          {errorGuardar && <p role="alert" className="mt-3 rounded-[10px] bg-bad-soft px-3 py-2 text-[0.85rem] font-medium text-bad">{errorGuardar}</p>}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Boton variante="fantasma" onClick={() => ir(paso - 1)} disabled={paso === 0} icono={<ArrowLeft size={16} />}>Atrás</Boton>
            <div className="flex flex-wrap gap-2">
              {editando && !ultimo && <Boton onClick={guardar} disabled={guardando}>Guardar cambios</Boton>}
              {ultimo ? (
                <Boton variante="primario" onClick={guardar} disabled={guardando} icono={<Check size={16} />}>
                  {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear cliente'}
                </Boton>
              ) : (
                <Boton variante="primario" onClick={siguiente}>Siguiente <ArrowRight size={16} /></Boton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pasos ───────────────────────────────────────────────────────────────────
type Fijar = <K extends keyof DatosCliente>(k: K, v: DatosCliente[K]) => void
interface PasoProps { d: DatosCliente; set: Fijar; e: Errores }

function Grupo({ titulo, children, detalle }: { titulo: string; detalle?: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-5 first:border-t-0 first:pt-0 [&+&]:mt-6">
      <legend className="float-left mb-4 w-full">
        <span className="block text-[0.875rem] font-semibold text-ink">{titulo}</span>
        {detalle && <span className="block text-[0.8rem] text-ink-3">{detalle}</span>}
      </legend>
      <div className="clear-both grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v)))

function PasoIdentificacion({ d, set, setDatos, e, editando }: PasoProps & { setDatos: (f: (d: DatosCliente | null) => DatosCliente | null) => void; editando: boolean }) {
  const natural = d.tipoPersona === 'Natural'
  return (
    <div>
      <Grupo titulo="Tipo de cliente">
        <div className="sm:col-span-2">
          <Segmentado
            etiqueta="Tipo de persona"
            valor={d.tipoPersona}
            onCambio={(v) => setDatos((x) => x && ({
              ...x,
              tipoPersona: v,
              tipoIdentificacion: v === 'Jurídica' ? 'RUC' : x.tipoIdentificacion,
              segmento: v === 'Jurídica' ? (x.segmento === 'Personas' ? 'Microempresa' : x.segmento) : 'Personas',
              situacionLaboral: v === 'Jurídica' ? 'Empresa' : x.situacionLaboral === 'Empresa' ? 'Dependiente' : x.situacionLaboral,
            }))}
            opciones={[{ id: 'Natural', label: 'Persona natural' }, { id: 'Jurídica', label: 'Persona jurídica' }]}
          />
        </div>
        <Campo etiqueta="Tipo de identificación">
          <Selector value={d.tipoIdentificacion} onChange={(ev) => set('tipoIdentificacion', ev.target.value as DatosCliente['tipoIdentificacion'])} disabled={!natural}>
            {(natural ? ['Cédula', 'RUC', 'Pasaporte'] : ['RUC']).map((t) => <option key={t}>{t}</option>)}
          </Selector>
        </Campo>
        <Campo
          etiqueta={`Número de ${d.tipoIdentificacion.toLowerCase()}`}
          error={e.cedula}
          ayuda={editando ? 'Si la cambias, se valida de nuevo.' : d.tipoIdentificacion === 'Cédula' ? 'Se valida el dígito verificador.' : undefined}
        >
          <Entrada value={d.cedula} onChange={(ev) => set('cedula', ev.target.value.replace(/\s/g, ''))} inputMode={d.tipoIdentificacion === 'Pasaporte' ? 'text' : 'numeric'} maxLength={13} aria-invalid={!!e.cedula} autoComplete="off" />
        </Campo>
      </Grupo>

      {natural ? (
        <Grupo titulo="Datos personales">
          <Campo etiqueta="Nombres" error={e.nombres}><Entrada value={d.nombres} onChange={(ev) => set('nombres', ev.target.value)} aria-invalid={!!e.nombres} autoComplete="given-name" /></Campo>
          <Campo etiqueta="Apellidos" error={e.apellidos}><Entrada value={d.apellidos} onChange={(ev) => set('apellidos', ev.target.value)} aria-invalid={!!e.apellidos} autoComplete="family-name" /></Campo>
          <Campo etiqueta="Fecha de nacimiento" error={e.fechaNacimiento}><Entrada type="date" value={d.fechaNacimiento} max={fechaCorte()} onChange={(ev) => set('fechaNacimiento', ev.target.value)} aria-invalid={!!e.fechaNacimiento} /></Campo>
          <Campo etiqueta="Estado civil" error={e.estadoCivil}>
            <Selector value={d.estadoCivil} onChange={(ev) => set('estadoCivil', ev.target.value as DatosCliente['estadoCivil'])} aria-invalid={!!e.estadoCivil}>
              <option value="">Elegir…</option>
              {ESTADOS_CIVILES.map((x) => <option key={x}>{x}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Género" opcional>
            <Selector value={d.genero} onChange={(ev) => set('genero', ev.target.value as DatosCliente['genero'])}>
              <option value="">Prefiere no indicar</option>
              <option>Femenino</option><option>Masculino</option><option>Otro</option>
            </Selector>
          </Campo>
          <Campo etiqueta="Nacionalidad"><Entrada value={d.nacionalidad} onChange={(ev) => set('nacionalidad', ev.target.value)} /></Campo>
        </Grupo>
      ) : (
        <Grupo titulo="Datos de la empresa">
          <Campo etiqueta="Razón social" error={e.nombre} className="sm:col-span-2"><Entrada value={d.nombre} onChange={(ev) => set('nombre', ev.target.value)} aria-invalid={!!e.nombre} autoComplete="organization" /></Campo>
          <Campo etiqueta="Representante legal" error={e.representanteLegal}><Entrada value={d.representanteLegal} onChange={(ev) => set('representanteLegal', ev.target.value)} aria-invalid={!!e.representanteLegal} /></Campo>
          <Campo etiqueta="Segmento">
            <Selector value={d.segmento} onChange={(ev) => set('segmento', ev.target.value as DatosCliente['segmento'])}>
              <option>Microempresa</option><option>Pyme</option>
            </Selector>
          </Campo>
        </Grupo>
      )}
    </div>
  )
}

function CamposDireccion({ prefijo, dir, onCambio, e, opcional }: { prefijo: string; dir: Direccion; onCambio: (d: Direccion) => void; e: Errores; opcional?: boolean }) {
  return (
    <>
      <Campo etiqueta="Ciudad" error={e[`${prefijo}.ciudad`]} opcional={opcional} ayuda={dir.ciudad ? `Provincia de ${cat.provinciaDe(dir.ciudad)}` : undefined}>
        <Selector value={dir.ciudad} onChange={(ev) => onCambio({ ...dir, ciudad: ev.target.value })} aria-invalid={!!e[`${prefijo}.ciudad`]}>
          <option value="">Elegir…</option>
          {cat.ciudades.map((c) => <option key={c}>{c}</option>)}
        </Selector>
      </Campo>
      <Campo etiqueta="Dirección" error={e[`${prefijo}.calle`]} opcional={opcional}>
        <Entrada value={dir.calle} onChange={(ev) => onCambio({ ...dir, calle: ev.target.value })} placeholder="Calle principal, número y transversal" aria-invalid={!!e[`${prefijo}.calle`]} />
      </Campo>
      <Campo etiqueta="Referencia de ubicación" opcional className="sm:col-span-2">
        <Entrada value={dir.referencia} onChange={(ev) => onCambio({ ...dir, referencia: ev.target.value })} placeholder="Ej.: frente al parque, casa esquinera" />
      </Campo>
    </>
  )
}

function PasoContacto({ d, set, e }: PasoProps) {
  return (
    <div>
      <Grupo titulo="Teléfonos y correo" detalle="Se usan en las campañas de cobranza según los canales que autorice.">
        <Campo etiqueta="Celular" error={e.telefono}><Entrada value={d.telefono} onChange={(ev) => set('telefono', ev.target.value)} inputMode="tel" placeholder="09XX XXX XXX" aria-invalid={!!e.telefono} autoComplete="tel" /></Campo>
        <Campo etiqueta="Teléfono alterno" opcional error={e.telefonoAlterno}><Entrada value={d.telefonoAlterno} onChange={(ev) => set('telefonoAlterno', ev.target.value)} inputMode="tel" aria-invalid={!!e.telefonoAlterno} /></Campo>
        <Campo etiqueta="Correo electrónico" error={e.email} className="sm:col-span-2"><Entrada type="email" value={d.email} onChange={(ev) => set('email', ev.target.value)} aria-invalid={!!e.email} autoComplete="email" /></Campo>
      </Grupo>
      <Grupo titulo="Domicilio">
        <CamposDireccion prefijo="domicilio" dir={d.domicilio} onCambio={(v) => set('domicilio', v)} e={e} />
      </Grupo>
      <Grupo titulo={d.tipoPersona === 'Natural' ? 'Lugar de trabajo' : 'Local u oficina'} detalle="Útil para gestiones de cobranza en campo.">
        <CamposDireccion prefijo="trabajo" dir={d.trabajo} onCambio={(v) => set('trabajo', v)} e={e} opcional />
      </Grupo>
    </div>
  )
}

function PasoEconomia({ d, set, e }: PasoProps) {
  const natural = d.tipoPersona === 'Natural'
  const so = d.socio
  const fijarSocio = (cambio: Partial<Socioeconomico>) => set('socio', { ...so, ...cambio })
  const capacidad = capacidadPago(d)
  const cuotaMax = Math.min(capacidad, d.ingresos * 0.4)
  const uso = d.ingresos > 0 ? Math.min(1, d.egresos / d.ingresos) : 0
  const independiente = d.situacionLaboral === 'Independiente' || d.situacionLaboral === 'Empresa'
  const monto = <K extends 'ingresos' | 'egresos' | 'activos'>(grupo: K, campo: string, etiqueta: string, ayuda?: string) => (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      <DineroEntrada valor={(so[grupo] as Record<string, number>)[campo]} onCambio={(v) => fijarSocio({ [grupo]: { ...so[grupo], [campo]: v } } as Partial<Socioeconomico>)} />
    </Campo>
  )
  return (
    <div>
      <Grupo titulo={natural ? 'Trabajo' : 'Empresa'}>
        {natural && (
          <div className="sm:col-span-2">
            <Segmentado<SituacionLaboral>
              etiqueta="Situación laboral"
              valor={d.situacionLaboral}
              onCambio={(v) => set('situacionLaboral', v)}
              opciones={[{ id: 'Dependiente', label: 'Dependiente' }, { id: 'Independiente', label: 'Independiente' }, { id: 'Jubilado/a', label: 'Jubilado/a' }]}
            />
          </div>
        )}
        <Campo etiqueta={natural ? 'Actividad u ocupación' : 'Actividad de la empresa'} error={e.actividad}>
          <Entrada value={d.actividad} onChange={(ev) => set('actividad', ev.target.value)} list="actividades" aria-invalid={!!e.actividad} />
          <datalist id="actividades">{cat.actividades.map((a) => <option key={a} value={a} />)}</datalist>
        </Campo>
        {natural && d.situacionLaboral === 'Dependiente' && (
          <>
            <Campo etiqueta="Empresa donde trabaja" error={e.empleador}><Entrada value={d.empleador} onChange={(ev) => set('empleador', ev.target.value)} aria-invalid={!!e.empleador} /></Campo>
            <Campo etiqueta="Cargo" opcional><Entrada value={so.empleo.cargo} onChange={(ev) => fijarSocio({ empleo: { ...so.empleo, cargo: ev.target.value } })} /></Campo>
            <Campo etiqueta="Antigüedad laboral (años)"><Entrada type="number" min={0} step={0.5} value={so.empleo.antiguedadAnios || ''} onChange={(ev) => fijarSocio({ empleo: { ...so.empleo, antiguedadAnios: Math.max(0, Number(ev.target.value)) } })} className="text-right" /></Campo>
            <Campo etiqueta="Tipo de contrato" error={e.contrato}>
              <Selector value={so.empleo.contrato} onChange={(ev) => fijarSocio({ empleo: { ...so.empleo, contrato: ev.target.value as Socioeconomico['empleo']['contrato'] } })} aria-invalid={!!e.contrato}>
                <option value="">Elegir…</option><option>Indefinido</option><option>Plazo fijo</option><option>Servicios profesionales</option>
              </Selector>
            </Campo>
          </>
        )}
        {independiente && (
          <>
            <Campo etiqueta="Sector de la actividad" error={e.sector}>
              <Selector value={so.negocio.sector} onChange={(ev) => fijarSocio({ negocio: { ...so.negocio, sector: ev.target.value } })} aria-invalid={!!e.sector}>
                <option value="">Elegir…</option>{SECTORES.map((x) => <option key={x}>{x}</option>)}
              </Selector>
            </Campo>
            <Campo etiqueta="Antigüedad del negocio (años)"><Entrada type="number" min={0} value={so.negocio.antiguedadAnios || ''} onChange={(ev) => fijarSocio({ negocio: { ...so.negocio, antiguedadAnios: Math.max(0, Number(ev.target.value)) } })} className="text-right" /></Campo>
            {natural && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-medium text-ink-2">¿Tiene RUC?</span>
                <div className="flex h-9 items-center gap-3">
                  <Interruptor activo={so.negocio.tieneRuc} onCambio={() => fijarSocio({ negocio: { ...so.negocio, tieneRuc: !so.negocio.tieneRuc, ruc: so.negocio.ruc || (d.cedula.length === 10 ? `${d.cedula}001` : '') } })} etiqueta="Tiene RUC" />
                  <span className="text-[0.8rem] text-ink-2">{so.negocio.tieneRuc ? 'Sí, negocio formalizado' : 'No, negocio informal'}</span>
                </div>
              </div>
            )}
            {natural && so.negocio.tieneRuc && (
              <Campo etiqueta="Número de RUC" error={e.rucNegocio}><Entrada value={so.negocio.ruc} inputMode="numeric" maxLength={13} onChange={(ev) => fijarSocio({ negocio: { ...so.negocio, ruc: ev.target.value.replace(/[^0-9]/g, '') } })} aria-invalid={!!e.rucNegocio} /></Campo>
            )}
          </>
        )}
      </Grupo>

      <Grupo titulo="Ingresos mensuales" detalle={natural ? 'Promedio de los últimos tres meses.' : 'Promedio mensual según estados financieros.'}>
        {d.situacionLaboral === 'Dependiente' && monto('ingresos', 'sueldo', 'Sueldo líquido')}
        {independiente && monto('ingresos', 'negocio', 'Ingresos netos del negocio')}
        {monto('ingresos', 'otros', d.situacionLaboral === 'Jubilado/a' ? 'Pensión y otros ingresos' : 'Otros ingresos', 'Arriendos, pensión, remesas…')}
        <Total etiqueta="Total de ingresos" valor={d.ingresos} error={e.ingresos} />
      </Grupo>

      <Grupo titulo="Egresos mensuales">
        {natural && monto('egresos', 'vivienda', 'Vivienda', 'Arriendo o dividendo, servicios básicos')}
        {natural && monto('egresos', 'alimentacion', 'Alimentación')}
        {natural && monto('egresos', 'educacion', 'Educación y salud')}
        {monto('egresos', 'deudas', 'Cuotas de otras deudas')}
        {monto('egresos', 'otros', natural ? 'Otros gastos' : 'Gastos operativos')}
        <Total etiqueta="Total de egresos" valor={d.egresos} error={e.egresos} />
      </Grupo>

      <Grupo titulo="Patrimonio" detalle="Lo que tiene menos lo que debe a otras entidades.">
        {monto('activos', 'inmuebles', 'Inmuebles')}
        {monto('activos', 'vehiculos', 'Vehículos')}
        {monto('activos', 'ahorros', 'Ahorros e inversiones')}
        {monto('activos', 'otros', natural ? 'Otros bienes' : 'Inventario y maquinaria')}
        <Campo etiqueta="Deudas en otras entidades" ayuda="Saldo total pendiente."><DineroEntrada valor={so.pasivosExternos} onCambio={(v) => fijarSocio({ pasivosExternos: v })} /></Campo>
        <Total etiqueta="Patrimonio neto" valor={d.patrimonio} />
      </Grupo>

      {natural && (
        <Grupo titulo="Hogar">
          <Campo etiqueta="Vivienda" error={e.vivienda}>
            <Selector value={so.vivienda} onChange={(ev) => fijarSocio({ vivienda: ev.target.value as Socioeconomico['vivienda'] })} aria-invalid={!!e.vivienda}>
              <option value="">Elegir…</option><option>Propia</option><option>Arrendada</option><option>Familiar</option>
            </Selector>
          </Campo>
          <Campo etiqueta="Cargas familiares" ayuda="Personas que dependen de sus ingresos.">
            <Selector value={so.cargas} onChange={(ev) => fijarSocio({ cargas: Number(ev.target.value) })}>{[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</Selector>
          </Campo>
        </Grupo>
      )}

      <div className="mt-6 grid gap-4 rounded-[12px] border border-line bg-panel-2/50 p-4 sm:grid-cols-[1fr_1fr] sm:p-5">
        <div>
          <p className="text-[0.75rem] text-ink-3">Capacidad de pago mensual</p>
          <p className="display tabular mt-1 text-[1.9rem] leading-none">{dinero(capacidad)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className="h-full rounded-full bg-steel transition-[width] duration-300" style={{ width: `${uso * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[0.75rem] text-ink-3">Los egresos consumen {porcentaje(uso)} de los ingresos.</p>
        </div>
        <div className="sm:border-l sm:border-line sm:pl-5">
          <p className="text-[0.75rem] text-ink-3">Cuota máxima recomendada</p>
          <p className="display tabular mt-1 text-[1.9rem] leading-none text-rose-ink">{dinero(cuotaMax)}</p>
          <p className="mt-3 text-[0.75rem] text-ink-3">El menor valor entre la capacidad de pago y el 40 % de los ingresos. Se usa al crear obligaciones.</p>
        </div>
      </div>
    </div>
  )
}

function Total({ etiqueta, valor, error }: { etiqueta: string; valor: number; error?: string }) {
  return (
    <div className="flex flex-col justify-end gap-1">
      <div className="flex h-9 items-center justify-between rounded-[9px] bg-panel-2 px-3 text-[0.875rem]">
        <span className="text-ink-2">{etiqueta}</span>
        <span className="tabular font-semibold">{dinero(valor)}</span>
      </div>
      {error && <span role="alert" className="text-[0.75rem] font-medium text-bad">{error}</span>}
    </div>
  )
}

function DineroEntrada({ valor, onCambio, invalido }: { valor: number; onCambio: (v: number) => void; invalido?: boolean }) {
  return (
    <span className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[0.85rem] text-ink-3" aria-hidden="true">$</span>
      <Entrada type="number" min={0} step={10} inputMode="decimal" value={valor || ''} onChange={(ev) => onCambio(num(ev.target.value))} className="pl-6 text-right" aria-invalid={invalido} placeholder="0" />
    </span>
  )
}

function PasoReferencias({ d, set, e }: PasoProps) {
  const refs = d.referencias
  const cambiar = (i: number, campo: keyof DatosCliente['referencias'][number], v: string) =>
    set('referencias', refs.map((r, j) => (j === i ? { ...r, [campo]: v } : r)))
  const conyuge = d.tipoPersona === 'Natural' && requiereConyuge(d.estadoCivil)
  const c = d.conyuge ?? { nombre: '', cedula: '', telefono: '', ingresos: 0 }
  return (
    <div>
      <fieldset>
        <legend className="mb-4">
          <span className="block text-[0.875rem] font-semibold text-ink">Referencias</span>
          <span className="block text-[0.8rem] text-ink-3">Al menos una. Personas o negocios que conozcan al cliente.</span>
        </legend>
        {e.referencias && <p role="alert" className="mb-3 text-[0.8rem] font-medium text-bad">{e.referencias}</p>}
        <ul className="space-y-3">
          {refs.map((r, i) => (
            <li key={i} className="rounded-[12px] border border-line p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Segmentado<'Personal' | 'Comercial'> etiqueta={`Tipo de la referencia ${i + 1}`} valor={r.tipo} onCambio={(v) => cambiar(i, 'tipo', v)} opciones={[{ id: 'Personal', label: 'Personal' }, { id: 'Comercial', label: 'Comercial' }]} />
                <Boton variante="fantasma" onClick={() => set('referencias', refs.filter((_, j) => j !== i))} disabled={refs.length === 1} aria-label={`Quitar referencia ${i + 1}`} icono={<Trash2 size={15} />}>Quitar</Boton>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Campo etiqueta="Nombre" error={e[`ref.${i}.nombre`]}><Entrada value={r.nombre} onChange={(ev) => cambiar(i, 'nombre', ev.target.value)} aria-invalid={!!e[`ref.${i}.nombre`]} /></Campo>
                <Campo etiqueta="Relación">
                  <Selector value={r.relacion} onChange={(ev) => cambiar(i, 'relacion', ev.target.value)}>
                    <option value="">Elegir…</option>
                    {cat.relaciones.map((x) => <option key={x}>{x}</option>)}
                  </Selector>
                </Campo>
                <Campo etiqueta="Teléfono" error={e[`ref.${i}.telefono`]}><Entrada value={r.telefono} onChange={(ev) => cambiar(i, 'telefono', ev.target.value)} inputMode="tel" aria-invalid={!!e[`ref.${i}.telefono`]} /></Campo>
              </div>
            </li>
          ))}
        </ul>
        {refs.length < 4 && (
          <Boton className="mt-3" onClick={() => set('referencias', [...refs, { tipo: 'Personal', nombre: '', relacion: '', telefono: '' }])} icono={<Plus size={16} />}>Agregar referencia</Boton>
        )}
      </fieldset>

      {conyuge && (
        <div className="mt-7">
          <Grupo titulo="Cónyuge o conviviente" detalle={`Obligatorio porque el estado civil es ${d.estadoCivil.toLowerCase()}.`}>
            <Campo etiqueta="Nombre completo" error={e['conyuge.nombre']}><Entrada value={c.nombre} onChange={(ev) => set('conyuge', { ...c, nombre: ev.target.value })} aria-invalid={!!e['conyuge.nombre']} /></Campo>
            <Campo etiqueta="Cédula" error={e['conyuge.cedula']}><Entrada value={c.cedula} onChange={(ev) => set('conyuge', { ...c, cedula: ev.target.value.replace(/\s/g, '') })} inputMode="numeric" maxLength={10} aria-invalid={!!e['conyuge.cedula']} /></Campo>
            <Campo etiqueta="Celular" opcional><Entrada value={c.telefono} onChange={(ev) => set('conyuge', { ...c, telefono: ev.target.value })} inputMode="tel" /></Campo>
            <Campo etiqueta="Ingresos mensuales" opcional><DineroEntrada valor={c.ingresos} onCambio={(v) => set('conyuge', { ...c, ingresos: v })} /></Campo>
          </Grupo>
        </div>
      )}
    </div>
  )
}

function PasoCobranza({ d, set, e }: PasoProps) {
  return (
    <div>
      <fieldset>
        <legend className="mb-4">
          <span className="block text-[0.875rem] font-semibold text-ink">Canales autorizados</span>
          <span className="block text-[0.8rem] text-ink-3">El cliente decide por dónde se le puede contactar. Las campañas automáticas omiten los canales que no autorice.</span>
        </legend>
        {e.consentimiento && <p role="alert" className="mb-3 text-[0.8rem] font-medium text-bad">{e.consentimiento}</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {CANALES.map((canal) => {
            const Icono = ICONO_CANAL[canal]
            const activo = d.consentimiento[canal]
            const destino = canal === 'Correo' ? d.email : d.telefono
            return (
              <li key={canal} className={cx('flex items-center gap-3 rounded-[12px] border p-3.5 transition-colors', activo ? 'border-rose/40 bg-rose-soft/40' : 'border-line')}>
                <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-[9px]', activo ? 'bg-rose-soft text-rose-ink' : 'bg-panel-2 text-ink-3')}><Icono size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-medium">{canal}</span>
                  <span className="block truncate text-[0.75rem] text-ink-3">{destino || 'Sin dato de contacto'}</span>
                </span>
                <Interruptor activo={activo} onCambio={() => set('consentimiento', { ...d.consentimiento, [canal]: !activo })} etiqueta={`Autoriza ${canal}`} />
              </li>
            )
          })}
        </ul>
      </fieldset>
      <div className="mt-7">
        <Grupo titulo="Asignación">
          <Campo etiqueta="Gestor de cartera" ayuda="Recibe al cliente en su bandeja de cobranza.">
            <Selector value={d.gestor} onChange={(ev) => set('gestor', ev.target.value)}>
              {cat.gestores.map((g) => <option key={g}>{g}</option>)}
            </Selector>
          </Campo>
          <Campo etiqueta="Segmento">
            <Selector value={d.segmento} onChange={(ev) => set('segmento', ev.target.value as DatosCliente['segmento'])} disabled={d.tipoPersona === 'Natural'}>
              {(d.tipoPersona === 'Natural' ? ['Personas'] : ['Microempresa', 'Pyme']).map((s) => <option key={s}>{s}</option>)}
            </Selector>
          </Campo>
        </Grupo>
      </div>
    </div>
  )
}

function PasoRevision({ d, ir }: { d: DatosCliente; ir: (i: number) => void }) {
  const natural = d.tipoPersona === 'Natural'
  const bloque = (i: number, filas: [string, ReactNode][]) => (
    <section className="rounded-[12px] border border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h3 className="text-[0.85rem] font-semibold">{PASOS_CLIENTE[i].titulo}</h3>
        <button onClick={() => ir(i)} className="text-[0.8rem] font-medium text-rose-ink hover:underline">Editar</button>
      </div>
      <dl className="grid gap-x-4 gap-y-3 p-4 sm:grid-cols-2">
        {filas.filter(([, v]) => v !== '' && v !== null).map(([k, v]) => (
          <div key={k} className="min-w-0"><dt className="text-[0.75rem] text-ink-3">{k}</dt><dd className="tabular mt-0.5 text-[0.85rem] break-words">{v}</dd></div>
        ))}
      </dl>
    </section>
  )
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {bloque(0, [
        ['Tipo', `Persona ${d.tipoPersona.toLowerCase()}`],
        ['Identificación', `${d.tipoIdentificacion} ${d.cedula}`],
        [natural ? 'Nombre' : 'Razón social', natural ? `${d.nombres} ${d.apellidos}` : d.nombre],
        ...(natural ? [['Nacimiento', d.fechaNacimiento ? fmtFecha(d.fechaNacimiento) : ''], ['Estado civil', d.estadoCivil]] as [string, string][] : [['Representante legal', d.representanteLegal]] as [string, string][]),
      ])}
      {bloque(1, [
        ['Celular', d.telefono],
        ['Correo', d.email],
        ['Domicilio', [d.domicilio.calle, d.domicilio.ciudad].filter(Boolean).join(', ')],
        ['Trabajo', [d.trabajo.calle, d.trabajo.ciudad].filter(Boolean).join(', ')],
      ])}
      {bloque(2, [
        ['Actividad', d.actividad],
        ['Situación', d.situacionLaboral],
        ['Ingresos', dinero(d.ingresos)],
        ['Egresos', dinero(d.egresos)],
        ['Capacidad de pago', <span className="font-semibold">{dinero(capacidadPago(d))}</span>],
        ['Patrimonio', d.patrimonio ? dinero(d.patrimonio) : ''],
      ])}
      {bloque(3, [
        ...d.referencias.map((r, i) => [`Referencia ${i + 1}`, `${r.nombre} · ${r.relacion || r.tipo} · ${r.telefono}`] as [string, string]),
        ['Cónyuge', d.conyuge && requiereConyuge(d.estadoCivil) ? `${d.conyuge.nombre} · ${d.conyuge.cedula}` : ''],
      ])}
      {bloque(4, [
        ['Canales autorizados', CANALES.filter((c) => d.consentimiento[c]).join(', ')],
        ['Gestor', d.gestor],
        ['Segmento', d.segmento],
      ])}
    </div>
  )
}
