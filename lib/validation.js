export function isBlank(value) {
  return String(value ?? '').trim() === ''
}

export function validateRequired(value, label = 'This field') {
  return isBlank(value) ? `${label} is required` : null
}

export function validateEmail(value, label = 'Email') {
  const v = String(value ?? '').trim()
  if (!v) return `${label} is required`
  // Simple, pragmatic check (browser input type="email" also helps)
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  return ok ? null : `Enter a valid ${label.toLowerCase()}`
}

export function validatePassword(password) {
  const v = String(password ?? '')
  const missing = []
  if (v.length < 6) missing.push('at least 6 characters')
  if (!/[a-z]/.test(v)) missing.push('1 lowercase letter')
  if (!/[A-Z]/.test(v)) missing.push('1 uppercase letter')
  if (!/[0-9]/.test(v)) missing.push('1 digit')
  if (!/[@$!%*?&]/.test(v)) missing.push('1 special character (@$!%*?&)')

  if (missing.length === 0) return null
  return `Password must contain ${missing.join(', ')}`
}

export function validateConfirmPassword(password, confirmPassword) {
  const p = String(password ?? '')
  const c = String(confirmPassword ?? '')
  if (!c) return 'Confirm password is required'
  return p === c ? null : 'Passwords do not match'
}

export function validateName(value, label = 'Name') {
  const v = String(value ?? '').trim()
  if (!v) return `${label} is required`
  return /^[a-zA-Z\s.'-]+$/.test(v) ? null : `${label} must contain only alphabets`
}

export function validateUrlOptional(value, label = 'Website') {
  const v = String(value ?? '').trim()
  if (!v) return null
  try {
    // Ensure protocol exists for URL constructor
    const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`
    // eslint-disable-next-line no-new
    new URL(withProtocol)
    return null
  } catch {
    return `Enter a valid ${label.toLowerCase()}`
  }
}

