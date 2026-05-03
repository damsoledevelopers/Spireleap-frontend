'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Eye, EyeOff, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import PhoneField from '../../../../components/Common/PhoneField'
import SearchableSelect from '../../../../components/Common/SearchableSelect'
import { buildE164Phone, DEFAULT_COUNTRY_CODE } from '../../../../lib/phone'
import { validateConfirmPassword, validateEmail, validateName, validatePassword } from '../../../../lib/validation'
import { scrollToFirstErrorField } from '../../../../lib/scrollToError'

export default function AddStaffPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    isActive: true,
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    staffInfo: {
      department: '',
      position: '',
      employeeId: ''
    }
  })

  const sanitizeName = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
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

  const handleInputChange = (field, value) => {
    const keys = field.split('.')
    if (keys.length === 1) {
      setFormData({ ...formData, [field]: value })
    } else if (keys.length === 2) {
      setFormData({
        ...formData,
        [keys[0]]: { ...formData[keys[0]], [keys[1]]: value }
      })
    } else if (keys.length === 3) {
      setFormData({
        ...formData,
        [keys[0]]: {
          ...formData[keys[0]],
          [keys[1]]: {
            ...formData[keys[0]][keys[1]],
            [keys[2]]: value
          }
        }
      })
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
    setLoading(true)

    const nextErrors = {}
    nextErrors.firstName = validateName(formData.firstName, 'First name')
    nextErrors.lastName = validateName(formData.lastName, 'Last name')
    nextErrors.email = validateEmail(formData.email, 'Email')
    nextErrors.password = validatePassword(formData.password)
    nextErrors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword)
    if (!isValidZip(formData.address?.zipCode)) {
      nextErrors['address.zipCode'] = 'ZIP Code must be 5 digits or 9 digits (ZIP+4)'
    }
    const e164Phone = formData.phone ? buildE164Phone(phoneCountryCode, formData.phone) : undefined
    if (formData.phone && !e164Phone) {
      nextErrors.phone = 'Enter a valid phone number for the selected country'
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

    try {
      // Prepare user data
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: 'staff',
        phone: formData.phone ? buildE164Phone(phoneCountryCode, formData.phone) : undefined,
        isActive: formData.isActive,
        address: Object.values(formData.address).some(v => v) ? formData.address : undefined,
        staffInfo: {
          department: formData.staffInfo.department || undefined,
          position: formData.staffInfo.position || undefined,
          employeeId: formData.staffInfo.employeeId || undefined
        }
      }

      // Remove empty fields
      Object.keys(userData.staffInfo).forEach(key => {
        if (userData.staffInfo[key] === undefined || userData.staffInfo[key] === '') {
          delete userData.staffInfo[key]
        }
      })

      if (!userData.staffInfo.department && !userData.staffInfo.position && !userData.staffInfo.employeeId) {
        delete userData.staffInfo
      }

      // Use users endpoint for super admin
      await api.post('/users', userData)
      toast.success('Staff member created successfully! Staff can now login with their email and password.')
      router.push('/admin/staff')
    } catch (error) {
      console.error('Error creating staff:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create staff member'
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
            <Link href="/admin/staff" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Staff</h1>
              <p className="mt-1 text-sm text-gray-500">Create a new staff member account</p>
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
                  onChange={(e) => handleInputChange('firstName', sanitizeName(e.target.value))}
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
                  onChange={(e) => handleInputChange('lastName', sanitizeName(e.target.value))}
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
                <p className="mt-1 text-xs text-gray-500">This email will be used for staff login</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                  name="password"
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for staff login.</p>
                {errors.password && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.password}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    minLength={6}
                  />
                  <button
                    type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          {/* Staff Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Staff Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <SearchableSelect
                  value={formData.staffInfo.department}
                  onChange={(e) => handleInputChange('staffInfo.department', e.target.value)}
                  options={[
                    { value: 'accounts', label: 'Accounts' },
                    { value: 'hr', label: 'HR' },
                    { value: 'support', label: 'Support' },
                    { value: 'marketing', label: 'Marketing' },
                    { value: 'other', label: 'Other' }
                  ]}
                  placeholder="Select Department"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search department..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={formData.staffInfo.position}
                  onChange={(e) => handleInputChange('staffInfo.position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Support Specialist"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.staffInfo.employeeId}
                  onChange={(e) => handleInputChange('staffInfo.employeeId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., EMP-001"
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
                  onChange={(e) => handleInputChange('address.city', sanitizeAlphaText(e.target.value))}
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
                  onChange={(e) => handleInputChange('address.state', sanitizeAlphaText(e.target.value))}
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
                  onChange={(e) => handleInputChange('address.country', sanitizeAlphaText(e.target.value))}
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
                {formData.address.zipCode && !isValidZip(formData.address.zipCode) && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    ZIP Code must be 5 digits or 9 digits (ZIP+4)
                  </p>
                )}
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
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active Staff Member
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/admin/staff"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

