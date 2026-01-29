'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Users, Plus, Edit, Trash2, Package, TrendingUp, Search, CheckCircle, UserX, Filter, X, ChevronUp, ChevronDown, Briefcase, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export function StaffPageContent() {
  const { user, checkPermission } = useAuth()
  const router = useRouter()

  // Dynamic Permission Flags
  const canViewStaff = checkPermission('users', 'view')
  const canCreateStaff = checkPermission('users', 'create')
  const canEditStaff = checkPermission('users', 'edit')
  const canDeleteStaff = checkPermission('users', 'delete')
  const isSuperAdmin = user?.role === 'super_admin'

  // Page access check
  useEffect(() => {
    if (user && !canViewStaff) {
      // toast.error('You do not have permission to view staff')
      // router.push('/admin/dashboard')
    }
  }, [user, canViewStaff, router])

  const [staff, setStaff] = useState([])
  const [allStaff, setAllStaff] = useState([]) // Store all staff for metrics calculation
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [staffMetrics, setStaffMetrics] = useState({
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    totalProperties: 0,
    totalLeads: 0
  })
  const [statusFilter, setStatusFilter] = useState('') // Filter by status (active/inactive)
  const [departmentFilter, setDepartmentFilter] = useState('') // Filter by department
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
  }, [searchTerm, statusFilter, departmentFilter, startDate, endDate])

  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timer = setTimeout(() => {
      fetchStaff()
    }, statusFilter ? 0 : 300) // No debounce for status filter for immediate feedback

    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, departmentFilter, startDate, endDate, sortColumn, sortDirection, pagination.current])

  useEffect(() => {
    fetchMetrics()
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        role: 'staff',
        page: pagination.current || 1,
        limit: pagination.limit || 20
      })
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (statusFilter) {
        params.append('isActive', statusFilter === 'active' ? 'true' : 'false')
      }

      if (departmentFilter) {
        params.append('department', departmentFilter)
      }

      if (startDate) {
        params.append('startDate', startDate)
      }
      if (endDate) {
        params.append('endDate', endDate)
      }

      const response = await api.get(`/users?${params.toString()}`)
      let fetchedStaff = response.data.users || []

      // Update pagination from response
      if (response.data.pagination) {
        setPagination(prev => ({
          ...prev,
          pages: response.data.pagination.pages || prev.pages,
          total: response.data.pagination.total || prev.total,
          current: response.data.pagination.current || prev.current
        }))
      }

      // Apply client-side sorting if needed
      if (sortColumn) {
        fetchedStaff = [...fetchedStaff].sort((a, b) => {
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
            case 'name':
              aValue = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase()
              bValue = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase()
              break
            default:
              return 0
          }
          if (sortDirection === 'asc') {
            return aValue > bValue ? 1 : -1
          } else {
            return aValue < bValue ? 1 : -1
          }
        })
      }

      setStaff(fetchedStaff)
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast.error('Failed to load staff')
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
    setDepartmentFilter('')
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    fetchStaff()
  }

  const hasActiveFilters = () => {
    return statusFilter !== '' || departmentFilter !== '' || searchTerm.trim() !== '' || startDate !== '' || endDate !== ''
  }

  const fetchMetrics = async () => {
    try {
      // Use the optimized dashboard stats endpoint
      const response = await api.get('/stats/dashboard')
      const stats = response.data

      setStaffMetrics({
        totalStaff: stats.totalStaff || 0,
        activeStaff: stats.activeStaff || 0,
        inactiveStaff: stats.inactiveStaff || 0,
        totalProperties: stats.totalProperties || 0,
        totalLeads: stats.totalLeads || 0
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return

    try {
      await api.delete(`/users/${id}`)
      toast.success('Staff member deleted successfully')
      fetchStaff()
      fetchMetrics()
    } catch (error) {
      console.error('Error deleting staff:', error)
      toast.error('Failed to delete staff member')
    }
  }

  const getDepartmentLabel = (dept) => {
    const labels = {
      accounts: 'Accounts',
      hr: 'HR',
      support: 'Support',
      marketing: 'Marketing',
      other: 'Other'
    }
    return labels[dept] || dept || '-'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Staff Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{staffMetrics.totalStaff}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Active Staff</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{staffMetrics.activeStaff}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Inactive Staff</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{staffMetrics.inactiveStaff}</p>
              </div>
              <UserX className="h-10 w-10 text-red-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{staffMetrics.totalProperties}</p>
              </div>
              <Package className="h-10 w-10 text-orange-500 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow-sm p-4 border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{staffMetrics.totalLeads}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-teal-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
            <p className="mt-1 text-sm text-gray-500">Manage all staff members</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium min-w-[150px]"
            >
              <option value="">All Departments</option>
              <option value="accounts">Accounts</option>
              <option value="hr">HR</option>
              <option value="support">Support</option>
              <option value="marketing">Marketing</option>
              <option value="other">Other</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff..."
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
                      fetchStaff()
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
                          fetchStaff()
                        }}
                        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => {
                          setShowDatePicker(false)
                          fetchStaff()
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
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            )}
            {canCreateStaff && (
              <Link href="/admin/staff/add" className="btn btn-primary">
                <Plus className="h-5 w-5 mr-2" />
                Add Staff
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No staff found</p>
            {canCreateStaff && (
              <Link href="/admin/staff/add" className="btn btn-primary mt-4">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Staff Member
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
                        Profile
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          Name
                          {sortColumn === 'name' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        Position
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
                    {staff.map((member) => (
                      <tr key={String(member._id)} className="hover:bg-logo-beige transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {member.profileImage ? (
                            <img
                              src={member.profileImage}
                              alt={`${member.firstName} ${member.lastName}`}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {member.firstName} {member.lastName}
                          </div>
                          {member.staffInfo?.employeeId && (
                            <div className="text-xs text-gray-500">ID: {member.staffInfo.employeeId}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getDepartmentLabel(member.staffInfo?.department)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {member.staffInfo?.position || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {member.isActive ? (
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
                          {member.createdAt || member.created_at ? (
                            new Date(member.createdAt || member.created_at).toLocaleDateString()
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.updatedAt || member.updated_at ? (
                            <div className="flex flex-col">
                              <span>{new Date(member.updatedAt || member.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <span className="text-xs text-gray-500">{new Date(member.updatedAt || member.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center gap-3">
                            {isSuperAdmin && (
                              <Link
                                href={`/admin/permissions?type=staff&id=${String(member._id)}`}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                title="Permissions (this staff only)"
                              >
                                <Shield className="h-5 w-5" />
                              </Link>
                            )}
                            {canEditStaff && (
                              <Link
                                href={`/admin/staff/${String(member._id)}/edit`}
                                className="text-primary-600 hover:text-primary-900 transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-5 w-5" />
                              </Link>
                            )}
                            {canDeleteStaff && (
                              <button
                                onClick={() => handleDelete(member._id)}
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
                    {' staff members'}
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

export default function StaffPage() {
  return <StaffPageContent />
}

