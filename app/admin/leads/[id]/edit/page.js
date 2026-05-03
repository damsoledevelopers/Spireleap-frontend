'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, FileText, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import PhoneField from '@/components/Common/PhoneField'
import SearchableSelect from '@/components/Common/SearchableSelect'
import { buildE164Phone, splitE164Phone, DEFAULT_COUNTRY_CODE } from '@/lib/phone'
import { getDropdownOptions } from '@/lib/dropdownsApi'

export default function AdminEditLeadPage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [properties, setProperties] = useState([])
  const [agents, setAgents] = useState([])
  const [agencies, setAgencies] = useState([])
  const sanitizeName = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
  const sanitizeAlphaText = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
  const sanitizeZip = (v) => String(v || '').replace(/\D/g, '').slice(0, 9)
  const isValidZip = (v) => {
    const s = String(v || '').trim()
    if (!s) return true
    return s.length === 5 || s.length === 9
  }
  const sanitizePhone = (v) => String(v || '').replace(/\D/g, '').slice(0, 10)
  const isValidPhone10 = (v) => String(v || '').replace(/\D/g, '').length === 10
  const sanitizeDecimal = (v) => {
    const s = String(v ?? '').replace(/[^\d.]/g, '')
    const firstDot = s.indexOf('.')
    if (firstDot === -1) return s
    return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }
  const sanitizeLanguagesInput = (v) => String(v || '').replace(/[^a-zA-Z\s,.'-]/g, '')
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [alternatePhoneCountryCode, setAlternatePhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [dropdowns, setDropdowns] = useState({
    budgetCurrencies: [],
    inquiryTimelines: [],
    leadPriorities: [],
    leadSources: [],
    leadStatuses: []
  })
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
    source: 'website',
    status: 'new',
    priority: 'Warm',
    assignedAgent: '',
    agency: '',
    booking: {
      unitNumber: '',
      flatNumber: '',
      bookingAmount: ''
    },
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

  useEffect(() => {
    if (!authLoading && user) {
      fetchLeadData()
    }
  }, [user, authLoading, params.id])

  useEffect(() => {
    if (formData.agency) {
      fetchAgentsByAgency(formData.agency)
    } else {
      // For super admin, fetch all agents
      fetchAllAgents()
    }
  }, [formData.agency])

  const fetchLeadData = async () => {
    try {
      setFetching(true)
      const [dropdownsRes, leadRes, propertiesRes, agenciesRes] = await Promise.all([
        getDropdownOptions(),
        api.get(`/leads/${params.id}`),
        api.get('/properties?limit=100'),
        api.get('/agencies')
      ])
      setDropdowns({
        budgetCurrencies: dropdownsRes.budgetCurrencies || [],
        inquiryTimelines: dropdownsRes.inquiryTimelines || [],
        leadPriorities: dropdownsRes.leadPriorities || [],
        leadSources: dropdownsRes.leadSources || [],
        leadStatuses: dropdownsRes.leadStatuses || []
      })

      const lead = leadRes.data.lead
      setProperties(propertiesRes.data.properties || [])
      const agenciesList = agenciesRes.data.agencies || []
      setAgencies(agenciesList)

      const parsedPhone = splitE164Phone(lead.contact?.phone || '')
      const parsedAltPhone = splitE164Phone(lead.contact?.alternatePhone || '')
      setPhoneCountryCode(parsedPhone.countryCode || DEFAULT_COUNTRY_CODE)
      setAlternatePhoneCountryCode(parsedAltPhone.countryCode || DEFAULT_COUNTRY_CODE)

      // Fetch agents based on lead's agency
      const leadAgency = lead.agency?._id || lead.agency
      if (leadAgency) {
        await fetchAgentsByAgency(leadAgency)
      } else {
        await fetchAllAgents()
      }

      // Normalize agency ID from lead - handle both populated object and string ID
      let normalizedAgencyId = ''
      if (lead.agency) {
        if (typeof lead.agency === 'object' && lead.agency._id) {
          // Agency is populated object
          normalizedAgencyId = String(lead.agency._id)
        } else if (typeof lead.agency === 'string') {
          // Agency is string ID
          normalizedAgencyId = lead.agency
        } else {
          // Fallback: try to convert to string
          normalizedAgencyId = String(lead.agency)
        }
      }

      console.log('Lead Agency:', lead.agency)
      console.log('Normalized Agency ID:', normalizedAgencyId)
      console.log('Agencies List:', agenciesList.map(a => ({ id: String(a._id), name: a.name })))

      // Populate form with lead data
      setFormData({
        contact: {
          firstName: lead.contact?.firstName || '',
          lastName: lead.contact?.lastName || '',
          email: lead.contact?.email || '',
          phone: parsedPhone.phone || '',
          alternatePhone: parsedAltPhone.phone || '',
          address: {
            street: lead.contact?.address?.street || '',
            city: lead.contact?.address?.city || '',
            state: lead.contact?.address?.state || '',
            country: lead.contact?.address?.country || '',
            zipCode: lead.contact?.address?.zipCode || ''
          }
        },
        property: lead.property?._id || lead.property || '',
        source: lead.source || 'website',
        campaignName: lead.campaignName || '',
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        lostReason: lead.lostReason || '',
        assignedAgent: lead.assignedAgent?._id || lead.assignedAgent || '',
        agency: normalizedAgencyId,
        booking: {
          unitNumber: lead.booking?.unitNumber || '',
          flatNumber: lead.booking?.flatNumber || '',
          bookingAmount: lead.booking?.bookingAmount || ''
        },
        inquiry: {
          message: lead.inquiry?.message || '',
          budget: {
            min: lead.inquiry?.budget?.min || '',
            max: lead.inquiry?.budget?.max || '',
            currency: lead.inquiry?.budget?.currency || 'USD'
          },
          preferredLocation: lead.inquiry?.preferredLocation || [],
          propertyType: lead.inquiry?.propertyType || [],
          preferredRooms: lead.inquiry?.preferredRooms || '',
          preferredSize: lead.inquiry?.preferredSize || '',
          buyerType: lead.inquiry?.buyerType || '',
          paymentMethod: lead.inquiry?.paymentMethod || '',
          nationality: lead.inquiry?.nationality || '',
          dob: lead.inquiry?.dob ? String(lead.inquiry.dob).slice(0, 10) : '',
          spokenLanguages: Array.isArray(lead.inquiry?.spokenLanguages) ? lead.inquiry.spokenLanguages : [],
          timeline: lead.inquiry?.timeline || '',
          requirements: lead.inquiry?.requirements || ''
        }
      })
    } catch (error) {
      console.error('Error fetching lead data:', error)
      toast.error('Failed to load lead details')
      router.push('/admin/leads')
    } finally {
      setFetching(false)
    }
  }

  const fetchAgentsByAgency = async (agencyId) => {
    try {
      const response = await api.get(`/users?role=agent&agency=${agencyId}`)
      setAgents(response.data.users || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([])
    }
  }

  const fetchAllAgents = async () => {
    try {
      const response = await api.get('/users?role=agent')
      setAgents(response.data.users || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([])
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
    } else if (keys.length === 4) {
      setFormData({
        ...formData,
        [keys[0]]: {
          ...formData[keys[0]],
          [keys[1]]: {
            ...formData[keys[0]][keys[1]],
            [keys[2]]: {
              ...formData[keys[0]][keys[1]][keys[2]],
              [keys[3]]: value
            }
          }
        }
      })
    }
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
    if (!isValidZip(formData.contact.address?.zipCode)) {
      return { ok: false, message: 'ZIP Code must be 5 digits or 9 digits (ZIP+4)' }
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
        contact: {
          firstName: formData.contact.firstName,
          lastName: formData.contact.lastName,
          email: formData.contact.email,
          phone: buildE164Phone(phoneCountryCode, sanitizePhone(formData.contact.phone)),
          ...(formData.contact.alternatePhone && {
            alternatePhone: buildE164Phone(alternatePhoneCountryCode, sanitizePhone(formData.contact.alternatePhone))
          }),
          address: {
            ...(formData.contact.address.street && { street: formData.contact.address.street }),
            ...(formData.contact.address.city && { city: formData.contact.address.city }),
            ...(formData.contact.address.state && { state: formData.contact.address.state }),
            ...(formData.contact.address.country && { country: formData.contact.address.country }),
            ...(formData.contact.address.zipCode && { zipCode: sanitizeZip(formData.contact.address.zipCode) })
          }
        },
        property: formData.property || undefined,
        source: formData.source,
        campaignName: formData.campaignName || undefined,
        status: formData.status,
        priority: formData.priority,
        assignedAgent: formData.assignedAgent || undefined,
        agency: formData.agency || undefined,
        ...(formData.status === 'lost' && formData.lostReason && { lostReason: formData.lostReason }),
        booking: {
          ...(formData.booking.unitNumber && { unitNumber: formData.booking.unitNumber }),
          ...(formData.booking.flatNumber && { flatNumber: formData.booking.flatNumber }),
          ...(formData.booking.bookingAmount && { bookingAmount: parseFloat(formData.booking.bookingAmount) })
        },
        inquiry: {
          ...(formData.inquiry.message && { message: formData.inquiry.message }),
          budget: {
            ...(formData.inquiry.budget.min && { min: parseFloat(sanitizeDecimal(formData.inquiry.budget.min)) }),
            ...(formData.inquiry.budget.max && { max: parseFloat(sanitizeDecimal(formData.inquiry.budget.max)) }),
            currency: formData.inquiry.budget.currency || 'USD'
          },
          ...(formData.inquiry.preferredLocation.length > 0 && { preferredLocation: formData.inquiry.preferredLocation.filter(l => l.trim()) }),
          ...(formData.inquiry.propertyType.length > 0 && { propertyType: formData.inquiry.propertyType.filter(t => t.trim()) }),
          ...(formData.inquiry.preferredRooms && { preferredRooms: formData.inquiry.preferredRooms }),
          ...(formData.inquiry.preferredSize && { preferredSize: formData.inquiry.preferredSize }),
          ...(formData.inquiry.buyerType && { buyerType: formData.inquiry.buyerType }),
          ...(formData.inquiry.paymentMethod && { paymentMethod: formData.inquiry.paymentMethod }),
          ...(formData.inquiry.nationality && { nationality: formData.inquiry.nationality }),
          ...(formData.inquiry.dob && { dob: formData.inquiry.dob }),
          ...((formData.inquiry.spokenLanguages || []).length > 0 && { spokenLanguages: (formData.inquiry.spokenLanguages || []).filter(Boolean) }),
          ...(formData.inquiry.timeline && { timeline: formData.inquiry.timeline }),
          ...(formData.inquiry.requirements && { requirements: formData.inquiry.requirements })
        }
      }

      await api.put(`/leads/${params.id}`, submitData)
      toast.success('Lead updated successfully!')
      router.push('/admin/leads')
    } catch (error) {
      console.error('Error updating lead:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update lead'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
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

  if (!user || !['super_admin', 'agency_admin', 'agent'].includes(user.role)) {
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
              <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>
              <p className="mt-1 text-sm text-gray-500">Update lead information</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
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
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email *
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
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
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
                  onPhoneChange={(value) => handleInputChange('contact.phone', sanitizePhone(value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Phone
                </label>
                <PhoneField
                  label=""
                  countryCodeName="contact.alternatePhoneCountryCode"
                  phoneName="contact.alternatePhone"
                  countryCodeValue={alternatePhoneCountryCode}
                  phoneValue={formData.contact.alternatePhone}
                  onCountryCodeChange={(value) => setAlternatePhoneCountryCode(value)}
                  onPhoneChange={(value) => handleInputChange('contact.alternatePhone', sanitizePhone(value))}
                  showInlineError={Boolean(formData.contact.alternatePhone)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.contact.address.city}
                    onChange={(e) => handleInputChange('contact.address.city', sanitizeAlphaText(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.contact.address.state}
                    onChange={(e) => handleInputChange('contact.address.state', sanitizeAlphaText(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.contact.address.country}
                    onChange={(e) => handleInputChange('contact.address.country', sanitizeAlphaText(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.contact.address.zipCode}
                    onChange={(e) => handleInputChange('contact.address.zipCode', sanitizeZip(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  Agency
                </label>
                <SearchableSelect
                  value={formData.agency ? String(formData.agency) : ''}
                  onChange={(e) => {
                    const selectedValue = e.target.value
                    console.log('Agency selected:', selectedValue)
                    setFormData(prev => ({
                      ...prev,
                      agency: selectedValue,
                      assignedAgent: '' // Reset agent when agency changes
                    }))
                  }}
                  options={agencies.map((a) => ({ value: a._id ? String(a._id) : '', label: a.name }))}
                  placeholder="Select Agency (optional)"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search agency..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source *
                </label>
                <SearchableSelect
                  required
                  value={formData.source}
                  onChange={(e) => handleInputChange('source', e.target.value)}
                  options={dropdowns.leadSources || []}
                  placeholder="Select source"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search source..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formData.campaignName || ''}
                  onChange={(e) => handleInputChange('campaignName', e.target.value)}
                  placeholder="Enter campaign name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <SearchableSelect
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  options={dropdowns.leadStatuses || []}
                  placeholder="Select status"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search status..."
                />
              </div>
              {formData.status === 'lost' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lost Reason
                  </label>
                  <SearchableSelect
                    value={formData.lostReason || ''}
                    onChange={(e) => handleInputChange('lostReason', e.target.value)}
                    options={[
                      { value: 'price_too_high', label: 'Price Too High' },
                      { value: 'found_elsewhere', label: 'Found Elsewhere' },
                      { value: 'not_interested', label: 'Not Interested' },
                      { value: 'location_not_suitable', label: 'Location Not Suitable' },
                      { value: 'timing_not_right', label: 'Timing Not Right' },
                      { value: 'budget_constraints', label: 'Budget Constraints' },
                      { value: 'other', label: 'Other' }
                    ]}
                    placeholder="Select reason"
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    searchPlaceholder="Search reason..."
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <SearchableSelect
                  required
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  options={dropdowns.leadPriorities || []}
                  placeholder="Select priority"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search priority..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Building className="h-4 w-4" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
            </div>
          </div>

          {/* Inquiry Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inquiry Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline
                </label>
                <SearchableSelect
                  value={formData.inquiry.timeline}
                  onChange={(e) => handleInputChange('inquiry.timeline', e.target.value)}
                  options={dropdowns.inquiryTimelines || []}
                  placeholder="Select timeline"
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  searchPlaceholder="Search timeline..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DOB
                  </label>
                  <input
                    type="date"
                    value={formData.inquiry.dob}
                    onChange={(e) => handleInputChange('inquiry.dob', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    placeholder="e.g. English, Arabic"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              {loading ? 'Updating...' : 'Update Lead'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}




