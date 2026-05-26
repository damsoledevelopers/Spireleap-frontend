export const DEFAULT_BUDGET_CURRENCY = 'AED'

/**
 * Build SearchableSelect options for lead budget currency from API + context.
 * Preserves `currentValue` when editing a lead whose currency was deactivated.
 */
export function resolveBudgetCurrencyOptions(dropdownsRes = {}, contextCurrencies = [], currentValue = '') {
  let options = []
  const apiOpts = dropdownsRes?.budgetCurrencyOptions
  if (Array.isArray(apiOpts) && apiOpts.length > 0) {
    options = apiOpts
      .map((o) => ({
        value: String(o.value || '').trim().toUpperCase(),
        label: String(o.label || o.value || '').trim()
      }))
      .filter((o) => o.value)
  } else {
    const codes =
      dropdownsRes?.budgetCurrencies?.length > 0
        ? dropdownsRes.budgetCurrencies
        : dropdownsRes?.currencies?.length > 0
          ? dropdownsRes.currencies
          : contextCurrencies
    options = (codes || [])
      .map((c) => {
        const code = String(c || '').trim().toUpperCase()
        return { value: code, label: code }
      })
      .filter((o) => o.value)
  }

  const cur = String(currentValue || '').trim().toUpperCase()
  if (cur && !options.some((o) => o.value === cur)) {
    options = [{ value: cur, label: cur }, ...options]
  }

  return options
}

export function defaultBudgetCurrency(options, preferred = DEFAULT_BUDGET_CURRENCY) {
  const values = (options || []).map((o) => o.value)
  const pref = String(preferred || '').trim().toUpperCase()
  if (pref && values.includes(pref)) return pref
  if (values.includes(DEFAULT_BUDGET_CURRENCY)) return DEFAULT_BUDGET_CURRENCY
  return values[0] || DEFAULT_BUDGET_CURRENCY
}
