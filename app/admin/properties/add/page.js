'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, Upload, X, MapPin, Building, User, ChevronUp, ChevronDown, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SearchableSelect from '../../../../components/Common/SearchableSelect'
import {
  buildAgencySelectOptions,
  buildAgentSelectOptions,
  agencyValueForSubmit,
  agentValueForSubmit,
  NONE_AGENCY_VALUE,
  NONE_AGENT_VALUE,
  agencyAgentFieldsAfterAgencyChange,
  selectValueForAgency,
  selectValueForAgent
} from '../../../../lib/agencyAgentOptions'
import {
  sanitizePostalDigits,
  isValidOptionalPostalDigits,
  OPTIONAL_POSTAL_DIGITS_MESSAGE
} from '../../../../lib/postalCode'
import {
  PROPERTY_STATUS_FORM_OPTIONS_SUPER,
  PROPERTY_STATUS_FORM_OPTIONS_AGENCY,
  BEDROOM_SELECT_OPTIONS,
  bedroomSelectToSpecs,
  specsToBedroomSelect,
  COMPLETION_STATUS_FORM_OPTIONS,
  getHandoverByFormOptions
} from '../../../../lib/propertyOptions'
import { fetchPropertyTypeOptions } from '../../../../lib/propertyTypesApi'
import PropertyVideosEditor, { normalizeVideosForSubmit } from '../../../../components/Property/PropertyVideosEditor'

// Dynamically import Google Maps to avoid SSR issues
const GoogleMapPicker = dynamic(() => import('../../../../components/GoogleMapPicker'), { ssr: false })

function RequiredMark() {
  return <span className="text-red-500 ml-0.5 font-bold" aria-hidden="true">*</span>
}

export default function AdminAddPropertyPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingFloorPlans, setUploadingFloorPlans] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)
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
    // allow digits and one dot, e.g. "123.45"
    const s = String(v ?? '').replace(/[^\d.]/g, '')
    const firstDot = s.indexOf('.')
    if (firstDot === -1) return s
    return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }

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


  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'apartment',
    completionStatus: '',
    handoverQuarter: '',
    listingType: 'sale',
    agency: '',
    agent: '',
    bedroomSelect: '',
    price: {
      sale: '',
      rent: { amount: '', period: 'monthly' },
      currency: 'AED'
    },
    location: {
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      coordinates: { lat: 0, lng: 0 },
      neighborhood: '',
      landmark: ''
    },
    specifications: {
      isStudio: false,
      bedrooms: '',
      bathrooms: '',
      balconies: '',
      livingRoom: '',
      unfurnished: 0,
      semiFurnished: 0,
      fullyFurnished: 0,
      area: { value: '', unit: 'sqft' },
      parking: '',
      floors: '',
      yearBuilt: '',
      lotSize: { value: '', unit: 'sqft' }
    },
    regulatoryInformation: {
      reference: '',
      listedAt: '',
      brokerLicense: '',
      agencyName: '',
      zoneName: '',
      agentLicense: '',
      dldPermitNumber: '',
      qrImage: '',
      qrValue: ''
    },
    category: '',
    amenities: [],
    images: [],
    floorPlanImages: [],
    videos: [],
    virtualTour: { url: '', type: '3d' },
    tags: [],
    featured: false,
    trending: false,
    status: (user?.role === 'super_admin' || user?.role === 'agency_admin') ? 'active' : 'pending',
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: []
    }
  })

  useEffect(() => {
    if (!authLoading && user) {
      fetchInitialData()
    }
  }, [user, authLoading])

  useEffect(() => {
    if (formData.agency && formData.agency !== NONE_AGENCY_VALUE) {
      fetchAgentsByAgency(formData.agency)
    } else {
      fetchAllAgents()
    }
  }, [formData.agency])

  // Pre-fill agency for agency_admin and agent
  useEffect(() => {
    if ((user?.role === 'agency_admin' || user?.role === 'agent') && user?.agency) {
      const agencyId = typeof user.agency === 'object' ? user.agency._id : user.agency
      setFormData(prev => ({ ...prev, agency: agencyId }))
    }
    // Pre-fill agent for agent role
    if (user?.role === 'agent') {
      setFormData(prev => ({ ...prev, agent: user.id }))
    }
  }, [user])

  // Load countries on mount
  useEffect(() => {
    fetchCountries()
  }, [])

  // Load states when country changes
  useEffect(() => {
    fetchStates(formData.location.country)
  }, [formData.location.country])

  // Load cities when state changes
  useEffect(() => {
    fetchCities(formData.location.country, formData.location.state)
  }, [formData.location.country, formData.location.state])

  // Fetch countries
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

  // Fetch states for a country
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

  // Fetch cities for a country/state
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
    if (!user) return

    try {
      const [categoriesRes, amenitiesRes, agenciesRes, typeOptions] = await Promise.all([
        api.get('/settings/categories'),
        api.get('/settings/amenities'),
        api.get('/agencies'),
        fetchPropertyTypeOptions(api)
      ])
      setCategories(categoriesRes.data.categories || [])
      setAmenities(amenitiesRes.data.amenities || [])
      setAgencies(agenciesRes.data.agencies || [])
      setPropertyTypeOptions(typeOptions)
      await fetchAllAgents()
    } catch (error) {
      console.error('Error fetching initial data:', error)
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

      setFormData((prev) => {
        const newImages = response.data.files.map((file, index) => ({
          url: file.url,
          alt: `Image ${prev.images.length + index + 1}`,
          isPrimary: prev.images.length === 0 && index === 0,
          order: prev.images.length + index
        }))
        return { ...prev, images: [...prev.images, ...newImages] }
      })
      toast.success(`Successfully uploaded ${response.data.files.length} image(s)`)
    } catch (error) {
      console.error('Error uploading images:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload images'
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleQrImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingQr(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('images', file)
      const response = await api.post('/upload/property-images', uploadFormData)
      const url = response.data?.files?.[0]?.url
      if (!url) throw new Error('Invalid response from server')
      setFormData((prev) => ({
        ...prev,
        regulatoryInformation: { ...prev.regulatoryInformation, qrImage: url }
      }))
      toast.success('QR image uploaded')
    } catch (error) {
      console.error('Error uploading QR image:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to upload QR image')
    } finally {
      setUploadingQr(false)
    }
  }

  const removeImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    })
  }

  const handleFloorPlanUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    e.target.value = ''
    setUploadingFloorPlans(true)
    try {
      const uploadFormData = new FormData()
      files.forEach((file) => uploadFormData.append('images', file))
      const response = await api.post('/upload/property-images', uploadFormData)
      if (!response.data?.files) throw new Error('Invalid response from server')
      setFormData((prev) => {
        const newPlans = response.data.files.map((file, index) => ({
          url: file.url,
          alt: `Floor plan ${prev.floorPlanImages.length + index + 1}`,
          order: prev.floorPlanImages.length + index
        }))
        return { ...prev, floorPlanImages: [...prev.floorPlanImages, ...newPlans] }
      })
      toast.success(`Uploaded ${response.data.files.length} floor plan(s)`)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to upload floor plans')
    } finally {
      setUploadingFloorPlans(false)
    }
  }

  const removeFloorPlan = (index) => {
    setFormData((prev) => ({
      ...prev,
      floorPlanImages: prev.floorPlanImages.filter((_, i) => i !== index)
    }))
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
    setLoading(true)

    try {
      // Agency required only when tied to an agency workflow (not super_admin global listings)
      if (user?.role === 'agency_admin' && !formData.agency) {
        toast.error('Please select an agency')
        setLoading(false)
        return
      }

      if (!String(formData.title || '').trim()) {
        toast.error('Title is required')
        setLoading(false)
        return
      }
      if (!String(formData.description || '').trim()) {
        toast.error('Description is required')
        setLoading(false)
        return
      }

      if (!isValidOptionalPostalDigits(formData.location?.zipCode)) {
        toast.error(OPTIONAL_POSTAL_DIGITS_MESSAGE)
        setLoading(false)
        return
      }

      const qrValue = String(formData.regulatoryInformation?.qrValue || '').trim()
      const qrImage = formData.regulatoryInformation?.qrImage
      if (qrValue && !qrImage) {
        toast.error('Please upload QR image when QR Value is provided')
        setLoading(false)
        return
      }

      // Clean up form data
      const submitData = {
        ...formData,
        agency: agencyValueForSubmit(formData.agency),
        agent: agentValueForSubmit(formData.agent),
        price: {
          sale: formData.price.sale ? parseFloat(formData.price.sale) : undefined,
          rent: formData.price.rent.amount ? {
            amount: parseFloat(formData.price.rent.amount),
            period: formData.price.rent.period
          } : undefined,
          currency: 'AED'
        },
        regulatoryInformation: {
          ...formData.regulatoryInformation,
          listedAt: formData.regulatoryInformation?.listedAt
            ? new Date(formData.regulatoryInformation.listedAt).toISOString()
            : undefined
        },
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
        videos: normalizeVideosForSubmit(formData.videos),
        location: {
          ...formData.location,
          address: String(formData.location?.address || '').trim(),
          city: String(formData.location?.city || '').trim(),
          state: String(formData.location?.state || '').trim(),
          country: String(formData.location?.country || '').trim(),
          zipCode: String(formData.location?.zipCode || '').trim(),
          coordinates: formData.location.coordinates
        },
        status: formData.status || 'active'
      }

      delete submitData.bedroomSelect
      if (!submitData.completionStatus) delete submitData.completionStatus
      if (submitData.completionStatus !== 'off_plan' || !submitData.handoverQuarter) {
        delete submitData.handoverQuarter
      }

      if (!submitData.agency) delete submitData.agency
      if (!submitData.agent) delete submitData.agent

      if (
        submitData.specifications?.area &&
        (submitData.specifications.area.value === undefined ||
          submitData.specifications.area.value === null ||
          Number.isNaN(submitData.specifications.area.value))
      ) {
        delete submitData.specifications.area
      }

      // Remove empty price fields
      Object.keys(submitData.price).forEach(key => {
        if (submitData.price[key] === undefined || submitData.price[key] === '') {
          delete submitData.price[key]
        }
      })

      // Remove empty regulatory fields
      if (submitData.regulatoryInformation) {
        Object.keys(submitData.regulatoryInformation).forEach((key) => {
          if (submitData.regulatoryInformation[key] === undefined || submitData.regulatoryInformation[key] === '') {
            delete submitData.regulatoryInformation[key]
          }
        })
        if (Object.keys(submitData.regulatoryInformation).length === 0) {
          delete submitData.regulatoryInformation
        }
      }

      await api.post('/properties', submitData)
      toast.success('Property created successfully!')
      // Small delay to ensure the property is saved before redirecting
      setTimeout(() => {
        router.push('/admin/properties')
        router.refresh()
      }, 500)
    } catch (error) {
      console.error('Error creating property:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create property'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
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


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/properties" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
              <p className="mt-1 text-sm text-gray-500">Create a new property listing</p>
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
              <p className="text-sm text-gray-500 mb-4">
                {user?.role === 'super_admin'
                  ? 'Optional: assign an agency and agent when this listing belongs to a partner. You can save without them.'
                  : 'Assign an agent for this listing when applicable.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Agency{user?.role === 'super_admin' ? ' (optional)' : ''}
                    {user?.role === 'agency_admin' ? <RequiredMark /> : null}
                  </label>
                  <SearchableSelect
                    value={selectValueForAgency(formData.agency)}
                    onChange={(e) => {
                      const v = e.target.value
                      setFormData((prev) => ({ ...prev, ...agencyAgentFieldsAfterAgencyChange(prev, v) }))
                    }}
                    disabled={user?.role === 'agency_admin' || user?.role === 'agent'}
                    options={
                      user?.role === 'super_admin'
                        ? buildAgencySelectOptions(agencies, { includeNone: true })
                        : user?.agency
                          ? buildAgencySelectOptions(
                              [{
                                _id: typeof user.agency === 'object' ? user.agency._id : user.agency,
                                name: user.agencyName || (typeof user.agency === 'object' ? user.agency.name : 'Your Agency')
                              }],
                              { includeNone: false }
                            )
                          : []
                    }
                    placeholder="Select Agency"
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                    searchPlaceholder="Search agency..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Agent (optional)</label>
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
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Title
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter property title"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Property Type
                  <RequiredMark />
                </label>
                <SearchableSelect
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
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === 'off_plan') {
                      handleInputChange('completionStatus', v)
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        completionStatus: v,
                        handoverQuarter: ''
                      }))
                    }
                  }}
                  options={COMPLETION_STATUS_FORM_OPTIONS}
                  placeholder="Select completion status"
                  searchable={false}
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
              {formData.completionStatus === 'off_plan' && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Handover by</label>
                  <SearchableSelect
                    value={formData.handoverQuarter || ''}
                    onChange={(e) => handleInputChange('handoverQuarter', e.target.value)}
                    options={getHandoverByFormOptions(formData.handoverQuarter)}
                    placeholder="Select handover by"
                    searchable={false}
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Listing Type
                  <RequiredMark />
                </label>
                <SearchableSelect
                  value={formData.listingType}
                  onChange={(e) => handleInputChange('listingType', e.target.value)}
                  options={[
                    { value: 'sale', label: 'For Sale' },
                    { value: 'rent', label: 'For Rent' },
                    { value: 'both', label: 'Both' }
                  ]}
                  placeholder="Select listing type"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Status</label>
                <SearchableSelect
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={user?.role !== 'super_admin' && user?.role !== 'agency_admin'}
                  options={(user?.role === 'super_admin' || user?.role === 'agency_admin')
                    ? PROPERTY_STATUS_FORM_OPTIONS_SUPER
                    : [{ value: 'pending', label: 'Pending Agency Approval' }]}
                  placeholder="Select status"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                  searchPlaceholder="Search status..."
                />
                {user?.role === 'agent' && (
                  <p className="mt-1 text-xs text-gray-500">Your listing will be visible after agency approval.</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Description
                  <RequiredMark />
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe the property in detail..."
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(formData.listingType === 'sale' || formData.listingType === 'both') && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Sale Price</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price.sale}
                    onChange={(e) => handleInputChange('price.sale', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
              )}
              {(formData.listingType === 'rent' || formData.listingType === 'both') && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Rent Amount</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.price.rent.amount}
                      onChange={(e) => handleInputChange('price.rent.amount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Rent Period</label>
                    <SearchableSelect
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
              <p className="md:col-span-2 text-sm text-gray-500">
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
                <label className="block text-sm font-bold text-gray-900 mb-1">Country<span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-bold text-gray-900 mb-1">State<span className="text-red-500">*</span></label>
                <SearchableSelect
                  required
                  value={formData.location.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={!formData.location.country || geoLoading.states}
                  options={stateOptions.map((s) => ({ value: s, label: s }))}
                  placeholder={geoLoading.states ? 'Loading states...' : 'Select state'}
                  searchPlaceholder="Search state..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 bg-white text-left"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">City<span className="text-red-500">*</span></label>
                <SearchableSelect
                  required
                  value={formData.location.city}
                  onChange={(e) => handleInputChange('location.city', e.target.value)}
                  disabled={!formData.location.state || geoLoading.cities}
                  options={cityOptions.map((c) => ({ value: c, label: c }))}
                  placeholder={geoLoading.cities ? 'Loading cities...' : 'Select city'}
                  searchPlaceholder="Search city..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 bg-white text-left"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={formData.location.zipCode}
                  onChange={(e) => handleInputChange('location.zipCode', sanitizePostalDigits(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter ZIP code"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Neighborhood</label>
                <input
                  type="text"
                  value={formData.location.neighborhood}
                  onChange={(e) => handleInputChange('location.neighborhood', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter neighborhood"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Map Location</label>
              <GoogleMapPicker
                lat={formData.location.coordinates.lat}
                lng={formData.location.coordinates.lng}
                initialLocation={formData.location.coordinates}
                onLocationSelect={handleLocationSelect}
              />
              <p className="text-xs text-gray-500 mt-2">
                Click the map or search an address to set the pin. This enables the Map button on the property page.
              </p>
            </div>
          </div>

          {/* Regulatory Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Reference</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.reference}
                  onChange={(e) => handleInputChange('regulatoryInformation.reference', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter reference"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Listed At</label>
                <input
                  type="date"
                  value={formData.regulatoryInformation.listedAt}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange('regulatoryInformation.listedAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Broker License</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.brokerLicense}
                  onChange={(e) => handleInputChange('regulatoryInformation.brokerLicense', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter broker license"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Agency Name</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.agencyName}
                  onChange={(e) => handleInputChange('regulatoryInformation.agencyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter agency name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Zone Name</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.zoneName}
                  onChange={(e) => handleInputChange('regulatoryInformation.zoneName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter zone name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Agent License</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.agentLicense}
                  onChange={(e) => handleInputChange('regulatoryInformation.agentLicense', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter agent license"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">DLD Permit Number</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.dldPermitNumber}
                  onChange={(e) => handleInputChange('regulatoryInformation.dldPermitNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter DLD permit number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  QR code image
                  {formData.regulatoryInformation.qrValue ? <RequiredMark /> : null}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {formData.regulatoryInformation.qrValue
                    ? 'QR image is required when QR Value is set'
                    : 'Upload a PNG/JPEG of the listing QR'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 text-sm font-medium text-gray-700">
                    <Upload className="h-4 w-4" />
                    {uploadingQr ? 'Uploading…' : 'Upload QR image'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={uploadingQr}
                      onChange={handleQrImageUpload}
                    />
                  </label>
                  {formData.regulatoryInformation.qrImage && (
                    <button
                      type="button"
                      onClick={() => handleInputChange('regulatoryInformation.qrImage', '')}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove QR image
                    </button>
                  )}
                </div>
                {formData.regulatoryInformation.qrImage && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={formData.regulatoryInformation.qrImage}
                      alt="QR preview"
                      className="h-24 w-24 object-contain border border-gray-200 rounded bg-white p-1"
                    />
                  </div>
                )}
                {/* <label className="block text-sm font-bold text-gray-900 mt-3 mb-1">Or paste image URL</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.qrImage}
                  onChange={(e) => handleInputChange('regulatoryInformation.qrImage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter URL (optional)"
                /> */}
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-gray-900 mb-1">QR Value</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.qrValue}
                  onChange={(e) => handleInputChange('regulatoryInformation.qrValue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter property URL"
                />
              {String(formData.regulatoryInformation.qrValue || '').trim() &&
                !formData.regulatoryInformation.qrImage && (
                  <p className="text-xs text-red-600 mt-2">
                    QR image is required when QR Value is set.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Bedrooms (BHK Type)</label>
                <SearchableSelect
                  value={formData.bedroomSelect}
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
              <div className="md:col-span-2 flex flex-row flex-nowrap items-end gap-4 sm:gap-6 md:gap-8 pb-2 min-h-[3.25rem] overflow-x-auto">
                <label className="flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={formData.specifications.unfurnished > 0}
                    onChange={(e) => handleInputChange('specifications.unfurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5 shrink-0"
                  />
                  <span className="text-sm font-bold text-gray-900">Unfurnished</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={formData.specifications.semiFurnished > 0}
                    onChange={(e) => handleInputChange('specifications.semiFurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5 shrink-0"
                  />
                  <span className="text-sm font-bold text-gray-900">Semi-Furnished</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={formData.specifications.fullyFurnished > 0}
                    onChange={(e) => handleInputChange('specifications.fullyFurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5 shrink-0"
                  />
                  <span className="text-sm font-bold text-gray-900">Fully Furnished</span>
                </label>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-gray-900 mb-1">Area (optional)</label>
                <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-3 max-w-xl">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.specifications.area.value}
                    onChange={(e) =>
                      handleInputChange('specifications.area.value', sanitizeDecimal(e.target.value))
                    }
                    className="w-full min-w-0 sm:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 h-[42px]"
                    placeholder="0"
                  />
                  <div className="w-full sm:w-36 shrink-0 self-stretch">
                    <SearchableSelect
                      value={formData.specifications.area.unit}
                      onChange={(e) => handleInputChange('specifications.area.unit', e.target.value)}
                      options={[
                        { value: 'sqft', label: 'sqft' },
                        { value: 'sqm', label: 'sqm' },
                        { value: 'acre', label: 'acre' }
                      ]}
                      placeholder="Unit"
                      className="h-full"
                      buttonClassName="w-full h-[42px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white flex items-center justify-between gap-2"
                      searchPlaceholder="Unit…"
                    />
                  </div>
                </div>
              </div>
              {renderSpecificationStepper('Parking Spaces', 'specifications.parking', formData.specifications.parking)}
              {renderSpecificationStepper('Floors', 'specifications.floors', formData.specifications.floors, 2, 'Add', 1)}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Year Built</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.yearBuilt}
                  onChange={(e) => handleInputChange('specifications.yearBuilt', sanitizeDigits(e.target.value, 4))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter year"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary-600" />
              Property Images
            </h2>
            <div className="mb-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer disabled:opacity-50"
              >
                <Upload className="h-5 w-5 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Images'}
              </label>
            </div>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt=""
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {image.isPrimary && (
                      <span className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-600 text-white p-1.5 rounded transition-opacity z-10"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(index)}
                        className="opacity-0 group-hover:opacity-100 bg-white text-primary-600 px-3 py-1 rounded text-sm"
                      >
                        Set Primary
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floor plans */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary-600" />
              Floor Plans
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Upload floor plan images (PNG, JPG). These appear in the property gallery under &quot;Floor plans&quot;.
            </p>
            <div className="mb-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFloorPlanUpload}
                disabled={uploadingFloorPlans}
                className="hidden"
                id="floor-plan-upload"
              />
              <label
                htmlFor="floor-plan-upload"
                className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 cursor-pointer disabled:opacity-50"
              >
                <Upload className="h-5 w-5 mr-2" />
                {uploadingFloorPlans ? 'Uploading...' : 'Upload Floor Plans'}
              </label>
            </div>
            {formData.floorPlanImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.floorPlanImages.map((plan, index) => (
                  <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={plan.url}
                      alt=""
                      className="w-full h-32 object-contain bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => removeFloorPlan(index)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove floor plan"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Property videos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Property Videos</h2>
            <p className="text-sm text-gray-500 mb-4">
              Add one or more YouTube links. Visitors can watch them from the property gallery.
            </p>
            <PropertyVideosEditor
              videos={formData.videos}
              onChange={(videos) => setFormData((prev) => ({ ...prev, videos }))}
            />
          </div>

          {/* Category & Amenities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category & Amenities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Category</label>
                <SearchableSelect
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  options={[
                    ...(categories || []).map((c) => ({ value: c._id, label: c.name }))
                  ]}
                  placeholder="Select Category"
                  buttonClassName="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                  searchPlaceholder="Search category..."
                />
                {categories.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">Create categories in Settings first</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Amenities</label>
                <SearchableSelect
                  value={formData.amenities?.[0] || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value) return
                    setFormData((prev) => ({
                      ...prev,
                      amenities: Array.from(new Set([...(prev.amenities || []), value]))
                    }))
                  }}
                  options={amenities.map((amenity) => ({ value: amenity._id, label: amenity.name }))}
                  placeholder="Add amenity..."
                  buttonClassName="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
                  searchPlaceholder="Search amenity..."
                />
                {amenities.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No amenities available</p>
                    <p className="text-xs text-gray-400 mt-1">Create amenities in Settings first</p>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {(formData.amenities || []).map((id) => {
                    const label = amenities.find((a) => a._id === id)?.name || id
                    return (
                      <button
                        key={id}
                        type="button"
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            amenities: (prev.amenities || []).filter((x) => x !== id)
                          }))
                        }}
                        title="Remove"
                      >
                        {label} ×
                      </button>
                    )
                  })}
                </div>
                {formData.amenities.length > 0 && (
                  <p className="mt-2 text-xs text-primary-600 font-medium">
                    {formData.amenities.length} amenit{formData.amenities.length === 1 ? 'y' : 'ies'} selected
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Featured & Trending */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured & Trending</h2>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => handleInputChange('featured', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Featured Property</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.trending}
                  onChange={(e) => handleInputChange('trending', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Trending Property</span>
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Link
              href="/admin/properties"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white rounded-lg hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Creating...' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

