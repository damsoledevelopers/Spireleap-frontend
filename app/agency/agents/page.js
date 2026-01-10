'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Calendar,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AgencyAgentsPage() {
  const { user, loading: authLoading } = useAuth()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })

  useEffect(() => {
    if (!authLoading && user) {
      fetchAgents()
    }
  }, [user, authLoading, pagination.page, searchTerm, statusFilter])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        role: 'agent',
        page: pagination.page,
        limit: pagination.limit
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      if (statusFilter) {
        params.append('isActive', statusFilter === 'active' ? 'true' : 'false')
      }
      
      const response = await api.get(`/users?${params}`)
      setAgents(response.data.users || [])
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }))
    } catch (error) {
      console.error('Failed to fetch agents:', error)
      toast.error('Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAgent = async (agentId) => {
    if (agentId === user?.id) {
      toast.error('Cannot delete your own account')
      return
    }
    
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await api.delete(`/users/${agentId}`)
        toast.success('Agent deleted successfully')
        fetchAgents()
      } catch (error) {
        console.error('Delete agent error:', error)
        const errorMessage = error.response?.data?.message || 'Failed to delete agent'
        toast.error(errorMessage)
      }
    }
  }

  const handleStatusChange = async (agentId, isActive) => {
    if (agentId === user?.id) {
      toast.error('Cannot change your own status')
      return
    }
    
    try {
      await api.put(`/users/${agentId}/status`, { isActive })
      toast.success('Agent status updated')
      fetchAgents()
    } catch (error) {
      console.error('Status change error:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update status'
      toast.error(errorMessage)
    }
  }

  const handleViewAgent = (agent) => {
    // Navigate to view page
    window.location.href = `/agency/agents/${agent._id || agent.id}`
  }

  const handleEditAgent = (agent) => {
    // Navigate to edit page
    window.location.href = `/agency/agents/${agent._id || agent.id}/edit`
  }

  const handleAgentAdded = () => {
    fetchAgents()
  }

  const handleAgentUpdated = () => {
    fetchAgents()
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || (user.role !== 'agency_admin' && user.role !== 'super_admin')) {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage agents in your agency
            </p>
          </div>
          <Link
            href="/agency/agents/new"
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Agent
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Agents</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{agents.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Agents</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {agents.filter(a => a.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Inactive Agents</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {agents.filter(a => !a.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {agents.reduce((sum, agent) => sum + (agent.agentInfo?.totalLeads || 0), 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="search" className="form-label">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="search"
                    className="form-input pl-10"
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPagination(prev => ({ ...prev, page: 1 }))
                    }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="form-label">Status</label>
                <select
                  id="status"
                  className="form-input"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('')
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="btn-secondary w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Agents Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Agents</h3>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No agents found</p>
                <Link
                  href="/agency/agents/new"
                  className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Agent
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Performance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agents.map((agent) => (
                        <tr key={agent._id || agent.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary-700">
                                    {agent.firstName?.charAt(0)}{agent.lastName?.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {agent.firstName} {agent.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {agent.agentInfo?.licenseNumber || 'No license'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {agent.email}
                            </div>
                            {agent.phone && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {agent.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div>Sales: {agent.agentInfo?.totalSales || 0}</div>
                              <div>Leads: {agent.agentInfo?.totalLeads || 0}</div>
                              <div>Rating: {agent.agentInfo?.rating || 0}/5</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge ${agent.isActive ? 'badge-green' : 'badge-red'}`}>
                              {agent.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/agency/agents/${agent._id || agent.id}`}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link
                                href={`/agency/agents/${agent._id || agent.id}/edit`}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              {agent._id !== user?.id && (
                                <>
                                  <button
                                    onClick={() => handleDeleteAgent(agent._id || agent.id)}
                                    className="text-red-400 hover:text-red-600 p-1 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(agent._id || agent.id, !agent.isActive)}
                                    className={`p-1 rounded ${
                                      agent.isActive 
                                        ? 'text-red-400 hover:text-red-600' 
                                        : 'text-green-400 hover:text-green-600'
                                    }`}
                                    title={agent.isActive ? 'Deactivate' : 'Activate'}
                                  >
                                    {agent.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.pages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

