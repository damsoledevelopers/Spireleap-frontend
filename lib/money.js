export function formatMoney(amount, currencyCode = 'USD', { minimumFractionDigits = 0 } = {}) {
  console.log("formatMoney", amount, currencyCode, minimumFractionDigits);
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

