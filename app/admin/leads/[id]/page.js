'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
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
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import CommunicationTimeline from '../../../../components/Leads/CommunicationTimeline'
import ActivityLog from '../../../../components/Leads/ActivityLog'

export default function AdminLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, checkPermission, loading: authLoading, permissionsLoaded, permissions } = useAuth()

  // Dynamic permissions from permission module - only check after permissions are loaded
  const canViewLead = permissionsLoaded ? checkPermission('leads', 'view') : false
  const canEditLead = permissionsLoaded ? checkPermission('leads', 'edit') : false
  const canDeleteLead = permissionsLoaded ? checkPermission('leads', 'delete') : false
  const canCreateLead = permissionsLoaded ? checkPermission('leads', 'create') : false

  // Debug logging to verify permissions are loaded correctly
  useEffect(() => {
    if (permissionsLoaded && user) {
      console.log('🔐 Lead Detail Page - Permissions Status:', {
        userRole: user.role,
        userId: user._id,
        permissionsLoaded,
        leadsModulePermissions: permissions?.leads,
        canViewLead,
        canEditLead,
        canDeleteLead,
        canCreateLead,
        allPermissions: permissions
      })
    }
  }, [permissionsLoaded, user, permissions, canViewLead, canEditLead, canDeleteLead, canCreateLead])
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [newNote, setNewNote] = useState('')
  const [newCommunication, setNewCommunication] = useState({ type: 'call', message: '' })
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium' })
  const [newReminder, setNewReminder] = useState({ title: '', description: '', reminderDate: '' })
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeResults, setMergeResults] = useState([])
  const [selectedMergeLead, setSelectedMergeLead] = useState(null)
  const [merging, setMerging] = useState(false)
  const [searchingMerge, setSearchingMerge] = useState(false)
  const [duplicates, setDuplicates] = useState([])
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [showSiteVisitModal, setShowSiteVisitModal] = useState(false)
  const [siteVisitData, setSiteVisitData] = useState({ scheduledDate: '', scheduledTime: '', relationshipManager: '' })
  const [completingVisit, setCompletingVisit] = useState(false)
  const [visitCompletionData, setVisitCompletionData] = useState({ feedback: '', interestLevel: 'medium', nextAction: '' })
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [agents, setAgents] = useState([])
  const [newTag, setNewTag] = useState('')
  const [commFilter, setCommFilter] = useState({ type: '', date: '' })
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [leadInquiries, setLeadInquiries] = useState([])
  const [loadingInquiries, setLoadingInquiries] = useState(false)

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
      fetchDuplicates()
      fetchAgents()
    }
  }, [params.id, user, canViewLead, router, authLoading, permissionsLoaded])

  useEffect(() => {
    if (lead && lead.contact?.email) {
      fetchLeadInquiries()
    }
  }, [lead])

  const fetchAgents = async () => {
    try {
      const response = await api.get('/users?role=agent')
      setAgents(response.data.users || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchDuplicates = async () => {
    try {
      const response = await api.get(`/leads/${params.id}/duplicates`)
      setDuplicates(response.data.duplicates || [])
    } catch (error) {
      console.error('Error fetching duplicates:', error)
    }
  }

  const fetchLeadInquiries = async () => {
    try {
      setLoadingInquiries(true)
      // Backend-driven: fetch inquiries for this lead (email/phone match, exclude current by default)
      const res = await api.get(`/leads/${params.id}/inquiries?limit=200&page=1`)
      const inquiries = res.data?.inquiries || []
      setLeadInquiries(inquiries)
    } catch (error) {
      console.error('Error fetching lead inquiries:', error)
      toast.error('Failed to load inquiries')
      setLeadInquiries([])
    } finally {
      setLoadingInquiries(false)
    }
  }

  const handleSearchMerge = async () => {
    if (!mergeSearch.trim()) {
      setMergeResults([])
      setSelectedMergeLead(null)
      return
    }
    try {
      setSearchingMerge(true)
      const response = await api.get(`/leads?search=${encodeURIComponent(mergeSearch)}&limit=20`)
      const filtered = (response.data.leads || []).filter(l => l._id !== params.id)
      setMergeResults(filtered)
      // Note: No toast notification needed - the UI already shows "No leads found" message
    } catch (error) {
      console.error('Error searching leads:', error)
      toast.error('Failed to search leads')
      setMergeResults([])
    } finally {
      setSearchingMerge(false)
    }
  }

  const handleMerge = async () => {
    if (!selectedMergeLead) {
      toast.error('Please select a lead to merge with')
      return
    }
    if (!window.confirm(`Are you sure you want to merge this lead into ${selectedMergeLead.contact.firstName} ${selectedMergeLead.contact.lastName}? This action cannot be undone.`)) {
      return
    }
    try {
      setMerging(true)
      const response = await api.post(`/leads/${params.id}/merge`, {
        targetLeadId: selectedMergeLead._id
      })
      toast.success('Leads merged successfully')
      router.push(`/admin/leads/${selectedMergeLead._id}`)
    } catch (error) {
      console.error('Error merging leads:', error)
      toast.error(error.response?.data?.message || 'Failed to merge leads')
    } finally {
      setMerging(false)
    }
  }

  const handleScheduleSiteVisit = async () => {
    if (!siteVisitData.scheduledDate || !siteVisitData.scheduledTime) {
      toast.error('Please fill in date and time')
      return
    }
    try {
      const scheduledDateTime = new Date(`${siteVisitData.scheduledDate}T${siteVisitData.scheduledTime}`)
      await api.post(`/leads/${params.id}/site-visit`, {
        scheduledDate: scheduledDateTime.toISOString(),
        scheduledTime: siteVisitData.scheduledTime,
        relationshipManager: siteVisitData.relationshipManager || undefined
      })
      toast.success('Site visit scheduled successfully')
      setShowSiteVisitModal(false)
      setSiteVisitData({ scheduledDate: '', scheduledTime: '', relationshipManager: '' })
      fetchLead()
    } catch (error) {
      console.error('Error scheduling site visit:', error)
      toast.error('Failed to schedule site visit')
    }
  }

  const handleCompleteSiteVisit = async () => {
    try {
      setCompletingVisit(true)
      await api.put(`/leads/${params.id}/site-visit/complete`, visitCompletionData)
      toast.success('Site visit marked as completed')
      setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
      fetchLead()
    } catch (error) {
      console.error('Error completing site visit:', error)
      toast.error('Failed to complete site visit')
    } finally {
      setCompletingVisit(false)
    }
  }

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await api.put(`/leads/${params.id}/tasks/${taskId}`, updates)
      toast.success('Task updated successfully')
      fetchLead()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    try {
      await api.delete(`/leads/${params.id}/tasks/${taskId}`)
      toast.success('Task deleted successfully')
      fetchLead()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  const handleCompleteTask = async (task) => {
    try {
      await api.put(`/leads/${params.id}/tasks/${task._id}`, {
        status: task.status === 'completed' ? 'pending' : 'completed',
        completedAt: task.status === 'completed' ? null : new Date()
      })
      toast.success(`Task marked as ${task.status === 'completed' ? 'pending' : 'completed'}`)
      fetchLead()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const fetchLead = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/leads/${params.id}`)
      setLead(response.data.lead)
      setFormData({
        status: response.data.lead.status,
        priority: response.data.lead.priority
      })
    } catch (error) {
      console.error('Error fetching lead:', error)
      toast.error('Failed to load lead details')
      router.push('/admin/leads')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    try {
      await api.put(`/leads/${params.id}`, formData)
      toast.success('Lead updated successfully')
      setEditing(false)
      // Redirect to leads list page after successful update
      router.push('/admin/leads')
    } catch (error) {
      console.error('Error updating lead:', error)
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to update lead'
      toast.error(errorMessage)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      await api.post(`/leads/${params.id}/notes`, { note: newNote })
      toast.success('Note added successfully')
      setNewNote('')
      fetchLead()
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Failed to add note')
    }
  }

  const handleAddCommunication = async () => {
    if (!newCommunication.message.trim()) return
    try {
      await api.post(`/leads/${params.id}/communications`, newCommunication)
      toast.success('Communication logged successfully')
      setNewCommunication({ type: 'call', message: '' })
      fetchLead()
    } catch (error) {
      console.error('Error adding communication:', error)
      toast.error('Failed to add communication')
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    try {
      await api.post(`/leads/${params.id}/tasks`, newTask)
      toast.success('Task added successfully')
      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' })
      fetchLead()
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error('Failed to add task')
    }
  }

  const handleUploadDocuments = async (event) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Limit to 2 PDFs as per requirement
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf')
    if (pdfFiles.length === 0) {
      toast.error('Please select PDF files only')
      return
    }
    if (pdfFiles.length > 2) {
      toast.error('You can only upload maximum 2 PDF files')
      return
    }

    try {
      setUploadingDocuments(true)
      const formData = new FormData()
      pdfFiles.forEach(file => {
        formData.append('documents', file)
      })

      const response = await api.post('/upload/lead-documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.documents && response.data.documents.length > 0) {
        // Add uploaded documents to lead
        const currentDocuments = lead.documents || []
        const newDocuments = response.data.documents.map(doc => ({
          ...doc,
          uploadedBy: user._id,
          uploadedAt: new Date()
        }))
        const updatedDocuments = [...currentDocuments, ...newDocuments]

        // Update lead with new documents
        await api.put(`/leads/${params.id}`, { documents: updatedDocuments })
        toast.success(`${response.data.documents.length} document(s) uploaded successfully`)
        fetchLead()
      }
    } catch (error) {
      console.error('Error uploading documents:', error)
      toast.error(error.response?.data?.message || 'Failed to upload documents')
    } finally {
      setUploadingDocuments(false)
      event.target.value = '' // Reset file input
    }
  }

  const handleDeleteDocument = async (documentIndex) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return

    try {
      setDeletingDocument(documentIndex)
      const updatedDocuments = lead.documents.filter((_, index) => index !== documentIndex)
      await api.put(`/leads/${params.id}`, { documents: updatedDocuments })
      toast.success('Document deleted successfully')
      fetchLead()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    } finally {
      setDeletingDocument(null)
    }
  }

  const handleDownloadDocument = (document) => {
    // Extract filename from URL or use document name
    const url = document.url
    if (url) {
      window.open(url, '_blank')
    } else {
      toast.error('Document URL not available')
    }
  }

  const handleAddReminder = async () => {
    if (!newReminder.title.trim() || !newReminder.reminderDate) {
      toast.error('Please fill in title and reminder date')
      return
    }
    try {
      // Convert datetime-local format to ISO8601 format
      // datetime-local gives format like "2025-12-25T18:37" (no timezone)
      // We need to convert it to ISO8601 format
      let reminderDate;
      if (newReminder.reminderDate.includes('T')) {
        // If it's already in datetime-local format, convert to ISO
        const date = new Date(newReminder.reminderDate);
        if (isNaN(date.getTime())) {
          toast.error('Invalid date format')
          return
        }
        reminderDate = date.toISOString();
      } else {
        // If it's a different format, try to parse it
        reminderDate = new Date(newReminder.reminderDate).toISOString();
      }

      const payload = {
        title: newReminder.title.trim(),
        description: newReminder.description?.trim() || '',
        reminderDate: reminderDate
      }

      console.log('Sending reminder payload:', payload)

      await api.post(`/leads/${params.id}/reminders`, payload)
      toast.success('Reminder added successfully')
      setNewReminder({ title: '', description: '', reminderDate: '' })
      setShowReminderModal(false)
      fetchLead()
    } catch (error) {
      console.error('Error adding reminder:', error)
      console.error('Error response:', error.response?.data)
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.error ||
        'Failed to add reminder'
      toast.error(errorMessage)
    }
  }

  const handleUpdateReminder = async () => {
    if (!editingReminder.title.trim() || !editingReminder.reminderDate) {
      toast.error('Please fill in title and reminder date')
      return
    }
    try {
      // Convert datetime-local format to ISO8601 format
      const reminderDate = editingReminder.reminderDate.includes('T')
        ? new Date(editingReminder.reminderDate).toISOString()
        : new Date(editingReminder.reminderDate).toISOString()

      await api.put(`/leads/${params.id}/reminders/${editingReminder._id}`, {
        title: editingReminder.title,
        description: editingReminder.description,
        reminderDate: reminderDate
      })
      toast.success('Reminder updated successfully')
      setEditingReminder(null)
      setNewReminder({ title: '', description: '', reminderDate: '' })
      setShowReminderModal(false)
      fetchLead()
    } catch (error) {
      console.error('Error updating reminder:', error)
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to update reminder'
      toast.error(errorMessage)
    }
  }

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return
    try {
      await api.delete(`/leads/${params.id}/reminders/${reminderId}`)
      toast.success('Reminder deleted successfully')
      fetchLead()
    } catch (error) {
      console.error('Error deleting reminder:', error)
      toast.error('Failed to delete reminder')
    }
  }

  const handleToggleReminderComplete = async (reminder) => {
    try {
      await api.put(`/leads/${params.id}/reminders/${reminder._id}`, {
        isCompleted: !reminder.isCompleted
      })
      toast.success(`Reminder marked as ${!reminder.isCompleted ? 'completed' : 'pending'}`)
      fetchLead()
    } catch (error) {
      console.error('Error updating reminder:', error)
      toast.error('Failed to update reminder')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      new: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      contacted: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      site_visit: { color: 'bg-purple-100 text-purple-800', icon: Calendar },
      negotiation: { color: 'bg-orange-100 text-orange-800', icon: MessageSquare },
      closed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      lost: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    const badge = badges[status] || badges.new
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      Hot: 'bg-red-100 text-red-800',
      Warm: 'bg-yellow-100 text-yellow-800',
      Cold: 'bg-blue-100 text-blue-800',
      Not_interested: 'bg-gray-100 text-gray-800'
    }
    // Case-insensitive lookup for safety
    if (!priority) return colors.Warm;
    const p = String(priority).toLowerCase();
    const key = Object.keys(colors).find(k => k.toLowerCase() === p);
    const colorClass = colors[key] || colors.Warm;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {priority.toString().toUpperCase()}
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'contacts', label: 'Contacts', icon: User },
    { id: 'inquiry', label: 'Inquiry', icon: FileText },
    { id: 'activities', label: 'Activities', icon: MessageSquare },
    { id: 'siteVisit', label: 'Site Visit', icon: Calendar },
    { id: 'booking', label: 'Booking', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'history', label: 'History', icon: Clock }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4 flex-1">
              <Link href="/admin/leads" className="text-gray-600 hover:text-gray-900 mt-1">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {lead.contact.firstName} {lead.contact.lastName}
                  </h1>
                  {getStatusBadge(lead.status)}
                  {getPriorityBadge(lead.priority)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {lead.contact.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {lead.contact.phone}
                  </div>
                  {lead.leadId && (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {lead.leadId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {duplicates.length > 0 && (
                <button
                  onClick={() => setShowDuplicates(true)}
                  className="px-3 py-2 border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 flex items-center gap-2 text-sm"
                  title={`${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''} found`}
                >
                  <AlertCircle className="h-4 w-4" />
                  {duplicates.length}
                </button>
              )}
              {canEditLead && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="px-3 py-2 border border-blue-300 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 flex items-center gap-2 text-sm"
                  title="Merge lead"
                >
                  <GitMerge className="h-4 w-4" />
                  Merge
                </button>
              )}
              {canEditLead && (!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Lead ID</p>
                    <Building className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{lead.leadId || `LEAD-${String(lead._id).slice(-6)}`}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Source</p>
                    <Target className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 capitalize">{lead.source || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Campaign</p>
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{lead.campaignName || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Created</p>
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{new Date(lead.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Additional Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Intelligence */}
                {(lead.score !== undefined || lead.sla) && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary-600" />
                      Lead Intelligence
                    </h3>
                    <div className="space-y-4">
                      {lead.score !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Lead Score</span>
                            <span className="text-lg font-bold text-gray-900">{lead.score}/100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${lead.score >= 70 ? 'bg-red-500' :
                                  lead.score >= 40 ? 'bg-orange-500' :
                                    lead.score >= 20 ? 'bg-yellow-500' : 'bg-gray-400'
                                }`}
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {lead.sla && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">SLA Status</span>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${lead.sla.firstContactStatus === 'breached' ? 'bg-red-100 text-red-800' :
                                lead.sla.firstContactStatus === 'met' ? 'bg-green-100 text-green-800' :
                                  'bg-yellow-100 text-yellow-800'
                              }`}>
                              {lead.sla.firstContactStatus === 'breached' ? 'Breached' :
                                lead.sla.firstContactStatus === 'met' ? 'Met' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assignment & Property */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary-600" />
                    Assignment & Property
                  </h3>
                  <div className="space-y-3">
                    {lead.assignedAgent && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Assigned Agent</span>
                        <span className="text-sm font-medium text-gray-900">
                          {lead.assignedAgent.firstName} {lead.assignedAgent.lastName}
                        </span>
                      </div>
                    )}
                    {lead.agency && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Agency</span>
                        <span className="text-sm font-medium text-gray-900">
                          {typeof lead.agency === 'object' ? lead.agency.name : 'Agency'}
                        </span>
                      </div>
                    )}
                    {lead.property && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Property</span>
                        <Link
                          href={`/properties/${lead.property.slug || String(lead.property._id)}`}
                          className="text-sm font-medium text-primary-600 hover:underline"
                        >
                          {lead.property.title}
                        </Link>
                      </div>
                    )}
                    {!lead.assignedAgent && !lead.agency && !lead.property && (
                      <p className="text-sm text-gray-500 text-center py-4">No assignment information</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary-600" />
                  Tags
                </h3>
                {lead.tags && lead.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-800 rounded-full text-sm font-medium"
                      >
                        {tag}
                        {canEditLead && (
                          <button
                            onClick={async () => {
                              try {
                                const updatedTags = lead.tags.filter((_, i) => i !== index)
                                await api.put(`/leads/${params.id}`, { tags: updatedTags })
                                toast.success('Tag removed')
                                fetchLead()
                              } catch (error) {
                                toast.error('Failed to remove tag')
                              }
                            }}
                            className="text-primary-600 hover:text-primary-800 ml-1"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No tags added</p>
                )}
                {canEditLead && (
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter' && newTag.trim()) {
                          try {
                            const updatedTags = [...(lead.tags || []), newTag.trim()]
                            await api.put(`/leads/${params.id}`, { tags: updatedTags })
                            toast.success('Tag added')
                            setNewTag('')
                            fetchLead()
                          } catch (error) {
                            toast.error('Failed to add tag')
                          }
                        }
                      }}
                      placeholder="Add tag and press Enter"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={async () => {
                        if (newTag.trim()) {
                          try {
                            const updatedTags = [...(lead.tags || []), newTag.trim()]
                            await api.put(`/leads/${params.id}`, { tags: updatedTags })
                            toast.success('Tag added')
                            setNewTag('')
                            fetchLead()
                          } catch (error) {
                            toast.error('Failed to add tag')
                          }
                        }
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-primary-600" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-base text-gray-900 mt-1">{lead.contact.firstName} {lead.contact.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <p className="text-base text-gray-900 mt-1">{lead.contact.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </label>
                    <p className="text-base text-gray-900 mt-1">{lead.contact.phone}</p>
                  </div>
                  {lead.contact.alternatePhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Alternate Phone</label>
                      <p className="text-base text-gray-900 mt-1">{lead.contact.alternatePhone}</p>
                    </div>
                  )}
                </div>
                {lead.contact.address && (lead.contact.address.street || lead.contact.address.city) && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </label>
                    <p className="text-base text-gray-900 mt-1">
                      {[
                        lead.contact.address.street,
                        lead.contact.address.city,
                        lead.contact.address.state,
                        lead.contact.address.country,
                        lead.contact.address.zipCode
                      ].filter(Boolean).join(', ') || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inquiry Tab */}
          {activeTab === 'inquiry' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600" />
                  Inquiries
                </h2>
                <p className="text-sm text-gray-500">
                  Total: {leadInquiries.length} inquiries
                </p>
              </div>
              {loadingInquiries ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : leadInquiries.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No inquiries found for this lead</p>
                </div>
              ) : (
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
                      {leadInquiries.map((inquiry, index) => {
                        const propertyPrice = inquiry.property?.price
                          ? (typeof inquiry.property.price === 'object'
                            ? (inquiry.property.price.sale
                              ? `₹${Number(inquiry.property.price.sale).toLocaleString()}`
                              : inquiry.property.price.rent?.amount
                                ? `₹${Number(inquiry.property.price.rent.amount).toLocaleString()}/${inquiry.property.price.rent.period || 'month'}`
                                : 'Price on request')
                            : `₹${Number(inquiry.property.price).toLocaleString()}`)
                          : 'Price on request'

                        return (
                          <tr key={inquiry._id || inquiry.id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                {inquiry.property?.images && inquiry.property.images.length > 0 && (
                                  <img
                                    src={typeof inquiry.property.images[0] === 'string'
                                      ? inquiry.property.images[0]
                                      : inquiry.property.images[0]?.url || '/placeholder-property.jpg'}
                                    alt={inquiry.property?.title || 'Property'}
                                    className="h-10 w-10 rounded object-cover"
                                    onError={(e) => {
                                      e.target.src = '/placeholder-property.jpg'
                                    }}
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {inquiry.property?.title || inquiry.property?.slug || 'Property Name'}
                                  </p>
                                  {inquiry.property?.location && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {inquiry.property.location.city || inquiry.property.location.address || 'Location'}
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
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${inquiry.priority === 'hot' || inquiry.priority === 'Hot'
                                    ? 'bg-red-100 text-red-800'
                                    : inquiry.priority === 'warm' || inquiry.priority === 'Warm'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-blue-100 text-blue-800'
                                    }`}
                                >
                                  {String(inquiry.priority).toUpperCase()}
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
                              <Link
                                href={`/admin/leads/${inquiry._id || inquiry.id}`}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                              >
                                <Eye className="h-4 w-4" />
                                View Full Details
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="space-y-6">
              {/* Tasks Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary-600" />
                    Tasks
                  </h3>
                  {canEditLead && (
                    <button
                      onClick={() => {
                        setEditingTask(null)
                        setNewTask({ title: '', description: '', dueDate: '', taskType: 'other', priority: 'medium' })
                        setShowTaskModal(true)
                      }}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Task
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  {lead.tasks && lead.tasks.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Task</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lead.tasks.map((task) => {
                          const dueDate = task.dueDate ? new Date(task.dueDate) : null
                          const isOverdue = dueDate && !task.completedAt && dueDate < new Date()
                          return (
                            <tr key={task._id} className={task.status === 'completed' ? 'bg-gray-50' : isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                    {task.title}
                                  </span>
                                  {task.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                  {isOverdue && task.status !== 'completed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                </div>
                                {task.description && (
                                  <p className={`text-xs mt-1 ${task.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {task.description}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {dueDate ? (
                                  <div className="flex items-center gap-1 text-sm text-gray-900">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    {dueDate.toLocaleDateString()}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                    task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                  }`}>
                                  {task.priority?.toUpperCase() || 'MEDIUM'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                  }`}>
                                  {task.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {canEditLead && (
                                    <button
                                      onClick={() => handleCompleteTask(task)}
                                      className={`px-2 py-1 text-xs rounded ${task.status === 'completed'
                                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                      title={task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                                    >
                                      {task.status === 'completed' ? 'Undo' : 'Complete'}
                                    </button>
                                  )}
                                  {canEditLead && (
                                    <button
                                      onClick={() => {
                                        setEditingTask(task)
                                        setNewTask({
                                          title: task.title,
                                          description: task.description || '',
                                          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
                                          taskType: task.taskType || 'other',
                                          priority: task.priority || 'medium'
                                        })
                                        setShowTaskModal(true)
                                      }}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                      title="Edit"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </button>
                                  )}
                                  {canDeleteLead && (
                                    <button
                                      onClick={() => handleDeleteTask(task._id)}
                                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                      title="Delete"
                                    >
                                      <XCircle className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center">
                      <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No tasks assigned</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reminders Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary-600" />
                    Reminders
                  </h3>
                  {canEditLead && (
                    <button
                      onClick={() => {
                        setEditingReminder(null)
                        setNewReminder({ title: '', description: '', reminderDate: '' })
                        setShowReminderModal(true)
                      }}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Reminder
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  {lead.reminders && lead.reminders.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date & Time</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lead.reminders.map((reminder) => {
                          const reminderDate = new Date(reminder.reminderDate)
                          const isOverdue = !reminder.isCompleted && reminderDate < new Date()
                          return (
                            <tr key={reminder._id} className={reminder.isCompleted ? 'bg-gray-50' : isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${reminder.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                    {reminder.title}
                                  </span>
                                  {reminder.isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                                  {isOverdue && !reminder.isCompleted && <AlertCircle className="h-4 w-4 text-red-500" />}
                                </div>
                                {reminder.description && (
                                  <p className={`text-xs mt-1 ${reminder.isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {reminder.description}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-sm text-gray-900">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  {reminderDate.toLocaleDateString()} {reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${reminder.isCompleted
                                    ? 'bg-green-100 text-green-800'
                                    : isOverdue
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {reminder.isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {canEditLead && (
                                    <button
                                      onClick={() => handleToggleReminderComplete(reminder)}
                                      className={`px-2 py-1 text-xs rounded ${reminder.isCompleted
                                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                      title={reminder.isCompleted ? 'Mark as pending' : 'Mark as completed'}
                                    >
                                      {reminder.isCompleted ? 'Undo' : 'Complete'}
                                    </button>
                                  )}
                                  {canEditLead && (
                                    <button
                                      onClick={() => {
                                        setEditingReminder(reminder)
                                        setNewReminder({
                                          title: reminder.title,
                                          description: reminder.description || '',
                                          reminderDate: reminderDate.toISOString().slice(0, 16)
                                        })
                                        setShowReminderModal(true)
                                      }}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                      title="Edit"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </button>
                                  )}
                                  {canDeleteLead && (
                                    <button
                                      onClick={() => handleDeleteReminder(reminder._id)}
                                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                      title="Delete"
                                    >
                                      <XCircle className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No reminders set</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Communication Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary-600" />
                    Communication Timeline
                  </h3>
                </div>
                <div className="p-6">
                  <CommunicationTimeline
                    communications={lead.communications || []}
                    onExport={(comms) => {
                      const exportData = comms.map(c => ({
                        Type: c.type,
                        Subject: c.subject || '',
                        Message: c.message || '',
                        Date: new Date(c.createdAt).toLocaleString(),
                        CreatedBy: c.createdBy && typeof c.createdBy === 'object'
                          ? `${c.createdBy.firstName} ${c.createdBy.lastName}`
                          : 'User'
                      }))
                      const csv = exportData.map(row => Object.values(row).join(',')).join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `communications-${lead.leadId || lead._id}-${new Date().toISOString().split('T')[0]}.csv`
                      link.click()
                      URL.revokeObjectURL(url)
                      toast.success('Communications exported successfully')
                    }}
                  />
                </div>
                {canEditLead && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex gap-2">
                      <select
                        value={newCommunication.type}
                        onChange={(e) => setNewCommunication({ ...newCommunication, type: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="meeting">Meeting</option>
                        <option value="note">Note</option>
                      </select>
                      <input
                        type="text"
                        value={newCommunication.message}
                        onChange={(e) => setNewCommunication({ ...newCommunication, message: e.target.value })}
                        placeholder="Add communication..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <button onClick={handleAddCommunication} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary-600" />
                Activity History
              </h2>
              <ActivityLog activities={lead.activityLog || []} />
            </div>
          )}

          {/* Site Visit Tab */}
          {activeTab === 'siteVisit' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary-600" />
                  Site Visit
                </h2>
                {(!lead.siteVisit || !lead.siteVisit.scheduledDate || (lead.siteVisit.status === 'scheduled' && new Date(lead.siteVisit.scheduledDate) >= new Date())) && (
                  <button
                    onClick={() => {
                      if (lead.siteVisit?.scheduledDate) {
                        const scheduledDate = new Date(lead.siteVisit.scheduledDate)
                        setSiteVisitData({
                          scheduledDate: scheduledDate.toISOString().split('T')[0],
                          scheduledTime: lead.siteVisit.scheduledTime || '',
                          relationshipManager: lead.siteVisit.relationshipManager || ''
                        })
                      }
                      setShowSiteVisitModal(true)
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
                  >
                    <Calendar className="h-4 w-4" />
                    {lead.siteVisit?.scheduledDate ? 'Update Visit' : 'Schedule Visit'}
                  </button>
                )}
              </div>
              {lead.siteVisit?.scheduledDate ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Scheduled Date</label>
                      <p className="text-base text-gray-900">
                        {new Date(lead.siteVisit.scheduledDate).toLocaleDateString()}
                        {lead.siteVisit.scheduledTime && ` at ${lead.siteVisit.scheduledTime}`}
                      </p>
                    </div>
                    {lead.siteVisit.relationshipManager && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Relationship Manager</label>
                        <p className="text-base text-gray-900">
                          {typeof lead.siteVisit.relationshipManager === 'object'
                            ? `${lead.siteVisit.relationshipManager.firstName} ${lead.siteVisit.relationshipManager.lastName}`
                            : 'Assigned'}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Status</label>
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${lead.siteVisit.status === 'completed' ? 'bg-green-100 text-green-800' :
                          lead.siteVisit.status === 'no_show' ? 'bg-red-100 text-red-800' :
                            lead.siteVisit.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                              'bg-blue-100 text-blue-800'
                        }`}>
                        {lead.siteVisit.status?.toUpperCase() || 'SCHEDULED'}
                      </span>
                    </div>
                    {lead.siteVisit.completedDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-1 block">Completed Date</label>
                        <p className="text-base text-gray-900">
                          {new Date(lead.siteVisit.completedDate).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {lead.siteVisit.feedback && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Feedback</label>
                      <p className="text-sm text-gray-900">{lead.siteVisit.feedback}</p>
                      {lead.siteVisit.interestLevel && (
                        <p className="text-sm text-gray-600 mt-2">
                          Interest Level: <span className="font-medium capitalize">{lead.siteVisit.interestLevel.replace('_', ' ')}</span>
                        </p>
                      )}
                      {lead.siteVisit.nextAction && (
                        <p className="text-sm text-gray-600 mt-1">
                          Next Action: <span className="font-medium">{lead.siteVisit.nextAction}</span>
                        </p>
                      )}
                    </div>
                  )}
                  {lead.siteVisit?.status === 'scheduled' && new Date(lead.siteVisit.scheduledDate) < new Date() && !lead.siteVisit.completedDate && canEditLead && (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          setVisitCompletionData({
                            feedback: lead.siteVisit.feedback || '',
                            interestLevel: lead.siteVisit.interestLevel || 'medium',
                            nextAction: lead.siteVisit.nextAction || ''
                          })
                        }}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark as Completed
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-4">No site visit scheduled</p>
                  {canEditLead && (
                    <button
                      onClick={() => setShowSiteVisitModal(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Schedule Site Visit
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Booking Tab */}
          {activeTab === 'booking' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary-600" />
                Booking Details
              </h2>
              {lead.booking ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {lead.booking.unitNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Unit Number</label>
                      <p className="text-base text-gray-900">{lead.booking.unitNumber}</p>
                    </div>
                  )}
                  {lead.booking.flatNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Flat Number</label>
                      <p className="text-base text-gray-900">{lead.booking.flatNumber}</p>
                    </div>
                  )}
                  {lead.booking.bookingAmount && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Booking Amount</label>
                      <p className="text-xl font-semibold text-green-600">${lead.booking.bookingAmount.toLocaleString()}</p>
                    </div>
                  )}
                  {lead.booking.paymentMode && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Payment Mode</label>
                      <p className="text-base text-gray-900 capitalize">{lead.booking.paymentMode.replace('_', ' ')}</p>
                    </div>
                  )}
                  {lead.booking.agreementStatus && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Agreement Status</label>
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${lead.booking.agreementStatus === 'signed' ? 'bg-green-100 text-green-800' :
                          lead.booking.agreementStatus === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {lead.booking.agreementStatus.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {lead.booking.bookingDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Booking Date</label>
                      <p className="text-base text-gray-900">
                        {new Date(lead.booking.bookingDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No booking details available</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600" />
                  Documents
                </h2>
                {canEditLead && (
                  <label className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Upload PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleUploadDocuments}
                      disabled={uploadingDocuments}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="overflow-x-auto">
                {lead.documents && lead.documents.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Document Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Uploaded By</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Uploaded Date</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lead.documents.map((doc, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-red-500" />
                              <span className="text-sm font-medium text-gray-900">{doc.name || 'Document'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {doc.size ? `${(doc.size / 1024).toFixed(2)} KB` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {doc.uploadedBy && typeof doc.uploadedBy === 'object'
                              ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </button>
                              {canDeleteLead && (
                                <button
                                  onClick={() => handleDeleteDocument(index)}
                                  disabled={deletingDocument === index}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1 disabled:opacity-50"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  {deletingDocument === index ? 'Deleting...' : 'Delete'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 mb-4">No documents uploaded</p>
                    {canEditLead && (
                      <label className="inline-flex items-center px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload PDF Documents
                        <input
                          type="file"
                          accept="application/pdf"
                          multiple
                          onChange={handleUploadDocuments}
                          disabled={uploadingDocuments}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
              {uploadingDocuments && (
                <div className="px-6 py-4 bg-blue-50 border-t border-gray-200">
                  <p className="text-sm text-blue-600 flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Uploading documents...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600" />
                  Notes
                </h2>
              </div>
              <div className="overflow-x-auto">
                {lead.notes && lead.notes.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Note</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lead.notes.map((note, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">{note.note}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {new Date(note.createdAt).toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No notes added</p>
                  </div>
                )}
              </div>
              {canEditLead && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <button onClick={handleAddNote} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Editing Section - Show in Overview when editing */}
          {editing && activeTab === 'overview' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status & Priority</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="site_visit_scheduled">Site Visit Scheduled</option>
                    <option value="site_visit_completed">Site Visit Completed</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="booked">Booked</option>
                    <option value="closed">Closed</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                    <option value="Not_interested">Not Interested</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>
        {/* End Tab Content */}

        {/* Modals Section */}
        {/* Reminder Modal */}
        {showReminderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingReminder ? 'Edit Reminder' : 'Add Reminder'}
                </h2>
                <button
                  onClick={() => {
                    setShowReminderModal(false)
                    setEditingReminder(null)
                    setNewReminder({ title: '', description: '', reminderDate: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    placeholder="Enter reminder title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newReminder.description}
                    onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                    placeholder="Enter reminder description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reminder Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newReminder.reminderDate}
                    onChange={(e) => setNewReminder({ ...newReminder, reminderDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowReminderModal(false)
                    setEditingReminder(null)
                    setNewReminder({ title: '', description: '', reminderDate: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingReminder ? handleUpdateReminder : handleAddReminder}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingReminder ? 'Update' : 'Add'} Reminder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Merge Lead Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Merge Lead</h2>
                <button
                  onClick={() => {
                    setShowMergeModal(false)
                    setMergeSearch('')
                    setMergeResults([])
                    setSelectedMergeLead(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search for lead to merge with
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mergeSearch}
                      onChange={(e) => setMergeSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchMerge()}
                      placeholder="Search by name, email, or phone..."
                      className="flex-1 px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={handleSearchMerge}
                      disabled={searchingMerge || !mergeSearch.trim()}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Search className="h-5 w-5" />
                      {searchingMerge ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {mergeSearch && (
                  <div className="mt-4">
                    {searchingMerge ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <span className="ml-3 text-gray-600">Searching...</span>
                      </div>
                    ) : mergeResults.length > 0 ? (
                      <div className="border-2 border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                        <div className="p-2 bg-gray-50 border-b">
                          <p className="text-xs font-medium text-gray-700">
                            {mergeResults.length} lead{mergeResults.length > 1 ? 's' : ''} found - Click to select
                          </p>
                        </div>
                        {mergeResults.map((result) => (
                          <div
                            key={result._id}
                            onClick={() => setSelectedMergeLead(result)}
                            className={`p-4 border-b cursor-pointer transition-colors ${selectedMergeLead?._id === result._id
                              ? 'bg-blue-50 border-blue-300 border-l-4'
                              : 'hover:bg-gray-50 border-gray-200'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">
                                  {result.contact?.firstName || ''} {result.contact?.lastName || ''}
                                </p>
                                <div className="mt-1 space-y-0.5">
                                  {result.contact?.email && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {result.contact.email}
                                    </p>
                                  )}
                                  {result.contact?.phone && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {result.contact.phone}
                                    </p>
                                  )}
                                </div>
                                {result.status && (
                                  <span className={`mt-2 inline-block text-xs px-2 py-1 rounded ${result.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                                    result.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                                      result.status === 'negotiation' ? 'bg-purple-100 text-purple-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {result.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-mono">
                                  {result.leadId || `LEAD-${String(result._id).slice(-6)}`}
                                </span>
                                {selectedMergeLead?._id === result._id && (
                                  <div className="mt-2">
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : mergeSearch.trim() ? (
                      <div className="border-2 border-gray-200 rounded-lg p-6 text-center">
                        <p className="text-gray-500">No leads found matching "{mergeSearch}"</p>
                        <p className="text-xs text-gray-400 mt-2">Try searching with a different name, email, or phone number</p>
                      </div>
                    ) : null}
                  </div>
                )}
                {selectedMergeLead && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900">
                          Selected Lead: {selectedMergeLead.contact?.firstName || ''} {selectedMergeLead.contact?.lastName || ''}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Current lead will be merged into this lead. All notes, communications, and tasks will be combined.
                        </p>
                        <div className="mt-2 text-xs text-blue-600">
                          <p>Email: {selectedMergeLead.contact?.email || 'N/A'}</p>
                          <p>Phone: {selectedMergeLead.contact?.phone || 'N/A'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedMergeLead(null)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Clear selection"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowMergeModal(false)
                    setMergeSearch('')
                    setMergeResults([])
                    setSelectedMergeLead(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={!selectedMergeLead || merging}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  {merging ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Merging...
                    </>
                  ) : (
                    <>
                      <GitMerge className="h-4 w-4" />
                      Merge Leads
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Warning Modal */}
        {showDuplicates && duplicates.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold text-yellow-900 flex items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                    Duplicate Leads Found
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {duplicates.length} potential duplicate{duplicates.length > 1 ? 's' : ''} found
                  </p>
                </div>
                <button
                  onClick={() => setShowDuplicates(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {duplicates.map((dup) => (
                    <Link
                      key={dup._id}
                      href={`/admin/leads/${dup._id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {dup.contact.firstName} {dup.contact.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{dup.contact.email}</p>
                          <p className="text-sm text-gray-500">{dup.contact.phone}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100">
                            {dup.leadId || dup._id}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(dup.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => setShowDuplicates(false)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTask ? 'Edit Task' : 'Add Task'}
                </h2>
                <button
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                    setNewTask({ title: '', description: '', dueDate: '', taskType: 'other', priority: 'medium' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Enter task description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                  <select
                    value={newTask.taskType}
                    onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="call_back">Call Back</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="meeting">Meeting</option>
                    <option value="document_collection">Document Collection</option>
                    <option value="payment_reminder">Payment Reminder</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                    setNewTask({ title: '', description: '', dueDate: '', taskType: 'other', priority: 'medium' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTask ? () => {
                    handleUpdateTask(editingTask._id, newTask)
                    setShowTaskModal(false)
                    setEditingTask(null)
                    setNewTask({ title: '', description: '', dueDate: '', taskType: 'other', priority: 'medium' })
                  } : handleAddTask}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingTask ? 'Update' : 'Add'} Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Site Visit Modal */}
        {showSiteVisitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {lead.siteVisit?.scheduledDate ? 'Update Site Visit' : 'Schedule Site Visit'}
                </h2>
                <button
                  onClick={() => {
                    setShowSiteVisitModal(false)
                    setSiteVisitData({ scheduledDate: '', scheduledTime: '', relationshipManager: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={siteVisitData.scheduledDate}
                    onChange={(e) => setSiteVisitData({ ...siteVisitData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={siteVisitData.scheduledTime}
                    onChange={(e) => setSiteVisitData({ ...siteVisitData, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Manager</label>
                  <select
                    value={siteVisitData.relationshipManager}
                    onChange={(e) => setSiteVisitData({ ...siteVisitData, relationshipManager: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Agent</option>
                    {agents.map((agent) => (
                      <option key={agent._id} value={agent._id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowSiteVisitModal(false)
                    setSiteVisitData({ scheduledDate: '', scheduledTime: '', relationshipManager: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSiteVisit}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Schedule Visit
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

