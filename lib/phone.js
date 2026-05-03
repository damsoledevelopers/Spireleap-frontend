import { parsePhoneNumberFromString } from 'libphonenumber-js'

export const DEFAULT_COUNTRY_CODE = '+1'

// NOTE:
// We validate by parsing a full international number (+<callingCode><nationalDigits>).
// When the calling code is present, libphonenumber-js can validate without a region.

export function sanitizeDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

export function sanitizePhoneDigits(value) {
  // We keep only digits; length will be validated per-country.
  return sanitizeDigits(value).slice(0, 15)
}

export function sanitizeCountryCode(value) {
  const digits = sanitizeDigits(value).slice(0, 4)
  return digits ? `+${digits}` : DEFAULT_COUNTRY_CODE
}

export function validateNationalNumber(countryCode, nationalDigits) {
  const cc = sanitizeCountryCode(countryCode)
  const national = sanitizePhoneDigits(nationalDigits)

  const full = `${cc}${national}`
  const parsed = parsePhoneNumberFromString(full)
  if (!parsed) return { isValid: false, e164: '' }

  // Extra strictness for India: national number should be 10 digits.
  // (libphonenumber-js already validates, but this matches expected business rule.)
  if (cc === '+91' && national.length !== 10) return { isValid: false, e164: '' }

  const isValid = parsed.isValid()
  return { isValid, e164: isValid ? parsed.number : '' }
}

export function splitE164Phone(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return { countryCode: DEFAULT_COUNTRY_CODE, phone: '' }

  const parsed = parsePhoneNumberFromString(raw)
  if (parsed) {
    const cc = `+${parsed.countryCallingCode}`
    return { countryCode: cc, phone: String(parsed.nationalNumber || '') }
  }

  // Fallback: treat as digits-only national number
  return { countryCode: DEFAULT_COUNTRY_CODE, phone: sanitizePhoneDigits(raw) }
}

export function buildE164Phone(countryCode, nationalDigits) {
  const { isValid, e164 } = validateNationalNumber(countryCode, nationalDigits)
  return isValid ? e164 : ''
}

export const COMMON_COUNTRY_CODES = [
  { label: 'US (+1)', value: '+1' },
  { label: 'IN (+91)', value: '+91' },
  { label: 'UK (+44)', value: '+44' },
  { label: 'NG (+234)', value: '+234' },
  { label: 'AE (+971)', value: '+971' },
  { label: 'SA (+966)', value: '+966' },
  { label: 'AU (+61)', value: '+61' },
  { label: 'DE (+49)', value: '+49' },
  { label: 'FR (+33)', value: '+33' }
]

