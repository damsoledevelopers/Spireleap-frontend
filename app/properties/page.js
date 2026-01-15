'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { api } from '../../lib/api'
import { Search, Filter, MapPin, Bed, Bath, Square, SlidersHorizontal, X, ChevronDown, DollarSign, TrendingUp, Building, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'

export default function PropertiesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [uniqueLocations, setUniqueLocations] = useState({
    cities: [],
    states: [],
    countries: [],
    areas: []
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
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    amenities: searchParams.get('amenities') || ''
  })
  const [showFilters, setShowFilters] = useState(true)
  const [openFilter, setOpenFilter] = useState(null)
  const [pagination, setPagination] = useState({ page: parseInt(searchParams.get('page')) || 1, limit: 12, total: 0, pages: 0 })

  useEffect(() => {
    // Load filter options (categories & amenities) once
    const fetchFilterOptions = async () => {
      try {
        const [categoriesRes, amenitiesRes, propertiesRes] = await Promise.all([
          api.get('/cms/categories'),
          api.get('/cms/amenities?limit=100'),
          api.get('/properties?limit=500')
        ])
        setCategories(categoriesRes.data.categories || [])
        setAmenities(amenitiesRes.data.amenities || [])

        const allProperties = propertiesRes.data?.properties || []
        const cities = [...new Set(allProperties.map(p => p.location?.city).filter(Boolean))].sort()
        const states = [...new Set(allProperties.map(p => p.location?.state).filter(Boolean))].sort()
        const countries = [...new Set(allProperties.map(p => p.location?.country).filter(Boolean))].sort()
        const areas = [...new Set(allProperties.map(p => p.location?.area || p.area).filter(Boolean))].sort()

        setUniqueLocations({ cities, states, countries, areas })
      } catch (error) {
        console.error('Error fetching filter options:', error)
      }
    }

    fetchFilterOptions()
  }, [])

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
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      amenities: searchParams.get('amenities') || ''
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
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      search: '',
      category: '',
      amenities: ''
    })
  }

  const formatPrice = (price) => {
    if (!price) return 'Price on request'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

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
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="commercial">Commercial</option>
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
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[300px]">
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
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${filters.bedrooms || filters.bathrooms ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
              >
                <Bed className="h-4 w-4" />
                Specification
                {(filters.bedrooms || filters.bathrooms) && (
                  <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                    {[filters.bedrooms && `${filters.bedrooms}BR`, filters.bathrooms && `${filters.bathrooms}BA`].filter(Boolean).join(', ')}
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'spec' ? 'rotate-180' : ''}`} />
              </button>
              {openFilter === 'spec' && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[250px]">
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Bedrooms</label>
                      <select
                        value={filters.bedrooms}
                        onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Bathrooms</label>
                      <select
                        value={filters.bathrooms}
                        onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Any</option>
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+</option>)}
                      </select>
                    </div>
                    <button onClick={() => setOpenFilter(null)} className="w-full btn btn-primary py-2 text-sm">Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* State Filter */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'state' ? null : 'state')}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${filters.state ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
              >
                <MapPin className="h-4 w-4" />
                State
                {filters.state && <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">{filters.state}</span>}
                <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'state' ? 'rotate-180' : ''}`} />
              </button>
              {openFilter === 'state' && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { handleFilterChange('state', ''); setOpenFilter(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!filters.state ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                    >
                      All States
                    </button>
                    {uniqueLocations.states.map((state) => (
                      <button
                        key={state}
                        onClick={() => { handleFilterChange('state', state); setOpenFilter(null); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm ${filters.state === state ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Country Filter */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'country' ? null : 'country')}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${filters.country ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
              >
                <MapPin className="h-4 w-4" />
                Country
                {filters.country && <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">{filters.country}</span>}
                <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'country' ? 'rotate-180' : ''}`} />
              </button>
              {openFilter === 'country' && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { handleFilterChange('country', ''); setOpenFilter(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!filters.country ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                    >
                      All Countries
                    </button>
                    {uniqueLocations.countries.map((country) => (
                      <button
                        key={country}
                        onClick={() => { handleFilterChange('country', country); setOpenFilter(null); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm ${filters.country === country ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Area Filter */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'area' ? null : 'area')}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${filters.area ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
              >
                <TrendingUp className="h-4 w-4" />
                Area
                {filters.area && <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs max-w-[100px] truncate">{filters.area}</span>}
                <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'area' ? 'rotate-180' : ''}`} />
              </button>
              {openFilter === 'area' && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { handleFilterChange('area', ''); setOpenFilter(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!filters.area ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                    >
                      All Areas
                    </button>
                    {uniqueLocations.areas.map((area) => (
                      <button
                        key={area}
                        onClick={() => { handleFilterChange('area', area); setOpenFilter(null); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm ${filters.area === area ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                      >
                        {area}
                      </button>
                    ))}
                    <div className="pt-2 border-t border-gray-100 mt-2 p-1">
                      <input
                        type="text"
                        placeholder="Or type area..."
                        className="w-full px-3 py-1.5 border rounded text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFilterChange('area', e.target.value)
                            setOpenFilter(null)
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* City Filter (formerly Location) */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'city' ? null : 'city')}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${filters.city ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
              >
                <MapPin className="h-4 w-4" />
                City
                {filters.city && <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">{filters.city}</span>}
                <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'city' ? 'rotate-180' : ''}`} />
              </button>
              {openFilter === 'city' && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { handleFilterChange('city', ''); setOpenFilter(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!filters.city ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                    >
                      All Cities
                    </button>
                    {uniqueLocations.cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => { handleFilterChange('city', city); setOpenFilter(null); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm ${filters.city === city ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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

