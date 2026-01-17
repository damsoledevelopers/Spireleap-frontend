'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function AboutUsManagement() {
  const { checkPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aboutPage, setAboutPage] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    content: '',
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: ''
    }
  })

  useEffect(() => {
    fetchAboutPage()
  }, [])

  const fetchAboutPage = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/pages/about')
      if (response.data.page) {
        setAboutPage(response.data.page)
        // Parse content if it's JSON stored in content field
        try {
          const contentData = JSON.parse(response.data.page.content || '{}')
          const seo = response.data.page.seo || { metaTitle: '', metaDescription: '', keywords: [] }
          setFormData({
            title: contentData.title || response.data.page.title || '',
            subtitle: contentData.subtitle || '',
            description: contentData.description || '',
            content: contentData.content || response.data.page.content || '',
            seo: {
              ...seo,
              keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : (seo.keywords || '')
            }
          })
        } catch (e) {
          // If content is not JSON, it's HTML content
          const seo = response.data.page.seo || { metaTitle: '', metaDescription: '', keywords: [] }
          setFormData({
            title: response.data.page.title || '',
            subtitle: '',
            description: '',
            content: response.data.page.content || '',
            seo: {
              ...seo,
              keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : (seo.keywords || '')
            }
          })
        }
      }
    } catch (error) {
      console.error('Error fetching about page:', error)
      // Page doesn't exist yet, use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Store structured data as JSON in content field
      const contentData = {
        title: formData.title,
        subtitle: formData.subtitle,
        description: formData.description,
        content: formData.content
      }

      // Handle keywords - convert string to array if needed
      let keywordsArray = [];
      if (formData.seo.keywords) {
        if (Array.isArray(formData.seo.keywords)) {
          keywordsArray = formData.seo.keywords;
        } else if (typeof formData.seo.keywords === 'string') {
          keywordsArray = formData.seo.keywords.split(',').map(k => k.trim()).filter(k => k);
        }
      }

      const pageData = {
        title: formData.title || 'About Us',
        slug: 'about',
        template: 'about',
        content: JSON.stringify(contentData),
        isActive: true,
        seo: {
          metaTitle: formData.seo.metaTitle,
          metaDescription: formData.seo.metaDescription,
          keywords: keywordsArray
        }
      }

      if (aboutPage) {
        await api.put(`/cms/pages/${aboutPage._id}`, pageData)
        toast.success('About Us page updated successfully')
      } else {
        await api.post('/cms/pages', pageData)
        toast.success('About Us page created successfully')
      }
      // Always fetch fresh data after save to refresh form
      await fetchAboutPage()
    } catch (error) {
      console.error('Error saving about page:', error)
      toast.error(error.response?.data?.message || 'Failed to save About Us page')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">About Us Management</h2>
        <p className="text-gray-600">Manage your About Us page content and SEO settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="About SPIRELEAP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Your trusted real estate partner"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Brief description about your company..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Content (Rich Text) *</label>
              <ReactQuill
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                className="bg-white"
                placeholder="Enter detailed about us content..."
              />
            </div>
          </div>
        </div>

        {/* SEO Section */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input
                type="text"
                value={formData.seo.metaTitle}
                onChange={(e) => setFormData({
                  ...formData,
                  seo: { ...formData.seo, metaTitle: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <textarea
                value={formData.seo.metaDescription}
                onChange={(e) => setFormData({
                  ...formData,
                  seo: { ...formData.seo, metaDescription: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
              <input
                type="text"
                value={formData.seo.keywords}
                onChange={(e) => setFormData({
                  ...formData,
                  seo: { ...formData.seo, keywords: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          {(aboutPage ? checkPermission('cms', 'edit') : checkPermission('cms', 'create')) && (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save About Us Page'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

