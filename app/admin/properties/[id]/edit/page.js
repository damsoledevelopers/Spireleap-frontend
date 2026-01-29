'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Upload, X, MapPin, Building, User } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'

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
  const [formData, setFormData] = useState(null)

  useEffect(() => {
    if (!authLoading && user) {
      fetchInitialData()
    }
  }, [user, authLoading, params.id])

  useEffect(() => {
    if (formData?.agency) {
      fetchAgentsByAgency(formData.agency)
    }
  }, [formData?.agency])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [propertyRes, categoriesRes, amenitiesRes, agenciesRes] = await Promise.all([
        api.get(`/properties/${params.id}`),
        api.get('/cms/categories'),
        api.get('/cms/amenities'),
        api.get('/agencies')
      ])

      const property = propertyRes.data.property
      setCategories(categoriesRes.data.categories || [])
      setAmenities(amenitiesRes.data.amenities || [])
      setAgencies(agenciesRes.data.agencies || [])

      // Format property data for form
      setFormData({
        title: property.title || '',
        description: property.description || '',
        propertyType: property.propertyType || 'apartment',
        listingType: property.listingType || 'sale',
        agency: property.agency?._id || property.agency || '',
        agent: property.agent?._id || property.agent || '',
        price: {
          sale: property.price?.sale || '',
          rent: {
            amount: property.price?.rent?.amount || '',
            period: property.price?.rent?.period || 'monthly'
          },
          currency: property.price?.currency || 'USD'
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
          bedrooms: property.specifications?.bedrooms || '',
          bathrooms: property.specifications?.bathrooms || '',
          area: {
            value: property.specifications?.area?.value || '',
            unit: property.specifications?.area?.unit || 'sqft'
          },
          parking: property.specifications?.parking || 0,
          floors: property.specifications?.floors || 1,
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

      // Fetch agents for the property's agency
      if (property.agency?._id || property.agency) {
        await fetchAgentsByAgency(property.agency?._id || property.agency)
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
      const submitData = {
        ...formData,
        price: {
          sale: formData.price.sale ? parseFloat(formData.price.sale) : undefined,
          rent: formData.price.rent.amount ? {
            amount: parseFloat(formData.price.rent.amount),
            period: formData.price.rent.period
          } : undefined,
          currency: formData.price.currency
        },
        specifications: {
          ...formData.specifications,
          bedrooms: formData.specifications.bedrooms ? parseInt(formData.specifications.bedrooms) : undefined,
          bathrooms: formData.specifications.bathrooms ? parseInt(formData.specifications.bathrooms) : undefined,
          area: {
            value: parseFloat(formData.specifications.area.value),
            unit: formData.specifications.area.unit
          },
          parking: parseInt(formData.specifications.parking) || 0,
          floors: parseInt(formData.specifications.floors) || 1,
          yearBuilt: formData.specifications.yearBuilt ? parseInt(formData.specifications.yearBuilt) : undefined,
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agency *</label>
                  <select
                    required
                    value={formData.agency}
                    onChange={(e) => handleInputChange('agency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    disabled={user?.role !== 'super_admin'}
                  >
                    <option value="">Select Agency</option>
                    {agencies.map(agency => (
                      <option key={agency._id} value={agency._id}>
                        {agency.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                  <select
                    required
                    value={formData.agent}
                    onChange={(e) => handleInputChange('agent', e.target.value)}
                    disabled={!formData.agency || user?.role === 'agent'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{formData.agency ? 'Select Agent' : 'Select Agency First'}</option>
                    {agents.map(agent => (
                      <option key={agent._id} value={agent._id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
                <select
                  required
                  value={formData.propertyType}
                  onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="land">Land</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type *</label>
                <select
                  required
                  value={formData.listingType}
                  onChange={(e) => handleInputChange('listingType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={user?.role === 'agent'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {(user?.role === 'super_admin' || user?.role === 'agency_admin') ? (
                    <>
                      <option value="active">Available (Active)</option>
                      <option value="pending">Pending Approval</option>
                      <option value="sold">Sold</option>
                      <option value="rented">Rented</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                    </>
                  ) : (
                    <option value="pending">Pending Agency Approval</option>
                  )}
                </select>
                {user?.role === 'agent' && (
                  <p className="mt-1 text-xs text-gray-500">Any edits will require re-approval from the agency.</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rent Period *</label>
                    <select
                      required
                      value={formData.price.rent.period}
                      onChange={(e) => handleInputChange('price.rent.period', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="weekly">Weekly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={formData.price.currency}
                  onChange={(e) => handleInputChange('price.currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.location.address}
                  onChange={(e) => handleInputChange('location.address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.location.city}
                  onChange={(e) => handleInputChange('location.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={formData.location.state}
                  onChange={(e) => handleInputChange('location.state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                <input
                  type="text"
                  value={formData.location.zipCode}
                  onChange={(e) => handleInputChange('location.zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={formData.specifications.bedrooms}
                  onChange={(e) => handleInputChange('specifications.bedrooms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={formData.specifications.bathrooms}
                  onChange={(e) => handleInputChange('specifications.bathrooms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <input
                  type="number"
                  value={formData.specifications.area.value}
                  onChange={(e) => handleInputChange('specifications.area.value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  value={formData.specifications.area.unit}
                  onChange={(e) => handleInputChange('specifications.area.unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="sqft">sqft</option>
                  <option value="sqm">sqm</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking</label>
                <input
                  type="number"
                  value={formData.specifications.parking}
                  onChange={(e) => handleInputChange('specifications.parking', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                <input
                  type="number"
                  value={formData.specifications.yearBuilt}
                  onChange={(e) => handleInputChange('specifications.yearBuilt', e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
                <select
                  multiple
                  value={formData.amenities}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    handleInputChange('amenities', selected)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  size={5}
                >
                  {amenities.map(amenity => (
                    <option key={amenity._id} value={amenity._id}>
                      {amenity.name}
                    </option>
                  ))}
                </select>
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




