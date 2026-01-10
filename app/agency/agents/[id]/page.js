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
  Edit,
  Shield,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  Award,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgent()
  }, [params.id])

  const fetchAgent = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/users/${params.id}`)
      setAgent(response.data)
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
      setLoading(false)
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

  if (!agent) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agency/agents" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {agent.firstName} {agent.lastName}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Agent Details</p>
            </div>
          </div>
          <Link
            href={`/agency/agents/${params.id}/edit`}
            className="btn btn-primary flex items-center gap-2"
          >
            <Edit className="h-5 w-5" />
            Edit Agent
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{agent.firstName} {agent.lastName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{agent.email}</p>
                  </div>
                </div>
                {agent.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{agent.phone}</p>
                    </div>
                  </div>
                )}
                {agent.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">
                        {agent.address.street && `${agent.address.street}, `}
                        {agent.address.city}{agent.address.state && `, ${agent.address.state}`}
                        {agent.address.country && `, ${agent.address.country}`}
                        {agent.address.zipCode && ` ${agent.address.zipCode}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Information */}
            {agent.agentInfo && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agent.agentInfo.licenseNumber && (
                    <div>
                      <p className="text-sm text-gray-500">License Number</p>
                      <p className="font-medium">{agent.agentInfo.licenseNumber}</p>
                    </div>
                  )}
                  {agent.agentInfo.yearsOfExperience !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Years of Experience</p>
                      <p className="font-medium">{agent.agentInfo.yearsOfExperience} years</p>
                    </div>
                  )}
                  {agent.agentInfo.commissionRate !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Commission Rate</p>
                      <p className="font-medium">{agent.agentInfo.commissionRate}%</p>
                    </div>
                  )}
                  {agent.agentInfo.bio && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Bio</p>
                      <p className="font-medium">{agent.agentInfo.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-900">{agent.agentInfo?.totalSales || 0}</p>
                  <p className="text-sm text-gray-600">Total Sales</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-900">{agent.agentInfo?.totalLeads || 0}</p>
                  <p className="text-sm text-gray-600">Total Leads</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Award className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-900">{agent.agentInfo?.rating || 0}/5</p>
                  <p className="text-sm text-gray-600">Rating</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                    agent.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {agent.isActive ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium capitalize">{agent.role?.replace('_', ' ')}</p>
                </div>
                {agent.agency && (
                  <div>
                    <p className="text-sm text-gray-500">Agency</p>
                    <p className="font-medium">
                      {typeof agent.agency === 'object' ? agent.agency.name : 'Agency'}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                {agent.lastLogin && (
                  <div>
                    <p className="text-sm text-gray-500">Last Login</p>
                    <p className="font-medium">
                      {new Date(agent.lastLogin).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

