'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Building, Plus, Edit, Trash2, Users, Package, TrendingUp, Search, CheckCircle, UserX, Filter, X, ChevronUp, ChevronDown, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export function AgenciesPageContent() {
  const { user, checkPermission } = useAuth()
  const router = useRouter()

  // Dynamic Permission Flags
  const canViewAgencies = checkPermission('agencies', 'view')
  const canCreateAgency = checkPermission('agencies', 'create')
  const canEditAgency = checkPermission('agencies', 'edit')
  const canDeleteAgency = checkPermission('agencies', 'delete')
  const isSuperAdmin = user?.role === 'super_admin'

  // Page access check
  useEffect(() => {
    if (user && !canViewAgencies) {
      toast.error('You do not have permission to view agencies')
      router.push('/admin/dashboard')
    }
  }, [user, canViewAgencies, router])

  const [agencies, setAgencies] = useState([])
  const [allAgencies, setAllAgencies] = useState([]) // Store all agencies for metrics calculation
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [agencyMetrics, setAgencyMetrics] = useState({
    totalAgencies: 0,
    activeAgencies: 0,
    inactiveAgencies: 0,
    totalAgents: 0,
    totalProperties: 0,
    totalLeads: 0
  })
  const [statusFilter, setStatusFilter] = useState('') // Filter by status (active/inactive)
  const [startDate, setStartDate] = useState('') // Date range filter start
  const [endDate, setEndDate] = useState('') // Date range filter end
  const [showDatePicker, setShowDatePicker] = useState(false) // Show/hide date picker
  const [sortColumn, setSortColumn] = useState('') // Current sort column
  const [sortDirection, setSortDirection] = useState('asc') // Sort direction
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 20
  })

  useEffect(() => {
    // Reset pagination when filters change
    setPagination(prev => ({ ...prev, current: 1 }))
  }, [searchTerm, statusFilter, startDate, endDate])

  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timer = setTimeout(() => {
      fetchAgencies()
    }, statusFilter ? 0 : 300) // No debounce for status filter for immediate feedback

    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, startDate, endDate, sortColumn, sortDirection, pagination.current])

  useEffect(() => {
    fetchMetrics()
    fetchAgencies()
  }, [])

  const fetchAgencies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.current || 1,
        limit: pagination.limit || 20
      })
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (statusFilter) {
        params.append('isActive', statusFilter === 'active' ? 'true' : 'false')
      }

      const response = await api.get(`/agencies?${params.toString()}`)
      let fetchedAgencies = response.data.agencies || []

      // Update pagination from response
      if (response.data.pagination) {
        setPagination(prev => ({
          ...prev,
          pages: response.data.pagination.pages || prev.pages,
          total: response.data.pagination.total || prev.total,
          current: response.data.pagination.page || prev.current
        }))
      }

      // Apply client-side date filtering by updatedAt
      if (startDate || endDate) {
        fetchedAgencies = fetchedAgencies.filter((agency) => {
          const updatedAt = new Date(agency.updatedAt || agency.updated_at || agency.createdAt || agency.created_at || 0)
          const start = startDate ? new Date(startDate + 'T00:00:00') : null
          const end = endDate ? new Date(endDate + 'T23:59:59') : null

          if (start && updatedAt < start) return false
          if (end && updatedAt > end) return false
          return true
        })
      }

      // Apply client-side sorting if needed
      if (sortColumn) {
        fetchedAgencies = [...fetchedAgencies].sort((a, b) => {
          let aValue, bValue
          switch (sortColumn) {
            case 'createdAt':
              aValue = new Date(a.createdAt || a.created_at || 0)
              bValue = new Date(b.createdAt || b.created_at || 0)
              break
            case 'updatedAt':
              aValue = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0)
              bValue = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0)
              break
            default:
              return 0
          }
          if (sortDirection === 'asc') {
            return aValue - bValue
          } else {
            return bValue - aValue
          }
        })
      }

      setAgencies(fetchedAgencies)
    } catch (error) {
      console.error('Error fetching agencies:', error)
      toast.error('Failed to load agencies')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const clearFilters = () => {
    setStatusFilter('')
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    fetchAgencies()
  }

  const hasActiveFilters = () => {
    return statusFilter !== '' || searchTerm.trim() !== '' || startDate !== '' || endDate !== ''
  }

  const fetchMetrics = async () => {
    try {
      // Fetch all agencies for metrics
      const [agenciesRes, propertiesRes, leadsRes, agentsRes] = await Promise.all([
        api.get('/agencies').catch(() => ({ data: { agencies: [] } })),
        api.get('/properties?limit=100').catch(() => ({ data: { properties: [] } })),
        api.get('/leads?limit=100').catch(() => ({ data: { leads: [] } })),
        api.get('/users?role=agent&limit=100').catch(() => ({ data: { users: [] } }))
      ])

      const allAgenciesData = agenciesRes.data?.agencies || []
      const allProperties = propertiesRes.data?.properties || []
      const allLeads = leadsRes.data?.leads || []
      const allAgents = agentsRes.data?.users || []

      setAllAgencies(allAgenciesData)

      // Calculate metrics
      const activeAgencies = allAgenciesData.filter(a => a.isActive === true).length
      const totalProperties = allProperties.length
      const totalLeads = allLeads.length
      const totalAgents = allAgents.length

      setAgencyMetrics({
        totalAgencies: allAgenciesData.length,
        activeAgencies: activeAgencies,
        inactiveAgencies: allAgenciesData.length - activeAgencies,
        totalAgents: totalAgents,
        totalProperties: totalProperties,
        totalLeads: totalLeads
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this agency?')) return

    try {
      await api.delete(`/agencies/${id}`)
      toast.success('Agency deleted successfully')
      fetchAgencies()
      fetchMetrics()
    } catch (error) {
      console.error('Error deleting agency:', error)
      toast.error('Failed to delete agency')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Agency Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Agencies</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{agencyMetrics.totalAgencies}</p>
              </div>
              <Building className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Active Agencies</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{agencyMetrics.activeAgencies}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Inactive Agencies</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{agencyMetrics.inactiveAgencies}</p>
              </div>
              <UserX className="h-10 w-10 text-red-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{agencyMetrics.totalAgents}</p>
              </div>
              <Users className="h-10 w-10 text-purple-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{agencyMetrics.totalProperties}</p>
              </div>
              <Package className="h-10 w-10 text-orange-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow-sm p-4 border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{agencyMetrics.totalLeads}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-teal-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agencies</h1>
            <p className="mt-1 text-sm text-gray-500">Manage all real estate agencies</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium"
            >
              <option value="">All Agencies</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agencies..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm min-w-[200px]"
              />
            </div>
            {/* Date Range Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 ${startDate || endDate
                  ? 'border-primary-500 text-gray-900'
                  : 'border-gray-300 text-gray-700'
                  }`}
              >
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <span>
                  {startDate && endDate
                    ? `Date: ${new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : startDate
                      ? `Date: ${new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ...`
                      : endDate
                        ? `Date: ... - ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                        : 'Date Range'}
                </span>
                {startDate || endDate ? (
                  <X
                    className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      setStartDate('')
                      setEndDate('')
                      fetchAgencies()
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
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 min-w-[500px]">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-2">From Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            const newStartDate = e.target.value
                            setStartDate(newStartDate)
                            if (endDate && newStartDate && endDate < newStartDate) {
                              setEndDate('')
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-2">To Date</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            const newEndDate = e.target.value
                            setEndDate(newEndDate)
                          }}
                          min={startDate || undefined}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => {
                          setStartDate('')
                          setEndDate('')
                          setShowDatePicker(false)
                          fetchAgencies()
                        }}
                        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => {
                          setShowDatePicker(false)
                          fetchAgencies()
                        }}
                        className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {canCreateAgency && (
              <Link href="/admin/agencies/add" className="btn btn-primary">
                <Plus className="h-5 w-5 mr-2" />
                Add Agency
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : agencies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No agencies found</p>
            {canCreateAgency && (
              <Link href="/admin/agencies/add" className="btn btn-primary mt-4">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Agency
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-primary-600 to-primary-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Logo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Agency Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Agents
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Properties
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Leads
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          Created Date
                          {sortColumn === 'createdAt' && (
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
                      <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agencies.map((agency) => (
                      <tr key={String(agency._id)} className="hover:bg-logo-beige transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {agency.logo ? (
                            <img
                              src={agency.logo}
                              alt={agency.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                              <Building className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{agency.name}</div>
                          {agency.slug && (
                            <div className="text-xs text-gray-500">/{agency.slug}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs line-clamp-2">
                            {agency.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{agency.contact?.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{agency.contact?.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {agency.stats?.totalAgents || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {agency.stats?.activeProperties || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {agency.stats?.totalLeads || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {agency.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agency.createdAt || agency.created_at ? (
                            new Date(agency.createdAt || agency.created_at).toLocaleDateString()
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agency.updatedAt || agency.updated_at ? (
                            <div className="flex flex-col">
                              <span>{new Date(agency.updatedAt || agency.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <span className="text-xs text-gray-500">{new Date(agency.updatedAt || agency.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center gap-3">
                            {isSuperAdmin && (
                              <Link
                                href={`/admin/permissions?type=agency&id=${String(agency._id)}`}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                title="Permissions (this agency only)"
                              >
                                <Shield className="h-5 w-5" />
                              </Link>
                            )}
                            {canEditAgency && (
                              <Link
                                href={`/admin/agencies/${String(agency._id)}/edit`}
                                className="text-primary-600 hover:text-primary-900 transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-5 w-5" />
                              </Link>
                            )}
                            {canDeleteAgency && (
                              <button
                                onClick={() => handleDelete(agency._id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  {/* Pagination Info */}
                  <div className="text-sm text-gray-600">
                    Showing{' '}
                    <span className="font-semibold text-gray-900">
                      {((pagination.current - 1) * pagination.limit) + 1}
                    </span>
                    {' - '}
                    <span className="font-semibold text-gray-900">
                      {Math.min(pagination.current * pagination.limit, pagination.total)}
                    </span>
                    {' of '}
                    <span className="font-semibold text-gray-900">{pagination.total}</span>
                    {' agencies'}
                  </div>

                  {/* Pagination Controls */}
                  {pagination.pages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                        disabled={pagination.current === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium"
                      >
                        Previous
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                          let pageNum;
                          if (pagination.pages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.current <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.current >= pagination.pages - 2) {
                            pageNum = pagination.pages - 4 + i;
                          } else {
                            pageNum = pagination.current - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPagination(prev => ({ ...prev, current: pageNum }))}
                              className={`px-3 py-2 border rounded-lg text-sm font-medium min-w-[40px] ${pagination.current === pageNum
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                        disabled={pagination.current === pagination.pages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function AgenciesPage() {
  return <AgenciesPageContent />
}

