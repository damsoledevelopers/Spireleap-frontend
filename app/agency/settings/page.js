'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Settings, Save, Building, Mail, Phone, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AgencySettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agency, setAgency] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
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
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      emailNotifications: true,
      smsNotifications: false
    }
  })

  useEffect(() => {
    if (user && user.agency) {
      fetchAgency()
    }
  }, [user])

  const fetchAgency = async () => {
    try {
      if (!user || !user.agency) {
        console.error('User or agency not available')
        toast.error('Agency information not available')
        setLoading(false)
        return
      }
      setLoading(true)
      const agencyId = typeof user.agency === 'object' && user.agency._id 
        ? user.agency._id 
        : user.agency
      const response = await api.get(`/agencies/${agencyId}`)
      const agencyData = response.data.agency
      setAgency(agencyData)
      setFormData({
        name: agencyData.name || '',
        description: agencyData.description || '',
        contact: agencyData.contact || {
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
        settings: agencyData.settings || {
          currency: 'USD',
          timezone: 'UTC',
          emailNotifications: true,
          smsNotifications: false
        }
      })
    } catch (error) {
      console.error('Error fetching agency:', error)
      toast.error('Failed to load agency settings')
    } finally {
      setLoading(false)
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
    setSaving(true)

    try {
      if (!user || !user.agency) {
        toast.error('Agency information not available')
        return
      }
      const agencyId = typeof user.agency === 'object' && user.agency._id 
        ? user.agency._id 
        : user.agency
      const response = await api.put(`/agencies/${agencyId}`, formData)
      toast.success('Agency settings updated successfully!')
      
      // Update the agency state with the response
      if (response.data && response.data.agency) {
        setAgency(response.data.agency)
        setFormData({
          name: response.data.agency.name || '',
          description: response.data.agency.description || '',
          contact: response.data.agency.contact || {
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
          settings: response.data.agency.settings || {
            currency: 'USD',
            timezone: 'UTC',
            emailNotifications: true,
            smsNotifications: false
          }
        })
      } else {
        // Fallback: refetch if response structure is different
        await fetchAgency()
      }
    } catch (error) {
      console.error('Error updating agency:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update agency settings'
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your agency information and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your agency..."
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contact.email}
                  onChange={(e) => handleInputChange('contact.email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.contact.phone}
                  onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.contact.website}
                  onChange={(e) => handleInputChange('contact.website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={formData.contact.address.street}
                      onChange={(e) => handleInputChange('contact.address.street', e.target.value)}
                      placeholder="Street"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.contact.address.city}
                    onChange={(e) => handleInputChange('contact.address.city', e.target.value)}
                    placeholder="City"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={formData.contact.address.state}
                    onChange={(e) => handleInputChange('contact.address.state', e.target.value)}
                    placeholder="State"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={formData.contact.address.country}
                    onChange={(e) => handleInputChange('contact.address.country', e.target.value)}
                    placeholder="Country"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={formData.contact.address.zipCode}
                    onChange={(e) => handleInputChange('contact.address.zipCode', e.target.value)}
                    placeholder="Zip Code"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={formData.settings.currency}
                  onChange={(e) => handleInputChange('settings.currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={formData.settings.timezone}
                  onChange={(e) => handleInputChange('settings.timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">EST</option>
                  <option value="PST">PST</option>
                  <option value="GMT">GMT</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.settings.emailNotifications}
                    onChange={(e) => handleInputChange('settings.emailNotifications', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.settings.smsNotifications}
                    onChange={(e) => handleInputChange('settings.smsNotifications', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

