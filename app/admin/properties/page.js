'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Package, Plus, Search, Edit, Trash2, Eye, Filter, MapPin, DollarSign, Clock, Building, Bed, Bath, Square, TrendingUp, CheckCircle, XCircle, Home, ChevronDown, X, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AdminPropertiesPage() {
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [allProperties, setAllProperties] = useState([]) // Store all properties for metrics
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    propertyType: '',
    listingType: '',
    agency: '',
    city: '',
    state: '',
    country: '',
    area: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    minArea: '',
    maxArea: ''
  })
  const [agencies, setAgencies] = useState([])
  const [uniqueLocations, setUniqueLocations] = useState({
    cities: [],
    states: [],
    countries: []
  })
  const [openFilter, setOpenFilter] = useState(null) // 'price', 'specification', 'location', 'agency', 'status', 'propertyType', 'listingType'
  const [startDate, setStartDate] = useState('') // Date range filter start
  const [endDate, setEndDate] = useState('') // Date range filter end
  const [showDatePicker, setShowDatePicker] = useState(false) // Show/hide date picker
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 12
  })
  const [propertyMetrics, setPropertyMetrics] = useState({
    totalProperties: 0,
    activeProperties: 0,
    soldProperties: 0,
    rentedProperties: 0,
    pendingProperties: 0,
    inactiveProperties: 0
  })


  useEffect(() => {
    fetchMetrics()
    fetchAgencies()
    fetchUniqueLocations()
  }, [])

  useEffect(() => {
    // Reset pagination when date filters change
    setPagination(prev => ({ ...prev, current: 1 }))
  }, [startDate, endDate])

  useEffect(() => {
    // Debounce search to avoid too many API calls
    // No debounce for filters for immediate feedback
    const timer = setTimeout(() => {
      fetchProperties()
    }, searchTerm.trim() ? 300 : 0)

    return () => clearTimeout(timer)
  }, [
    filters.status, 
    filters.propertyType, 
    filters.listingType,
    filters.agency,
    filters.city,
    filters.state,
    filters.country,
    filters.area,
    filters.minPrice,
    filters.maxPrice,
    filters.bedrooms,
    filters.bathrooms,
    filters.minArea,
    filters.maxArea,
    pagination.current, 
    searchTerm,
    startDate,
    endDate
  ])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.current || 1,
        limit: pagination.limit || 12,
        _t: Date.now() // Cache busting parameter
      })

      if (searchTerm.trim()) params.append('search', searchTerm.trim())
      if (filters.status && filters.status.trim()) {
        params.append('status', filters.status.trim())
      }
      if (filters.propertyType && filters.propertyType.trim()) {
        params.append('propertyType', filters.propertyType.trim())
      }
      if (filters.listingType && filters.listingType.trim()) {
        params.append('listingType', filters.listingType.trim())
      }
      if (filters.agency && filters.agency.trim()) {
        params.append('agency', filters.agency.trim())
      }
      if (filters.city && filters.city.trim()) {
        params.append('city', filters.city.trim())
      }
      if (filters.state && filters.state.trim()) {
        params.append('state', filters.state.trim())
      }
      if (filters.country && filters.country.trim()) {
        params.append('country', filters.country.trim())
      }
      if (filters.area && filters.area.trim()) {
        params.append('area', filters.area.trim())
      }
      if (filters.minPrice && filters.minPrice.trim()) {
        params.append('minPrice', filters.minPrice.trim())
      }
      if (filters.maxPrice && filters.maxPrice.trim()) {
        params.append('maxPrice', filters.maxPrice.trim())
      }
      if (filters.bedrooms && filters.bedrooms.trim()) {
        params.append('bedrooms', filters.bedrooms.trim())
      }
      if (filters.bathrooms && filters.bathrooms.trim()) {
        params.append('bathrooms', filters.bathrooms.trim())
      }
      if (filters.minArea && filters.minArea.trim()) {
        params.append('minArea', filters.minArea.trim())
      }
      if (filters.maxArea && filters.maxArea.trim()) {
        params.append('maxArea', filters.maxArea.trim())
      }

      const response = await api.get(`/properties?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      let fetchedProperties = response.data.properties || []
      
      // Apply client-side date filtering by createdAt or updatedAt
      if (startDate || endDate) {
        fetchedProperties = fetchedProperties.filter((property) => {
          const propertyDate = new Date(property.updatedAt || property.updated_at || property.createdAt || property.created_at || 0)
          const start = startDate ? new Date(startDate + 'T00:00:00') : null
          const end = endDate ? new Date(endDate + 'T23:59:59') : null
          
          if (start && propertyDate < start) return false
          if (end && propertyDate > end) return false
          return true
        })
      }
      
      setProperties(fetchedProperties)
      setPagination(response.data.pagination || {
        current: response.data.pagination?.page || pagination.current,
        pages: response.data.pagination?.pages || pagination.pages,
        total: response.data.pagination?.total || pagination.total,
        limit: response.data.pagination?.limit || pagination.limit
      })
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error(error.response?.data?.message || 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      // Fetch all properties for metrics calculation
      const response = await api.get('/properties?limit=500').catch(() => ({ data: { properties: [] } }))
      const allPropertiesData = response.data?.properties || []
      
      setAllProperties(allPropertiesData)

      // Calculate metrics
      const activeProperties = allPropertiesData.filter(p => p.status === 'active').length
      const soldProperties = allPropertiesData.filter(p => p.status === 'sold').length
      const rentedProperties = allPropertiesData.filter(p => p.status === 'rented').length
      const pendingProperties = allPropertiesData.filter(p => p.status === 'pending').length
      const inactiveProperties = allPropertiesData.filter(p => p.status === 'inactive').length

      setPropertyMetrics({
        totalProperties: allPropertiesData.length,
        activeProperties: activeProperties,
        soldProperties: soldProperties,
        rentedProperties: rentedProperties,
        pendingProperties: pendingProperties,
        inactiveProperties: inactiveProperties
      })
    } catch (error) {
      console.error('Error fetching property metrics:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return
    
    try {
      await api.delete(`/properties/${id}`)
      toast.success('Property deleted successfully')
      fetchProperties()
    } catch (error) {
      console.error('Error deleting property:', error)
      toast.error('Failed to delete property')
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A'
    if (typeof price === 'object') {
      if (price.sale) return `$${Number(price.sale).toLocaleString()}`
      if (price.rent) return `$${Number(price.rent.amount).toLocaleString()}/${price.rent.period}`
    }
    return `$${Number(price).toLocaleString()}`
  }

  const fetchAgencies = async () => {
    try {
      const response = await api.get('/agencies?limit=500')
      setAgencies(response.data.agencies || [])
    } catch (error) {
      console.error('Error fetching agencies:', error)
      setAgencies([])
    }
  }

  const fetchUniqueLocations = async () => {
    try {
      const response = await api.get('/properties?limit=500')
      const allProperties = response.data?.properties || []
      
      const cities = [...new Set(allProperties
        .map(p => p.location?.city)
        .filter(Boolean)
      )].sort()
      
      const states = [...new Set(allProperties
        .map(p => p.location?.state)
        .filter(Boolean)
      )].sort()
      
      const countries = [...new Set(allProperties
        .map(p => p.location?.country)
        .filter(Boolean)
      )].sort()
      
      setUniqueLocations({ cities, states, countries })
    } catch (error) {
      console.error('Error fetching unique locations:', error)
      setUniqueLocations({ cities: [], states: [], countries: [] })
    }
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      propertyType: '',
      listingType: '',
      agency: '',
      city: '',
      state: '',
      country: '',
      area: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      minArea: '',
      maxArea: ''
    })
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const hasActiveFilters = () => {
    return filters.status !== '' || 
           filters.propertyType !== '' || 
           filters.listingType !== '' || 
           filters.agency !== '' ||
           filters.city !== '' ||
           filters.state !== '' ||
           filters.country !== '' ||
           filters.area !== '' ||
           filters.minPrice !== '' ||
           filters.maxPrice !== '' ||
           filters.bedrooms !== '' ||
           filters.bathrooms !== '' ||
           filters.minArea !== '' ||
           filters.maxArea !== '' ||
           searchTerm.trim() !== '' ||
           startDate !== '' ||
           endDate !== ''
  }

  const getPropertyId = (property) => {
    if (!property) return ''
    if (typeof property._id === 'string') return property._id
    if (property._id?.toString) return property._id.toString()
    if (property._id?.$oid) return property._id.$oid
    return String(property._id || property.id || '')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Property Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{propertyMetrics.totalProperties}</p>
              </div>
              <Package className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Active Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{propertyMetrics.activeProperties}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Sold Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{propertyMetrics.soldProperties}</p>
              </div>
              <Home className="h-10 w-10 text-purple-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow-sm p-4 border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Rented Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{propertyMetrics.rentedProperties}</p>
              </div>
              <Building className="h-10 w-10 text-teal-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{propertyMetrics.pendingProperties}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Inactive Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{propertyMetrics.inactiveProperties}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-500 opacity-80" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="mt-1 text-sm text-gray-500">Manage all properties across all agencies</p>
          </div>
           <div className="flex items-center gap-3">
             {/* Search Bar */}
             <div className="relative">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
               <input
                 type="text"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Search properties by any field..."
                 className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
               />
             </div>
             <Link href="/admin/properties/add" className="btn btn-primary">
               <Plus className="h-5 w-5 mr-2" />
               Add Property
             </Link>
           </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status Filter - Direct Dropdown */}
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, status: e.target.value }))
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium ${
              filters.status ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
            }`}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
            <option value="rented">Rented</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>

          {/* Property Type Filter - Direct Dropdown */}
          <select
            value={filters.propertyType}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, propertyType: e.target.value }))
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium ${
              filters.propertyType ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
            }`}
          >
            <option value="">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="condo">Condo</option>
            <option value="townhouse">Townhouse</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
            <option value="office">Office</option>
            <option value="retail">Retail</option>
            <option value="warehouse">Warehouse</option>
            <option value="other">Other</option>
          </select>

          {/* Listing Type Filter - Direct Dropdown */}
          <select
            value={filters.listingType}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, listingType: e.target.value }))
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium ${
              filters.listingType ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
            }`}
          >
            <option value="">All Listing Types</option>
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
            <option value="both">Both</option>
          </select>

          {/* Price Filter Button */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium flex items-center gap-2 ${
                filters.minPrice || filters.maxPrice ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
              }`}
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
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">Price Range</h3>
                    {(filters.minPrice || filters.maxPrice) && (
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                      <input
                        type="number"
                        value={filters.minPrice}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, minPrice: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        placeholder="Enter min price"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                      <input
                        type="number"
                        value={filters.maxPrice}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, maxPrice: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        placeholder="Enter max price"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setOpenFilter(null)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Specification Filter Button */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'specification' ? null : 'specification')}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium flex items-center gap-2 ${
                filters.bedrooms || filters.bathrooms || filters.minArea || filters.maxArea ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
              }`}
            >
              <Bed className="h-4 w-4" />
              Specification
              {(filters.bedrooms || filters.bathrooms || filters.minArea || filters.maxArea) && (
                <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                  {[filters.bedrooms && `${filters.bedrooms}BR`, filters.bathrooms && `${filters.bathrooms}BA`].filter(Boolean).join(', ')}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'specification' ? 'rotate-180' : ''}`} />
            </button>
            {openFilter === 'specification' && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[300px]">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">Specifications</h3>
                    {(filters.bedrooms || filters.bathrooms || filters.minArea || filters.maxArea) && (
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, bedrooms: '', bathrooms: '', minArea: '', maxArea: '' }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                      <select
                        value={filters.bedrooms}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, bedrooms: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      >
                        <option value="">Any</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                      <select
                        value={filters.bathrooms}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, bathrooms: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      >
                        <option value="">Any</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Area (sqft)</label>
                      <input
                        type="number"
                        value={filters.minArea}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, minArea: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        placeholder="Enter min area"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Area (sqft)</label>
                      <input
                        type="number"
                        value={filters.maxArea}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, maxArea: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        placeholder="Enter max area"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setOpenFilter(null)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location Filter Button */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'location' ? null : 'location')}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium flex items-center gap-2 ${
                filters.city || filters.state || filters.country ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
              }`}
            >
              <MapPin className="h-4 w-4" />
              Location
              {(filters.city || filters.state || filters.country || filters.area) && (
                <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                  {[filters.city, filters.state, filters.country, filters.area].filter(Boolean).join(', ')}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'location' ? 'rotate-180' : ''}`} />
            </button>
            {openFilter === 'location' && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[300px]">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">Location</h3>
                    {(filters.city || filters.state || filters.country || filters.area) && (
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, city: '', state: '', country: '', area: '' }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <select
                        value={filters.city}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, city: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      >
                        <option value="">All Cities</option>
                        {uniqueLocations.cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <select
                        value={filters.state}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, state: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      >
                        <option value="">All States</option>
                        {uniqueLocations.states.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <select
                        value={filters.country}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, country: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      >
                        <option value="">All Countries</option>
                        {uniqueLocations.countries.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                      <input
                        type="text"
                        value={filters.area}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, area: e.target.value }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        placeholder="Enter area/neighborhood"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setOpenFilter(null)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Agency Filter - Direct Dropdown */}
          <select
            value={filters.agency}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, agency: e.target.value }))
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium ${
              filters.agency ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
            }`}
          >
            <option value="">All Agencies</option>
            {agencies.map((agency) => (
              <option key={agency._id} value={agency._id}>
                {agency.name}
              </option>
            ))}
          </select>

          {/* Date Range Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium flex items-center gap-2 ${
                startDate || endDate
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>
                {startDate && endDate
                  ? `${new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                  : startDate
                    ? `From ${new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                    : endDate
                      ? `Until ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                      : 'Date Range'}
              </span>
              {(startDate || endDate) && (
                <X 
                  className="h-4 w-4 ml-1 text-gray-400 hover:text-gray-600" 
                  onClick={(e) => {
                    e.stopPropagation()
                    setStartDate('')
                    setEndDate('')
                    setPagination(prev => ({ ...prev, current: 1 }))
                  }}
                />
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>
            {showDatePicker && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDatePicker(false)}
                />
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 min-w-[500px]">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value
                          setStartDate(newStartDate)
                          if (endDate && newStartDate && endDate < newStartDate) {
                            setEndDate('')
                          }
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value)
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        min={startDate || undefined}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => {
                        setStartDate('')
                        setEndDate('')
                        setShowDatePicker(false)
                        setPagination(prev => ({ ...prev, current: 1 }))
                      }}
                      className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        setShowDatePicker(false)
                      }}
                      className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Clear All Filters Button */}
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Click outside to close dropdowns */}
        {(openFilter && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenFilter(null)}
          />
        )) || null}


        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No properties found</p>
            <Link href="/admin/properties/add" className="btn btn-primary mt-4">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Property
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-primary-600 to-primary-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Property Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Agency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Details
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {properties.map((property) => {
                      const propertyId = getPropertyId(property)
                      return (
                        <tr key={propertyId} className="hover:bg-logo-beige transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {property.images && property.images.length > 0 ? (
                              <img
                                src={typeof property.images[0] === 'string' ? property.images[0] : (property.images[0]?.url || property.images[0])}
                                alt={property.title}
                                className="h-16 w-16 rounded-lg object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center" style={{ display: (property.images && property.images.length > 0) ? 'none' : 'flex' }}>
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{property.title}</div>
                            <div className="text-xs text-gray-500 capitalize">{property.propertyType || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-gray-400" />
                              <div className="text-sm text-gray-900">
                                {property.agency?.name || 'No Agency'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <div className="text-sm text-gray-900">
                                {property.location?.city || '-'}, {property.location?.state || ''}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-primary-600">
                              {formatPrice(property.price)}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {property.listingType || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 capitalize">
                              {property.propertyType || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Bed className="h-3 w-3" />
                                <span>{property.specifications?.bedrooms || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="h-3 w-3" />
                                <span>{property.specifications?.bathrooms || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Square className="h-3 w-3" />
                                <span>{property.specifications?.area?.value || 0} {property.specifications?.area?.unit || 'sqft'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {property.status === 'active' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : property.status === 'sold' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Sold
                              </span>
                            ) : property.status === 'rented' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Rented
                              </span>
                            ) : property.status === 'pending' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {property.status || 'Inactive'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center gap-3">
                              <Link
                                href={`/admin/properties/${propertyId}`}
                                className="text-primary-600 hover:text-primary-900 transition-colors"
                                title="View"
                              >
                                <Eye className="h-5 w-5" />
                              </Link>
                              <Link
                                href={`/admin/properties/${propertyId}/edit`}
                                className="text-primary-600 hover:text-primary-900 transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-5 w-5" />
                              </Link>
                              <button
                                onClick={() => handleDelete(propertyId)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  {/* Pagination Info */}
                  <div className="text-sm text-gray-600">
                    Showing{' '}
                    <span className="font-semibold text-gray-900">
                      {((pagination.current - 1) * pagination.limit) + 1}
                    </span>
                    {' - '}
                    <span className="font-semibold text-gray-900">
                      {Math.min(pagination.current * pagination.limit, pagination.total)}
                    </span>
                    {' of '}
                    <span className="font-semibold text-gray-900">{pagination.total}</span>
                    {' properties'}
                  </div>

                  {/* Pagination Controls */}
                  {pagination.pages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                        disabled={pagination.current === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium"
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                          let pageNum;
                          if (pagination.pages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.current <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.current >= pagination.pages - 2) {
                            pageNum = pagination.pages - 4 + i;
                          } else {
                            pageNum = pagination.current - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPagination(prev => ({ ...prev, current: pageNum }))}
                              className={`px-3 py-2 border rounded-lg text-sm font-medium min-w-[40px] ${
                                pagination.current === pageNum
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                        disabled={pagination.current === pagination.pages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

