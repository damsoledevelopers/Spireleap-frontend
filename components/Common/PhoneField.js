'use client'

import {
  COMMON_COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  validateNationalNumber,
  sanitizeCountryCode,
  sanitizePhoneDigits
} from '../../lib/phone'
import SearchableSelect from './SearchableSelect'

export default function PhoneField({
  label = 'Phone Number',
  required = false,
  countryCodeName = 'countryCode',
  phoneName = 'phone',
  countryCodeValue = DEFAULT_COUNTRY_CODE,
  phoneValue = '',
  onCountryCodeChange,
  onPhoneChange,
  error,
  showInlineError = true
}) {
  const cc = sanitizeCountryCode(countryCodeValue)
  const phone = sanitizePhoneDigits(phoneValue)
  const { isValid } = validateNationalNumber(cc, phone)
  const showInvalid = showInlineError && phone && !isValid && !error

  return (
    <div className="form-group">
      {label ? (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      ) : null}

      <div className="grid grid-cols-[140px_1fr] gap-3">
        <SearchableSelect
          name={countryCodeName}
          value={cc}
          onChange={(e) => onCountryCodeChange?.(sanitizeCountryCode(e.target.value))}
          required={required}
          options={COMMON_COUNTRY_CODES}
          placeholder="Country"
          buttonClassName={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            error || showInvalid ? 'border-red-300' : 'border-gray-300'
          }`}
          searchPlaceholder="Search country..."
          menuClassName="min-w-[260px]"
        />

        <input
          type="tel"
          name={phoneName}
          value={phone}
          onChange={(e) => onPhoneChange?.(sanitizePhoneDigits(e.target.value))}
          inputMode="numeric"
          // Use a simple HTML5 pattern for broad browser compatibility.
          pattern="[0-9]*"
          maxLength={15}
          autoComplete="tel-national"
          required={required}
          aria-invalid={Boolean(error || showInvalid) || undefined}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            error || showInvalid ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter phone number"
        />
      </div>

      {showInvalid && <p className="mt-1 text-sm text-red-600">Invalid number</p>}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

