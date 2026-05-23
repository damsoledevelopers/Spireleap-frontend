'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Upload, X, MapPin, Building, User, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SearchableSelect from '@/components/Common/SearchableSelect'
import {
  buildAgencySelectOptions,
  buildAgentSelectOptions,
  agencyValueForSubmit,
  agentValueForSubmit,
  agencyValueForSelect,
  agentValueForSelect,
  NONE_AGENCY_VALUE,
  NONE_AGENT_VALUE,
  agencyAgentFieldsAfterAgencyChange,
  selectValueForAgency,
  selectValueForAgent
} from '@/lib/agencyAgentOptions'
import {
  sanitizePostalDigits,
  isValidOptionalPostalDigits,
  OPTIONAL_POSTAL_DIGITS_MESSAGE
} from '@/lib/postalCode'
import {
  PROPERTY_STATUS_FORM_OPTIONS_SUPER,
  PROPERTY_STATUS_FORM_OPTIONS_AGENCY,
  BEDROOM_SELECT_OPTIONS,
  bedroomSelectToSpecs,
  specsToBedroomSelect,
  COMPLETION_STATUS_FORM_OPTIONS
} from '@/lib/propertyOptions'
import { fetchPropertyTypeOptions } from '@/lib/propertyTypesApi'

const GoogleMapPicker = dynamic(() => import('../../../../../components/GoogleMapPicker'), { ssr: false })

export default function AdminEditPropertyPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [agencies, setAgencies] = useState([])
  const [agents, setAgents] = useState([])
  const [propertyTypeOptions, setPropertyTypeOptions] = useState([])
  const sanitizeAlphaText = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
  const sanitizeDigits = (v, maxLen) => {
    const s = String(v ?? '').replace(/\D/g, '')
    return typeof maxLen === 'number' ? s.slice(0, maxLen) : s
  }
  const sanitizeDecimal = (v) => {
    const s = String(v ?? '').replace(/[^\d.]/g, '')
    const firstDot = s.indexOf('.')
    if (firstDot === -1) return s
    return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }
  const [formData, setFormData] = useState({
    location: { country: '', state: '', city: '' },
  })

  const [geo, setGeo] = useState({
    countries: [],
    states: [],
    cities: []
  })

  const [geoLoading, setGeoLoading] = useState({
    countries: false,
    states: false,
    cities: false
  })

  useEffect(() => {
    if (!authLoading && user) {
      fetchInitialData()
    }
  }, [user, authLoading, params.id])

  useEffect(() => {
    if (formData?.agency && formData.agency !== NONE_AGENCY_VALUE) {
      fetchAgentsByAgency(formData.agency)
    } else {
      fetchAllAgents()
    }
  }, [formData?.agency])

  // Fetch all countries on mount
  useEffect(() => {
    fetchCountries()
  }, [])

  const fetchCountries = async () => {
    try {
      setGeoLoading(prev => ({ ...prev, countries: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions')
      const data = await res.json()
      const countries = Array.isArray(data?.data)
        ? data.data.map(c => c?.name).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : []
      setGeo(prev => ({ ...prev, countries }))
    } catch (error) {
      console.error('Error fetching countries:', error)
      setGeo(prev => ({ ...prev, countries: [] }))
    } finally {
      setGeoLoading(prev => ({ ...prev, countries: false }))
    }
  }

  // Fetch states whenever country changes
  useEffect(() => {
    if (formData?.location?.country) {
      fetchStates(formData.location.country)
    } else {
      setGeo(prev => ({ ...prev, states: [], cities: [] }))
    }
  }, [formData?.location?.country])

  const fetchStates = async (country) => {
    if (!country) {
      setGeo(prev => ({ ...prev, states: [], cities: [] }))
      setFormData(prev => ({ ...prev, location: { ...prev.location, state: '', city: '' } }))
      return
    }
    try {
      setGeoLoading(prev => ({ ...prev, states: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      })
      const data = await res.json()
      const states = Array.isArray(data?.data?.states)
        ? data.data.states.map(s => s?.name).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : []
      setGeo(prev => ({ ...prev, states, cities: [] }))
    } catch (error) {
      console.error('Error fetching states:', error)
      setGeo(prev => ({ ...prev, states: [], cities: [] }))
    } finally {
      setGeoLoading(prev => ({ ...prev, states: false }))
    }
  }

  // Fetch cities whenever state changes
  useEffect(() => {
    if (formData?.location?.country && formData?.location?.state) {
      fetchCities(formData.location.country, formData.location.state)
    } else {
      setGeo(prev => ({ ...prev, cities: [] }))
    }
  }, [formData?.location?.country, formData?.location?.state])

  const fetchCities = async (country, state) => {
    if (!country || !state) {
      setGeo(prev => ({ ...prev, cities: [] }))
      setFormData(prev => ({ ...prev, location: { ...prev.location, city: '' } }))
      return
    }
    try {
      setGeoLoading(prev => ({ ...prev, cities: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state })
      })
      const data = await res.json()
      const cities = Array.isArray(data?.data)
        ? data.data.map((c) => String(c || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : []
      setGeo(prev => ({ ...prev, cities }))
    } catch (error) {
      console.error('Error fetching cities:', error)
      setGeo(prev => ({ ...prev, cities: [] }))
    } finally {
      setGeoLoading(prev => ({ ...prev, cities: false }))
    }
  }

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [propertyRes, categoriesRes, amenitiesRes, agenciesRes] = await Promise.all([
        api.get(`/properties/${params.id}`),
        api.get('/settings/categories'),
        api.get('/settings/amenities'),
        api.get('/agencies')
      ])

      const property = propertyRes.data.property
      const typeOptions = await fetchPropertyTypeOptions(api)
      setPropertyTypeOptions(typeOptions)
      setCategories(categoriesRes.data.categories || [])
      setAmenities(amenitiesRes.data.amenities || [])
      setAgencies(agenciesRes.data.agencies || [])

      let propertyType = property.propertyType || 'apartment'
      let completionStatus = property.completionStatus || ''
      if (['off_plan', 'ready_to_move', 'under_construction'].includes(propertyType)) {
        completionStatus = propertyType
        propertyType = 'other'
      }

      // Format property data for form
      setFormData({
        bedroomSelect: specsToBedroomSelect(property.specifications),
        title: property.title || '',
        description: property.description || '',
        propertyType,
        completionStatus,
        listingType: property.listingType || 'sale',
        agency: agencyValueForSelect(property.agency),
        agent: agentValueForSelect(property.agent),
        price: {
          sale: property.price?.sale || '',
          rent: {
            amount: property.price?.rent?.amount || '',
            period: property.price?.rent?.period || 'monthly'
          },
          currency: 'AED'
        },
        location: {
          address: property.location?.address || '',
          city: property.location?.city || '',
          state: property.location?.state || '',
          country: property.location?.country || '',
          zipCode: property.location?.zipCode || '',
          coordinates: {
            lat: property.location?.coordinates?.lat || 0,
            lng: property.location?.coordinates?.lng || 0
          },
          neighborhood: property.location?.neighborhood || '',
          landmark: property.location?.landmark || ''
        },
        specifications: {
          isStudio: !!property.specifications?.isStudio,
          bedrooms: property.specifications?.bedrooms || '',
          bathrooms: property.specifications?.bathrooms || '',
          balconies: property.specifications?.balconies || '',
          livingRoom: property.specifications?.livingRoom || '',
          unfurnished: property.specifications?.unfurnished || 0,
          semiFurnished: property.specifications?.semiFurnished || 0,
          fullyFurnished: property.specifications?.fullyFurnished || 0,
          area: {
            value: property.specifications?.area?.value || '',
            unit: property.specifications?.area?.unit || 'sqft'
          },
          parking: property.specifications?.parking || '',
          floors: property.specifications?.floors || '',
          yearBuilt: property.specifications?.yearBuilt || '',
          lotSize: {
            value: property.specifications?.lotSize?.value || '',
            unit: property.specifications?.lotSize?.unit || 'sqft'
          }
        },
        category: property.category?._id || '',
        amenities: property.amenities?.map(a => a._id || a) || [],
        images: property.images || [],
        videos: property.videos || [],
        virtualTour: property.virtualTour || { url: '', type: '3d' },
        tags: property.tags || [],
        featured: property.featured || false,
        trending: property.trending || false,
        status: user?.role === 'agent' ? 'pending' : (property.status || 'active'),
        seo: property.seo || {
          metaTitle: '',
          metaDescription: '',
          keywords: []
        }
      })

      // Creator-based permission check
      if (user?.role === 'super_admin') {
        if (property.creatorRole === 'agent' || property.creatorRole === 'agency_admin') {
          toast.error('Access denied. You cannot edit properties created by agents or agencies.')
          router.push('/admin/properties')
          return
        }
      } else if (user?.role === 'agency_admin') {
        if (property.creatorRole === 'agent') {
          toast.error('Access denied. You cannot edit properties created by agents.')
          router.push('/admin/properties')
          return
        }
      } else if (user?.role === 'agent') {
        const propertyAgentId = property.agent?._id || property.agent
        if (propertyAgentId !== user?._id) {
          toast.error('Access denied. You can only edit your own properties.')
          router.push('/admin/properties')
          return
        }
      }

      if (property.agency?._id || property.agency) {
        await fetchAgentsByAgency(property.agency?._id || property.agency)
      } else {
        await fetchAllAgents()
      }
      if (property.agent && typeof property.agent === 'object') {
        const agentId = property.agent._id
        setAgents((prev) => {
          const exists = prev.some((a) => String(a._id) === String(agentId))
          return exists ? prev : [...prev, property.agent]
        })
      }
    } catch (error) {
      console.error('Error fetching property:', error)
      toast.error('Failed to load property')
      router.push('/admin/properties')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgentsByAgency = async (agencyId) => {
    try {
      const response = await api.get(`/users?role=agent&agency=${agencyId}`)
      setAgents(response.data.users || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([])
    }
  }

  const fetchAllAgents = async () => {
    try {
      const response = await api.get('/users?role=agent')
      setAgents(response.data.users || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([])
    }
  }

  const handleInputChange = (field, value) => {
    const keys = field.split('.')
    if (keys.length === 1) {
      setFormData((prev) => ({ ...prev, [field]: value }))
    } else if (keys.length === 2) {
      setFormData((prev) => ({
        ...prev,
        [keys[0]]: { ...prev[keys[0]], [keys[1]]: value }
      }))
    } else if (keys.length === 3) {
      setFormData((prev) => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: {
            ...prev[keys[0]][keys[1]],
            [keys[2]]: value
          }
        }
      }))
    }
  }

  const handleCountryChange = (country) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        country,
        state: '',
        city: ''
      }
    }))
    setGeo((prev) => ({ ...prev, states: [], cities: [] }))
  }

  const handleStateChange = (state) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        state,
        city: ''
      }
    }))
    setGeo((prev) => ({ ...prev, cities: [] }))
  }

  const stateOptions = useMemo(() => {
    const current = String(formData.location?.state || '').trim()
    return Array.from(new Set([...(geo.states || []), current].filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [geo.states, formData.location?.state])

  const cityOptions = useMemo(() => {
    const current = String(formData.location?.city || '').trim()
    return Array.from(new Set([...(geo.cities || []), current].filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [geo.cities, formData.location?.city])

  const renderSpecificationStepper = (label, field, value, maxLen = 2, placeholder = 'Add', min = 0, max) => {
    const numericValue = parseInt(value, 10)
    const current = Number.isNaN(numericValue) ? null : numericValue
    const maxValue = typeof max === 'number' ? max : (10 ** maxLen) - 1
    const isDecrementDisabled = current === null || current <= min
    const isIncrementDisabled = current !== null && current >= maxValue

    const clampValue = (next) => {
      if (next <= min) {
        handleInputChange(field, min === 0 ? '' : String(min))
        return
      }
      const clamped = Math.min(next, maxValue)
      handleInputChange(field, sanitizeDigits(String(clamped), maxLen))
    }

    return (
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-1">{label}</label>
        <div className="relative w-full">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => handleInputChange(field, sanitizeDigits(e.target.value, maxLen))}
            className="w-full h-[42px] pr-10 pl-3 py-2 border border-gray-300 rounded-xl shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 hover:border-gray-400"
            placeholder={placeholder}
            aria-label={label}
          />
          <div className="absolute inset-y-0 right-0 flex w-9 flex-col overflow-hidden rounded-r-xl border-l border-gray-200">
            <button
              type="button"
              onClick={() => clampValue((current ?? min) + 1)}
              disabled={isIncrementDisabled}
              className="flex-1 inline-flex items-center justify-center text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
              aria-label={`Increase ${label}`}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => clampValue((current ?? min) - 1)}
              disabled={isDecrementDisabled}
              className="flex-1 inline-flex items-center justify-center border-t border-gray-200 text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
              aria-label={`Decrease ${label}`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      files.forEach(file => {
        uploadFormData.append('images', file)
      })

      const response = await api.post('/upload/property-images', uploadFormData)

      if (!response.data || !response.data.files) {
        throw new Error('Invalid response from server')
      }

      const newImages = response.data.files.map((file, index) => ({
        url: file.url,
        alt: file.originalName || `Image ${index + 1}`,
        isPrimary: formData.images.length === 0 && index === 0,
        order: formData.images.length + index
      }))

      setFormData({
        ...formData,
        images: [...formData.images, ...newImages]
      })
      toast.success(`Successfully uploaded ${newImages.length} image(s)`)
    } catch (error) {
      console.error('Error uploading images:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload images'
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    })
  }

  const setPrimaryImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    })
  }

  const handleLocationSelect = (lat, lng, address) => {
    setFormData({
      ...formData,
      location: {
        ...formData.location,
        coordinates: { lat, lng },
        address: address || formData.location.address
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!isValidOptionalPostalDigits(formData.location?.zipCode)) {
        toast.error(OPTIONAL_POSTAL_DIGITS_MESSAGE)
        setSaving(false)
        return
      }

      const submitData = {
        ...formData,
        location: {
          ...formData.location,
          address: String(formData.location?.address || '').trim(),
          city: String(formData.location?.city || '').trim(),
          state: String(formData.location?.state || '').trim(),
          country: String(formData.location?.country || '').trim(),
          zipCode: String(formData.location?.zipCode || '').trim(),
        },
        price: {
          sale: formData.price.sale ? parseFloat(formData.price.sale) : undefined,
          rent: formData.price.rent.amount ? {
            amount: parseFloat(formData.price.rent.amount),
            period: formData.price.rent.period
          } : undefined,
          currency: 'AED'
        },
        agency: agencyValueForSubmit(formData.agency),
        agent: agentValueForSubmit(formData.agent),
        specifications: {
          ...formData.specifications,
          bathrooms: formData.specifications.bathrooms ? parseInt(formData.specifications.bathrooms, 10) : undefined,
          balconies: parseInt(formData.specifications.balconies, 10) || 0,
          livingRoom: parseInt(formData.specifications.livingRoom, 10) || 0,
          ...bedroomSelectToSpecs(formData.bedroomSelect),
          unfurnished: parseInt(formData.specifications.unfurnished, 10) || 0,
          semiFurnished: parseInt(formData.specifications.semiFurnished, 10) || 0,
          fullyFurnished: parseInt(formData.specifications.fullyFurnished, 10) || 0,
          ...(formData.specifications.area.value !== '' && formData.specifications.area.value != null
            ? {
              area: {
                value: parseFloat(formData.specifications.area.value),
                unit: formData.specifications.area.unit
              }
            }
            : {}),
          parking: parseInt(formData.specifications.parking, 10) || 0,
          floors: parseInt(formData.specifications.floors, 10) || 1,
          yearBuilt: formData.specifications.yearBuilt ? parseInt(formData.specifications.yearBuilt, 10) : undefined,
          lotSize: formData.specifications.lotSize.value ? {
            value: parseFloat(formData.specifications.lotSize.value),
            unit: formData.specifications.lotSize.unit
          } : undefined
        },
        category: formData.category || undefined,
        amenities: formData.amenities,
        tags: formData.tags.filter(t => t.trim()),
        virtualTour: formData.virtualTour.url ? formData.virtualTour : undefined,
        videos: formData.videos.filter(v => v.url)
      }

      delete submitData.bedroomSelect
      if (!submitData.completionStatus) delete submitData.completionStatus
      if (submitData.category === '' || submitData.category == null) delete submitData.category

      if (
        submitData.specifications?.area &&
        (submitData.specifications.area.value === undefined ||
          submitData.specifications.area.value === null ||
          Number.isNaN(submitData.specifications.area.value))
      ) {
        delete submitData.specifications.area
      }

      await api.put(`/properties/${params.id}`, submitData)
      toast.success('Property updated successfully!')
      router.push('/admin/properties')
    } catch (error) {
      console.error('Error updating property:', error)
      toast.error(error.response?.data?.message || 'Failed to update property')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading || !formData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !['super_admin', 'agency_admin', 'agent'].includes(user.role)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600">You don't have permission to view this page</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getImageUrl = (image) => {
    if (typeof image === 'string') return image
    return image?.url || image
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/properties" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
              <p className="mt-1 text-sm text-gray-500">Update property information</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Agency & Agent Selection */}
          {user?.role !== 'agent' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-primary-600" />
                Agency & Agent Assignment
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Agency</label>
                  <SearchableSelect
                    value={selectValueForAgency(formData.agency)}
                    onChange={(e) => {
                      const v = e.target.value
                      setFormData((prev) => ({ ...prev, ...agencyAgentFieldsAfterAgencyChange(prev, v) }))
                    }}
                    disabled={user?.role !== 'super_admin'}
                    options={buildAgencySelectOptions(agencies, { includeNone: user?.role === 'super_admin' })}
                    placeholder="Select Agency"
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                    searchPlaceholder="Search agency..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Agent</label>
                  <SearchableSelect
                    value={selectValueForAgent(formData.agent)}
                    onChange={(e) => handleInputChange('agent', e.target.value)}
                    disabled={user?.role === 'agent'}
                    options={buildAgentSelectOptions(agents, { includeNone: true })}
                    placeholder="Select Agent (optional)"
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                    searchPlaceholder="Search agent..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Title<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Property Type<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                <SearchableSelect
                  required
                  value={formData.propertyType}
                  onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  options={propertyTypeOptions}
                  placeholder="Select property type"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search type..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Completion Status</label>
                <SearchableSelect
                  value={formData.completionStatus || ''}
                  onChange={(e) => handleInputChange('completionStatus', e.target.value)}
                  options={COMPLETION_STATUS_FORM_OPTIONS}
                  placeholder="Select completion status"
                  searchable={false}
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Listing Type<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                <SearchableSelect
                  required
                  value={formData.listingType}
                  onChange={(e) => handleInputChange('listingType', e.target.value)}
                  options={[
                    { value: 'sale', label: 'For Sale' },
                    { value: 'rent', label: 'For Rent' }
                  ]}
                  placeholder="Select listing type"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Status<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                <SearchableSelect
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={user?.role === 'agent'}
                  options={(user?.role === 'super_admin' || user?.role === 'agency_admin')
                    ? PROPERTY_STATUS_FORM_OPTIONS_SUPER
                    : [{ value: 'pending', label: 'Pending Agency Approval' }]}
                  placeholder="Select status"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                  searchPlaceholder="Search status..."
                />
                {user?.role === 'agent' && (
                  <p className="mt-1 text-xs text-gray-500">Any edits will require re-approval from the agency.</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-900 mb-1">Description<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Describe the property..."
              />
            </div>
          </div>

          {/* Price */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.listingType === 'sale' ? (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Sale Price<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                  <input
                    type="number"
                    required
                    value={formData.price.sale}
                    onChange={(e) => handleInputChange('price.sale', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Rent Amount<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                    <input
                      type="number"
                      required
                      value={formData.price.rent.amount}
                      onChange={(e) => handleInputChange('price.rent.amount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Rent Period<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                    <SearchableSelect
                      required
                      value={formData.price.rent.period}
                      onChange={(e) => handleInputChange('price.rent.period', e.target.value)}
                      options={[
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'yearly', label: 'Yearly' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'daily', label: 'Daily' }
                      ]}
                      placeholder="Select period"
                      buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                      searchPlaceholder="Search period..."
                    />
                  </div>
                </>
              )}
              <p className="md:col-span-3 text-sm text-gray-500">
                All prices are stored in <span className="font-semibold text-gray-700">AED</span>.
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary-600" />
              Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Address<span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.location.address}
                  onChange={(e) => handleInputChange('location.address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter street address"
                />
              </div>
              {/* Country */}
              <div>
                <label className="block text-sm font-bold mb-1">Country<span className="text-red-500">*</span></label>
                <SearchableSelect
                  required
                  value={formData.location.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  options={geo.countries.map((c) => ({ value: c, label: c }))}
                  placeholder={geoLoading.countries ? 'Loading countries...' : 'Select country'}
                  searchPlaceholder="Search country..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white text-left"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-bold mb-1">State<span className="text-red-500">*</span></label>
                <SearchableSelect
                  required
                  value={formData.location.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={!formData.location.country || geoLoading.states}
                  options={stateOptions.map((s) => ({ value: s, label: s }))}
                  placeholder={geoLoading.states ? 'Loading states...' : 'Select state'}
                  searchPlaceholder="Search state..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white text-left"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-bold mb-1">City<span className="text-red-500">*</span></label>
                <SearchableSelect
                  required
                  value={formData.location.city}
                  onChange={(e) => handleInputChange('location.city', e.target.value)}
                  disabled={!formData.location.state || geoLoading.cities}
                  options={cityOptions.map((c) => ({ value: c, label: c }))}
                  placeholder={geoLoading.cities ? 'Loading cities...' : 'Select city'}
                  searchPlaceholder="Search city..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white text-left"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Zip Code</label>
                <input
                  type="text"
                  value={formData.location.zipCode}
                  onChange={(e) => handleInputChange('location.zipCode', sanitizePostalDigits(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>
            <GoogleMapPicker
              lat={formData.location.coordinates.lat}
              lng={formData.location.coordinates.lng}
              onLocationSelect={handleLocationSelect}
            />
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Images</h2>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Upload Images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
            </div>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={getImageUrl(img)}
                      alt={img.alt || `Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(index)}
                        className={`px-2 py-1 text-xs rounded ${img.isPrimary ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'}`}
                      >
                        {img.isPrimary ? 'Primary' : 'Set Primary'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Specifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-1">Bedrooms (BHK Type)</label>
                <SearchableSelect
                  value={formData.bedroomSelect || ''}
                  onChange={(e) => handleInputChange('bedroomSelect', e.target.value)}
                  options={BEDROOM_SELECT_OPTIONS}
                  placeholder="Select bedrooms"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search..."
                />
              </div>
              {renderSpecificationStepper('Bathrooms', 'specifications.bathrooms', formData.specifications.bathrooms)}
              {renderSpecificationStepper('Balconies', 'specifications.balconies', formData.specifications.balconies)}
              {renderSpecificationStepper('Living Room', 'specifications.livingRoom', formData.specifications.livingRoom)}
              <div className="flex items-center h-full pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.specifications.unfurnished > 0}
                    onChange={(e) => handleInputChange('specifications.unfurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
                  />
                  <span className="text-sm font-bold text-gray-900">Unfurnished</span>
                </label>
              </div>
              <div className="flex items-center h-full pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.specifications.semiFurnished > 0}
                    onChange={(e) => handleInputChange('specifications.semiFurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
                  />
                  <span className="text-sm font-bold text-gray-900">Semi-Furnished</span>
                </label>
              </div>
              <div className="flex items-center h-full pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.specifications.fullyFurnished > 0}
                    onChange={(e) => handleInputChange('specifications.fullyFurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
                  />
                  <span className="text-sm font-bold text-gray-900">Fully Furnished</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Area</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.specifications.area.value}
                  onChange={(e) =>
                    handleInputChange('specifications.area.value', sanitizeDecimal(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Unit</label>
                <SearchableSelect
                  value={formData.specifications.area.unit}
                  onChange={(e) => handleInputChange('specifications.area.unit', e.target.value)}
                  options={[
                    { value: 'sqft', label: 'sqft' },
                    { value: 'sqm', label: 'sqm' }
                  ]}
                  placeholder="Unit"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search unit..."
                />
              </div>
              {renderSpecificationStepper('Parking', 'specifications.parking', formData.specifications.parking)}
              {renderSpecificationStepper('Floors', 'specifications.floors', formData.specifications.floors, 2, 'Add', 1)}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Year Built</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.yearBuilt}
                  onChange={(e) => handleInputChange('specifications.yearBuilt', sanitizeDigits(e.target.value, 4))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Category & Amenities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category & Amenities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Category</label>
                <SearchableSelect
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  options={[
                    ...categories.map((c) => ({ value: c._id, label: c.name }))
                  ]}
                  placeholder="Select Category"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search category..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Amenities</label>
                <SearchableSelect
                  value={formData.amenities?.[0] || ''}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) return
                    const next = Array.from(new Set([...(formData.amenities || []), v]))
                    handleInputChange('amenities', next)
                  }}
                  options={amenities.map((a) => ({ value: a._id, label: a.name }))}
                  placeholder="Add amenity..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search amenity..."
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(formData.amenities || []).map((id) => {
                    const label = amenities.find(a => a._id === id)?.name || id
                    return (
                      <button
                        key={id}
                        type="button"
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => handleInputChange('amenities', (formData.amenities || []).filter(x => x !== id))}
                        title="Remove"
                      >
                        {label} ×
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/properties" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}




