import { useEffect, useState } from 'react'
import { suscribir } from '../mocks/db'

/** Carga datos de un servicio y vuelve a cargarlos cuando la base de la demo cambia. */
export function useServicio<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => suscribir(() => setTick((t) => t + 1)), [])

  useEffect(() => {
    let vivo = true
    setCargando(true)
    fn().then((d) => {
      if (!vivo) return
      setData(d)
      setCargando(false)
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, cargando }
}
