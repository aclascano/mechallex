import { CheckCircle2, ChevronRight, CircleAlert } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Campo, Encabezado, EsqueletoPagina, Insignia, Panel, Pestanas, Selector, Tabla, Td, Th } from '../components/ui'
import { round2 } from '../domain/amortizacion'
import { fmtFecha, fmtMes, monthKey, nombreMes } from '../domain/fechas'
import { HOY } from '../mocks/catalogos'
import { cx, dinero, entero } from '../lib/formato'
import { useServicio } from '../lib/useServicio'
import { obtenerContabilidad } from '../services/api'

type Tab = 'diario' | 'balance' | 'conciliacion'
type Datos = Awaited<ReturnType<typeof obtenerContabilidad>>

function Diario({ d }: { d: Datos }) {
  const [mes, setMes] = useState(monthKey(HOY))
  const [origen, setOrigen] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const meses = useMemo(() => [...new Set(d.asientos.map((a) => monthKey(a.fecha)))].slice(0, 14), [d])
  const nombreCuenta = (c: string) => d.saldos.find((s) => s.codigo === c)?.nombre ?? c
  const filas = d.asientos.filter((a) => (!mes || monthKey(a.fecha) === mes) && (!origen || a.origen === origen))
  const debe = round2(filas.reduce((s, a) => s + a.lineas.reduce((x, l) => x + l.debe, 0), 0))
  const haber = round2(filas.reduce((s, a) => s + a.lineas.reduce((x, l) => x + l.haber, 0), 0))

  return (
    <Panel cuerpo="">
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_1fr_2fr]">
        <Campo etiqueta="Mes">
          <Selector value={mes} onChange={(e) => setMes(e.target.value)}>
            {meses.map((m) => <option key={m} value={m}>{fmtMes(m + '-01', true)}</option>)}
          </Selector>
        </Campo>
        <Campo etiqueta="Origen">
          <Selector value={origen} onChange={(e) => setOrigen(e.target.value)}>
            <option value="">Todos</option>
            {['Desembolso', 'Pago', 'Costas judiciales', 'Ajuste'].map((o) => <option key={o}>{o}</option>)}
          </Selector>
        </Campo>
        <div className="tabular flex items-end gap-5 text-[0.8rem] text-ink-3 sm:justify-end">
          <span>{entero(filas.length)} asientos</span>
          <span>Debe <span className="font-medium text-ink">{dinero(debe)}</span></span>
          <span>Haber <span className="font-medium text-ink">{dinero(haber)}</span></span>
          {debe === haber && <span className="flex items-center gap-1 text-ok"><CheckCircle2 size={14} aria-hidden="true" /> Cuadra</span>}
        </div>
      </div>
      <Tabla etiqueta="Libro diario" className="max-h-[64vh]">
        <thead><tr><Th className="w-8"><span className="sr-only">Detalle</span></Th><Th>Asiento</Th><Th>Fecha</Th><Th>Glosa</Th><Th>Origen</Th><Th derecha>Debe</Th><Th derecha>Haber</Th></tr></thead>
        <tbody>
          {filas.slice(0, 250).map((a) => {
            const abiertoEste = abierto === a.id
            const total = round2(a.lineas.reduce((s, l) => s + l.debe, 0))
            return (
              <Fragment key={a.id}>
                <tr className="cursor-pointer hover:bg-panel-2/60" onClick={() => setAbierto(abiertoEste ? null : a.id)}>
                  <Td><button aria-expanded={abiertoEste} aria-label={`Ver líneas del asiento ${a.id}`} className="grid h-6 w-6 place-items-center rounded text-ink-3"><ChevronRight size={14} className={cx('transition-transform duration-150', abiertoEste && 'rotate-90')} /></button></Td>
                  <Td className="tabular font-medium">{a.id}</Td>
                  <Td className="whitespace-nowrap text-ink-2">{fmtFecha(a.fecha)}</Td>
                  <Td>{a.glosa}</Td>
                  <Td><Insignia tono={a.origen === 'Pago' ? 'ok' : a.origen === 'Desembolso' ? 'acero' : a.origen === 'Costas judiciales' ? 'rosa' : 'neutro'}>{a.origen}</Insignia></Td>
                  <Td derecha>{dinero(total)}</Td>
                  <Td derecha>{dinero(total)}</Td>
                </tr>
                {abiertoEste && a.lineas.map((l) => (
                  <tr key={a.id + l.cuenta} className="bg-panel-2/50 text-[0.8rem]">
                    <Td />
                    <Td className="tabular text-ink-3">{l.cuenta}</Td>
                    <Td />
                    <Td className={cx(l.haber > 0 && 'pl-10')}>{nombreCuenta(l.cuenta)}</Td>
                    <Td />
                    <Td derecha>{l.debe ? dinero(l.debe) : ''}</Td>
                    <Td derecha>{l.haber ? dinero(l.haber) : ''}</Td>
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </Tabla>
    </Panel>
  )
}

function Balance({ d }: { d: Datos }) {
  const debe = round2(d.saldos.reduce((s, c) => s + c.debe, 0))
  const haber = round2(d.saldos.reduce((s, c) => s + c.haber, 0))
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel titulo="Balance de comprobación" detalle={`Acumulado al ${fmtFecha(HOY)}`} cuerpo="">
        <Tabla etiqueta="Balance de comprobación">
          <thead><tr><Th>Cuenta</Th><Th>Tipo</Th><Th derecha>Debe</Th><Th derecha>Haber</Th><Th derecha>Saldo</Th></tr></thead>
          <tbody>
            {d.saldos.map((c) => (
              <tr key={c.codigo}>
                <Td><span className="tabular text-ink-3">{c.codigo}</span> <span className="ml-2 font-medium">{c.nombre}</span></Td>
                <Td className="text-ink-2">{c.tipo}</Td>
                <Td derecha>{dinero(c.debe)}</Td>
                <Td derecha>{dinero(c.haber)}</Td>
                <Td derecha className="font-medium">{dinero(c.saldo)}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="font-semibold"><Td>Sumas</Td><Td /><Td derecha>{dinero(debe)}</Td><Td derecha>{dinero(haber)}</Td><Td derecha>{debe === haber ? <span className="text-ok">Iguales</span> : <span className="text-bad">Descuadre</span>}</Td></tr></tfoot>
        </Tabla>
      </Panel>
      <Panel titulo="Cuadre con la cartera" detalle="La cuenta contable debe igualar la suma de saldos de las operaciones.">
        <dl className="tabular space-y-3 text-[0.875rem]">
          <div className="flex justify-between"><dt className="text-ink-2">1.4.01 Cartera de créditos</dt><dd className="font-medium">{dinero(d.cuadre.carteraContable)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">Saldos de operaciones</dt><dd className="font-medium">{dinero(d.cuadre.carteraOperativa)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3"><dt className="font-medium">Diferencia</dt><dd className={cx('font-semibold', d.cuadre.diferencia === 0 ? 'text-ok' : 'text-bad')}>{dinero(d.cuadre.diferencia)}</dd></div>
        </dl>
        <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-ok-soft px-3 py-2 text-[0.8rem] text-ok">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {d.cuadre.diferencia === 0 ? 'Contabilidad y cartera cuadran al centavo. Registra un pago y vuelve: ambas bajan igual.' : 'Hay diferencias por revisar.'}
        </p>
      </Panel>
    </div>
  )
}

function Conciliacion({ d }: { d: Datos }) {
  const conciliados = d.pagosMes.filter((p) => p.conciliado)
  const pendientes = d.pagosMes.filter((p) => !p.conciliado)
  const soloBanco = d.banco.filter((m) => !m.pagoId && !m.descripcion.startsWith('TRANSF. DESEMBOLSO') && !m.descripcion.startsWith('PAGO '))
  const saldoBanco = round2(d.banco.reduce((s, m) => s + m.monto, 0))
  return (
    <div className="space-y-4">
      <dl className="tabular grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-panel md:grid-cols-4">
        {[
          ['Movimientos del banco', `${d.banco.length}`, `neto ${dinero(saldoBanco)}`],
          ['Pagos conciliados', `${conciliados.length}`, dinero(conciliados.reduce((s, p) => s + p.monto, 0))],
          ['Pagos en tránsito', `${pendientes.length}`, dinero(pendientes.reduce((s, p) => s + p.monto, 0))],
          ['Solo en el banco', `${soloBanco.length}`, dinero(soloBanco.reduce((s, m) => s + m.monto, 0))],
        ].map(([k, v, sub], i) => (
          <div key={k} className={cx('px-5 py-4', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line md:border-t-0', i === 2 && 'md:border-l')}>
            <dt className="text-[0.78rem] text-ink-3">{k}</dt>
            <dd className="display mt-1 text-[1.6rem] leading-none font-medium">{v}</dd>
            <dd className="mt-1 text-[0.75rem] text-ink-3">{sub}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel titulo="Partidas por conciliar" detalle="Requieren revisión antes del cierre" cuerpo="">
          <ul className="divide-y divide-line">
            {pendientes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                <span className="flex items-start gap-2"><CircleAlert size={15} className="mt-0.5 text-warn" aria-hidden="true" /><span><span className="block font-medium">{p.cliente.nombre}</span><span className="text-[0.75rem] text-ink-3">{p.id} · {p.medio} · {fmtFecha(p.fecha)} · no aparece aún en el banco</span></span></span>
                <span className="tabular font-medium">{dinero(p.monto)}</span>
              </li>
            ))}
            {soloBanco.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.85rem]">
                <span className="flex items-start gap-2"><CircleAlert size={15} className="mt-0.5 text-bad" aria-hidden="true" /><span><span className="block font-medium">{m.descripcion}</span><span className="text-[0.75rem] text-ink-3">{fmtFecha(m.fecha)} · sin registro en Mechallex</span></span></span>
                <span className={cx('tabular font-medium', m.monto < 0 && 'text-bad')}>{dinero(m.monto)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel titulo={`Estado de cuenta · ${nombreMes(HOY)}`} detalle="Cuenta recaudadora (ficticia)" cuerpo="">
          <Tabla etiqueta="Movimientos bancarios" className="max-h-[420px]">
            <thead><tr><Th>Fecha</Th><Th>Descripción</Th><Th>Estado</Th><Th derecha>Monto</Th></tr></thead>
            <tbody>
              {[...d.banco].reverse().map((m) => {
                const enlazado = !!m.pagoId || m.descripcion.startsWith('TRANSF. DESEMBOLSO') || m.descripcion.startsWith('PAGO ')
                return (
                  <tr key={m.id}>
                    <Td className="whitespace-nowrap text-ink-2">{fmtFecha(m.fecha)}</Td>
                    <Td className="tabular text-[0.8rem]">{m.descripcion}</Td>
                    <Td>{enlazado ? <Insignia tono="ok">Conciliado</Insignia> : <Insignia tono="bad">Sin pareja</Insignia>}</Td>
                    <Td derecha className={cx('font-medium', m.monto < 0 && 'text-bad')}>{dinero(m.monto)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        </Panel>
      </div>
    </div>
  )
}

export default function PaginaContabilidad() {
  const { data } = useServicio(obtenerContabilidad)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'diario'
  if (!data) return <EsqueletoPagina />
  return (
    <div>
      <Encabezado titulo="Contabilidad" descripcion="Cada desembolso, pago y costa judicial genera su asiento automáticamente. Partida doble: el debe siempre iguala al haber." />
      <Pestanas<Tab> valor={tab} onCambio={(t) => setParams({ tab: t })} opciones={[{ id: 'diario', label: 'Libro diario' }, { id: 'balance', label: 'Balance y cuadre' }, { id: 'conciliacion', label: 'Conciliación bancaria' }]} />
      {tab === 'diario' && <Diario d={data} />}
      {tab === 'balance' && <Balance d={data} />}
      {tab === 'conciliacion' && <Conciliacion d={data} />}
    </div>
  )
}
