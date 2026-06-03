import {
  bedroomFilterToQueryParams,
  filterPropertiesByHandover,
  getHandoverQuarterOptions,
  propertyMatchesHandoverFilter
} from './propertyOptions'
import { convertToAed } from './money'

export {
  getHandoverQuarterOptions,
  filterPropertiesByHandover,
  propertyMatchesHandoverFilter
}

/** Slugs seeded in backend `DEFAULT_PROPERTY_TYPES` — used only to group fetched types. */
export const COMMERCIAL_PROPERTY_TYPE_SLUGS = ['commercial', 'office', 'retail', 'warehouse']

export const RENT_PERIOD_FILTER_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' }
]

export const PROPERTY_SEGMENT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' }
]

export const EMPTY_HOME_SEARCH_FILTERS = {
  listingType: 'sale',
  propertySegment: 'all',
  propertyType: '',
  completionStatus: '',
  rentPeriod: '',
  /** Buy + Off-plan filter; matches Property.handoverQuarter when set on listing. */
  handoverQuarter: '',
  search: '',
  city: '',
  minPrice: '',
  maxPrice: '',
  minArea: '',
  maxArea: '',
  bedrooms: '',
  bathrooms: ''
}

export function splitPropertyTypeOptions(options = [], segment) {
  const norm = (v) => String(v || '').trim().toLowerCase()
  if (!segment || segment === 'all') return options
  if (segment === 'commercial') {
    return options.filter((o) => COMMERCIAL_PROPERTY_TYPE_SLUGS.includes(norm(o.value)))
  }
  if (segment === 'residential') {
    return options.filter((o) => !COMMERCIAL_PROPERTY_TYPE_SLUGS.includes(norm(o.value)))
  }
  return options
}

export function propertyMatchesSegment(property, segment) {
  if (!segment || segment === 'all') return true
  const slug = String(property?.propertyType || '').trim().toLowerCase()
  const isCommercial = COMMERCIAL_PROPERTY_TYPE_SLUGS.includes(slug)
  if (segment === 'commercial') return isCommercial
  if (segment === 'residential') return !isCommercial
  return true
}

export function filterPropertiesBySegment(properties = [], segment) {
  if (!segment || segment === 'all') return properties
  return properties.filter((p) => propertyMatchesSegment(p, segment))
}

export const HOME_BATHROOM_FILTER_OPTIONS = [
  { value: '', label: 'Bathrooms' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '5plus', label: '5+' }
]

/** Location labels from GET /properties/filter-options → locations */
export function buildLocationSuggestions(locations = {}, query = '') {
  const q = String(query || '').trim().toLowerCase()
  const items = []
  const seen = new Set()

  const add = (label) => {
    const text = String(label || '').trim()
    if (!text) return
    const key = text.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    items.push({ label: text, value: text })
  }

  ;(locations.cities || []).forEach(add)
  ;(locations.states || []).forEach(add)
  ;(locations.areas || []).forEach(add)

  const sorted = items.sort((a, b) => a.label.localeCompare(b.label))
  if (!q) return sorted.slice(0, 10)
  return sorted.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 10)
}

export const HOME_PROPERTIES_DEFAULT_LIMIT = 6
export const HOME_PROPERTIES_FILTERED_LIMIT = 2000

/** Build query string for GET /api/properties from applied home filters. */
export function buildPropertiesSearchParams(filters = {}, options = {}) {
  const limit = options.limit ?? 12
  const selectedCurrency = options.selectedCurrency || 'AED'
  const ratesByCode = options.ratesByCode || {}
  const params = new URLSearchParams({
    status: 'active',
    page: '1',
    limit: String(limit)
  })

  if (filters.listingType) params.set('listingType', filters.listingType)
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.propertyType) params.set('propertyType', filters.propertyType)
  if (filters.completionStatus) params.set('completionStatus', filters.completionStatus)
  if (filters.handoverQuarter?.trim()) params.set('handoverQuarter', filters.handoverQuarter.trim())
  if (filters.rentPeriod) params.set('rentPeriod', filters.rentPeriod)
  if (filters.city?.trim()) params.set('city', filters.city.trim())
  if (filters.minPrice) {
    const aedMin = convertToAed(filters.minPrice, selectedCurrency, ratesByCode)
    if (aedMin != null) params.set('minPrice', String(Math.round(aedMin)))
  }
  if (filters.maxPrice) {
    const aedMax = convertToAed(filters.maxPrice, selectedCurrency, ratesByCode)
    if (aedMax != null) params.set('maxPrice', String(Math.round(aedMax)))
  }
  if (filters.minArea) params.set('minArea', String(filters.minArea))
  if (filters.maxArea) params.set('maxArea', String(filters.maxArea))
  if (filters.bathrooms === '5plus') {
    params.set('bathroomsMin', '5')
  } else if (filters.bathrooms) {
    params.set('bathrooms', String(filters.bathrooms))
  }

  const bedroomParams = bedroomFilterToQueryParams(filters.bedrooms)
  Object.entries(bedroomParams).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  return params
}

/** Link to full listings page with the same filters as home search. */
export function buildPropertiesListingHref(filters = {}, currencyOpts = {}) {
  if (!hasAppliedHomeFilters(filters)) return '/properties'
  const params = buildPropertiesSearchParams(filters, { limit: 12, ...currencyOpts })
  params.delete('page')
  return `/properties?${params.toString()}`
}

export function hasAppliedHomeFilters(filters = {}) {
  const ignore = new Set(['listingType', 'propertySegment'])
  return Object.entries(filters).some(([key, value]) => {
    if (ignore.has(key)) return false
    if (key === 'propertySegment' && String(value).trim() === 'all') return false
    return String(value ?? '').trim() !== ''
  })
}

/** Client-side rent period match when API returns rent listings. */
export function matchesRentPeriodFilter(rentPeriod, property) {
  const want = String(rentPeriod || '').trim().toLowerCase()
  if (!want) return true
  const actual = String(property?.price?.rent?.period || '').trim().toLowerCase()
  return actual === want
}
