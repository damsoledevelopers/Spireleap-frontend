import { findCurrencyByCode } from './currencyIso4217'

/** Build { value, label } options for currency dropdowns from DB rows + extra codes. */
export function buildCurrencySelectOptions(currencyList = [], codeList = []) {
  const byCode = new Map()
  ;(currencyList || []).forEach((c) => {
    const code = String(c.currencyCode || '').trim().toUpperCase()
    if (!code) return
    const name = String(c.currencyName || '').trim()
    byCode.set(code, name ? `${code} — ${name}` : code)
  })

  const codes = new Set([
    'AED',
    ...(currencyList || []).map((c) => String(c.currencyCode || '').trim().toUpperCase()).filter(Boolean),
    ...(codeList || []).map((c) => String(c).trim().toUpperCase()).filter(Boolean)
  ])

  return [...codes]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => {
      let label = byCode.get(code)
      if (!label || label === code) {
        const iso = findCurrencyByCode(code)
        label = iso ? `${code} — ${iso.name}` : code
      }
      return { value: code, label }
    })
}

export function ensureCurrencyInOptions(options, value) {
  const code = String(value || '').trim().toUpperCase()
  if (!code) return options
  if ((options || []).some((o) => String(o.value).toUpperCase() === code)) return options
  const iso = findCurrencyByCode(code)
  return [...(options || []), { value: code, label: iso ? `${code} — ${iso.name}` : code }]
}
