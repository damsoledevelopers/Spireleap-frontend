'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'
import { Phone, Mail, MapPin, Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

export default function ContactPage() {
  const [pageContent, setPageContent] = useState(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchPageContent()
  }, [])

  const fetchPageContent = async () => {
    try {
      const response = await api.get('/cms/pages/contact')
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
    } finally {
      setLoadingPage(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Save contact message to database
      const response = await api.post('/cms/contact-messages', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message
      })

      console.log('Contact message saved:', response.data)

      // Also create a lead from contact form (for backward compatibility)
      try {
        await api.post('/leads', {
          contact: {
            firstName: formData.name.split(' ')[0] || formData.name,
            lastName: formData.name.split(' ').slice(1).join(' ') || '',
            email: formData.email,
            phone: formData.phone
          },
          inquiry: {
            message: `Subject: ${formData.subject}\n\n${formData.message}`
          },
          source: 'website'
        })
      } catch (leadError) {
        // If lead creation fails, don't fail the whole submission
        console.error('Error creating lead:', leadError)
      }
      
      toast.success('Thank you! Your message has been sent successfully. We will contact you soon.')
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      })
    } catch (error) {
      console.error('Error submitting contact form:', error)
      console.error('Error response:', error.response?.data)
      
      // Better error handling
      let errorMessage = 'Failed to send message. Please try again.'
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.map(err => err.msg || err.message).join(', ')
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {pageContent?.parsedContent?.title || pageContent?.title || 'Contact Us'}
            </h1>
            {pageContent?.parsedContent?.description && (
              <p className="text-xl text-primary-100">
                {pageContent.parsedContent.description}
              </p>
            )}
            {pageContent?.seo?.metaDescription && !pageContent?.parsedContent?.description && (
              <p className="text-xl text-primary-100">
                {pageContent.seo.metaDescription}
              </p>
            )}
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Info */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                {pageContent?.parsedContent?.description ? (
                  <p className="text-lg text-gray-600 mb-8">
                    {pageContent.parsedContent.description}
                  </p>
                ) : (
                  <p className="text-lg text-gray-600 mb-8">
                    Have questions about our properties or services? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                  </p>
                )}

                <div className="space-y-6">
                  {pageContent?.parsedContent?.phone && (
                    <div className="flex items-start gap-4">
                      <div className="bg-primary-100 p-3 rounded-lg">
                        <Phone className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                        <p className="text-gray-600">{pageContent.parsedContent.phone}</p>
                        {pageContent.parsedContent.officeHours && (
                          <p className="text-gray-600">{pageContent.parsedContent.officeHours}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {pageContent?.parsedContent?.email && (
                    <div className="flex items-start gap-4">
                      <div className="bg-primary-100 p-3 rounded-lg">
                        <Mail className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                        <a 
                          href={`mailto:${pageContent.parsedContent.email}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {pageContent.parsedContent.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {pageContent?.parsedContent?.address && (
                    <div className="flex items-start gap-4">
                      <div className="bg-primary-100 p-3 rounded-lg">
                        <MapPin className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                        <p className="text-gray-600 whitespace-pre-line">{pageContent.parsedContent.address}</p>
                      </div>
                    </div>
                  )}

                  {/* Fallback to default if no parsed content */}
                  {!pageContent?.parsedContent && (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="bg-primary-100 p-3 rounded-lg">
                          <Phone className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                          <p className="text-gray-600">+1 (555) 123-4567</p>
                          <p className="text-gray-600">Mon - Fri, 9:00 AM - 6:00 PM</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="bg-primary-100 p-3 rounded-lg">
                          <Mail className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                          <p className="text-gray-600">info@spireleap.com</p>
                          <p className="text-gray-600">support@spireleap.com</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="bg-primary-100 p-3 rounded-lg">
                          <MapPin className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                          <p className="text-gray-600">123 Real Estate Ave</p>
                          <p className="text-gray-600">City, State 12345</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Your name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="What is this regarding?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Tell us how we can help..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
