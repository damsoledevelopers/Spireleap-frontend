/** Property status options (inactive & draft excluded from UI). */
export const PROPERTY_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
  { value: 'booked', label: 'Booked' }
]

export const PROPERTY_STATUS_FORM_OPTIONS_SUPER = [
  { value: 'active', label: 'Available (Active)' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
  { value: 'booked', label: 'Booked' }
]

export const PROPERTY_STATUS_FORM_OPTIONS_AGENCY = [
  { value: 'active', label: 'Available (Active)' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
  { value: 'booked', label: 'Booked' }
]

export const BEDROOM_SELECT_OPTIONS = [
  { value: '', label: 'Select bedrooms' },
  { value: 'studio', label: 'Studio' },
  ...Array.from({ length: 9 }, (_, i) => {
    const n = i + 1
    return { value: String(n), label: String(n) }
  }),
  { value: '10plus', label: '10+' }
]

export const BEDROOM_FILTER_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'studio', label: 'Studio' },
  ...Array.from({ length: 9 }, (_, i) => {
    const n = i + 1
    return { value: String(n), label: String(n) }
  }),
  { value: '10plus', label: '10+' }
]

export const BALCONY_FILTER_OPTIONS = [
  { value: '', label: 'Any' },
  ...Array.from({ length: 4 }, (_, i) => {
    const n = i + 1
    return { value: String(n), label: String(n) }
  }),
  { value: '5plus', label: '5+' }
]

/** Form state value from stored specifications. */
export function specsToBedroomSelect(specs) {
  if (!specs) return ''
  if (specs.isStudio) return 'studio'
  const b = Number(specs.bedrooms)
  if (Number.isFinite(b) && b >= 10) return '10plus'
  if (Number.isFinite(b) && b >= 1 && b <= 9) return String(b)
  return ''
}

/** API payload fields from bedroom dropdown value. */
export function bedroomSelectToSpecs(value) {
  const v = String(value || '').trim()
  if (!v) return { isStudio: false, bedrooms: undefined }
  if (v === 'studio') return { isStudio: true, bedrooms: 0 }
  if (v === '10plus') return { isStudio: false, bedrooms: 10 }
  const n = parseInt(v, 10)
  if (Number.isFinite(n) && n >= 1) return { isStudio: false, bedrooms: n }
  return { isStudio: false, bedrooms: undefined }
}

/** Query params for property list filters. */
export function bedroomFilterToQueryParams(bedroomValue) {
  const v = String(bedroomValue || '').trim()
  if (!v) return {}
  if (v === 'studio') return { studio: '1' }
  if (v === '10plus') return { bedroomsMin: '10' }
  return { bedrooms: v }
}

/** Client-side filter: minimum balconies (1–4) or 5+. */
export function matchesBalconyFilter(filterValue, specs) {
  const v = String(filterValue || '').trim()
  if (!v) return true
  const count = Number(specs?.balconies || 0)
  if (v === '5plus') return count >= 5
  const n = parseInt(v, 10)
  return Number.isFinite(n) && count >= n
}

/** Client-side filter: studio, bedroom count, or 10+. */
export function matchesBedroomFilter(filterValue, specs) {
  const v = String(filterValue || '').trim()
  if (!v) return true
  if (v === 'studio') return !!specs?.isStudio
  if (v === '10plus') return !specs?.isStudio && Number(specs?.bedrooms) >= 10
  const n = parseInt(v, 10)
  if (Number.isFinite(n)) return !specs?.isStudio && Number(specs?.bedrooms) >= n
  return true
}

export function formatBedroomLabel(specs) {
  if (!specs) return null
  if (specs.isStudio) return 'Studio'
  const b = Number(specs.bedrooms)
  if (Number.isFinite(b) && b >= 10) return '10+ BHK'
  if (Number.isFinite(b) && b >= 1) return `${b} BHK`
  return null
}
