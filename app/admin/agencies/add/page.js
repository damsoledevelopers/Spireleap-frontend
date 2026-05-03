'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, Building, Mail, Phone, MapPin, Upload, X, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import PhoneField from '../../../../components/Common/PhoneField'
import { buildE164Phone, DEFAULT_COUNTRY_CODE } from '../../../../lib/phone'
import { validateConfirmPassword, validateEmail, validatePassword, validateRequired, validateUrlOptional } from '../../../../lib/validation'
import { scrollToFirstErrorField } from '../../../../lib/scrollToError'

export default function AddAgencyPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const fileInputRef = useRef(null)
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    contact: {
      email: '',
      phone: '',
      website: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      }
    },
    logo: '',
    isActive: true,
    password: '',
    confirmPassword: ''
  })

  const sanitizeAlphaText = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
  const sanitizeZip = (v) => String(v || '').replace(/\D/g, '').slice(0, 9)
  const isValidZip = (v) => {
    const s = String(v || '').trim()
    if (!s) return true
    return s.length === 5 || s.length === 9
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600">You don't have permission to view this page</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.')
      const isAddressField = parent === 'contact' && child === 'address' && grandchild
      const nextValue =
        isAddressField && ['city', 'state', 'country'].includes(grandchild)
          ? sanitizeAlphaText(value)
          : isAddressField && grandchild === 'zipCode'
            ? sanitizeZip(value)
            : (type === 'checkbox' ? checked : value)
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: grandchild ? {
            ...prev[parent][child],
            [grandchild]: nextValue
          } : (type === 'checkbox' ? checked : value)
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (e) => {
    const name = e.target.value
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }))
    if (errors.name || errors.slug) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.name
        delete next.slug
        return next
      })
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
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'agencies')

      const response = await api.post('/upload?folder=agencies', formData, {
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
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const nextErrors = {}
      nextErrors.name = validateRequired(formData.name, 'Agency name')
      nextErrors.slug = validateRequired(formData.slug, 'URL slug')
      if (formData.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(formData.slug).trim())) {
        nextErrors.slug = 'Slug can contain lowercase letters, numbers, and hyphens only'
      }
      nextErrors['contact.email'] = validateEmail(formData.contact?.email, 'Email')
      nextErrors.password = validatePassword(formData.password)
      nextErrors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword)
      nextErrors['contact.website'] = validateUrlOptional(formData.contact?.website, 'Website')
      if (!isValidZip(formData.contact?.address?.zipCode)) {
        nextErrors['contact.address.zipCode'] = 'ZIP Code must be 5 digits or 9 digits (ZIP+4)'
      }

      const e164Phone = buildE164Phone(phoneCountryCode, formData.contact?.phone)
      if (!e164Phone) {
        nextErrors['contact.phone'] = 'Enter a valid phone number for the selected country'
      }

      Object.keys(nextErrors).forEach((k) => {
        if (!nextErrors[k]) delete nextErrors[k]
      })
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        scrollToFirstErrorField(Object.keys(nextErrors))
        setLoading(false)
        return
      }

      // Clean up form data - remove empty address fields and password confirmation
      const cleanedData = { ...formData }
      if (!cleanedData.contact.address.street && 
          !cleanedData.contact.address.city && 
          !cleanedData.contact.address.state) {
        cleanedData.contact.address = {}
      }

      // Remove confirmPassword from data sent to backend
      delete cleanedData.confirmPassword
      cleanedData.contact = {
        ...cleanedData.contact,
        phone: e164Phone
      }

      await api.post('/agencies', cleanedData)
      toast.success('Agency created successfully! Agency admin account has been created with the provided email and password.')
      router.push('/admin/agencies')
    } catch (error) {
      console.error('Error creating agency:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create agency'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/agencies" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Agency</h1>
              <p className="mt-1 text-sm text-gray-500">Create a new real estate agency</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Basic Information
            </h2>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Agency Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Enter agency name"
                value={formData.name}
                onChange={handleNameChange}
              />
              {errors.name && (
                <p className="mt-1 text-xs font-semibold text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug *
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.slug ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="agency-slug"
                value={formData.slug}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">Used in URLs (e.g., /agencies/agency-slug)</p>
              {errors.slug && (
                <p className="mt-1 text-xs font-semibold text-red-600">{errors.slug}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter agency description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(null)
                        setFormData(prev => ({ ...prev, logo: '' }))
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <Building className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Logo
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={loading}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">Maximum file size: 5MB (JPG, PNG, GIF)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {/* <Phone className="h-5 w-5" /> */}
              {/* Contact Information */}Login information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact.email" className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email *
                </label>
                <input
                  id="contact.email"
                  name="contact.email"
                  type="email"
                  required
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors['contact.email'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="info@agency.com"
                  value={formData.contact.email}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-500">This email will be used for agency admin login</p>
                {errors['contact.email'] && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors['contact.email']}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact.phone" className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone *
                </label>
                <PhoneField
                  required
                  label=""
                  countryCodeName="contact.phoneCountryCode"
                  phoneName="contact.phone"
                  countryCodeValue={phoneCountryCode}
                  phoneValue={formData.contact.phone}
                  onCountryCodeChange={(value) => setPhoneCountryCode(value)}
                  onPhoneChange={(value) => {
                    setFormData((prev) => ({ ...prev, contact: { ...prev.contact, phone: value } }))
                    if (errors['contact.phone']) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next['contact.phone']
                        return next
                      })
                    }
                  }}
                />
                {errors['contact.phone'] && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors['contact.phone']}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter password for agency admin"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for agency admin login.</p>
                {errors.password && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="contact.website" className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  id="contact.website"
                  name="contact.website"
                  type="url"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors['contact.website'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="https://www.agency.com"
                  value={formData.contact.website}
                  onChange={handleChange}
                />
                {errors['contact.website'] && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors['contact.website']}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </h3>

              <div>
                <label htmlFor="contact.address.street" className="block text-sm font-medium text-gray-700 mb-2">
                  Street
                </label>
                <input
                  id="contact.address.street"
                  name="contact.address.street"
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="123 Main Street"
                  value={formData.contact.address.street}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact.address.city" className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    id="contact.address.city"
                    name="contact.address.city"
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Miami"
                    value={formData.contact.address.city}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="contact.address.state" className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    id="contact.address.state"
                    name="contact.address.state"
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="FL"
                    value={formData.contact.address.state}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="contact.address.country" className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    id="contact.address.country"
                    name="contact.address.country"
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="USA"
                    value={formData.contact.address.country}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="contact.address.zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    id="contact.address.zipCode"
                    name="contact.address.zipCode"
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors['contact.address.zipCode'] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="33101"
                    value={formData.contact.address.zipCode}
                    onChange={handleChange}
                  />
                  {formData.contact.address.zipCode && !isValidZip(formData.contact.address.zipCode) && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      ZIP Code must be 5 digits or 9 digits (ZIP+4)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active Agency
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link
              href="/admin/agencies"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Agency'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

