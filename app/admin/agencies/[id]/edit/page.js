'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Building, Mail, Phone, MapPin, Upload, X, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import PhoneField from '@/components/Common/PhoneField'
import { buildE164Phone, splitE164Phone, DEFAULT_COUNTRY_CODE } from '@/lib/phone'
import { scrollToFirstErrorField } from '@/lib/scrollToError'
import { validateConfirmPassword, validateEmail, validatePassword, validateRequired, validateUrlOptional } from '@/lib/validation'
import {
  sanitizePostalDigits,
  isValidOptionalPostalDigits,
  OPTIONAL_POSTAL_DIGITS_MESSAGE
} from '@/lib/postalCode'

export default function EditAgencyPage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const fileInputRef = useRef(null)
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [errors, setErrors] = useState({})
  const [geo, setGeo] = useState({ countries: [], states: [], cities: [] })
  const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false })
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

  useEffect(() => {
    if (!authLoading && user) {
      fetchAgencyData()
    }
  }, [user, authLoading, params.id])

  useEffect(() => {
    fetchCountries()
  }, [])

  useEffect(() => {
    fetchStates(formData.contact.address.country)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.contact.address.country])

  useEffect(() => {
    fetchCities(formData.contact.address.country, formData.contact.address.state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.contact.address.country, formData.contact.address.state])

  const fetchCountries = async () => {
    try {
      setGeoLoading((p) => ({ ...p, countries: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions')
      const data = await res.json()
      const countries = Array.isArray(data?.data)
        ? data.data.map((c) => String(c?.name || '').trim()).filter(Boolean)
        : []
      countries.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, countries }))
    } catch (error) {
      console.error('Error fetching countries:', error)
      setGeo((p) => ({ ...p, countries: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, countries: false }))
    }
  }

  const fetchStates = async (country) => {
    if (!country) {
      setGeo((p) => ({ ...p, states: [], cities: [] }))
      setFormData((prev) => ({
        ...prev,
        contact: {
          ...prev.contact,
          address: { ...prev.contact.address, state: '', city: '' }
        }
      }))
      return
    }

    try {
      setGeoLoading((p) => ({ ...p, states: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      })
      const data = await res.json()
      const states = Array.isArray(data?.data?.states)
        ? data.data.states.map((s) => String(s?.name || '').trim()).filter(Boolean)
        : []
      states.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, states, cities: [] }))
      setFormData((prev) => {
        const currentState = prev.contact.address.state
        if (!currentState || states.includes(currentState)) return prev
        return {
          ...prev,
          contact: {
            ...prev.contact,
            address: { ...prev.contact.address, state: '', city: '' }
          }
        }
      })
    } catch (error) {
      console.error('Error fetching states:', error)
      setGeo((p) => ({ ...p, states: [], cities: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, states: false }))
    }
  }

  const fetchCities = async (country, state) => {
    if (!country || !state) {
      setGeo((p) => ({ ...p, cities: [] }))
      setFormData((prev) => ({
        ...prev,
        contact: {
          ...prev.contact,
          address: { ...prev.contact.address, city: '' }
        }
      }))
      return
    }

    try {
      setGeoLoading((p) => ({ ...p, cities: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state })
      })
      const data = await res.json()
      const cities = Array.isArray(data?.data)
        ? data.data.map((c) => String(c || '').trim()).filter(Boolean)
        : []
      cities.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, cities }))
      setFormData((prev) => {
        const currentCity = prev.contact.address.city
        if (!currentCity || cities.includes(currentCity)) return prev
        return {
          ...prev,
          contact: {
            ...prev.contact,
            address: { ...prev.contact.address, city: '' }
          }
        }
      })
    } catch (error) {
      console.error('Error fetching cities:', error)
      setGeo((p) => ({ ...p, cities: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, cities: false }))
    }
  }

  const fetchAgencyData = async () => {
    try {
      setFetching(true)
      const response = await api.get(`/agencies/${params.id}`)
      const agency = response.data.agency
      const parsedPhone = splitE164Phone(agency.contact?.phone || '')

      setFormData({
        name: agency.name || '',
        slug: agency.slug || '',
        description: agency.description || '',
        contact: {
          email: agency.contact?.email || '',
          phone: parsedPhone.phone || '',
          website: agency.contact?.website || '',
          address: {
            street: agency.contact?.address?.street || '',
            city: agency.contact?.address?.city || '',
            state: agency.contact?.address?.state || '',
            country: agency.contact?.address?.country || '',
            zipCode: agency.contact?.address?.zipCode || ''
          }
        },
        logo: agency.logo || '',
        isActive: agency.isActive !== undefined ? agency.isActive : true,
        password: '',
        confirmPassword: ''
      })

      if (agency.logo) {
        setLogoPreview(agency.logo)
      }
      setPhoneCountryCode(parsedPhone.countryCode || DEFAULT_COUNTRY_CODE)
    } catch (error) {
      console.error('Error fetching agency:', error)
      toast.error('Failed to load agency data')
      router.push('/admin/agencies')
    } finally {
      setFetching(false)
    }
  }

  if (authLoading || fetching) {
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
            ? sanitizePostalDigits(value)
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

  const sanitizeSlug = (value) => {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+/, '')
  }

  const handleSlugChange = (e) => {
    const cleaned = sanitizeSlug(e.target.value)
    setFormData((prev) => ({ ...prev, slug: cleaned }))
    if (errors.slug) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.slug
        return next
      })
    }
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
      nextErrors['contact.website'] = validateUrlOptional(formData.contact?.website, 'Website')
      if (!isValidOptionalPostalDigits(formData.contact?.address?.zipCode)) {
        nextErrors['contact.address.zipCode'] = OPTIONAL_POSTAL_DIGITS_MESSAGE
      }

      const e164Phone = buildE164Phone(phoneCountryCode, formData.contact?.phone)
      if (!e164Phone) {
        nextErrors['contact.phone'] = 'Enter a valid phone number for the selected country'
      }

      // Validate passwords if provided
      if (formData.password || formData.confirmPassword) {
        if (!formData.password || !formData.confirmPassword) {
          nextErrors.password = nextErrors.password || 'Please fill both password fields to reset the password'
          nextErrors.confirmPassword = nextErrors.confirmPassword || 'Please fill both password fields to reset the password'
        } else {
          nextErrors.password = validatePassword(formData.password)
          nextErrors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword)
        }
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

      const trim = (v) => String(v ?? '').trim()
      const addressIn = formData.contact?.address || {}
      const address = {
        street: trim(addressIn.street),
        city: trim(addressIn.city),
        state: trim(addressIn.state),
        country: trim(addressIn.country),
        zipCode: trim(addressIn.zipCode)
      }
      Object.keys(address).forEach((k) => {
        if (!address[k]) delete address[k]
      })

      const cleanedData = {
        name: trim(formData.name),
        slug: trim(formData.slug),
        description: trim(formData.description),
        logo: formData.logo || '',
        isActive: !!formData.isActive,
        contact: {
          email: trim(formData.contact?.email),
          phone: e164Phone,
          website: trim(formData.contact?.website),
          address
        }
      }

      if (formData.password) {
        cleanedData.password = formData.password
      }

      await api.put(`/agencies/${params.id}`, cleanedData)
      toast.success('Agency updated successfully' + (cleanedData.password ? '. Password has been reset.' : ''))
      router.push('/admin/agencies')
    } catch (error) {
      console.error('Error updating agency:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update agency'
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
              <h1 className="text-2xl font-bold text-gray-900">Edit Agency</h1>
              <p className="mt-1 text-sm text-gray-500">Update agency information</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Basic Information
            </h2>

            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-900 mb-2">
                Agency Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
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
              <label htmlFor="slug" className="block text-sm font-bold text-gray-900 mb-2">
                URL Slug<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                autoComplete="off"
                spellCheck={false}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.slug ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Enter URL slug"
                value={formData.slug}
                onChange={handleSlugChange}
              />
              <p className="mt-1 text-xs text-gray-500">Used in URLs (e.g., /agencies/agency-slug)</p>
              {errors.slug && (
                <p className="mt-1 text-xs font-semibold text-red-600">{errors.slug}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-bold text-gray-900 mb-2">
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
              <label htmlFor="logo" className="block text-sm font-bold text-gray-900 mb-2">
                Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative h-24 w-24 rounded-lg border border-gray-200 bg-gray-50 p-1 flex items-center justify-center overflow-hidden">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        setLogoPreview(null)
                      }}
                    />
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
                  <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
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
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact.email" className="block text-sm font-bold text-gray-900 mb-2">
                  <Mail className="h-4 w-4 inline mr-1 align-text-bottom" />
                  Email<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact.email"
                  name="contact.email"
                  type="email"
                  required
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors['contact.email'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter email"
                  value={formData.contact.email}
                  onChange={handleChange}
                />
                {errors['contact.email'] && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors['contact.email']}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact.phone" className="block text-sm font-bold text-gray-900 mb-2">
                  <Phone className="h-4 w-4 inline mr-1 align-text-bottom" />
                  Phone<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
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

              <div className="md:col-span-2">
                <label htmlFor="contact.website" className="block text-sm font-bold text-gray-900 mb-2">
                  Website
                </label>
                <input
                  id="contact.website"
                  name="contact.website"
                  type="url"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors['contact.website'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter website URL"
                  value={formData.contact.website}
                  onChange={handleChange}
                />
                {errors['contact.website'] && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors['contact.website']}</p>
                )}
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="space-y-4 border-t pt-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  Reset Agency Admin Password
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter a new password below to reset the agency admin login password. Leave blank to keep the current password. 
                  The new password will be used for login immediately after reset.
                </p>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        minLength={6}
                        className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Enter new password"
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
                    {errors.password ? (
                      <p className="mt-1 text-xs font-semibold text-red-600">{errors.password}</p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">This password will be used for agency admin login.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-900 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
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
                    {errors.confirmPassword ? (
                      <p className="mt-1 text-xs font-semibold text-red-600">{errors.confirmPassword}</p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">Re-enter the password to confirm.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </h3>

              <div>
                <label htmlFor="contact.address.street" className="block text-sm font-bold text-gray-900 mb-2">
                  Street
                </label>
                <input
                  id="contact.address.street"
                  name="contact.address.street"
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter street address"
                  value={formData.contact.address.street}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact.address.country" className="block text-sm font-bold text-gray-900 mb-2">
                    Country
                  </label>
                  <select
                    id="contact.address.country"
                    name="contact.address.country"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.contact.address.country}
                    onChange={handleChange}
                  >
                    <option value="">{geoLoading.countries ? 'Loading countries...' : 'Select country'}</option>
                    {geo.countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact.address.state" className="block text-sm font-bold text-gray-900 mb-2">
                    State
                  </label>
                  <select
                    id="contact.address.state"
                    name="contact.address.state"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    value={formData.contact.address.state}
                    onChange={handleChange}
                    disabled={!formData.contact.address.country || geoLoading.states}
                  >
                    <option value="">{geoLoading.states ? 'Loading states...' : 'Select state'}</option>
                    {geo.states.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact.address.city" className="block text-sm font-bold text-gray-900 mb-2">
                    City
                  </label>
                  <select
                    id="contact.address.city"
                    name="contact.address.city"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    value={formData.contact.address.city}
                    onChange={handleChange}
                    disabled={!formData.contact.address.state || geoLoading.cities}
                  >
                    <option value="">{geoLoading.cities ? 'Loading cities...' : 'Select city'}</option>
                    {geo.cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact.address.zipCode" className="block text-sm font-bold text-gray-900 mb-2">
                    ZIP Code
                  </label>
                  <input
                    id="contact.address.zipCode"
                    name="contact.address.zipCode"
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors['contact.address.zipCode'] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter ZIP code"
                    value={formData.contact.address.zipCode}
                    onChange={handleChange}
                  />
                  {formData.contact.address.zipCode && !isValidOptionalPostalDigits(formData.contact.address.zipCode) && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      {OPTIONAL_POSTAL_DIGITS_MESSAGE}
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
            <label htmlFor="isActive" className="text-sm font-bold text-gray-900">
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
              {loading ? 'Updating...' : 'Update Agency'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

