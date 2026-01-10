'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Building, Mail, Phone, MapPin, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function EditAgencyPage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [logoPreview, setLogoPreview] = useState(null)
  const fileInputRef = useRef(null)
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

  useEffect(() => {
    if (!authLoading && user) {
      fetchAgencyData()
    }
  }, [user, authLoading, params.id])

  const fetchAgencyData = async () => {
    try {
      setFetching(true)
      const response = await api.get(`/agencies/${params.id}`)
      const agency = response.data.agency

      setFormData({
        name: agency.name || '',
        slug: agency.slug || '',
        description: agency.description || '',
        contact: {
          email: agency.contact?.email || '',
          phone: agency.contact?.phone || '',
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
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: grandchild ? {
            ...prev[parent][child],
            [grandchild]: type === 'checkbox' ? checked : value
          } : (type === 'checkbox' ? checked : value)
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
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
      // Validate passwords if provided
      if (formData.password || formData.confirmPassword) {
        // If one password field is filled, both must be filled
        if (!formData.password || !formData.confirmPassword) {
          toast.error('Please fill both password fields to reset the password')
          setLoading(false)
          return
        }

        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match')
          setLoading(false)
          return
        }

        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setLoading(false)
          return
        }
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

      // If password is empty, remove it from the request
      if (!cleanedData.password) {
        delete cleanedData.password
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter agency name"
                value={formData.name}
                onChange={handleNameChange}
              />
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="agency-slug"
                value={formData.slug}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">Used in URLs (e.g., /agencies/agency-slug)</p>
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
              <Phone className="h-5 w-5" />
              Contact Information
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="info@agency.com"
                  value={formData.contact.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="contact.phone" className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone *
                </label>
                <input
                  id="contact.phone"
                  name="contact.phone"
                  type="tel"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="+1-555-0100"
                  value={formData.contact.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="contact.website" className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  id="contact.website"
                  name="contact.website"
                  type="url"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://www.agency.com"
                  value={formData.contact.website}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="space-y-4 border-t pt-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-900 mb-2">
                  Reset Agency Admin Password
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter a new password below to reset the agency admin login password. Leave blank to keep the current password. 
                  The new password will be used for login immediately after reset.
                </p>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter new password (min 6 characters)"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum 6 characters. This password will be used for agency admin login.</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Confirm new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">Re-enter the password to confirm.</p>
                  </div>
                </div>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="33101"
                    value={formData.contact.address.zipCode}
                    onChange={handleChange}
                  />
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
              {loading ? 'Updating...' : 'Update Agency'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

