export function formatMoney(amount, currencyCode = 'USD', { minimumFractionDigits = 0 } = {}) {
  if (amount === null || amount === undefined || amount === '') return 'Price on request'
  const n = Number(amount)
  if (Number.isNaN(n)) return 'Price on request'

  const code = String(currencyCode || 'USD').trim().toUpperCase()
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits
    }).format(n)
  } catch (e) {
    // Fallback if Intl doesn't like the code
    return `${code} ${n.toLocaleString('en-US')}`
  }
}

// Convert an AED amount into the target currency using aedRate
// where aedRate means: 1 <currency> = <aedRate> AED.
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
  const converted = convertFromAed(amountAed, targetCurrencyCode, ratesByCode)
  if (converted === null) return 'Price on request'
  return formatMoney(converted, targetCurrencyCode, opts)
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

