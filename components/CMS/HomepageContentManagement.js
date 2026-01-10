'use client'

import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Save, Home, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function HomepageContentManagement() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [homePage, setHomePage] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    hero: true,
    stats: true,
    features: true,
    cta: true,
    seo: false
  })
  const [formData, setFormData] = useState({
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: '',
    stats: [
      { number: '', label: '' },
      { number: '', label: '' },
      { number: '', label: '' },
      { number: '', label: '' }
    ],
    features: [
      { icon: 'Home', title: '', description: '' },
      { icon: 'Shield', title: '', description: '' },
      { icon: 'TrendingUp', title: '', description: '' },
      { icon: 'Users', title: '', description: '' }
    ],
    cta: {
      title: '',
      subtitle: '',
      description: '',
      primaryButtonText: '',
      primaryButtonLink: '',
      secondaryButtonText: '',
      secondaryButtonLink: ''
    },
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: ''
    }
  })

  useEffect(() => {
    fetchHomePage()
  }, [])

  const fetchHomePage = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/pages/home')
      if (response.data.page) {
        setHomePage(response.data.page)
        // Parse content if it's JSON stored in content field
        try {
          const contentData = JSON.parse(response.data.page.content || '{}')
          setFormData({
            heroTitle: contentData.heroTitle || '',
            heroSubtitle: contentData.heroSubtitle || '',
            heroDescription: contentData.heroDescription || '',
            stats: contentData.stats || formData.stats,
            features: contentData.features || formData.features,
            cta: contentData.cta || formData.cta,
            seo: {
              metaTitle: response.data.page.seo?.metaTitle || '',
              metaDescription: response.data.page.seo?.metaDescription || '',
              keywords: response.data.page.seo?.keywords 
                ? (Array.isArray(response.data.page.seo.keywords) 
                    ? response.data.page.seo.keywords.join(', ') 
                    : response.data.page.seo.keywords)
                : ''
            }
          })
        } catch (e) {
          // If content is not JSON, it's HTML content
          // Keep default formData
        }
      }
    } catch (error) {
      console.error('Error fetching homepage:', error)
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
        heroTitle: formData.heroTitle,
        heroSubtitle: formData.heroSubtitle,
        heroDescription: formData.heroDescription,
        stats: formData.stats,
        features: formData.features,
        cta: formData.cta
      }

      const pageData = {
        title: 'Home',
        slug: 'home',
        template: 'home',
        content: JSON.stringify(contentData),
        isActive: true,
        seo: {
          metaTitle: formData.seo.metaTitle,
          metaDescription: formData.seo.metaDescription,
          keywords: formData.seo.keywords 
            ? (Array.isArray(formData.seo.keywords) 
                ? formData.seo.keywords 
                : typeof formData.seo.keywords === 'string' 
                  ? formData.seo.keywords.split(',').map(k => k.trim()).filter(k => k)
                  : [])
            : []
        }
      }

      if (homePage) {
        await api.put(`/cms/pages/${homePage._id}`, pageData)
        toast.success('Homepage content updated successfully')
      } else {
        await api.post('/cms/pages', pageData)
        toast.success('Homepage content created successfully')
      }
      // Always fetch fresh data after save to refresh form
      await fetchHomePage()
    } catch (error) {
      console.error('Error saving homepage:', error)
      toast.error(error.response?.data?.message || 'Failed to save homepage content')
    } finally {
      setSaving(false)
    }
  }

  const updateStat = (index, field, value) => {
    const newStats = [...formData.stats]
    newStats[index] = { ...newStats[index], [field]: value }
    setFormData({ ...formData, stats: newStats })
  }

  const updateFeature = (index, field, value) => {
    const newFeatures = [...formData.features]
    newFeatures[index] = { ...newFeatures[index], [field]: value }
    setFormData({ ...formData, features: newFeatures })
  }

  const updateCTA = (field, value) => {
    setFormData({
      ...formData,
      cta: { ...formData.cta, [field]: value }
    })
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Homepage Content Management</h2>
        <p className="text-gray-600">Manage all sections of your homepage: Hero, Stats, Features, CTA, and SEO settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hero Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('hero')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Home className="h-5 w-5 text-primary-600" />
              Hero Section
            </h3>
            {expandedSections.hero ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          
          {expandedSections.hero && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
                <input
                  type="text"
                  value={formData.heroTitle}
                  onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Find Your Dream Property Today"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
                <input
                  type="text"
                  value={formData.heroSubtitle}
                  onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Property Today"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Description</label>
                <textarea
                  value={formData.heroDescription}
                  onChange={(e) => setFormData({ ...formData, heroDescription: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Discover premium homes, luxury apartments, and prime commercial properties..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('stats')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gold-50 to-gold-100 hover:from-gold-100 hover:to-gold-200 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Stats Section (Our Achievements)
            </h3>
            {expandedSections.stats ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          
          {expandedSections.stats && (
            <div className="p-6 space-y-4">
              {formData.stats.map((stat, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Stat {index + 1}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Number</label>
                      <input
                        type="text"
                        value={stat.number}
                        onChange={(e) => updateStat(index, 'number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="500+"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(e) => updateStat(index, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Properties Listed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('features')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              Features Section (Why Choose Us)
            </h3>
            {expandedSections.features ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          
          {expandedSections.features && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">Manage the "Why Choose Us" section with 4 feature cards</p>
              {formData.features.map((feature, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Feature {index + 1}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                      <select
                        value={feature.icon}
                        onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="Home">Home</option>
                        <option value="Shield">Shield</option>
                        <option value="TrendingUp">Trending Up</option>
                        <option value="Users">Users</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={feature.title}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Premium Properties"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <textarea
                        value={feature.description}
                        onChange={(e) => updateFeature(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Discover luxury homes and apartments in prime locations"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('cta')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              CTA Section (Call to Action)
            </h3>
            {expandedSections.cta ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          
          {expandedSections.cta && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Title</label>
                <input
                  type="text"
                  value={formData.cta.title}
                  onChange={(e) => updateCTA('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ready to Find Your Dream Property?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Subtitle</label>
                <input
                  type="text"
                  value={formData.cta.subtitle}
                  onChange={(e) => updateCTA('subtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Get started today and let our experts help you"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Description</label>
                <textarea
                  value={formData.cta.description}
                  onChange={(e) => updateCTA('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Get started today and let our experts help you find the perfect property"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button Text</label>
                  <input
                    type="text"
                    value={formData.cta.primaryButtonText}
                    onChange={(e) => updateCTA('primaryButtonText', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Browse Properties"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button Link</label>
                  <input
                    type="text"
                    value={formData.cta.primaryButtonLink}
                    onChange={(e) => updateCTA('primaryButtonLink', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="/properties"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Button Text</label>
                  <input
                    type="text"
                    value={formData.cta.secondaryButtonText}
                    onChange={(e) => updateCTA('secondaryButtonText', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Contact Us"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Button Link</label>
                  <input
                    type="text"
                    value={formData.cta.secondaryButtonLink}
                    onChange={(e) => updateCTA('secondaryButtonLink', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="/contact"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SEO Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('seo')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              SEO Settings
            </h3>
            {expandedSections.seo ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          
          {expandedSections.seo && (
            <div className="p-6 space-y-4">
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
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save Homepage Content'}
          </button>
        </div>
      </form>
    </div>
  )
}

