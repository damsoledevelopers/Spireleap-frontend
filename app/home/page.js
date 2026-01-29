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
  const [activeScripts, setActiveScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0)
  const [currentStatsIndex, setCurrentStatsIndex] = useState(0)
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [currentAmenityIndex, setCurrentAmenityIndex] = useState(0)
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0)
  const [currentBlogIndex, setCurrentBlogIndex] = useState(0)
  const [isPaused, setIsPaused] = useState({
    properties: false,
    stats: false,
    categories: false,
    amenities: false,
    testimonials: false,
    blogs: false
  })
  const [windowWidth, setWindowWidth] = useState(0)
  const [searchFilters, setSearchFilters] = useState({
    propertyType: '',
    listingType: '',
    city: '',
    minPrice: '',
    maxPrice: ''
  })

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

  // Carousel Navigation Components
  const Carousel = ({ items, renderItem, itemsPerView, currentIndex, setCurrentIndex, sectionKey, isPaused, setIsPaused, showDots = true }) => {
    // maxIndex is now the last index where a full view can start
    const maxIndex = Math.max(0, items.length - itemsPerView);

    const handlePrev = () => setCurrentIndex(prev => Math.max(0, prev - 1));
    const handleNext = () => setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));

    return (
      <div
        className="relative group w-full"
        onMouseEnter={() => setIsPaused(prev => ({ ...prev, [sectionKey]: true }))}
        onMouseLeave={() => setIsPaused(prev => ({ ...prev, [sectionKey]: false }))}
      >
        {/* Generous vertical padding to prevent shadow clipping and boxy feel */}
        <div className="overflow-hidden py-10 -my-10">
          <div
            className="flex transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
            }}
          >
            {items.map((item, index) => (
              <div
                key={index}
                className="flex-shrink-0 px-4" // Horizontal padding creates the "individual" gap
                style={{ width: `${100 / itemsPerView}%` }}
              >
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        </div>

        {items.length > itemsPerView && (
          <>
            {/* Nav Buttons - Positioned outside the "box" on large screens */}
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`absolute top-1/2 -left-4 lg:-left-20 -translate-y-1/2 z-20 p-5 rounded-full bg-white shadow-2xl text-primary-600 hover:text-primary-800 transition-all duration-300 transform hover:scale-110 active:scale-95 border border-gray-100 hidden md:flex items-center justify-center ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              onClick={handleNext}
              className="absolute top-1/2 -right-4 lg:-right-20 -translate-y-1/2 z-20 p-5 rounded-full bg-white shadow-2xl text-primary-600 hover:text-primary-800 transition-all duration-300 transform hover:scale-110 active:scale-95 border border-gray-100 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100"
            >
              <ArrowRight className="h-7 w-7" />
            </button>

            {/* Premium Pagination Dots */}
            {showDots && (
              <div className="flex justify-center gap-2.5 mt-10">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-2 rounded-full transition-all duration-500 ${currentIndex === i
                      ? 'w-10 bg-primary-600'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchHomePageContent()
    fetchFeaturedProperties()
    fetchTestimonials()
    fetchBlogs()
    fetchBanners()
    fetchCategories()
    fetchAmenities()
    fetchActiveScripts()

    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth)
      const handleResize = () => setWindowWidth(window.innerWidth)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Unified Auto-Scroll Logic
  useEffect(() => {
    const getItemsPerView = (width) => {
      if (width >= 1280) return 4;
      if (width >= 1024) return 3;
      if (width >= 768) return 2;
      return 1;
    }

    const getItemsPerViewSmall = (width) => {
      if (width >= 1024) return 4;
      if (width >= 768) return 3;
      return 2;
    }

    const itemsPerView = getItemsPerView(windowWidth);
    const itemsPerViewSmall = getItemsPerViewSmall(windowWidth);

    const interval = setInterval(() => {
      if (!isPaused.properties && featuredProperties.length > itemsPerView) {
        setCurrentPropertyIndex(prev => (prev >= featuredProperties.length - itemsPerView ? 0 : prev + 1));
      }
      if (!isPaused.stats && stats.length > itemsPerView) {
        setCurrentStatsIndex(prev => (prev >= stats.length - itemsPerView ? 0 : prev + 1));
      }
      if (!isPaused.categories && categories.length > itemsPerView) {
        setCurrentCategoryIndex(prev => (prev >= categories.length - itemsPerView ? 0 : prev + 1));
      }
      if (!isPaused.amenities && amenities.length > itemsPerViewSmall) {
        setCurrentAmenityIndex(prev => (prev >= amenities.length - itemsPerViewSmall ? 0 : prev + 1));
      }
      if (!isPaused.testimonials && testimonials.length > itemsPerView) {
        setCurrentTestimonialIndex(prev => (prev >= testimonials.length - itemsPerView ? 0 : prev + 1));
      }
      if (!isPaused.blogs && blogs.length > itemsPerView) {
        setCurrentBlogIndex(prev => (prev >= blogs.length - itemsPerView ? 0 : prev + 1));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [featuredProperties, stats, categories, amenities, testimonials, blogs, isPaused, windowWidth]);

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

  const fetchActiveScripts = async () => {
    try {
      const response = await api.get('/cms/scripts/active')
      setActiveScripts(response.data.scripts || [])
    } catch (error) {
      console.error('Error fetching active scripts:', error)
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

  // Script Injection logic
  useEffect(() => {
    // Capture state of body before injecting scripts
    const initialBodyChildren = new Set(Array.from(document.body.children));
    const injectedElements = [];

    if (activeScripts.length > 0) {
      activeScripts.forEach(script => {
        const scriptId = `cms-script-${script._id}`;
        // If already injected, don't inject again but keep track for cleanup
        const existingContainer = document.getElementById(scriptId);
        if (existingContainer) {
          // Find all elements previously injected by this script using the data attribute
          const previouslyInjected = document.querySelectorAll(`[data-script-id="${script._id}"]`);
          previouslyInjected.forEach(el => injectedElements.push(el));
          return;
        }

        const tempContainer = document.createElement('div');
        tempContainer.id = scriptId;
        tempContainer.style.display = 'none';
        tempContainer.innerHTML = script.code;

        const nodes = Array.from(tempContainer.childNodes);
        nodes.forEach(node => {
          let elementToInject;

          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'SCRIPT') {
              const s = document.createElement('script');
              Array.from(node.attributes).forEach(attr => s.setAttribute(attr.name, attr.value));
              s.innerHTML = node.innerHTML;
              elementToInject = s;
            } else {
              elementToInject = node.cloneNode(true);
            }
          } else if (node.nodeType === 3 && node.textContent.trim()) { // Text node
            const span = document.createElement('span');
            span.textContent = node.textContent;
            elementToInject = span;
          }

          if (elementToInject) {
            // Add identifying attributes for cleanup
            elementToInject.setAttribute('data-script-id', script._id);
            elementToInject.classList.add('cms-injected-element');

            if (script.placement === 'head') {
              document.head.appendChild(elementToInject);
            } else if (script.placement === 'body_start') {
              document.body.prepend(elementToInject);
            } else {
              document.body.appendChild(elementToInject);
            }

            injectedElements.push(elementToInject);
          }
        });

        // Also keep the marker container
        document.body.appendChild(tempContainer);
        injectedElements.push(tempContainer);
      });
    }

    // Cleanup function: remove all elements injected by this effect AND artifacts
    return () => {
      // 1. Remove markers and script tags we explicitly tracked
      injectedElements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });

      // 2. Remove third-party widget artifacts (elements added to body by the scripts)
      // We assume ANY element added to body that wasn't there initially is a widget artifact (unless safelisted)
      try {
        const currentBodyChildren = Array.from(document.body.children);
        const safelistedIds = ['app-content-wrapper', '__next'];
        const safelistedTags = ['SCRIPT', 'LINK', 'STYLE', 'META', 'HEAD'];

        currentBodyChildren.forEach(child => {
          if (!initialBodyChildren.has(child)) {
            // SAFEGUARD: Never remove the main app wrapper, Next.js internals, or resource tags
            if (safelistedIds.includes(child.id) || safelistedTags.includes(child.tagName)) return;

            // Remove everything else (Divs, Iframes, Anchors, IMGs, etc.)
            if (child.parentNode === document.body) {
              document.body.removeChild(child);
            }
          }
        });
      } catch (error) {
        console.error('Error cleaning up widget artifacts:', error);
      }
    };
  }, [activeScripts])

  return (
    <div className="min-h-screen bg-logo-offWhite">
      <Header />

      {/* Hero Section - Enhanced Modern Design */}
      <section
        className="relative min-h-[95vh] flex items-center justify-center overflow-hidden transition-colors duration-500"
        style={{
          background: homePageContent?.styles?.hero?.backgroundColor || 'linear-gradient(to bottom right, #0a213e, #0f2d52, #143a67, #19487b)'
        }}
      >
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
          <div
            className="animate-fade-in-up"
            style={{ textAlign: homePageContent?.styles?.hero?.textAlign || 'center' }}
          >
            {/* Enhanced Badge */}
            <div className="inline-flex items-center px-5 py-2.5 mb-8 bg-white/15 backdrop-blur-md rounded-full border border-white/30 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <span className="text-sm font-bold text-white tracking-wide">🏆 #1 Real Estate Platform</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-6 text-white leading-tight animate-fade-in-up animation-delay-200">
              <span
                className="bg-gradient-to-r from-gold-400 via-gold-300 to-gold-200 bg-clip-text text-transparent drop-shadow-2xl animate-gradient"
                style={{
                  ...(homePageContent?.styles?.hero?.titleColor ? { backgroundImage: 'none', color: homePageContent.styles.hero.titleColor } : {}),
                  fontSize: homePageContent?.styles?.hero?.titleFontSize || '',
                  fontStyle: homePageContent?.styles?.hero?.titleFontStyle || 'normal'
                }}
              >
                {homePageContent?.heroTitle || 'Find Your Dream'}
              </span>
              {homePageContent?.heroSubtitle && (
                <>
                  <br />
                  <span
                    className="text-white drop-shadow-lg animate-fade-in-up animation-delay-400"
                    style={{
                      color: homePageContent?.styles?.hero?.subtitleColor || '#ffffff',
                      fontStyle: homePageContent?.styles?.hero?.subtitleFontStyle || 'normal'
                    }}
                  >
                    {homePageContent.heroSubtitle}
                  </span>
                </>
              )}
              {!homePageContent?.heroSubtitle && (
                <>
                  <br />
                  <span className="text-white drop-shadow-lg animate-fade-in-up animation-delay-400">Property Today</span>
                </>
              )}
            </h1>

            <p
              className="text-xl md:text-2xl lg:text-3xl mb-12 text-gray-100 max-w-4xl mx-auto leading-relaxed font-light animate-fade-in-up animation-delay-600"
              style={{
                color: homePageContent?.styles?.hero?.descriptionColor || '#f3f4f6',
                fontSize: homePageContent?.styles?.hero?.descriptionFontSize || '',
                fontStyle: homePageContent?.styles?.hero?.descriptionFontStyle || 'normal'
              }}
            >
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
      <section
        className="relative py-28 text-white overflow-hidden transition-colors duration-500"
        style={{
          background: homePageContent?.styles?.stats?.backgroundColor || 'linear-gradient(to bottom right, #0a213e, #0f2d52, #143a67)'
        }}
      >
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

          <Carousel
            items={stats}
            sectionKey="stats"
            currentIndex={currentStatsIndex}
            setCurrentIndex={setCurrentStatsIndex}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            itemsPerView={windowWidth >= 1024 ? 4 : windowWidth >= 768 ? 2 : 1}
            renderItem={(stat, index) => (
              <div
                className="group relative h-full bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-10 border border-white/20 hover:bg-white/20 transition-all duration-500 transform hover:-translate-y-3 shadow-lg"
              >
                <div className="relative text-center h-full flex flex-col justify-center">
                  <div
                    className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3"
                    style={{
                      color: homePageContent?.styles?.stats?.numberColor || '#fcd34d'
                    }}
                  >
                    {stat.number}
                  </div>
                  <div
                    className="font-bold text-sm md:text-base lg:text-lg"
                    style={{
                      color: homePageContent?.styles?.stats?.labelColor || '#f9fafb'
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              </div>
            )}
          />
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
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-xl text-gray-500 font-medium">No featured properties available</p>
              <p className="text-sm text-gray-400 mt-2">Check back soon for new listings</p>
            </div>
          ) : (
            <Carousel
              items={featuredProperties}
              sectionKey="properties"
              currentIndex={currentPropertyIndex}
              setCurrentIndex={setCurrentPropertyIndex}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              itemsPerView={windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1}
              renderItem={(property) => (
                <Link
                  href={`/properties/${property.slug || property._id}`}
                  className="group relative bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100 block h-full"
                >
                  {/* Square Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={getPrimaryImage(property.images)}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                      <span className="bg-primary-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg">
                        Featured
                      </span>
                      <span className="bg-white/95 backdrop-blur-md text-gray-900 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg">
                        {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                      </span>
                    </div>

                    {/* Bottom Info Overlay (On Image) */}
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl">
                        <div className="text-white text-lg font-extrabold mb-1 truncate">
                          {property.title}
                        </div>
                        <div className="flex items-center text-white/90 text-xs">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary-400" />
                          <span className="truncate">{property.location?.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Quick Specs Area */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-2xl font-black text-primary-700">
                        {property.listingType === 'sale' && property.price?.sale
                          ? formatPrice(property.price.sale)
                          : property.listingType === 'rent' && property.price?.rent?.amount
                            ? `${formatPrice(property.price.rent.amount)}`
                            : 'On Request'}
                        {property.listingType === 'rent' && (
                          <span className="text-sm text-gray-400 font-medium ml-1">/mo</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl py-3 border border-gray-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors duration-300">
                        <Bed className="h-4 w-4 text-primary-600 mb-1" />
                        <span className="text-xs font-bold text-gray-700">{property.specifications?.bedrooms || 0} Bed</span>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl py-3 border border-gray-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors duration-300">
                        <Bath className="h-4 w-4 text-primary-600 mb-1" />
                        <span className="text-xs font-bold text-gray-700">{property.specifications?.bathrooms || 0} Bath</span>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl py-3 border border-gray-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors duration-300">
                        <Square className="h-4 w-4 text-primary-600 mb-1" />
                        <span className="text-[10px] font-bold text-gray-700 truncate px-1">
                          {property.specifications?.area?.value || 0} {property.specifications?.area?.unit || 'sqft'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            />
          )}

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

      {/* Categories Section - Refined Minimal Design */}
      {categories.length > 0 && (
        <section className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-5 leading-tight">
                Browse by Category
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Explore properties by category to find exactly what you're looking for
              </p>
            </div>

            <Carousel
              items={categories}
              sectionKey="categories"
              currentIndex={currentCategoryIndex}
              setCurrentIndex={setCurrentCategoryIndex}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              itemsPerView={windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1}
              renderItem={(category) => (
                <Link
                  href={`/properties?category=${category.slug || category._id}`}
                  className="group relative bg-white rounded-3xl p-10 border border-gray-100 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 text-center block h-full shadow-lg"
                >
                  <div className="h-20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10">
                    <div className="text-5xl">{category.icon || '🏠'}</div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors duration-300 relative z-10">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 relative z-10 italic">"{category.description}"</p>
                  )}
                </Link>
              )}
            />
          </div>
        </section>
      )}

      {/* Amenities Section - Refined Minimal Design */}
      {amenities.length > 0 && (
        <section className="py-28 bg-white relative overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-5 leading-tight">
                Popular Amenities
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Discover properties with the amenities that matter most to you
              </p>
            </div>

            <Carousel
              items={amenities}
              sectionKey="amenities"
              currentIndex={currentAmenityIndex}
              setCurrentIndex={setCurrentAmenityIndex}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              itemsPerView={windowWidth >= 1280 ? 6 : windowWidth >= 1024 ? 4 : windowWidth >= 768 ? 3 : 2}
              renderItem={(amenity) => (
                <div
                  className="group relative bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:bg-white hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 text-center h-full"
                >
                  <div className="h-14 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative z-10 text-primary-600">
                    <div className="text-3xl">{amenity.icon || '✨'}</div>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors duration-300 relative z-10 line-clamp-1">
                    {amenity.name}
                  </h3>
                </div>
              )}
            />
          </div>
        </section>
      )}



      {/* Testimonials - Refined Minimal Design */}
      <section className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-5 leading-tight">
              What Our Clients Say
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Don't just take our word for it - hear from our satisfied clients
            </p>
          </div>

          <Carousel
            items={testimonials}
            sectionKey="testimonials"
            currentIndex={currentTestimonialIndex}
            setCurrentIndex={setCurrentTestimonialIndex}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            itemsPerView={windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1}
            renderItem={(testimonial) => (
              <div
                className="group relative bg-gray-50 p-10 rounded-3xl border border-gray-100 transition-all duration-500 transform hover:-translate-y-3 hover:bg-white hover:shadow-2xl h-full"
              >
                <div className="relative h-full flex flex-col">
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-6 w-6 text-yellow-500 fill-current drop-shadow-sm" />
                    ))}
                  </div>
                  <div className="mb-6 flex-grow">
                    <svg className="w-10 h-10 text-primary-200 mb-4" fill="currentColor" viewBox="0 0 32 32">
                      <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8zm16 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8z" />
                    </svg>
                    <div className="min-h-[120px]">
                      <p className="text-gray-700 text-base leading-relaxed italic line-clamp-6">
                        "{testimonial.content}"
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-6 mt-auto">
                    <p className="font-bold text-gray-900 text-lg">{testimonial.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      </section>

      {/* Blogs Section - Refined Minimal Design */}
      {blogs.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                Our Latest Blogs
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Stay updated with the latest real estate trends, tips, and insights
              </p>
            </div>

            <Carousel
              items={blogs}
              sectionKey="blogs"
              currentIndex={currentBlogIndex}
              setCurrentIndex={setCurrentBlogIndex}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              itemsPerView={windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1}
              renderItem={(blog) => (
                <Link
                  href={`/blog/${blog.slug || blog._id}`}
                  className="group relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 block h-full"
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
                  <div className="p-6 h-full flex flex-col">
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

                    <div className="mt-auto">
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
                  </div>
                </Link>
              )}
            />

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

      {/* CTA Section - Button styling from CMS */}
      {(() => {
        const ctaStyles = homePageContent?.styles?.cta || {}
        const primaryBg = ctaStyles.backgroundColor?.trim() || undefined
        const primaryText = ctaStyles.titleColor?.trim() || undefined
        const secondaryBorder = ctaStyles.descriptionColor?.trim() || undefined
        return (
      <section className="relative py-32 bg-gradient-to-br from-primary-900 via-primary-800 via-primary-700 to-primary-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
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
              className={`group relative inline-flex items-center px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-110 active:scale-95 transition-all duration-300 border-2 overflow-hidden ${!primaryBg ? 'bg-gradient-to-br from-white via-gold-50 to-cream-50 text-primary-700 border-gold-200/50 hover:from-gold-50 hover:to-gold-100' : ''}`}
              style={primaryBg || primaryText ? { ...(primaryBg && { backgroundColor: primaryBg }), ...(primaryText && { color: primaryText }) } : undefined}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
              <span className="relative z-10">{homePageContent?.cta?.primaryButtonText || 'Browse Properties'}</span>
              <ArrowRight className="ml-3 h-6 w-6 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
            {homePageContent?.cta?.secondaryButtonText && (
              <Link
                href={homePageContent?.cta?.secondaryButtonLink || '/contact'}
                className={`group relative inline-flex items-center px-10 py-5 rounded-2xl font-bold text-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-xl hover:shadow-2xl overflow-hidden border-2 ${!secondaryBorder ? 'bg-transparent border-gold-400/90 text-white hover:from-gold-500 hover:to-gold-400 hover:bg-gradient-to-r' : ''}`}
                style={secondaryBorder ? { borderColor: secondaryBorder, color: secondaryBorder } : undefined}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                <span className="relative z-10">{homePageContent.cta.secondaryButtonText}</span>
                <ArrowRight className="ml-3 h-6 w-6 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </section>
        )
      })()}

      <Footer />
    </div>
  )
}
