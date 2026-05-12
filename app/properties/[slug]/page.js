'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../../lib/api'
import { MapPin, Bed, Bath, Square, Car, Phone, Mail, Heart, Loader2, Clock, Tag, Building, ChevronLeft, ChevronRight, ExternalLink, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import PhoneField from '../../../components/Common/PhoneField'
import { buildE164Phone, splitE164Phone, DEFAULT_COUNTRY_CODE } from '../../../lib/phone'
import { useCurrency } from '../../../contexts/CurrencyContext'
import { formatMoneyFromAed } from '../../../lib/money'

const BACKEND_ORIGIN = (() => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  return apiUrl.replace(/\/api\/?$/, '')
})()

const resolveImageUrl = (raw) => {
  if (!raw) return ''

  const candidate =
    typeof raw === 'string'
      ? raw
      : (raw.url || raw.path || raw.secure_url || raw.imageUrl || raw.location || '')

  if (!candidate) return ''

  // Already absolute
  if (/^https?:\/\//i.test(candidate)) return candidate

  // Relative from backend
  if (candidate.startsWith('/')) return `${BACKEND_ORIGIN}${candidate}`

  // Likely "uploads/..." or filename
  if (candidate.startsWith('uploads/')) return `${BACKEND_ORIGIN}/${candidate}`

  return `${BACKEND_ORIGIN}/uploads/${candidate}`
}

/** Turn regulatory QR payload (e.g. listing URL) into a safe href for links. */
function regulatoryLinkHref(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const t = raw.trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  if (/^mailto:/i.test(t)) return t
  if (t.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${t}`
    }
    const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    return appOrigin ? `${appOrigin}${t}` : t
  }
  return `https://${t}`
}

function formatListedAt(value) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return String(value)
  }
}

const DISPLAY_NA = 'N/A'

function hasMeaningfulText(value) {
  return value != null && String(value).trim() !== ''
}

function formatAddressLine(location) {
  if (!location || typeof location !== 'object') return DISPLAY_NA
  const parts = [location.address, location.city, location.state, location.zipCode]
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
  return parts.length ? parts.join(', ') : DISPLAY_NA
}

/** Area: missing or invalid numeric value → N/A (avoids blank + "sqft"). */
function formatAreaLine(specifications) {
  const area = specifications?.area
  if (!area) return DISPLAY_NA
  const raw = area.value
  const unit = hasMeaningfulText(area.unit) ? String(area.unit).trim() : ''
  const num = raw === '' || raw == null ? NaN : Number(raw)
  if (Number.isFinite(num) && num > 0) {
    return unit ? `${num} ${unit}` : String(num)
  }
  if (hasMeaningfulText(raw) && !Number.isFinite(num)) {
    const t = String(raw).trim()
    return unit ? `${t} ${unit}` : t
  }
  return DISPLAY_NA
}

/** Parking: unset or 0 (common placeholder) → N/A on public listing. */
function formatParkingValue(parking) {
  if (parking == null || parking === '') return DISPLAY_NA
  const n = Number(parking)
  if (!Number.isFinite(n)) {
    return hasMeaningfulText(parking) ? String(parking).trim() : DISPLAY_NA
  }
  if (n === 0) return DISPLAY_NA
  return String(n)
}

function formatSimilarLocationLine(loc) {
  if (!loc || typeof loc !== 'object') return DISPLAY_NA
  const parts = [loc.city, loc.state].map((p) => (p == null ? '' : String(p).trim())).filter(Boolean)
  return parts.length ? parts.join(', ') : DISPLAY_NA
}

function PropertyImageGallery({ title, images }) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : []
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [safeImages.length])

  if (safeImages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="relative h-72 sm:h-96 bg-gray-200">
          <img
            src="/placeholder-property.jpg"
            alt={title || 'Property image'}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    )
  }

  const prev = () => setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length)
  const next = () => setActiveIndex((i) => (i + 1) % safeImages.length)

  const active = safeImages[activeIndex]
  const activeUrl = resolveImageUrl(active)

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative h-72 sm:h-[520px] bg-gray-200 overflow-hidden">
        <img
          src={activeUrl || '/placeholder-property.jpg'}
          alt={title || `Property image ${activeIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs px-2 py-1 rounded-full">
              {activeIndex + 1} / {safeImages.length}
            </div>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="p-4">
          <div className="flex gap-2 overflow-x-auto">
            {safeImages.map((img, idx) => {
              const url = resolveImageUrl(img)
              const isActive = idx === activeIndex
              return (
                <button
                  key={url || idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative h-16 w-24 flex-shrink-0 rounded overflow-hidden border ${isActive ? 'border-primary-600' : 'border-gray-200 hover:border-gray-300'}`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img
                    src={url || '/placeholder-property.jpg'}
                    alt={`${title || 'Property'} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const { user } = useAuth()
  const { selectedCurrency, ratesByCode } = useCurrency()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [similarProperties, setSimilarProperties] = useState([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [inquiryForm, setInquiryForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  })
  const [inquiryPhoneCountryCode, setInquiryPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [submitting, setSubmitting] = useState(false)
  const [inWishlist, setInWishlist] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const similarScrollRef = useRef(null)
  const [similarScrollEdges, setSimilarScrollEdges] = useState({ atStart: true, atEnd: true })

  const updateSimilarScrollEdges = useCallback(() => {
    const el = similarScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    const atStart = scrollLeft <= 2
    const atEnd = scrollLeft >= maxScroll - 2 || maxScroll <= 0
    setSimilarScrollEdges({ atStart, atEnd })
  }, [])

  useEffect(() => {
    if (!similarProperties.length) return
    const t = requestAnimationFrame(() => updateSimilarScrollEdges())
    return () => cancelAnimationFrame(t)
  }, [similarProperties, updateSimilarScrollEdges])

  useEffect(() => {
    const el = similarScrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => updateSimilarScrollEdges())
    ro.observe(el)
    window.addEventListener('resize', updateSimilarScrollEdges)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateSimilarScrollEdges)
    }
  }, [similarProperties.length, updateSimilarScrollEdges])

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

  const getPrimaryImageUrl = (images) => {
    const primary = images?.find((img) => img?.isPrimary)
    return (
      resolveImageUrl(primary) ||
      resolveImageUrl(images?.[0]) ||
      '/placeholder-property.jpg'
    )
  }

  const fetchSimilarProperties = async (currentProperty) => {
    if (!currentProperty?._id) return

    try {
      setSimilarLoading(true)

      const qs = new URLSearchParams()
      qs.set('status', 'active')
      qs.set('limit', '12')

      if (currentProperty.propertyType) qs.set('propertyType', currentProperty.propertyType)
      if (currentProperty.listingType && currentProperty.listingType !== 'both') qs.set('listingType', currentProperty.listingType)
      if (currentProperty.location?.city) qs.set('city', currentProperty.location.city)

      // "area" supports matching address/neighborhood/landmark in backend
      const areaHint = currentProperty.location?.neighborhood || currentProperty.location?.landmark || ''
      if (areaHint) qs.set('area', areaHint)

      const response = await api.get(`/properties?${qs.toString()}`)
      const list = Array.isArray(response.data?.properties) ? response.data.properties : []
      const filtered = list.filter((p) => String(p?._id) !== String(currentProperty._id))

      setSimilarProperties(filtered.slice(0, 6))
    } catch (error) {
      console.error('Error fetching similar properties:', error)
      setSimilarProperties([])
    } finally {
      setSimilarLoading(false)
    }
  }

  // Initialize wishlist state from property data
  useEffect(() => {
    if (property) {
      setInWishlist(!!property.inWishlist)
    }
  }, [property])

  useEffect(() => {
    if (!property?._id) return
    fetchSimilarProperties(property)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?._id])

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
      const e164Phone = inquiryForm.phone ? buildE164Phone(inquiryPhoneCountryCode, inquiryForm.phone) : ''
      if (inquiryForm.phone && !e164Phone) {
        toast.error('Enter a valid phone number for the selected country')
        setSubmitting(false)
        return
      }
      // Prepare contact data with proper structure
      const leadData = {
        property: property._id,
        contact: {
          firstName: inquiryForm.firstName || '',
          lastName: inquiryForm.lastName || '',
          email: inquiryForm.email || '',
          phone: e164Phone
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
      setInquiryPhoneCountryCode(DEFAULT_COUNTRY_CODE)
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

  useEffect(() => {
    const parsed = splitE164Phone(inquiryForm.phone)
    setInquiryPhoneCountryCode(parsed.countryCode || DEFAULT_COUNTRY_CODE)
    if (parsed.phone !== inquiryForm.phone) {
      setInquiryForm((prev) => ({ ...prev, phone: parsed.phone || '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const formatPrice = (price) => formatMoneyFromAed(price, selectedCurrency, ratesByCode, { minimumFractionDigits: 0 })

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

  const orderedImages = Array.isArray(property.images) ? property.images : []
  const reg = property.regulatoryInformation || {}
  const qrHref = regulatoryLinkHref(reg.qrValue)
  const qrImageSrc = resolveImageUrl(reg.qrImage)
  const hasRegulatoryDetails = !!(
    reg.reference ||
    reg.listedAt ||
    reg.brokerLicense ||
    reg.agencyName ||
    reg.zoneName ||
    reg.agentLicense ||
    reg.dldPermitNumber ||
    qrImageSrc ||
    reg.qrValue
  )

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

        {/* First row: images only (matches requested layout) */}
        <div className="mb-8">
          <PropertyImageGallery
            title={hasMeaningfulText(property.title) ? property.title : DISPLAY_NA}
            images={orderedImages}
          />
        </div>

        {/* Second row: all other sections below images */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {hasMeaningfulText(property.title) ? property.title : DISPLAY_NA}
                  </h1>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-2 shrink-0" />
                    <span>{formatAddressLine(property.location)}</span>
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

                <div className="flex items-center gap-2">
                  <Square className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Area</p>
                    <p className="font-semibold">{formatAreaLine(property.specifications)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Parking</p>
                    <p className="font-semibold">{formatParkingValue(property.specifications?.parking)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">
                  {hasMeaningfulText(property.description) ? property.description : DISPLAY_NA}
                </p>
              </div>

              {/* Property details (regulatory + QR → opens qrValue URL) */}
              {hasRegulatoryDetails && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary-600" />
                    Property details
                  </h2>
                  <div
                    className={`grid gap-6 ${
                      qrImageSrc || qrHref ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    <div className="space-y-3 text-sm">
                      {reg.reference && (
                        <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-baseline">
                          <span className="text-gray-500 shrink-0 sm:w-36">Reference</span>
                          <span className="font-medium text-gray-900">{reg.reference}</span>
                        </div>
                      )}
                      {reg.listedAt && (
                        <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-baseline">
                          <span className="text-gray-500 shrink-0 sm:w-36">Listed at</span>
                          <span className="font-medium text-gray-900">{formatListedAt(reg.listedAt)}</span>
                        </div>
                      )}
                      {reg.brokerLicense && (
                        <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-baseline">
                          <span className="text-gray-500 shrink-0 sm:w-36">Broker license</span>
                          <span className="font-medium text-gray-900">{reg.brokerLicense}</span>
                        </div>
                      )}
                      {reg.agencyName && (
                        <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-baseline">
                          <span className="text-gray-500 shrink-0 sm:w-36">Agency name</span>
                          <span className="font-medium text-gray-900">{reg.agencyName}</span>
                        </div>
                      )}
                      {reg.zoneName && (
                        <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-baseline">
                          <span className="text-gray-500 shrink-0 sm:w-36">Zone</span>
                          <span className="font-medium text-gray-900">{reg.zoneName}</span>
                        </div>
                      )}
                      {reg.agentLicense && (
                        <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-baseline">
                          <span className="text-gray-500 shrink-0 sm:w-36">Agent license</span>
                          <span className="font-medium text-gray-900">{reg.agentLicense}</span>
                        </div>
                      )}
                      {reg.dldPermitNumber && (
                        <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-baseline">
                          <span className="text-gray-500 shrink-0 sm:w-36">DLD permit</span>
                          <span className="font-medium text-gray-900">{reg.dldPermitNumber}</span>
                        </div>
                      )}
                    </div>

                    {(qrImageSrc || qrHref) && (
                      <div className="flex flex-col items-center md:items-stretch gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 max-w-sm md:max-w-none">
                        <p className="text-sm font-medium text-gray-700 flex items-center justify-center md:justify-start gap-2">
                          <QrCode className="h-4 w-4 text-primary-600" />
                          Listing QR
                        </p>
                        {qrImageSrc && (
                          <div className="flex justify-center md:justify-start">
                            <img
                              src={qrImageSrc}
                              alt="Uploaded listing QR code"
                              className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg border border-gray-200 bg-white p-3 shadow-sm overflow-hidden"
                            />
                          </div>
                        )}
                        {qrHref ? (
                          <a
                            href={qrHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 shadow-sm transition"
                          >
                            <ExternalLink className="h-4 w-4 shrink-0" />
                            Open link from QR
                          </a>
                        ) : qrImageSrc ? (
                          <p className="text-xs text-gray-500 text-center md:text-left">
                            Add a QR value (URL) for this listing to enable the button below the image.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                    <div className="h-64 bg-gray-200 rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${property.location.coordinates.lat},${property.location.coordinates.lng}`}
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="h-64 bg-gray-100 border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-6">
                      <div className="text-center text-gray-600">
                        <p className="font-medium">Google Maps API key not configured</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Set <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code className="bg-gray-200 px-1 rounded">.env.local</code>.
                        </p>
                      </div>
                    </div>
                  )}
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
                <PhoneField
                  required
                  label=""
                  countryCodeName="inquiryPhoneCountryCode"
                  phoneName="phone"
                  countryCodeValue={inquiryPhoneCountryCode}
                  phoneValue={inquiryForm.phone}
                  onCountryCodeChange={(value) => setInquiryPhoneCountryCode(value)}
                  onPhoneChange={(value) => setInquiryForm(prev => ({ ...prev, phone: value }))}
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
                      {[property.agent.firstName, property.agent.lastName].filter(Boolean).join(' ').trim() ||
                        DISPLAY_NA}
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
                    <div className="w-12 h-12 overflow-hidden rounded bg-white border border-gray-200">
                      <img src={property.agency.logo} alt={property.agency.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {hasMeaningfulText(property.agency?.name) ? property.agency.name : DISPLAY_NA}
                    </h3>
                    {property.agency.contact?.phone && (
                      <p className="text-sm text-gray-600">{property.agency.contact.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Properties */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Similar Properties</h2>
            <Link href="/properties" className="text-sm font-medium text-primary-600 hover:underline">
              View all
            </Link>
          </div>

          {similarLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : similarProperties.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-gray-600">
              No similar properties found.
            </div>
          ) : (
            <div className="flex items-stretch gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Scroll similar properties left"
                disabled={similarScrollEdges.atStart}
                onClick={() => {
                  similarScrollRef.current?.scrollBy({ left: -280, behavior: 'smooth' })
                }}
                className="flex shrink-0 self-center h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <div
                ref={similarScrollRef}
                onScroll={updateSimilarScrollEdges}
                className="flex min-w-0 flex-1 gap-5 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
              {similarProperties.map((p) => (
                <Link
                  key={p._id}
                  href={`/properties/${p.slug || p._id}`}
                  className="min-w-[260px] max-w-[260px] shrink-0 bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-40 bg-gray-200">
                    <img
                      src={getPrimaryImageUrl(p.images)}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-white/95 text-gray-900 px-2 py-1 rounded text-xs font-semibold">
                      {p.listingType === 'sale' ? 'For Sale' : p.listingType === 'rent' ? 'For Rent' : 'Sale/Rent'}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-primary-600 font-bold text-lg mb-1">
                      {p.listingType === 'sale' && p.price?.sale
                        ? formatPrice(p.price.sale)
                        : p.listingType === 'rent' && p.price?.rent?.amount
                          ? `${formatPrice(p.price.rent.amount)}/${p.price.rent.period || 'month'}`
                          : 'Price on request'}
                    </p>
                    <p className="text-sm text-gray-900 font-semibold line-clamp-1">
                      {hasMeaningfulText(p.title) ? p.title : DISPLAY_NA}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-1">{formatSimilarLocationLine(p.location)}</p>

                    <div className="flex items-center gap-3 text-gray-600 text-xs mt-3">
                      {p.specifications?.bedrooms !== undefined && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          <span>{p.specifications.bedrooms}</span>
                        </div>
                      )}
                      {p.specifications?.bathrooms !== undefined && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          <span>{p.specifications.bathrooms}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Square className="h-4 w-4" />
                        <span>{formatAreaLine(p.specifications)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              </div>
              <button
                type="button"
                aria-label="Scroll similar properties right"
                disabled={similarScrollEdges.atEnd}
                onClick={() => {
                  similarScrollRef.current?.scrollBy({ left: 280, behavior: 'smooth' })
                }}
                className="flex shrink-0 self-center h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

