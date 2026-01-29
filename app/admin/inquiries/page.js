'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
  UserCircle,
  Calendar,
  FileText,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  ExternalLink,
  UserCheck,
  Target,
  Activity,
  Clock,
  Home,
  Users,
  Package,
  Plus,
  ShieldCheck,
  Building2,
  Lock,
  Download,
  Upload
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import EntryPermissionModal from '../../../components/Permissions/EntryPermissionModal'
import { checkEntryPermission } from '../../../lib/permissions'

export default function AdminInquiriesPage() {
  const { user, loading: authLoading, checkPermission } = useAuth()
  const router = useRouter()

  // Dynamic Permission Flags
  const canViewInquiries = checkPermission('inquiries', 'view')
  const canEditInquiry = checkPermission('leads', 'edit')
  const canDeleteInquiry = checkPermission('inquiries', 'delete')

  // Role-based access control & permission check
  useEffect(() => {
    if (!authLoading && user) {
      if (!canViewInquiries) {
        toast.error('You do not have permission to view inquiries')
        router.push('/admin/dashboard')
      }
    }
  }, [user, authLoading, router, canViewInquiries])

  // Role-based feature visibility
  const isSuperAdmin = user?.role === 'super_admin'
  const isAgencyAdmin = user?.role === 'agency_admin'
  const isAgent = user?.role === 'agent'
  const [inquiries, setInquiries] = useState([])
  const [allInquiries, setAllInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    property: '',
    assignedAgent: '',
    agency: '',
    status: '',
    priority: '',
    source: '',
    search: '',
    startDate: '',
    endDate: ''
  })

  // Per-entry Permission State
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false)
  const [selectedInquiryPermissions, setSelectedInquiryPermissions] = useState(null)

  const [properties, setProperties] = useState([])
  const [agents, setAgents] = useState([])
  const [agencies, setAgencies] = useState([])
  const [agencyAgents, setAgencyAgents] = useState({}) // Store agents by agency ID
  const [assigningAgent, setAssigningAgent] = useState(null) // Track which inquiry is being assigned
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    booked: 0,
    lost: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    unassigned: 0,
    byAgency: {},
    byAgent: {},
    byProperty: {}
  })

  // Calculate stats function - memoized with useCallback
  const calculateStats = useCallback((allInquiriesData) => {
    const statsData = {
      total: allInquiriesData.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      booked: 0,
      lost: 0,
      hot: 0,
      warm: 0,
      cold: 0,
      unassigned: 0,
      byAgency: {},
      byAgent: {},
      byProperty: {}
    }

    allInquiriesData.forEach((inquiry) => {
      // Status counts
      if (inquiry.status === 'new') statsData.new++
      if (inquiry.status === 'contacted') statsData.contacted++
      if (inquiry.status === 'qualified') statsData.qualified++
      if (inquiry.status === 'booked') statsData.booked++
      if (inquiry.status === 'lost' || inquiry.status === 'closed') statsData.lost++

      // Priority counts
      if (inquiry.priority === 'hot') statsData.hot++
      if (inquiry.priority === 'warm') statsData.warm++
      if (inquiry.priority === 'cold') statsData.cold++

      // Unassigned count (no agency)
      const agencyId = inquiry.agency?._id || inquiry.agency
      if (!agencyId) {
        statsData.unassigned++
      }

      // By agency
      if (agencyId) {
        const agencyKey = typeof agencyId === 'object' ? agencyId.toString() : agencyId
        statsData.byAgency[agencyKey] = (statsData.byAgency[agencyKey] || 0) + 1
      }

      // By agent
      const agentId = inquiry.assignedAgent?._id || inquiry.assignedAgent
      if (agentId) {
        const agentKey = typeof agentId === 'object' ? agentId.toString() : agentId
        statsData.byAgent[agentKey] = (statsData.byAgent[agentKey] || 0) + 1
      }

      // By property
      const propertyId = inquiry.property?._id || inquiry.property
      if (propertyId) {
        const propertyKey = typeof propertyId === 'object' ? propertyId.toString() : propertyId
        statsData.byProperty[propertyKey] = (statsData.byProperty[propertyKey] || 0) + 1
      }
    })

    setStats(statsData)
  }, [])

  // Calculate stats when allInquiries changes
  useEffect(() => {
    if (allInquiries.length > 0) {
      calculateStats(allInquiries)
    }
  }, [allInquiries, calculateStats])

  const fetchProperties = useCallback(async () => {
    try {
      const response = await api.get('/properties?limit=500')
      const fetchedProperties = response.data.properties || []
      setProperties(fetchedProperties)
      if (fetchedProperties.length === 0) {
        console.warn('No properties found')
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
      toast.error('Failed to load properties')
      setProperties([])
    }
  }, [])

  const fetchAgents = useCallback(async () => {
    try {
      const response = await api.get('/users?role=agent&limit=1000')
      setAgents(response.data.users || [])
    } catch (error) {
      console.error('Failed to fetch agents:', error)
      setAgents([])
    }
  }, [])

  const fetchAgencies = useCallback(async () => {
    try {
      const response = await api.get('/agencies?limit=1000')
      setAgencies(response.data.agencies || [])
    } catch (error) {
      console.error('Failed to fetch agencies:', error)
    }
  }, [])

  // Fetch agents from a specific agency
  const fetchAgentsByAgency = useCallback(async (agencyId) => {
    if (!agencyId) return []

    // Check if we already have agents for this agency cached
    if (agencyAgents[agencyId]) {
      return agencyAgents[agencyId]
    }

    try {
      const response = await api.get(`/users?role=agent&agency=${agencyId}&limit=1000`)
      const agencyAgentsList = response.data.users || []

      // Cache the agents for this agency
      setAgencyAgents(prev => ({
        ...prev,
        [agencyId]: agencyAgentsList
      }))

      return agencyAgentsList
    } catch (error) {
      console.error('Failed to fetch agents by agency:', error)
      // Cache as empty list to prevent infinite loading
      setAgencyAgents(prev => ({
        ...prev,
        [agencyId]: []
      }))
      return []
    }
  }, [agencyAgents])

  const handleOpenEntryPermissions = (inquiry) => {
    setSelectedInquiryPermissions(inquiry)
    setIsPermissionModalOpen(true)
  }

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })

      // Add all filters to params including search (backend supports search)
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, value)
        }
      })

      const response = await api.get(`/leads?${params}`)
      const fetchedInquiries = response.data.leads || []

      // Update pagination from API response
      if (response.data && response.data.pagination) {
        const apiPagination = response.data.pagination
        setPagination({
          page: apiPagination.page || currentPage,
          limit: apiPagination.limit || itemsPerPage,
          total: apiPagination.total !== undefined ? apiPagination.total : fetchedInquiries.length,
          pages: apiPagination.pages !== undefined ? apiPagination.pages : Math.max(1, Math.ceil((apiPagination.total || fetchedInquiries.length) / (apiPagination.limit || itemsPerPage)))
        })
      } else {
        // Fallback: if no pagination data, assume this is all the data (client-side pagination scenario)
        // But still set pagination state for UI consistency
        const totalCount = fetchedInquiries.length
        const calculatedPages = Math.max(1, Math.ceil(totalCount / itemsPerPage))
        setPagination({
          page: currentPage,
          limit: itemsPerPage,
          total: totalCount,
          pages: calculatedPages
        })
      }

      // API already populates property, agency, and assignedAgent, so use them directly
      setInquiries(fetchedInquiries.filter(inquiry => checkEntryPermission(inquiry, user, 'view', canViewInquiries)))

      // Fetch inquiries for stats (using max allowed limit of 500)
      // Stats fetch should include all filters
      const allParams = new URLSearchParams({ limit: '500', page: '1' })
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          allParams.append(key, value)
        }
      })

      try {
        const allResponse = await api.get(`/leads?${allParams}`)
        setAllInquiries(allResponse.data.leads || [])
      } catch (statsError) {
        console.error('Failed to fetch inquiries for stats:', statsError)
        // Use paginated inquiries for stats if full fetch fails
        setAllInquiries(fetchedInquiries)
      }

    } catch (error) {
      console.error('Failed to fetch inquiries:', error)
      toast.error('Failed to load inquiries')
      setInquiries([])
      setAllInquiries([])
      setPagination({ page: 1, limit: itemsPerPage, total: 0, pages: 0 })
    } finally {
      setLoading(false)
    }
  }, [
    currentPage,
    itemsPerPage,
    filters,
    user,
    canViewInquiries
  ])

  useEffect(() => {
    if (!authLoading && user) {
      fetchInquiries()
      fetchProperties()
      fetchAgents()
      fetchAgencies()
    }
  }, [user, authLoading, fetchInquiries, fetchProperties, fetchAgents, fetchAgencies])

  // Assign agent to a lead
  const handleUpdateStatus = useCallback(async (leadId, newStatus) => {
    try {
      setLoading(true)
      await api.put(`/leads/${leadId}`, { status: newStatus })
      toast.success('Status updated successfully')

      // Update local state
      setInquiries(prev => prev.map(inquiry =>
        inquiry._id === leadId ? { ...inquiry, status: newStatus } : inquiry
      ))
      setAllInquiries(prev => prev.map(inquiry =>
        inquiry._id === leadId ? { ...inquiry, status: newStatus } : inquiry
      ))

      // Refresh to ensure all metrics are updated
      await fetchInquiries()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }, [fetchInquiries])

  const handleAssignAgent = useCallback(async (leadId, agentId) => {
    if (!agentId) {
      toast.error('Please select an agent')
      return
    }

    try {
      setAssigningAgent(leadId)
      const response = await api.put(`/leads/${leadId}/assign`, { assignedAgent: agentId })

      // Update local state immediately for instant feedback
      const updatedLead = response.data.lead
      if (updatedLead && updatedLead.assignedAgent) {
        // Ensure assignedAgent is properly set (could be object or ID)
        const assignedAgentData = updatedLead.assignedAgent

        setInquiries(prev => prev.map(inquiry =>
          inquiry._id === leadId
            ? {
              ...inquiry,
              assignedAgent: assignedAgentData
            }
            : inquiry
        ))
        setAllInquiries(prev => prev.map(inquiry =>
          inquiry._id === leadId
            ? {
              ...inquiry,
              assignedAgent: assignedAgentData
            }
            : inquiry
        ))
      }

      toast.success('Agent assigned successfully')

      // Refresh the inquiries list to get full updated data
      await fetchInquiries()
    } catch (error) {
      console.error('Failed to assign agent:', error)
      toast.error(error.response?.data?.message || 'Failed to assign agent')
    } finally {
      setAssigningAgent(null)
    }
  }, [fetchInquiries])

  const handleViewDetails = async (inquiryId) => {
    try {
      const response = await api.get(`/leads/${inquiryId}`)
      setSelectedInquiry(response.data.lead)
      setShowDetailModal(true)
    } catch (error) {
      console.error('Failed to fetch inquiry details:', error)
      toast.error('Failed to load inquiry details')
    }
  }

  const handleDelete = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to delete this inquiry? This action cannot be undone.')) {
      return
    }
    try {
      await api.delete(`/leads/${inquiryId}`)
      toast.success('Inquiry deleted successfully')
      await fetchInquiries()
    } catch (error) {
      console.error('Failed to delete inquiry:', error)
      toast.error(error.response?.data?.message || 'Failed to delete inquiry')
    }
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      site_visit_scheduled: 'bg-indigo-100 text-indigo-800',
      site_visit_completed: 'bg-cyan-100 text-cyan-800',
      negotiation: 'bg-orange-100 text-orange-800',
      booked: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
      junk: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const priorityStyles = {
      hot: 'bg-red-100 text-red-800',
      warm: 'bg-orange-100 text-orange-800',
      cold: 'bg-blue-100 text-blue-800',
      not_interested: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityStyles[priority] || 'bg-gray-100 text-gray-800'}`}>
        {priority?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
      </span>
    )
  }

  const clearAllFilters = () => {
    setFilters({
      property: '',
      assignedAgent: '',
      agency: '',
      status: '',
      priority: '',
      source: '',
      search: '',
      startDate: '',
      endDate: ''
    })
    setCurrentPage(1)
  }

  // Server-side pagination - no client-side filtering needed
  // All filtering and pagination is handled by the API

  // Show loading or redirect if not authorized
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || (!isSuperAdmin && !canViewInquiries)) {
    return null // Router will handle redirect
  }

  if (loading && inquiries.length === 0) {
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
        {/* Header */}
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isSuperAdmin ? 'Manage all property inquiries with complete details' :
                isAgencyAdmin ? 'Manage your agency inquiries' :
                  'View your assigned inquiries'}
            </p>
          </div>
          <div className="relative min-w-[300px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inquiries..."
              value={filters.search}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, search: e.target.value }))
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
            />
          </div>
        </div>

        {/* Analysis Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Inquiries</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                </div>
                <MessageSquare className="h-10 w-10 text-blue-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">New</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{stats.new}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0}% of total
                  </p>
                </div>
                <AlertCircle className="h-10 w-10 text-green-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Qualified</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{stats.qualified}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    {stats.total > 0 ? Math.round((stats.qualified / stats.total) * 100) : 0}%
                  </p>
                </div>
                <UserCheck className="h-10 w-10 text-purple-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Hot Priority</p>
                  <p className="text-2xl font-bold text-orange-900 mt-1">{stats.hot}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    {stats.total > 0 ? Math.round((stats.hot / stats.total) * 100) : 0}%
                  </p>
                </div>
                <Target className="h-10 w-10 text-orange-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Booked</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{stats.booked}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0}%
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-red-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unassigned</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.unassigned}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats.total > 0 ? Math.round((stats.unassigned / stats.total) * 100) : 0}% of total
                  </p>
                </div>
                <AlertCircle className="h-10 w-10 text-gray-500 opacity-70" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Clear Filters Button */}
            {(filters.property || filters.assignedAgent || filters.agency || filters.status || filters.priority || filters.source || filters.search || filters.startDate || filters.endDate) && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 ${filters.startDate || filters.endDate
                  ? 'border-primary-500 text-gray-900'
                  : 'border-gray-300 text-gray-700'
                  }`}
              >
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <span>
                  {filters.startDate && filters.endDate
                    ? `Date: ${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : filters.startDate
                      ? `Date: ${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ...`
                      : filters.endDate
                        ? `Date: ... - ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                        : 'Date Range'}
                </span>
                {(filters.startDate || filters.endDate) && (
                  <X
                    className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
                      setCurrentPage(1)
                    }}
                  />
                )}
              </button>
              {showDatePicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDatePicker(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 min-w-[500px]">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-2">From Date</label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => {
                            const newStartDate = e.target.value
                            setFilters(prev => ({ ...prev, startDate: newStartDate }))
                            setCurrentPage(1)
                            if (filters.endDate && newStartDate && filters.endDate < newStartDate) {
                              setFilters(prev => ({ ...prev, endDate: '' }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-2">To Date</label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => {
                            const newEndDate = e.target.value
                            if (filters.startDate && newEndDate && newEndDate < filters.startDate) {
                              toast.error('End date must be after start date')
                              return
                            }
                            setFilters(prev => ({ ...prev, endDate: newEndDate }))
                            setCurrentPage(1)
                          }}
                          min={filters.startDate || undefined}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => {
                          setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
                          setCurrentPage(1)
                          setShowDatePicker(false)
                        }}
                        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Agency Filter - hidden for agent (they only see their own inquiries) */}
            {!isAgent && (
            <select
              value={filters.agency}
              onChange={(e) => {
                const newAgency = e.target.value
                setFilters(prev => {
                  // Clear assignedAgent if unassigned is selected or if it doesn't belong to the new agency
                  let newAssignedAgent = prev.assignedAgent
                  if (newAgency === 'unassigned') {
                    // Clear assignedAgent when unassigned is selected
                    newAssignedAgent = ''
                  } else if (newAgency && prev.assignedAgent) {
                    const selectedAgent = agents.find(agent => {
                      const agentId = agent._id || agent.id
                      return agentId === prev.assignedAgent || agentId?.toString() === prev.assignedAgent
                    })
                    if (selectedAgent) {
                      const agentAgencyId = selectedAgent.agency?._id || selectedAgent.agency
                      const agencyIdStr = typeof agentAgencyId === 'object' ? agentAgencyId?.toString() : agentAgencyId
                      if (agencyIdStr !== newAgency) {
                        newAssignedAgent = ''
                      }
                    }
                  } else if (newAgency === '') {
                    // If agency filter is cleared, keep assignedAgent
                    newAssignedAgent = prev.assignedAgent
                  }
                  return { ...prev, agency: newAgency, assignedAgent: newAssignedAgent }
                })
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="">All Agencies</option>
              <option value="unassigned">Unassigned</option>
              {agencies && agencies.length > 0 && agencies.map((agency) => (
                <option key={agency._id} value={agency._id}>
                  {agency.name}
                </option>
              ))}
            </select>
            )}

            {/* Agent Filter - hidden for agent */}
            {!isAgent && (
            <select
              value={filters.assignedAgent}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, assignedAgent: e.target.value }))
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="">All Agents</option>
              {agents && agents.length > 0 && agents
                .filter(agent => {
                  // If agency filter is selected, show only agents from that agency
                  if (!filters.agency) {
                    return true // Show all agents if no agency filter
                  }
                  const agentAgencyId = agent.agency?._id || agent.agency
                  const agencyIdStr = typeof agentAgencyId === 'object' ? agentAgencyId?.toString() : agentAgencyId
                  return agencyIdStr === filters.agency || agencyIdStr === filters.agency.toString()
                })
                .map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
            </select>
            )}

            {/* Property Filter */}
            <select
              value={filters.property}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, property: e.target.value }))
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="">All Properties</option>
              {properties && properties.length > 0 ? properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.title || property.name || `Property ${property._id?.slice(-6) || ''}`}
                </option>
              )) : (
                <option value="" disabled>No properties available</option>
              )}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }))
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="site_visit_scheduled">Site Visit Scheduled</option>
              <option value="site_visit_completed">Site Visit Completed</option>
              <option value="negotiation">Negotiation</option>
              <option value="booked">Booked</option>
              <option value="lost">Lost</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filters.priority}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, priority: e.target.value }))
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="">All Priority</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="not_interested">Not Interested</option>
            </select>
          </div>
        </div>

        {/* Inquiries Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No inquiries found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inquiries.map((inquiry) => (
                    <tr key={inquiry._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {inquiry.contact?.firstName} {inquiry.contact?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{inquiry.contact?.email}</div>
                          <div className="text-sm text-gray-500">{inquiry.contact?.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {inquiry.property ? (
                            <div>
                              <div className="font-medium">{inquiry.property.title || 'N/A'}</div>
                              {inquiry.property.agent && (
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <UserCircle className="h-3 w-3" />
                                  <span>Owner: {inquiry.property.agent.firstName} {inquiry.property.agent.lastName}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No Property</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {inquiry.agency?.logo ? (
                            <img
                              src={inquiry.agency.logo}
                              alt={inquiry.agency.name}
                              className="h-8 w-8 rounded-full mr-2 object-cover"
                            />
                          ) : (
                            <Building className="h-8 w-8 text-gray-400 mr-2" />
                          )}
                          <div className="text-sm text-gray-900">
                            {inquiry.agency?.name || 'Unassigned'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(user?.role === 'super_admin' || user?.role === 'agency_admin') && inquiry.agency ? (
                          <div className="relative">
                            <select
                              value={inquiry.assignedAgent?._id || inquiry.assignedAgent || ""}
                              onChange={async (e) => {
                                const selectedAgentId = e.target.value
                                if (selectedAgentId) {
                                  await handleAssignAgent(inquiry._id, selectedAgentId)
                                }
                              }}
                              disabled={assigningAgent === inquiry._id}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                              onFocus={async () => {
                                // Fetch agents when dropdown is opened
                                const agencyId = inquiry.agency?._id || inquiry.agency
                                if (agencyId && !agencyAgents[agencyId]) {
                                  await fetchAgentsByAgency(agencyId)
                                }
                              }}
                            >
                              <option value="">Assign Agent...</option>
                              {inquiry.assignedAgent && (inquiry.assignedAgent._id || inquiry.assignedAgent) && (
                                <option value={inquiry.assignedAgent._id || inquiry.assignedAgent}>
                                  {inquiry.assignedAgent.firstName
                                    ? `${inquiry.assignedAgent.firstName} ${inquiry.assignedAgent.lastName}`
                                    : 'Assigned Agent'}
                                </option>
                              )}
                              {(() => {
                                const agencyId = inquiry.agency?._id || inquiry.agency
                                const availableAgents = agencyAgents[agencyId]

                                if (availableAgents === undefined) {
                                  return null // Just show the assigned agent or "Assign Agent..."
                                }

                                // Filter out the current agent to avoid duplicates
                                const currentAgentId = inquiry.assignedAgent?._id || inquiry.assignedAgent
                                return availableAgents
                                  .filter(agent => agent._id !== currentAgentId)
                                  .map((agent) => (
                                    <option key={agent._id} value={agent._id}>
                                      {agent.firstName} {agent.lastName}
                                    </option>
                                  ))
                              })()}
                            </select>
                            {assigningAgent === inquiry._id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            {inquiry.assignedAgent && (inquiry.assignedAgent._id || inquiry.assignedAgent.firstName || inquiry.assignedAgent) ? (
                              <>
                                {inquiry.assignedAgent.profileImage ? (
                                  <img
                                    src={inquiry.assignedAgent.profileImage}
                                    alt={`${inquiry.assignedAgent.firstName || ''} ${inquiry.assignedAgent.lastName || ''}`}
                                    className="h-8 w-8 rounded-full mr-2 object-cover"
                                  />
                                ) : (
                                  <UserCircle className="h-8 w-8 text-gray-400 mr-2" />
                                )}
                                <div className="text-sm text-gray-900">
                                  {inquiry.assignedAgent.firstName || ''} {inquiry.assignedAgent.lastName || ''}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400 text-sm">Unassigned</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {canEditInquiry ? (
                          <select
                            value={inquiry.status || 'new'}
                            onChange={(e) => handleUpdateStatus(inquiry._id, e.target.value)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border border-gray-300 focus:ring-primary-500 focus:border-primary-500 bg-white
                              ${inquiry.status === 'new' ? 'text-blue-800 bg-blue-50' :
                                inquiry.status === 'contacted' ? 'text-yellow-800 bg-yellow-50' :
                                  inquiry.status === 'qualified' ? 'text-purple-800 bg-purple-50' :
                                    inquiry.status === 'booked' ? 'text-green-800 bg-green-50' :
                                      inquiry.status === 'lost' ? 'text-red-800 bg-red-50' :
                                        'text-gray-800 bg-gray-50'}`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="site_visit_scheduled">Site Visit Scheduled</option>
                            <option value="site_visit_completed">Site Visit Completed</option>
                            <option value="negotiation">Negotiation</option>
                            <option value="booked">Booked</option>
                            <option value="lost">Lost</option>
                            <option value="closed">Closed</option>
                            <option value="junk">Junk</option>
                          </select>
                        ) : (
                          getStatusBadge(inquiry.status)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(inquiry.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inquiry.createdAt
                          ? new Date(inquiry.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {checkEntryPermission(inquiry, user, 'view', canViewInquiries) && (
                            <button
                              onClick={() => handleViewDetails(inquiry._id)}
                              className="text-primary-600 hover:text-primary-900 transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          )}
                          {checkEntryPermission(inquiry, user, 'edit', canEditInquiry) && (
                            <Link
                              href={`/admin/leads/${inquiry._id}/edit`}
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                              title="Edit Inquiry"
                            >
                              <Edit className="h-5 w-5" />
                            </Link>
                          )}
                          {canDeleteInquiry && (
                            <button
                              onClick={() => handleDelete(inquiry._id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                          {user?.role === 'super_admin' && (
                            <button
                              onClick={() => handleOpenEntryPermissions(inquiry)}
                              className="text-amber-600 hover:text-amber-900 transition-colors"
                              title="Set Custom Permissions"
                            >
                              <ShieldCheck className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {inquiries.length > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={pagination.page <= 1 || (pagination.pages && pagination.pages <= 1)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.pages || 1, prev + 1))}
                    disabled={pagination.page >= (pagination.pages || 1)}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">
                        {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 1}
                      </span> to{' '}
                      <span className="font-medium">
                        {pagination.total > 0
                          ? Math.min(pagination.page * pagination.limit, pagination.total)
                          : inquiries.length}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total || inquiries.length}</span> results
                    </p>
                  </div>
                  {pagination.pages > 1 && (
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        {[...Array(pagination.pages)].map((_, i) => {
                          const pageNum = i + 1

                          // For many pages, show only first, last, current, and neighbors
                          if (pagination.pages > 10) {
                            const showPage =
                              pageNum === 1 ||
                              pageNum === pagination.pages ||
                              (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)

                            if (!showPage) {
                              // Show ellipsis only once before first hidden page and once after last hidden page
                              const isBeforeFirstHidden = pageNum === pagination.page - 2 && pagination.page > 3
                              const isAfterLastHidden = pageNum === pagination.page + 2 && pagination.page < pagination.pages - 2

                              // Edge case: if page is near the beginning or end
                              if (pagination.page <= 3) {
                                // Near beginning: show ellipsis after page 4
                                if (pageNum === 4) {
                                  return (
                                    <span key={`ellipsis-before-${pageNum}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                      ...
                                    </span>
                                  )
                                }
                              } else if (pagination.page >= pagination.pages - 2) {
                                // Near end: show ellipsis before second-to-last page
                                if (pageNum === pagination.pages - 3) {
                                  return (
                                    <span key={`ellipsis-after-${pageNum}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                      ...
                                    </span>
                                  )
                                }
                              } else {
                                // Middle: show ellipsis before and after
                                if (isBeforeFirstHidden) {
                                  return (
                                    <span key={`ellipsis-before-${pageNum}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                      ...
                                    </span>
                                  )
                                }
                                if (isAfterLastHidden) {
                                  return (
                                    <span key={`ellipsis-after-${pageNum}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                      ...
                                    </span>
                                  )
                                }
                              }
                              return null
                            }
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pagination.page === pageNum
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                          disabled={pagination.page >= pagination.pages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedInquiry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Inquiry Details</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedInquiry(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedInquiry.contact?.firstName} {selectedInquiry.contact?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{selectedInquiry.contact?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{selectedInquiry.contact?.phone}</p>
                    </div>
                    {selectedInquiry.contact?.alternatePhone && (
                      <div>
                        <p className="text-sm text-gray-500">Alternate Phone</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedInquiry.contact.alternatePhone}
                        </p>
                      </div>
                    )}
                    {selectedInquiry.contact?.address && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="text-sm font-medium text-gray-900">
                          {[
                            selectedInquiry.contact.address.street,
                            selectedInquiry.contact.address.city,
                            selectedInquiry.contact.address.state,
                            selectedInquiry.contact.address.country,
                            selectedInquiry.contact.address.zipCode
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Property Information */}
                {selectedInquiry.property && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Property Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Title</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedInquiry.property.title || 'N/A'}
                        </p>
                      </div>
                      {selectedInquiry.property.price && (
                        <div>
                          <p className="text-sm text-gray-500">Price</p>
                          <p className="text-sm font-medium text-gray-900">
                            ${typeof selectedInquiry.property.price === 'number'
                              ? selectedInquiry.property.price.toLocaleString()
                              : String(selectedInquiry.property.price)}
                          </p>
                        </div>
                      )}
                      {selectedInquiry.property.location && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="text-sm font-medium text-gray-900">
                            {typeof selectedInquiry.property.location === 'string'
                              ? selectedInquiry.property.location
                              : typeof selectedInquiry.property.location === 'object'
                                ? [
                                  selectedInquiry.property.location?.address,
                                  selectedInquiry.property.location?.city,
                                  selectedInquiry.property.location?.state,
                                  selectedInquiry.property.location?.country,
                                  selectedInquiry.property.location?.zipCode
                                ].filter(Boolean).join(', ') || 'N/A'
                                : 'N/A'}
                          </p>
                        </div>
                      )}
                      {selectedInquiry.property.slug && (
                        <div className="col-span-2">
                          <Link
                            href={`/properties/${selectedInquiry.property.slug}`}
                            target="_blank"
                            className="text-primary-600 hover:text-primary-800 flex items-center gap-1 text-sm"
                          >
                            View Property <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Agency Information */}
                {selectedInquiry.agency && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Agency Details
                    </h3>
                    <div className="flex items-center gap-4">
                      {selectedInquiry.agency.logo ? (
                        <img
                          src={selectedInquiry.agency.logo}
                          alt={selectedInquiry.agency.name || 'Agency'}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <Building className="h-16 w-16 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedInquiry.agency.name || 'N/A'}
                        </p>
                        {selectedInquiry.agency.contact?.email && (
                          <p className="text-sm text-gray-500">{selectedInquiry.agency.contact.email}</p>
                        )}
                        {selectedInquiry.agency.contact?.phone && (
                          <p className="text-sm text-gray-500">{selectedInquiry.agency.contact.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Agent Information */}
                {selectedInquiry.assignedAgent ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserCircle className="h-5 w-5" />
                      Assigned Agent
                    </h3>
                    <div className="flex items-center gap-4">
                      {selectedInquiry.assignedAgent.profileImage ? (
                        <img
                          src={selectedInquiry.assignedAgent.profileImage}
                          alt={`${selectedInquiry.assignedAgent.firstName || ''} ${selectedInquiry.assignedAgent.lastName || ''}`}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle className="h-16 w-16 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedInquiry.assignedAgent.firstName || ''} {selectedInquiry.assignedAgent.lastName || ''}
                        </p>
                        {selectedInquiry.assignedAgent.email && (
                          <p className="text-sm text-gray-500">{selectedInquiry.assignedAgent.email}</p>
                        )}
                        {selectedInquiry.assignedAgent.phone && (
                          <p className="text-sm text-gray-500">{selectedInquiry.assignedAgent.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserCircle className="h-5 w-5" />
                      Assigned Agent
                    </h3>
                    <p className="text-sm text-gray-500">No agent assigned</p>
                  </div>
                )}

                {/* Inquiry Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Inquiry Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedInquiry.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Priority</p>
                      <div className="mt-1">{getPriorityBadge(selectedInquiry.priority)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Source</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedInquiry.source && typeof selectedInquiry.source === 'string'
                          ? selectedInquiry.source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedInquiry.createdAt
                          ? new Date(selectedInquiry.createdAt).toLocaleString('en-GB')
                          : 'N/A'}
                      </p>
                    </div>
                    {selectedInquiry.inquiry?.message && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Message</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {selectedInquiry.inquiry.message}
                        </p>
                      </div>
                    )}
                    {selectedInquiry.inquiry?.budget && (
                      <>
                        {selectedInquiry.inquiry.budget.min && (
                          <div>
                            <p className="text-sm text-gray-500">Budget Min</p>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedInquiry.inquiry.budget.currency || '$'}{' '}
                              {typeof selectedInquiry.inquiry.budget.min === 'number'
                                ? selectedInquiry.inquiry.budget.min.toLocaleString()
                                : String(selectedInquiry.inquiry.budget.min)}
                            </p>
                          </div>
                        )}
                        {selectedInquiry.inquiry.budget.max && (
                          <div>
                            <p className="text-sm text-gray-500">Budget Max</p>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedInquiry.inquiry.budget.currency || '$'}{' '}
                              {typeof selectedInquiry.inquiry.budget.max === 'number'
                                ? selectedInquiry.inquiry.budget.max.toLocaleString()
                                : String(selectedInquiry.inquiry.budget.max)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {selectedInquiry.inquiry?.timeline && (
                      <div>
                        <p className="text-sm text-gray-500">Timeline</p>
                        <p className="text-sm font-medium text-gray-900">
                          {typeof selectedInquiry.inquiry.timeline === 'string'
                            ? selectedInquiry.inquiry.timeline.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                            : String(selectedInquiry.inquiry.timeline)}
                        </p>
                      </div>
                    )}
                    {selectedInquiry.inquiry?.propertyType && selectedInquiry.inquiry.propertyType.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Property Types</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedInquiry.inquiry.propertyType.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedInquiry(null)
                  }}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <Link
                  href={`/admin/leads/${selectedInquiry._id}/edit`}
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Edit Inquiry
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <EntryPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => {
          setIsPermissionModalOpen(false)
          setSelectedInquiryPermissions(null)
        }}
        entry={selectedInquiryPermissions}
        entryType="inquiries"
        onSuccess={fetchInquiries}
      />
    </DashboardLayout>
  )
}
