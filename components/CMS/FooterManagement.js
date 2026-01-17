'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Save, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function FooterManagement() {
  const { checkPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const fileInputRef = useRef(null)
  const [footerData, setFooterData] = useState(null)
  const [formData, setFormData] = useState({
    logo: '',
    companyName: '',
    companyTagline: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: '',
      youtube: ''
    },
    quickLinks: [
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' }
    ],
    saleLinks: [
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' }
    ],
    rentLinks: [
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' },
      { title: '', url: '' }
    ],
    bottomLinks: {
      terms: '',
      privacy: '',
      support: ''
    },
    copyright: '',
    additionalContent: ''
  })

  useEffect(() => {
    fetchFooterData()
  }, [])

  const fetchFooterData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/footer')
      if (response.data.footer) {
        setFooterData(response.data.footer)
        const data = response.data.footer
        setFormData({
          logo: data.logo || '',
          companyName: data.companyName || '',
          companyTagline: data.companyTagline || '',
          description: data.description || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          socialMedia: data.socialMedia || {
            facebook: '',
            twitter: '',
            instagram: '',
            linkedin: '',
            youtube: ''
          },
          quickLinks: data.quickLinks || formData.quickLinks,
          saleLinks: data.saleLinks || formData.saleLinks,
          rentLinks: data.rentLinks || formData.rentLinks,
          bottomLinks: data.bottomLinks || {
            terms: '',
            privacy: '',
            support: ''
          },
          copyright: data.copyright || '',
          additionalContent: data.additionalContent || ''
        })
        setLogoPreview(data.logo || null)
      }
    } catch (error) {
      console.error('Error fetching footer data:', error)
      // Footer doesn't exist yet, use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, GIF, etc.)')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      toast.error(`Logo size is ${fileSizeMB}MB. Maximum allowed size is 5MB. Please choose a smaller file.`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    try {
      setUploadingLogo(true)
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'footer')

      const response = await api.post('/upload?folder=footer', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setFormData(prev => ({ ...prev, logo: response.data.url }))
      setLogoPreview(response.data.url)
      toast.success('Logo uploaded successfully')
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: '' }))
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (footerData) {
        await api.put(`/cms/footer/${footerData._id}`, formData)
        toast.success('Footer updated successfully')
      } else {
        await api.post('/cms/footer', formData)
        toast.success('Footer created successfully')
      }
      // Always fetch fresh data after save to refresh form
      await fetchFooterData()
    } catch (error) {
      console.error('Error saving footer:', error)
      toast.error(error.response?.data?.message || 'Failed to save footer')
    } finally {
      setSaving(false)
    }
  }

  const updateLink = (type, index, field, value) => {
    const newLinks = [...formData[type]]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setFormData({ ...formData, [type]: newLinks })
  }

  const addLink = (type) => {
    setFormData({
      ...formData,
      [type]: [...formData[type], { title: '', url: '' }]
    })
  }

  const removeLink = (type, index) => {
    const newLinks = formData[type].filter((_, i) => i !== index)
    setFormData({ ...formData, [type]: newLinks })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-8">
      <div className="mb-8 pb-6 border-b-2 border-gray-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent">
          Footer Management
        </h2>
        <p className="text-gray-600 text-base">Manage your website footer content, links, and contact information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Company Information */}
        <div className="border-b-2 border-gray-200 pb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary-600"></div>
            Company Information
          </h3>
          <div className="space-y-4">
            {/* Logo Upload */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
              <label className="block text-sm font-semibold text-gray-800 mb-4">
                Company Logo
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Logo Preview Area */}
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <div className="relative group">
                      <div className="h-32 w-32 border-2 border-primary-300 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:border-primary-400">
                        <Image
                          src={logoPreview}
                          alt="Logo Preview"
                          width={128}
                          height={128}
                          className="object-contain p-2"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110 z-10"
                        aria-label="Remove logo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-32 w-32 border-2 border-dashed border-gray-400 rounded-xl flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 hover:border-primary-400 hover:bg-gradient-to-br hover:from-primary-50 hover:to-primary-100 transition-all duration-300">
                      <Upload className="h-10 w-10 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500 font-medium">No Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Button and Info */}
                <div className="flex-1 w-full sm:w-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className={`inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg cursor-pointer hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium ${uploadingLogo ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                      }`}
                  >
                    {uploadingLogo ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                  placeholder="NOVA KEYS"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Tagline
                </label>
                <input
                  type="text"
                  value={formData.companyTagline}
                  onChange={(e) => setFormData({ ...formData, companyTagline: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                  placeholder="Real Estate"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400 resize-none"
                placeholder="Your trusted partner in finding the perfect property. We connect you with premium real estate opportunities and expert agents to make your property dreams come true."
              />
              <p className="text-xs text-gray-500 mt-2">Brief description about your company (recommended: 100-200 characters)</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-b-2 border-gray-200 pb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary-600"></div>
            Contact Information
          </h3>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                  placeholder="info@novakeys.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Physical Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400 resize-none"
                placeholder="123 Real Estate Ave, City, State 12345"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="border-b-2 border-gray-200 pb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary-600"></div>
            Social Media Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Facebook URL</label>
              <input
                type="url"
                value={formData.socialMedia.facebook}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, facebook: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Twitter URL</label>
              <input
                type="url"
                value={formData.socialMedia.twitter}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, twitter: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                placeholder="https://twitter.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Instagram URL</label>
              <input
                type="url"
                value={formData.socialMedia.instagram}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, instagram: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn URL</label>
              <input
                type="url"
                value={formData.socialMedia.linkedin}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, linkedin: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                placeholder="https://linkedin.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">YouTube URL</label>
              <input
                type="url"
                value={formData.socialMedia.youtube}
                onChange={(e) => setFormData({
                  ...formData,
                  socialMedia: { ...formData.socialMedia, youtube: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="border-b-2 border-gray-200 pb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary-600"></div>
              Quick Links
            </h3>
            {checkPermission('cms', 'edit') && (
              <button
                type="button"
                onClick={() => addLink('quickLinks')}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <span className="text-lg">+</span>
                Add Link
              </button>
            )}
          </div>
          <div className="space-y-4">
            {formData.quickLinks.map((link, index) => (
              <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-all duration-200">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink('quickLinks', index, 'title', e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                    placeholder="Link Title (e.g., Home)"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink('quickLinks', index, 'url', e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                    placeholder="/link-url (e.g., /home)"
                  />
                </div>
                {checkPermission('cms', 'edit') && (
                  <button
                    type="button"
                    onClick={() => removeLink('quickLinks', index)}
                    className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Properties for Sale Links */}
        <div className="border-b-2 border-gray-200 pb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary-600"></div>
              Properties for Sale Links
            </h3>
            {checkPermission('cms', 'edit') && (
              <button
                type="button"
                onClick={() => addLink('saleLinks')}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <span className="text-lg">+</span>
                Add Link
              </button>
            )}
          </div>
          <div className="space-y-4">
            {formData.saleLinks.map((link, index) => (
              <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-all duration-200">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink('saleLinks', index, 'title', e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                    placeholder="Link Title (e.g., Apartments)"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink('saleLinks', index, 'url', e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                    placeholder="/link-url (e.g., /properties?type=apartment)"
                  />
                </div>
                {checkPermission('cms', 'edit') && (
                  <button
                    type="button"
                    onClick={() => removeLink('saleLinks', index)}
                    className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Properties for Rent Links */}
        <div className="border-b-2 border-gray-200 pb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary-600"></div>
              Properties for Rent Links
            </h3>
            {checkPermission('cms', 'edit') && (
              <button
                type="button"
                onClick={() => addLink('rentLinks')}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <span className="text-lg">+</span>
                Add Link
              </button>
            )}
          </div>
          <div className="space-y-4">
            {formData.rentLinks.map((link, index) => (
              <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-all duration-200">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink('rentLinks', index, 'title', e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                    placeholder="Link Title (e.g., Apartments)"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink('rentLinks', index, 'url', e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                    placeholder="/link-url (e.g., /properties?type=apartment&listingType=rent)"
                  />
                </div>
                {checkPermission('cms', 'edit') && (
                  <button
                    type="button"
                    onClick={() => removeLink('rentLinks', index)}
                    className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Links */}
        <div className="border-b-2 border-gray-200 pb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary-600"></div>
            Bottom Footer Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Terms & Conditions URL</label>
              <input
                type="text"
                value={formData.bottomLinks.terms}
                onChange={(e) => setFormData({
                  ...formData,
                  bottomLinks: { ...formData.bottomLinks, terms: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                placeholder="/terms"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Privacy Policy URL</label>
              <input
                type="text"
                value={formData.bottomLinks.privacy}
                onChange={(e) => setFormData({
                  ...formData,
                  bottomLinks: { ...formData.bottomLinks, privacy: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                placeholder="/privacy"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Support URL</label>
              <input
                type="text"
                value={formData.bottomLinks.support}
                onChange={(e) => setFormData({
                  ...formData,
                  bottomLinks: { ...formData.bottomLinks, support: e.target.value }
                })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-gray-400"
                placeholder="/support"
              />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-b-2 border-gray-200 pb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary-600"></div>
            Copyright Text
          </h3>
          <div className="space-y-5">
            {/* Predefined Copyright Text - Read Only */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border-2 border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-primary-600">🔒</span>
                Predefined Copyright Text (Fixed)
              </label>
              <div className="bg-white px-4 py-3 rounded-lg border-2 border-gray-300 shadow-inner">
                <p className="text-gray-800 font-medium">
                  © 2026 NOVAKEYS RealEstate. All Rights Reserved. Design and Developed with ♥ Spireleap Innovations
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <span className="text-gray-400">ℹ️</span>
                This text is fixed and cannot be changed. It will always appear in the footer.
              </p>
            </div>

            {/* Additional Content - Editable */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-xl border-2 border-primary-200 shadow-sm">
              <label className="block text-sm font-bold text-gray-800 mb-3">
                Additional Content
                <span className="text-primary-600 font-normal ml-2">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.additionalContent}
                onChange={(e) => setFormData({ ...formData, additionalContent: e.target.value })}
                className="w-full px-5 py-4 border-2 border-primary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white hover:border-primary-400 shadow-md hover:shadow-lg text-gray-800 font-medium"
                placeholder="Add your additional content here..."
              />
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-300 shadow-md">
              <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">👁️</span>
                Live Preview
              </p>
              <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-inner">
                <p className="text-sm text-gray-800 leading-relaxed">
                  <span className="font-semibold text-gray-700">© 2026 NOVAKEYS RealEstate. All Rights Reserved. Design and Developed with ♥ Spireleap Innovations</span>
                  {formData.additionalContent && (
                    <span className="text-gray-900 font-medium"> {formData.additionalContent}</span>
                  )}
                  {!formData.additionalContent && (
                    <span className="text-gray-400 italic font-normal"> [Your additional content will appear here]</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t-2 border-gray-200">
          {(footerData ? checkPermission('cms', 'edit') : checkPermission('cms', 'create')) && (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
            >
              <Save className="h-5 w-5" />
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Footer'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

