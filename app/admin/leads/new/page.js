'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, FileText, Building, AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import PhoneField from '../../../../components/Common/PhoneField'
import SearchableSelect from '../../../../components/Common/SearchableSelect'
import { buildE164Phone, splitE164Phone, DEFAULT_COUNTRY_CODE } from '../../../../lib/phone'
import { getDropdownOptions } from '../../../../lib/dropdownsApi'
import {
  sanitizePostalDigits,
  isValidOptionalPostalDigits,
  OPTIONAL_POSTAL_DIGITS_MESSAGE
} from '../../../../lib/postalCode'

export default function AdminAddLeadPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState([])
  const [agents, setAgents] = useState([])
  const [agencies, setAgencies] = useState([])
  const sanitizeName = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
  const sanitizePhone = (v) => String(v || '').replace(/\D/g, '').slice(0, 10)
  const isValidPhone10 = (v) => String(v || '').replace(/\D/g, '').length === 10
  const sanitizeDecimal = (v) => {
    // allow digits and one dot, e.g. "123.45"
    const s = String(v ?? '').replace(/[^\d.]/g, '')
    const firstDot = s.indexOf('.')
    if (firstDot === -1) return s
    return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }
  const sanitizeLanguagesInput = (v) => String(v || '').replace(/[^a-zA-Z\s,.'-]/g, '')
  // Lead form fields should be normal text inputs (no dropdowns)
  const [duplicates, setDuplicates] = useState([])
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [formData, setFormData] = useState({
    contact: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      alternatePhone: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      }
    },
    property: '',
    agency: '',
    source: 'website',
    status: 'new',
    priority: 'Warm',
    assignedAgent: '',
    campaignName: '',
    inquiry: {
      message: '',
      budget: {
        min: '',
        max: '',
        currency: 'USD'
      },
      preferredLocation: [],
      propertyType: [],
      preferredRooms: '',
      preferredSize: '',
      buyerType: '',
      paymentMethod: '',
      nationality: '',
      dob: '',
      spokenLanguages: [],
      timeline: '',
      requirements: ''
    }
  })
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [alternatePhoneCountryCode, setAlternatePhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [dropdowns, setDropdowns] = useState({
    budgetCurrencies: [],
    inquiryTimelines: [],
    leadPriorities: [],
    leadSources: [],
    leadStatuses: []
  })
  const [geo, setGeo] = useState({
    countries: [],
    states: [],
    cities: []
  })
  const [geoLoading, setGeoLoading] = useState({
    countries: false,
    states: false,
    cities: false
  })

  useEffect(() => {
    if (!authLoading && user) {
      fetchInitialData()
    }
  }, [user, authLoading])

  useEffect(() => {
    fetchCountries()
  }, [])

  useEffect(() => {
    fetchStates(formData.contact.address.country)
  }, [formData.contact.address.country])

  useEffect(() => {
    fetchCities(formData.contact.address.country, formData.contact.address.state)
  }, [formData.contact.address.country, formData.contact.address.state])

  // If an existing phone value is present (e.g. prefill), split it into cc + national
  useEffect(() => {
    const main = splitE164Phone(formData.contact.phone)
    if (main.countryCode) setPhoneCountryCode(main.countryCode)
    if (main.phone !== formData.contact.phone) {
      // Only keep national digits in the input state; submit as E.164
      handleInputChange('contact.phone', main.phone)
    }

    const alt = splitE164Phone(formData.contact.alternatePhone)
    if (alt.countryCode) setAlternatePhoneCountryCode(alt.countryCode)
    if (alt.phone !== formData.contact.alternatePhone) {
      handleInputChange('contact.alternatePhone', alt.phone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchInitialData = async () => {
    try {
      const [dropdownsRes, propertiesRes, agentsRes, agenciesRes] = await Promise.all([
        getDropdownOptions(),
        api.get('/properties?limit=100'),
        api.get('/users?role=agent'),
        api.get('/agencies')
      ])
      setDropdowns({
        budgetCurrencies: dropdownsRes.budgetCurrencies || [],
        inquiryTimelines: dropdownsRes.inquiryTimelines || [],
        leadPriorities: dropdownsRes.leadPriorities || [],
        leadSources: dropdownsRes.leadSources || [],
        leadStatuses: dropdownsRes.leadStatuses || []
      })
      setProperties(propertiesRes.data.properties || [])
      setAgents(agentsRes.data.users || [])
      setAgencies(agenciesRes.data.agencies || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
    }
  }

  const fetchCountries = async () => {
    try {
      setGeoLoading((prev) => ({ ...prev, countries: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions')
      const data = await res.json()
      const countries = Array.isArray(data?.data)
        ? data.data.map((c) => c?.name).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : []
      setGeo((prev) => ({ ...prev, countries }))
    } catch (error) {
      console.error('Error fetching countries:', error)
      setGeo((prev) => ({ ...prev, countries: [] }))
    } finally {
      setGeoLoading((prev) => ({ ...prev, countries: false }))
    }
  }

  const fetchStates = async (country) => {
    if (!country) {
      setGeo((prev) => ({ ...prev, states: [], cities: [] }))
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
      setGeoLoading((prev) => ({ ...prev, states: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      })
      const data = await res.json()
      const states = Array.isArray(data?.data?.states)
        ? data.data.states.map((s) => s?.name).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : []
      setGeo((prev) => ({ ...prev, states, cities: [] }))
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
      setGeo((prev) => ({ ...prev, states: [], cities: [] }))
    } finally {
      setGeoLoading((prev) => ({ ...prev, states: false }))
    }
  }

  const fetchCities = async (country, state) => {
    if (!country || !state) {
      setGeo((prev) => ({ ...prev, cities: [] }))
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
      setGeoLoading((prev) => ({ ...prev, cities: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state })
      })
      const data = await res.json()
      const cities = Array.isArray(data?.data)
        ? data.data.filter(Boolean).sort((a, b) => a.localeCompare(b))
        : []
      setGeo((prev) => ({ ...prev, cities }))
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
      setGeo((prev) => ({ ...prev, cities: [] }))
    } finally {
      setGeoLoading((prev) => ({ ...prev, cities: false }))
    }
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
  }

  const handleCountryChange = (country) => {
    setFormData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        address: {
          ...prev.contact.address,
          country,
          state: '',
          city: ''
        }
      }
    }))
    setGeo((prev) => ({ ...prev, states: [], cities: [] }))
  }

  const handleStateChange = (state) => {
    setFormData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        address: {
          ...prev.contact.address,
          state,
          city: ''
        }
      }
    }))
    setGeo((prev) => ({ ...prev, cities: [] }))
  }

  const validateLead = () => {
    if (!formData.contact.firstName || formData.contact.firstName !== sanitizeName(formData.contact.firstName)) {
      return { ok: false, message: 'First name must contain only alphabets' }
    }
    if (!formData.contact.lastName || formData.contact.lastName !== sanitizeName(formData.contact.lastName)) {
      return { ok: false, message: 'Last name must contain only alphabets' }
    }
    if (!formData.contact.phone || !isValidPhone10(formData.contact.phone)) {
      return { ok: false, message: 'Phone number must be exactly 10 digits' }
    }
    if (formData.contact.alternatePhone && !isValidPhone10(formData.contact.alternatePhone)) {
      return { ok: false, message: 'Alternate phone number must be exactly 10 digits' }
    }
    if (!isValidOptionalPostalDigits(formData.contact.address?.zipCode)) {
      return { ok: false, message: OPTIONAL_POSTAL_DIGITS_MESSAGE }
    }
    return { ok: true }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const v = validateLead()
      if (!v.ok) {
        toast.error(v.message)
        setLoading(false)
        return
      }

      // Clean up form data
      const submitData = {
        ...formData,
        contact: {
          ...formData.contact,
          phone: buildE164Phone(phoneCountryCode, sanitizePhone(formData.contact.phone)),
          alternatePhone: formData.contact.alternatePhone
            ? buildE164Phone(alternatePhoneCountryCode, sanitizePhone(formData.contact.alternatePhone))
            : formData.contact.alternatePhone
        },
        property: formData.property || undefined,
        agency: formData.agency || undefined,
        assignedAgent: formData.assignedAgent || undefined,
        campaignName: formData.campaignName || undefined,
        inquiry: {
          ...formData.inquiry,
          budget: {
            ...formData.inquiry.budget,
            min: formData.inquiry.budget.min ? parseFloat(formData.inquiry.budget.min) : undefined,
            max: formData.inquiry.budget.max ? parseFloat(formData.inquiry.budget.max) : undefined
          },
          preferredLocation: formData.inquiry.preferredLocation.filter(l => l.trim()),
          propertyType: formData.inquiry.propertyType.filter(t => t.trim()),
          spokenLanguages: (formData.inquiry.spokenLanguages || []).filter(Boolean)
        }
      }

      // Remove empty fields
      if (!submitData.inquiry.message) delete submitData.inquiry.message
      if (!submitData.inquiry.requirements) delete submitData.inquiry.requirements
      if (!submitData.inquiry.timeline) delete submitData.inquiry.timeline
      if (!submitData.contact.alternatePhone) delete submitData.contact.alternatePhone
      if (!submitData.inquiry.nationality) delete submitData.inquiry.nationality
      if (!submitData.inquiry.dob) delete submitData.inquiry.dob
      if (!submitData.inquiry.preferredRooms) delete submitData.inquiry.preferredRooms
      if (!submitData.inquiry.preferredSize) delete submitData.inquiry.preferredSize
      if (!submitData.inquiry.buyerType) delete submitData.inquiry.buyerType
      if (!submitData.inquiry.paymentMethod) delete submitData.inquiry.paymentMethod
      if (!submitData.inquiry.spokenLanguages || submitData.inquiry.spokenLanguages.length === 0) delete submitData.inquiry.spokenLanguages

      const response = await api.post('/leads', submitData)

      // Check for duplicate warning
      if (response.data.duplicates && response.data.duplicates.length > 0) {
        setDuplicates(response.data.duplicates)
        setShowDuplicateWarning(true)
        toast('Potential duplicate leads found', { icon: '⚠️' })
      } else {
        toast.success('Lead created successfully!')
        router.push('/admin/leads')
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create lead'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleIgnoreDuplicates = async () => {
    setLoading(true)
    try {
      const v = validateLead()
      if (!v.ok) {
        toast.error(v.message)
        setLoading(false)
        return
      }

      const submitData = {
        ...formData,
        contact: {
          ...formData.contact,
          phone: buildE164Phone(phoneCountryCode, sanitizePhone(formData.contact.phone)),
          ...(formData.contact.alternatePhone && {
            alternatePhone: buildE164Phone(alternatePhoneCountryCode, sanitizePhone(formData.contact.alternatePhone))
          })
        },
        property: formData.property || undefined,
        agency: formData.agency || undefined,
        assignedAgent: formData.assignedAgent || undefined,
        campaignName: formData.campaignName || undefined,
        ignoreDuplicates: true,
        inquiry: {
          ...formData.inquiry,
          budget: {
            ...formData.inquiry.budget,
            min: formData.inquiry.budget.min ? parseFloat(formData.inquiry.budget.min) : undefined,
            max: formData.inquiry.budget.max ? parseFloat(formData.inquiry.budget.max) : undefined
          },
          preferredLocation: formData.inquiry.preferredLocation.filter(l => l.trim()),
          propertyType: formData.inquiry.propertyType.filter(t => t.trim()),
          spokenLanguages: (formData.inquiry.spokenLanguages || []).filter(Boolean)
        }
      }
      await api.post('/leads', submitData)
      toast.success('Lead created successfully!')
      router.push('/admin/leads')
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('Failed to create lead')
    } finally {
      setLoading(false)
      setShowDuplicateWarning(false)
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

  if (!user || !['super_admin', 'agency_admin', 'agent', 'staff'].includes(user.role)) {
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
            <Link href="/admin/leads" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Lead</h1>
              <p className="mt-1 text-sm text-gray-500">Create a new lead entry</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Contact Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  First Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact.firstName}
                  onChange={(e) => handleInputChange('contact.firstName', sanitizeName(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Last Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact.lastName}
                  onChange={(e) => handleInputChange('contact.lastName', sanitizeName(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.contact.email}
                  onChange={(e) => handleInputChange('contact.email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
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
                  onPhoneChange={(value) => handleInputChange('contact.phone', sanitizePhone(value))}
                />
              </div>
            </div>

            {/* Address */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Street
                  </label>
                  <input
                    type="text"
                    value={formData.contact.address.street}
                    onChange={(e) => handleInputChange('contact.address.street', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Country
                  </label>
                  <SearchableSelect
                    value={formData.contact.address.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
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
                    value={formData.contact.address.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    disabled={!formData.contact.address.country || geoLoading.states}
                    options={geo.states.map((state) => ({ value: state, label: state }))}
                    placeholder={geoLoading.states ? 'Loading states...' : 'Select state'}
                    searchPlaceholder="Search state..."
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 bg-white text-left"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    City
                  </label>
                  <SearchableSelect
                    value={formData.contact.address.city}
                    onChange={(e) => handleInputChange('contact.address.city', e.target.value)}
                    disabled={!formData.contact.address.state || geoLoading.cities}
                    options={geo.cities.map((city) => ({ value: city, label: city }))}
                    placeholder={geoLoading.cities ? 'Loading cities...' : 'Select city'}
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
                    value={formData.contact.address.zipCode}
                    onChange={(e) => handleInputChange('contact.address.zipCode', sanitizePostalDigits(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter ZIP code"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lead Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  Agency<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <SearchableSelect
                  required
                  value={String(formData.agency || '')}
                  onChange={(e) => handleInputChange('agency', e.target.value)}
                  options={agencies.map((a) => ({ value: a._id ? String(a._id) : '', label: a.name }))}
                  placeholder="Select an agency"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search agency..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Source<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <SearchableSelect
                  required
                  value={formData.source}
                  onChange={(e) => handleInputChange('source', e.target.value)}
                  options={dropdowns.leadSources}
                  placeholder="Select source"
                  searchable={false}
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Status<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <SearchableSelect
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  options={dropdowns.leadStatuses}
                  placeholder="Select status"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search status..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Priority<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <SearchableSelect
                  required
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  options={dropdowns.leadPriorities}
                  placeholder="Select priority"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search priority..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Property
                </label>
                <SearchableSelect
                  value={formData.property}
                  onChange={(e) => handleInputChange('property', e.target.value)}
                  options={properties.map((p) => ({
                    value: p._id,
                    label: `${p.title}${p.location?.city ? ` - ${p.location.city}` : ''}`
                  }))}
                  placeholder="Select a property (optional)"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search property..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Assign to Agent
                </label>
                <SearchableSelect
                  value={formData.assignedAgent}
                  onChange={(e) => handleInputChange('assignedAgent', e.target.value)}
                  options={agents.map((a) => ({ value: a._id || a.id, label: `${a.firstName} ${a.lastName}`.trim() }))}
                  placeholder="Unassigned"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search agent..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Campaign
                </label>
                <input
                  type="text"
                  value={formData.campaignName}
                  onChange={(e) => handleInputChange('campaignName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter campaign name (optional)"
                />
              </div>
            </div>
          </div>

          {/* Inquiry Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inquiry Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={formData.inquiry.message}
                  onChange={(e) => handleInputChange('inquiry.message', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter inquiry message..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Budget Min
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.inquiry.budget.min}
                    onChange={(e) => handleInputChange('inquiry.budget.min', sanitizeDecimal(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Budget Max
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.inquiry.budget.max}
                    onChange={(e) => handleInputChange('inquiry.budget.max', sanitizeDecimal(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Currency
                  </label>
                  <SearchableSelect
                    value={formData.inquiry.budget.currency}
                    onChange={(e) => handleInputChange('inquiry.budget.currency', e.target.value)}
                    options={(dropdowns.budgetCurrencies || []).map((c) => ({ value: c, label: c }))}
                    placeholder="Currency"
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    searchPlaceholder="Search currency..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Timeline
                </label>
                <SearchableSelect
                  value={formData.inquiry.timeline}
                  onChange={(e) => handleInputChange('inquiry.timeline', e.target.value)}
                  options={dropdowns.inquiryTimelines}
                  placeholder="Select timeline"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search timeline..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Preferred Rooms
                  </label>
                  <input
                    type="text"
                    value={formData.inquiry.preferredRooms}
                    onChange={(e) => handleInputChange('inquiry.preferredRooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter preferred rooms"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Preferred Size
                  </label>
                  <input
                    type="text"
                    value={formData.inquiry.preferredSize}
                    onChange={(e) => handleInputChange('inquiry.preferredSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter preferred size"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Buyer Type
                  </label>
                  <input
                    type="text"
                    value={formData.inquiry.buyerType}
                    onChange={(e) => handleInputChange('inquiry.buyerType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter buyer type"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Payment Method
                  </label>
                  <input
                    type="text"
                    value={formData.inquiry.paymentMethod}
                    onChange={(e) => handleInputChange('inquiry.paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter payment method"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.inquiry.nationality}
                    onChange={(e) => handleInputChange('inquiry.nationality', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter nationality"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    DOB
                  </label>
                  <input
                    type="date"
                    value={formData.inquiry.dob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleInputChange('inquiry.dob', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Spoken Languages
                  </label>
                  <input
                    type="text"
                    value={(formData.inquiry.spokenLanguages || []).join(', ')}
                    onChange={(e) => {
                      const next = sanitizeLanguagesInput(e.target.value)
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean)
                      handleInputChange('inquiry.spokenLanguages', next)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter languages"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  Requirements
                </label>
                <textarea
                  rows={3}
                  value={formData.inquiry.requirements}
                  onChange={(e) => handleInputChange('inquiry.requirements', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter specific requirements..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/admin/leads"
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
              {loading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>

        {/* Duplicate Warning Modal */}
        {showDuplicateWarning && duplicates.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold text-yellow-900 flex items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                    Duplicate Leads Found
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {duplicates.length} potential duplicate{duplicates.length > 1 ? 's' : ''} found with similar contact information
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDuplicateWarning(false)
                    setDuplicates([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-700 mb-4">
                  The following leads have similar email or phone numbers. Please review before creating a duplicate.
                </p>
                <div className="space-y-3">
                  {duplicates.map((dup) => (
                    <Link
                      key={dup._id}
                      href={`/admin/leads/${dup._id}`}
                      target="_blank"
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {dup.name || `${dup.contact?.firstName || ''} ${dup.contact?.lastName || ''}`.trim()}
                          </p>
                          <p className="text-sm text-gray-500">{dup.email || dup.contact?.email}</p>
                          <p className="text-sm text-gray-500">{dup.phone || dup.contact?.phone}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100">
                            {dup.leadId || dup._id}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            Status: {dup.status || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(dup.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowDuplicateWarning(false)
                    setDuplicates([])
                    router.push('/admin/leads')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIgnoreDuplicates}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Anyway'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

