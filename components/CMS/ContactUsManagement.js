'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactUsManagement() {
  const { checkPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contactPage, setContactPage] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    officeHours: '',
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: ''
    }
  })

  useEffect(() => {
    fetchContactPage()
  }, [])

  const fetchContactPage = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/pages/contact')
      if (response.data.page) {
        setContactPage(response.data.page)
        // Parse content if it's JSON stored in content field
        try {
          const contentData = JSON.parse(response.data.page.content || '{}')
          const seo = response.data.page.seo || { metaTitle: '', metaDescription: '', keywords: [] }
          setFormData({
            title: contentData.title || response.data.page.title || '',
            description: contentData.description || '',
            phone: contentData.phone || '',
            email: contentData.email || '',
            address: contentData.address || '',
            officeHours: contentData.officeHours || '',
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
            description: '',
            phone: '',
            email: '',
            address: '',
            officeHours: '',
            seo: {
              ...seo,
              keywords: Array.isArray(seo.keywords) ? seo.keywords.join(', ') : (seo.keywords || '')
            }
          })
        }
      }
    } catch (error) {
      console.error('Error fetching contact page:', error)
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
        description: formData.description,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        officeHours: formData.officeHours
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
        title: formData.title || 'Contact Us',
        slug: 'contact',
        template: 'contact',
        content: JSON.stringify(contentData),
        isActive: true,
        seo: {
          metaTitle: formData.seo.metaTitle,
          metaDescription: formData.seo.metaDescription,
          keywords: keywordsArray
        }
      }

      if (contactPage) {
        await api.put(`/cms/pages/${contactPage._id}`, pageData)
        toast.success('Contact Us page updated successfully')
      } else {
        await api.post('/cms/pages', pageData)
        toast.success('Contact Us page created successfully')
      }
      // Always fetch fresh data after save to refresh form
      await fetchContactPage()
    } catch (error) {
      console.error('Error saving contact page:', error)
      toast.error(error.response?.data?.message || 'Failed to save Contact Us page')
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Us Management</h2>
        <p className="text-gray-600">Manage your Contact Us page content and contact information</p>
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
                placeholder="Contact Us"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Have questions? We'd love to hear from you..."
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="info@spireleap.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="123 Real Estate Ave, City, State 12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Office Hours</label>
              <input
                type="text"
                value={formData.officeHours}
                onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Mon - Fri, 9:00 AM - 6:00 PM"
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
          {(contactPage ? checkPermission('cms', 'edit') : checkPermission('cms', 'create')) && (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save Contact Us Page'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

