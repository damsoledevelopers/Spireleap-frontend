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
import {
  sanitizePostalDigits,
  isValidOptionalPostalDigits,
  OPTIONAL_POSTAL_DIGITS_MESSAGE
} from '../../../../lib/postalCode'

export default function AddStaffPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [errors, setErrors] = useState({})
  const [geo, setGeo] = useState({ countries: [], states: [], cities: [] })
  const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false })
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

  useEffect(() => {
    fetchCountries()
  }, [])

  useEffect(() => {
    fetchStates(formData.address.country)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.address.country])

  useEffect(() => {
    fetchCities(formData.address.country, formData.address.state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.address.country, formData.address.state])

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
      setFormData((prev) => ({ ...prev, address: { ...prev.address, state: '', city: '' } }))
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
        const currentState = prev.address.state
        if (!currentState || states.includes(currentState)) return prev
        return { ...prev, address: { ...prev.address, state: '', city: '' } }
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
        const currentCity = prev.address.city
        if (!currentCity || cities.includes(currentCity)) return prev
        return { ...prev, address: { ...prev.address, city: '' } }
      })
    } catch (error) {
      console.error('Error fetching cities:', error)
      setGeo((p) => ({ ...p, cities: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, cities: false }))
    }
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

  // const handleInputChange = (field, value) => {
  //   const keys = field.split('.')
  //   if (keys.length === 1) {
  //     setFormData({ ...formData, [field]: value })
  //   } else if (keys.length === 2) {
  //     setFormData({
  //       ...formData,
  //       [keys[0]]: { ...formData[keys[0]], [keys[1]]: value }
  //     })
  //   } else if (keys.length === 3) {
  //     setFormData({
  //       ...formData,
  //       [keys[0]]: {
  //         ...formData[keys[0]],
  //         [keys[1]]: {
  //           ...formData[keys[0]][keys[1]],
  //           [keys[2]]: value
  //         }
  //       }
  //     })
  //   }
  //   if (errors[field]) {
  //     setErrors((prev) => {
  //       const next = { ...prev }
  //       delete next[field]
  //       return next
  //     })
  //   }
  // }

  const handleInputChange = (field, value) => {
    const keys = field.split('.')

    setFormData((prev) => {
      if (keys.length === 1) {
        return {
          ...prev,
          [field]: value
        }
      }

      if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0]],
            [keys[1]]: value
          }
        }
      }

      if (keys.length === 3) {
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0]],
            [keys[1]]: {
              ...prev[keys[0]][keys[1]],
              [keys[2]]: value
            }
          }
        }
      }

      return prev
    })

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
    if (!isValidOptionalPostalDigits(formData.address?.zipCode)) {
      nextErrors['address.zipCode'] = OPTIONAL_POSTAL_DIGITS_MESSAGE
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
        // address: Object.values(formData.address).some(v => v) ? formData.address : undefined,
        address: (() => {
          const cleaned = { ...formData.address }

          Object.keys(cleaned).forEach((key) => {
            if (!cleaned[key]) {
              delete cleaned[key]
            }
          })

          return Object.keys(cleaned).length ? cleaned : undefined
        })(),
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
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  First Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', sanitizeName(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Last Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', sanitizeName(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.lastName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter email"
                />
                <p className="mt-1 text-xs text-gray-500">This email will be used for staff login</p>
                {errors.email && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
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
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Password<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
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
                    placeholder="Enter password"
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
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Confirm Password<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
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
                    placeholder="Confirm password"
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
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Department
                </label>
                <SearchableSelect
                  value={formData.staffInfo.department}
                  onChange={(e) => handleInputChange('staffInfo.department', e.target.value)}
                  searchable={false}
                  options={[
                    { value: 'accounts', label: 'Accounts' },
                    { value: 'hr', label: 'HR' },
                    { value: 'support', label: 'Support' },
                    { value: 'marketing', label: 'Marketing' },
                    { value: 'other', label: 'Other' }
                  ]}
                  placeholder="Select Department"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={formData.staffInfo.position}
                  onChange={(e) => handleInputChange('staffInfo.position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter job title"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.staffInfo.employeeId}
                  onChange={(e) => handleInputChange('staffInfo.employeeId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter employee ID"
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
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Street
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter street address"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Country
                </label>
                <select
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">{geoLoading.countries ? 'Loading countries...' : 'Select country'}</option>
                  {geo.countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  State
                </label>
                <select
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  disabled={!formData.address.country || geoLoading.states}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">{geoLoading.states ? 'Loading states...' : 'Select state'}</option>
                  {geo.states.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  City
                </label>
                <select
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  disabled={!formData.address.state || geoLoading.cities}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">{geoLoading.cities ? 'Loading cities...' : 'Select city'}</option>
                  {geo.cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', sanitizePostalDigits(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors['address.zipCode'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter ZIP code"
                />
                {formData.address.zipCode && !isValidOptionalPostalDigits(formData.address.zipCode) && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {OPTIONAL_POSTAL_DIGITS_MESSAGE}
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
            <label htmlFor="isActive" className="text-sm font-bold text-gray-900">
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

