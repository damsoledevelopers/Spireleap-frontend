'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Search, Filter, Phone, Mail, MapPin, Calendar, User, Plus, Edit, Eye, Trash2, Upload, X, Users, UserCheck, TrendingUp, CheckCircle, UserX, AlertCircle, ArrowUp, FileText, Printer, RefreshCw, ChevronUp, ChevronDown, MoreHorizontal, Clock, Package, BarChart3, Bell, Target, Zap, Shield, Activity } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Cookies from 'js-cookie'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export default function AdminLeadsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Role-based access control
  useEffect(() => {
    if (!authLoading && user) {
      const allowedRoles = ['super_admin', 'agency_admin', 'agent', 'staff']
      if (!allowedRoles.includes(user.role)) {
        router.push('/auth/login')
      }
    }
  }, [user, authLoading, router])

  // Role-based feature visibility
  const isSuperAdmin = user?.role === 'super_admin'
  const isAgencyAdmin = user?.role === 'agency_admin'
  const isAgent = user?.role === 'agent'
  const isStaff = user?.role === 'staff'
  const canUploadLeads = isSuperAdmin || isAgencyAdmin
  const canBulkActions = isSuperAdmin || isAgencyAdmin
  const canAutoAssign = isSuperAdmin || isAgencyAdmin
  const canEditLead = isSuperAdmin || isAgent
  const [leads, setLeads] = useState([])
  const [allLeads, setAllLeads] = useState([]) // For Kanban view
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'kanban'
  const [filters, setFilters] = useState({
    owner: '',
    source: '',
    status: '',
    search: '',
    startDate: '',
    endDate: '',
    campaign: '',
    agency: '',
    property: '',
    reportingManager: '',
    team: '',
    priority: ''
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadedData, setUploadedData] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState([])
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [sortColumn, setSortColumn] = useState('companyName')
  const [sortDirection, setSortDirection] = useState('asc')
  const [owners, setOwners] = useState([])
  const [allAgents, setAllAgents] = useState([]) // Store all agents for per-lead filtering
  const [sources, setSources] = useState([])
  const [agencies, setAgencies] = useState([])
  const [properties, setProperties] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const isUploadingRef = useRef(false)
  const [selectedLeads, setSelectedLeads] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkAction, setBulkAction] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkAgent, setBulkAgent] = useState('')
  const [bulkAgency, setBulkAgency] = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [dashboardMetrics, setDashboardMetrics] = useState(null)
  const [missedFollowUps, setMissedFollowUps] = useState(0)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false)
  const [autoAssignMethod, setAutoAssignMethod] = useState('round_robin')
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [reportingManagers, setReportingManagers] = useState([])
  const [teams, setTeams] = useState([])
  const [rescoring, setRescoring] = useState(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null)

  useEffect(() => {
    if (isUploadingRef.current) {
      return
    }
    const token = Cookies.get('token')

    if (!authLoading && user) {
      if (!token) {
        console.warn('User is logged in but no token cookie found. Please log in again.')
        toast.error('Session expired. Please log in again.')
      } else {
        fetchLeads()
        fetchDashboardMetrics()
        fetchMissedFollowUps()
        if (owners.length === 0) {
          fetchOwners()
        }
        if (agencies.length === 0) {
          fetchAgencies()
        }
        if (properties.length === 0) {
          fetchProperties()
        }
        if (campaigns.length === 0) {
          fetchCampaigns()
        }
        fetchReportingManagers()
        fetchTeams()
      }
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [filters.startDate, filters.endDate, filters.owner, filters.source, filters.status, filters.campaign, filters.agency, filters.property, filters.reportingManager, filters.team, filters.priority, pagination.page, pagination.limit, user, authLoading, viewMode])


  // Refetch owners when agency filter changes to show only agents from selected agency
  useEffect(() => {
    if (!authLoading && user) {
      fetchOwners()
    }
  }, [filters.agency])

  // Cleanup search debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
      }
    }
  }, [searchDebounceTimer])


  useEffect(() => {
    setShowBulkActions(selectedLeads.length > 0)
  }, [selectedLeads])

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

  if (!user || !['super_admin', 'agency_admin', 'agent', 'staff'].includes(user.role)) {
    return null // Router will handle redirect
  }

  const fetchLeads = async () => {
    try {
      setLoading(true)
      // Exclude date filters from the initial spread to avoid duplication
      const { startDate, endDate, ...otherFilters } = filters
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(otherFilters).filter(([_, v]) => v && v !== ''))
      })

      // Add date filters separately if provided
      if (startDate) {
        params.append('startDate', startDate)
      }
      if (endDate) {
        params.append('endDate', endDate)
      }

      const response = await api.get(`/leads?${params}`)
      const fetchedLeads = response.data.leads || []
      setLeads(fetchedLeads)
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 })

      // For Kanban view, fetch all leads without pagination (with all filters)
      if (viewMode === 'kanban') {
        try {
          const kanbanParams = new URLSearchParams({ limit: '10000' })
          // Use the destructured date variables
          if (startDate) {
            kanbanParams.append('startDate', startDate)
          }
          if (endDate) {
            kanbanParams.append('endDate', endDate)
          }
          // Add all other filters
          if (otherFilters.status) {
            kanbanParams.append('status', otherFilters.status)
          }
          if (otherFilters.owner) {
            kanbanParams.append('owner', otherFilters.owner)
          }
          if (otherFilters.source) {
            kanbanParams.append('source', otherFilters.source)
          }
          if (otherFilters.agency) {
            kanbanParams.append('agency', otherFilters.agency)
          }
          if (otherFilters.property) {
            kanbanParams.append('property', otherFilters.property)
          }
          if (otherFilters.campaign) {
            kanbanParams.append('campaign', otherFilters.campaign)
          }
          if (otherFilters.priority) {
            kanbanParams.append('priority', otherFilters.priority)
          }
          if (otherFilters.reportingManager) {
            kanbanParams.append('reportingManager', otherFilters.reportingManager)
          }
          if (otherFilters.team) {
            kanbanParams.append('team', otherFilters.team)
          }
          if (otherFilters.search) {
            kanbanParams.append('search', otherFilters.search)
          }
          const allResponse = await api.get(`/leads?${kanbanParams}`)
          setAllLeads(allResponse.data.leads || [])
        } catch (error) {
          console.error('Error fetching all leads for Kanban:', error)
          setAllLeads([])
        }
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load leads'

      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.')
      } else {
        toast.error(errorMessage)
      }

      setLeads([])
      setAllLeads([])
      setPagination({ page: 1, limit: 10, total: 0, pages: 0 })
    } finally {
      setLoading(false)
    }
  }

  const fetchOwners = async () => {
    try {
      // Role-based filtering for agents/owners
      let agents = []

      // If agency filter is selected, fetch only agents from that agency
      if (filters.agency && user?.role === 'super_admin') {
        // Super admin can filter by agency
        const response = await api.get(`/users?role=agent&agency=${filters.agency}&limit=100`)
        agents = response.data.users || []
      } else if (user?.role === 'super_admin') {
        // Super admin can see all agents when no agency filter
        const response = await api.get('/users?role=agent&limit=100')
        agents = response.data.users || []
      } else if (user?.role === 'agency_admin') {
        // Agency admin can see agents from their agency (backend handles this)
        const response = await api.get('/users?role=agent&limit=100')
        agents = response.data.users || []
      } else if (user?.role === 'agent') {
        // Agent can only see themselves
        agents = [user]
      } else {
        const response = await api.get('/users?role=agent&limit=100')
        agents = response.data.users || []
      }

      setOwners(agents)

      // Also fetch all agents for per-lead filtering in table (for super_admin only)
      if (user?.role === 'super_admin') {
        try {
          const allResponse = await api.get('/users?role=agent&limit=1000')
          setAllAgents(allResponse.data.users || [])
        } catch (error) {
          console.error('Error fetching all agents:', error)
          setAllAgents(agents) // Fallback to filtered agents
        }
      } else {
        // For other roles, use the filtered agents
        setAllAgents(agents)
      }

      // Extract unique sources from leads (role-based)
      const responseLeads = await api.get('/leads?limit=500')
      const allLeadsData = responseLeads.data.leads || []
      const uniqueSources = [...new Set(allLeadsData.map(lead => lead.source).filter(Boolean))]
      setSources(uniqueSources)
    } catch (error) {
      console.error('Error fetching owners:', error)
    }
  }

  const fetchAgencies = async () => {
    try {
      // Role-based filtering for agencies
      if (user?.role === 'super_admin') {
        // Super admin can see all agencies
        const response = await api.get('/agencies')
        setAgencies(response.data.agencies || [])
      } else if (user?.role === 'agency_admin') {
        // Agency admin can only see their own agency
        if (user.agency) {
          const response = await api.get(`/agencies/${user.agency}`)
          setAgencies(response.data.agency ? [response.data.agency] : [])
        }
      } else if (user?.role === 'agent') {
        // Agent can only see their agency
        if (user.agency) {
          const response = await api.get(`/agencies/${user.agency}`)
          setAgencies(response.data.agency ? [response.data.agency] : [])
        }
      } else {
        const response = await api.get('/agencies')
        setAgencies(response.data.agencies || [])
      }
    } catch (error) {
      console.error('Error fetching agencies:', error)
      setAgencies([])
    }
  }

  const fetchProperties = async () => {
    try {
      // Role-based filtering for properties
      // Properties API already handles role-based filtering on backend
      const response = await api.get('/properties?limit=100')
      setProperties(response.data.properties || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
      setProperties([])
    }
  }

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/leads?limit=500')
      const allLeadsData = response.data.leads || []
      const uniqueCampaigns = [...new Set(allLeadsData.map(lead => lead.campaignName).filter(Boolean))]
      setCampaigns(uniqueCampaigns)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    }
  }

  const fetchDashboardMetrics = async () => {
    try {
      setLoadingMetrics(true)
      const response = await api.get('/leads/analytics/dashboard-metrics')
      setDashboardMetrics(response.data.metrics || null)
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
    } finally {
      setLoadingMetrics(false)
    }
  }

  const fetchMissedFollowUps = async () => {
    try {
      const now = new Date()
      const response = await api.get('/leads?limit=500')
      const allLeads = response.data.leads || []

      // Count leads with follow-up dates in the past
      const missed = allLeads.filter(lead => {
        if (!lead.followUpDate) return false
        const followUpDate = new Date(lead.followUpDate)
        const isPastDue = followUpDate < now
        const isActive = ['new', 'contacted', 'qualified', 'site_visit_scheduled', 'site_visit_completed', 'negotiation'].includes(lead.status)
        return isPastDue && isActive
      }).length

      setMissedFollowUps(missed)
    } catch (error) {
      console.error('Error fetching missed follow-ups:', error)
    }
  }

  const fetchReportingManagers = async () => {
    try {
      // Role-based filtering for reporting managers
      if (user?.role === 'super_admin') {
        // Super admin can see all managers
        const response = await api.get('/users?role=agency_admin')
        const managers = response.data.users || []
        setReportingManagers(managers)
      } else if (user?.role === 'agency_admin') {
        // Agency admin can see themselves and managers from their agency
        if (user.agency) {
          const response = await api.get(`/users?role=agency_admin&agency=${user.agency}`)
          const managers = response.data.users || []
          setReportingManagers(managers)
        }
      } else {
        const response = await api.get('/users?role=agency_admin')
        const managers = response.data.users || []
        setReportingManagers(managers)
      }
    } catch (error) {
      console.error('Error fetching reporting managers:', error)
      setReportingManagers([])
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await api.get('/users?role=agent')
      const agents = response.data.users || []
      const uniqueTeams = [...new Set(agents.map(a => a.team).filter(Boolean))]
      setTeams(uniqueTeams)
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const clearAllFilters = () => {
    setFilters({
      owner: '',
      source: '',
      status: '',
      search: '',
      startDate: '',
      endDate: '',
      campaign: '',
      agency: '',
      property: '',
      reportingManager: '',
      team: '',
      priority: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
    toast.success('All filters cleared')
  }

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== '' && value !== null)
  }

  const handleAutoAssign = async (leadId, method) => {
    try {
      // Get lead data first
      const leadResponse = await api.get(`/leads/${leadId}`)
      const lead = leadResponse.data.lead

      if (!lead) {
        return { success: false, leadId, error: 'Lead not found' }
      }

      const agencyId = lead.agency?._id || lead.agency || lead.agency?._id?.toString() || lead.agency?.toString()

      if (!agencyId) {
        return { success: false, leadId, error: 'Lead does not have an agency assigned' }
      }

      const response = await api.post(`/leads/${leadId}/auto-assign`, {
        assignmentMethod: method,
        agencyId: agencyId
      })

      return { success: true, leadId, data: response.data }
    } catch (error) {
      console.error(`Error auto-assigning lead ${leadId}:`, error)
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || error.message || 'Failed to auto-assign lead'
      return { success: false, leadId, error: errorMessage }
    }
  }

  const handleBulkAutoAssign = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to assign')
      return
    }

    try {
      setAutoAssigning(true)
      const results = await Promise.all(selectedLeads.map(leadId => handleAutoAssign(leadId, autoAssignMethod)))
      const successCount = results.filter(r => r.success).length
      const failedResults = results.filter(r => !r.success)

      if (successCount === selectedLeads.length) {
        toast.success(`${selectedLeads.length} lead(s) auto-assigned successfully`)
      } else {
        const errorMessages = failedResults.map(r => r.error).filter(Boolean)
        const uniqueErrors = [...new Set(errorMessages)]
        toast.warning(`${successCount} of ${selectedLeads.length} lead(s) auto-assigned. ${failedResults.length} failed.${uniqueErrors.length > 0 ? ' Error: ' + uniqueErrors[0] : ''}`)
      }

      setSelectedLeads([])
      setShowAutoAssignModal(false)
      fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error bulk auto-assigning:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to auto-assign leads')
    } finally {
      setAutoAssigning(false)
    }
  }

  const handleReScoreLead = async (leadId) => {
    try {
      setRescoring(leadId)
      await api.post(`/leads/${leadId}/re-score`)
      toast.success('Lead re-scored successfully')
      fetchLeads()
    } catch (error) {
      console.error('Error re-scoring lead:', error)
      toast.error('Failed to re-score lead')
    } finally {
      setRescoring(null)
    }
  }

  const getLeadId = (lead) => {
    if (!lead) return ''
    if (typeof lead._id === 'string') return lead._id
    if (lead._id?.toString) return lead._id.toString()
    if (lead._id?.$oid) return lead._id.$oid
    return String(lead._id || lead.id || '')
  }

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.put(`/leads/${leadId}`, { status: newStatus })
      toast.success('Lead status updated')
      fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error('Failed to update lead status')
    }
  }

  const handlePriorityChange = async (leadId, newPriority) => {
    try {
      await api.put(`/leads/${leadId}`, { priority: newPriority })
      toast.success('Lead priority updated')
      fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error updating lead priority:', error)
      toast.error('Failed to update lead priority')
    }
  }

  const handleQuickAssign = async (leadId, agentId) => {
    // Check if the value actually changed to avoid unnecessary updates
    const currentLead = leads.find(lead => String(getLeadId(lead)) === String(leadId))
    const currentAgentId = currentLead?.assignedAgent?._id ? String(currentLead.assignedAgent._id) : (currentLead?.assignedAgent ? String(currentLead.assignedAgent) : null)
    const newAgentId = agentId ? String(agentId) : null

    if (currentAgentId === newAgentId) {
      // Value hasn't changed, skip update
      return
    }

    // Store previous state references for rollback
    let previousLeadsState = null
    let previousAllLeadsState = null

    // Optimistic update - update UI immediately
    const assignedAgent = agentId ? owners.find(o => String(o._id) === String(agentId)) : null
    setLeads(prevLeads => {
      previousLeadsState = prevLeads
      return prevLeads.map(lead => {
        const id = getLeadId(lead)
        if (String(id) === String(leadId)) {
          return {
            ...lead,
            assignedAgent: assignedAgent ? {
              _id: assignedAgent._id,
              firstName: assignedAgent.firstName,
              lastName: assignedAgent.lastName
            } : null
          }
        }
        return lead
      })
    })

    // Also update allLeads for Kanban view
    setAllLeads(prevLeads => {
      previousAllLeadsState = prevLeads
      return prevLeads.map(lead => {
        const id = getLeadId(lead)
        if (String(id) === String(leadId)) {
          return {
            ...lead,
            assignedAgent: assignedAgent ? {
              _id: assignedAgent._id,
              firstName: assignedAgent.firstName,
              lastName: assignedAgent.lastName
            } : null
          }
        }
        return lead
      })
    })

    try {
      const response = await api.put(`/leads/${leadId}/assign`, { assignedAgent: agentId })

      // Update with server response only if it's different
      if (response.data?.lead) {
        const serverAgent = response.data.lead.assignedAgent
        setLeads(prevLeads =>
          prevLeads.map(lead => {
            const id = getLeadId(lead)
            if (String(id) === String(leadId)) {
              const currentAgent = lead.assignedAgent?._id ? String(lead.assignedAgent._id) : (lead.assignedAgent ? String(lead.assignedAgent) : null)
              const serverAgentId = serverAgent?._id ? String(serverAgent._id) : (serverAgent ? String(serverAgent) : null)
              if (currentAgent !== serverAgentId) {
                return { ...lead, assignedAgent: serverAgent }
              }
            }
            return lead
          })
        )
        setAllLeads(prevLeads =>
          prevLeads.map(lead => {
            const id = getLeadId(lead)
            if (String(id) === String(leadId)) {
              const currentAgent = lead.assignedAgent?._id ? String(lead.assignedAgent._id) : (lead.assignedAgent ? String(lead.assignedAgent) : null)
              const serverAgentId = serverAgent?._id ? String(serverAgent._id) : (serverAgent ? String(serverAgent) : null)
              if (currentAgent !== serverAgentId) {
                return { ...lead, assignedAgent: serverAgent }
              }
            }
            return lead
          })
        )
      }

      toast.success('Lead assigned successfully')
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      // Rollback on error
      if (previousLeadsState) {
        setLeads(previousLeadsState)
      }
      if (previousAllLeadsState) {
        setAllLeads(previousAllLeadsState)
      }
      console.error('Error assigning lead:', error)
      toast.error('Failed to assign lead')
    }
  }

  const handleQuickAgencyChange = async (leadId, agencyId) => {
    // Check if the value actually changed to avoid unnecessary updates
    const currentLead = leads.find(lead => String(getLeadId(lead)) === String(leadId))
    const currentAgencyId = currentLead?.agency?._id ? String(currentLead.agency._id) : (currentLead?.agency ? String(currentLead.agency) : null)
    const newAgencyId = agencyId ? String(agencyId) : null

    if (currentAgencyId === newAgencyId) {
      // Value hasn't changed, skip update
      return
    }

    // Store previous state references for rollback
    let previousLeadsState = null
    let previousAllLeadsState = null

    // Optimistic update - update UI immediately
    const selectedAgency = agencyId ? agencies.find(a => String(a._id) === String(agencyId)) : null
    setLeads(prevLeads => {
      previousLeadsState = prevLeads
      return prevLeads.map(lead => {
        const id = getLeadId(lead)
        if (String(id) === String(leadId)) {
          return {
            ...lead,
            agency: selectedAgency ? { _id: selectedAgency._id, name: selectedAgency.name } : null
          }
        }
        return lead
      })
    })

    // Also update allLeads for Kanban view
    setAllLeads(prevLeads => {
      previousAllLeadsState = prevLeads
      return prevLeads.map(lead => {
        const id = getLeadId(lead)
        if (String(id) === String(leadId)) {
          return {
            ...lead,
            agency: selectedAgency ? { _id: selectedAgency._id, name: selectedAgency.name } : null
          }
        }
        return lead
      })
    })

    try {
      const response = await api.put(`/leads/${leadId}`, { agency: agencyId || null })

      // Update with server response only if it's different
      if (response.data?.lead) {
        const serverAgency = response.data.lead.agency
        setLeads(prevLeads =>
          prevLeads.map(lead => {
            const id = getLeadId(lead)
            if (String(id) === String(leadId)) {
              const currentAgency = lead.agency?._id ? String(lead.agency._id) : (lead.agency ? String(lead.agency) : null)
              const serverAgencyId = serverAgency?._id ? String(serverAgency._id) : (serverAgency ? String(serverAgency) : null)
              if (currentAgency !== serverAgencyId) {
                return { ...lead, agency: serverAgency }
              }
            }
            return lead
          })
        )
        setAllLeads(prevLeads =>
          prevLeads.map(lead => {
            const id = getLeadId(lead)
            if (String(id) === String(leadId)) {
              const currentAgency = lead.agency?._id ? String(lead.agency._id) : (lead.agency ? String(lead.agency) : null)
              const serverAgencyId = serverAgency?._id ? String(serverAgency._id) : (serverAgency ? String(serverAgency) : null)
              if (currentAgency !== serverAgencyId) {
                return { ...lead, agency: serverAgency }
              }
            }
            return lead
          })
        )
      }

      toast.success('Lead agency updated successfully')
      fetchDashboardMetrics()
    } catch (error) {
      // Rollback on error
      if (previousLeadsState) {
        setLeads(previousLeadsState)
      }
      if (previousAllLeadsState) {
        setAllLeads(previousAllLeadsState)
      }
      console.error('Error updating lead agency:', error)
      toast.error('Failed to update lead agency')
    }
  }

  const handleQuickPriorityChange = async (leadId, priority) => {
    // Send empty string as null for proper backend handling
    const priorityValue = priority === '' ? null : priority

    // Check if the value actually changed to avoid unnecessary updates
    const currentLead = leads.find(lead => String(getLeadId(lead)) === String(leadId))
    const currentPriority = currentLead?.priority || null
    const normalizedCurrentPriority = currentPriority ? String(currentPriority).toLowerCase() : null
    const normalizedNewPriority = priorityValue ? String(priorityValue).toLowerCase() : null

    if (normalizedCurrentPriority === normalizedNewPriority) {
      // Value hasn't changed, skip update
      return
    }

    // Store previous state references for rollback
    let previousLeadsState = null
    let previousAllLeadsState = null

    // Optimistic update - update UI immediately using functional updates
    setLeads(prevLeads => {
      previousLeadsState = prevLeads // Store reference before mutation
      return prevLeads.map(lead => {
        const id = getLeadId(lead)
        if (String(id) === String(leadId)) {
          return { ...lead, priority: priorityValue }
        }
        return lead
      })
    })

    // Also update allLeads for Kanban view
    setAllLeads(prevLeads => {
      previousAllLeadsState = prevLeads // Store reference before mutation
      return prevLeads.map(lead => {
        const id = getLeadId(lead)
        if (String(id) === String(leadId)) {
          return { ...lead, priority: priorityValue }
        }
        return lead
      })
    })

    try {
      const response = await api.put(`/leads/${leadId}`, { priority: priorityValue })

      // Always update with server response to ensure consistency
      if (response.data?.lead) {
        const serverPriority = response.data.lead.priority
        console.log('Server response priority:', serverPriority, 'for leadId:', leadId)

        setLeads(prevLeads =>
          prevLeads.map(lead => {
            const id = getLeadId(lead)
            if (String(id) === String(leadId)) {
              console.log('Updating lead priority from', lead.priority, 'to', serverPriority)
              return { ...lead, priority: serverPriority }
            }
            return lead
          })
        )
        setAllLeads(prevLeads =>
          prevLeads.map(lead => {
            const id = getLeadId(lead)
            if (String(id) === String(leadId)) {
              return { ...lead, priority: serverPriority }
            }
            return lead
          })
        )
      } else {
        // If no lead in response, ensure optimistic update is maintained
        console.log('No lead in server response, keeping optimistic update')
      }

      toast.success('Lead priority updated successfully')
    } catch (error) {
      // Rollback on error - restore previous state
      if (previousLeadsState) {
        setLeads(previousLeadsState)
      }
      if (previousAllLeadsState) {
        setAllLeads(previousAllLeadsState)
      }
      console.error('Error updating lead priority:', error)
      toast.error('Failed to update lead priority')
    }
  }

  const handleQuickStatusChange = async (leadId, status) => {
    const statusValue = status || null

    // Check if the value actually changed to avoid unnecessary updates
    const currentLead = leads.find(lead => String(getLeadId(lead)) === String(leadId))
    const currentStatus = currentLead?.status || null
    const normalizedCurrentStatus = currentStatus ? String(currentStatus).toLowerCase() : null
    const normalizedNewStatus = statusValue ? String(statusValue).toLowerCase() : null

    if (normalizedCurrentStatus === normalizedNewStatus) {
      // Value hasn't changed, skip update
      return
    }

    // Store previous state references for rollback
    let previousLeadsState = null
    let previousAllLeadsState = null

    // Optimistic update - update UI immediately
    setLeads(prevLeads => {
      previousLeadsState = prevLeads
      return prevLeads.map(lead => {
        const id = getLeadId(lead)
        if (String(id) === String(leadId)) {
          return { ...lead, status: statusValue }
        }
        return lead
      })
    })

    // Also update allLeads for Kanban view
    setAllLeads(prevLeads => {
      previousAllLeadsState = prevLeads
      return prevLeads.map(lead => {
        const id = getLeadId(lead)
        if (String(id) === String(leadId)) {
          return { ...lead, status: statusValue }
        }
        return lead
      })
    })

    try {
      const response = await api.put(`/leads/${leadId}`, { status: statusValue })

      // Update with server response only if it's different
      if (response.data?.lead) {
        const serverStatus = response.data.lead.status
        const normalizedServerStatus = serverStatus ? String(serverStatus).toLowerCase() : null

        // Only update if server value is different from optimistic update
        if (normalizedServerStatus !== normalizedNewStatus) {
          setLeads(prevLeads =>
            prevLeads.map(lead => {
              const id = getLeadId(lead)
              if (String(id) === String(leadId)) {
                return { ...lead, status: serverStatus }
              }
              return lead
            })
          )
          setAllLeads(prevLeads =>
            prevLeads.map(lead => {
              const id = getLeadId(lead)
              if (String(id) === String(leadId)) {
                return { ...lead, status: serverStatus }
              }
              return lead
            })
          )
        }
      }

      toast.success('Lead status updated successfully')
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      // Rollback on error
      if (previousLeadsState) {
        setLeads(previousLeadsState)
      }
      if (previousAllLeadsState) {
        setAllLeads(previousAllLeadsState)
      }
      console.error('Error updating lead status:', error)
      toast.error('Failed to update lead status')
    }
  }

  const handleDelete = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return
    try {
      await api.delete(`/leads/${leadId}`)
      toast.success('Lead deleted successfully')
      setSelectedLeads(selectedLeads.filter(id => id !== leadId))
      fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Failed to delete lead')
    }
  }

  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === sortedLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(sortedLeads.map(lead => getLeadId(lead)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to delete')
      return
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} lead(s)? This action cannot be undone.`)) return

    try {
      const deletePromises = selectedLeads.map(id => api.delete(`/leads/${id}`))
      await Promise.all(deletePromises)
      toast.success(`${selectedLeads.length} lead(s) deleted successfully`)
      setSelectedLeads([])
      setShowBulkActions(false)
      fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error bulk deleting leads:', error)
      toast.error('Failed to delete some leads')
    }
  }

  const handleBulkUpdateStatus = async () => {
    if (selectedLeads.length === 0 || !bulkStatus) {
      toast.error('Please select leads and a status')
      return
    }

    try {
      const updatePromises = selectedLeads.map(id => api.put(`/leads/${id}`, { status: bulkStatus }))
      await Promise.all(updatePromises)
      toast.success(`${selectedLeads.length} lead(s) status updated successfully`)
      setSelectedLeads([])
      setShowBulkActions(false)
      setBulkStatus('')
      setShowBulkModal(false)
      fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error bulk updating status:', error)
      toast.error('Failed to update some leads')
    }
  }

  const handleBulkAssign = async () => {
    if (selectedLeads.length === 0 || !bulkAgent) {
      toast.error('Please select leads and an agent')
      return
    }

    try {
      const assignPromises = selectedLeads.map(id => api.put(`/leads/${id}/assign`, { assignedAgent: bulkAgent }))
      await Promise.all(assignPromises)
      toast.success(`${selectedLeads.length} lead(s) assigned successfully`)
      setSelectedLeads([])
      setShowBulkActions(false)
      setBulkAgent('')
      setShowBulkModal(false)
      fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error bulk assigning leads:', error)
      toast.error('Failed to assign some leads')
    }
  }

  const handleBulkAssignAgency = async () => {
    if (selectedLeads.length === 0 || !bulkAgency) {
      toast.error('Please select leads and an agency')
      return
    }

    try {
      const assignPromises = selectedLeads.map(id => api.put(`/leads/${id}`, { agency: bulkAgency }))
      await Promise.all(assignPromises)
      toast.success(`${selectedLeads.length} lead(s) agency assigned successfully`)
      setSelectedLeads([])
      setShowBulkActions(false)
      setBulkAgency('')
      setShowBulkModal(false)
      fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error bulk assigning agency:', error)
      toast.error('Failed to assign agency to some leads')
    }
  }


  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      contacted: 'bg-blue-100 text-blue-800 border-blue-200',
      qualified: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      site_visit_scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
      site_visit_completed: 'bg-violet-100 text-violet-800 border-violet-200',
      negotiation: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      booked: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      lost: 'bg-red-100 text-red-800 border-red-200',
      junk: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusBorderColor = (status) => {
    const colors = {
      new: 'border-yellow-400',
      contacted: 'border-blue-400',
      qualified: 'border-cyan-400',
      site_visit_scheduled: 'border-purple-400',
      site_visit_completed: 'border-violet-400',
      negotiation: 'border-indigo-400',
      booked: 'border-green-400',
      closed: 'border-emerald-400',
      lost: 'border-red-400',
      junk: 'border-gray-400'
    }
    return colors[status] || 'border-gray-400'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      hot: 'bg-red-100 text-red-800 border-red-200',
      warm: 'bg-orange-100 text-orange-800 border-orange-200',
      cold: 'bg-blue-100 text-blue-800 border-blue-200',
      not_interested: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[priority?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedLeads = [...leads].sort((a, b) => {
    let aValue, bValue

    switch (sortColumn) {
      case 'contactName':
        aValue = `${a.contact?.firstName || ''} ${a.contact?.lastName || ''}`.trim()
        bValue = `${b.contact?.firstName || ''} ${b.contact?.lastName || ''}`.trim()
        break
      case 'email':
        aValue = a.contact?.email || ''
        bValue = b.contact?.email || ''
        break
      case 'phone':
        aValue = a.contact?.phone || ''
        bValue = b.contact?.phone || ''
        break
      case 'source':
        aValue = a.source || ''
        bValue = b.source || ''
        break
      case 'status':
        aValue = a.status || ''
        bValue = b.status || ''
        break
      case 'createdDate':
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
        break
      case 'updatedAt':
        aValue = new Date(a.updatedAt || a.createdAt)
        bValue = new Date(b.updatedAt || b.createdAt)
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleExportExcel = () => {
    try {
      const getSourceLabel = (source) => {
        const labels = {
          website: 'Website',
          phone: 'Phone',
          email: 'Email',
          walk_in: 'Walk In',
          referral: 'Referral',
          social_media: 'Social Media',
          other: 'Other'
        }
        return labels[source] || source || 'Other'
      }

      const getStatusLabel = (status) => {
        if (!status) return 'New Lead'
        const statusLabels = {
          new: 'New Lead',
          contacted: 'Contacted',
          qualified: 'Qualified',
          site_visit_scheduled: 'Site Visit Scheduled',
          site_visit_completed: 'Site Visit Completed',
          negotiation: 'Negotiation',
          booked: 'Booked',
          lost: 'Lost',
          closed: 'Closed',
          junk: 'Junk / Invalid'
        }
        return statusLabels[status?.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
      }

      const data = sortedLeads.map(lead => ({
        'Lead ID': lead.leadId || `LEAD-${String(lead._id).slice(-6)}`,
        'Contact Name': `${lead.contact?.firstName || ''} ${lead.contact?.lastName || ''}`.trim() || 'N/A',
        'Email': lead.contact?.email || '-',
        'Phone': lead.contact?.phone || '-',
        'Source': getSourceLabel(lead.source),
        'Campaign': lead.campaignName || '-',
        'Assigned Agent': lead.assignedAgent ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}` : 'Unassigned',
        'Priority': lead.priority ? lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1) : 'Warm',
        'Status': getStatusLabel(lead.status),
        'Created Date': new Date(lead.createdAt).toLocaleDateString()
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Leads')
      XLSX.writeFile(wb, `leads_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel file exported successfully')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Failed to export to Excel')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Group leads by status for Kanban view
  const kanbanColumns = [
    { id: 'new', title: 'New', colorClass: 'bg-yellow-400' },
    { id: 'qualified', title: 'Qualified', colorClass: 'bg-blue-400' },
    { id: 'discussion', title: 'Discussion', colorClass: 'bg-teal-400' },
    { id: 'negotiation', title: 'Negotiation', colorClass: 'bg-indigo-400' },
    { id: 'won', title: 'Won', colorClass: 'bg-green-400' }
  ]

  const getLeadsByStatus = (status) => {
    return allLeads.filter(lead => {
      const leadStatus = lead.status?.toLowerCase()
      if (status === 'new') return leadStatus === 'new'
      return leadStatus === status
    })
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop().toLowerCase()
    const validExtensions = ['csv', 'xlsx', 'xls']

    if (!validExtensions.includes(fileExtension)) {
      toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)')
      event.target.value = ''
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size is too large. Please upload a file smaller than 10MB')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        let parsedData = []

        if (fileExtension === 'csv') {
          const csvData = Papa.parse(e.target.result, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
          })
          parsedData = csvData.data
        } else {
          const workbook = XLSX.read(e.target.result, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        }

        if (parsedData.length === 0) {
          toast.error('No data found in the file')
          return
        }

        // Transform data - handle both new format (Contact Name) and old format (First Name, Last Name)
        const transformedData = parsedData.map((row, index) => {
          let firstName = ''
          let lastName = ''

          // Check for "Contact Name" column (new format)
          const contactName = row['Contact Name'] || row['Contact name'] || row['contactName'] || ''
          if (contactName) {
            // Split contact name into first and last name
            const nameParts = contactName.trim().split(/\s+/)
            firstName = nameParts[0] || ''
            lastName = nameParts.slice(1).join(' ') || ''
          } else {
            // Fallback to old format (separate First Name and Last Name columns)
            firstName = row['First Name'] || row['firstName'] || row['First'] || ''
            lastName = row['Last Name'] || row['lastName'] || row['Last'] || ''
          }

          const email = row['Email'] || row['email'] || ''
          const phone = row['Phone'] || row['phone'] || row['Mobile'] || ''

          // Handle source mapping (convert labels back to values)
          let source = (row['Source'] || row['source'] || 'other').toLowerCase()
          const sourceMap = {
            'website': 'website',
            'phone': 'phone',
            'email': 'email',
            'walk in': 'walk_in',
            'walk_in': 'walk_in',
            'referral': 'referral',
            'social media': 'social_media',
            'social_media': 'social_media',
            'other': 'other'
          }
          source = sourceMap[source] || 'other'

          // Handle status mapping (convert labels back to values)
          let status = (row['Status'] || row['status'] || 'new').toLowerCase()
          const statusMap = {
            'new': 'new',
            'new lead': 'new',
            'contacted': 'contacted',
            'qualified': 'qualified',
            'site visit scheduled': 'site_visit_scheduled',
            'site_visit_scheduled': 'site_visit_scheduled',
            'site visit completed': 'site_visit_completed',
            'site_visit_completed': 'site_visit_completed',
            'negotiation': 'negotiation',
            'booked': 'booked',
            'closed': 'closed',
            'lost': 'lost',
            'junk': 'junk',
            'junk / invalid': 'junk',
            'invalid': 'junk'
          }
          status = statusMap[status] || 'new'

          return {
            contact: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim().replace(/\s+/g, '')
            },
            status: status,
            source: source,
            _rowIndex: index + 2
          }
        }).filter(lead => {
          // Require at least firstName and email OR phone
          return lead.contact.firstName && (lead.contact.email || lead.contact.phone)
        })

        if (transformedData.length === 0) {
          toast.error('No valid leads found in the file')
          return
        }

        setUploadedData(transformedData)
        setShowUploadModal(true)
        toast.success(`Found ${transformedData.length} valid leads in the file`)
        event.target.value = ''
      } catch (error) {
        console.error('Error parsing file:', error)
        toast.error('Error parsing file. Please check the file format.')
        event.target.value = ''
      }
    }

    reader.onerror = () => {
      toast.error('Error reading file. Please try again.')
      event.target.value = ''
    }

    if (fileExtension === 'csv') {
      reader.readAsText(file, 'UTF-8')
    } else {
      reader.readAsBinaryString(file)
    }
  }

  const handleBulkUpload = async () => {
    if (uploadedData.length === 0) {
      toast.error('No data to upload')
      return
    }

    setUploading(true)
    setLoading(true)
    isUploadingRef.current = true

    try {
      const response = await api.post('/leads/bulk', { leads: uploadedData })
      const createdCount = response.data.created || uploadedData.length
      const errors = response.data.errors || []

      setShowUploadModal(false)
      setUploadedData([])

      if (errors.length > 0) {
        setUploadErrors(errors)
        setShowErrorModal(true)
        toast.error(`Uploaded ${createdCount} leads. ${errors.length} rows had errors.`)
      } else {
        toast.success(`Successfully uploaded ${createdCount} leads`)
        setUploadErrors([])
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      isUploadingRef.current = false
      await fetchLeads()
      fetchDashboardMetrics()
      fetchMissedFollowUps()
    } catch (error) {
      console.error('Error uploading leads:', error)
      const errorMessage = error.response?.data?.message || 'Failed to upload leads'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Dashboard Metrics Widget */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Lead Metrics</h2>

          </div>
          {loadingMetrics ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : dashboardMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">New Leads Today</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardMetrics.newLeadsToday || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">This Month: <span className="font-semibold">{dashboardMetrics.newLeadsThisMonth || 0}</span></p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-500 opacity-80" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Leads</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardMetrics.totalLeads || 0}</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-500 opacity-80" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardMetrics.conversionRate || 0}%</p>
                    <p className="text-xs text-gray-600 mt-1">Booked/Closed leads</p>
                  </div>
                  <Target className="h-10 w-10 text-purple-500 opacity-80" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Today's Follow-Ups</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardMetrics.todaysFollowUps?.total || 0}</p>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-gray-600">Pending: <span className="font-semibold text-orange-600">{dashboardMetrics.todaysFollowUps?.pending || 0}</span></p>
                      {dashboardMetrics.todaysFollowUps?.completed > 0 && (
                        <p className="text-xs text-gray-600">Completed: <span className="font-semibold text-green-600">{dashboardMetrics.todaysFollowUps?.completed || 0}</span></p>
                      )}
                      {dashboardMetrics.todaysFollowUps?.total > 0 && (
                        <p className="text-xs text-gray-600">Completion: <span className="font-semibold">{dashboardMetrics.todaysFollowUps?.completionRate || 0}%</span></p>
                      )}
                    </div>
                  </div>
                  <Calendar className="h-10 w-10 text-orange-500 opacity-80" />
                </div>
              </div>
              <div className={`rounded-lg shadow-sm p-4 border-l-4 ${missedFollowUps > 0 ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-500' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-500'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Missed Follow-Ups</p>
                    <p className={`text-2xl font-bold mt-1 ${missedFollowUps > 0 ? 'text-red-600' : 'text-gray-900'}`}>{missedFollowUps}</p>
                    {missedFollowUps > 0 && (
                      <button
                        onClick={() => {
                          const now = new Date().toISOString().split('T')[0]
                          setFilters(prev => ({ ...prev, startDate: '', endDate: now }))
                          toast.info('Filtering leads with missed follow-ups')
                        }}
                        className="text-xs text-red-600 hover:text-red-800 mt-1 underline font-medium"
                      >
                        View All →
                      </button>
                    )}
                  </div>
                  <Bell className={`h-10 w-10 opacity-80 ${missedFollowUps > 0 ? 'text-red-500' : 'text-gray-500'}`} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Unable to load metrics. Please try again.</p>
            </div>
          )}
        </div>

        {/* Header with Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1 border-b border-gray-200">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Leads tab clicked')
                  setViewMode('list')
                  setPagination(prev => ({ ...prev, page: 1 }))
                  // Explicitly call fetchLeads to ensure API is called
                  setTimeout(() => {
                    fetchLeads()
                  }, 0)
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer relative z-10 ${viewMode === 'list'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                  }`}
                style={{ pointerEvents: 'auto' }}
              >
                List View
              </button>
              {/* <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('List tab clicked')
                  setViewMode('list')
                  setPagination(prev => ({ ...prev, page: 1 }))
                  setTimeout(() => {
                    fetchLeads()
                  }, 0)
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer relative z-10 ${
                  viewMode === 'list'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                List
              </button> */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Kanban tab clicked')
                  setViewMode('kanban')
                  setPagination(prev => ({ ...prev, page: 1 }))
                  setTimeout(() => {
                    fetchLeads()
                  }, 0)
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer relative z-10 ${viewMode === 'kanban'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                  }`}
                style={{ pointerEvents: 'auto' }}
              >
                Kanban
              </button>
            </div>
            <div className="flex items-center gap-3">
              {canUploadLeads && (
                <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Import leads
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    onClick={(e) => { e.target.value = '' }}
                  />
                </label>
              )}
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Excel
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
              {(isSuperAdmin || isAgencyAdmin) && (
                <Link
                  href="/admin/reports"
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Link>
              )}
              {(isSuperAdmin || isStaff) && (
                <Link
                  href="/admin/leads/new"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add lead
                </Link>
              )}
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={pagination.limit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value)
                  setPagination(prev => ({
                    ...prev,
                    limit: newLimit,
                    page: 1,
                    total: prev.total,
                    pages: Math.ceil(prev.total / newLimit)
                  }))
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 bg-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <Filter className="h-5 w-5 text-gray-400" />

              {/* Owner/Agent Filter - Only for Super Admin and Agency Admin */}
              {(isSuperAdmin || isAgencyAdmin) && (
                <select
                  value={filters.owner}
                  onChange={(e) => setFilters(prev => ({ ...prev, owner: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">- Agent -</option>
                  {owners.map((owner) => (
                    <option key={owner._id} value={owner._id}>
                      {owner.firstName} {owner.lastName}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={filters.source}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, source: e.target.value }))
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">- Source -</option>
                <option value="website">Website</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="walk_in">Walk In</option>
                <option value="referral">Referral</option>
                <option value="social_media">Social Media</option>
                <option value="other">Other</option>
                {/* Also show custom sources from leads */}
                {sources.filter(source => !['website', 'phone', 'email', 'walk_in', 'referral', 'social_media', 'other'].includes(source)).map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">- Status -</option>
                <option value="new">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="site_visit_scheduled">Site Visit Scheduled</option>
                <option value="site_visit_completed">Site Visit Completed</option>
                <option value="negotiation">Negotiation</option>
                <option value="booked">Booked</option>
                <option value="lost">Lost</option>
                <option value="closed">Closed</option>
                <option value="junk">Junk / Invalid</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">- Priority -</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="not_interested">Not Interested</option>
              </select>

              {/* Team Filter - Only for Super Admin and Agency Admin */}
              {(isSuperAdmin || isAgencyAdmin) && (
                <select
                  value={filters.team}
                  onChange={(e) => setFilters(prev => ({ ...prev, team: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">- Team -</option>
                  {teams.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              )}

              {/* Campaign Filter - Only for Super Admin and Agency Admin */}
              {(isSuperAdmin || isAgencyAdmin) && (
                <select
                  value={filters.campaign}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, campaign: e.target.value }))
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">- Campaign -</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign} value={campaign}>
                      {campaign}
                    </option>
                  ))}
                </select>
              )}

              {/* Agency Filter - Only for Super Admin */}
              {isSuperAdmin && (
                <select
                  value={filters.agency ? String(filters.agency) : ''}
                  onChange={(e) => {
                    const selectedAgency = e.target.value
                    setFilters(prev => ({ ...prev, agency: selectedAgency }))
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">- Agency -</option>
                  {agencies.map((agency) => {
                    const agencyId = agency._id ? String(agency._id) : ''
                    return (
                      <option key={agencyId} value={agencyId}>
                        {agency.name}
                      </option>
                    )
                  })}
                </select>
              )}

              <select
                value={filters.property ? String(filters.property) : ''}
                onChange={(e) => {
                  const selectedProperty = e.target.value
                  setFilters(prev => ({ ...prev, property: selectedProperty }))
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">- Property -</option>
                {properties.map((property) => {
                  const propertyId = property._id ? String(property._id) : ''
                  return (
                    <option key={propertyId} value={propertyId}>
                      {property.title}
                    </option>
                  )
                })}
              </select>

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
                  {filters.startDate || filters.endDate ? (
                    <X
                      className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
                        setPagination(prev => ({ ...prev, page: 1 }))
                        fetchLeads()
                      }}
                    />
                  ) : null}
                </button>
                {showDatePicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDatePicker(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 min-w-[500px]">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-2">From Date</label>
                          <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => {
                              const newStartDate = e.target.value
                              setFilters(prev => ({ ...prev, startDate: newStartDate }))
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
                              setFilters(prev => ({ ...prev, endDate: newEndDate }))
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
                            setShowDatePicker(false)
                            setPagination(prev => ({ ...prev, page: 1 }))
                            fetchLeads()
                          }}
                          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => {
                            setShowDatePicker(false)
                            setPagination(prev => ({ ...prev, page: 1 }))
                            fetchLeads()
                          }}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or lead ID"
                  value={filters.search}
                  onChange={(e) => {
                    const searchValue = e.target.value
                    setFilters(prev => ({ ...prev, search: searchValue }))
                    setPagination(prev => ({ ...prev, page: 1 }))

                    // Clear existing timer
                    if (searchDebounceTimer) {
                      clearTimeout(searchDebounceTimer)
                    }

                    // Set new timer for debounced search
                    const timer = setTimeout(() => {
                      fetchLeads()
                    }, 500) // 500ms delay

                    setSearchDebounceTimer(timer)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (searchDebounceTimer) {
                        clearTimeout(searchDebounceTimer)
                      }
                      fetchLeads()
                    }
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 w-64"
                />
                {filters.search && (
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, search: '' }))
                      setPagination(prev => ({ ...prev, page: 1 }))
                      if (searchDebounceTimer) {
                        clearTimeout(searchDebounceTimer)
                      }
                      fetchLeads()
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={clearAllFilters}
                disabled={!hasActiveFilters()}
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${hasActiveFilters()
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 focus:ring-2 focus:ring-red-500 cursor-pointer'
                  : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                title={hasActiveFilters() ? 'Clear all filters' : 'No filters to clear'}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : !sortedLeads || sortedLeads.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 text-lg">No leads found</p>
              </div>
            ) : (
              <>
                {/* Bulk Actions Bar - Only for Super Admin and Agency Admin */}
                {canBulkActions && showBulkActions && selectedLeads.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-blue-900">
                          {selectedLeads.length} lead(s) selected
                        </span>
                        <button
                          onClick={() => {
                            setShowBulkModal(true)
                            setBulkAction('status')
                          }}
                          className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm"
                        >
                          Update Status
                        </button>
                        <button
                          onClick={() => {
                            setShowBulkModal(true)
                            setBulkAction('assign')
                          }}
                          className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm"
                        >
                          Assign Agent
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setShowBulkModal(true)
                              setBulkAction('agency')
                            }}
                            className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm"
                          >
                            Assign Agency
                          </button>
                        )}
                        {canAutoAssign && (
                          <button
                            onClick={() => {
                              setShowAutoAssignModal(true)
                            }}
                            className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm inline-flex items-center gap-2"
                          >
                            <Zap className="h-4 w-4" />
                            Auto Assign
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            Delete Selected
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedLeads([])
                          setShowBulkActions(false)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
                    <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1600px' }}>
                      <thead className="bg-gradient-to-r from-primary-600 to-primary-700">
                        <tr>
                          {canBulkActions && (
                            <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider w-12">
                              <input
                                type="checkbox"
                                checked={selectedLeads.length === sortedLeads.length && sortedLeads.length > 0}
                                onChange={handleSelectAll}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                            </th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Lead ID
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Score
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                            onClick={() => handleSort('contactName')}
                          >
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              Contact Name
                              {sortColumn === 'contactName' && (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                            onClick={() => handleSort('email')}
                          >
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              Email
                              {sortColumn === 'email' && (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                            onClick={() => handleSort('phone')}
                          >
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              Phone
                              {sortColumn === 'phone' && (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                            onClick={() => handleSort('source')}
                          >
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              Source
                              {sortColumn === 'source' && (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Campaign
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Agency
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Assigned Agent
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Priority
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              Status
                              {sortColumn === 'status' && (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                            onClick={() => handleSort('createdDate')}
                          >
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              Created Date
                              {sortColumn === 'createdDate' && (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                            onClick={() => handleSort('updatedAt')}
                          >
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              Last Updated
                              {sortColumn === 'updatedAt' && (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Follow-Up
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedLeads.map((lead) => {
                          const leadId = getLeadId(lead)
                          const contactName = `${lead.contact?.firstName || ''} ${lead.contact?.lastName || ''}`.trim() || 'N/A'
                          const getSourceLabel = (source) => {
                            const labels = {
                              website: 'Website',
                              phone: 'Phone',
                              email: 'Email',
                              walk_in: 'Walk In',
                              referral: 'Referral',
                              social_media: 'Social Media',
                              other: 'Other'
                            }
                            return labels[source] || source || 'Other'
                          }
                          const getStatusLabel = (status) => {
                            if (!status) return 'New Lead'
                            const statusLabels = {
                              new: 'New Lead',
                              contacted: 'Contacted',
                              qualified: 'Qualified',
                              site_visit_scheduled: 'Site Visit Scheduled',
                              site_visit_completed: 'Site Visit Completed',
                              negotiation: 'Negotiation',
                              booked: 'Booked',
                              lost: 'Lost',
                              closed: 'Closed',
                              junk: 'Junk / Invalid'
                            }
                            return statusLabels[status?.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
                          }

                          const getPriorityLabel = (priority) => {
                            if (!priority) return 'Warm'
                            const priorityLabels = {
                              hot: 'Hot',
                              warm: 'Warm',
                              cold: 'Cold',
                              not_interested: 'Not Interested'
                            }
                            return priorityLabels[priority?.toLowerCase()] || priority.charAt(0).toUpperCase() + priority.slice(1)
                          }
                          return (
                            <tr key={leadId} className="hover:bg-logo-beige transition-colors">
                              {canBulkActions && (
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedLeads.includes(leadId)}
                                    onChange={() => handleSelectLead(leadId)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-mono text-gray-600">
                                  {lead.leadId || `LEAD-${String(lead._id).slice(-6)}`}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {lead.score !== undefined ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${lead.score >= 70 ? 'bg-red-500' :
                                          lead.score >= 40 ? 'bg-orange-500' :
                                            lead.score >= 20 ? 'bg-yellow-500' : 'bg-gray-400'
                                          }`}
                                        style={{ width: `${Math.min(lead.score, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700 min-w-[35px]">{lead.score}</span>
                                    <button
                                      onClick={() => handleReScoreLead(leadId)}
                                      disabled={rescoring === leadId}
                                      className="text-primary-600 hover:text-primary-800 disabled:opacity-50"
                                      title="Re-score lead"
                                    >
                                      <Zap className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleReScoreLead(leadId)}
                                    disabled={rescoring === leadId}
                                    className="text-xs text-primary-600 hover:text-primary-800 disabled:opacity-50"
                                    title="Calculate score"
                                  >
                                    {rescoring === leadId ? 'Scoring...' : 'Score'}
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Link
                                  href={`/admin/leads/${leadId}`}
                                  className="text-sm font-medium text-primary-600 hover:text-primary-800"
                                >
                                  {contactName}
                                </Link>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">{lead.contact?.email || '-'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">{lead.contact?.phone || '-'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900 capitalize">
                                  {getSourceLabel(lead.source)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {lead.campaignName || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isSuperAdmin ? (
                                  <select
                                    value={lead.agency?._id ? lead.agency._id.toString() : (lead.agency?.toString() || lead.agency || '')}
                                    onChange={(e) => handleQuickAgencyChange(leadId, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[150px] flex-1"
                                    title="Change Agency"
                                  >
                                    <option value="">Unassigned</option>
                                    {agencies.map((agency) => (
                                      <option key={agency._id} value={agency._id}>
                                        {agency.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm text-gray-900">
                                    {lead.agency?.name || 'Unassigned'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(isSuperAdmin || isAgencyAdmin) ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={lead.assignedAgent?._id || lead.assignedAgent || ''}
                                      onChange={(e) => handleQuickAssign(leadId, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[120px] flex-1"
                                      title="Assign Agent"
                                    >
                                      <option value="">Unassigned</option>
                                      {(() => {
                                        // Filter agents based on lead's agency (similar to edit form)
                                        let filteredAgents = allAgents.length > 0 ? allAgents : owners
                                        if (lead.agency) {
                                          const leadAgencyId = lead.agency?._id ? lead.agency._id.toString() : (lead.agency?.toString() || lead.agency || '')
                                          if (leadAgencyId) {
                                            filteredAgents = filteredAgents.filter(owner => {
                                              const ownerAgencyId = owner.agency?._id ? owner.agency._id.toString() : (owner.agency?.toString() || owner.agency || '')
                                              return ownerAgencyId === leadAgencyId
                                            })
                                          }
                                        }
                                        return filteredAgents.map((owner) => (
                                          <option key={owner._id} value={owner._id}>
                                            {owner.firstName} {owner.lastName}
                                          </option>
                                        ))
                                      })()}
                                    </select>
                                    {canAutoAssign && (
                                      <button
                                        onClick={() => {
                                          setShowAutoAssignModal(true)
                                          setSelectedLeads([leadId])
                                        }}
                                        className="text-primary-600 hover:text-primary-800 p-1"
                                        title="Auto Assign"
                                      >
                                        <Zap className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-900">
                                    {lead.assignedAgent
                                      ? `${lead.assignedAgent.firstName || ''} ${lead.assignedAgent.lastName || ''}`.trim() || 'Assigned'
                                      : 'Unassigned'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                {canEditLead ? (
                                  <select
                                    key={`priority-select-${leadId}-${lead.priority || 'null'}`}
                                    value={lead.priority ? String(lead.priority).toLowerCase() : ''}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleQuickPriorityChange(leadId, e.target.value)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[120px] cursor-pointer"
                                    title="Change Priority"
                                  >
                                    <option value="">Select Priority</option>
                                    <option value="hot">Hot</option>
                                    <option value="warm">Warm</option>
                                    <option value="cold">Cold</option>
                                    <option value="not_interested">Not Interested</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${lead.priority === 'hot' ? 'bg-red-100 text-red-800' :
                                    lead.priority === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                                      lead.priority === 'cold' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {lead.priority ? lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1).replace('_', ' ') : '-'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {canEditLead ? (
                                  <select
                                    value={lead.status || ''}
                                    onChange={(e) => handleQuickStatusChange(leadId, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[140px]"
                                    title="Change Status"
                                  >
                                    <option value="">Select Status</option>
                                    <option value="new">New Lead</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="site_visit_scheduled">Site Visit Scheduled</option>
                                    <option value="site_visit_completed">Site Visit Completed</option>
                                    <option value="negotiation">Negotiation</option>
                                    <option value="booked">Booked</option>
                                    <option value="lost">Lost</option>
                                    <option value="closed">Closed</option>
                                    <option value="junk">Junk / Invalid</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${lead.status === 'booked' || lead.status === 'closed' ? 'bg-green-100 text-green-800' :
                                    lead.status === 'lost' || lead.status === 'junk' ? 'bg-red-100 text-red-800' :
                                      'bg-primary-100 text-primary-800'
                                    }`}>
                                    {lead.status ? lead.status.replace(/_/g, ' ').charAt(0).toUpperCase() + lead.status.replace(/_/g, ' ').slice(1) : '-'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(lead.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {lead.updatedAt ? (
                                  <div className="flex flex-col">
                                    <span>{new Date(lead.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    <span className="text-xs text-gray-500">{new Date(lead.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {lead.followUpDate ? (
                                  <div className="flex flex-col">
                                    <span className={new Date(lead.followUpDate) < new Date() ? 'text-red-600 font-semibold' : ''}>
                                      {new Date(lead.followUpDate).toLocaleDateString()}
                                    </span>
                                    {new Date(lead.followUpDate) < new Date() && (
                                      <span className="text-xs text-red-500">Overdue</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <div className="flex items-center justify-center gap-2">
                                  <Link
                                    href={`/admin/leads/${leadId}`}
                                    className="text-primary-600 hover:text-primary-900 transition-colors"
                                    title="View"
                                  >
                                    <Eye className="h-5 w-5" />
                                  </Link>
                                  {canEditLead && (
                                    <Link
                                      href={`/admin/leads/${leadId}/edit`}
                                      className="text-primary-600 hover:text-primary-900 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-5 w-5" />
                                    </Link>
                                  )}
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => handleDelete(leadId)}
                                      className="text-red-600 hover:text-red-900 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                      {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}/{pagination.total}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        «
                      </button>
                      <button
                        className="px-3 py-1 bg-primary-600 text-white rounded-lg"
                      >
                        {pagination.page}
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.pages}
                        className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        »
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map((column) => {
              const columnLeads = getLeadsByStatus(column.id)
              return (
                <div key={column.id} className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{column.title}</h3>
                    <div className={`h-1 rounded-full ${column.colorClass}`}></div>
                  </div>
                  <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {columnLeads.map((lead) => {
                      const leadId = getLeadId(lead)
                      const companyName = `${lead.contact?.firstName || ''} ${lead.contact?.lastName || ''}`.trim() || 'N/A'
                      return (
                        <div
                          key={leadId}
                          className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => window.location.href = `/admin/leads/${leadId}`}
                        >
                          <h4 className="text-sm font-medium text-gray-900 mb-2">{companyName}</h4>
                          {lead.source && (
                            <p className="text-xs text-gray-500 mb-1">Source: {lead.source}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              Owner: {lead.assignedAgent
                                ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}`
                                : 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">1 person</span>
                          </div>
                        </div>
                      )
                    })}
                    {columnLeads.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-8">
                        No leads
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  Preview Upload ({uploadedData.length} leads)
                </h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadedData([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 text-sm text-gray-600">
                  Review the leads below. Invalid rows have been filtered out.
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadedData.slice(0, 10).map((lead, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm">
                            {lead.contact.firstName} {lead.contact.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm">{lead.contact.email}</td>
                          <td className="px-4 py-3 text-sm">{lead.contact.phone}</td>
                          <td className="px-4 py-3 text-sm">{lead.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {uploadedData.length > 10 && (
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      ... and {uploadedData.length - 10} more leads
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadedData([])
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : `Upload ${uploadedData.length} Leads`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Modal */}
        {showErrorModal && uploadErrors.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-red-600">
                  Upload Errors ({uploadErrors.length} rows)
                </h2>
                <button
                  onClick={() => {
                    setShowErrorModal(false)
                    setUploadErrors([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 text-sm text-gray-600">
                  The following rows had errors and were not uploaded.
                </div>
                <div className="space-y-2">
                  {uploadErrors.map((error, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-red-700">Row {error.row}:</span>
                        <span className="text-red-600">{error.error}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowErrorModal(false)
                    setUploadErrors([])
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Action Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {bulkAction === 'status' ? 'Bulk Update Status' : bulkAction === 'agency' ? 'Bulk Assign Agency' : 'Bulk Assign Agent'}
                </h2>
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    setBulkAction('')
                    setBulkStatus('')
                    setBulkAgent('')
                    setBulkAgency('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  You are about to update <strong>{selectedLeads.length}</strong> lead(s)
                </p>
                {bulkAction === 'status' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                    <select
                      value={bulkStatus}
                      onChange={(e) => setBulkStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Status</option>
                      <option value="new">New Lead</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="site_visit_scheduled">Site Visit Scheduled</option>
                      <option value="site_visit_completed">Site Visit Completed</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="booked">Booked</option>
                      <option value="lost">Lost</option>
                      <option value="closed">Closed</option>
                      <option value="junk">Junk / Invalid</option>
                    </select>
                  </div>
                ) : bulkAction === 'agency' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Agency</label>
                    <select
                      value={bulkAgency}
                      onChange={(e) => setBulkAgency(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Agency</option>
                      {agencies.map((agency) => (
                        <option key={agency._id} value={agency._id}>
                          {agency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Agent</label>
                    <select
                      value={bulkAgent}
                      onChange={(e) => setBulkAgent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Agent</option>
                      {owners.map((owner) => (
                        <option key={owner._id} value={owner._id}>
                          {owner.firstName} {owner.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    setBulkAction('')
                    setBulkStatus('')
                    setBulkAgent('')
                    setBulkAgency('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={bulkAction === 'status' ? handleBulkUpdateStatus : bulkAction === 'agency' ? handleBulkAssignAgency : handleBulkAssign}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {bulkAction === 'status' ? 'Update Status' : 'Assign Agent'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Assign Modal */}
        {showAutoAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  Auto-Assign Lead(s)
                </h2>
                <button
                  onClick={() => {
                    setShowAutoAssignModal(false)
                    setAutoAssignMethod('round_robin')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Select assignment method for {selectedLeads.length} lead(s):
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Method</label>
                  <select
                    value={autoAssignMethod}
                    onChange={(e) => setAutoAssignMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="round_robin">Round-Robin</option>
                    <option value="workload">Workload-Based (Least Leads)</option>
                    <option value="location">Location-Based</option>
                    <option value="project">Project-Based</option>
                    <option value="source">Source-Based</option>
                    <option value="smart">Smart Assignment</option>
                  </select>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <strong>Note:</strong> {autoAssignMethod === 'round_robin' && 'Leads will be assigned in rotation order.'}
                  {autoAssignMethod === 'workload' && 'Leads will be assigned to agents with the least number of assigned leads.'}
                  {autoAssignMethod === 'location' && 'Leads will be assigned based on preferred location matching agent expertise.'}
                  {autoAssignMethod === 'project' && 'Leads will be assigned based on property/project matching agent specialization.'}
                  {autoAssignMethod === 'source' && 'Leads will be assigned based on source matching agent specialization.'}
                  {autoAssignMethod === 'smart' && 'Leads will be assigned using multiple rules: Project > Location > Source > Workload > Round-robin.'}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowAutoAssignModal(false)
                    setAutoAssignMethod('round_robin')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAutoAssign}
                  disabled={autoAssigning}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {autoAssigning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Auto Assign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Source & Agent Performance Widgets */}
        {dashboardMetrics && (dashboardMetrics.leadSourcePerformance || dashboardMetrics.salesExecutivePerformance) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Source Performance */}
            {dashboardMetrics.leadSourcePerformance && Object.keys(dashboardMetrics.leadSourcePerformance).length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  Lead Source Performance
                </h3>
                <div className="space-y-3">
                  {Object.entries(dashboardMetrics.leadSourcePerformance)
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 5)
                    .map(([source, data]) => (
                      <div key={source} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 capitalize">{source.replace('_', ' ')}</span>
                          <span className="text-xs text-gray-500">{data.conversionRate}% conversion</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>Total: {data.total}</span>
                          <span>•</span>
                          <span>Converted: {data.converted}</span>
                        </div>
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${data.conversionRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Agent Performance */}
            {dashboardMetrics.salesExecutivePerformance && dashboardMetrics.salesExecutivePerformance.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary-600" />
                  Sales Executive Performance
                </h3>
                <div className="space-y-3">
                  {dashboardMetrics.salesExecutivePerformance
                    .sort((a, b) => b.convertedLeads - a.convertedLeads)
                    .slice(0, 5)
                    .map((agent) => {
                      const agentData = owners.find(o => o._id?.toString() === agent.agentId)
                      return (
                        <div key={agent.agentId} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {agentData ? `${agentData.firstName} ${agentData.lastName}` : `Agent ${agent.agentId.slice(-6)}`}
                            </span>
                            <span className="text-xs text-gray-500">{agent.conversionRate}% conversion</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>Total: {agent.totalLeads}</span>
                            <span>•</span>
                            <span>Converted: {agent.convertedLeads}</span>
                          </div>
                          <div className="mt-2 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${agent.conversionRate}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

