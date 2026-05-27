'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { formatBedroomLabel } from '../../../../lib/propertyOptions'
import {
  ArrowLeft,
  Edit,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Calendar,
  Building,
  User,
  Banknote,
  ExternalLink,
  QrCode
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatPropertyPrice } from '../../../../lib/money'
import PropertyMediaGallery from '../../../../components/Property/PropertyMediaGallery'

export default function AdminPropertyViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

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
    const formatted = formatPropertyPrice(price)
    return formatted === 'Price on request' ? 'N/A' : formatted
  }

  const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== ''

  const getImageUrl = (image) => {
    if (typeof image === 'string') return image
    return image?.url || image
  }
  const regulatory = property?.regulatoryInformation || {}
  const location = property?.location || {}
  const specifications = property?.specifications || {}
  const qrHref = regulatory.qrValue
    ? /^https?:\/\//i.test(regulatory.qrValue)
      ? regulatory.qrValue
      : `https://${regulatory.qrValue}`
    : ''
  const amenityNames = Array.isArray(property?.amenities)
    ? property.amenities.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean)
    : []
  const categoryName = typeof property?.category === 'object' ? property?.category?.name : property?.category

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
            <PropertyMediaGallery
              title={property.title}
              images={property.images}
              floorPlanImages={property.floorPlanImages}
              videos={property.videos}
              agent={property.agent}
            />

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

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">Complete Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p><span className="text-gray-500">Address:</span> <span className="text-gray-900">{location.address || 'N/A'}</span></p>
                  <p><span className="text-gray-500">City:</span> <span className="text-gray-900">{location.city || 'N/A'}</span></p>
                  <p><span className="text-gray-500">State:</span> <span className="text-gray-900">{location.state || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Country:</span> <span className="text-gray-900">{location.country || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Zip Code:</span> <span className="text-gray-900">{location.zipCode || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Neighborhood:</span> <span className="text-gray-900">{location.neighborhood || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Landmark:</span> <span className="text-gray-900">{location.landmark || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Coordinates:</span> <span className="text-gray-900">
                    {hasValue(location.coordinates?.lat) && hasValue(location.coordinates?.lng)
                      ? `${location.coordinates.lat}, ${location.coordinates.lng}`
                      : 'N/A'}
                  </span></p>
                </div>
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
                    <p className="font-semibold">{formatBedroomLabel(property.specifications) || property.specifications?.bedrooms || 0}</p>
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
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p><span className="text-gray-500">Balconies:</span> <span className="text-gray-900">{specifications.balconies ?? 0}</span></p>
                <p><span className="text-gray-500">Living Room:</span> <span className="text-gray-900">{specifications.livingRoom ?? 0}</span></p>
                <p><span className="text-gray-500">Floors:</span> <span className="text-gray-900">{specifications.floors ?? 'N/A'}</span></p>
                <p><span className="text-gray-500">Lot Size:</span> <span className="text-gray-900">
                  {hasValue(specifications.lotSize?.value)
                    ? `${specifications.lotSize.value} ${specifications.lotSize.unit || ''}`.trim()
                    : 'N/A'}
                </span></p>
                <p><span className="text-gray-500">Unfurnished:</span> <span className="text-gray-900">{specifications.unfurnished ?? 0}</span></p>
                <p><span className="text-gray-500">Semi-Furnished:</span> <span className="text-gray-900">{specifications.semiFurnished ?? 0}</span></p>
                <p><span className="text-gray-500">Fully Furnished:</span> <span className="text-gray-900">{specifications.fullyFurnished ?? 0}</span></p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Regulatory Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p><span className="text-gray-500">Reference:</span> <span className="text-gray-900">{regulatory.reference || 'N/A'}</span></p>
                <p><span className="text-gray-500">Listed At:</span> <span className="text-gray-900">{regulatory.listedAt ? new Date(regulatory.listedAt).toLocaleDateString() : 'N/A'}</span></p>
                <p><span className="text-gray-500">Broker License:</span> <span className="text-gray-900">{regulatory.brokerLicense || 'N/A'}</span></p>
                <p><span className="text-gray-500">Agency Name:</span> <span className="text-gray-900">{regulatory.agencyName || 'N/A'}</span></p>
                <p><span className="text-gray-500">Zone Name:</span> <span className="text-gray-900">{regulatory.zoneName || 'N/A'}</span></p>
                <p><span className="text-gray-500">Agent License:</span> <span className="text-gray-900">{regulatory.agentLicense || 'N/A'}</span></p>
                <p><span className="text-gray-500">DLD Permit:</span> <span className="text-gray-900">{regulatory.dldPermitNumber || 'N/A'}</span></p>
                {/* <p>
                  <span className="text-gray-500">QR Value:</span>{' '}
                  {regulatory.qrValue ? (
                    <a
                      href={qrHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline break-all"
                    >
                      {regulatory.qrValue}
                    </a>
                  ) : (
                    <span className="text-gray-900">N/A</span>
                  )}
                </p> */}
              </div>
              {(regulatory.qrImage || regulatory.qrValue) && (
                <div className="mt-4 flex items-start gap-4">
                  {regulatory.qrImage ? (
                    <div className="border rounded-lg p-2 bg-white w-28 h-28 overflow-hidden">
                      <img src={getImageUrl(regulatory.qrImage)} alt="QR" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-2 bg-gray-50 w-28 h-28 overflow-hidden flex items-center justify-center">
                      <QrCode className="h-6 w-6 text-gray-400" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {regulatory.qrValue ? (
                      <a
                        href={qrHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 w-fit"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Open QR Link</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                    {regulatory.qrValue && !regulatory.qrImage ? (
                      <p className="text-xs text-red-600">
                        QR image is missing. Upload QR image to display it on the listing.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Banknote className="h-5 w-5 text-primary-600" />
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
              <p className="text-sm text-gray-500 mt-1">
                Currency: {property.price?.currency || 'AED'}
              </p>
              {property.price?.rent?.amount && (
                <p className="text-sm text-gray-500 mt-1">
                  Rent Cycle: {property.price.rent.period || 'monthly'}
                </p>
              )}
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
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Category:</span>
                  <span className="text-gray-900 text-right">{categoryName || 'N/A'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Amenities:</span>
                  <span className="text-gray-900 text-right">{amenityNames.length ? amenityNames.join(', ') : 'N/A'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Tags:</span>
                  <span className="text-gray-900 text-right">{Array.isArray(property.tags) && property.tags.length ? property.tags.join(', ') : 'N/A'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Virtual Tour:</span>
                  <span className="text-gray-900 text-right">
                    {property.virtualTour?.url ? (
                      <a href={property.virtualTour.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        {property.virtualTour.type || '3D Tour'}
                      </a>
                    ) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Videos:</span>
                  <span className="text-gray-900">{Array.isArray(property.videos) ? property.videos.filter((v) => v?.url).length : 0}</span>
                </div>
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

