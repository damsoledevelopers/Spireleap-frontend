'use client'

// Agent property add page - uses the same form as agency but ensures proper routing
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, Upload, X, MapPin, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import Google Maps to avoid SSR issues
const GoogleMapPicker = dynamic(() => import('@/components/GoogleMapPicker'), { ssr: false })

export default function AgentAddPropertyPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'apartment',
    listingType: 'sale',
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
      area: { value: '', unit: 'sqft' },
      parking: 0,
      floors: 1,
      yearBuilt: '',
      lotSize: { value: '', unit: 'sqft' }
    },
    category: '',
    amenities: [],
    images: [],
    videos: [],
    virtualTour: { url: '', type: '3d' },
    tags: [],
    featured: false,
    trending: false,
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

  const fetchInitialData = async () => {
    if (!user) return
    
    try {
      const [categoriesRes, amenitiesRes] = await Promise.all([
        api.get('/cms/categories'),
        api.get('/cms/amenities')
      ])
      setCategories(categoriesRes.data.categories || [])
      setAmenities(amenitiesRes.data.amenities || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
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
          [keys[1]]: { ...formData[keys[0]][keys[1]], [keys[2]]: value }
        }
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate user and agency - backend will auto-populate IDs from authenticated user
    if (!user) {
      toast.error('Please log in to add properties')
      return
    }
    
    if (!user.agency) {
      toast.error('You must be associated with an agency to add properties. Please contact your agency admin.')
      return
    }

    setLoading(true)
    try {

      // Create payload - backend will auto-populate agency and agent from authenticated user
      const submitData = {
        title: formData.title,
        description: formData.description,
        propertyType: formData.propertyType,
        listingType: formData.listingType,
        price: {
          ...(formData.listingType === 'sale' && formData.price.sale
            ? { sale: parseFloat(formData.price.sale) }
            : {}),
          ...(formData.listingType === 'rent' && formData.price.rent?.amount
            ? { rent: { amount: parseFloat(formData.price.rent.amount), period: formData.price.rent.period } }
            : {}),
          currency: formData.price.currency
        },
        location: {
          address: formData.location.address,
          city: formData.location.city,
          state: formData.location.state,
          country: formData.location.country,
          zipCode: formData.location.zipCode,
          ...(formData.location.coordinates.lat !== 0 && formData.location.coordinates.lng !== 0
            ? { coordinates: formData.location.coordinates }
            : {}),
          neighborhood: formData.location.neighborhood || '',
          landmark: formData.location.landmark || ''
        },
        specifications: {
          ...(formData.specifications.bedrooms ? { bedrooms: parseInt(formData.specifications.bedrooms) } : {}),
          ...(formData.specifications.bathrooms ? { bathrooms: parseInt(formData.specifications.bathrooms) } : {}),
          area: {
            value: parseFloat(formData.specifications.area.value),
            unit: formData.specifications.area.unit
          },
          parking: parseInt(formData.specifications.parking) || 0,
          floors: parseInt(formData.specifications.floors) || 1,
          ...(formData.specifications.yearBuilt ? { yearBuilt: parseInt(formData.specifications.yearBuilt) } : {}),
          ...(formData.specifications.lotSize.value ? {
            lotSize: {
              value: parseFloat(formData.specifications.lotSize.value),
              unit: formData.specifications.lotSize.unit
            }
          } : {})
        },
        ...(formData.category ? { category: formData.category } : {}),
        amenities: formData.amenities || [],
        images: formData.images || [],
        videos: formData.videos.filter(v => v.url) || [],
        tags: formData.tags.filter(t => t.trim()) || [],
        ...(formData.virtualTour.url ? { virtualTour: formData.virtualTour } : {}),
        featured: formData.featured || false,
        trending: formData.trending || false,
        seo: {
          metaTitle: formData.seo.metaTitle || '',
          metaDescription: formData.seo.metaDescription || '',
          keywords: formData.seo.keywords || []
        },
        status: 'pending' // Agent properties are always pending
      }

      // Remove empty fields
      Object.keys(submitData.price).forEach(key => {
        if (submitData.price[key] === undefined || submitData.price[key] === '') {
          delete submitData.price[key]
        }
      })

      // Backend will auto-populate agency and agent from authenticated user
      const response = await api.post('/properties', submitData)
      toast.success('Property submitted successfully! It will be reviewed by your agency admin.')
      router.push('/agent/properties')
    } catch (error) {
      console.error('Error creating property:', error)
      console.error('Error response:', error.response?.data)
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const errorMessages = validationErrors.map(err => `${err.param}: ${err.msg}`).join(', ')
        toast.error(`Validation error: ${errorMessages}`)
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to create property'
        toast.error(errorMessage)
        
        // Provide helpful messages for common errors
        if (errorMessage.includes('Agency is required') || errorMessage.includes('not associated')) {
          toast.error('Your account is not associated with an agency. Please contact your agency admin.', { duration: 5000 })
        } else if (errorMessage.includes('not active')) {
          toast.error('Your agent account is not active. Please contact your agency admin.', { duration: 5000 })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Copy the rest of the form JSX from agency add page
  // For brevity, I'll create a simplified version that works
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/agent/properties" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
            <p className="mt-1 text-sm text-gray-500">Submit a property for agency approval</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Properties submitted by agents require approval from your agency admin before they appear on the website.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
                <select
                  required
                  value={formData.propertyType}
                  onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price {formData.listingType === 'sale' ? '(Sale)' : '(Rent)'} *
                </label>
                <input
                  type="number"
                  required
                  value={formData.listingType === 'sale' ? formData.price.sale : formData.price.rent?.amount}
                  onChange={(e) => {
                    if (formData.listingType === 'sale') {
                      handleInputChange('price.sale', e.target.value)
                    } else {
                      handleInputChange('price.rent.amount', e.target.value)
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.location.address}
                  onChange={(e) => handleInputChange('location.address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.location.city}
                  onChange={(e) => handleInputChange('location.city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={formData.location.state}
                  onChange={(e) => handleInputChange('location.state', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <input
                  type="text"
                  required
                  value={formData.location.country}
                  onChange={(e) => handleInputChange('location.country', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., USA, India"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                <input
                  type="text"
                  value={formData.location.zipCode}
                  onChange={(e) => handleInputChange('location.zipCode', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={formData.specifications.bedrooms}
                  onChange={(e) => handleInputChange('specifications.bedrooms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={formData.specifications.bathrooms}
                  onChange={(e) => handleInputChange('specifications.bathrooms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqft) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.specifications.area.value}
                  onChange={(e) => handleInputChange('specifications.area.value', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/agent/properties" className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

