/**
 * Human-friendly percent label: 0 → "0" (not "0.00"); trims meaningless decimals.
 */
export function formatPercentLabel(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return '0'
  const r = Math.round(n * 10) / 10
  return r % 1 === 0 ? String(Math.trunc(r)) : String(r)
}
