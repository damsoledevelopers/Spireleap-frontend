'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, FileText, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function EditLeadPage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [properties, setProperties] = useState([])
  const [agents, setAgents] = useState([])
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
    priority: 'medium',
    assignedAgent: '',
    inquiry: {
      message: '',
      budget: {
        min: '',
        max: '',
        currency: 'USD'
      },
      preferredLocation: [],
      propertyType: [],
      timeline: '',
      requirements: ''
    }
  })

  useEffect(() => {
    if (!authLoading && user) {
      fetchLeadData()
    }
  }, [user, authLoading, params.id])

  const fetchLeadData = async () => {
    try {
      setFetching(true)
      const [leadRes, propertiesRes, agentsRes] = await Promise.all([
        api.get(`/leads/${params.id}`),
        api.get('/properties?limit=100'),
        user.role === 'agency_admin' || user.role === 'super_admin' 
          ? api.get('/users?role=agent') 
          : Promise.resolve({ data: { users: [] } })
      ])
      
      const lead = leadRes.data.lead
      setProperties(propertiesRes.data.properties || [])
      setAgents(agentsRes.data.users || [])
      
      // Populate form with lead data
      setFormData({
        contact: {
          firstName: lead.contact?.firstName || '',
          lastName: lead.contact?.lastName || '',
          email: lead.contact?.email || '',
          phone: lead.contact?.phone || '',
          alternatePhone: lead.contact?.alternatePhone || '',
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
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        assignedAgent: lead.assignedAgent?._id || lead.assignedAgent || '',
        inquiry: {
          message: lead.inquiry?.message || '',
          budget: {
            min: lead.inquiry?.budget?.min || '',
            max: lead.inquiry?.budget?.max || '',
            currency: lead.inquiry?.budget?.currency || 'USD'
          },
          preferredLocation: lead.inquiry?.preferredLocation || [],
          propertyType: lead.inquiry?.propertyType || [],
          timeline: lead.inquiry?.timeline || '',
          requirements: lead.inquiry?.requirements || ''
        }
      })
    } catch (error) {
      console.error('Error fetching lead data:', error)
      toast.error('Failed to load lead details')
      router.push('/agency/leads')
    } finally {
      setFetching(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Clean up form data
      const submitData = {
        contact: {
          firstName: formData.contact.firstName,
          lastName: formData.contact.lastName,
          email: formData.contact.email,
          phone: formData.contact.phone,
          ...(formData.contact.alternatePhone && { alternatePhone: formData.contact.alternatePhone }),
          address: {
            ...(formData.contact.address.street && { street: formData.contact.address.street }),
            ...(formData.contact.address.city && { city: formData.contact.address.city }),
            ...(formData.contact.address.state && { state: formData.contact.address.state }),
            ...(formData.contact.address.country && { country: formData.contact.address.country }),
            ...(formData.contact.address.zipCode && { zipCode: formData.contact.address.zipCode })
          }
        },
        property: formData.property || undefined,
        source: formData.source,
        status: formData.status,
        priority: formData.priority,
        assignedAgent: formData.assignedAgent || undefined,
        inquiry: {
          ...(formData.inquiry.message && { message: formData.inquiry.message }),
          budget: {
            ...(formData.inquiry.budget.min && { min: parseFloat(formData.inquiry.budget.min) }),
            ...(formData.inquiry.budget.max && { max: parseFloat(formData.inquiry.budget.max) }),
            currency: formData.inquiry.budget.currency || 'USD'
          },
          ...(formData.inquiry.preferredLocation.length > 0 && { preferredLocation: formData.inquiry.preferredLocation.filter(l => l.trim()) }),
          ...(formData.inquiry.propertyType.length > 0 && { propertyType: formData.inquiry.propertyType.filter(t => t.trim()) }),
          ...(formData.inquiry.timeline && { timeline: formData.inquiry.timeline }),
          ...(formData.inquiry.requirements && { requirements: formData.inquiry.requirements })
        }
      }

      await api.put(`/leads/${params.id}`, submitData)
      toast.success('Lead updated successfully!')
      router.push(`/agency/leads/${params.id}`)
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

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600">Please log in to continue</p>
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
            <Link href={`/agency/leads/${params.id}`} className="text-gray-600 hover:text-gray-900">
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
                  onChange={(e) => handleInputChange('contact.firstName', e.target.value)}
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
                  onChange={(e) => handleInputChange('contact.lastName', e.target.value)}
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
                <input
                  type="tel"
                  required
                  value={formData.contact.phone}
                  onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact.alternatePhone}
                  onChange={(e) => handleInputChange('contact.alternatePhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    onChange={(e) => handleInputChange('contact.address.city', e.target.value)}
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
                    onChange={(e) => handleInputChange('contact.address.state', e.target.value)}
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
                    onChange={(e) => handleInputChange('contact.address.country', e.target.value)}
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
                    onChange={(e) => handleInputChange('contact.address.zipCode', e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source *
                </label>
                <select
                  required
                  value={formData.source}
                  onChange={(e) => handleInputChange('source', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="website">Website</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="walk_in">Walk In</option>
                  <option value="referral">Referral</option>
                  <option value="social_media">Social Media</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="site_visit">Site Visit</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed">Closed</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  Property
                </label>
                <select
                  value={formData.property}
                  onChange={(e) => handleInputChange('property', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a property (optional)</option>
                  {properties.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.title} - {property.location?.city}
                    </option>
                  ))}
                </select>
              </div>
              {(user.role === 'agency_admin' || user.role === 'super_admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign to Agent
                  </label>
                  <select
                    value={formData.assignedAgent}
                    onChange={(e) => handleInputChange('assignedAgent', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent._id || agent.id} value={agent._id || agent.id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                    type="number"
                    value={formData.inquiry.budget.min}
                    onChange={(e) => handleInputChange('inquiry.budget.min', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Max
                  </label>
                  <input
                    type="number"
                    value={formData.inquiry.budget.max}
                    onChange={(e) => handleInputChange('inquiry.budget.max', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.inquiry.budget.currency}
                    onChange={(e) => handleInputChange('inquiry.budget.currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline
                </label>
                <select
                  value={formData.inquiry.timeline}
                  onChange={(e) => handleInputChange('inquiry.timeline', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select timeline</option>
                  <option value="immediate">Immediate</option>
                  <option value="1_month">1 Month</option>
                  <option value="3_months">3 Months</option>
                  <option value="6_months">6 Months</option>
                  <option value="1_year">1 Year</option>
                  <option value="flexible">Flexible</option>
                </select>
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
              href={`/agency/leads/${params.id}`}
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

