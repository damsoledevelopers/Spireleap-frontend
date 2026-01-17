'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Save, Home, ChevronDown, ChevronUp, Palette } from 'lucide-react'
import toast from 'react-hot-toast'

export default function HomepageContentManagement() {
  const { checkPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [homePage, setHomePage] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    hero: true,
    stats: false,
    cta: false,
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
    },
    styles: {
      hero: {
        backgroundColor: '',
        titleColor: '',
        subtitleColor: '',
        descriptionColor: '',
        textAlign: 'center',
        titleFontSize: '',
        subtitleFontSize: '',
        descriptionFontSize: '',
        titleFontStyle: 'normal',
        subtitleFontStyle: 'normal',
        descriptionFontStyle: 'normal'
      },
      stats: {
        backgroundColor: '',
        numberColor: '',
        labelColor: ''
      },
      cta: {
        backgroundColor: '',
        titleColor: '',
        subtitleColor: '',
        descriptionColor: ''
      }
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
        try {
          const contentData = JSON.parse(response.data.page.content || '{}')
          setFormData({
            heroTitle: contentData.heroTitle || '',
            heroSubtitle: contentData.heroSubtitle || '',
            heroDescription: contentData.heroDescription || '',
            stats: contentData.stats || formData.stats,
            cta: contentData.cta || formData.cta,
            seo: {
              metaTitle: response.data.page.seo?.metaTitle || '',
              metaDescription: response.data.page.seo?.metaDescription || '',
              keywords: response.data.page.seo?.keywords
                ? (Array.isArray(response.data.page.seo.keywords)
                  ? response.data.page.seo.keywords.join(', ')
                  : response.data.page.seo.keywords)
                : ''
            },
            styles: contentData.styles || {
              hero: {
                backgroundColor: '', titleColor: '', subtitleColor: '', descriptionColor: '',
                textAlign: 'center', titleFontSize: '', subtitleFontSize: '', descriptionFontSize: '',
                titleFontStyle: 'normal', subtitleFontStyle: 'normal', descriptionFontStyle: 'normal'
              },
              stats: { backgroundColor: '', numberColor: '', labelColor: '' },
              cta: { backgroundColor: '', titleColor: '', subtitleColor: '', descriptionColor: '' }
            }
          })
        } catch (e) {
          console.error('Error parsing homepage content:', e)
        }
      }
    } catch (error) {
      console.error('Error fetching homepage:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Word count validation for Hero Description
    const heroDescWords = formData.heroDescription.trim() ? formData.heroDescription.trim().split(/\s+/).length : 0
    if (heroDescWords > 250) {
      toast.error('Hero Description cannot exceed 250 words')
      return
    }

    setSaving(true)
    try {
      const contentData = {
        heroTitle: formData.heroTitle,
        heroSubtitle: formData.heroSubtitle,
        heroDescription: formData.heroDescription,
        stats: formData.stats,
        cta: formData.cta,
        styles: formData.styles
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
            ? (typeof formData.seo.keywords === 'string'
              ? formData.seo.keywords.split(',').map(k => k.trim()).filter(k => k)
              : formData.seo.keywords)
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

  const updateCTA = (field, value) => {
    setFormData({
      ...formData,
      cta: { ...formData.cta, [field]: value }
    })
  }

  const updateStyle = (section, field, value) => {
    setFormData({
      ...formData,
      styles: {
        ...formData.styles,
        [section]: { ...formData.styles[section], [field]: value }
      }
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
            {expandedSections.hero ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Hero Description</label>
                  <span className={`text-xs font-semibold ${formData.heroDescription.trim() ? (formData.heroDescription.trim().split(/\s+/).length > 250 ? 'text-red-500' : 'text-gray-500') : 'text-gray-500'}`}>
                    {formData.heroDescription.trim() ? formData.heroDescription.trim().split(/\s+/).length : 0}/250 words
                  </span>
                </div>
                <textarea
                  value={formData.heroDescription}
                  onChange={(e) => setFormData({ ...formData, heroDescription: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all ${formData.heroDescription.trim() && formData.heroDescription.trim().split(/\s+/).length > 250 ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
                  placeholder="Discover premium homes..."
                />
                {formData.heroDescription.trim() && formData.heroDescription.trim().split(/\s+/).length > 250 && (
                  <p className="text-red-500 text-xs mt-1">Description cannot exceed 250 words.</p>
                )}
              </div>

              {/* Dynamic Styles for Hero */}
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary-500" />
                  Hero Section Styling
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Background Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.styles.hero.backgroundColor || '#0a213e'}
                        onChange={(e) => updateStyle('hero', 'backgroundColor', e.target.value)}
                        className="h-9 w-12 p-1 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.styles.hero.backgroundColor}
                        onChange={(e) => updateStyle('hero', 'backgroundColor', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#0a213e"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.styles.hero.titleColor || '#ffffff'}
                        onChange={(e) => updateStyle('hero', 'titleColor', e.target.value)}
                        className="h-9 w-12 p-1 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.styles.hero.titleColor}
                        onChange={(e) => updateStyle('hero', 'titleColor', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.styles.hero.subtitleColor || '#ffffff'}
                        onChange={(e) => updateStyle('hero', 'subtitleColor', e.target.value)}
                        className="h-9 w-12 p-1 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.styles.hero.subtitleColor}
                        onChange={(e) => updateStyle('hero', 'subtitleColor', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Desc Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.styles.hero.descriptionColor || '#ffffff'}
                        onChange={(e) => updateStyle('hero', 'descriptionColor', e.target.value)}
                        className="h-9 w-12 p-1 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.styles.hero.descriptionColor}
                        onChange={(e) => updateStyle('hero', 'descriptionColor', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                {/* Typography & Alignment */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Text Alignment</label>
                    <select
                      value={formData.styles.hero.textAlign || 'center'}
                      onChange={(e) => updateStyle('hero', 'textAlign', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title Font Style</label>
                    <select
                      value={formData.styles.hero.titleFontStyle || 'normal'}
                      onChange={(e) => updateStyle('hero', 'titleFontStyle', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="italic">Italic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title Size (rem/px)</label>
                    <input
                      type="text"
                      value={formData.styles.hero.titleFontSize || ''}
                      onChange={(e) => updateStyle('hero', 'titleFontSize', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                      placeholder="e.g. 4rem or 64px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Desc Size (rem/px)</label>
                    <input
                      type="text"
                      value={formData.styles.hero.descriptionFontSize || ''}
                      onChange={(e) => updateStyle('hero', 'descriptionFontSize', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                      placeholder="e.g. 1.25rem"
                    />
                  </div>
                </div>
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
              📊 Stats Section
            </h3>
            {expandedSections.stats ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
          </button>

          {expandedSections.stats && (
            <div className="p-6 space-y-4">
              {formData.stats.map((stat, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <input
                    type="text"
                    value={stat.number}
                    onChange={(e) => updateStat(index, 'number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Number (e.g. 500+)"
                  />
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(e) => updateStat(index, 'label', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Label (e.g. Happy Clients)"
                  />
                </div>
              ))}
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-800 mb-2">Stats Styling</h4>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="color"
                    value={formData.styles.stats.backgroundColor || '#0a213e'}
                    onChange={(e) => updateStyle('stats', 'backgroundColor', e.target.value)}
                    className="h-8 w-full cursor-pointer"
                    title="Background"
                  />
                  <input
                    type="color"
                    value={formData.styles.stats.numberColor || '#ffffff'}
                    onChange={(e) => updateStyle('stats', 'numberColor', e.target.value)}
                    className="h-8 w-full cursor-pointer"
                    title="Number Color"
                  />
                  <input
                    type="color"
                    value={formData.styles.stats.labelColor || '#ffffff'}
                    onChange={(e) => updateStyle('stats', 'labelColor', e.target.value)}
                    className="h-8 w-full cursor-pointer"
                    title="Label Color"
                  />
                </div>
              </div>
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
              🚀 CTA Section
            </h3>
            {expandedSections.cta ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
          </button>
          {expandedSections.cta && (
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={formData.cta.title}
                onChange={(e) => updateCTA('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-bold"
                placeholder="CTA Title"
              />
              <textarea
                value={formData.cta.description}
                onChange={(e) => updateCTA('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows={2}
                placeholder="CTA Description"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.cta.primaryButtonText}
                  onChange={(e) => updateCTA('primaryButtonText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Button Text"
                />
                <input
                  type="text"
                  value={formData.cta.primaryButtonLink}
                  onChange={(e) => updateCTA('primaryButtonLink', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Button Link"
                />
              </div>
              {/* CTA Styles */}
              <div className="pt-4 border-t border-gray-100 mt-4">
                <h4 className="text-xs font-semibold text-gray-800 mb-2">CTA Styling</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="color"
                    value={formData.styles.cta.backgroundColor || '#0a213e'}
                    onChange={(e) => updateStyle('cta', 'backgroundColor', e.target.value)}
                    className="h-8 w-full cursor-pointer"
                  />
                  <input
                    type="color"
                    value={formData.styles.cta.titleColor || '#ffffff'}
                    onChange={(e) => updateStyle('cta', 'titleColor', e.target.value)}
                    className="h-8 w-full cursor-pointer"
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
              🔍 SEO Settings
            </h3>
            {expandedSections.seo ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
          </button>
          {expandedSections.seo && (
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={formData.seo.metaTitle}
                onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, metaTitle: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="Meta Title"
              />
              <textarea
                value={formData.seo.metaDescription}
                onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, metaDescription: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows={2}
                placeholder="Meta Description"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold shadow-lg disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save Homepage Content'}
          </button>
        </div>
      </form>
    </div>
  )
}
