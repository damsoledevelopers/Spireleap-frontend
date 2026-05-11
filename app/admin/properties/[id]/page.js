'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import {
  ArrowLeft,
  Edit,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Calendar,
  Building,
  User,
  DollarSign,
  Package,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AdminPropertyViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    fetchProperty()
  }, [params.id])

  const fetchProperty = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/properties/${params.id}`)
      setProperty(response.data.property)
    } catch (error) {
      console.error('Error fetching property:', error)
      toast.error('Failed to load property')
      router.push('/admin/properties')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A'
    const toCurrency = (value) => {
      const numeric = Number(value)
      return Number.isFinite(numeric) ? `$${numeric.toLocaleString()}` : null
    }

    if (typeof price === 'object') {
      if (price.sale !== undefined && price.sale !== null && price.sale !== '') {
        return toCurrency(price.sale) || 'N/A'
      }
      if (price.rent?.amount !== undefined && price.rent?.amount !== null && price.rent?.amount !== '') {
        const rentAmount = toCurrency(price.rent.amount)
        return rentAmount ? `${rentAmount}/${price.rent.period || 'monthly'}` : 'N/A'
      }
      return 'N/A'
    }
    return toCurrency(price) || 'N/A'
  }

  const getImageUrl = (image) => {
    if (typeof image === 'string') return image
    return image?.url || image
  }

  const getOrderedImages = () => {
    const images = Array.isArray(property?.images) ? property.images.filter(Boolean) : []
    if (images.length <= 1) return images
    const primaryIndex = images.findIndex((img) => img?.isPrimary)
    if (primaryIndex <= 0) return images
    return [images[primaryIndex], ...images.filter((_, idx) => idx !== primaryIndex)]
  }

  const orderedImages = getOrderedImages()

  useEffect(() => {
    setActiveImageIndex(0)
  }, [property?.id, property?._id, orderedImages.length])

  useEffect(() => {
    if (!property) return
    const name = property.title?.trim() || 'Property'
    document.title = `${name} · Admin`
  }, [property])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!property) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Property not found</p>
          <Link href="/admin/properties" className="text-primary-600 hover:underline mt-4 inline-block">
            Back to Properties
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const activeImage = orderedImages[activeImageIndex]
  const totalImages = orderedImages.length
  const canSlide = totalImages > 1

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/properties" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 pr-4">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight break-words">
                {property.title?.trim() || 'Untitled property'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Property details</p>
            </div>
          </div>
          <Link
            href={`/admin/properties/${params.id}/edit`}
            className="btn btn-primary flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Property
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-96 bg-gray-200">
                {activeImage ? (
                  <img
                    src={getImageUrl(activeImage)}
                    alt={property.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/placeholder-property.jpg'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                {canSlide && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {activeImageIndex + 1}/{totalImages}
                    </span>
                  </>
                )}
              </div>
              {orderedImages.length > 1 && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 p-4">
                  {orderedImages.map((img, idx) => (
                    <button
                      key={`${getImageUrl(img)}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-20 bg-gray-200 rounded overflow-hidden border-2 ${
                        idx === activeImageIndex ? 'border-primary-600' : 'border-transparent'
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img
                        src={getImageUrl(img)}
                        alt={`${property.title} ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Location</h2>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-2 shrink-0" />
                    <span>
                      {property.location?.address && `${property.location.address}, `}
                      {property.location?.city}, {property.location?.state}
                      {property.location?.zipCode && ` ${property.location.zipCode}`}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full ${
                  property.status === 'active' ? 'bg-green-100 text-green-800' :
                  property.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                  property.status === 'rented' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {property.status}
                </span>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{property.description || 'No description available'}</p>
              </div>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Bed className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Bedrooms</p>
                    <p className="font-semibold">{property.specifications?.bedrooms || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Bathrooms</p>
                    <p className="font-semibold">{property.specifications?.bathrooms || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Square className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Area</p>
                    <p className="font-semibold">
                      {property.specifications?.area?.value || 0} {property.specifications?.area?.unit || 'sqft'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Parking</p>
                    <p className="font-semibold">{property.specifications?.parking || 0}</p>
                  </div>
                </div>
              </div>
              {property.specifications?.yearBuilt && (
                <div className="mt-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Year Built: {property.specifications.yearBuilt}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold">Price</h3>
              </div>
              <p className="text-3xl font-bold text-primary-600 mb-2">
                {formatPrice(property.price)}
              </p>
              <p className="text-sm text-gray-500 capitalize">
                {property.listingType === 'sale' ? 'For Sale' : property.listingType === 'rent' ? 'For Rent' : property.listingType}
              </p>
              <p className="text-sm text-gray-500 capitalize mt-1">
                Type: {property.propertyType}
              </p>
            </div>

            {/* Agency & Agent Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Agency & Agent</h3>
              {property.agency && (
                <div className="mb-4 pb-4 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Agency</span>
                  </div>
                  <p className="text-gray-700">{property.agency.name || 'N/A'}</p>
                </div>
              )}
              {property.agent && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Agent</span>
                  </div>
                  <p className="text-gray-700">
                    {property.agent.firstName} {property.agent.lastName}
                  </p>
                  {property.agent.email && (
                    <p className="text-sm text-gray-500 mt-1">{property.agent.email}</p>
                  )}
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Property ID:</span>
                  <span className="text-gray-900 font-mono text-xs">{property._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Views:</span>
                  <span className="text-gray-900">{property.viewCount || 0}</span>
                </div>
                {property.featured && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Featured:</span>
                    <span className="text-green-600 font-medium">Yes</span>
                  </div>
                )}
                {property.trending && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trending:</span>
                    <span className="text-green-600 font-medium">Yes</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

