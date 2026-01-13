'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Eye, EyeOff, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AddAgentPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agencies, setAgencies] = useState([])
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

  useEffect(() => {
    fetchAgencies()
  }, [])

  const fetchAgencies = async () => {
    try {
      const response = await api.get('/agencies?limit=1000')
      setAgencies(response.data.agencies || [])
    } catch (error) {
      console.error('Error fetching agencies:', error)
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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
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
        phone: formData.phone || undefined,
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
                <p className="mt-1 text-xs text-gray-500">This email will be used for agent login</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  Agency
                </label>
                <select
                  value={formData.agency}
                  onChange={(e) => handleInputChange('agency', e.target.value)}
                  disabled={user?.role === 'agency_admin'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Select Agency (Optional)</option>
                  {agencies.map((agency) => (
                    <option key={agency._id} value={agency._id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
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
                <p className="mt-1 text-xs text-gray-500">Minimum 6 characters. Used for agent login.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
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

