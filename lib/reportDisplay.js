import { formatPercentLabel } from './formatPercent'

export const REPORT_NA = 'N/A'

/** Numeric report cells: null / undefined / NaN → N/A (0 is kept). */
export function displayReportMetric(value) {
  if (value === null || value === undefined) return REPORT_NA
  if (typeof value === 'number' && Number.isNaN(value)) return REPORT_NA
  return value
}

/** Name, email, etc.: empty after trim → N/A */
export function displayReportLabel(value) {
  if (value == null) return REPORT_NA
  const s = String(value).trim()
  return s ? s : REPORT_NA
}

/** Conversion rate column using agent row shape from /stats/reports */
export function displayAgentConversionCell(agent) {
  if (!agent) return REPORT_NA
  const tl = agent.totalLeads
  const cl = agent.convertedLeads
  if (tl == null || cl == null) return REPORT_NA
  if (Number(tl) === 0) return `${formatPercentLabel(0)}%`
  const r = agent.conversionRate
  if (r == null || r === '' || Number.isNaN(Number(r))) return REPORT_NA
  return `${formatPercentLabel(r)}%`
}

/** ISO string or Date from API → localized date + time (e.g. reports Recent Activity). */
export function formatActivityDateTime(value) {
  if (value == null || value === '') return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}
