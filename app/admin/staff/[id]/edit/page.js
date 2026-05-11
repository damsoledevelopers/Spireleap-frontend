'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '../../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../../contexts/AuthContext'
import { api } from '../../../../../lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Eye, EyeOff, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import PhoneField from '../../../../../components/Common/PhoneField'
import SearchableSelect from '../../../../../components/Common/SearchableSelect'
import { buildE164Phone, splitE164Phone, DEFAULT_COUNTRY_CODE } from '../../../../../lib/phone'
import { scrollToFirstErrorField } from '../../../../../lib/scrollToError'
import { validateEmail, validateName, validatePassword } from '../../../../../lib/validation'

export default function EditStaffPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [errors, setErrors] = useState({})
  const [geo, setGeo] = useState({ countries: [], states: [], cities: [] })
  const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false })
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
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

  const sanitizeZip = (v) => String(v || '').replace(/\D/g, '').slice(0, 9)
  const isValidZip = (v) => {
    const s = String(v || '').trim()
    if (!s) return true
    return s.length === 5 || s.length === 9
  }

  useEffect(() => {
    fetchStaff()
  }, [params.id])

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

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/users/${params.id}`)
      const staff = response.data
      
      // Verify this is a staff member
      if (staff.role !== 'staff') {
        toast.error('This user is not a staff member')
        router.push('/admin/staff')
        return
      }

      const parsedPhone = splitE164Phone(staff.phone || '')
      setFormData({
        firstName: staff.firstName || '',
        lastName: staff.lastName || '',
        email: staff.email || '',
        phone: parsedPhone.phone || '',
        isActive: staff.isActive !== undefined ? staff.isActive : true,
        address: staff.address || {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: ''
        },
        staffInfo: staff.staffInfo || {
          department: '',
          position: '',
          employeeId: ''
        }
      })
      setPhoneCountryCode(parsedPhone.countryCode || DEFAULT_COUNTRY_CODE)
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast.error('Failed to load staff details')
      router.push('/admin/staff')
    } finally {
      setLoading(false)
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


  const handleInputChange = (field, value) => {
    const keys = field.split('.')
    if (keys.length === 1) {
      setFormData(prev => ({ ...prev, [field]: value }))
    } else if (keys.length === 2) {
      setFormData(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: value
        }
      }))
    } else if (keys.length === 3) {
      setFormData(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: {
            ...prev[keys[0]][keys[1]],
            [keys[2]]: value
          }
        }
      }))
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
      const e164Phone = formData.phone ? buildE164Phone(phoneCountryCode, formData.phone) : undefined
      if (formData.phone && !e164Phone) {
        nextErrors.phone = 'Enter a valid phone number for the selected country'
      }
      if (formData.password && formData.password.trim() !== '') {
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
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: e164Phone,
        isActive: formData.isActive,
        address: Object.values(formData.address).some(v => v) ? formData.address : undefined,
        staffInfo: {
          department: formData.staffInfo.department || undefined,
          position: formData.staffInfo.position || undefined,
          employeeId: formData.staffInfo.employeeId || undefined
        }
      }

      // Only include password if it's provided (not empty)
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password
      }

      // Remove empty staffInfo fields
      Object.keys(updateData.staffInfo).forEach(key => {
        if (updateData.staffInfo[key] === undefined || updateData.staffInfo[key] === '') {
          delete updateData.staffInfo[key]
        }
      })

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
      toast.success('Staff member updated successfully')
      router.push('/admin/staff')
    } catch (error) {
      console.error('Error updating staff:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update staff member'
      toast.error(errorMessage)
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

  if (!currentUser || currentUser.role !== 'super_admin') {
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
              <h1 className="text-2xl font-bold text-gray-900">Edit Staff Member</h1>
              <p className="mt-1 text-sm text-gray-500">Update staff member information</p>
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
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
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
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
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
                {errors.password ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.password}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">Leave blank to keep current</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
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
                    { value: '', label: 'Select Department' },
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
                  onChange={(e) => handleInputChange('address.zipCode', sanitizeZip(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors['address.zipCode'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter ZIP code"
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
              href="/admin/staff"
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

