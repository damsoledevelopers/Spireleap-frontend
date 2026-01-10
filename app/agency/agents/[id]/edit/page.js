'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function EditAgentPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
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
      yearsOfExperience: '',
      commissionRate: ''
    }
  })

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchAgentData()
    }
  }, [currentUser, authLoading, params.id])

  const fetchAgentData = async () => {
    try {
      setFetching(true)
      const response = await api.get(`/users/${params.id}`)
      const agent = response.data
      
      if (!agent) {
        toast.error('Agent not found')
        router.push('/agency/agents')
        return
      }
      
      setFormData({
        firstName: agent.firstName || '',
        lastName: agent.lastName || '',
        email: agent.email || '',
        phone: agent.phone || '',
        password: '',
        confirmPassword: '',
        isActive: agent.isActive !== undefined ? agent.isActive : true,
        address: agent.address || {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: ''
        },
        agentInfo: {
          licenseNumber: agent.agentInfo?.licenseNumber || '',
          bio: agent.agentInfo?.bio || '',
          yearsOfExperience: agent.agentInfo?.yearsOfExperience || '',
          commissionRate: agent.agentInfo?.commissionRate || ''
        }
      })
    } catch (error) {
      console.error('Error fetching agent data:', error)
      
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 403) {
          toast.error('You do not have permission to view this agent')
        } else if (error.response.status === 404) {
          toast.error('Agent not found')
        } else {
          toast.error(error.response.data?.message || 'Failed to load agent details')
        }
      } else if (error.request) {
        // Request was made but no response received
        toast.error('Network error. Please check if the server is running.')
      } else {
        // Something else happened
        toast.error('Failed to load agent details')
      }
      
      router.push('/agency/agents')
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
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate password if provided
      if (formData.password || formData.confirmPassword) {
        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match')
          setLoading(false)
          return
        }
      }

      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        isActive: formData.isActive,
        address: Object.values(formData.address).some(v => v) ? formData.address : undefined,
        agentInfo: {
          ...(formData.agentInfo.licenseNumber && { licenseNumber: formData.agentInfo.licenseNumber }),
          ...(formData.agentInfo.bio && { bio: formData.agentInfo.bio }),
          ...(formData.agentInfo.yearsOfExperience && { yearsOfExperience: parseInt(formData.agentInfo.yearsOfExperience) }),
          ...(formData.agentInfo.commissionRate && { commissionRate: parseFloat(formData.agentInfo.commissionRate) })
        }
      }

      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password
      }

      // Remove empty agentInfo fields
      if (Object.keys(updateData.agentInfo).length === 0) {
        delete updateData.agentInfo
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
      
      // Show appropriate success message
      if (formData.password) {
        toast.success('Agent updated successfully! Password has been changed. The agent can now login with the new password.')
      } else {
        toast.success('Agent updated successfully!')
      }
      
      router.push(`/agency/agents/${params.id}`)
    } catch (error) {
      console.error('Error updating agent:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update agent'
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

  if (!currentUser || (currentUser.role !== 'agency_admin' && currentUser.role !== 'super_admin')) {
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
            <Link href={`/agency/agents/${params.id}`} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Agent</h1>
              <p className="mt-1 text-sm text-gray-500">Update agent information</p>
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
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
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
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
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
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Leave blank if you don't want to change the password
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  minLength={6}
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
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Agent Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.agentInfo.licenseNumber}
                  onChange={(e) => handleInputChange('agentInfo.licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.agentInfo.yearsOfExperience}
                  onChange={(e) => handleInputChange('agentInfo.yearsOfExperience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              href={`/agency/agents/${params.id}`}
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
              {loading ? 'Updating...' : 'Update Agent'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

