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
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import CommunicationTimeline from '../../../../components/Leads/CommunicationTimeline'

export default function AdminLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
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

  useEffect(() => {
    fetchLead()
    fetchDuplicates()
    fetchAgents()
  }, [params.id])

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
      toast.error('Failed to update lead')
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
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[priority] || colors.medium}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  if (loading) {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/leads" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.contact.firstName} {lead.contact.lastName}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Lead Details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {duplicates.length > 0 && (
              <button
                onClick={() => setShowDuplicates(true)}
                className="px-4 py-2 border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 flex items-center gap-2"
              >
                <AlertCircle className="h-5 w-5" />
                {duplicates.length} Duplicate{duplicates.length > 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={() => setShowMergeModal(true)}
              className="px-4 py-2 border border-blue-300 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 flex items-center gap-2"
            >
              <GitMerge className="h-5 w-5" />
              Merge
            </button>
            <button
              onClick={() => {
                setEditingReminder(null)
                setNewReminder({ title: '', description: '', reminderDate: '' })
                setShowReminderModal(true)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Clock className="h-5 w-5" />
              Reminders
            </button>
            {getStatusBadge(lead.status)}
            {getPriorityBadge(lead.priority)}
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit
              </button>
            ) : (
              <button onClick={handleUpdate} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Save className="h-5 w-5" />
                Save
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Full Width Content */}
            {/* Contact Information - Table Format */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </h2>
              </div>
              <div className="p-6">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-3 px-4 text-sm font-medium text-gray-700 w-1/3">Full Name</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{lead.contact.firstName} {lead.contact.lastName}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-sm font-medium text-gray-700">Email</td>
                      <td className="py-3 px-4 text-sm text-gray-900 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {lead.contact.email}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-sm font-medium text-gray-700">Phone</td>
                      <td className="py-3 px-4 text-sm text-gray-900 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {lead.contact.phone}
                      </td>
                    </tr>
                    {lead.contact.alternatePhone && (
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">Alternate Phone</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{lead.contact.alternatePhone}</td>
                      </tr>
                    )}
                    {lead.contact.address && (lead.contact.address.street || lead.contact.address.city) && (
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">Address</td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {[
                            lead.contact.address.street,
                            lead.contact.address.city,
                            lead.contact.address.state,
                            lead.contact.address.country,
                            lead.contact.address.zipCode
                          ].filter(Boolean).join(', ') || 'N/A'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Info Box */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Info
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Lead ID</p>
                    <p className="text-lg font-semibold text-blue-900">{lead.leadId || `LEAD-${String(lead._id).slice(-6)}`}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Source</p>
                    <p className="text-lg font-semibold text-purple-900 capitalize">{lead.source || 'N/A'}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">Campaign</p>
                    <p className="text-lg font-semibold text-indigo-900">{lead.campaignName || 'N/A'}</p>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                    <p className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-1">Created Date</p>
                    <p className="text-lg font-semibold text-teal-900">{new Date(lead.createdAt).toLocaleDateString()}</p>
                  </div>
                  {lead.assignedAgent && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Assigned Agent</p>
                      <p className="text-lg font-semibold text-orange-900">
                        {lead.assignedAgent.firstName} {lead.assignedAgent.lastName}
                      </p>
                    </div>
                  )}
                  {lead.score !== undefined && (
                    <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                      <p className="text-xs font-medium text-pink-600 uppercase tracking-wide mb-1">Lead Score</p>
                      <p className="text-lg font-semibold text-pink-900">{lead.score || 0}/100</p>
                    </div>
                  )}
                  {lead.agency && (
                    <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                      <p className="text-xs font-medium text-cyan-600 uppercase tracking-wide mb-1">Agency</p>
                      <p className="text-lg font-semibold text-cyan-900">{lead.agency.name || 'N/A'}</p>
                    </div>
                  )}
                  {lead.property && (
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Property</p>
                      <p className="text-lg font-semibold text-amber-900">{lead.property.title || 'N/A'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inquiry Details - Table Format */}
            {lead.inquiry && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Inquiry Details
                  </h2>
                </div>
                <div className="p-6">
                  {lead.inquiry.message && (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Message</p>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{lead.inquiry.message}</p>
                    </div>
                  )}
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200">
                      {lead.inquiry.budget && (lead.inquiry.budget.min || lead.inquiry.budget.max) && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700 w-1/3">Budget Range</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {lead.inquiry.budget.currency || 'USD'} {lead.inquiry.budget.min?.toLocaleString() || '0'} - {lead.inquiry.budget.max?.toLocaleString() || '0'}
                          </td>
                        </tr>
                      )}
                      {lead.inquiry.timeline && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Timeline</td>
                          <td className="py-3 px-4 text-sm text-gray-900 capitalize">{lead.inquiry.timeline.replace('_', ' ')}</td>
                        </tr>
                      )}
                      {lead.inquiry.preferredLocation && lead.inquiry.preferredLocation.length > 0 && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Preferred Location</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            <div className="flex flex-wrap gap-2">
                              {lead.inquiry.preferredLocation.map((loc, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{loc}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      {lead.inquiry.propertyType && lead.inquiry.propertyType.length > 0 && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Property Type</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            <div className="flex flex-wrap gap-2">
                              {lead.inquiry.propertyType.map((type, idx) => (
                                <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{type}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      {lead.inquiry.requirements && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Requirements</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{lead.inquiry.requirements}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reminders - Table Format */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Reminders
                  </h2>
                  <button
                    onClick={() => {
                      setEditingReminder(null)
                      setNewReminder({ title: '', description: '', reminderDate: '' })
                      setShowReminderModal(true)
                    }}
                    className="px-3 py-1.5 text-sm bg-white text-yellow-700 rounded-lg hover:bg-yellow-50 flex items-center gap-2 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Add Reminder
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                {lead.reminders && lead.reminders.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created By</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lead.reminders.map((reminder) => {
                        const reminderDate = new Date(reminder.reminderDate)
                        const isOverdue = !reminder.isCompleted && reminderDate < new Date()
                        return (
                          <tr key={reminder._id} className={reminder.isCompleted ? 'bg-gray-50' : isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${reminder.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                  {reminder.title}
                                </span>
                                {reminder.isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {isOverdue && !reminder.isCompleted && <AlertCircle className="h-4 w-4 text-red-500" />}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className={`text-sm ${reminder.isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                {reminder.description || '-'}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-sm text-gray-900">
                                <Clock className="h-4 w-4 text-gray-400" />
                                {reminderDate.toLocaleDateString()} {reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                reminder.isCompleted 
                                  ? 'bg-green-100 text-green-800' 
                                  : isOverdue 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {reminder.isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {reminder.createdBy && typeof reminder.createdBy === 'object' 
                                ? `${reminder.createdBy.firstName} ${reminder.createdBy.lastName}`
                                : 'User'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleToggleReminderComplete(reminder)}
                                  className={`px-2 py-1 text-xs rounded ${
                                    reminder.isCompleted
                                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  }`}
                                  title={reminder.isCompleted ? 'Mark as pending' : 'Mark as completed'}
                                >
                                  {reminder.isCompleted ? 'Undo' : 'Complete'}
                                </button>
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
                                <button
                                  onClick={() => handleDeleteReminder(reminder._id)}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  title="Delete"
                                >
                                  <XCircle className="h-3 w-3" />
                                </button>
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
                    <button
                      onClick={() => {
                        setEditingReminder(null)
                        setNewReminder({ title: '', description: '', reminderDate: '' })
                        setShowReminderModal(true)
                      }}
                      className="mt-4 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Add First Reminder
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Scoring & SLA - Table Format */}
            {(lead.score !== undefined || lead.sla) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Lead Intelligence
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lead.score !== undefined && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Lead Score</span>
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-4">
                            <div 
                              className={`h-4 rounded-full transition-all ${
                                lead.score >= 70 ? 'bg-red-500' : 
                                lead.score >= 40 ? 'bg-orange-500' : 
                                lead.score >= 20 ? 'bg-yellow-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-xl font-bold text-gray-900 min-w-[60px] text-right">{lead.score}/100</span>
                        </div>
                        {lead.scoreDetails && (
                          <table className="w-full text-xs">
                            <tbody className="divide-y divide-gray-100">
                              <tr>
                                <td className="py-1.5 text-gray-600">Source</td>
                                <td className="py-1.5 text-gray-900 font-medium text-right">{lead.scoreDetails.sourceScore || 0} pts</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 text-gray-600">Budget</td>
                                <td className="py-1.5 text-gray-900 font-medium text-right">{lead.scoreDetails.budgetScore || 0} pts</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 text-gray-600">Timeline</td>
                                <td className="py-1.5 text-gray-900 font-medium text-right">{lead.scoreDetails.timelineScore || 0} pts</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 text-gray-600">Engagement</td>
                                <td className="py-1.5 text-gray-900 font-medium text-right">{lead.scoreDetails.engagementScore || 0} pts</td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                    {lead.sla && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">SLA Status</span>
                          <Timer className="h-5 w-5 text-purple-500" />
                        </div>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-100">
                            <tr>
                              <td className="py-2 text-gray-600">Status</td>
                              <td className="py-2 text-right">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  lead.sla.firstContactStatus === 'breached' ? 'bg-red-100 text-red-800' :
                                  lead.sla.firstContactStatus === 'met' ? 'bg-green-100 text-green-800' : 
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {lead.sla.firstContactStatus === 'breached' ? '⚠️ Breached' :
                                   lead.sla.firstContactStatus === 'met' ? '✅ Met' : '⏳ Pending'}
                                </span>
                              </td>
                            </tr>
                            {lead.sla.responseTime && (
                              <tr>
                                <td className="py-2 text-gray-600">Response Time</td>
                                <td className="py-2 text-gray-900 font-medium text-right">
                                  {Math.round(lead.sla.responseTime / 60000)} minutes
                                </td>
                              </tr>
                            )}
                            {lead.sla.firstContactAt && (
                              <tr>
                                <td className="py-2 text-gray-600">First Contact</td>
                                <td className="py-2 text-gray-900 text-right">
                                  {new Date(lead.sla.firstContactAt).toLocaleString()}
                                </td>
                              </tr>
                            )}
                            {lead.sla.lastContactAt && (
                              <tr>
                                <td className="py-2 text-gray-600">Last Contact</td>
                                <td className="py-2 text-gray-900 text-right">
                                  {new Date(lead.sla.lastContactAt).toLocaleString()}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Site Visit Management - Table Format */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
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
                      className="px-3 py-1.5 text-sm bg-white text-orange-700 rounded-lg hover:bg-orange-50 flex items-center gap-2 font-medium"
                    >
                      <Calendar className="h-4 w-4" />
                      {lead.siteVisit?.scheduledDate ? 'Update Visit' : 'Schedule Visit'}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                {lead.siteVisit?.scheduledDate ? (
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 w-1/3">Scheduled Date</td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(lead.siteVisit.scheduledDate).toLocaleDateString()}
                          {lead.siteVisit.scheduledTime && ` at ${lead.siteVisit.scheduledTime}`}
                        </td>
                      </tr>
                      {lead.siteVisit.relationshipManager && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Relationship Manager</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {typeof lead.siteVisit.relationshipManager === 'object' 
                              ? `${lead.siteVisit.relationshipManager.firstName} ${lead.siteVisit.relationshipManager.lastName}`
                              : 'Assigned'}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">Status</td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            lead.siteVisit.status === 'completed' ? 'bg-green-100 text-green-800' :
                            lead.siteVisit.status === 'no_show' ? 'bg-red-100 text-red-800' :
                            lead.siteVisit.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {lead.siteVisit.status?.toUpperCase() || 'SCHEDULED'}
                          </span>
                        </td>
                      </tr>
                      {lead.siteVisit.completedDate && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Completed Date</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {new Date(lead.siteVisit.completedDate).toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {lead.siteVisit.feedback && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Feedback</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{lead.siteVisit.feedback}</td>
                        </tr>
                      )}
                      {lead.siteVisit.interestLevel && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Interest Level</td>
                          <td className="py-3 px-4 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium capitalize">
                              {lead.siteVisit.interestLevel}
                            </span>
                          </td>
                        </tr>
                      )}
                      {lead.siteVisit.nextAction && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Next Action</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{lead.siteVisit.nextAction}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 mb-4">No site visit scheduled</p>
                    <button
                      onClick={() => setShowSiteVisitModal(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Schedule Site Visit
                    </button>
                  </div>
                )}
                {lead.siteVisit?.status === 'scheduled' && new Date(lead.siteVisit.scheduledDate) < new Date() && !lead.siteVisit.completedDate && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
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
            </div>

            {/* Booking Details - Table Format */}
            {lead.booking && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Booking Details
                  </h2>
                </div>
                <div className="p-6">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200">
                      {lead.booking.unitNumber && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700 w-1/3">Unit Number</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{lead.booking.unitNumber}</td>
                        </tr>
                      )}
                      {lead.booking.flatNumber && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Flat Number</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{lead.booking.flatNumber}</td>
                        </tr>
                      )}
                      {lead.booking.bookingAmount && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Booking Amount</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            <span className="font-semibold text-green-600">${lead.booking.bookingAmount.toLocaleString()}</span>
                          </td>
                        </tr>
                      )}
                      {lead.booking.paymentMode && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Payment Mode</td>
                          <td className="py-3 px-4 text-sm text-gray-900 capitalize">{lead.booking.paymentMode.replace('_', ' ')}</td>
                        </tr>
                      )}
                      {lead.booking.agreementStatus && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Agreement Status</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              lead.booking.agreementStatus === 'signed' ? 'bg-green-100 text-green-800' :
                              lead.booking.agreementStatus === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {lead.booking.agreementStatus.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      )}
                      {lead.booking.bookingDate && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Booking Date</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {new Date(lead.booking.bookingDate).toLocaleDateString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tasks Section - Table Format */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Tasks
                  </h2>
                  <button
                    onClick={() => {
                      setEditingTask(null)
                      setNewTask({ title: '', description: '', dueDate: '', taskType: 'other', priority: 'medium' })
                      setShowTaskModal(true)
                    }}
                    className="px-3 py-1.5 text-sm bg-white text-green-700 rounded-lg hover:bg-green-50 flex items-center gap-2 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                {lead.tasks && lead.tasks.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Task</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
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
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                task.taskType === 'call_back' ? 'bg-blue-100 text-blue-800' :
                                task.taskType === 'site_visit' ? 'bg-purple-100 text-purple-800' :
                                task.taskType === 'meeting' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.taskType?.replace('_', ' ').toUpperCase() || 'OTHER'}
                              </span>
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
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.priority?.toUpperCase() || 'MEDIUM'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleCompleteTask(task)}
                                  className={`px-2 py-1 text-xs rounded ${
                                    task.status === 'completed'
                                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  }`}
                                  title={task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                                >
                                  {task.status === 'completed' ? 'Undo' : 'Complete'}
                                </button>
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
                                <button
                                  onClick={() => handleDeleteTask(task._id)}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  title="Delete"
                                >
                                  <XCircle className="h-3 w-3" />
                                </button>
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
                    <button
                      onClick={() => {
                        setEditingTask(null)
                        setNewTask({ title: '', description: '', dueDate: '', taskType: 'other', priority: 'medium' })
                        setShowTaskModal(true)
                      }}
                      className="mt-4 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Add First Task
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tags Management */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-pink-600 to-pink-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Tags
                </h2>
              </div>
              <div className="p-6">
                {lead.tags && lead.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {lead.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {tag}
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
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">No tags added</p>
                )}
                <div className="flex gap-2">
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
              </div>
            </div>

            {/* Communication Timeline - Enhanced */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Communication Timeline
                </h2>
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
            </div>

            {/* Notes - Table Format */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </h2>
              </div>
              <div className="overflow-x-auto">
                {lead.notes && lead.notes.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Note</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
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
            </div>

            {/* Documents Section - Table Format */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                  </h2>
                  {user?.role === 'super_admin' && (
                    <label className="px-3 py-1.5 text-sm bg-white text-teal-700 rounded-lg hover:bg-teal-50 flex items-center gap-2 font-medium cursor-pointer">
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
              </div>
              <div className="overflow-x-auto">
                {lead.documents && lead.documents.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Document Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Uploaded By</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Uploaded Date</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 uppercase">
                              {doc.type || 'pdf'}
                            </span>
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
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </button>
                              {user?.role === 'super_admin' && (
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
                    {user?.role === 'super_admin' && (
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

            {/* Status & Priority - Full Width */}
            {editing ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">Update Status</h2>
                </div>
                <div className="p-6 space-y-4">
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
                      <option value="hot">Hot</option>
                      <option value="warm">Warm</option>
                      <option value="cold">Cold</option>
                      <option value="not_interested">Not Interested</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Quick Info
                  </h2>
                </div>
                <div className="p-6">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 w-1/2">Source</td>
                        <td className="py-3 px-4 text-sm text-gray-900 capitalize">{lead.source?.replace('_', ' ') || 'N/A'}</td>
                      </tr>
                      {lead.campaignName && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Campaign</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{lead.campaignName}</td>
                        </tr>
                      )}
                      {lead.agency && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Agency</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {typeof lead.agency === 'object' ? lead.agency.name : 'Agency'}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">Assigned Agent</td>
                        <td className="py-3 px-4 text-sm">
                          <select
                            value={lead.assignedAgent?._id || lead.assignedAgent || ''}
                            onChange={async (e) => {
                              try {
                                await api.put(`/leads/${params.id}/assign`, { assignedAgent: e.target.value || null })
                                toast.success('Lead assigned successfully')
                                fetchLead()
                              } catch (error) {
                                console.error('Error assigning lead:', error)
                                toast.error('Failed to assign lead')
                              }
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Unassigned</option>
                            {agents.map((agent) => (
                              <option key={agent._id} value={agent._id}>
                                {agent.firstName} {agent.lastName}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      {lead.property && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Property</td>
                          <td className="py-3 px-4 text-sm">
                            <Link
                              href={`/properties/${lead.property.slug || String(lead.property._id)}`}
                              className="font-medium text-primary-600 hover:underline"
                            >
                              {lead.property.title}
                            </Link>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">Lead ID</td>
                        <td className="py-3 px-4 text-sm text-gray-900 font-mono">{lead.leadId || lead._id}</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm font-medium text-gray-700">Created</td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(lead.createdAt).toLocaleDateString()}
                          <span className="text-gray-500 ml-2">
                            {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                      </tr>
                      {lead.convertedAt && (
                        <tr>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700">Converted</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {new Date(lead.convertedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Site Visit Card */}
            {lead.siteVisit?.scheduledDate && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Site Visit
                    </h2>
                    {lead.siteVisit?.status === 'scheduled' && (
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this site visit?')) {
                            try {
                              await api.put(`/leads/${params.id}`, {
                                siteVisit: {
                                  scheduledDate: null,
                                  scheduledTime: null,
                                  status: null,
                                  relationshipManager: null
                                }
                              })
                              toast.success('Site visit deleted successfully')
                              fetchLead()
                            } catch (error) {
                              console.error('Error deleting site visit:', error)
                              toast.error('Failed to delete site visit')
                            }
                          }
                        }}
                        className="text-white hover:text-orange-200 transition-colors"
                        title="Delete Site Visit"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Scheduled Date</span>
                      <span className="text-sm text-gray-900">
                        {new Date(lead.siteVisit.scheduledDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })} at {lead.siteVisit.scheduledTime || 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Relationship Manager</span>
                      <span className="text-sm text-gray-900">
                        {lead.siteVisit.relationshipManager && typeof lead.siteVisit.relationshipManager === 'object'
                          ? `${lead.siteVisit.relationshipManager.firstName} ${lead.siteVisit.relationshipManager.lastName}`
                          : 'Assigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Status</span>
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lead.siteVisit.status === 'completed' ? 'bg-green-100 text-green-800' :
                        lead.siteVisit.status === 'no_show' ? 'bg-red-100 text-red-800' :
                        lead.siteVisit.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {lead.siteVisit.status?.toUpperCase() || 'SCHEDULED'}
                      </span>
                    </div>
                  </div>
                  {lead.siteVisit?.status === 'scheduled' && (
                    <div className="mt-6">
                      <button
                        onClick={async () => {
                          try {
                            setCompletingVisit(true)
                            await api.put(`/leads/${params.id}/site-visit/complete`, {
                              feedback: visitCompletionData.feedback || '',
                              interestLevel: visitCompletionData.interestLevel || 'medium',
                              nextAction: visitCompletionData.nextAction || ''
                            })
                            toast.success('Site visit marked as completed successfully!')
                            setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
                            fetchLead()
                          } catch (error) {
                            console.error('Error completing site visit:', error)
                            toast.error('Failed to complete site visit')
                          } finally {
                            setCompletingVisit(false)
                          }
                        }}
                        disabled={completingVisit}
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                      >
                        <CheckCircle className="h-5 w-5" />
                        {completingVisit ? 'Completing...' : 'Mark as Completed'}
                      </button>
                    </div>
                  )}
                  {lead.siteVisit?.status === 'completed' && lead.siteVisit.feedback && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Feedback:</p>
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
                </div>
              </div>
            )}

            {!lead.siteVisit?.scheduledDate && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Site Visit
                  </h2>
                </div>
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500 mb-4">No site visit scheduled</p>
                  <button
                    onClick={() => setShowSiteVisitModal(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule Site Visit
                  </button>
                </div>
              </div>
            )}
        </div>

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
                            className={`p-4 border-b cursor-pointer transition-colors ${
                              selectedMergeLead?._id === result._id 
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
                                  <span className={`mt-2 inline-block text-xs px-2 py-1 rounded ${
                                    result.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
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

