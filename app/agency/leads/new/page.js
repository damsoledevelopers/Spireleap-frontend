'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, FileText, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AddLeadPage() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
      fetchInitialData()
    }
  }, [user, authLoading])

  const fetchInitialData = async () => {
    try {
      const [propertiesRes, agentsRes] = await Promise.all([
        api.get('/properties?limit=100'),
        user.role === 'agency_admin' || user.role === 'super_admin' 
          ? api.get('/users?role=agent') 
          : Promise.resolve({ data: { users: [] } })
      ])
      setProperties(propertiesRes.data.properties || [])
      setAgents(agentsRes.data.users || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Clean up form data
      const submitData = {
        ...formData,
        property: formData.property || undefined,
        assignedAgent: formData.assignedAgent || undefined,
        inquiry: {
          ...formData.inquiry,
          budget: {
            ...formData.inquiry.budget,
            min: formData.inquiry.budget.min ? parseFloat(formData.inquiry.budget.min) : undefined,
            max: formData.inquiry.budget.max ? parseFloat(formData.inquiry.budget.max) : undefined
          },
          preferredLocation: formData.inquiry.preferredLocation.filter(l => l.trim()),
          propertyType: formData.inquiry.propertyType.filter(t => t.trim())
        }
      }

      // Remove empty fields
      if (!submitData.inquiry.message) delete submitData.inquiry.message
      if (!submitData.inquiry.requirements) delete submitData.inquiry.requirements
      if (!submitData.inquiry.timeline) delete submitData.inquiry.timeline
      if (!submitData.contact.alternatePhone) delete submitData.contact.alternatePhone

      await api.post('/leads', submitData)
      toast.success('Lead created successfully!')
      router.push('/agency/leads')
    } catch (error) {
      console.error('Error creating lead:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create lead'
      toast.error(errorMessage)
      
      // If agency is missing, try to refresh user data
      if (errorMessage.includes('Agency is required') || errorMessage.includes('not associated with an agency')) {
        try {
          await refreshUser()
          toast.error('Your account data has been refreshed. If the issue persists, please contact the administrator to assign an agency to your account.', { duration: 5000 })
        } catch (refreshError) {
          toast.error('Please log out and log back in to refresh your account data.', { duration: 5000 })
        }
      }
    } finally {
      setLoading(false)
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

  // Check if user has agency (for agency_admin and agent roles)
  if ((user.role === 'agency_admin' || user.role === 'agent') && !user.agency) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Agency Required</h3>
              <p className="text-yellow-700 mb-4">
                Your account is not associated with an agency. Please contact the administrator to assign an agency to your account.
              </p>
              <p className="text-sm text-yellow-600 mb-4">
                If your agency was recently assigned, click the button below to refresh your account data.
              </p>
              <button
                onClick={async () => {
                  try {
                    await refreshUser()
                    toast.success('Account data refreshed!')
                  } catch (error) {
                    toast.error('Failed to refresh. Please log out and log back in.')
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Refresh Account Data
              </button>
            </div>
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
            <Link href="/agency/leads" className="text-gray-600 hover:text-gray-900">
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
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
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
              href="/agency/leads"
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
      </div>
    </DashboardLayout>
  )
}

