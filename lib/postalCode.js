/** Max digits for ZIP / postal / PIN style fields */
export const POSTAL_DIGITS_MAX_LEN = 9

/** Strip non-digits and cap length for controlled inputs */
export function sanitizePostalDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, POSTAL_DIGITS_MAX_LEN)
}

/**
 * Optional field: empty is valid.
 * If present: digits only, length 1–9 (no minimum length; up to 9 digits / PIN-style codes).
 */
export function isValidOptionalPostalDigits(value) {
  const s = String(value ?? '').replace(/\D/g, '')
  if (!s) return true
  return s.length >= 1 && s.length <= POSTAL_DIGITS_MAX_LEN
}

/** Shown when input exceeds max length or validation fails (e.g. pasted value over 9 digits). */
export const OPTIONAL_POSTAL_DIGITS_MESSAGE =
  'You can enter up to 9 digits for your ZIP or postal code.'
