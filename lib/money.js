function formatInrAmount(n, { minimumFractionDigits = 0, maximumFractionDigits = 2 } = {}) {
  const opts = { minimumFractionDigits, maximumFractionDigits }
  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      ...opts
    }).format(n)
    // Some fonts/systems omit ₹ — fall back to explicit "INR" prefix
    if (formatted.includes('₹')) return formatted
    if (/^Rs\.?\s*/i.test(formatted)) {
      return `INR ${n.toLocaleString('en-IN', opts)}`
    }
    if (/^INR\s/i.test(formatted)) return formatted
    return `INR ${n.toLocaleString('en-IN', opts)}`
  } catch (_) {
    return `INR ${n.toLocaleString('en-IN', opts)}`
  }
}

export function formatMoney(amount, currencyCode = 'AED', opts = {}) {
  if (amount === null || amount === undefined || amount === '') return 'Price on request'
  const n = Number(amount)
  if (Number.isNaN(n)) return 'Price on request'

  const code = String(currencyCode || 'AED').trim().toUpperCase()
  const minimumFractionDigits = opts.minimumFractionDigits ?? 0
  const maximumFractionDigits = opts.maximumFractionDigits ?? 2

  if (code === 'INR') {
    return formatInrAmount(n, { minimumFractionDigits, maximumFractionDigits })
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(n)
  } catch (e) {
    return `${code} ${n.toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits })}`
  }
}

// Convert an AED amount into the target currency using aedRate
// where aedRate means: 1 <currency> = <aedRate> AED.
/** Convert amount in selected currency to AED for API filters (1 unit = aedRate AED). */
export function convertToAed(amount, currencyCode, ratesByCode = {}) {
  if (amount === null || amount === undefined || amount === '') return null
  const n = Number(amount)
  if (!Number.isFinite(n)) return null

  const code = String(currencyCode || 'AED').trim().toUpperCase()
  if (code === 'AED') return n

  const rate = Number(ratesByCode?.[code])
  if (!Number.isFinite(rate) || rate <= 0) return n

  return n * rate
}

export function getCurrencyDisplaySymbol(currencyCode = 'AED') {
  const code = String(currencyCode || 'AED').trim().toUpperCase()
  if (code === 'AED') return 'AED'
  try {
    const part = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol'
    })
      .formatToParts(1)
      .find((p) => p.type === 'currency')
    const sym = part?.value?.trim()
    return sym && sym !== code ? sym : code
  } catch {
    return code
  }
}

export function convertFromAed(amountAed, targetCurrencyCode, ratesByCode = {}) {
  if (amountAed === null || amountAed === undefined || amountAed === '') return null
  const aed = Number(amountAed)
  if (!Number.isFinite(aed)) return null

  const code = String(targetCurrencyCode || 'AED').trim().toUpperCase()
  if (code === 'AED') return aed

  const rate = Number(ratesByCode?.[code])
  if (!Number.isFinite(rate) || rate <= 0) return aed // fallback: show AED value with different symbol handled by caller

  return aed / rate
}

export function formatMoneyFromAed(amountAed, targetCurrencyCode = 'AED', ratesByCode = {}, opts = {}) {
  const code = String(targetCurrencyCode || 'AED').trim().toUpperCase()
  const converted = convertFromAed(amountAed, code, ratesByCode)
  if (converted === null) return 'Price on request'

  const rate = Number(ratesByCode?.[code])
  const canConvert = code === 'AED' || (Number.isFinite(rate) && rate > 0)
  const displayCode = canConvert ? code : 'AED'
  const displayAmount = canConvert ? converted : Number(amountAed)

  return formatMoney(displayAmount, displayCode, opts)
}

/** Format amount stored in AED (default for property listings). */
export function formatAed(amount, opts = {}) {
  if (amount === null || amount === undefined || amount === '') return 'Price on request'
  const n = Number(amount)
  if (!Number.isFinite(n)) return 'Price on request'
  return formatMoney(n, 'AED', opts)
}

export function formatPropertyPrice(price, opts = {}) {
  if (!price) return 'Price on request'
  if (typeof price === 'number') return formatAed(price, opts)
  if (price.sale !== undefined && price.sale !== null && price.sale !== '') {
    return formatAed(price.sale, opts)
  }
  if (price.rent?.amount !== undefined && price.rent?.amount !== null && price.rent?.amount !== '') {
    const amt = formatAed(price.rent.amount, opts)
    return `${amt}/${price.rent.period || 'month'}`
  }
  return 'Price on request'
}

