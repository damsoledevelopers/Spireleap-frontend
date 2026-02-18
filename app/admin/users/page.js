'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  MessageSquare,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Activity,
  Bed,
  Bath,
  Square,
  Car,
  Building,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Shield
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const { user, checkPermission } = useAuth()
  const router = useRouter()

  // Page access check
  useEffect(() => {
    if (user && !checkPermission('users', 'view')) {
      // toast.error('You do not have permission to view Users')
      // router.push('/admin/dashboard')
    }
  }, [user, checkPermission, router])

  const canCreateUser = checkPermission('users', 'create')
  const canEditUser = checkPermission('users', 'edit')
  const canDeleteUser = checkPermission('users', 'delete')
  const isSuperAdmin = user?.role === 'super_admin'

  const searchParams = useSearchParams()
  const [adminUsers, setAdminUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [userInquiries, setUserInquiries] = useState({}) // Store inquiries by user email
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [selectedUserInquiries, setSelectedUserInquiries] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedInquiry, setSelectedInquiry] = useState(null) // For viewing detailed inquiry

  // Check for tab parameter and redirect accordingly
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      switch (tab) {
        case 'agencies':
          router.replace('/admin/agencies')
          break
        case 'agents':
          router.replace('/admin/agents')
          break
        case 'staff':
          router.replace('/admin/staff')
          break
        case 'users':
          // Remove tab param to show users page
          router.replace('/admin/users')
          break
        default:
          // Invalid tab, remove param
          router.replace('/admin/users')
      }
    }
  }, [searchParams, router])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false) // Show/hide date picker
  const [inquiryFilter, setInquiryFilter] = useState('') // all, with_inquiries, without_inquiries
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, name, inquiries (for sorting logic only)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'user'
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  const fetchAdminUsers = async () => {
    try {
      setLoading(true)
      // Fetch only users with role 'user'
      const response = await api.get('/users?role=user')
      const users = response.data.users || []
      setAdminUsers(users)

      // Fetch inquiries for all users
      await fetchInquiriesForUsers(users)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchInquiriesForUsers = async (users) => {
    try {
      // Fetch all leads/inquiries in batches (max limit is 500 per request)
      let allLeads = []
      let page = 1
      const limit = 500 // Maximum allowed by backend
      let hasMore = true

      // Fetch leads in batches until all are fetched
      while (hasMore) {
        const response = await api.get(`/leads?page=${page}&limit=${limit}`)
        const leads = response.data.leads || []
        allLeads = [...allLeads, ...leads]

        // Check if there are more pages
        const pagination = response.data.pagination || {}
        hasMore = pagination.pages > pagination.page
        page++

        // Safety check to prevent infinite loop
        if (page > 100) {
          console.warn('Reached maximum pages limit (100)')
          break
        }
      }

      console.log(`✅ Fetched ${allLeads.length} total leads/inquiries`)

      // Group inquiries by user email
      const inquiriesByEmail = {}
      users.forEach(user => {
        const userEmail = user.email?.toLowerCase()
        if (userEmail) {
          inquiriesByEmail[userEmail] = allLeads.filter(lead => {
            const leadEmail = lead.contact?.email?.toLowerCase()
            return leadEmail === userEmail
          })
        }
      })

      // Debug: Log summary
      const totalMatched = Object.values(inquiriesByEmail).reduce((sum, arr) => sum + arr.length, 0)
      const usersWithInquiries = Object.keys(inquiriesByEmail).filter(email => inquiriesByEmail[email].length > 0).length
      console.log(`📊 Total inquiries matched to users: ${totalMatched}`)
      console.log(`📊 Users with inquiries: ${usersWithInquiries}`)

      setUserInquiries(inquiriesByEmail)
    } catch (error) {
      console.error('❌ Failed to fetch inquiries:', error)
      if (error.response?.data) {
        console.error('❌ Error details:', error.response.data)
      }
      // Don't show error toast as this is not critical, but log for debugging
    }
  }

  const handleViewInquiries = (user) => {
    const userEmail = user.email?.toLowerCase()
    const inquiries = userInquiries[userEmail] || []
    setSelectedUser(user)
    setSelectedUserInquiries(inquiries)
    setSelectedInquiry(null) // Reset selected inquiry
    setShowInquiryModal(true)
  }

  const handleViewFullDetails = (inquiry) => {
    const displayProperty = inquiry.property || inquiry.interestedProperties?.[0]?.property
    if (displayProperty?._id) {
      // Close modal and redirect to property details page
      setShowInquiryModal(false)
      setSelectedUser(null)
      setSelectedUserInquiries([])
      setSelectedInquiry(null)
      router.push(`/admin/properties/${displayProperty._id}`)
    }
  }

  const handleDeleteAdmin = async (adminId) => {
    if (adminId === user?.id) {
      toast.error('Cannot delete your own account')
      return
    }

    if (window.confirm('Are you sure you want to delete this admin user?')) {
      try {
        await api.delete(`/users/${adminId}`)
        toast.success('Admin user deleted successfully')
        fetchAdminUsers()
      } catch (error) {
        console.error('Delete admin error:', error)
        const errorMessage = error.response?.data?.message || 'Failed to delete admin user'
        toast.error(errorMessage)
      }
    }
  }

  const handleStatusChange = async (adminId, isActive) => {
    if (adminId === user?.id) {
      toast.error('Cannot change your own status')
      return
    }

    try {
      await api.put(`/users/${adminId}/status`, { isActive })
      toast.success('Admin user status updated')
      fetchAdminUsers()
    } catch (error) {
      console.error('Status change error:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update status'
      toast.error(errorMessage)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await api.post('/users', formData)
      toast.success('User added successfully!')
      setShowAddModal(false)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'user'
      })
      fetchAdminUsers()
    } catch (error) {
      console.error('Add user error:', error)
      const errorMessage = error.response?.data?.message || 'Failed to add user'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }


  // Calculate statistics
  const stats = {
    totalUsers: adminUsers.length,
    activeUsers: adminUsers.filter(u => u.isActive).length,
    inactiveUsers: adminUsers.filter(u => !u.isActive).length,
    usersWithInquiries: Object.keys(userInquiries).filter(email => (userInquiries[email]?.length || 0) > 0).length,
    totalInquiries: Object.values(userInquiries).reduce((sum, inquiries) => sum + (inquiries?.length || 0), 0)
  }

  // Filter users
  const filteredAdmins = adminUsers.filter(admin => {
    const matchesSearch = !searchTerm ||
      admin.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.phone?.includes(searchTerm)

    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && admin.isActive) ||
      (statusFilter === 'inactive' && !admin.isActive)

    // Date range filter
    let matchesDate = true
    if ((startDate || endDate) && admin.createdAt) {
      const created = new Date(admin.createdAt || admin.created_at)
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        matchesDate = created >= start
      }
      if (endDate && matchesDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        matchesDate = created <= end
      }
    }

    // Inquiry filter
    let matchesInquiry = true
    if (inquiryFilter && inquiryFilter !== 'all') {
      const userEmail = admin.email?.toLowerCase()
      const inquiryCount = userInquiries[userEmail]?.length || 0
      matchesInquiry = inquiryFilter === 'with_inquiries' ? inquiryCount > 0 : inquiryCount === 0
    }

    return matchesSearch && matchesStatus && matchesDate && matchesInquiry
  })

  // Sort users
  const sortedAdmins = [...filteredAdmins].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)
      case 'oldest':
        return new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0)
      case 'name':
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      case 'inquiries':
        const countA = userInquiries[a.email?.toLowerCase()]?.length || 0
        const countB = userInquiries[b.email?.toLowerCase()]?.length || 0
        return countB - countA
      default:
        return 0
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedAdmins.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAdmins = sortedAdmins.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, startDate, endDate, inquiryFilter])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalUsers}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{stats.activeUsers}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of total
                  </p>
                </div>
                <UserCheck className="h-10 w-10 text-green-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Inactive Users</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{stats.inactiveUsers}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-red-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Inquiries</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{stats.totalInquiries}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    {stats.usersWithInquiries} users
                  </p>
                </div>
                <MessageSquare className="h-10 w-10 text-purple-500 opacity-70" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">With Inquiries</p>
                  <p className="text-2xl font-bold text-orange-900 mt-1">{stats.usersWithInquiries}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    {stats.totalUsers > 0 ? Math.round((stats.usersWithInquiries / stats.totalUsers) * 100) : 0}% engaged
                  </p>
                </div>
                <Activity className="h-10 w-10 text-orange-500 opacity-70" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage all regular users
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range Filter Button - Left End */}
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
            {/* All Users Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white"
            >
              <option value="">All Users</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {/* Search Bar - Right End */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm min-w-[200px] bg-white"
              />
            </div>
            {/* Add User Button */}
            {canCreateUser && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
                Add User
              </button>
            )}
          </div>
        </div>


        {/* Admin Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary-600 to-primary-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    Inquiries
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No users found</p>
                      <p className="text-gray-400 text-sm mt-2">
                        {filteredAdmins.length === 0
                          ? 'Try adjusting your filters'
                          : 'No users on this page'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((admin) => (
                    <tr key={admin._id || admin.id} className="hover:bg-logo-beige transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {admin.firstName?.charAt(0)}{admin.lastName?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              <span className="text-gray-900">
                                {admin.firstName} {admin.lastName}
                              </span>
                              {admin._id === user?.id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {admin.company || 'Alvasco'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{admin.email}</div>
                        <div className="text-sm text-gray-500">{admin.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {admin.address ? (
                            <>
                              {admin.address.street && <div>{admin.address.street}</div>}
                              <div>
                                {[admin.address.city, admin.address.state, admin.address.zipCode]
                                  .filter(Boolean)
                                  .join(', ')}
                              </div>
                              {admin.address.country && <div className="text-gray-500 text-xs">{admin.address.country}</div>}
                            </>
                          ) : (
                            <span className="text-gray-400">No address</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {admin.createdAt || admin.created_at
                            ? new Date(admin.createdAt || admin.created_at).toLocaleDateString()
                            : '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {admin.createdAt || admin.created_at
                            ? new Date(admin.createdAt || admin.created_at).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                            : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(() => {
                          const userEmail = admin.email?.toLowerCase()
                          const inquiryCount = userInquiries[userEmail]?.length || 0
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-semibold text-gray-900">{inquiryCount}</span>
                              {inquiryCount > 0 && (
                                <button
                                  onClick={() => handleViewInquiries(admin)}
                                  className="text-xs text-primary-600 hover:text-primary-800 underline"
                                  title="View inquiries"
                                >
                                  View
                                </button>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {admin.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            href={`/admin/users/${String(admin._id || admin.id)}`}
                            className="text-gray-600 hover:text-primary-600 transition-colors"
                            title="View details"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          {isSuperAdmin && (
                            <Link
                              href={`/admin/permissions?type=user&id=${String(admin._id || admin.id)}`}
                              className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              title="Permissions (this user only)"
                            >
                              <Shield className="h-5 w-5" />
                            </Link>
                          )}
                          {canEditUser && (
                            <Link
                              href={`/admin/users/${String(admin._id || admin.id)}/edit`}
                              className="text-primary-600 hover:text-primary-900 transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-5 w-5" />
                            </Link>
                          )}
                          {admin._id !== user?.id && (
                            <>
                              {canDeleteUser && (
                                <button
                                  onClick={() => handleDeleteAdmin(admin._id || admin.id)}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                              {canEditUser && (
                                <button
                                  onClick={() => handleStatusChange(admin._id || admin.id, !admin.isActive)}
                                  className={`px-2 py-1 text-xs rounded ${admin.isActive
                                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                    }`}
                                  title={admin.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {admin.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, sortedAdmins.length)}</span> of{' '}
                    <span className="font-medium">{sortedAdmins.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Admin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add User</h3>
              <form onSubmit={handleAddUser}>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-input"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setFormData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        password: '',
                        role: 'user'
                      })
                    }}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Adding...' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Inquiry Details Modal */}
        {showInquiryModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Inquiries for {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedUser.email} • Total: {selectedUserInquiries.length} inquiries
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowInquiryModal(false)
                    setSelectedUser(null)
                    setSelectedUserInquiries([])
                    setSelectedInquiry(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedUserInquiries.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No inquiries found for this user</p>
                  </div>
                ) : (
                  // Table View
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Property
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedUserInquiries.map((inquiry, index) => {
                          // Use main property or first interested property so name/location/price show when main property is missing
                          const displayProperty = inquiry.property || inquiry.interestedProperties?.[0]?.property
                          const propertyPrice = displayProperty?.price
                            ? (typeof displayProperty.price === 'object'
                              ? (displayProperty.price.sale
                                ? `₹${Number(displayProperty.price.sale).toLocaleString()}`
                                : displayProperty.price.rent?.amount
                                  ? `₹${Number(displayProperty.price.rent.amount).toLocaleString()}/${displayProperty.price.rent.period || 'month'}`
                                  : 'Price on request')
                              : `₹${Number(displayProperty.price).toLocaleString()}`)
                            : 'Price on request'

                          return (
                            <tr key={inquiry._id || inquiry.id || index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  {displayProperty?.images && displayProperty.images.length > 0 && (
                                    <img
                                      src={typeof displayProperty.images[0] === 'string'
                                        ? displayProperty.images[0]
                                        : displayProperty.images[0]?.url || '/placeholder-property.jpg'}
                                      alt={displayProperty?.title || 'Property'}
                                      className="h-10 w-10 rounded object-cover"
                                      onError={(e) => {
                                        e.target.src = '/placeholder-property.jpg'
                                      }}
                                    />
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {displayProperty?.title || displayProperty?.slug || '—'}
                                    </p>
                                    {displayProperty?.location && (
                                      <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {displayProperty.location.city || displayProperty.location.address || 'Location'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${inquiry.status === 'new'
                                    ? 'bg-blue-100 text-blue-800'
                                    : inquiry.status === 'contacted'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : inquiry.status === 'qualified'
                                        ? 'bg-green-100 text-green-800'
                                        : inquiry.status === 'booked'
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-gray-100 text-gray-800'
                                    }`}
                                >
                                  {inquiry.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {inquiry.priority && (
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${inquiry.priority === 'hot'
                                      ? 'bg-red-100 text-red-800'
                                      : inquiry.priority === 'warm'
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-blue-100 text-blue-800'
                                      }`}
                                  >
                                    {inquiry.priority.toUpperCase()}
                                  </span>
                                )}
                                {!inquiry.priority && (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {inquiry.createdAt || inquiry.created_at
                                  ? new Date(inquiry.createdAt || inquiry.created_at).toLocaleDateString()
                                  : 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {propertyPrice}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => handleViewFullDetails(inquiry)}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Full Details
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowInquiryModal(false)
                    setSelectedUser(null)
                    setSelectedUserInquiries([])
                    setSelectedInquiry(null)
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}









