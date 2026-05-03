'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, Upload, X, MapPin, Building, User } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SearchableSelect from '../../../../components/Common/SearchableSelect'

// Dynamically import Google Maps to avoid SSR issues
const GoogleMapPicker = dynamic(() => import('../../../../components/GoogleMapPicker'), { ssr: false })

export default function AdminAddPropertyPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)
  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [agencies, setAgencies] = useState([])
  const [agents, setAgents] = useState([])
  const sanitizeAlphaText = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
  const sanitizeZip = (v) => String(v || '').replace(/\D/g, '').slice(0, 9)
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
  const isValidZip = (v) => {
    const s = String(v || '').trim()
    if (!s) return true
    return s.length === 5 || s.length === 9
  }
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'apartment',
    listingType: 'sale',
    agency: '',
    agent: '',
    price: {
      sale: '',
      rent: { amount: '', period: 'monthly' },
      currency: 'USD'
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
      bedrooms: '',
      bathrooms: '',
      balconies: 0,
      livingRoom: 0,
      unfurnished: 0,
      semiFurnished: 0,
      fullyFurnished: 0,
      area: { value: '', unit: 'sqft' },
      parking: 0,
      floors: 1,
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
    // Fetch agents when agency changes
    if (formData.agency) {
      fetchAgentsByAgency(formData.agency)
    } else {
      setAgents([])
      setFormData(prev => ({ ...prev, agent: '' }))
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

  const fetchInitialData = async () => {
    if (!user) return

    try {
      const [categoriesRes, amenitiesRes, agenciesRes] = await Promise.all([
        api.get('/settings/categories'),
        api.get('/settings/amenities'),
        api.get('/agencies')
      ])
      setCategories(categoriesRes.data.categories || [])
      setAmenities(amenitiesRes.data.amenities || [])
      setAgencies(agenciesRes.data.agencies || [])
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

  const handleInputChange = (field, value) => {
    const keys = field.split('.')
    if (keys.length === 1) {
      setFormData({ ...formData, [field]: value })
    } else if (keys.length === 2) {
      setFormData({
        ...formData,
        [keys[0]]: { ...formData[keys[0]], [keys[1]]: value }
      })
    } else if (keys.length === 3) {
      setFormData({
        ...formData,
        [keys[0]]: {
          ...formData[keys[0]],
          [keys[1]]: {
            ...formData[keys[0]][keys[1]],
            [keys[2]]: value
          }
        }
      })
    }
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

      if (!isValidZip(formData.location?.zipCode)) {
        toast.error('ZIP Code must be 5 digits or 9 digits (ZIP+4)')
        setLoading(false)
        return
      }

      // Clean up form data
      const submitData = {
        ...formData,
        agency: formData.agency || undefined,
        agent: formData.agent || undefined,
        price: {
          sale: formData.price.sale ? parseFloat(formData.price.sale) : undefined,
          rent: formData.price.rent.amount ? {
            amount: parseFloat(formData.price.rent.amount),
            period: formData.price.rent.period
          } : undefined,
          currency: formData.price.currency
        },
        regulatoryInformation: {
          ...formData.regulatoryInformation,
          listedAt: formData.regulatoryInformation?.listedAt
            ? new Date(formData.regulatoryInformation.listedAt).toISOString()
            : undefined
        },
        specifications: {
          ...formData.specifications,
          bedrooms: formData.specifications.bedrooms ? parseInt(formData.specifications.bedrooms, 10) : undefined,
          bathrooms: formData.specifications.bathrooms ? parseInt(formData.specifications.bathrooms, 10) : undefined,
          balconies: parseInt(formData.specifications.balconies, 10) || 0,
          livingRoom: parseInt(formData.specifications.livingRoom, 10) || 0,
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
        videos: formData.videos.filter(v => v.url),
        location: {
          ...formData.location,
          coordinates: formData.location.coordinates
        },
        status: formData.status || 'active'
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agency{user?.role === 'super_admin' ? ' (optional)' : ''}
                  </label>
                  <SearchableSelect
                    value={formData.agency}
                    onChange={(e) => handleInputChange('agency', e.target.value)}
                    disabled={user?.role === 'agency_admin' || user?.role === 'agent'}
                    options={[
                      ...(user?.role === 'super_admin'
                        ? agencies.map(a => ({ value: a._id, label: a.name }))
                        : (user?.agency
                          ? [{
                            value: typeof user.agency === 'object' ? user.agency._id : user.agency,
                            label: user.agencyName || (typeof user.agency === 'object' ? user.agency.name : 'Your Agency')
                          }]
                          : []))
                    ]}
                    placeholder="Select Agency"
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                    searchPlaceholder="Search agency..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent (optional)</label>
                  <SearchableSelect
                    value={formData.agent}
                    onChange={(e) => handleInputChange('agent', e.target.value)}
                    disabled={!formData.agency || user?.role === 'agent'}
                    options={[
                      ...agents.map(a => ({ value: a._id, label: `${a.firstName} ${a.lastName}`.trim() }))
                    ]}
                    placeholder={formData.agency ? 'Select Agent' : 'Select Agency First'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Beautiful 3BR Apartment in Downtown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <SearchableSelect
                  value={formData.propertyType}
                  onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  options={[
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
                    { value: 'other', label: 'Other' }
                  ]}
                  placeholder="Select property type"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search type..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <SearchableSelect
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={user?.role !== 'super_admin' && user?.role !== 'agency_admin'}
                  options={(user?.role === 'super_admin' || user?.role === 'agency_admin')
                    ? [
                      { value: 'active', label: 'Available (Active)' },
                      { value: 'pending', label: 'Pending Approval' },
                      { value: 'sold', label: 'Sold' },
                      { value: 'rented', label: 'Rented' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'draft', label: 'Draft' }
                    ]
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rent Period</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <SearchableSelect
                  value={formData.price.currency}
                  onChange={(e) => handleInputChange('price.currency', e.target.value)}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                    { value: 'INR', label: 'INR' }
                  ]}
                  placeholder="Currency"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                  searchPlaceholder="Search currency..."
                />
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.location.address}
                  onChange={(e) => handleInputChange('location.address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.location.city}
                  onChange={(e) => handleInputChange('location.city', sanitizeAlphaText(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.location.state}
                  onChange={(e) => handleInputChange('location.state', sanitizeAlphaText(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.location.country}
                  onChange={(e) => handleInputChange('location.country', sanitizeAlphaText(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={formData.location.zipCode}
                  onChange={(e) => handleInputChange('location.zipCode', sanitizeZip(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="ZIP Code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                <input
                  type="text"
                  value={formData.location.neighborhood}
                  onChange={(e) => handleInputChange('location.neighborhood', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Neighborhood"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Map Location</label>
              <GoogleMapPicker
                onLocationSelect={handleLocationSelect}
                initialLocation={formData.location.coordinates}
              />
            </div>
          </div>

          {/* Regulatory Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.reference}
                  onChange={(e) => handleInputChange('regulatoryInformation.reference', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="DPF-S-47165"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listed At</label>
                <input
                  type="date"
                  value={formData.regulatoryInformation.listedAt}
                  onChange={(e) => handleInputChange('regulatoryInformation.listedAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker License</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.brokerLicense}
                  onChange={(e) => handleInputChange('regulatoryInformation.brokerLicense', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="11917"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Name</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.agencyName}
                  onChange={(e) => handleInputChange('regulatoryInformation.agencyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="DRIVEN PROPERTIES LLC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.zoneName}
                  onChange={(e) => handleInputChange('regulatoryInformation.zoneName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Jumeirah First"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent License</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.agentLicense}
                  onChange={(e) => handleInputChange('regulatoryInformation.agentLicense', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="46127"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DLD Permit Number</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.dldPermitNumber}
                  onChange={(e) => handleInputChange('regulatoryInformation.dldPermitNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="65171959460"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">QR code image (optional)</label>
                <p className="text-xs text-gray-500 mb-2">Upload a PNG/JPEG of the listing QR, or paste a URL below.</p>
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
                {/* <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">Or paste image URL</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.qrImage}
                  onChange={(e) => handleInputChange('regulatoryInformation.qrImage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://… (optional)"
                /> */}
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">QR Value</label>
                <input
                  type="text"
                  value={formData.regulatoryInformation.qrValue}
                  onChange={(e) => handleInputChange('regulatoryInformation.qrValue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://your-frontend.com/property/123"
                />
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms (BHK Type)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.bedrooms}
                  onChange={(e) =>
                    handleInputChange('specifications.bedrooms', sanitizeDigits(e.target.value, 2))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.bathrooms}
                  onChange={(e) =>
                    handleInputChange('specifications.bathrooms', sanitizeDigits(e.target.value, 2))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Balconies</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.balconies}
                  onChange={(e) =>
                    handleInputChange('specifications.balconies', sanitizeDigits(e.target.value, 2))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Living Room</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.livingRoom}
                  onChange={(e) =>
                    handleInputChange('specifications.livingRoom', sanitizeDigits(e.target.value, 2))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2 flex flex-row flex-nowrap items-end gap-4 sm:gap-6 md:gap-8 pb-2 min-h-[3.25rem] overflow-x-auto">
                <label className="flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={formData.specifications.unfurnished > 0}
                    onChange={(e) => handleInputChange('specifications.unfurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5 shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-700">Unfurnished</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={formData.specifications.semiFurnished > 0}
                    onChange={(e) => handleInputChange('specifications.semiFurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5 shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-700">Semi-Furnished</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={formData.specifications.fullyFurnished > 0}
                    onChange={(e) => handleInputChange('specifications.fullyFurnished', e.target.checked ? 1 : 0)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5 shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-700">Fully Furnished</span>
                </label>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (optional)</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking Spaces</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.parking}
                  onChange={(e) => handleInputChange('specifications.parking', sanitizeDigits(e.target.value, 2))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floors</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.floors}
                  onChange={(e) => handleInputChange('specifications.floors', sanitizeDigits(e.target.value, 2))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.specifications.yearBuilt}
                  onChange={(e) => handleInputChange('specifications.yearBuilt', sanitizeDigits(e.target.value, 4))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Year"
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
                      alt={image.alt}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {image.isPrimary && (
                      <span className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(index)}
                        className="opacity-0 group-hover:opacity-100 bg-white text-primary-600 px-3 py-1 rounded text-sm"
                      >
                        Set Primary
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="opacity-0 group-hover:opacity-100 bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category & Amenities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category & Amenities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                <div className="max-h-60 overflow-y-auto border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                  {amenities.length > 0 ? (
                    <div className="space-y-2">
                      {amenities.map(amenity => (
                        <label
                          key={amenity._id}
                          className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-primary-200"
                        >
                          <input
                            type="checkbox"
                            checked={formData.amenities.includes(amenity._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  amenities: [...formData.amenities, amenity._id]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  amenities: formData.amenities.filter(id => id !== amenity._id)
                                })
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 font-medium">{amenity.name}</span>
                          {amenity.icon && (
                            <span className="ml-auto text-primary-600">{amenity.icon}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No amenities available</p>
                      <p className="text-xs text-gray-400 mt-1">Create amenities in Settings first</p>
                    </div>
                  )}
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

