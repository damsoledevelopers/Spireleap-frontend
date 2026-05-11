'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { getAddressLabeledRows } from '../../../../lib/formatAddress'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  MessageSquare,
  CheckSquare,
  Edit,
  Save,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  GitMerge,
  Search,
  TrendingUp,
  Target,
  Building,
  DollarSign,
  Activity,
  Zap,
  Timer,
  Briefcase,
  Download,
  Upload,
  Trash2,
  Eye,
  RotateCcw,
  Home,
  ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useConfirmDialog } from '../../../../components/Common/useConfirmDialog'

export default function AdminLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, checkPermission, loading: authLoading, permissionsLoaded, permissions } = useAuth()

  // Dynamic permissions from permission module - only check after permissions are loaded
  const canViewLead = permissionsLoaded ? checkPermission('leads', 'view') : false
  const canEditLead = permissionsLoaded ? checkPermission('leads', 'edit') : false
  const canDeleteLead = permissionsLoaded ? checkPermission('leads', 'delete') : false
  const canCreateLead = permissionsLoaded ? checkPermission('leads', 'create') : false
  const canCreateUser = permissionsLoaded ? checkPermission('users', 'create') : false

  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [convertingToClient, setConvertingToClient] = useState(false)

  useEffect(() => {
    // Wait for auth and permissions to load before checking
    if (authLoading || !permissionsLoaded) {
      return
    }

    if (!user) {
      return
    }

    // Check view permission only after permissions are loaded
    if (!canViewLead) {
      toast.error('You do not have permission to view leads')
      router.push('/admin/leads')
      return
    }

    // Fetch data only if user has view permission
    if (canViewLead) {
      fetchLead()
    }
  }, [params.id, user, canViewLead, router, authLoading, permissionsLoaded])

  const fetchLead = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/leads/${params.id}`)
      setLead(response.data.lead)
    } catch (error) {
      console.error('Error fetching lead data:', error)
      toast.error('Failed to load lead details')
      router.push('/admin/leads')
    } finally {
      setLoading(false)
    }
  }

  const convertLeadToClient = async () => {
    const id = params.id
    if (!id || !lead?.contact?.email) {
      toast.error('This lead needs an email to convert to a client.')
      return
    }
    const ok = await confirm({
      title: 'Convert lead to client',
      message:
        'This creates a client account from this lead and removes the lead. The client can use Forgot password on the login page to set their password.',
      confirmText: 'Convert to client',
      cancelText: 'Cancel',
      tone: 'primary'
    })
    if (!ok) return
    try {
      setConvertingToClient(true)
      await api.post(`/leads/${id}/convert-to-client`, {})
      toast.success('Lead converted to client successfully.')
      router.push('/admin/leads')
    } catch (error) {
      console.error('Convert to client error:', error)
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.msg ||
        'Failed to convert lead to client'
      toast.error(msg)
    } finally {
      setConvertingToClient(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      new: { color: 'bg-blue-50 text-blue-600', icon: AlertCircle },
      contacted: { color: 'bg-yellow-50 text-yellow-600', icon: Clock },
      site_visit: { color: 'bg-purple-50 text-purple-600', icon: Calendar },
      negotiation: { color: 'bg-orange-50 text-orange-600', icon: MessageSquare },
      booked: { color: 'bg-[#E8F2FF] text-[#3B82F6]', icon: CheckCircle },
      closed: { color: 'bg-green-50 text-green-600', icon: CheckCircle },
      lost: { color: 'bg-red-50 text-red-600', icon: XCircle }
    }
    const badge = badges[status?.toLowerCase()] || badges.new
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${badge.color}`}>
        {badge.icon && <Icon className="h-3 w-3" />}
        {status?.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      hot: 'bg-red-50 text-red-600',
      warm: 'bg-[#FEF3C7] text-[#D97706]',
      cold: 'bg-blue-50 text-blue-600',
      not_interested: 'bg-gray-50 text-gray-600'
    }
    const p = String(priority || 'warm').toLowerCase()
    const colorClass = colors[p] || colors.warm
    return (
      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
        {priority?.toString().toUpperCase() || 'WARM'}
      </span>
    )
  }

  // Show loading while auth or permissions are loading
  if (authLoading || !permissionsLoaded || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!lead) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Simple Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/admin/leads" className="text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              {canEditLead && canCreateUser && lead?.contact?.email && (
                <button
                  type="button"
                  onClick={convertLeadToClient}
                  disabled={convertingToClient}
                  className="px-4 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {convertingToClient ? 'Converting…' : 'Convert to client'}
                </button>
              )}
              {canEditLead && (
                <Link
                  href={`/admin/leads/${params.id}/edit`}
                  className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {lead.contact.firstName} {lead.contact.lastName}
            </h1>
            <div className="flex items-center gap-2">
              {getStatusBadge(lead.status)}
              {getPriorityBadge(lead.priority)}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <span>{lead.contact.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              <span>{lead.contact.phone}</span>
            </div>
            {lead.leadId && (
              <div className="flex items-center gap-1.5">
                <span className="bg-gray-50 px-2 py-0.5 rounded text-xs text-gray-500 border border-gray-200">
                  {lead.leadId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Simple Details Content */}
        <div className="space-y-4">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="p-1.5 bg-[#700E08]/10 rounded-lg">
                  <User className="h-5 w-5 text-[#700E08]" />
                </div>
                Contact Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 transition-all hover:border-[#700E08]/20 group">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 block group-hover:text-[#700E08] transition-colors">Full Name</label>
                  <p className="text-lg font-semibold text-gray-900">{lead.contact.firstName} {lead.contact.lastName}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 transition-all hover:border-[#700E08]/20 group">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 block group-hover:text-[#700E08] transition-colors">Email Address</label>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg">
                      <Mail className="h-4 w-4 text-[#700E08]" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{lead.contact.email}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 transition-all hover:border-[#700E08]/20 group">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 block group-hover:text-[#700E08] transition-colors">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg">
                      <Phone className="h-4 w-4 text-[#700E08]" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{lead.contact.phone}</p>
                  </div>
                </div>
              </div>
              {getAddressLabeledRows(lead.contact.address).length > 0 ? (
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 flex flex-col justify-center">
                  <div className="mb-4">
                    <div className="p-2 bg-[#700E08]/10 rounded-lg w-fit mb-3">
                      <MapPin className="h-6 w-6 text-[#700E08]" />
                    </div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Physical Address</label>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {getAddressLabeledRows(lead.contact.address).map(({ label, value }) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
                          <dd className="text-lg font-semibold text-gray-900 leading-snug whitespace-pre-line break-words">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <MapPin className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-400">No address provided</p>
                </div>
              )}
            </div>
          </div>

          {/* Lead Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <Briefcase className="h-5 w-5 text-indigo-600" />
              </div>
              Lead Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Lead ID', value: lead.leadId || `LEAD-${String(lead._id).slice(-6)}`, icon: Building },
                { label: 'Source', value: lead.source || 'N/A', icon: Target },
                { label: 'Campaign', value: lead.campaignName || 'N/A', icon: TrendingUp },
                { label: 'Created', value: new Date(lead.createdAt).toLocaleDateString(), icon: Calendar }
              ].map((stat, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="h-4 w-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase">{stat.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Assigned Agent</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {lead.assignedAgent ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}` : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Agency</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {lead.agency && typeof lead.agency === 'object' ? lead.agency.name : 'Independent'}
                  </span>
                </div>
              </div>
              {lead.property && (
                <div className="mt-4 p-3 bg-[#700E08]/5 rounded-lg border border-[#700E08]/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-[#700E08]" />
                      <span className="text-sm font-medium text-[#700E08]/70">Property</span>
                    </div>
                    <Link
                      href={`/properties/${lead.property.slug || String(lead.property._id)}`}
                      className="text-sm font-semibold text-[#700E08] hover:underline flex items-center gap-1"
                    >
                      {lead.property.title}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </DashboardLayout>
  )
}
