'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'
import { api } from '../../lib/api'
import { Calendar, User, ArrowRight, FileText } from 'lucide-react'

export default function BlogPage() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      setLoading(true)
      // Fetch blogs from CMS - API automatically filters to published blogs for public users
      const response = await api.get('/cms/blogs?limit=12')
      
      // Get blogs from response - API already handles filtering published blogs
      const blogsData = response.data?.blogs || []
      
      // Set blogs directly - API has already filtered to published status for non-admin users
      setBlogs(blogsData)
    } catch (error) {
      console.error('Error fetching blogs from CMS:', error)
      // Set empty array on error so loading stops and shows "No blog posts" message
      setBlogs([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Basic SEO metadata for blog listing
  useEffect(() => {
    document.title = 'Real Estate Blog | NovaKeys'

    const desc =
      'Read the latest real estate trends, tips, and insights from NovaKeys to help you buy, rent, or invest smarter.'

    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', desc)

    const keywordsStr =
      'real estate blog, property tips, buying guide, renting guide, investment insights, NovaKeys'
    let metaKeywords = document.querySelector('meta[name="keywords"]')
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta')
      metaKeywords.setAttribute('name', 'keywords')
      document.head.appendChild(metaKeywords)
    }
    metaKeywords.setAttribute('content', keywordsStr)
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Real Estate Blog</h1>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              Stay updated with the latest trends, tips, and insights in real estate
            </p>
          </div>
        </section>

        {/* Blog Posts */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : blogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No blog posts available yet.</p>
                <p className="text-gray-400 mt-2">Check back soon for updates!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {blogs.map((blog) => (
                  <Link
                    key={blog._id}
                    href={`/blog/${blog.slug || blog._id}`}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
                  >
                    <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                      {blog.featuredImage ? (
                        <img
                          src={blog.featuredImage}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-gold-100">
                          <FileText className="h-16 w-16 text-primary-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      {blog.category && (
                        <span className="inline-block px-3 py-1 bg-primary-100 text-primary-600 text-xs font-semibold rounded-full mb-3">
                          {typeof blog.category === 'object' ? blog.category.name : blog.category}
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                        {blog.title}
                      </h3>
                      {blog.excerpt ? (
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {blog.excerpt}
                        </p>
                      ) : blog.content ? (
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {typeof blog.content === 'string' ? blog.content.replace(/<[^>]*>/g, '').substring(0, 150) : ''}...
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          {blog.author && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{blog.author.firstName} {blog.author.lastName}</span>
                            </div>
                          )}
                          {(blog.publishedAt || blog.createdAt) && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}

