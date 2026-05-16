'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { api } from '../../lib/api'
import { Search, Filter, MapPin, Bed, Bath, Square, SlidersHorizontal, X, ChevronDown, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'
import { useCurrency } from '../../contexts/CurrencyContext'
import { formatMoneyFromAed } from '../../lib/money'
import SearchableSelect from '../../components/Common/SearchableSelect'

export default function PropertiesPage() {
  const router = useRouter()
  const { selectedCurrency, ratesByCode } = useCurrency()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [filterOptions, setFilterOptions] = useState({
    propertyTypes: [],
    listingTypes: [],
    locations: { cities: [], states: [], countries: [], areas: [] },
    specifications: { bedrooms: [], bathrooms: [] },
    leadFieldOptions: {
      preferredRooms: [],
      preferredSize: [],
      buyerType: [],
      paymentMethod: [],
      spokenLanguages: []
    }
  })
  const [filters, setFilters] = useState({
    propertyType: searchParams.get('propertyType') || '',
    listingType: searchParams.get('listingType') || '',
    city: searchParams.get('city') || '',
    state: searchParams.get('state') || '',
    country: searchParams.get('country') || '',
    area: searchParams.get('area') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    bathrooms: searchParams.get('bathrooms') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
    balconies: searchParams.get('balconies') || '',
    livingRoom: searchParams.get('livingRoom') || '',
    unfurnished: searchParams.get('unfurnished') || '',
    semiFurnished: searchParams.get('semiFurnished') || '',
    fullyFurnished: searchParams.get('fullyFurnished') || '',
    studio: searchParams.get('studio') || '',
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    amenities: searchParams.get('amenities') || '',
    preferredRooms: searchParams.get('preferredRooms') || '',
    preferredSize: searchParams.get('preferredSize') || '',
    buyerType: searchParams.get('buyerType') || '',
    paymentMethod: searchParams.get('paymentMethod') || '',
    nationality: searchParams.get('nationality') || '',
    dob: searchParams.get('dob') || '',
    spokenLanguages: searchParams.get('spokenLanguages') || ''
  })
  const [showFilters, setShowFilters] = useState(true)
  const [openFilter, setOpenFilter] = useState(null)
  const [pagination, setPagination] = useState({ page: parseInt(searchParams.get('page')) || 1, limit: 12, total: 0, pages: 0 })
  const [geo, setGeo] = useState({ countries: [], states: [], cities: [] })
  const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false })

  useEffect(() => {
    // Load filter options once (from backend)
    const fetchFilterOptions = async () => {
      try {
        const [categoriesRes, amenitiesRes, filterOptionsRes] = await Promise.all([
          api.get('/settings/categories'),
          api.get('/settings/amenities?limit=100'),
          api.get('/properties/filter-options')
        ])
        setCategories(categoriesRes.data.categories || [])
        setAmenities(amenitiesRes.data.amenities || [])
        setFilterOptions(filterOptionsRes.data || {
          propertyTypes: [],
          listingTypes: [],
          locations: { cities: [], states: [], countries: [], areas: [] },
          specifications: { bedrooms: [], bathrooms: [] }
        })
      } catch (error) {
        console.error('Error fetching filter options:', error)
      }
    }

    fetchFilterOptions()
  }, [])

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setGeoLoading((p) => ({ ...p, countries: true }))
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions')
        const data = await res.json()
        const countries = Array.isArray(data?.data)
          ? data.data.map((c) => String(c?.name || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
          : []
        setGeo((p) => ({ ...p, countries }))
      } catch (e) {
        console.error('Error fetching countries:', e)
        setGeo((p) => ({ ...p, countries: [] }))
      } finally {
        setGeoLoading((p) => ({ ...p, countries: false }))
      }
    }
    fetchCountries()
  }, [])

  useEffect(() => {
    const country = String(filters.country || '').trim()
    if (!country) {
      setGeo((p) => ({ ...p, states: [], cities: [] }))
      return
    }
    let cancelled = false
    const fetchStates = async () => {
      try {
        setGeoLoading((p) => ({ ...p, states: true }))
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country })
        })
        const data = await res.json()
        const states = Array.isArray(data?.data?.states)
          ? data.data.states.map((s) => String(s?.name || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
          : []
        if (!cancelled) setGeo((p) => ({ ...p, states, cities: [] }))
      } catch (e) {
        console.error('Error fetching states:', e)
        if (!cancelled) setGeo((p) => ({ ...p, states: [], cities: [] }))
      } finally {
        if (!cancelled) setGeoLoading((p) => ({ ...p, states: false }))
      }
    }
    fetchStates()
    return () => {
      cancelled = true
    }
  }, [filters.country])

  useEffect(() => {
    const country = String(filters.country || '').trim()
    const state = String(filters.state || '').trim()
    if (!country || !state) {
      setGeo((p) => ({ ...p, cities: [] }))
      return
    }
    let cancelled = false
    const fetchCities = async () => {
      try {
        setGeoLoading((p) => ({ ...p, cities: true }))
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country, state })
        })
        const data = await res.json()
        const cities = Array.isArray(data?.data)
          ? data.data.map((c) => String(c || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
          : []
        if (!cancelled) setGeo((p) => ({ ...p, cities }))
      } catch (e) {
        console.error('Error fetching cities:', e)
        if (!cancelled) setGeo((p) => ({ ...p, cities: [] }))
      } finally {
        if (!cancelled) setGeoLoading((p) => ({ ...p, cities: false }))
      }
    }
    fetchCities()
    return () => {
      cancelled = true
    }
  }, [filters.country, filters.state])

  const stateOptions = useMemo(() => {
    const current = String(filters.state || '').trim()
    return Array.from(new Set([...(geo.states || []), current].filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [geo.states, filters.state])

  const cityOptions = useMemo(() => {
    const current = String(filters.city || '').trim()
    return Array.from(new Set([...(geo.cities || []), current].filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [geo.cities, filters.city])

  const areaSelectOptions = useMemo(() => {
    const raw = filterOptions.locations?.areas || []
    return [{ value: '', label: 'All areas' }, ...raw.map((a) => ({ value: a, label: a }))]
  }, [filterOptions.locations?.areas])

  const locationSelectClass =
    'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium bg-white min-w-[140px] max-w-[200px]'

  // Sync state with URL changes
  useEffect(() => {
    setFilters({
      propertyType: searchParams.get('propertyType') || '',
      listingType: searchParams.get('listingType') || '',
      city: searchParams.get('city') || '',
      state: searchParams.get('state') || '',
      country: searchParams.get('country') || '',
      area: searchParams.get('area') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      bedrooms: searchParams.get('bedrooms') || '',
      bathrooms: searchParams.get('bathrooms') || '',
      minArea: searchParams.get('minArea') || '',
      maxArea: searchParams.get('maxArea') || '',
      balconies: searchParams.get('balconies') || '',
      livingRoom: searchParams.get('livingRoom') || '',
      unfurnished: searchParams.get('unfurnished') || '',
      semiFurnished: searchParams.get('semiFurnished') || '',
      fullyFurnished: searchParams.get('fullyFurnished') || '',
    studio: searchParams.get('studio') || '',
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      amenities: searchParams.get('amenities') || '',
      preferredRooms: searchParams.get('preferredRooms') || '',
      preferredSize: searchParams.get('preferredSize') || '',
      buyerType: searchParams.get('buyerType') || '',
      paymentMethod: searchParams.get('paymentMethod') || '',
      nationality: searchParams.get('nationality') || '',
      dob: searchParams.get('dob') || '',
      spokenLanguages: searchParams.get('spokenLanguages') || ''
    })
    setPagination(prev => ({
      ...prev,
      page: parseInt(searchParams.get('page')) || 1
    }))
  }, [searchParams])

  // Update URL when filters change (debounced)
  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    if (pagination.page > 1) params.set('page', pagination.page.toString())

    const query = params.toString()
    const url = query ? `${pathname}?${query}` : pathname

    const timer = setTimeout(() => {
      if (url !== (pathname + '?' + searchParams.toString())) {
        router.push(url, { scroll: false })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [filters, pagination.page])

  useEffect(() => {
    fetchProperties()
  }, [filters, pagination.page])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })

      const response = await api.get(`/properties?${params}`)
      setProperties(response.data.properties)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      propertyType: '',
      listingType: '',
      city: '',
      state: '',
      country: '',
      area: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      minArea: '',
      maxArea: '',
      balconies: '',
      livingRoom: '',
      unfurnished: '',
      semiFurnished: '',
      fullyFurnished: '',
      studio: '',
      search: '',
      category: '',
      amenities: '',
      preferredRooms: '',
      preferredSize: '',
      buyerType: '',
      paymentMethod: '',
      nationality: '',
      dob: '',
      spokenLanguages: ''
    })
  }

  const formatPrice = (price) => formatMoneyFromAed(price, selectedCurrency, ratesByCode, { minimumFractionDigits: 0 })

  const getPrimaryImage = (images) => {
    const primary = images?.find(img => img.isPrimary)
    return primary?.url || images?.[0]?.url || '/placeholder-property.jpg'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap gap-3 items-center mt-4 pt-4 border-t border-gray-100">
            {/* Property Type Filter */}
            <select
              value={filters.propertyType}
              onChange={(e) => handleFilterChange('propertyType', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium ${filters.propertyType ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
            >
              <option value="">All Types</option>
              {(filterOptions.propertyTypes || []).map((t) => (
                <option key={t} value={t}>
                  {String(t).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>

            {/* Listing Type Filter */}
            <select
              value={filters.listingType}
              onChange={(e) => handleFilterChange('listingType', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium ${filters.listingType ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
            >
              <option value="">All Listings</option>
              {(filterOptions.listingTypes || []).map((t) => (
                <option key={t} value={t}>
                  {t === 'sale' ? 'For Sale' : t === 'rent' ? 'For Rent' : 'Sale / Rent'}
                </option>
              ))}
            </select>

            {/* New Lead-related dropdowns (used while searching properties) */}
            <select
              value={filters.preferredRooms}
              onChange={(e) => {
                const v = e.target.value
                handleFilterChange('preferredRooms', v)
                // Map to actual property filter
                if (v === 'studio') handleFilterChange('bedrooms', '0')
                else if (v === '') handleFilterChange('bedrooms', '')
                else if (!Number.isNaN(Number(v))) handleFilterChange('bedrooms', String(Number(v)))
              }}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium ${filters.preferredRooms ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
            >
              <option value="">Preferred Rooms</option>
              {(filterOptions.leadFieldOptions?.preferredRooms || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
              
            <select
              value={filters.preferredSize}
              onChange={(e) => {
                const v = e.target.value
                handleFilterChange('preferredSize', v)
                // Map to actual property filter via minArea/maxArea
                if (!v) {
                  handleFilterChange('minArea', '')
                  handleFilterChange('maxArea', '')
                  return
                }
                const map = {
                  '0_500': { min: '', max: '500' },
                  '500_1000': { min: '500', max: '1000' },
                  '1000_1500': { min: '1000', max: '1500' },
                  '1500_2000': { min: '1500', max: '2000' },
                  '2000_plus': { min: '2000', max: '' }
                }
                const r = map[v]
                handleFilterChange('minArea', r?.min ?? '')
                handleFilterChange('maxArea', r?.max ?? '')
              }}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium ${filters.preferredSize ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
            >
              <option value="">Preferred Size</option>
              {(filterOptions.leadFieldOptions?.preferredSize || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={filters.buyerType}
              onChange={(e) => handleFilterChange('buyerType', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium ${filters.buyerType ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
            >
              <option value="">Buyer Type</option>
              {(filterOptions.leadFieldOptions?.buyerType || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium ${filters.paymentMethod ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
            >
              <option value="">Payment Method</option>
              {(filterOptions.leadFieldOptions?.paymentMethod || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={filters.spokenLanguages}
              onChange={(e) => handleFilterChange('spokenLanguages', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium ${filters.spokenLanguages ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
            >
              <option value="">Spoken Languages</option>
              {(filterOptions.leadFieldOptions?.spokenLanguages || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Price Filter */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${filters.minPrice || filters.maxPrice ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
              >
                <DollarSign className="h-4 w-4" />
                Price
                {(filters.minPrice || filters.maxPrice) && (
                  <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                    {filters.minPrice && filters.maxPrice ? `${filters.minPrice}-${filters.maxPrice}` : filters.minPrice ? `${filters.minPrice}+` : `Up to ${filters.maxPrice}`}
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'price' ? 'rotate-180' : ''}`} />
              </button>
              {openFilter === 'price' && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-72 max-w-[calc(100vw-2rem)]">
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">Price Range</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <button onClick={() => setOpenFilter(null)} className="w-full btn btn-primary py-2 text-sm">Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Specification Filter */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'spec' ? null : 'spec')}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${filters.bedrooms || filters.bathrooms || filters.balconies || filters.livingRoom || filters.unfurnished || filters.semiFurnished || filters.fullyFurnished || filters.studio ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
              >
                <Bed className="h-4 w-4" />
                Specification
                {(filters.bedrooms || filters.bathrooms) && (
                  <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                    {[
                      filters.bedrooms && `${filters.bedrooms}BR`,
                      filters.bathrooms && `${filters.bathrooms}BA`,
                      filters.balconies && `${filters.balconies}Blc`,
                      filters.livingRoom && `${filters.livingRoom}LR`,
                      filters.unfurnished && 'Unf',
                      filters.semiFurnished && 'Semi',
                      filters.fullyFurnished && 'Full',
                      filters.studio && 'Studio'
                    ].filter(Boolean).join(', ')}
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'spec' ? 'rotate-180' : ''}`} />
              </button>
              {openFilter === 'spec' && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[250px]">
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Bedrooms (BHK Type)</label>
                      <select
                        value={filters.bedrooms}
                        onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Any</option>
                        {(filterOptions.specifications?.bedrooms?.length ? filterOptions.specifications.bedrooms : [1, 2, 3, 4, 5])
                          .map((n) => <option key={n} value={n}>{n}+</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Bathrooms</label>
                        <select
                          value={filters.bathrooms}
                          onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Any</option>
                          {(filterOptions.specifications?.bathrooms?.length ? filterOptions.specifications.bathrooms : [1, 2, 3, 4])
                            .map((n) => <option key={n} value={n}>{n}+</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Balconies</label>
                        <select
                          value={filters.balconies}
                          onChange={(e) => handleFilterChange('balconies', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Any</option>
                          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Living Room</label>
                      <select
                        value={filters.livingRoom}
                        onChange={(e) => handleFilterChange('livingRoom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Any</option>
                        {[1, 2, 3].map(n => <option key={n} value={n}>{n}+</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Furnishing Status</label>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={!!filters.studio} onChange={(e) => handleFilterChange('studio', e.target.checked ? '1' : '')} />
                          Studio
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={!!filters.unfurnished} onChange={(e) => handleFilterChange('unfurnished', e.target.checked ? '1' : '')} />
                          Unfurnished
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={!!filters.semiFurnished} onChange={(e) => handleFilterChange('semiFurnished', e.target.checked ? '1' : '')} />
                          Semi
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={!!filters.fullyFurnished} onChange={(e) => handleFilterChange('fullyFurnished', e.target.checked ? '1' : '')} />
                          Fully
                        </label>
                      </div>
                    </div>
                    <button onClick={() => setOpenFilter(null)} className="w-full btn btn-primary py-2 text-sm">Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Location: country → state → city (cascading, searchable) + area from listings */}
            <SearchableSelect
              value={filters.country}
              onChange={(e) => {
                const v = e.target.value
                setFilters((prev) => ({ ...prev, country: v, state: '', city: '', area: '' }))
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              options={[{ value: '', label: 'All countries' }, ...geo.countries.map((c) => ({ value: c, label: c }))]}
              placeholder={geoLoading.countries ? 'Loading countries…' : 'Country'}
              searchPlaceholder="Search country…"
              searchable
              buttonClassName={`${locationSelectClass} ${filters.country ? 'border-primary-500 bg-primary-50 text-primary-700' : ''}`}
            />
            <SearchableSelect
              value={filters.state}
              onChange={(e) => {
                const v = e.target.value
                setFilters((prev) => ({ ...prev, state: v, city: '', area: '' }))
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              options={[{ value: '', label: 'All states' }, ...stateOptions.map((s) => ({ value: s, label: s }))]}
              placeholder={!filters.country ? 'Select country first' : geoLoading.states ? 'Loading states…' : 'State'}
              searchPlaceholder="Search state…"
              disabled={!filters.country || geoLoading.states}
              searchable
              buttonClassName={`${locationSelectClass} ${filters.state ? 'border-primary-500 bg-primary-50 text-primary-700' : ''}`}
            />
            <SearchableSelect
              value={filters.city}
              onChange={(e) => {
                const v = e.target.value
                setFilters((prev) => ({ ...prev, city: v, area: '' }))
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              options={[{ value: '', label: 'All cities' }, ...cityOptions.map((c) => ({ value: c, label: c }))]}
              placeholder={!filters.state ? 'Select state first' : geoLoading.cities ? 'Loading cities…' : 'City'}
              searchPlaceholder="Search city…"
              disabled={!filters.country || !filters.state || geoLoading.cities}
              searchable
              buttonClassName={`${locationSelectClass} ${filters.city ? 'border-primary-500 bg-primary-50 text-primary-700' : ''}`}
            />
            <SearchableSelect
              value={filters.area}
              onChange={(e) => handleFilterChange('area', e.target.value)}
              options={areaSelectOptions}
              placeholder="Area"
              searchPlaceholder="Search area…"
              searchable
              buttonClassName={`${locationSelectClass} ${filters.area ? 'border-primary-500 bg-primary-50 text-primary-700' : ''}`}
            />

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium ${filters.category ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>

            {/* Amenities Filter */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'amenities' ? null : 'amenities')}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${filters.amenities ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
              >
                <Filter className="h-4 w-4" />
                Amenities
                {filters.amenities && (
                  <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                    {filters.amenities.split(',').length}
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'amenities' ? 'rotate-180' : ''}`} />
              </button>
              {openFilter === 'amenities' && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[250px] max-h-[300px] overflow-y-auto">
                  <div className="p-4 grid grid-cols-1 gap-2">
                    {amenities.map((amenity) => (
                      <label key={amenity._id} className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.amenities.split(',').includes(amenity._id)}
                          onChange={(e) => {
                            const current = filters.amenities ? filters.amenities.split(',') : []
                            const next = e.target.checked
                              ? [...current, amenity._id]
                              : current.filter(id => id !== amenity._id)
                            handleFilterChange('amenities', next.join(','))
                          }}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{amenity.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-500 hover:text-red-600 flex items-center gap-2 transition-colors"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>

          {/* Click outside to close */}
          {openFilter && <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />}
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No properties found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {properties.map((property) => (
                <Link
                  key={property._id}
                  href={`/properties/${property.slug || property._id}`}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-48 bg-gray-200">
                    <img
                      src={getPrimaryImage(property.images)}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    {property.featured && (
                      <span className="absolute top-2 left-2 bg-primary-600 text-white px-2 py-1 rounded text-xs font-semibold">
                        Featured
                      </span>
                    )}
                    <span className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-semibold">
                      {property.listingType === 'sale' ? 'For Sale' : property.listingType === 'rent' ? 'For Rent' : 'Sale/Rent'}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {property.title}
                    </h3>
                    <p className="text-primary-600 font-bold text-xl mb-2">
                      {property.listingType === 'sale' && property.price?.sale
                        ? formatPrice(property.price.sale)
                        : property.listingType === 'rent' && property.price?.rent?.amount
                          ? `${formatPrice(property.price.rent.amount)}/${property.price.rent.period || 'month'}`
                          : 'Price on request'}
                    </p>
                    <div className="flex items-center text-gray-600 text-sm mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="line-clamp-1">
                        {property.location?.address}, {property.location?.city}, {property.location?.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600 text-sm">
                      {property.specifications?.bedrooms && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          <span>{property.specifications.bedrooms}</span>
                        </div>
                      )}
                      {property.specifications?.bathrooms && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          <span>{property.specifications.bathrooms}</span>
                        </div>
                      )}
                      {property.specifications?.area && (
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4" />
                          <span>
                            {property.specifications.area.value} {property.specifications.area.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}

