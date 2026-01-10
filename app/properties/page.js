'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '../../lib/api'
import { Search, Filter, MapPin, Bed, Bath, Square, SlidersHorizontal, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'

export default function PropertiesPage() {
  const searchParams = useSearchParams()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    propertyType: searchParams.get('propertyType') || '',
    listingType: searchParams.get('listingType') || '',
    city: searchParams.get('city') || '',
    state: searchParams.get('state') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    bathrooms: searchParams.get('bathrooms') || '',
    search: searchParams.get('search') || ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 })

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
      search: ''
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

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="commercial">Commercial</option>
              </select>

              <select
                value={filters.listingType}
                onChange={(e) => handleFilterChange('listingType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Sale/Rent</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>

              <input
                type="text"
                placeholder="City"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />

              <input
                type="text"
                placeholder="State"
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />

              <input
                type="number"
                placeholder="Min Price"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />

              <input
                type="number"
                placeholder="Max Price"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />

              <select
                value={filters.bedrooms}
                onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Bedrooms</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>

              <select
                value={filters.bathrooms}
                onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Bathrooms</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>

              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          )}
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

