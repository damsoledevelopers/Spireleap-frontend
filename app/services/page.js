'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'
import { Home, Building2, Key, TrendingUp, Users, Shield, Search, FileText } from 'lucide-react'
import Link from 'next/link'
import { api } from '../../lib/api'

export default function ServicesPage() {
  const [pageContent, setPageContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPageContent()
  }, [])

  const fetchPageContent = async () => {
    try {
      const response = await api.get('/cms/pages/services')
      if (response.data.page) {
        setPageContent(response.data.page)
      }
    } catch (error) {
      console.error('Error fetching page content:', error)
    } finally {
      setLoading(false)
    }
  }
  const services = [
    {
      icon: Home,
      title: 'Property Sales',
      description: 'Buy your dream home with our comprehensive property sales service. We help you find, evaluate, and purchase the perfect property.',
      features: ['Property Search', 'Viewing Arrangements', 'Negotiation Support', 'Legal Assistance']
    },
    {
      icon: Key,
      title: 'Property Rentals',
      description: 'Find the perfect rental property that fits your lifestyle and budget. We offer both short-term and long-term rental solutions.',
      features: ['Rental Listings', 'Application Support', 'Lease Management', 'Tenant Services']
    },
    {
      icon: Building2,
      title: 'Commercial Real Estate',
      description: 'Expert guidance for commercial property investments. From offices to retail spaces, we help businesses find the right location.',
      features: ['Commercial Listings', 'Investment Analysis', 'Location Consulting', 'Lease Negotiation']
    },
    {
      icon: TrendingUp,
      title: 'Property Investment',
      description: 'Make informed investment decisions with our expert analysis and market insights. Maximize your ROI with strategic property investments.',
      features: ['Market Analysis', 'ROI Calculations', 'Investment Strategies', 'Portfolio Management']
    },
    {
      icon: Users,
      title: 'Agent Services',
      description: 'Professional real estate agents ready to assist you. Our experienced team provides personalized service throughout your property journey.',
      features: ['Expert Agents', 'Personal Consultation', 'Property Tours', 'Transaction Support']
    },
    {
      icon: Shield,
      title: 'Property Management',
      description: 'Comprehensive property management services for landlords. We handle everything from tenant screening to maintenance.',
      features: ['Tenant Screening', 'Rent Collection', 'Maintenance Management', 'Property Inspections']
    }
  ]

  // SEO metadata from CMS page
  useEffect(() => {
    if (!pageContent?.seo) return

    const seo = pageContent.seo

    // Title
    if (seo.metaTitle || pageContent.title) {
      document.title = seo.metaTitle || `${pageContent.title} | NovaKeys`
    }

    // Description
    const descText = seo.metaDescription || ''
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
  }, [pageContent])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {pageContent?.title || 'Our Services'}
            </h1>
            {pageContent?.seo?.metaDescription && (
              <p className="text-xl text-primary-100 max-w-3xl mx-auto">
                {pageContent.seo.metaDescription}
              </p>
            )}
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {pageContent?.content ? (
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: pageContent.content }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => {
                const Icon = service.icon
                return (
                  <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="bg-primary-100 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-8 w-8 text-primary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {service.description}
                    </p>
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <span className="text-primary-600 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/contact"
                      className="text-primary-600 font-semibold hover:text-primary-700"
                    >
                      Learn More →
                    </Link>
                  </div>
                )
              })}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Contact us today to learn more about our services and how we can help you with your real estate needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/properties"
                className="inline-flex items-center justify-center px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
              >
                <Search className="h-5 w-5 mr-2" />
                Browse Properties
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-semibold"
              >
                <FileText className="h-5 w-5 mr-2" />
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}

