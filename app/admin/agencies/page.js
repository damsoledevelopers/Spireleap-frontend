'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Building, Plus, Edit, Trash2, Users, Search, CheckCircle, UserX, Filter, X, ChevronUp, ChevronDown, Shield, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import DetailsModal from '../../../components/Common/DetailsModal'
import { useConfirmDialog } from '../../../components/Common/useConfirmDialog'

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
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [agencyMetrics, setAgencyMetrics] = useState({
    totalAgencies: 0,
    activeAgencies: 0,
    inactiveAgencies: 0,
    totalAgents: 0
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
  const [detailsAgency, setDetailsAgency] = useState(null)
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const formatDate = (value) => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatDateTime = (value) => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`
  }

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

  const fetchMetrics = async () => {
    try {
      // High limit so totals match Reports (same live stats as list rows)
      const agenciesRes = await api
        .get('/agencies?page=1&limit=5000&includeAgencyTotals=true')
        .catch(() => ({ data: { agencies: [], pagination: {}, agencyTotals: null } }))

      const allAgenciesData = agenciesRes.data?.agencies || []
      const totalFromPagination = agenciesRes.data?.pagination?.total
      const totals = agenciesRes.data?.agencyTotals

      const totalAgents = allAgenciesData.reduce((s, a) => s + (a.stats?.totalAgents || 0), 0)

      setAgencyMetrics({
        totalAgencies:
          typeof totalFromPagination === 'number' ? totalFromPagination : allAgenciesData.length,
        activeAgencies: typeof totals?.active === 'number' ? totals.active : 0,
        inactiveAgencies: typeof totals?.inactive === 'number' ? totals.inactive : 0,
        totalAgents
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Agency',
      message: 'Are you sure you want to delete this agency?',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) return

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>

        {/* Filter Section */}
        <div className="flex items-center justify-end gap-3 flex-wrap">
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
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 whitespace-nowrap ${startDate || endDate
                  ? 'border-primary-500 text-gray-900'
                  : 'border-gray-300 text-gray-700'
                  }`}
              >
                <Filter className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {startDate && endDate
                    ? `${new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} – ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`
                    : startDate
                      ? `From ${new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`
                      : endDate
                        ? `Until ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`
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
                          max={new Date().toISOString().split('T')[0]}
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
                          max={new Date().toISOString().split('T')[0]}
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
              <Link href="/admin/agencies/add" className="btn btn-primary whitespace-nowrap flex-shrink-0">
                <Plus className="h-5 w-5 mr-2" />
                Add Agency
              </Link>
            )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : agencies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No agencies found</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full min-w-[1180px] table-fixed divide-y divide-gray-200">
                <colgroup>
                  <col style={{ width: '3.5rem' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '9%' }} />
                </colgroup>
                <thead className="bg-gradient-to-r from-primary-600 to-primary-700">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Logo
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Agency
                    </th>
                    <th className="px-3 pr-1.5 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Email
                    </th>
                    <th className="pl-1.5 pr-3 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-2 py-3.5 text-center text-xs font-bold text-white uppercase tracking-normal whitespace-nowrap">
                      Agents
                    </th>
                    <th className="px-2.5 py-3.5 text-center text-[11px] sm:text-xs font-bold text-white uppercase tracking-normal whitespace-nowrap">
                      Properties
                    </th>
                    <th className="px-2.5 py-3.5 text-center text-[11px] sm:text-xs font-bold text-white uppercase tracking-normal whitespace-nowrap">
                      Leads
                    </th>
                    <th className="px-3 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agencies.map((agency) => (
                    <tr key={String(agency._id)} className="hover:bg-logo-beige transition-colors align-middle">
                      <td className="px-3 py-4 align-middle">
                        <button
                          type="button"
                          onClick={() => setDetailsAgency(agency)}
                          className="block focus:outline-none"
                          title="View details"
                        >
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
                        </button>
                      </td>
                      <td className="px-3 py-4 align-middle min-w-0">
                        <button
                          type="button"
                          onClick={() => setDetailsAgency(agency)}
                          className="text-left w-full min-w-0 focus:outline-none"
                          title="View details"
                        >
                          <div className="text-sm font-semibold text-gray-900 hover:text-primary-700 line-clamp-2 break-words">
                            {agency.name}
                          </div>
                          {agency.slug && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate" title={`/${agency.slug}`}>
                              /{agency.slug}
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="px-3 pr-1.5 py-4 text-left text-sm text-gray-900 align-middle min-w-0">
                        <div className="line-clamp-2 break-all" title={agency.contact?.email || ''}>
                          {agency.contact?.email || '—'}
                        </div>
                      </td>
                      <td className="pl-1.5 pr-3 py-4 text-left text-sm text-gray-900 align-middle min-w-0">
                        <div className="whitespace-nowrap tabular-nums overflow-hidden text-ellipsis" title={agency.contact?.phone || ''}>
                          {agency.contact?.phone || '—'}
                        </div>
                      </td>
                      <td className="px-2 py-4 text-center align-middle">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {agency.stats?.totalAgents ?? 0}
                        </span>
                      </td>
                      <td className="px-2.5 py-4 text-center align-middle">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {agency.stats?.totalProperties ?? 0}
                        </span>
                      </td>
                      <td className="px-2.5 py-4 text-center align-middle">
                        <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
                          {agency.stats?.totalLeads ?? 0}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center align-middle">
                        {agency.isActive ? (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center text-sm font-medium align-middle">
                        <div className="flex items-center justify-center gap-2 flex-nowrap">
                          <Link
                            href={`/admin/agencies/${String(agency._id)}`}
                            className="text-gray-600 hover:text-primary-600 transition-colors"
                            title="Open details page"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
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

      <DetailsModal
        isOpen={!!detailsAgency}
        onClose={() => setDetailsAgency(null)}
        title={detailsAgency?.name || ''}
        subtitle={detailsAgency?.slug ? `/${detailsAgency.slug}` : detailsAgency?.contact?.email}
        avatar={
          detailsAgency ? (
            detailsAgency.logo ? (
              <img
                src={detailsAgency.logo}
                alt={detailsAgency.name}
                className="h-14 w-14 rounded-lg object-cover"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Building className="h-7 w-7 text-white" />
              </div>
            )
          ) : null
        }
        sections={detailsAgency ? [
          {
            title: 'Overview',
            items: [
              { label: 'Description', value: detailsAgency.description },
              {
                label: 'Status',
                value: detailsAgency.isActive ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                ),
              },
            ],
          },
          {
            title: 'Contact',
            items: [
              { label: 'Email', value: detailsAgency.contact?.email },
              { label: 'Phone', value: detailsAgency.contact?.phone },
            ],
          },
          {
            title: 'Address',
            items: (() => {
              const addr = detailsAgency.contact?.address || {}
              const v = (x) => (x != null && String(x).trim() !== '' ? String(x).trim() : '')
              return [
                { label: 'Street', value: v(addr.street) },
                { label: 'Country', value: v(addr.country) },
                { label: 'State', value: v(addr.state) },
                { label: 'City', value: v(addr.city) },
                { label: 'ZIP code', value: v(addr.zipCode ?? addr.zip) },
              ]
            })(),
          },
          {
            title: 'Stats',
            items: [
              { label: 'Agents', value: detailsAgency.stats?.totalAgents ?? 0 },
              { label: 'Properties', value: detailsAgency.stats?.totalProperties ?? 0 },
              { label: 'Leads', value: detailsAgency.stats?.totalLeads ?? 0 },
              { label: 'Active properties', value: detailsAgency.stats?.activeProperties ?? 0 },
            ],
          },
          {
            title: 'Timeline',
            items: [
              { label: 'Created', value: formatDate(detailsAgency.createdAt || detailsAgency.created_at) },
              { label: 'Last updated', value: formatDateTime(detailsAgency.updatedAt || detailsAgency.updated_at) },
            ],
          },
        ] : []}
        actions={detailsAgency ? (
          <>
            {canEditAgency && (
              <Link
                href={`/admin/agencies/${String(detailsAgency._id)}/edit`}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Edit
              </Link>
            )}
            <Link
              href={`/admin/agencies/${String(detailsAgency._id)}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Open page
            </Link>
            <button
              type="button"
              onClick={() => setDetailsAgency(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </>
        ) : null}
      />
      <ConfirmDialog />
    </DashboardLayout>
  )
}

export default function AgenciesPage() {
  return <AgenciesPageContent />
}

