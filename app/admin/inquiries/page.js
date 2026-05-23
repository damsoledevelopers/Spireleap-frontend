'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { getAddressLabeledRows } from '../../../lib/formatAddress'
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
  Upload,
  DollarSign,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import EntryPermissionModal from '../../../components/Permissions/EntryPermissionModal'
import { checkEntryPermission } from '../../../lib/permissions'
import { getDropdownOptions } from '../../../lib/dropdownsApi'
import SearchableSelect from '../../../components/Common/SearchableSelect'
import { useConfirmDialog } from '../../../components/Common/useConfirmDialog'

/** Property.price may be a number or { sale, rent: { amount, period }, currency }. */
function formatInquiryPropertyPrice(price) {
  if (price === null || price === undefined) return 'N/A'
  const toUsd = (value) => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? `$${numeric.toLocaleString()}` : null
  }
  if (typeof price === 'object' && !Array.isArray(price)) {
    if (price.sale !== undefined && price.sale !== null && price.sale !== '') {
      return toUsd(price.sale) || 'N/A'
    }
    if (price.rent?.amount !== undefined && price.rent?.amount !== null && price.rent?.amount !== '') {
      const rentAmount = toUsd(price.rent.amount)
      return rentAmount ? `${rentAmount}/${price.rent.period || 'monthly'}` : 'N/A'
    }
    return 'N/A'
  }
  if (typeof price === 'number') return toUsd(price) || 'N/A'
  if (typeof price === 'string' && price.trim() !== '') {
    const n = Number(price)
    return Number.isFinite(n) ? (toUsd(n) || 'N/A') : price
  }
  return 'N/A'
}

export default function AdminInquiriesPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog()
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
  const [initialLoading, setInitialLoading] = useState(true)
  const [filters, setFilters] = useState({
    property: '',
    assignedAgent: '',
    agency: '',
    status: '',
    priority: '',
    source: '',
    search: '',
    startDate: '',
    endDate: '',
    minPrice: '',
    maxPrice: ''
  })
  const [showPricePicker, setShowPricePicker] = useState(false)
  const [dropdowns, setDropdowns] = useState({ leadPriorities: [], leadStatuses: [] })

  useEffect(() => {
    getDropdownOptions()
      .then((dd) => setDropdowns({ leadPriorities: dd.leadPriorities || [], leadStatuses: dd.leadStatuses || [] }))
      .catch(() => setDropdowns({ leadPriorities: [], leadStatuses: [] }))
  }, [])

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
      if (inquiry.priority === 'Hot') statsData.hot++
      if (inquiry.priority === 'Warm') statsData.warm++
      if (inquiry.priority === 'Cold') statsData.cold++

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
        if (!value || value === '') return
        if (key === 'assignedAgent' && value === '__unassigned__') return
        if (key === 'assignedAgent') {
          params.append('owner', value)
          return
        }
        params.append(key, value)
      })

      const response = await api.get(`/leads?${params}`)
      let fetchedInquiries = response.data.leads || []
      if (filters.assignedAgent === '__unassigned__') {
        fetchedInquiries = fetchedInquiries.filter((inquiry) => !(inquiry.assignedAgent?._id || inquiry.assignedAgent))
      }

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
      setInitialLoading(false)
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
      fetchProperties()
      fetchAgents()
      fetchAgencies()
    }
  }, [user, authLoading, fetchProperties, fetchAgents, fetchAgencies])

  useEffect(() => {
    if (!authLoading && user) {
      fetchInquiries()
    }
  }, [user, authLoading, fetchInquiries])

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
    try {
      setAssigningAgent(leadId)
      const response = await api.put(`/leads/${leadId}/assign`, {
        assignedAgent: agentId || null
      })

      const updatedLead = response.data.lead
      const assignedAgentData = updatedLead?.assignedAgent ?? null

      setInquiries(prev => prev.map(inquiry =>
        inquiry._id === leadId ? { ...inquiry, assignedAgent: assignedAgentData } : inquiry
      ))
      setAllInquiries(prev => prev.map(inquiry =>
        inquiry._id === leadId ? { ...inquiry, assignedAgent: assignedAgentData } : inquiry
      ))

      toast.success(agentId ? 'Agent assigned successfully' : 'Agent removed')

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
    const ok = await confirm({
      title: 'Delete Inquiry',
      message: 'Are you sure you want to delete this inquiry? This action cannot be undone.',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) {
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
      Hot: 'bg-red-100 text-red-800',
      Warm: 'bg-orange-100 text-orange-800',
      Cold: 'bg-blue-100 text-blue-800',
      Not_interested: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityStyles[priority] || 'bg-gray-100 text-gray-800'}`}>
        {priority?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
      </span>
    )
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

  if (initialLoading && loading && inquiries.length === 0) {
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

        {/* Stats + filters + table share tighter vertical rhythm */}
        <div className="space-y-4">
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

        {/* Filters — left-aligned with stats + table */}
        <div className="flex w-full flex-wrap items-center gap-3">
            {/* Date Range Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`inline-flex items-center px-4 h-[42px] border rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 ${filters.startDate || filters.endDate
                  ? 'border-primary-500 text-gray-900 list-filter-active'
                  : 'border-gray-300 text-gray-700'
                  }`}
              >
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span className="truncate max-w-[200px]">
                  {filters.startDate && filters.endDate
                    ? `${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                    : filters.startDate
                      ? `From ${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                      : filters.endDate
                        ? `Until ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                        : 'Date Range'}
                </span>
                {filters.startDate || filters.endDate ? (
                  <X
                    className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
                      setCurrentPage(1)
                    }}
                  />
                ) : <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />}
              </button>
              {showDatePicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDatePicker(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-[min(420px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden">
                    <div className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-2">From Date</label>
                            <input
                              type="date"
                              value={filters.startDate}
                              max={new Date().toISOString().split('T')[0]}
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
                              max={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
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
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                          >
                            Apply
                          </button>
                        </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Agency Filter - hidden for agent (they only see their own inquiries) */}
            {!isAgent && (
              <SearchableSelect
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
                options={[
                  { value: '', label: 'All Agencies' },
                  { value: 'unassigned', label: 'Unassigned' },
                  ...(agencies || []).map((a) => ({ value: a._id, label: a.name }))
                ]}
                placeholder="All Agencies"
                buttonClassName="px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium bg-white min-w-[200px]"
                searchPlaceholder="Search agency..."
              />
            )}

            {/* Agent Filter - hidden for agent */}
            {!isAgent && (
              <SearchableSelect
                value={filters.assignedAgent}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, assignedAgent: e.target.value }))
                  setCurrentPage(1)
                }}
                options={[
                  { value: '', label: 'All Agents' },
                  { value: '__unassigned__', label: 'No agent' },
                  ...(agents || [])
                    .filter(agent => {
                      // If agency filter is selected, show only agents from that agency
                      if (!filters.agency) return true
                      const agentAgencyId = agent.agency?._id || agent.agency
                      const agencyIdStr = typeof agentAgencyId === 'object' ? agentAgencyId?.toString() : agentAgencyId
                      return agencyIdStr === filters.agency || agencyIdStr === filters.agency.toString()
                    })
                    .map((a) => ({ value: a._id, label: `${a.firstName} ${a.lastName}`.trim() }))
                ]}
                placeholder="All Agents"
                buttonClassName="px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium bg-white min-w-[200px]"
                searchPlaceholder="Search agent..."
              />
            )}

            {/* Property Filter */}
            <SearchableSelect
              value={filters.property}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, property: e.target.value }))
                setCurrentPage(1)
              }}
              options={[
                { value: '', label: 'All Properties' },
                ...(properties || []).map((p) => ({
                  value: p._id,
                  label: p.title || p.name || `Property ${p._id?.slice(-6) || ''}`
                }))
              ]}
              placeholder="All Properties"
              buttonClassName="px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium bg-white min-w-[220px]"
              searchPlaceholder="Search property..."
            />

            {/* Status Filter */}
            <SearchableSelect
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }))
                setCurrentPage(1)
              }}
              options={[{ value: '', label: 'All Status' }, ...(dropdowns.leadStatuses || [])]}
              placeholder="All Status"
              searchable={false}
              buttonClassName="px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium bg-white min-w-[200px]"
            />

            {/* Priority Filter */}
            <SearchableSelect
              value={filters.priority}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, priority: e.target.value }))
                setCurrentPage(1)
              }}
              options={[{ value: '', label: 'All Priority' }, ...(dropdowns.leadPriorities || [])]}
              placeholder="All Priority"
              buttonClassName="px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium bg-white min-w-[200px]"
              searchPlaceholder="Search priority..."
            />
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
            <table className="w-full table-fixed divide-y divide-gray-200">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[22%]" />
                <col className="w-32" />
                <col className="w-44" />
                <col className="w-32" />
                <col className="w-24" />
                <col className="w-28" />
              </colgroup>
              <thead className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Assigned Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inquiries.map((inquiry) => (
                  <tr key={inquiry._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 min-w-0">
                      <button
                        type="button"
                        onClick={() => checkEntryPermission(inquiry, user, 'view', canViewInquiries) && handleViewDetails(inquiry._id)}
                        className="text-left w-full focus:outline-none"
                        title="View details"
                      >
                        <div className="text-sm font-medium text-gray-900 hover:text-primary-700 truncate">
                          {`${inquiry.contact?.firstName || ''} ${inquiry.contact?.lastName || ''}`.trim() || 'Inquiry'}
                        </div>
                        {inquiry.property?.title && (
                          <div className="text-xs text-gray-500 truncate">
                            {inquiry.property.title}
                          </div>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate" title={inquiry.contact?.email || ''}>
                      {inquiry.contact?.email || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate" title={inquiry.contact?.phone || ''}>
                      {inquiry.contact?.phone || '—'}
                    </td>
                    <td className="px-4 py-4 min-w-0">
                      {(user?.role === 'super_admin' || user?.role === 'agency_admin') && inquiry.agency ? (
                        <div className="relative">
                          <SearchableSelect
                            value={inquiry.assignedAgent?._id || inquiry.assignedAgent || ""}
                            onChange={async (e) => {
                              await handleAssignAgent(inquiry._id, e.target.value || null)
                            }}
                            disabled={assigningAgent === inquiry._id}
                            buttonClassName="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            onFocus={async () => {
                              const agencyId = inquiry.agency?._id || inquiry.agency
                              if (agencyId && !agencyAgents[agencyId]) {
                                await fetchAgentsByAgency(agencyId)
                              }
                            }}
                            options={(() => {
                              const opts = [{ value: '', label: 'No agent' }]
                              if (inquiry.assignedAgent && (inquiry.assignedAgent._id || inquiry.assignedAgent)) {
                                opts.push({
                                  value: inquiry.assignedAgent._id || inquiry.assignedAgent,
                                  label: inquiry.assignedAgent.firstName
                                    ? `${inquiry.assignedAgent.firstName} ${inquiry.assignedAgent.lastName}`.trim()
                                    : 'Assigned Agent'
                                })
                              }
                              const agencyId = inquiry.agency?._id || inquiry.agency
                              const availableAgents = agencyAgents[agencyId]
                              if (!availableAgents) return opts
                              const currentAgentId = inquiry.assignedAgent?._id || inquiry.assignedAgent
                              availableAgents
                                .filter(agent => agent._id !== currentAgentId)
                                .forEach((a) => opts.push({ value: a._id, label: `${a.firstName} ${a.lastName}`.trim() }))
                              return opts
                            })()}
                            placeholder="Assign Agent..."
                            searchPlaceholder="Search agent..."
                          />
                          {assigningAgent === inquiry._id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900 truncate">
                          {inquiry.assignedAgent?.firstName
                            ? `${inquiry.assignedAgent.firstName} ${inquiry.assignedAgent.lastName || ''}`.trim()
                            : 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {canEditInquiry ? (
                        <SearchableSelect
                          value={inquiry.status || 'new'}
                          onChange={(e) => handleUpdateStatus(inquiry._id, e.target.value)}
                          buttonClassName={`text-xs font-medium px-2 py-1 rounded-full border border-gray-300 focus:ring-primary-500 focus:border-primary-500 bg-white w-full
                            ${inquiry.status === 'new' ? 'text-blue-800 bg-blue-50' :
                              inquiry.status === 'contacted' ? 'text-yellow-800 bg-yellow-50' :
                                inquiry.status === 'qualified' ? 'text-purple-800 bg-purple-50' :
                                  inquiry.status === 'booked' ? 'text-green-800 bg-green-50' :
                                    inquiry.status === 'lost' ? 'text-red-800 bg-red-50' :
                                      'text-gray-800 bg-gray-50'}`}
                          options={dropdowns.leadStatuses || []}
                          placeholder="Status"
                          searchable={false}
                        />
                      ) : (
                        getStatusBadge(inquiry.status)
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {getPriorityBadge(inquiry.priority)}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        {checkEntryPermission(inquiry, user, 'view', canViewInquiries) && (
                          <Link
                            href={`/admin/inquiries/${inquiry._id}`}
                            className="text-gray-600 hover:text-primary-600 transition-colors"
                            title="Open details page"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
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
        </div>

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
                    {selectedInquiry.contact?.address && getAddressLabeledRows(selectedInquiry.contact.address).length > 0 && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500 mb-2">Address</p>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          {getAddressLabeledRows(selectedInquiry.contact.address).map(({ label, value }) => (
                            <div key={label} className="min-w-0">
                              <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
                              <dd className="font-medium text-gray-900 leading-snug whitespace-pre-line break-words">{value}</dd>
                            </div>
                          ))}
                        </dl>
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
                      <div>
                        <p className="text-sm text-gray-500">Price</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatInquiryPropertyPrice(selectedInquiry.property.price)}
                        </p>
                      </div>
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
                  href={`/admin/inquiries/${selectedInquiry._id}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Open page
                </Link>
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
      <ConfirmDialog />
    </DashboardLayout>
  )
}
