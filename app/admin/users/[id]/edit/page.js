'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Shield, Eye, EyeOff, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import PhoneField from '@/components/Common/PhoneField'
import { buildE164Phone, splitE164Phone, DEFAULT_COUNTRY_CODE } from '@/lib/phone'
import SearchableSelect from '@/components/Common/SearchableSelect'
import { scrollToFirstErrorField } from '@/lib/scrollToError'
import { validateEmail, validateName, validatePassword } from '@/lib/validation'

export default function AdminUserEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agencies, setAgencies] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    agency: '',
    isActive: true,
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    }
  })

  const sanitizeZip = (v) => String(v || '').replace(/\D/g, '').slice(0, 9)
  const isValidZip = (v) => {
    const s = String(v || '').trim()
    if (!s) return true
    return s.length === 5 || s.length === 9
  }

  useEffect(() => {
    fetchUser()
    if (currentUser?.role === 'super_admin') {
      fetchAgencies()
    }
  }, [params.id])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/users/${params.id}`)
      const user = response.data
      const parsedPhone = splitE164Phone(user.phone || '')
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: parsedPhone.phone || '',
        role: user.role || '',
        agency: user.agency ? (typeof user.agency === 'object' ? user.agency._id : user.agency) : '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        address: user.address || {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: ''
        }
      })
      setPhoneCountryCode(parsedPhone.countryCode || DEFAULT_COUNTRY_CODE)
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load user details')
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgencies = async () => {
    try {
      const response = await api.get('/agencies')
      setAgencies(response.data.agencies || [])
    } catch (error) {
      console.error('Error fetching agencies:', error)
    }
  }

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const keys = field.split('.')
      setFormData(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const nextErrors = {}
      nextErrors.firstName = validateName(formData.firstName, 'First name')
      nextErrors.lastName = validateName(formData.lastName, 'Last name')
      nextErrors.email = validateEmail(formData.email, 'Email')
      if (!isValidZip(formData.address?.zipCode)) {
        nextErrors['address.zipCode'] = 'ZIP Code must be 5 digits or 9 digits (ZIP+4)'
      }
      const e164Phone = formData.phone ? buildE164Phone(phoneCountryCode, formData.phone) : ''
      if (formData.phone && !e164Phone) {
        nextErrors.phone = 'Enter a valid phone number for the selected country'
      }
      if (currentUser?.role === 'super_admin' && formData.password && formData.password.trim() !== '') {
        nextErrors.password = validatePassword(formData.password)
      }
      Object.keys(nextErrors).forEach((k) => {
        if (!nextErrors[k]) delete nextErrors[k]
      })
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        scrollToFirstErrorField(Object.keys(nextErrors))
        setSaving(false)
        return
      }

      const updateData = {
        ...formData,
        phone: e164Phone || formData.phone,
        agency: formData.agency || undefined,
        address: Object.values(formData.address).some(v => v) ? formData.address : undefined
      }

      // Only include password if it's provided (not empty)
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password
      }

      // Remove empty address fields
      if (updateData.address) {
        Object.keys(updateData.address).forEach(key => {
          if (!updateData.address[key]) {
            delete updateData.address[key]
          }
        })
        if (Object.keys(updateData.address).length === 0) {
          delete updateData.address
        }
      }

      await api.put(`/users/${params.id}`, updateData)
      toast.success('User updated successfully')
      router.push('/admin/users')
    } catch (error) {
      console.error('Error updating user:', error)
      const errorData = error.response?.data
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        // If it's a validation error array, show each one
        errorData.errors.forEach(err => {
          toast.error(`${err.path}: ${err.msg}`)
        })
      } else {
        toast.error(errorData?.message || 'Failed to update user')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
              <p className="mt-1 text-sm text-gray-500">Update user information</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.lastName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <PhoneField
                  label=""
                  countryCodeName="phoneCountryCode"
                  phoneName="phone"
                  countryCodeValue={phoneCountryCode}
                  phoneValue={formData.phone}
                  onCountryCodeChange={(value) => setPhoneCountryCode(value)}
                  onPhoneChange={(value) => handleInputChange('phone', value)}
                  showInlineError={Boolean(formData.phone)}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.phone}</p>
                )}
              </div>
              {currentUser?.role === 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Key className="h-4 w-4" />
                    Password (leave blank to keep current)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                      minLength={6}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs font-semibold text-red-600">{errors.password}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <SearchableSelect
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                  options={[
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' }
                  ]}
                  placeholder="Status"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search..."
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', sanitizeZip(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors['address.zipCode'] ? 'border-red-500' : 'border-gray-300'}`}
                />
                {(formData.address.zipCode && !isValidZip(formData.address.zipCode)) || errors['address.zipCode'] ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {errors['address.zipCode'] || 'ZIP Code must be 5 digits or 9 digits (ZIP+4)'}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/admin/users"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

