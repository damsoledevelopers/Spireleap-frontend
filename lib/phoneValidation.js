import { validateNationalNumber, sanitizePhoneDigits } from './phone'

export function sanitizeNationalPhoneInput(value) {
  return sanitizePhoneDigits(value)
}

export function validatePhoneField(countryCode, nationalDigits, { required = false } = {}) {
  const phone = sanitizePhoneDigits(nationalDigits)
  if (!phone) {
    return required
      ? { ok: false, message: 'Phone number is required' }
      : { ok: true, message: '' }
  }
  const { isValid } = validateNationalNumber(countryCode, phone)
  if (!isValid) {
    return {
      ok: false,
      message: 'Enter a valid phone number for the selected country code'
    }
  }
  return { ok: true, message: '' }
}
