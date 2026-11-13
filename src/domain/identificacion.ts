// Validación de identificaciones ecuatorianas (algoritmo público del dígito verificador).

const soloDigitos = (s: string) => /^\d+$/.test(s)

/** Cédula: 10 dígitos, provincia 01–24 o 30, tercer dígito < 6, módulo 10. */
export function validarCedula(c: string): string | null {
  if (!soloDigitos(c) || c.length !== 10) return 'La cédula tiene 10 dígitos.'
  const prov = Number(c.slice(0, 2))
  if (!((prov >= 1 && prov <= 24) || prov === 30)) return 'Los dos primeros dígitos no corresponden a una provincia.'
  if (Number(c[2]) >= 6) return 'El tercer dígito de una cédula va de 0 a 5.'
  const suma = [...c.slice(0, 9)].reduce((s, d, i) => {
    let v = Number(d) * (i % 2 === 0 ? 2 : 1)
    if (v > 9) v -= 9
    return s + v
  }, 0)
  const verificador = (10 - (suma % 10)) % 10
  return verificador === Number(c[9]) ? null : 'El dígito verificador no coincide. Revisa el número.'
}

/** RUC: 13 dígitos y termina en 001. Para persona natural, los 10 primeros son su cédula. */
export function validarRuc(r: string, natural: boolean): string | null {
  if (!soloDigitos(r) || r.length !== 13) return 'El RUC tiene 13 dígitos.'
  if (!r.endsWith('001')) return 'El RUC termina en 001.'
  if (natural) {
    const e = validarCedula(r.slice(0, 10))
    return e ? 'Los 10 primeros dígitos deben ser una cédula válida.' : null
  }
  const prov = Number(r.slice(0, 2))
  if (!((prov >= 1 && prov <= 24) || prov === 30)) return 'Los dos primeros dígitos no corresponden a una provincia.'
  return null
}

export function validarIdentificacion(tipo: 'Cédula' | 'RUC' | 'Pasaporte', numero: string, natural: boolean): string | null {
  const n = numero.trim()
  if (!n) return 'Ingresa la identificación.'
  if (tipo === 'Cédula') return validarCedula(n)
  if (tipo === 'RUC') return validarRuc(n, natural)
  return /^[A-Z0-9]{6,12}$/i.test(n) ? null : 'El pasaporte tiene entre 6 y 12 letras o números.'
}
