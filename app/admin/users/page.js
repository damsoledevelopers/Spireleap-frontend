'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import DetailsModal from '../../../components/Common/DetailsModal'
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
  Shield,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import PhoneField from '../../../components/Common/PhoneField'
import { buildE164Phone, DEFAULT_COUNTRY_CODE } from '../../../lib/phone'
import SearchableSelect from '../../../components/Common/SearchableSelect'
import { useConfirmDialog } from '../../../components/Common/useConfirmDialog'
import { validateConfirmPassword, validateEmail, validateName, validatePassword } from '../../../lib/validation'
import { scrollToFirstErrorField } from '../../../lib/scrollToError'
import {
  sanitizePostalDigits,
  isValidOptionalPostalDigits,
  OPTIONAL_POSTAL_DIGITS_MESSAGE
} from '../../../lib/postalCode'

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
  const [detailsUser, setDetailsUser] = useState(null)

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
  const [showAddUserPassword, setShowAddUserPassword] = useState(false)
  const [showAddUserConfirmPassword, setShowAddUserConfirmPassword] = useState(false)
  const [addUserErrors, setAddUserErrors] = useState({})
  const [geo, setGeo] = useState({ countries: [], states: [], cities: [] })
  const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false })
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    }
  })
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [submitting, setSubmitting] = useState(false)
  const sanitizeName = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
  const sanitizeAlphaText = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  useEffect(() => {
    fetchCountries()
  }, [])

  useEffect(() => {
    fetchStates(formData.address.country)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.address.country])

  useEffect(() => {
    fetchCities(formData.address.country, formData.address.state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.address.country, formData.address.state])

  const fetchCountries = async () => {
    try {
      setGeoLoading((p) => ({ ...p, countries: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions')
      const data = await res.json()
      const countries = Array.isArray(data?.data)
        ? data.data.map((c) => String(c?.name || '').trim()).filter(Boolean)
        : []
      countries.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, countries }))
    } catch (error) {
      console.error('Error fetching countries:', error)
      setGeo((p) => ({ ...p, countries: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, countries: false }))
    }
  }

  const fetchStates = async (country) => {
    if (!country) {
      setGeo((p) => ({ ...p, states: [], cities: [] }))
      setFormData((prev) => ({ ...prev, address: { ...prev.address, state: '', city: '' } }))
      return
    }
    try {
      setGeoLoading((p) => ({ ...p, states: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      })
      const data = await res.json()
      const states = Array.isArray(data?.data?.states)
        ? data.data.states.map((s) => String(s?.name || '').trim()).filter(Boolean)
        : []
      states.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, states, cities: [] }))
      setFormData((prev) => {
        const currentState = prev.address.state
        if (!currentState || states.includes(currentState)) return prev
        return { ...prev, address: { ...prev.address, state: '', city: '' } }
      })
    } catch (error) {
      console.error('Error fetching states:', error)
      setGeo((p) => ({ ...p, states: [], cities: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, states: false }))
    }
  }

  const fetchCities = async (country, state) => {
    if (!country || !state) {
      setGeo((p) => ({ ...p, cities: [] }))
      setFormData((prev) => ({ ...prev, address: { ...prev.address, city: '' } }))
      return
    }
    try {
      setGeoLoading((p) => ({ ...p, cities: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state })
      })
      const data = await res.json()
      const cities = Array.isArray(data?.data)
        ? data.data.map((c) => String(c || '').trim()).filter(Boolean)
        : []
      cities.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, cities }))
      setFormData((prev) => {
        const currentCity = prev.address.city
        if (!currentCity || cities.includes(currentCity)) return prev
        return { ...prev, address: { ...prev.address, city: '' } }
      })
    } catch (error) {
      console.error('Error fetching cities:', error)
      setGeo((p) => ({ ...p, cities: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, cities: false }))
    }
  }

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

    const ok = await confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this admin user?',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) return

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
      const nextErrors = {}
      nextErrors.firstName = validateName(formData.firstName, 'First name')
      nextErrors.lastName = validateName(formData.lastName, 'Last name')
      nextErrors.email = validateEmail(formData.email, 'Email')
      nextErrors.password = validatePassword(formData.password)
      nextErrors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword)
      const e164Phone = formData.phone ? buildE164Phone(phoneCountryCode, formData.phone) : ''
      if (formData.phone && !e164Phone) {
        nextErrors.phone = 'Enter a valid phone number for the selected country'
      }
      if (!isValidOptionalPostalDigits(formData.address?.zipCode)) {
        nextErrors['address.zipCode'] = OPTIONAL_POSTAL_DIGITS_MESSAGE
      }
      Object.keys(nextErrors).forEach((k) => {
        if (!nextErrors[k]) delete nextErrors[k]
      })
      setAddUserErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        scrollToFirstErrorField(Object.keys(nextErrors))
        return
      }

      const cleanedAddress = {}
      Object.entries(formData.address || {}).forEach(([k, v]) => {
        const trimmed = typeof v === 'string' ? v.trim() : v
        if (trimmed) cleanedAddress[k] = trimmed
      })

      const payload = {
        ...formData,
        phone: e164Phone || formData.phone,
        address: cleanedAddress
      }
      if (Object.keys(cleanedAddress).length === 0) {
        delete payload.address
      }
      delete payload.confirmPassword
      await api.post('/users', payload)
      toast.success('User added successfully!')
      setShowAddModal(false)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: ''
        }
      })
      setPhoneCountryCode(DEFAULT_COUNTRY_CODE)
      setAddUserErrors({})
      setShowAddUserPassword(false)
      setShowAddUserConfirmPassword(false)
      fetchAdminUsers()
    } catch (error) {
      console.error('Add user error:', error)
      const errorMessage = error.response?.data?.message || 'Failed to add user'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const closeAddUserModal = () => {
    setShowAddModal(false)
    setPhoneCountryCode(DEFAULT_COUNTRY_CODE)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      }
    })
    setAddUserErrors({})
    setShowAddUserPassword(false)
    setShowAddUserConfirmPassword(false)
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
                  {/* <p className="text-xs text-green-600 mt-1">
                    {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of total
                  </p> */}
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
                  {/* <p className="text-xs text-purple-600 mt-1">
                    {stats.usersWithInquiries} users
                  </p> */}
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
                  {/* <p className="text-xs text-orange-600 mt-1">
                    {stats.totalUsers > 0 ? Math.round((stats.usersWithInquiries / stats.totalUsers) * 100) : 0}% engaged
                  </p> */}
                </div>
                <Activity className="h-10 w-10 text-orange-500 opacity-70" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 flex-wrap overflow-visible">
          {/* Date Range Filter Button - Left End */}
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
                <div className="filter-popover filter-popover-start filter-popover-lg p-4">
                  <div className="flex flex-col sm:flex-row items-stretch gap-4">
                    <div className="flex-1 min-w-0">
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
                    <div className="flex-1 min-w-0">
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
          <SearchableSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Users' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            placeholder="All Users"
            buttonClassName="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white min-w-[150px]"
            searchPlaceholder="Search..."
          />
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
              className="btn-primary flex items-center gap-2 bg-primary-600 hover:bg-primary-700 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          )}
        </div>


        {/* Admin Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="table-scroll">
          <table className="w-full min-w-[960px] table-fixed divide-y divide-gray-200">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[26%]" />
              <col className="w-32" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-32" />
            </colgroup>
            <thead className="bg-gradient-to-r from-primary-600 to-primary-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                  Inquiries
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAdmins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
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
                    <td className="px-4 py-4 min-w-0">
                      <button
                        type="button"
                        onClick={() => setDetailsUser(admin)}
                        className="text-left w-full focus:outline-none"
                        title="View details"
                      >
                        <div className="flex items-center min-w-0">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {admin.firstName?.charAt(0)}{admin.lastName?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              <span className="text-gray-900 hover:text-primary-700">
                                {admin.firstName} {admin.lastName}
                              </span>
                              {admin._id === user?.id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            {admin.company && (
                              <div className="text-xs text-gray-500 truncate">{admin.company}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate" title={admin.email || ''}>
                      {admin.email || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 truncate" title={admin.phone || ''}>
                      {admin.phone || '—'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {(() => {
                        const userEmail = admin.email?.toLowerCase()
                        const inquiryCount = userInquiries[userEmail]?.length || 0
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold text-gray-900">{inquiryCount}</span>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-4 text-center">
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
                    <td className="px-4 py-4 text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/users/${String(admin._id || admin.id)}`}
                          className="text-gray-600 hover:text-primary-600 transition-colors"
                          title="Open page"
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
                        {admin._id !== user?.id && canDeleteUser && (
                          <button
                            onClick={() => handleDeleteAdmin(admin._id || admin.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="mb-4 relative bg-[#FEE2E2] px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-bold text-gray-900 text-center">Add User</h3>
                <button
                  type="button"
                  onClick={closeAddUserModal}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label="Close add user modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-6 pb-6">
                <form onSubmit={handleAddUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label block text-sm font-bold text-gray-900 mb-1">First Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                      <input
                        type="text"
                        className={`form-input ${addUserErrors.firstName ? 'border-red-500' : ''}`}
                        required
                        placeholder="Enter first name"
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({ ...formData, firstName: sanitizeName(e.target.value) })
                          if (addUserErrors.firstName) {
                            setAddUserErrors((prev) => {
                              const next = { ...prev }
                              delete next.firstName
                              return next
                            })
                          }
                        }}
                      />
                      {addUserErrors.firstName && (
                        <p className="mt-1 text-xs font-semibold text-red-600">{addUserErrors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label block text-sm font-bold text-gray-900 mb-1">Last Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                      <input
                        type="text"
                        className={`form-input ${addUserErrors.lastName ? 'border-red-500' : ''}`}
                        required
                        placeholder="Enter last name"
                        value={formData.lastName}
                        onChange={(e) => {
                          setFormData({ ...formData, lastName: sanitizeName(e.target.value) })
                          if (addUserErrors.lastName) {
                            setAddUserErrors((prev) => {
                              const next = { ...prev }
                              delete next.lastName
                              return next
                            })
                          }
                        }}
                      />
                      {addUserErrors.lastName && (
                        <p className="mt-1 text-xs font-semibold text-red-600">{addUserErrors.lastName}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label block text-sm font-bold text-gray-900 mb-1">Email<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                      <input
                        type="email"
                        className={`form-input ${addUserErrors.email ? 'border-red-500' : ''}`}
                        required
                        placeholder="Enter email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value })
                          if (addUserErrors.email) {
                            setAddUserErrors((prev) => {
                              const next = { ...prev }
                              delete next.email
                              return next
                            })
                          }
                        }}
                      />
                      {addUserErrors.email && (
                        <p className="mt-1 text-xs font-semibold text-red-600">{addUserErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label block text-sm font-bold text-gray-900 mb-1">Phone</label>
                      <PhoneField
                        label=""
                        countryCodeName="phoneCountryCode"
                        phoneName="phone"
                        countryCodeValue={phoneCountryCode}
                        phoneValue={formData.phone}
                        onCountryCodeChange={(value) => setPhoneCountryCode(value)}
                        onPhoneChange={(value) => {
                          setFormData((prev) => ({ ...prev, phone: value }))
                          if (addUserErrors.phone) {
                            setAddUserErrors((prev) => {
                              const next = { ...prev }
                              delete next.phone
                              return next
                            })
                          }
                        }}
                        showInlineError={Boolean(formData.phone)}
                      />
                      {addUserErrors.phone && (
                        <p className="mt-1 text-xs font-semibold text-red-600">{addUserErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label block text-sm font-bold text-gray-900 mb-1">Password<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                      <div className="relative">
                        <input
                          type={showAddUserPassword ? 'text' : 'password'}
                          className={`form-input pr-10 ${addUserErrors.password ? 'border-red-500' : ''}`}
                          required
                          placeholder="Enter password"
                          value={formData.password}
                          onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value })
                            if (addUserErrors.password || addUserErrors.confirmPassword) {
                              setAddUserErrors((prev) => {
                                const next = { ...prev }
                                delete next.password
                                delete next.confirmPassword
                                return next
                              })
                            }
                          }}
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowAddUserPassword((p) => !p)}
                          aria-label={showAddUserPassword ? 'Hide password' : 'Show password'}
                        >
                          {showAddUserPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                      {addUserErrors.password && (
                        <p className="mt-1 text-xs font-semibold text-red-600">{addUserErrors.password}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label block text-sm font-bold text-gray-900 mb-1">Confirm Password<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                      <div className="relative">
                        <input
                          type={showAddUserConfirmPassword ? 'text' : 'password'}
                          className={`form-input pr-10 ${addUserErrors.confirmPassword ? 'border-red-500' : ''}`}
                          required
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={(e) => {
                            setFormData({ ...formData, confirmPassword: e.target.value })
                            if (addUserErrors.confirmPassword) {
                              setAddUserErrors((prev) => {
                                const next = { ...prev }
                                delete next.confirmPassword
                                return next
                              })
                            }
                          }}
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowAddUserConfirmPassword((p) => !p)}
                          aria-label={showAddUserConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showAddUserConfirmPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                      {addUserErrors.confirmPassword && (
                        <p className="mt-1 text-xs font-semibold text-red-600">{addUserErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="mt-6">
                    <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-900 mb-1">Street</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.address.street}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            address: { ...prev.address, street: e.target.value }
                          }))}
                          placeholder="Enter street address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Country</label>
                        <select
                          className="form-input"
                          value={formData.address.country}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            address: { ...prev.address, country: e.target.value }
                          }))}
                        >
                          <option value="">{geoLoading.countries ? 'Loading countries...' : 'Select country'}</option>
                          {geo.countries.map((country) => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">State</label>
                        <select
                          className="form-input disabled:bg-gray-100"
                          value={formData.address.state}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            address: { ...prev.address, state: e.target.value }
                          }))}
                          disabled={!formData.address.country || geoLoading.states}
                        >
                          <option value="">{geoLoading.states ? 'Loading states...' : 'Select state'}</option>
                          {geo.states.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">City</label>
                        <select
                          className="form-input disabled:bg-gray-100"
                          value={formData.address.city}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            address: { ...prev.address, city: e.target.value }
                          }))}
                          disabled={!formData.address.state || geoLoading.cities}
                        >
                          <option value="">{geoLoading.cities ? 'Loading cities...' : 'Select city'}</option>
                          {geo.cities.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">ZIP Code</label>
                        <input
                          type="text"
                          className={`form-input ${addUserErrors['address.zipCode'] ? 'border-red-500' : ''}`}
                          value={formData.address.zipCode}
                          onChange={(e) => {
                            const cleaned = sanitizePostalDigits(e.target.value)
                            setFormData((prev) => ({
                              ...prev,
                              address: { ...prev.address, zipCode: cleaned }
                            }))
                            if (addUserErrors['address.zipCode']) {
                              setAddUserErrors((prev) => {
                                const next = { ...prev }
                                delete next['address.zipCode']
                                return next
                              })
                            }
                          }}
                          placeholder="Enter ZIP code"
                        />
                        {(formData.address.zipCode && !isValidOptionalPostalDigits(formData.address.zipCode)) || addUserErrors['address.zipCode'] ? (
                          <p className="mt-1 text-xs font-semibold text-red-600">
                            {addUserErrors['address.zipCode'] || OPTIONAL_POSTAL_DIGITS_MESSAGE}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={closeAddUserModal}
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
                  <div className="table-scroll">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-sm">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Property
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Created Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedUserInquiries.map((inquiry, index) => {
                          // Use main property or first interested property so name/location/price show when main property is missing
                          const displayProperty = inquiry.property || inquiry.interestedProperties?.[0]?.property
                          const toRupee = (value) => {
                            const numeric = Number(value)
                            return Number.isFinite(numeric) ? `₹${numeric.toLocaleString()}` : null
                          }
                          const propertyPrice = displayProperty?.price
                            ? (typeof displayProperty.price === 'object'
                              ? (displayProperty.price.sale !== undefined && displayProperty.price.sale !== null && displayProperty.price.sale !== ''
                                ? (toRupee(displayProperty.price.sale) || 'N/A')
                                : (displayProperty.price.rent?.amount !== undefined && displayProperty.price.rent?.amount !== null && displayProperty.price.rent?.amount !== '')
                                  ? (() => {
                                    const rentAmount = toRupee(displayProperty.price.rent.amount)
                                    return rentAmount ? `${rentAmount}/${displayProperty.price.rent.period || 'month'}` : 'N/A'
                                  })()
                                  : 'Price on request')
                              : (toRupee(displayProperty.price) || 'N/A'))
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

      <DetailsModal
        isOpen={!!detailsUser}
        onClose={() => setDetailsUser(null)}
        title={detailsUser ? `${detailsUser.firstName || ''} ${detailsUser.lastName || ''}`.trim() || 'User' : ''}
        subtitle={detailsUser?.email}
        avatar={
          detailsUser ? (
            <div className="h-14 w-14 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-base font-semibold text-gray-700">
                {detailsUser.firstName?.charAt(0)}{detailsUser.lastName?.charAt(0)}
              </span>
            </div>
          ) : null
        }
        sections={detailsUser ? [
          {
            title: 'Contact',
            items: [
              { label: 'Email', value: detailsUser.email },
              { label: 'Phone', value: detailsUser.phone },
              { label: 'Company', value: detailsUser.company },
              {
                label: 'Status',
                value: detailsUser.isActive ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                ),
              },
            ],
          },
          detailsUser.address ? {
            title: 'Address',
            items: [
              { label: 'Street', value: detailsUser.address.street },
              { label: 'Country', value: detailsUser.address.country },
              { label: 'State', value: detailsUser.address.state },
              { label: 'City', value: detailsUser.address.city },
              { label: 'Zip code', value: detailsUser.address.zipCode },
            ],
          } : null,
          {
            title: 'Activity',
            items: [
              {
                label: 'Inquiries',
                value: userInquiries[detailsUser.email?.toLowerCase()]?.length || 0,
              },
              { label: 'Registered', value: formatDateTime(detailsUser.createdAt || detailsUser.created_at) },
            ],
          },
        ].filter(Boolean) : []}
        actions={detailsUser ? (
          <>
            {canEditUser && (
              <Link
                href={`/admin/users/${String(detailsUser._id || detailsUser.id)}/edit`}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Edit
              </Link>
            )}
            <Link
              href={`/admin/users/${String(detailsUser._id || detailsUser.id)}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Open page
            </Link>
            <button
              type="button"
              onClick={() => setDetailsUser(null)}
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









