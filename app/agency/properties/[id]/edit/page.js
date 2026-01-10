'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Upload, X, MapPin, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const GoogleMapPicker = dynamic(() => import('@/components/GoogleMapPicker'), { ssr: false })

export default function EditPropertyPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [agents, setAgents] = useState([])
  const [formData, setFormData] = useState(null)

  useEffect(() => {
    fetchInitialData()
  }, [params.id])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [propertyRes, categoriesRes, amenitiesRes, agentsRes] = await Promise.all([
        api.get(`/properties/${params.id}`),
        api.get('/cms/categories'),
        api.get('/cms/amenities'),
        user.role === 'agency_admin' ? api.get('/users?role=agent') : Promise.resolve({ data: { users: [] } })
      ])

      const property = propertyRes.data.property
      setCategories(categoriesRes.data.categories || [])
      setAmenities(amenitiesRes.data.amenities || [])
      setAgents(agentsRes.data.users || [])

      // Format property data for form
      setFormData({
        title: property.title || '',
        description: property.description || '',
        propertyType: property.propertyType || 'apartment',
        listingType: property.listingType || 'sale',
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
        amenities: property.amenities?.map(a => a._id) || [],
        images: property.images || [],
        videos: property.videos || [],
        virtualTour: property.virtualTour || { url: '', type: '3d' },
        tags: property.tags || [],
        featured: property.featured || false,
        trending: property.trending || false,
        seo: property.seo || {
          metaTitle: '',
          metaDescription: '',
          keywords: []
        },
        agent: property.agent?._id || '',
        status: property.status || 'pending'
      })
    } catch (error) {
      console.error('Error fetching property:', error)
      toast.error('Failed to load property')
      router.push('/agency/properties')
    } finally {
      setLoading(false)
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
      router.push('/agency/properties')
    } catch (error) {
      console.error('Error updating property:', error)
      toast.error(error.response?.data?.message || 'Failed to update property')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !formData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agency/properties" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
              <p className="mt-1 text-sm text-gray-500">Update property information</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="e.g., Beautiful 3BR Apartment in Downtown"
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
                  <option value="office">Office</option>
                  <option value="retail">Retail</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="other">Other</option>
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
                  <option value="both">Both</option>
                </select>
              </div>
              {user && user.role === 'agency_admin' && agents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Agent</label>
                  <select
                    value={formData.agent || ''}
                    onChange={(e) => handleInputChange('agent', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Agent</option>
                    {agents.map(agent => (
                      <option key={agent._id} value={agent._id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
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
                    <select
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
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.location.address}
                  onChange={(e) => handleInputChange('location.address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Street address"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <input
                  type="text"
                  required
                  value={formData.location.country}
                  onChange={(e) => handleInputChange('location.country', e.target.value)}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                <input
                  type="text"
                  value={formData.location.neighborhood}
                  onChange={(e) => handleInputChange('location.neighborhood', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Location on Map <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Click on the map or search for an address to set the property location coordinates
              </p>
              <GoogleMapPicker
                lat={formData.location.coordinates.lat}
                lng={formData.location.coordinates.lng}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </div>

          {/* Specifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  min="0"
                  value={formData.specifications.bedrooms}
                  onChange={(e) => handleInputChange('specifications.bedrooms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  min="0"
                  value={formData.specifications.bathrooms}
                  onChange={(e) => handleInputChange('specifications.bathrooms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (Value) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.specifications.area.value}
                  onChange={(e) => handleInputChange('specifications.area.value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area Unit</label>
                <select
                  value={formData.specifications.area.unit}
                  onChange={(e) => handleInputChange('specifications.area.unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="sqft">Square Feet</option>
                  <option value="sqm">Square Meters</option>
                  <option value="acre">Acres</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking Spaces</label>
                <input
                  type="number"
                  min="0"
                  value={formData.specifications.parking}
                  onChange={(e) => handleInputChange('specifications.parking', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floors</label>
                <input
                  type="number"
                  min="1"
                  value={formData.specifications.floors}
                  onChange={(e) => handleInputChange('specifications.floors', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.specifications.yearBuilt}
                  onChange={(e) => handleInputChange('specifications.yearBuilt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {uploading && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}
            </div>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url || image}
                      alt={image.alt || `Image ${index + 1}`}
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
                        className="opacity-0 group-hover:opacity-100 text-white text-xs px-2 py-1 bg-blue-600 rounded"
                      >
                        Set Primary
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="opacity-0 group-hover:opacity-100 text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Videos</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Video URL</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="YouTube, Vimeo, or direct video URL"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const url = e.target.value.trim()
                      if (url) {
                        const videoType = url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' :
                                         url.includes('vimeo.com') ? 'vimeo' : 'direct'
                        setFormData({
                          ...formData,
                          videos: [...formData.videos, { url, type: videoType }]
                        })
                        e.target.value = ''
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.target.previousElementSibling
                    const url = input.value.trim()
                    if (url) {
                      const videoType = url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' :
                                       url.includes('vimeo.com') ? 'vimeo' : 'direct'
                      setFormData({
                        ...formData,
                        videos: [...formData.videos, { url, type: videoType }]
                      })
                      input.value = ''
                    }
                  }}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">Enter YouTube, Vimeo, or direct video URLs</p>
            </div>
            {formData.videos.length > 0 && (
              <div className="space-y-3">
                {formData.videos.map((video, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{video.url}</p>
                      <p className="text-xs text-gray-500 capitalize">{video.type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          videos: formData.videos.filter((_, i) => i !== index)
                        })
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {amenities.map(amenity => (
                    <label key={amenity._id} className="flex items-center gap-2 p-1">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleInputChange('amenities', [...formData.amenities, amenity._id])
                          } else {
                            handleInputChange('amenities', formData.amenities.filter(id => id !== amenity._id))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{amenity.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Options</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => handleInputChange('featured', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Featured Property</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.trending}
                  onChange={(e) => handleInputChange('trending', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Trending Property</span>
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Link href="/agency/properties" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
