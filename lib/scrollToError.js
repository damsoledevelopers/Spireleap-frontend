function safeCssEscape(value) {
  // CSS.escape is not supported in some older environments
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return String(value).replace(/["\\]/g, '\\\\$&')
}

export function scrollToFirstErrorField(fieldNames = []) {
  if (typeof document === 'undefined') return

  for (const raw of fieldNames) {
    const name = String(raw || '').trim()
    if (!name) continue
    const escaped = safeCssEscape(name)

    const el =
      document.querySelector(`[name="${escaped}"]`) ||
      document.getElementById(name) ||
      document.querySelector(`#${escaped}`)

    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (typeof el.focus === 'function') {
        try {
          el.focus({ preventScroll: true })
        } catch {
          el.focus()
        }
      }
      return true
    }
  }

  return false
}

