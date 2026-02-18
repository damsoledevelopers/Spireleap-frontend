'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../../lib/api'
import { MapPin, Bed, Bath, Square, Car, Calendar, Phone, Mail, Share2, Heart, Loader2, Clock, Tag, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inquiryForm, setInquiryForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [inWishlist, setInWishlist] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  useEffect(() => {
    fetchProperty()
  }, [params.slug])

  // SEO metadata from property.seo
  useEffect(() => {
    if (!property) return

    const seo = property.seo || {}

    // Title
    if (seo.metaTitle || property.title) {
      document.title = seo.metaTitle || `${property.title} | NovaKeys`
    }

    // Description
    const descText =
      seo.metaDescription ||
      (property.description && property.description.substring(0, 155)) ||
      ''

    if (descText) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', descText)
    }

    // Keywords
    if (seo.keywords && seo.keywords.length) {
      const keywordsStr = Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords
      let metaKeywords = document.querySelector('meta[name="keywords"]')
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta')
        metaKeywords.setAttribute('name', 'keywords')
        document.head.appendChild(metaKeywords)
      }
      metaKeywords.setAttribute('content', keywordsStr)
    }
  }, [property])

  const fetchProperty = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/properties/${params.slug}`)
      setProperty(response.data.property)
    } catch (error) {
      console.error('Error fetching property:', error)
      toast.error('Failed to load property')
    } finally {
      setLoading(false)
    }
  }

  // Initialize wishlist state from property data
  useEffect(() => {
    if (property) {
      setInWishlist(!!property.inWishlist)
    }
  }, [property])

  const toggleWishlist = async () => {
    if (!user) {
      toast.error('Please login to add to wishlist')
      router.push('/auth/login')
      return
    }

    if (!property) return

    const toastId = toast.loading(inWishlist ? 'Removing from wishlist...' : 'Adding to wishlist...')
    setWishlistLoading(true)

    try {
      if (inWishlist) {
        await api.delete(`/watchlist/property/${property._id}`)
        setInWishlist(false)
        toast.success('Removed from wishlist', { id: toastId })
      } else {
        await api.post('/watchlist', { property: property._id })
        setInWishlist(true)
        toast.success('Added to wishlist', { id: toastId })
      }
    } catch (error) {
      console.error('Error updating watchlist:', error)
      toast.error('Failed to update wishlist', { id: toastId })
    } finally {
      setWishlistLoading(false)
    }
  }


  const handleInquirySubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Prepare contact data with proper structure
      const leadData = {
        property: property._id,
        contact: {
          firstName: inquiryForm.firstName || '',
          lastName: inquiryForm.lastName || '',
          email: inquiryForm.email || '',
          phone: inquiryForm.phone || ''
        },
        inquiry: {
          message: inquiryForm.message || ''
        },
        agency: property.agency?._id || property.agency || null,
        assignedAgent: property.agent?._id || property.agent || null
      }

      const response = await api.post('/leads', leadData)
      console.log('Lead created successfully:', response.data)

      toast.success('Inquiry submitted successfully! We will contact you soon.')
      setInquiryForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        message: ''
      })
    } catch (error) {
      console.error('Error submitting inquiry:', error)
      console.error('Error response:', error.response?.data)

      // Better error handling
      let errorMessage = 'Failed to submit inquiry. Please try again.'

      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.map(err => err.msg || err.message).join(', ')
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBookProperty = async (e) => {
    e.preventDefault()

    if (!user) {
      toast.error('Please login to book this property')
      router.push('/auth/login')
      return
    }

    const toastId = toast.loading('Processing booking...')

    try {
      await api.post(`/properties/${property._id}/book`)
      toast.success('Property booked successfully!', { id: toastId })

      // Update property status locally to reflect booking
      setProperty(prev => ({ ...prev, hasBooked: true }))
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error.response?.data?.message || 'Failed to book property', { id: toastId })
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'Price on request'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Property not found</p>
          <Link href="/properties" className="text-primary-600 hover:underline mt-4 inline-block">
            Back to Properties
          </Link>
        </div>
      </div>
    )
  }

  const primaryImage = property.images?.find(img => img.isPrimary) || property.images?.[0]
  const otherImages = property.images?.filter(img => img.url !== primaryImage?.url) || []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Link
          href={
            from === 'inquiries' ? "/customer/inquiries" :
              from === 'my-properties' ? "/customer/properties" :
                from === 'wishlist' ? "/customer/wishlist" :
                  "/properties"
          }
          className="text-primary-600 hover:underline mb-4 inline-block font-medium"
        >
          ← Back to {
            from === 'inquiries' ? 'My Inquiries' :
              from === 'my-properties' ? 'My Properties' :
                from === 'wishlist' ? 'My Wishlist' :
                  'Properties'
          }
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-96 bg-gray-200">
                <img
                  src={primaryImage?.url || '/placeholder-property.jpg'}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {otherImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 p-4">
                  {otherImages.slice(0, 4).map((img, idx) => (
                    <div key={idx} className="relative h-20 bg-gray-200 rounded overflow-hidden">
                      <img
                        src={img.url}
                        alt={`${property.title} ${idx + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>
                      {property.location?.address}, {property.location?.city}, {property.location?.state} {property.location?.zipCode}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary-600 mb-1">
                    {property.listingType === 'sale' && property.price?.sale
                      ? formatPrice(property.price.sale)
                      : property.listingType === 'rent' && property.price?.rent?.amount
                        ? `${formatPrice(property.price.rent.amount)}/${property.price.rent.period || 'month'}`
                        : 'Price on request'}
                  </p>
                  <span className="text-sm text-gray-500">
                    {property.listingType === 'sale' ? 'For Sale' : property.listingType === 'rent' ? 'For Rent' : 'Sale/Rent'}
                  </span>
                </div>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-t border-b border-gray-200">
                {property.specifications?.bedrooms && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bedrooms (BHK Type)</p>
                      <p className="font-semibold">{property.specifications.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.specifications?.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bathrooms</p>
                      <p className="font-semibold">{property.specifications.bathrooms}</p>
                    </div>
                  </div>
                )}
                {property.specifications?.balconies > 0 && (
                  <div className="flex items-center gap-2">
                    <Square className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Balconies</p>
                      <p className="font-semibold">{property.specifications.balconies}</p>
                    </div>
                  </div>
                )}
                {property.specifications?.livingRoom > 0 && (
                  <div className="flex items-center gap-2">
                    <Square className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Living Room</p>
                      <p className="font-semibold">{property.specifications.livingRoom}</p>
                    </div>
                  </div>
                )}
                {property.specifications?.unfurnished > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Unfurnished</p>
                      <p className="font-semibold">{property.specifications.unfurnished}</p>
                    </div>
                  </div>
                )}
                {property.specifications?.semiFurnished > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Semi-Furnished</p>
                      <p className="font-semibold">{property.specifications.semiFurnished}</p>
                    </div>
                  </div>
                )}
                {property.specifications?.fullyFurnished > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Fully Furnished</p>
                      <p className="font-semibold">{property.specifications.fullyFurnished}</p>
                    </div>
                  </div>
                )}

                {property.specifications?.area && (
                  <div className="flex items-center gap-2">
                    <Square className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Area</p>
                      <p className="font-semibold">
                        {property.specifications.area.value} {property.specifications.area.unit}
                      </p>
                    </div>
                  </div>
                )}
                {property.specifications?.parking !== undefined && (
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Parking</p>
                      <p className="font-semibold">{property.specifications.parking}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{property.description}</p>
              </div>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.amenities.map((amenity, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-700">
                        <span className="text-primary-600">✓</span>
                        <span>{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {property.location?.coordinates && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-3">Location</h2>
                  <div className="h-64 bg-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${property.location.coordinates.lat},${property.location.coordinates.lng}`}
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Wishlist Button - Placed prominently */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-700">Save for later</span>
              <button
                onClick={toggleWishlist}
                disabled={wishlistLoading}
                className={`p-3 rounded-full transition-all duration-300 ${inWishlist ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`h-6 w-6 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

            {property.status === 'active' && !property.hasBooked && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                {!user ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        toast.error('Please login to book this property')
                        router.push('/auth/login')
                      }}
                      className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 group"
                    >
                      <span>Login to Book</span>
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-2">
                      You must be logged in to book this property
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleBookProperty}
                      className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 group"
                    >
                      <span>Book Now</span>
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-2">
                      Click to instantly reserve this property
                    </p>
                  </>
                )}
              </div>
            )}

            {property.hasBooked && (
              <div className="bg-green-50 rounded-lg shadow-sm p-6 border-2 border-green-100">
                <div className="flex items-center gap-3 text-green-700 mb-2">
                  <Clock className="h-6 w-6" />
                  <h2 className="text-xl font-bold">You have already booked the property</h2>
                </div>
                <p className="text-green-600 text-sm">
                  You have booked this property. Our team will contact you shortly for confirmation.
                </p>
              </div>
            )}



            {property.status === 'sold' && (
              <div className="bg-red-50 rounded-lg shadow-sm p-6 border-2 border-red-100">
                <div className="flex items-center gap-3 text-red-700 mb-2">
                  <Tag className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Property Sold</h2>
                </div>
                <p className="text-red-600 text-sm">
                  This property is no longer available as it has been sold.
                </p>
              </div>
            )}

            {property.status === 'rented' && (
              <div className="bg-blue-50 rounded-lg shadow-sm p-6 border-2 border-blue-100">
                <div className="flex items-center gap-3 text-blue-700 mb-2">
                  <Building className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Property Rented</h2>
                </div>
                <p className="text-blue-600 text-sm">
                  This property has been rented out.
                </p>
              </div>
            )}

            {/* Inquiry Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Request Information</h2>
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={inquiryForm.firstName}
                    onChange={(e) => setInquiryForm(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={inquiryForm.lastName}
                    onChange={(e) => setInquiryForm(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={inquiryForm.email}
                  onChange={(e) => setInquiryForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={inquiryForm.phone}
                  onChange={(e) => setInquiryForm(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  placeholder="Message"
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Send Inquiry'}
                </button>
              </form>
            </div>

            {/* Agent Info */}
            {property.agent && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Contact Agent</h2>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
                    {property.agent.profileImage ? (
                      <img src={property.agent.profileImage} alt={property.agent.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {property.agent.firstName?.[0]}{property.agent.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {property.agent.firstName} {property.agent.lastName}
                    </h3>
                    {property.agent.agentInfo?.bio && (
                      <p className="text-sm text-gray-600 mt-1">{property.agent.agentInfo.bio}</p>
                    )}
                    <div className="mt-3 space-y-2">
                      {property.agent.phone && (
                        <a href={`tel:${property.agent.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600">
                          <Phone className="h-4 w-4" />
                          {property.agent.phone}
                        </a>
                      )}
                      {property.agent.email && (
                        <a href={`mailto:${property.agent.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600">
                          <Mail className="h-4 w-4" />
                          {property.agent.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agency Info */}
            {property.agency && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Agency</h2>
                <div className="flex items-center gap-3">
                  {property.agency.logo && (
                    <img src={property.agency.logo} alt={property.agency.name} className="w-12 h-12 object-contain" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{property.agency.name}</h3>
                    {property.agency.contact?.phone && (
                      <p className="text-sm text-gray-600">{property.agency.contact.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

