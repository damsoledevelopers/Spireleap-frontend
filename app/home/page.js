'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'
import { 
  Search, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  ArrowRight, 
  Star, 
  Home, 
  Shield, 
  TrendingUp, 
  Users,
  Building2,
  DollarSign,
  ChevronDown,
  ChevronLeft,
  Calendar,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function HomePage() {
  const router = useRouter()
  const [featuredProperties, setFeaturedProperties] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [blogs, setBlogs] = useState([])
  const [banners, setBanners] = useState([])
  const [categories, setCategories] = useState([])
  const [amenities, setAmenities] = useState([])
  const [homePageContent, setHomePageContent] = useState(null)
  const [seoData, setSeoData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0)
  const [windowWidth, setWindowWidth] = useState(0)
  const [searchFilters, setSearchFilters] = useState({
    propertyType: '',
    listingType: '',
    city: '',
    minPrice: '',
    maxPrice: ''
  })

  useEffect(() => {
    fetchHomePageContent()
    fetchFeaturedProperties()
    fetchTestimonials()
    fetchBlogs()
    fetchBanners()
    fetchCategories()
    fetchAmenities()
    
    // Set initial window width
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth)
      
      // Handle window resize
      const handleResize = () => {
        setWindowWidth(window.innerWidth)
        setCurrentPropertyIndex(0) // Reset to first slide on resize
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const fetchHomePageContent = async () => {
    try {
      const response = await api.get('/cms/pages/home')
      if (response.data.page) {
        try {
          const contentData = JSON.parse(response.data.page.content || '{}')
          console.log('Homepage content fetched:', contentData)
          console.log('Stats from CMS:', contentData.stats)
          setHomePageContent(contentData)
        } catch (e) {
          console.error('Error parsing homepage content:', e)
          // Content is not JSON, ignore
        }
        // Set SEO data from page
        if (response.data.page.seo) {
          setSeoData(response.data.page.seo)
        }
      }
    } catch (error) {
      console.error('Error fetching homepage content:', error)
    }
  }

  const fetchFeaturedProperties = async () => {
    try {
      const response = await api.get('/properties?status=active&featured=true')
      setFeaturedProperties(response.data.properties || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTestimonials = async () => {
    try {
      const response = await api.get('/cms/testimonials?featured=true&limit=3')
      setTestimonials(response.data.testimonials || [])
    } catch (error) {
      console.error('Error fetching testimonials:', error)
      // Fallback to default testimonials if API fails
      setTestimonials([
        {
          name: 'Sarah Johnson',
          role: 'Property Buyer',
          content: 'Found my dream home in just 2 weeks! The team was professional and helpful throughout the process.',
          rating: 5
        },
        {
          name: 'Michael Chen',
          role: 'Investor',
          content: 'Excellent service and great property recommendations. Highly recommend for real estate investments.',
          rating: 5
        },
        {
          name: 'Emily Rodriguez',
          role: 'First-time Buyer',
          content: 'The agents made the entire process smooth and stress-free. Couldn\'t be happier with my new home!',
          rating: 5
        }
      ])
    }
  }

  const fetchBlogs = async () => {
    try {
      const response = await api.get('/cms/blogs?limit=6')
      setBlogs(response.data.blogs || [])
    } catch (error) {
      console.error('Error fetching blogs:', error)
    }
  }

  const fetchBanners = async () => {
    try {
      const response = await api.get('/cms/banners?position=home&limit=5')
      setBanners(response.data.banners || [])
    } catch (error) {
      console.error('Error fetching banners:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/cms/categories?limit=8')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchAmenities = async () => {
    try {
      const response = await api.get('/cms/amenities?limit=12')
      setAmenities(response.data.amenities || [])
    } catch (error) {
      console.error('Error fetching amenities:', error)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const stripHtml = (html) => {
    if (!html) return ''
    // Remove HTML tags and decode HTML entities
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  const handleSearch = () => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(searchFilters).filter(([_, v]) => v))
    )

    // Always enforce active properties on public search
    params.set('status', 'active')

    // Redirect to properties page with filters applied
    if (params.toString()) {
      router.push(`/properties?${params}`)
    } else {
      router.push('/properties')
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

  const getPrimaryImage = (images) => {
    const primary = images?.find(img => img.isPrimary)
    return primary?.url || images?.[0]?.url || '/placeholder-property.jpg'
  }

  // Icon mapping for features
  const iconMap = {
    'Home': Home,
    'Shield': Shield,
    'TrendingUp': TrendingUp,
    'Users': Users,
    '🏠': Home,
    '🛡️': Shield,
    '📈': TrendingUp,
    '👥': Users
  }

  const getIcon = (iconName) => {
    if (typeof iconName === 'string' && iconMap[iconName]) {
      return iconMap[iconName]
    }
    return Home // Default icon
  }

  const features = homePageContent?.features?.filter(f => f.title && f.description).length > 0
    ? homePageContent.features.filter(f => f.title && f.description).map(f => {
        const iconStr = f.icon || ''
        const isEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(iconStr)
        return {
          icon: isEmoji ? Home : getIcon(iconStr), // Use Home as fallback for emoji
          iconName: iconStr, // Store original string for emoji rendering
          title: f.title,
          description: f.description
        }
      })
    : [
        {
          icon: Home,
          title: 'Premium Properties',
          description: 'Discover luxury homes and apartments in prime locations'
        },
        {
          icon: Shield,
          title: 'Verified Listings',
          description: 'All properties are verified and authentic'
        },
        {
          icon: TrendingUp,
          title: 'Best Investment',
          description: 'Find properties with the best ROI potential'
        },
        {
          icon: Users,
          title: 'Expert Agents',
          description: 'Work with experienced real estate professionals'
        }
      ]

  // Get stats from CMS or use defaults
  const getStats = () => {
    if (homePageContent?.stats && Array.isArray(homePageContent.stats)) {
      const validStats = homePageContent.stats.filter(s => s && s.number && s.label && s.number.trim() && s.label.trim())
      if (validStats.length > 0) {
        return validStats
      }
    }
    // Default stats if CMS data is not available
    return [
      { number: '500+', label: 'Properties Listed' },
      { number: '200+', label: 'Happy Clients' },
      { number: '50+', label: 'Expert Agents' },
      { number: '15+', label: 'Years Experience' }
    ]
  }

  const stats = getStats()


  // Set SEO metadata
  useEffect(() => {
    if (seoData) {
      // Update document title
      if (seoData.metaTitle) {
        document.title = seoData.metaTitle
      }
      
      // Update or create meta description
      let metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', seoData.metaDescription || '')
      } else {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        metaDescription.setAttribute('content', seoData.metaDescription || '')
        document.head.appendChild(metaDescription)
      }
      
      // Update or create meta keywords
      let metaKeywords = document.querySelector('meta[name="keywords"]')
      if (metaKeywords) {
        const keywordsStr = Array.isArray(seoData.keywords) 
          ? seoData.keywords.join(', ') 
          : seoData.keywords || ''
        metaKeywords.setAttribute('content', keywordsStr)
      } else {
        metaKeywords = document.createElement('meta')
        metaKeywords.setAttribute('name', 'keywords')
        const keywordsStr = Array.isArray(seoData.keywords) 
          ? seoData.keywords.join(', ') 
          : seoData.keywords || ''
        metaKeywords.setAttribute('content', keywordsStr)
        document.head.appendChild(metaKeywords)
      }
    }
  }, [seoData])

  return (
    <div className="min-h-screen bg-logo-offWhite">
      <Header />

      {/* Hero Section - Enhanced Modern Design */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 via-primary-700 to-primary-600">
        {/* Enhanced Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-gold-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-3000"></div>
          {/* Additional subtle particles */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNHYtNGgtMnY0aC00djJoNHY0aDJ2LTRoNHYtMmgtNHptMC0zMFYwaC0ydjRoLTR2Mmg0djRoMlY2aDRWNGgtNHpNNiAzNHYtNEg0djRIMHYyaDR2NGgydi00aDR2LTJINnptMC0zMFYwSDR2NEgwdjJoNHY0aDJWNmg0VjRINnoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center animate-fade-in-up">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center px-5 py-2.5 mb-8 bg-white/15 backdrop-blur-md rounded-full border border-white/30 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <span className="text-sm font-bold text-white tracking-wide">🏆 #1 Real Estate Platform</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-6 text-white leading-tight animate-fade-in-up animation-delay-200">
              <span className="bg-gradient-to-r from-gold-400 via-gold-300 to-gold-200 bg-clip-text text-transparent drop-shadow-2xl animate-gradient">
                {homePageContent?.heroTitle || 'Find Your Dream'}
              </span>
              {homePageContent?.heroSubtitle && (
                <>
                  <br />
                  <span className="text-white drop-shadow-lg animate-fade-in-up animation-delay-400">{homePageContent.heroSubtitle}</span>
                </>
              )}
              {!homePageContent?.heroSubtitle && (
                <>
                  <br />
                  <span className="text-white drop-shadow-lg animate-fade-in-up animation-delay-400">Property Today</span>
                </>
              )}
            </h1>
            
            <p className="text-xl md:text-2xl lg:text-3xl mb-12 text-gray-100 max-w-4xl mx-auto leading-relaxed font-light animate-fade-in-up animation-delay-600">
              {homePageContent?.heroDescription || 'Discover premium homes, luxury apartments, and prime commercial properties in the world\'s best locations'}
            </p>

            {/* Enhanced Modern Search Bar */}
            <div className="max-w-6xl mx-auto bg-gradient-to-br from-white via-gold-50/90 to-cream-50 rounded-3xl shadow-2xl p-6 md:p-8 lg:p-10 border-2 border-gold-200/60 transform hover:scale-[1.01] hover:shadow-2xl hover:shadow-gold-500/30 transition-all duration-500 animate-fade-in-up animation-delay-800 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5">
                {/* Property Type */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2.5 uppercase tracking-wider">
                    <Building2 className="h-4 w-4 text-primary-600" />
                    Property Type
                  </label>
                  <div className="relative custom-select-wrapper">
                    <select
                      value={searchFilters.propertyType}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, propertyType: e.target.value }))}
                      className="w-full px-4 py-3.5 pl-11 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 font-medium text-base transition-all duration-200 hover:border-primary-400 hover:shadow-md bg-white shadow-sm appearance-none cursor-pointer"
                      style={{ 
                        backgroundImage: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
                    >
                      <option value="" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>All Property Types</option>
                      <option value="apartment" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>Apartment</option>
                      <option value="house" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>House</option>
                      <option value="villa" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>Villa</option>
                      <option value="condo" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>Condo</option>
                      <option value="commercial" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>Commercial</option>
                    </select>
                    <Building2 className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
                    <ChevronDown className="absolute right-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Listing Type */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2.5 uppercase tracking-wider">
                    <DollarSign className="h-4 w-4 text-gold-500" />
                    Listing Type
                  </label>
                  <div className="relative custom-select-wrapper">
                    <select
                      value={searchFilters.listingType}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, listingType: e.target.value }))}
                      className="w-full px-4 py-3.5 pl-11 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 font-medium text-base transition-all duration-200 hover:border-primary-400 hover:shadow-md bg-white shadow-sm appearance-none cursor-pointer"
                      style={{ 
                        backgroundImage: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
                    >
                      <option value="" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>Sale/Rent</option>
                      <option value="sale" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>For Sale</option>
                      <option value="rent" style={{ padding: '14px 20px', color: '#1f2937', backgroundColor: '#ffffff' }}>For Rent</option>
                    </select>
                    <DollarSign className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
                    <ChevronDown className="absolute right-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2.5 uppercase tracking-wider">
                    <MapPin className="h-4 w-4 text-primary-600" />
                    Location
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter city..."
                      value={searchFilters.city}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3.5 pl-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 font-medium text-base transition-all duration-200 hover:border-gray-400 placeholder-gray-400 bg-white shadow-sm"
                    />
                    <MapPin className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Enhanced Search Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    className="w-full bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white px-6 py-3.5 rounded-xl hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 font-bold flex items-center justify-center gap-2.5 shadow-xl hover:shadow-2xl hover:shadow-primary-900/50 transform hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                    <Search className="h-5 w-5 relative z-10" />
                    <span className="relative z-10">Search</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center shadow-lg backdrop-blur-sm">
              <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
            </div>
            <span className="text-white/80 text-xs font-medium tracking-wider">Scroll</span>
          </div>
        </div>
      </section>

      {/* Banners Section - From CMS */}
      {banners.length > 0 && (
        <section className="py-12 bg-logo-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map((banner) => (
                <Link
                  key={banner._id}
                  href={banner.link || '#'}
                  className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  <div className="relative h-48 md:h-64">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-xl font-bold mb-2">{banner.title}</h3>
                      {banner.description && (
                        <p className="text-sm text-white/90 line-clamp-2">{banner.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats Section - Enhanced Modern Design */}
      <section className="relative py-28 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 mb-4 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold border border-white/30">
              Our Achievements
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              We've helped countless clients find their dream properties
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="group relative bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-10 border border-white/20 hover:bg-white/20 transition-all duration-500 transform hover:-translate-y-3 hover:shadow-2xl hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/30 via-transparent to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative text-center">
                  <div className="text-5xl md:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-gold-300 via-gold-200 to-white bg-clip-text text-transparent mb-4 drop-shadow-lg">
                    {stat.number}
                  </div>
                  <div className="text-white/95 font-bold text-base md:text-lg">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties - Enhanced Modern Cards */}
      <section className="py-28 bg-gradient-to-b from-logo-offWhite via-white to-logo-offWhite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block px-5 py-2.5 mb-5 bg-gradient-to-r from-primary-500/20 to-gold-400/20 text-primary-700 border border-primary-300/50 rounded-full text-sm font-bold tracking-wide shadow-sm">
              ✨ Premium Listings
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 bg-clip-text text-transparent mb-5 leading-tight">
              Featured Properties
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Explore our handpicked selection of premium properties in prime locations
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-primary-400 opacity-20"></div>
              </div>
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                <Home className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-xl text-gray-500 font-medium">No featured properties available</p>
              <p className="text-sm text-gray-400 mt-2">Check back soon for new listings</p>
            </div>
          ) : (() => {
            // Calculate items per view based on screen size
            const getItemsPerView = () => {
              if (windowWidth === 0) return 3 // Default during SSR
              if (windowWidth >= 1280) return 4 // xl: 4 items
              if (windowWidth >= 1024) return 3 // lg: 3 items
              if (windowWidth >= 768) return 2  // md: 2 items
              return 1 // sm: 1 item
            }
            
            const itemsPerView = getItemsPerView()
            const maxIndex = Math.max(0, Math.ceil(featuredProperties.length / itemsPerView) - 1)
            const translateX = currentPropertyIndex * (100 / itemsPerView)
            
            return (
            <div className="relative">
              {/* Carousel Container */}
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-in-out gap-8 lg:gap-10"
                  style={{
                    transform: `translateX(-${translateX}%)`
                  }}
                >
                  {featuredProperties.map((property) => (
                    <div
                      key={property._id}
                      className="flex-shrink-0"
                      style={{
                        width: `${100 / itemsPerView}%`
                      }}
                    >
                      <Link
                        href={`/properties/${property.slug || property._id}`}
                        className="group relative bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100 hover:border-primary-200 block"
                      >
                        {/* Image Container */}
                        <div className="relative h-80 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                          <img
                            src={getPrimaryImage(property.images)}
                            alt={property.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            loading="lazy"
                          />
                          {/* Enhanced Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          {/* Shine effect on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                          
                          {/* Badges */}
                          <div className="absolute top-4 left-4 flex flex-col gap-2">
                            <span className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
                              ⭐ Featured
                            </span>
                          </div>
                          <div className="absolute top-4 right-4">
                            <span className="bg-white/95 backdrop-blur-sm text-gray-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                              {property.listingType === 'sale' ? 'For Sale' : property.listingType === 'rent' ? 'For Rent' : 'Sale/Rent'}
                            </span>
                          </div>

                          {/* View Details Button (on hover) */}
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="bg-white text-primary-600 px-6 py-2 rounded-full text-sm font-semibold shadow-xl">
                              View Details →
                            </span>
                          </div>
                        </div>

                        {/* Enhanced Content */}
                        <div className="p-7">
                          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors duration-300">
                            {property.title}
                          </h3>
                          <p className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-700 to-gold-500 bg-clip-text text-transparent mb-5">
                            {property.listingType === 'sale' && property.price?.sale
                              ? formatPrice(property.price.sale)
                              : property.listingType === 'rent' && property.price?.rent?.amount
                              ? `${formatPrice(property.price.rent.amount)}/${property.price.rent.period || 'month'}`
                              : 'Price on request'}
                          </p>
                          <div className="flex items-center text-gray-600 text-sm mb-4">
                            <MapPin className="h-4 w-4 mr-1.5 text-primary-600" />
                            <span className="line-clamp-1">
                              {property.location?.address}, {property.location?.city}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-600 text-sm border-t border-gray-100 pt-5">
                            {property.specifications?.bedrooms && (
                              <div className="flex items-center gap-2 bg-gradient-to-br from-primary-50 to-gold-50 px-4 py-2 rounded-xl border border-primary-100 group-hover:border-primary-200 transition-colors">
                                <Bed className="h-5 w-5 text-primary-600" />
                                <span className="font-bold text-gray-700">{property.specifications.bedrooms}</span>
                              </div>
                            )}
                            {property.specifications?.bathrooms && (
                              <div className="flex items-center gap-2 bg-gradient-to-br from-primary-50 to-gold-50 px-4 py-2 rounded-xl border border-primary-100 group-hover:border-primary-200 transition-colors">
                                <Bath className="h-5 w-5 text-primary-600" />
                                <span className="font-bold text-gray-700">{property.specifications.bathrooms}</span>
                              </div>
                            )}
                            {property.specifications?.area && (
                              <div className="flex items-center gap-2 bg-gradient-to-br from-primary-50 to-gold-50 px-4 py-2 rounded-xl border border-primary-100 group-hover:border-primary-200 transition-colors">
                                <Square className="h-5 w-5 text-primary-600" />
                                <span className="font-bold text-gray-700">
                                  {property.specifications.area.value} {property.specifications.area.unit}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              {featuredProperties.length > itemsPerView && (
                <div className="flex items-center justify-center gap-4 mt-10">
                  <button
                    onClick={() => setCurrentPropertyIndex(Math.max(0, currentPropertyIndex - 1))}
                    disabled={currentPropertyIndex === 0}
                    className="p-3 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  
                  <div className="flex gap-2">
                    {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPropertyIndex(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentPropertyIndex === index
                            ? 'w-8 bg-primary-600'
                            : 'w-2 bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPropertyIndex(Math.min(maxIndex, currentPropertyIndex + 1))}
                    disabled={currentPropertyIndex >= maxIndex}
                    className="p-3 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95"
                  >
                    <ArrowRight className="h-6 w-6" />
                  </button>
                </div>
              )}
            </div>
            )
          })()}

          <div className="text-center mt-20">
            <Link
              href="/properties"
              className="group inline-flex items-center px-10 py-5 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white rounded-2xl hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-primary-900/50 transform hover:scale-105 active:scale-95 transition-all duration-300 relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
              <span className="relative z-10">View All Properties</span>
              <ArrowRight className="ml-3 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section - Enhanced From CMS */}
      {categories.length > 0 && (
        <section className="py-28 bg-gradient-to-b from-white via-logo-offWhite to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <div className="inline-block px-5 py-2.5 mb-5 bg-gradient-to-r from-primary-500/20 to-gold-400/20 text-primary-700 border border-primary-300/50 rounded-full text-sm font-bold tracking-wide shadow-sm">
                🏘️ Property Types
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 bg-clip-text text-transparent mb-5 leading-tight">
                Browse by Category
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Explore properties by category to find exactly what you're looking for
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 lg:gap-8">
              {categories.map((category, index) => (
                <Link
                  key={category._id}
                  href={`/properties?category=${category.slug || category._id}`}
                  className="group relative bg-gradient-to-br from-white to-gold-50/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 border-2 border-gold-200/50 hover:border-primary-400 text-center"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-gold-400/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  {category.icon && (
                    <div className="text-5xl mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10">
                      {category.icon}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors duration-300 relative z-10">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 relative z-10">{category.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Amenities Section - Enhanced From CMS */}
      {amenities.length > 0 && (
        <section className="py-28 bg-gradient-to-b from-logo-cream via-gold-50/50 to-logo-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <div className="inline-block px-5 py-2.5 mb-5 bg-gradient-to-r from-primary-500/20 to-gold-400/20 text-primary-700 border border-primary-300/50 rounded-full text-sm font-bold tracking-wide shadow-sm">
                ✨ Popular Features
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 bg-clip-text text-transparent mb-5 leading-tight">
                Popular Amenities
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Discover properties with the amenities that matter most to you
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 lg:gap-8">
              {amenities.map((amenity, index) => (
                <div
                  key={amenity._id}
                  className="group relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 border-2 border-gold-200/50 hover:border-primary-400 text-center"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-gold-400/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  {amenity.icon && (
                    <div className="text-4xl mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative z-10">
                      {amenity.icon}
                    </div>
                  )}
                  <h3 className="text-base md:text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors duration-300 relative z-10">
                    {amenity.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section - Enhanced Modern Cards */}
      <section className="py-28 bg-gradient-to-b from-logo-beige via-white to-logo-offWhite relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block px-5 py-2.5 mb-5 bg-gradient-to-r from-primary-500/20 to-gold-400/20 text-primary-700 border border-primary-300/50 rounded-full text-sm font-bold tracking-wide shadow-sm">
              ⭐ Why Choose Us
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 bg-clip-text text-transparent mb-5 leading-tight">
              Experience Excellence
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              We provide exceptional service and premium properties with unmatched expertise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const isEmoji = typeof feature.iconName === 'string' && /[\u{1F300}-\u{1F9FF}]/u.test(feature.iconName)
              return (
                <div 
                  key={index} 
                  className="group relative bg-gradient-to-br from-white via-gold-50/50 to-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 border-2 border-gold-200/50 hover:border-primary-400"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-gold-400/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative">
                    <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-gold-500 w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      {isEmoji ? (
                        <span className="text-5xl">{feature.iconName}</span>
                      ) : (
                        <Icon className="h-12 w-12 text-white" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent mb-4 group-hover:from-primary-800 group-hover:to-gold-500 transition-all duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-base">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials - Enhanced Modern Design */}
      <section className="py-28 bg-gradient-to-b from-logo-white via-logo-beige to-logo-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block px-5 py-2.5 mb-5 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 rounded-full text-sm font-bold tracking-wide shadow-sm border border-yellow-200">
              ⭐ Client Reviews
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-5 leading-tight">
              What Our Clients Say
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Don't just take our word for it - hear from our satisfied clients
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="group relative bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl border border-gray-100 transition-all duration-500 transform hover:-translate-y-3 hover:scale-105"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-6 w-6 text-yellow-400 fill-current drop-shadow-sm" />
                    ))}
                  </div>
                  <div className="mb-6">
                    <svg className="w-12 h-12 text-primary-200 mb-4" fill="currentColor" viewBox="0 0 32 32">
                      <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8zm16 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8z" />
                    </svg>
                    <p className="text-gray-700 text-lg leading-relaxed italic">
                      "{testimonial.content}"
                    </p>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <p className="font-bold text-gray-900 text-lg">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blogs Section - Modern Design */}
      {blogs.length > 0 && (
        <section className="py-24 bg-logo-offWhite">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-block px-4 py-2 mb-4 bg-gradient-to-r from-primary-500/20 to-gold-400/20 text-primary-700 border border-primary-300/50 rounded-full text-sm font-semibold">
                📝 Latest Articles
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 bg-clip-text text-transparent mb-4">
                Our Latest Blogs
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Stay updated with the latest real estate trends, tips, and insights
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <Link
                  key={blog._id}
                  href={`/blog/${blog.slug || blog._id}`}
                  className="group relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100"
                >
                  {/* Featured Image */}
                  <div className="relative h-64 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                    {blog.featuredImage ? (
                      <img
                        src={blog.featuredImage}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-gold-100">
                        <FileText className="h-16 w-16 text-primary-400" />
                      </div>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Featured Badge */}
                    {blog.isFeatured && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-gradient-to-r from-gold-500 to-gold-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
                          ⭐ Featured
                        </span>
                      </div>
                    )}

                    {/* Category Badge */}
                    {blog.category && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/95 backdrop-blur-sm text-primary-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                          {blog.category.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {blog.title}
                    </h3>
                    
                    {blog.excerpt && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {blog.excerpt}
                      </p>
                    )}
                    
                    {!blog.excerpt && blog.content && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {stripHtml(blog.content).substring(0, 150)}...
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary-600" />
                        <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                      </div>
                      {blog.author && (
                        <div className="flex items-center gap-2">
                          <span className="text-primary-600 font-semibold">
                            {blog.author.firstName} {blog.author.lastName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Read More Button */}
                    <div className="mt-4 flex items-center text-primary-600 font-semibold group-hover:text-primary-700 transition-colors">
                      <span>Read More</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {blogs.length >= 6 && (
              <div className="text-center mt-16">
                <Link
                  href="/blog"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white rounded-xl hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 font-bold text-lg shadow-lg hover:shadow-2xl hover:shadow-primary-900/50 transform hover:scale-105 transition-all duration-200"
                >
                  View All Blogs
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA Section - Enhanced Modern Design */}
      <section className="relative py-32 bg-gradient-to-br from-primary-900 via-primary-800 via-primary-700 to-primary-600 text-white overflow-hidden">
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/10 via-transparent to-gold-500/10 animate-gradient"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block px-6 py-3 mb-8 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold border border-white/30 shadow-lg hover:bg-white/25 transition-all duration-300 transform hover:scale-105">
            🚀 {homePageContent?.cta?.subtitle || 'Get Started Today'}
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-8 leading-tight">
            {homePageContent?.cta?.title ? (
              <span dangerouslySetInnerHTML={{ __html: homePageContent.cta.title.replace(/\n/g, '<br />') }} />
            ) : (
              <>
                Ready to Find Your<br />
                <span className="bg-gradient-to-r from-gold-400 via-gold-300 to-gold-200 bg-clip-text text-transparent drop-shadow-2xl animate-gradient">
                  Dream Property?
                </span>
              </>
            )}
          </h2>
          <p className="text-2xl md:text-3xl mb-16 text-white/95 max-w-3xl mx-auto leading-relaxed font-light">
            {homePageContent?.cta?.description || 'Get started today and let our experts help you find the perfect property that matches your lifestyle'}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href={homePageContent?.cta?.primaryButtonLink || '/properties'}
              className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-br from-white via-gold-50 to-cream-50 text-primary-700 rounded-2xl hover:from-gold-50 hover:to-gold-100 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-gold-200/50 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
              <span className="relative z-10">{homePageContent?.cta?.primaryButtonText || 'Browse Properties'}</span>
              <ArrowRight className="ml-3 h-6 w-6 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
            {homePageContent?.cta?.secondaryButtonText && (
              <Link
                href={homePageContent?.cta?.secondaryButtonLink || '/contact'}
                className="group relative inline-flex items-center px-10 py-5 bg-transparent border-2 border-gold-400/90 text-white rounded-2xl hover:bg-gradient-to-r hover:from-gold-500 hover:to-gold-400 hover:text-white font-bold text-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-xl hover:shadow-2xl overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                <span className="relative z-10">{homePageContent.cta.secondaryButtonText}</span>
                <ArrowRight className="ml-3 h-6 w-6 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
