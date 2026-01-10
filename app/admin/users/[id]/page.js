'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  Save,
  CheckCircle,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    fetchUser()
  }, [params.id])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/users/${params.id}`)
      setUser(response.data)
      setFormData({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        email: response.data.email,
        phone: response.data.phone || '',
        address: response.data.address || {},
        isActive: response.data.isActive
      })
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load user details')
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    try {
      await api.put(`/users/${params.id}`, formData)
      toast.success('User updated successfully')
      setEditing(false)
      fetchUser()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const keys = field.split('.')
      setFormData(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
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

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="mt-1 text-sm text-gray-500">User Details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
            {!editing ? (
              <Link
                href={`/admin/users/${params.id}/edit`}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit className="h-5 w-5" />
                Edit
              </Link>
            ) : (
              <button 
                onClick={handleUpdate}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Save className="h-5 w-5" />
                Save
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                  {user.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{user.phone}</p>
                      </div>
                    </div>
                  )}
                  {user.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">
                          {user.address.city}, {user.address.country}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role & Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Role & Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium capitalize">{user.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {user.isActive ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-1" />
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
                {user.agency && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Agency</p>
                      <p className="font-medium">
                        {typeof user.agency === 'object' ? user.agency.name : 'Agency'}
                      </p>
                    </div>
                  </div>
                )}
                {user.lastLogin && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Last Login</p>
                      <p className="font-medium">{new Date(user.lastLogin).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Information */}
            {user.role === 'agent' && user.agentInfo && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.agentInfo.licenseNumber && (
                    <div>
                      <p className="text-sm text-gray-500">License Number</p>
                      <p className="font-medium">{user.agentInfo.licenseNumber}</p>
                    </div>
                  )}
                  {user.agentInfo.yearsOfExperience && (
                    <div>
                      <p className="text-sm text-gray-500">Experience</p>
                      <p className="font-medium">{user.agentInfo.yearsOfExperience} years</p>
                    </div>
                  )}
                  {user.agentInfo.totalSales !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Total Sales</p>
                      <p className="font-medium">{user.agentInfo.totalSales}</p>
                    </div>
                  )}
                  {user.agentInfo.totalLeads !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Total Leads</p>
                      <p className="font-medium">{user.agentInfo.totalLeads}</p>
                    </div>
                  )}
                  {user.agentInfo.rating !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Rating</p>
                      <p className="font-medium">{user.agentInfo.rating}/5</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User ID</p>
                  <p className="font-medium text-xs">{user._id || user.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

