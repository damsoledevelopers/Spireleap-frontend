'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'
import { Building2, Users, Award, Target, CheckCircle, TrendingUp } from 'lucide-react'
import { api } from '../../lib/api'

export default function AboutPage() {
  const [pageContent, setPageContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPageContent()
  }, [])

  const fetchPageContent = async () => {
    try {
      const response = await api.get('/cms/pages/about')
      if (response.data.page) {
        const page = response.data.page
        // Parse JSON content if it exists
        try {
          const contentData = JSON.parse(page.content || '{}')
          setPageContent({
            ...page,
            parsedContent: contentData
          })
        } catch (e) {
          // If content is not JSON, use as is
          setPageContent(page)
        }
      }
    } catch (error) {
      console.error('Error fetching page content:', error)
      // If page doesn't exist in CMS, use default content
    } finally {
      setLoading(false)
    }
  }
  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To connect people with their dream properties through exceptional service and innovative technology.'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'We strive for excellence in every transaction, ensuring client satisfaction at every step.'
    },
    {
      icon: Users,
      title: 'Trust & Integrity',
      description: 'Building lasting relationships based on transparency, honesty, and professional integrity.'
    },
    {
      icon: TrendingUp,
      title: 'Innovation',
      description: 'Leveraging cutting-edge technology to simplify the real estate experience for everyone.'
    }
  ]

  const stats = [
    { number: '500+', label: 'Properties Listed' },
    { number: '200+', label: 'Happy Clients' },
    { number: '50+', label: 'Expert Agents' },
    { number: '15+', label: 'Years Experience' }
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {pageContent?.parsedContent?.title || pageContent?.title || 'About SPIRELEAP'}
              </h1>
              {pageContent?.parsedContent?.subtitle && (
                <p className="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto mb-4">
                  {pageContent.parsedContent.subtitle}
                </p>
              )}
              {pageContent?.seo?.metaDescription && !pageContent?.parsedContent?.subtitle && (
                <p className="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto">
                  {pageContent.seo.metaDescription}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* About Content */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {pageContent?.parsedContent ? (
              <div className="space-y-8">
                {pageContent.parsedContent.description && (
                  <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto">
                    {pageContent.parsedContent.description}
                  </p>
                )}
                {pageContent.parsedContent.content && (
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: pageContent.parsedContent.content }}
                  />
                )}
              </div>
            ) : pageContent?.content ? (
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: pageContent.content }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Who We Are</h2>
                  <p className="text-lg text-gray-600 mb-4">
                    SPIRELEAP is a leading real estate platform that combines cutting-edge technology with personalized service to help you find your perfect property.
                  </p>
                  <p className="text-lg text-gray-600 mb-4">
                    With over 15 years of experience in the real estate industry, we have built a reputation for excellence, integrity, and innovation. Our team of expert agents and advanced CRM system ensures a seamless experience for both property seekers and real estate professionals.
                  </p>
                  <p className="text-lg text-gray-600">
                    Whether you're looking to buy, rent, or invest in real estate, SPIRELEAP provides the tools, expertise, and support you need to make informed decisions.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-8">
                  <div className="grid grid-cols-2 gap-6">
                    {stats.map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className="text-4xl font-bold text-primary-600 mb-2">
                          {stat.number}
                        </div>
                        <div className="text-gray-600">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Our Values
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => {
                const Icon = value.icon
                return (
                  <div key={index} className="bg-white p-6 rounded-xl shadow-md">
                    <div className="bg-primary-100 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-8 w-8 text-primary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {value.title}
                    </h3>
                    <p className="text-gray-600">
                      {value.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Choose SPIRELEAP
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Properties</h3>
                  <p className="text-gray-600">All our listings are verified and authentic, ensuring you get accurate information.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Agents</h3>
                  <p className="text-gray-600">Work with experienced real estate professionals who understand your needs.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Search</h3>
                  <p className="text-gray-600">Find properties quickly with our powerful search and filter tools.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Support</h3>
                  <p className="text-gray-600">Get assistance whenever you need it with our dedicated support team.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
