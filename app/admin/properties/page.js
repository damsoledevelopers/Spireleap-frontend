'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Package, Plus, Search, Edit, Trash2, Eye, Filter, MapPin, DollarSign, Clock, Building, Bed, Bath, Square, TrendingUp, CheckCircle, XCircle, Home, ChevronDown, X, Calendar, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import EntryPermissionModal from '../../../components/Permissions/EntryPermissionModal'
import { checkEntryPermission } from '../../../lib/permissions'
import SearchableSelect from '../../../components/Common/SearchableSelect'
import DetailsModal from '../../../components/Common/DetailsModal'
import { useConfirmDialog } from '../../../components/Common/useConfirmDialog'
import { formatPropertyPrice } from '../../../lib/money'
import MediaImage from '../../../components/Common/MediaImage'
import { buildAgencySelectOptions } from '../../../lib/agencyAgentOptions'
import {
  PROPERTY_STATUS_FILTER_OPTIONS,
  BEDROOM_FILTER_OPTIONS,
  bedroomFilterToQueryParams,
  formatBedroomLabel
} from '../../../lib/propertyOptions'

export default function AdminPropertiesPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { user, loading: authLoading, checkPermission } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Dynamic Permission Flags
  const canViewProperties = checkPermission('properties', 'view')
  const canCreateProperty = checkPermission('properties', 'create')
  const canEditProperty = checkPermission('properties', 'edit')
  const canDeleteProperty = checkPermission('properties', 'delete')

  // Role-based access control & permission check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (!canViewProperties) {
        toast.error('You do not have permission to view properties')
        router.push('/admin/dashboard')
      }
    }
  }, [user, authLoading, router, canViewProperties])

  // Role-based helper flags (for internal logic, not permission)
  const isSuperAdmin = user?.role === 'super_admin'
  const isAgencyAdmin = user?.role === 'agency_admin'
  const isAgent = user?.role === 'agent'
  const isStaff = user?.role === 'staff'
  const [properties, setProperties] = useState([])
  const [allProperties, setAllProperties] = useState([]) // Store all properties for metrics
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [permissionModalEntry, setPermissionModalEntry] = useState(null)
  const [countries, setCountries] = useState([])
  const [geo, setGeo] = useState({ states: [], cities: [] })
  const [geoLoading, setGeoLoading] = useState({ states: false, cities: false })
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    propertyType: searchParams.get('propertyType') || '',
    listingType: searchParams.get('listingType') || '',
    agency: searchParams.get('agency') || '',
    city: searchParams.get('city') || '',
    state: searchParams.get('state') || '',
    country: searchParams.get('country') || '',
    area: searchParams.get('area') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms:
      searchParams.get('bedrooms') ||
      (searchParams.get('studio') === '1' ? 'studio' : '') ||
      (searchParams.get('bedroomsMin') ? '10plus' : ''),
    bathrooms: searchParams.get('bathrooms') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
    balconies: searchParams.get('balconies') || '',
    livingRoom: searchParams.get('livingRoom') || '',
    unfurnished: searchParams.get('unfurnished') === '1' ? 'true' : '',
    semiFurnished: searchParams.get('semiFurnished') === '1' ? 'true' : '',
    fullyFurnished: searchParams.get('fullyFurnished') === '1' ? 'true' : ''
  })
  const [agencies, setAgencies] = useState([])
  const [uniqueLocations, setUniqueLocations] = useState({
    cities: [],
    states: [],
    countries: [],
    areas: []
  })
  const [openFilter, setOpenFilter] = useState(null) // 'price', 'specification', 'location', 'agency', 'status', 'propertyType', 'listingType'
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '') // Date range filter start
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '') // Date range filter end
  const [showDatePicker, setShowDatePicker] = useState(false) // Show/hide date picker
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 12
  })
  const [detailsProperty, setDetailsProperty] = useState(null)
  const [propertyMetrics, setPropertyMetrics] = useState({
    totalProperties: 0,
    activeProperties: 0,
    soldProperties: 0,
    rentedProperties: 0,
    pendingProperties: 0
  })



  useEffect(() => {
    fetchMetrics()
    if (canViewProperties) {
      fetchAgencies()
    }
    fetchUniqueLocations()
  }, [isSuperAdmin, isAgencyAdmin])

  // Sync state with URL changes (handles browser back/forward)
  useEffect(() => {
    setFilters({
      status: searchParams.get('status') || '',
      propertyType: searchParams.get('propertyType') || '',
      listingType: searchParams.get('listingType') || '',
      agency: searchParams.get('agency') || '',
      city: searchParams.get('city') || '',
      state: searchParams.get('state') || '',
      country: searchParams.get('country') || '',
      area: searchParams.get('area') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      bedrooms:
      searchParams.get('bedrooms') ||
      (searchParams.get('studio') === '1' ? 'studio' : '') ||
      (searchParams.get('bedroomsMin') ? '10plus' : ''),
      bathrooms: searchParams.get('bathrooms') || '',
      minArea: searchParams.get('minArea') || '',
      maxArea: searchParams.get('maxArea') || '',
      balconies: searchParams.get('balconies') || '',
      livingRoom: searchParams.get('livingRoom') || '',
      unfurnished: searchParams.get('unfurnished') === '1' ? 'true' : '',
      semiFurnished: searchParams.get('semiFurnished') === '1' ? 'true' : '',
      fullyFurnished: searchParams.get('fullyFurnished') === '1' ? 'true' : ''
    })
    setSearchTerm(searchParams.get('search') || '')
    setStartDate(searchParams.get('startDate') || '')
    setEndDate(searchParams.get('endDate') || '')
    setPagination(prev => ({
      ...prev,
      current: parseInt(searchParams.get('page')) || 1
    }))
  }, [searchParams])

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()

    if (searchInput) params.set('search', searchInput)
    if (filters.status) params.set('status', filters.status)
    if (filters.propertyType) params.set('propertyType', filters.propertyType)
    if (filters.listingType) params.set('listingType', filters.listingType)
    if (filters.agency) params.set('agency', filters.agency)
    if (filters.city) params.set('city', filters.city)
    if (filters.state) params.set('state', filters.state)
    if (filters.country) params.set('country', filters.country)
    if (filters.area) params.set('area', filters.area)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.bathrooms) params.set('bathrooms', filters.bathrooms)
    if (filters.minArea) params.set('minArea', filters.minArea)
    if (filters.maxArea) params.set('maxArea', filters.maxArea)
    if (filters.balconies) params.set('balconies', filters.balconies)
    if (filters.livingRoom) params.set('livingRoom', filters.livingRoom)
    if (filters.unfurnished) params.set('unfurnished', '1')
    if (filters.semiFurnished) params.set('semiFurnished', '1')
    if (filters.fullyFurnished) params.set('fullyFurnished', '1')
    const bedroomParams = bedroomFilterToQueryParams(filters.bedrooms)
    Object.entries(bedroomParams).forEach(([k, v]) => params.set(k, v))
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (pagination.current > 1) params.set('page', pagination.current.toString())

    const query = params.toString()
    const url = query ? `${pathname}?${query}` : pathname

    const timer = setTimeout(() => {
      if (url !== (pathname + '?' + searchParams.toString())) {
        router.push(url, { scroll: false })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [filters, searchInput, startDate, endDate, pagination.current])

  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timer = setTimeout(() => {
      fetchProperties()
    }, searchTerm.trim() ? 300 : 0)

    return () => clearTimeout(timer)
  }, [
    filters,
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
      if (filters.agency && filters.agency.trim() && isSuperAdmin) {
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
      const bedroomParams = bedroomFilterToQueryParams(filters.bedrooms)
      Object.entries(bedroomParams).forEach(([k, v]) => params.append(k, v))
      if (filters.bathrooms && filters.bathrooms.trim()) {
        params.append('bathrooms', filters.bathrooms.trim())
      }
      if (filters.minArea && filters.minArea.trim()) {
        params.append('minArea', filters.minArea.trim())
      }
      if (filters.maxArea && filters.maxArea.trim()) {
        params.append('maxArea', filters.maxArea.trim())
      }
      if (filters.balconies && filters.balconies.trim()) {
        params.append('balconies', filters.balconies.trim())
      }
      if (filters.livingRoom && filters.livingRoom.trim()) {
        params.append('livingRoom', filters.livingRoom.trim())
      }
      if (filters.unfurnished === 'true') {
        params.append('unfurnished', '1')
      }
      if (filters.semiFurnished === 'true') {
        params.append('semiFurnished', '1')
      }
      if (filters.fullyFurnished === 'true') {
        params.append('fullyFurnished', '1')
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

      setProperties(fetchedProperties.filter(property => checkEntryPermission(property, user, 'view', canViewProperties)))
      if (response.data.pagination) {
        setPagination({
          current: response.data.pagination.page,
          pages: response.data.pagination.pages,
          total: response.data.pagination.total,
          limit: response.data.pagination.limit
        })
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error(error.response?.data?.message || 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const fetchCountries = async () => {
    try {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions')
      const data = await res.json()

      const countries = Array.isArray(data?.data)
        ? data.data
          .map((c) => String(c?.name || '').trim())
          .filter(Boolean)
          .sort()
        : []

      return countries
    } catch (error) {
      console.error('Error fetching countries:', error)
      return []
    }
  }

  useEffect(() => {
    loadCountries()
  }, [])

  const loadCountries = async () => {
    const list = await fetchCountries()
    setCountries(list)
  }

  const countryOptions = useMemo(() => {
    return [{ value: '', label: 'All Countries' }, ...(countries || []).map((c) => ({ value: c, label: c }))]
  }, [countries])

  const stateOptions = useMemo(() => {
    const states = Array.from(new Set([...(geo.states || []), String(filters.state || '').trim()].filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
    return [{ value: '', label: 'All States' }, ...states.map((s) => ({ value: s, label: s }))]
  }, [geo.states, filters.state])

  const cityOptions = useMemo(() => {
    const cities = Array.from(new Set([...(geo.cities || []), String(filters.city || '').trim()].filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
    return [{ value: '', label: 'All Cities' }, ...cities.map((c) => ({ value: c, label: c }))]
  }, [geo.cities, filters.city])

  const fetchStates = async (country) => {
    if (!country) {
      setGeo((prev) => ({ ...prev, states: [], cities: [] }))
      return
    }
    try {
      setGeoLoading((prev) => ({ ...prev, states: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      })
      const data = await res.json()
      const states = Array.isArray(data?.data?.states)
        ? data.data.states.map((s) => String(s?.name || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : []
      setGeo((prev) => ({ ...prev, states, cities: [] }))
    } catch (error) {
      console.error('Error fetching states:', error)
      setGeo((prev) => ({ ...prev, states: [], cities: [] }))
    } finally {
      setGeoLoading((prev) => ({ ...prev, states: false }))
    }
  }

  const fetchCities = async (country, state) => {
    if (!country || !state) {
      setGeo((prev) => ({ ...prev, cities: [] }))
      return
    }
    try {
      setGeoLoading((prev) => ({ ...prev, cities: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state })
      })
      const data = await res.json()
      const cities = Array.isArray(data?.data)
        ? data.data.map((c) => String(c || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : []
      setGeo((prev) => ({ ...prev, cities }))
    } catch (error) {
      console.error('Error fetching cities:', error)
      setGeo((prev) => ({ ...prev, cities: [] }))
    } finally {
      setGeoLoading((prev) => ({ ...prev, cities: false }))
    }
  }

  useEffect(() => {
    if (filters.country) {
      fetchStates(filters.country)
    } else {
      setGeo((prev) => ({ ...prev, states: [], cities: [] }))
    }
  }, [filters.country])

  useEffect(() => {
    if (filters.country && filters.state) {
      fetchCities(filters.country, filters.state)
    } else {
      setGeo((prev) => ({ ...prev, cities: [] }))
    }
  }, [filters.country, filters.state])

  const fetchMetrics = async () => {
    try {
      // Use the optimized dashboard stats endpoint
      const response = await api.get('/stats/dashboard')
      const stats = response.data

      setPropertyMetrics({
        totalProperties: stats.totalProperties || 0,
        activeProperties: stats.activeProperties || 0,
        soldProperties: stats.soldProperties || 0,
        rentedProperties: stats.rentedProperties || 0,
        pendingProperties: stats.pendingProperties || 0,
      })

      // Also update unique locations if available in this call
      if (stats.uniqueLocations) {
        setUniqueLocations(stats.uniqueLocations)
      }
    } catch (error) {
      console.error('Error fetching property metrics:', error)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Property',
      message: 'Are you sure you want to delete this property?',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) return

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
    const formatted = formatPropertyPrice(price)
    return formatted === 'Price on request' ? 'N/A' : formatted
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
    // This is now handled in fetchMetrics via stats/dashboard
    // But keeping it as a wrapper for consistency or if separate updates are needed
    if (!uniqueLocations.cities.length) {
      fetchMetrics()
    }
  }

  const getPropertyId = (property) => {
    if (!property) return ''
    if (typeof property._id === 'string') return property._id
    if (property._id?.toString) return property._id.toString()
    if (property._id?.$oid) return property._id.$oid
    return String(property._id || property.id || '')
  }

  // Show loading or redirect if not authorized
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !['super_admin', 'agency_admin', 'agent', 'staff'].includes(user.role)) {
    return null // Router will handle redirect
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Property Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        </div>

        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isSuperAdmin ? 'Manage all properties across all agencies' :
                isAgencyAdmin ? 'Manage your agency properties' :
                  isAgent ? 'Manage your assigned properties' :
                    'View properties'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search properties by any field..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-80"
              />
            </div>
            {canCreateProperty && (
              <Link href="/admin/properties/add" className="btn btn-primary">
                <Plus className="h-5 w-5 mr-2" />
                Add Property
              </Link>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status Filter - Direct Dropdown */}
          <SearchableSelect
            value={filters.status}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, status: e.target.value }))
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
            options={PROPERTY_STATUS_FILTER_OPTIONS}
            placeholder="All Status"
            searchable={false}
            buttonClassName={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white min-w-[160px] ${filters.status ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
              }`}
          />

          {/* Property Type Filter - Direct Dropdown */}
          <div className="relative min-w-[150px]">
            <SearchableSelect
              value={filters.propertyType}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, propertyType: e.target.value }))
                setPagination(prev => ({ ...prev, current: 1 }))
              }}
              options={[
                { value: '', label: 'All Types' },
                { value: 'apartment', label: 'Apartment' },
                { value: 'house', label: 'House' },
                { value: 'villa', label: 'Villa' },
                { value: 'condo', label: 'Condo' },
                { value: 'townhouse', label: 'Townhouse' },
                { value: 'land', label: 'Land' },
                { value: 'commercial', label: 'Commercial' },
                { value: 'office', label: 'Office' },
                { value: 'retail', label: 'Retail' },
                { value: 'warehouse', label: 'Warehouse' },
                { value: 'off_plan', label: 'Off Plan' },
                { value: 'ready_to_move', label: 'Ready to Move' },
                { value: 'under_construction', label: 'Under Construction' },
                { value: 'other', label: 'Other' }
              ]}
              placeholder="All Types"
              buttonClassName={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white min-w-[170px] ${filters.propertyType ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
                }`}
              searchPlaceholder="Search type..."
            />
          </div>

          {/* Price Filter Button */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium flex items-center gap-2 ${filters.minPrice || filters.maxPrice ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
                }`}
            >
              <DollarSign className="h-4 w-4" />
              Price Range
              {(filters.minPrice || filters.maxPrice) && (
                <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                  {filters.minPrice && filters.maxPrice ? `${Number(filters.minPrice).toLocaleString()}-${Number(filters.maxPrice).toLocaleString()}` : filters.minPrice ? `${Number(filters.minPrice).toLocaleString()}+` : `Up to ${Number(filters.maxPrice).toLocaleString()}`}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'price' ? 'rotate-180' : ''}`} />
            </button>
            {openFilter === 'price' && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[300px]">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 text-sm">Price Range</h3>
                    {(filters.minPrice || filters.maxPrice) && (
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear Range
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-900 mb-1">Min Price</label>
                        <input
                          type="number"
                          value={filters.minPrice}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, minPrice: e.target.value }))
                            setPagination(prev => ({ ...prev, current: 1 }))
                          }}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-900 mb-1">Max Price</label>
                        <input
                          type="number"
                          value={filters.maxPrice}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, maxPrice: e.target.value }))
                            setPagination(prev => ({ ...prev, current: 1 }))
                          }}
                          placeholder="Any"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => setOpenFilter(null)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
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
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium flex items-center gap-2 ${filters.bedrooms || filters.bathrooms || filters.minArea || filters.maxArea || filters.balconies || filters.livingRoom || filters.unfurnished || filters.semiFurnished || filters.fullyFurnished ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
                }`}
            >
              <Bed className="h-4 w-4" />
              Specification
              {(filters.bedrooms || filters.bathrooms || filters.minArea || filters.maxArea || filters.balconies || filters.livingRoom || filters.unfurnished || filters.semiFurnished || filters.fullyFurnished) && (
                <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs">
                  {[
                    filters.bedrooms && (filters.bedrooms === 'studio' ? 'Studio' : filters.bedrooms === '10plus' ? '10+' : `${filters.bedrooms}BR`),
                    filters.bathrooms && `${filters.bathrooms}BA`,
                    filters.balconies && `${filters.balconies} Balc`,
                    filters.livingRoom && `${filters.livingRoom} LR`,
                    filters.unfurnished && 'Unfurn',
                    filters.semiFurnished && 'Semi',
                    filters.fullyFurnished && 'Full'
                  ].filter(Boolean).join(', ')}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'specification' ? 'rotate-180' : ''}`} />
            </button>
            {openFilter === 'specification' && (
              // <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[300px]">
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-[340px] overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-gray-900">Specifications</h3>
                      {(filters.bedrooms || filters.bathrooms || filters.minArea || filters.maxArea || filters.balconies || filters.livingRoom || filters.unfurnished || filters.semiFurnished || filters.fullyFurnished) && (
                        <button
                          onClick={() => {
                            setFilters(prev => ({ ...prev, bedrooms: '', bathrooms: '', minArea: '', maxArea: '', balconies: '', livingRoom: '', unfurnished: '', semiFurnished: '', fullyFurnished: '' }))
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
                        <label className="block text-sm font-bold text-gray-900 mb-1">Bedrooms</label>
                        <SearchableSelect
                          value={filters.bedrooms}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, bedrooms: e.target.value }))
                            setPagination(prev => ({ ...prev, current: 1 }))
                          }}
                          options={BEDROOM_FILTER_OPTIONS}
                          placeholder="Any"
                          buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                          searchPlaceholder="Search..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Bathrooms</label>
                        <SearchableSelect
                          value={filters.bathrooms}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, bathrooms: e.target.value }))
                            setPagination(prev => ({ ...prev, current: 1 }))
                          }}
                          options={[
                            { value: '', label: 'Any' },
                            { value: '1', label: '1' },
                            { value: '2', label: '2' },
                            { value: '3', label: '3' },
                            { value: '4', label: '4' },
                            { value: '5', label: '5' }
                          ]}
                          placeholder="Any"
                          buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                          searchPlaceholder="Search..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Min Area (sqft)</label>
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
                        <label className="block text-sm font-bold text-gray-900 mb-1">Max Area (sqft)</label>
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
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Balconies</label>
                        <input
                          type="number"
                          min="0"
                          value={filters.balconies}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, balconies: e.target.value }))
                            setPagination(prev => ({ ...prev, current: 1 }))
                          }}
                          placeholder="Min balconies"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Living Room</label>
                        <input
                          type="number"
                          min="0"
                          value={filters.livingRoom}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, livingRoom: e.target.value }))
                            setPagination(prev => ({ ...prev, current: 1 }))
                          }}
                          placeholder="Min living rooms"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                      </div>
                      <div className="space-y-2 pt-2">
                        <label className="block text-sm font-bold text-gray-900">Furnishing</label>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={filters.unfurnished === 'true'}
                              onChange={(e) => {
                                setFilters(prev => ({ ...prev, unfurnished: e.target.checked ? 'true' : '' }))
                                setPagination(prev => ({ ...prev, current: 1 }))
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            Unfurnished
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={filters.semiFurnished === 'true'}
                              onChange={(e) => {
                                setFilters(prev => ({ ...prev, semiFurnished: e.target.checked ? 'true' : '' }))
                                setPagination(prev => ({ ...prev, current: 1 }))
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            Semi-Furnished
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={filters.fullyFurnished === 'true'}
                              onChange={(e) => {
                                setFilters(prev => ({ ...prev, fullyFurnished: e.target.checked ? 'true' : '' }))
                                setPagination(prev => ({ ...prev, current: 1 }))
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            Fully Furnished
                          </label>
                        </div>
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
              </div>
            )}
          </div>

          {/* Country Filter Button */}
          <div className="relative">
            <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10" />

            <SearchableSelect
              value={filters.country} 
              onChange={(e) => {
                const country = e.target.value
                setFilters(prev => ({ ...prev, country, state: '', city: '' }))
                setPagination(prev => ({ ...prev, current: 1 }))
              }}
              options={countryOptions}
              placeholder="Country"
              searchable={true}
              searchPlaceholder="Search country..."
              buttonClassName={`pl-10 pr-4 py-2 border rounded-lg text-sm font-medium min-w-[200px] flex items-center gap-2 ${filters.country
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300'
                }`}
            />
          </div>

          {/* State Filter */}
          <div className="relative">
            <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10" />
            <SearchableSelect
              value={filters.state}
              onChange={(e) => {
                const state = e.target.value
                setFilters(prev => ({ ...prev, state, city: '' }))
                setPagination(prev => ({ ...prev, current: 1 }))
              }}
              options={stateOptions}
              placeholder="State"
              searchable
              searchPlaceholder="Search state..."
              buttonClassName={`pl-10 pr-4 py-2 border rounded-lg text-sm font-medium min-w-[160px] ${filters.state
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300'
                }`}
              disabled={!filters.country || geoLoading.states}
            />
          </div>

          {/* Area Filter Button */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'area' ? null : 'area')}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium flex items-center gap-2 ${filters.area ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
                }`}
            >
              <TrendingUp className="h-4 w-4" />
              Area
              {filters.area && (
                <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs max-w-[100px] truncate">
                  {filters.area}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'area' ? 'rotate-180' : ''}`} />
            </button>
            {openFilter === 'area' && (
              <div className="absolute top-full right-0 left-auto mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px] max-w-[min(320px,calc(100vw-2rem))] w-max">
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, area: '' }))
                        setPagination(prev => ({ ...prev, current: 1 }))
                        setOpenFilter(null)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!filters.area ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                    >
                      All Areas
                    </button>
                    {uniqueLocations.areas.map((area) => (
                      <button
                        key={area}
                        onClick={() => {
                          setFilters(prev => ({ ...prev, area }))
                          setPagination(prev => ({ ...prev, current: 1 }))
                          setOpenFilter(null)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${filters.area === area ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50'}`}
                      >
                        {area}
                      </button>
                    ))}
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <input
                        type="text"
                        placeholder="Or type area..."
                        className="w-full px-3 py-1.5 border rounded text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setFilters(prev => ({ ...prev, area: e.target.value }))
                            setOpenFilter(null)
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* City Filter */}
          <div className="relative">
            <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10" />
            <SearchableSelect
              value={filters.city}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, city: e.target.value }))
                setPagination(prev => ({ ...prev, current: 1 }))
              }}
              options={cityOptions}
              placeholder="City"
              searchable
              searchPlaceholder="Search city..."
              buttonClassName={`pl-10 pr-4 py-2 border rounded-lg text-sm font-medium min-w-[160px] ${filters.city
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300'
                }`}
              disabled={!filters.country || !filters.state || geoLoading.cities}
            />
          </div>

          {/* Agency Filter - Only for Super Admin */}
          {isSuperAdmin && (
            <SearchableSelect
              value={filters.agency}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, agency: e.target.value }))
                setPagination(prev => ({ ...prev, current: 1 }))
              }}
              options={[
                { value: '', label: 'All Agencies' },
                { value: '', label: 'All Agencies' },
                { value: 'unassigned', label: 'No agency' },
                ...buildAgencySelectOptions(agencies, { includeNone: false })
              ]}
              placeholder="All Agencies"
              buttonClassName={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white min-w-[180px] ${filters.agency ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'
                }`}
              searchPlaceholder="Search agency..."
            />
          )}

          {/* Date Range Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium flex items-center gap-2 ${startDate || endDate
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
                      <label className="block text-sm font-bold text-gray-900 mb-2">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        max={new Date().toISOString().split('T')[0]}
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
                      <label className="block text-sm font-bold text-gray-900 mb-2">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value)
                          setPagination(prev => ({ ...prev, current: 1 }))
                        }}
                        min={startDate || undefined}
                        max={new Date().toISOString().split('T')[0]}
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
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <colgroup>
                  <col className="w-20" />
                  <col className="w-[44%]" />
                  <col className="w-[20%]" />
                  <col className="w-36" />
                  <col className="w-28" />
                </colgroup>
                <thead className="bg-gradient-to-r from-primary-600 to-primary-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.map((property) => {
                    const propertyId = getPropertyId(property)
                    return (
                      <tr key={propertyId} className="hover:bg-logo-beige transition-colors">
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setDetailsProperty(property)}
                            className="block focus:outline-none"
                            title="View details"
                          >
                            <MediaImage
                              src={
                                property.images?.[0]
                                  ? typeof property.images[0] === 'string'
                                    ? property.images[0]
                                    : property.images[0]?.url || property.images[0]
                                  : ''
                              }
                              alt={property.title}
                              className="h-14 w-14 rounded-lg"
                              fallbackClassName="h-14 w-14 rounded-lg"
                            />
                          </button>
                        </td>
                        <td className="px-4 py-4 min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailsProperty(property)}
                            className="text-left w-full focus:outline-none"
                            title="View details"
                          >
                            <div className="text-sm font-semibold text-gray-900 hover:text-primary-700 truncate">
                              {property.title}
                            </div>
                            <div className="text-xs text-gray-500 capitalize truncate">
                              {[property.propertyType, property.agency?.name].filter(Boolean).join(' · ')}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-4 min-w-0">
                          <div className="text-sm font-semibold text-primary-600 truncate">
                            {formatPrice(property.price)}
                          </div>
                          <div className="text-xs text-gray-500 capitalize truncate">
                            {property.listingType || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${property.status === 'active' ? 'text-green-800 bg-green-50' :
                              property.status === 'booked' ? 'text-orange-800 bg-orange-50' :
                                property.status === 'sold' ? 'text-blue-800 bg-blue-50' :
                                  property.status === 'rented' ? 'text-purple-800 bg-purple-50' :
                                    property.status === 'pending' ? 'text-yellow-800 bg-yellow-50' :
                                      'text-gray-800 bg-gray-50'}`}
                          >
                            {property.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-sm font-medium">
                          <div className="flex items-center justify-center gap-2">
                            {checkEntryPermission(property, user, 'view', canViewProperties) && (
                              <Link
                                href={`/admin/properties/${propertyId}`}
                                className="text-primary-600 hover:text-primary-900 transition-colors"
                                title="Open page"
                              >
                                <Eye className="h-5 w-5" />
                              </Link>
                            )}
                            {checkEntryPermission(property, user, 'edit', canEditProperty) && (
                              <Link
                                href={`/admin/properties/${propertyId}/edit`}
                                className="text-primary-600 hover:text-primary-900 transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-5 w-5" />
                              </Link>
                            )}
                            {canDeleteProperty && (
                              <button
                                onClick={() => handleDelete(propertyId)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPermissionModalEntry(property)
                                }}
                                className="text-amber-600 hover:text-amber-900 transition-colors"
                                title="Set Custom Permissions"
                              >
                                <ShieldCheck className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
                              className={`px-3 py-2 border rounded-lg text-sm font-medium min-w-[40px] ${pagination.current === pageNum
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

      <EntryPermissionModal
        isOpen={!!permissionModalEntry}
        onClose={() => setPermissionModalEntry(null)}
        entry={permissionModalEntry}
        entryType="properties"
        onSuccess={fetchProperties}
      />

      <DetailsModal
        isOpen={!!detailsProperty}
        onClose={() => setDetailsProperty(null)}
        title={detailsProperty?.title || 'Property'}
        subtitle={[detailsProperty?.propertyType, detailsProperty?.listingType].filter(Boolean).join(' · ')}
        avatar={
          detailsProperty ? (
            <MediaImage
              src={
                detailsProperty.images?.[0]
                  ? typeof detailsProperty.images[0] === 'string'
                    ? detailsProperty.images[0]
                    : detailsProperty.images[0]?.url || detailsProperty.images[0]
                  : ''
              }
              alt={detailsProperty.title}
              className="h-14 w-14 rounded-lg"
              fallbackClassName="h-14 w-14 rounded-lg"
            />
          ) : null
        }
        sections={detailsProperty ? [
          {
            title: 'Overview',
            items: [
              { label: 'Price', value: <span className="font-semibold text-primary-600">{formatPrice(detailsProperty.price)}</span> },
              { label: 'Listing type', value: detailsProperty.listingType ? <span className="capitalize">{detailsProperty.listingType}</span> : null },
              { label: 'Property type', value: detailsProperty.propertyType ? <span className="capitalize">{detailsProperty.propertyType}</span> : null },
              { label: 'Status', value: detailsProperty.status ? <span className="capitalize">{detailsProperty.status}</span> : null },
            ],
          },
          {
            title: 'Location',
            items: [
              { label: 'City', value: detailsProperty.location?.city },
              { label: 'State', value: detailsProperty.location?.state },
              { label: 'Country', value: detailsProperty.location?.country },
              { label: 'Area', value: detailsProperty.location?.area },
            ],
          },
          {
            title: 'Specifications',
            items: [
              {
                label: 'Bedrooms',
                value: formatBedroomLabel(detailsProperty.specifications) || detailsProperty.specifications?.bedrooms || null
              },
              { label: 'Bathrooms', value: detailsProperty.specifications?.bathrooms ?? 0 },
              {
                label: 'Area',
                value: detailsProperty.specifications?.area?.value
                  ? `${detailsProperty.specifications.area.value} ${detailsProperty.specifications.area.unit || 'sqft'}`
                  : null,
              },
              { label: 'Balconies', value: detailsProperty.specifications?.balconies },
            ],
          },
          {
            title: 'Ownership',
            items: [
              { label: 'Agency', value: detailsProperty.agency?.name || 'No Agency' },
              {
                label: 'Agent',
                value: detailsProperty.agent
                  ? `${detailsProperty.agent.firstName || ''} ${detailsProperty.agent.lastName || ''}`.trim()
                  : null,
              },
            ],
          },
        ] : []}
        actions={detailsProperty ? (
          <>
            {checkEntryPermission(detailsProperty, user, 'view', canViewProperties) && (
              <Link
                href={`/admin/properties/${getPropertyId(detailsProperty)}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Open page
              </Link>
            )}
            {checkEntryPermission(detailsProperty, user, 'edit', canEditProperty) && (
              <Link
                href={`/admin/properties/${getPropertyId(detailsProperty)}/edit`}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Edit
              </Link>
            )}
            <button
              type="button"
              onClick={() => setDetailsProperty(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </>
        ) : null}
      />
      <ConfirmDialog />
    </DashboardLayout>
  )
}

