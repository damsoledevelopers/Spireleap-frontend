'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'
import { api } from '../../lib/api'
import { Star, Quote } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const fetchTestimonials = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/testimonials?limit=50')
      setTestimonials(response.data.testimonials || [])
    } catch (error) {
      console.error('Error fetching testimonials:', error)
      toast.error('Failed to load testimonials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">What Our Clients Say</h1>
              <p className="text-xl text-primary-100">
                Real experiences from satisfied customers
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">No testimonials available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {testimonials.map((testimonial) => (
                  <div
                    key={testimonial._id}
                    className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow"
                  >
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <div className="mb-6">
                      <Quote className="h-8 w-8 text-primary-200 mb-4" />
                      <p className="text-gray-700 text-lg leading-relaxed italic">
                        "{testimonial.content}"
                      </p>
                    </div>
                    <div className="border-t border-gray-100 pt-6">
                      <p className="font-bold text-gray-900 text-lg">{testimonial.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{testimonial.role}</p>
                      {testimonial.property && (
                        <p className="text-sm text-primary-600 mt-2">
                          Property: {testimonial.property.title}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Share Your Experience</h2>
            <p className="text-xl text-primary-100 mb-8">
              We'd love to hear about your experience with SPIRELEAP
            </p>
            <a
              href="/contact"
              className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

