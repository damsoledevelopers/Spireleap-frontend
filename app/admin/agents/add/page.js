'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Eye, EyeOff, Building } from 'lucide-react'
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

export default function AddAgentPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agencies, setAgencies] = useState([])
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
    agency: '',
    isActive: true,
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    agentInfo: {
      licenseNumber: '',
      bio: '',
      specialties: [],
      languages: [],
      yearsOfExperience: '',
      commissionRate: ''
    }
  })

  const sanitizeName = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
  const sanitizeAlphaText = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')

  useEffect(() => {
    fetchAgencies()
  }, [])

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

  const stateOptions = useMemo(() => {
    const current = String(formData.address?.state || '').trim()
    return Array.from(new Set([...(geo.states || []), current].filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [geo.states, formData.address?.state])

  const cityOptions = useMemo(() => {
    const current = String(formData.address?.city || '').trim()
    return Array.from(new Set([...(geo.cities || []), current].filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [geo.cities, formData.address?.city])

  const fetchAgencies = async () => {
    try {
      const response = await api.get('/agencies?limit=1000')
      setAgencies(response.data.agencies || [])
    } catch (error) {
      console.error('Error fetching agencies:', error)
    }
  }

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
      setFormData((prev) => ({ ...prev, address: { ...prev.address, city: '' } }))
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

  if (!user || !['super_admin', 'agency_admin'].includes(user.role)) {
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

  // Pre-fill agency for agency_admin
  useEffect(() => {
    if (user?.role === 'agency_admin' && user?.agency) {
      const agencyId = typeof user.agency === 'object' ? user.agency._id : user.agency
      setFormData(prev => ({ ...prev, agency: agencyId }))
    }
  }, [user])

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
        role: 'agent',
        phone: e164Phone,
        agency: formData.agency || undefined,
        isActive: formData.isActive,
        address: Object.values(formData.address).some(v => v) ? formData.address : undefined,
        agentInfo: {
          licenseNumber: formData.agentInfo.licenseNumber || undefined,
          bio: formData.agentInfo.bio || undefined,
          yearsOfExperience: formData.agentInfo.yearsOfExperience ? parseInt(formData.agentInfo.yearsOfExperience) : undefined,
          commissionRate: formData.agentInfo.commissionRate ? parseFloat(formData.agentInfo.commissionRate) : undefined
        }
      }

      // Remove empty fields
      Object.keys(userData.agentInfo).forEach(key => {
        if (userData.agentInfo[key] === undefined || userData.agentInfo[key] === '') {
          delete userData.agentInfo[key]
        }
      })

      if (!userData.agentInfo.licenseNumber && !userData.agentInfo.bio && !userData.agentInfo.yearsOfExperience && !userData.agentInfo.commissionRate) {
        delete userData.agentInfo
      }

      // Use users endpoint for super admin
      await api.post('/users', userData)
      toast.success('Agent created successfully! Agent can now login with their email and password.')
      router.push('/admin/agents')
    } catch (error) {
      console.error('Error creating agent:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create agent'
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
            <Link href="/admin/agents" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Agent</h1>
              <p className="mt-1 text-sm text-gray-500">Create a new agent account</p>
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
                <p className="mt-1 text-xs text-gray-500">This email will be used for agent login</p>
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
                <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  Agency
                </label>
                <SearchableSelect
                  value={formData.agency}
                  onChange={(e) => handleInputChange('agency', e.target.value)}
                  disabled={user?.role === 'agency_admin'}
                  options={[
                    ...agencies.map((a) => ({ value: a._id, label: a.name }))
                  ]}
                  placeholder="Select Agency (Optional)"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 bg-white"
                  searchPlaceholder="Search agency..."
                />
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
                <p className="mt-1 text-xs text-gray-500">Used for agent login.</p>
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
                <SearchableSelect
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                  options={geo.countries.map((country) => ({ value: country, label: country }))}
                  placeholder={geoLoading.countries ? 'Loading countries...' : 'Select country'}
                  searchPlaceholder="Search country..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-left"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  State
                </label>
                <SearchableSelect
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  disabled={!formData.address.country || geoLoading.states}
                  options={stateOptions.map((state) => ({ value: state, label: state }))}
                  placeholder={!formData.address.country ? 'Select country first' : geoLoading.states ? 'Loading states...' : 'Select state'}
                  searchPlaceholder="Search state..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 bg-white text-left"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  City
                </label>
                <SearchableSelect
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  disabled={!formData.address.state || geoLoading.cities}
                  options={cityOptions.map((city) => ({ value: city, label: city }))}
                  placeholder={!formData.address.state ? 'Select state first' : geoLoading.cities ? 'Loading cities...' : 'Select city'}
                  searchPlaceholder="Search city..."
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 bg-white text-left"
                />
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

          {/* Agent Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.agentInfo.licenseNumber}
                  onChange={(e) => handleInputChange('agentInfo.licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter license number"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.agentInfo.yearsOfExperience}
                  onChange={(e) => handleInputChange('agentInfo.yearsOfExperience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter years"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.agentInfo.commissionRate}
                  onChange={(e) => handleInputChange('agentInfo.commissionRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter commission rate"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Bio
                </label>
                <textarea
                  rows={4}
                  value={formData.agentInfo.bio}
                  onChange={(e) => handleInputChange('agentInfo.bio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter agent bio..."
                />
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
              Active Agent
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/admin/agents"
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
              {loading ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

