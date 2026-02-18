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
  Home,
  FileText,
  Upload,
  Download,
  MessageSquare,
  Activity,
  Edit,
  DollarSign,
  Eye,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  CheckSquare,
  Plus,
  Trash2,
  RotateCcw,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import UserDetailOverview from '../../../../components/Users/UserDetailOverview'

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, checkPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [userInquiries, setUserInquiries] = useState([])
  const [loadingInquiries, setLoadingInquiries] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [allTasks, setAllTasks] = useState([])
  const [allReminders, setAllReminders] = useState([])
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium', taskType: 'other' })
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)
  const [newReminder, setNewReminder] = useState({ title: '', description: '', reminderDate: '' })
  const [allSiteVisits, setAllSiteVisits] = useState([])
  const [showSiteVisitModal, setShowSiteVisitModal] = useState(false)
  const [siteVisitData, setSiteVisitData] = useState({ scheduledDate: '', scheduledTime: '', propertyId: '', leadId: '' })
  const [editingSiteVisitId, setEditingSiteVisitId] = useState(null)
  const [schedulingForLeadId, setSchedulingForLeadId] = useState(null)
  const [showCompleteVisitModal, setShowCompleteVisitModal] = useState(false)
  const [completingForLeadId, setCompletingForLeadId] = useState(null)
  const [visitCompletionData, setVisitCompletionData] = useState({ feedback: '', interestLevel: 'medium', nextAction: '' })
  const [deletingSiteVisit, setDeletingSiteVisit] = useState(false)
  const [completingVisit, setCompletingVisit] = useState(false)
  const [viewCompletedVisit, setViewCompletedVisit] = useState(null)
  const [editingCompletedVisit, setEditingCompletedVisit] = useState(null)
  const [updatingCompletion, setUpdatingCompletion] = useState(false)
  const [properties, setProperties] = useState([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingData, setBookingData] = useState({
    amount: '',
    type: 'sale',
    transactionDate: new Date().toISOString().split('T')[0],
    unitNumber: '',
    paymentMethod: 'bank_transfer',
    notes: '',
    commissionPercentage: '2',
    propertyId: '',
    leadId: ''
  })
  const [creatingBooking, setCreatingBooking] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showDocUploadModal, setShowDocUploadModal] = useState(false)
  const [uploadTargetLead, setUploadTargetLead] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState(null)
  const [confirmedProperties, setConfirmedProperties] = useState([])
  const [loadingConfirmedProperties, setLoadingConfirmedProperties] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [updatingNote, setUpdatingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState(null)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [finalizingTransaction, setFinalizingTransaction] = useState(null)
  const [finalizationData, setFinalizationData] = useState({
    amountPaid: '',
    dueAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    transactionReference: '',
    notes: ''
  })

  const canEditUser = checkPermission('users', 'edit')

  useEffect(() => {
    if (currentUser) {
      fetchUser()
    }
  }, [params.id, currentUser])

  useEffect(() => {
    if (userData?._id || userData?.id) {
      fetchUserInquiries()
      fetchUserTransactions()
      fetchProperties()
    }
  }, [userData])

  useEffect(() => {
    if (userInquiries.length > 0) {
      fetchUserSiteVisits()
    }
  }, [userInquiries])

  useEffect(() => {
    if (userData) {
      fetchUserTasksAndReminders()
    }
  }, [userData])

  useEffect(() => {
    if (userData?._id || userData?.id) {
      fetchConfirmedProperties()
    }
  }, [userData])

  const fetchConfirmedProperties = async () => {
    if (!userData?._id && !userData?.id) {
      setConfirmedProperties([])
      return
    }
    try {
      setLoadingConfirmedProperties(true)
      const response = await api.get(`/users/${params.id}/confirmed-properties`)
      setConfirmedProperties(response.data.confirmedProperties || [])
    } catch (error) {
      console.error('Error fetching confirmed properties documents:', error)
      toast.error('Failed to load documents')
      setConfirmedProperties([])
    } finally {
      setLoadingConfirmedProperties(false)
    }
  }

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/users/${params.id}`)
      setUserData(response.data)
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load user details')
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserInquiries = async () => {
    if (!userData?._id && !userData?.id) {
      setUserInquiries([])
      return
    }
    if (!userData?.email) {
      setUserInquiries([])
      return
    }
    try {
      setLoadingInquiries(true)
      // Fetch inquiries by user's email (leads are linked by email)
      // User is already fetched by ID, so this ensures we get inquiries for this specific user
      const response = await api.get(`/leads?search=${encodeURIComponent(userData.email)}&limit=200`)
      const leads = response.data.leads || []
      
      // Flatten properties (Main Property + Interested Properties)
      let allInquiries = []
      const seenKeys = new Set()

      leads.forEach(l => {
        // 1. Add Main Property
        if (l.property) {
          const key = `${l._id}_main`
          if (!seenKeys.has(key)) {
            seenKeys.add(key)
            allInquiries.push({
              ...l,
              isMain: true
            })
          }
        }

        // 2. Add Interested Properties
        if (l.interestedProperties && l.interestedProperties.length > 0) {
          l.interestedProperties.forEach((ip, idx) => {
            const propId = ip.property?._id || ip.property
            const mainPropId = l.property?._id || l.property
            if (mainPropId && propId === mainPropId) return
            if (!propId) return

            const key = `${l._id}_ip_${idx}`
            if (!seenKeys.has(key)) {
              seenKeys.add(key)
              allInquiries.push({
                _id: `${l._id}_${idx}`,
                realLeadId: l._id,
                property: ip.property,
                status: l.status,
                priority: l.priority,
                createdAt: ip.date || l.createdAt,
                isInterest: true
              })
            }
          })
        }
      })

      // Sort by date descending
      allInquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setUserInquiries(allInquiries)
    } catch (error) {
      console.error('Error fetching user inquiries:', error)
      toast.error('Failed to load inquiries')
      setUserInquiries([])
    } finally {
      setLoadingInquiries(false)
    }
  }

  const fetchUserTransactions = async () => {
    if (!userData?._id && !userData?.id) {
      setTransactions([])
      return
    }
    if (!userData?.email) {
      setTransactions([])
      return
    }
    try {
      setLoadingTransactions(true)
      // Fetch transactions by user's email (transactions are linked by email)
      // User is already fetched by ID, so this ensures we get transactions for this specific user
      const response = await api.get(`/transactions?search=${encodeURIComponent(userData.email)}`)
      setTransactions(response.data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setTransactions([])
    } finally {
      setLoadingTransactions(false)
    }
  }

  const fetchUserTasksAndReminders = async () => {
    if (!userData?._id && !userData?.id) {
      setAllTasks([])
      setAllReminders([])
      return
    }
    try {
      // Fetch user data which includes tasks and reminders
      const response = await api.get(`/users/${params.id}`)
      const user = response.data
      
      setAllTasks(user.tasks || [])
      setAllReminders(user.reminders || [])
    } catch (error) {
      console.error('Error fetching user tasks and reminders:', error)
      setAllTasks([])
      setAllReminders([])
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    try {
      await api.post(`/users/${params.id}/tasks`, newTask)
      toast.success('Task added successfully')
      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', taskType: 'other' })
      setShowTaskModal(false)
      setEditingTask(null)
      await fetchUser()
      fetchUserTasksAndReminders()
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error(error.response?.data?.message || 'Failed to add task')
    }
  }

  const handleUpdateTask = async (task) => {
    if (!newTask.title.trim()) return
    try {
      await api.put(`/users/${params.id}/tasks/${task._id}`, newTask)
      toast.success('Task updated successfully')
      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', taskType: 'other' })
      setShowTaskModal(false)
      setEditingTask(null)
      await fetchUser()
      fetchUserTasksAndReminders()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error(error.response?.data?.message || 'Failed to update task')
    }
  }

  const handleDeleteTask = async (task) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await api.delete(`/users/${params.id}/tasks/${task._id}`)
      toast.success('Task deleted successfully')
      await fetchUser()
      fetchUserTasksAndReminders()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error(error.response?.data?.message || 'Failed to delete task')
    }
  }

  const handleCompleteTask = async (task) => {
    try {
      await api.put(`/users/${params.id}/tasks/${task._id}`, {
        status: task.status === 'completed' ? 'pending' : 'completed',
        completedAt: task.status === 'completed' ? null : new Date()
      })
      toast.success(`Task marked as ${task.status === 'completed' ? 'pending' : 'completed'}`)
      await fetchUser()
      fetchUserTasksAndReminders()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleAddReminder = async () => {
    if (!newReminder.title.trim() || !newReminder.reminderDate) return
    try {
      await api.post(`/users/${params.id}/reminders`, newReminder)
      toast.success('Reminder added successfully')
      setNewReminder({ title: '', description: '', reminderDate: '' })
      setShowReminderModal(false)
      setEditingReminder(null)
      await fetchUser()
      fetchUserTasksAndReminders()
    } catch (error) {
      console.error('Error adding reminder:', error)
      toast.error(error.response?.data?.message || 'Failed to add reminder')
    }
  }

  const handleUpdateReminder = async (reminder) => {
    if (!newReminder.title.trim() || !newReminder.reminderDate) return
    try {
      await api.put(`/users/${params.id}/reminders/${reminder._id}`, newReminder)
      toast.success('Reminder updated successfully')
      setNewReminder({ title: '', description: '', reminderDate: '' })
      setShowReminderModal(false)
      setEditingReminder(null)
      await fetchUser()
      fetchUserTasksAndReminders()
    } catch (error) {
      console.error('Error updating reminder:', error)
      toast.error(error.response?.data?.message || 'Failed to update reminder')
    }
  }

  const handleDeleteReminder = async (reminder) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return
    try {
      await api.delete(`/users/${params.id}/reminders/${reminder._id}`)
      toast.success('Reminder deleted successfully')
      await fetchUser()
      fetchUserTasksAndReminders()
    } catch (error) {
      console.error('Error deleting reminder:', error)
      toast.error(error.response?.data?.message || 'Failed to delete reminder')
    }
  }

  const handleToggleReminderComplete = async (reminder) => {
    try {
      await api.put(`/users/${params.id}/reminders/${reminder._id}`, {
        isCompleted: !reminder.isCompleted
      })
      toast.success(`Reminder marked as ${reminder.isCompleted ? 'pending' : 'completed'}`)
      await fetchUser()
      fetchUserTasksAndReminders()
    } catch (error) {
      console.error('Error updating reminder:', error)
      toast.error('Failed to update reminder')
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await api.get('/properties?limit=1000')
      setProperties(response.data.properties || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  const fetchUserSiteVisits = async () => {
    // Ensure we have user data before fetching site visits
    if (!userData?._id && !userData?.id) {
      setAllSiteVisits([])
      return
    }
    if (!userInquiries || userInquiries.length === 0) {
      setAllSiteVisits([])
      return
    }
    try {
      const visits = []
      const seenVisitIds = new Set()

      // Fetch site visits only for inquiries belonging to this user (fetched by user ID)
      for (const inquiry of userInquiries) {
        const leadId = inquiry.realLeadId || inquiry._id
        if (!leadId) continue

        try {
          const leadResponse = await api.get(`/leads/${leadId}`)
          const lead = leadResponse.data.lead
          
          // Verify this lead belongs to the current user by checking email match
          if (userData?.email && lead?.contact?.email && 
              lead.contact.email.toLowerCase() !== userData.email.toLowerCase()) {
            // Skip leads that don't match the user's email
            continue
          }

          const visitList = (lead.siteVisits && lead.siteVisits.length > 0)
            ? lead.siteVisits
            : (lead.siteVisit?.scheduledDate ? [{ ...lead.siteVisit, _id: lead.siteVisit._id }] : [])

          visitList.forEach((visit) => {
            if (visit._id && seenVisitIds.has(visit._id.toString())) return
            if (visit._id) seenVisitIds.add(visit._id.toString())

            const prop = visit.property || inquiry.property
            visits.push({
              ...visit,
              _leadId: leadId,
              _property: prop,
              _leadName: inquiry.property?.title || inquiry.property?.slug || 'Lead'
            })
          })
        } catch (error) {
          console.error(`Error fetching lead ${leadId}:`, error)
        }
      }

      // Sort by scheduled date
      visits.sort((a, b) => {
        const dateA = a.scheduledDate ? new Date(a.scheduledDate) : new Date(0)
        const dateB = b.scheduledDate ? new Date(b.scheduledDate) : new Date(0)
        return dateB - dateA
      })

      setAllSiteVisits(visits)
    } catch (error) {
      console.error('Error fetching site visits:', error)
      setAllSiteVisits([])
    }
  }

  const handleScheduleSiteVisit = async () => {
    if (!siteVisitData.scheduledDate || !siteVisitData.scheduledTime) {
      toast.error('Please fill in date and time')
      return
    }
    if (!siteVisitData.propertyId) {
      toast.error('Please select a property')
      return
    }
    if (!schedulingForLeadId && !siteVisitData.leadId) {
      toast.error('Lead ID not found. Please select a property.')
      return
    }
    const leadId = schedulingForLeadId || siteVisitData.leadId
    try {
      const scheduledDateTime = new Date(`${siteVisitData.scheduledDate}T${siteVisitData.scheduledTime}`)
      const payload = {
        scheduledDate: scheduledDateTime.toISOString(),
        scheduledTime: siteVisitData.scheduledTime,
        propertyId: siteVisitData.propertyId || undefined
      }
      if (editingSiteVisitId) {
        await api.put(`/leads/${leadId}/site-visit/${editingSiteVisitId}`, payload)
        toast.success('Site visit updated successfully')
      } else {
        await api.post(`/leads/${leadId}/site-visit`, payload)
        toast.success('Site visit scheduled successfully')
      }
      setShowSiteVisitModal(false)
      setSiteVisitData({ scheduledDate: '', scheduledTime: '', propertyId: '', leadId: '' })
      setEditingSiteVisitId(null)
      setSchedulingForLeadId(null)
      await fetchUserInquiries()
      await fetchUserSiteVisits()
    } catch (error) {
      console.error('Error saving site visit:', error)
      toast.error(error.response?.data?.message || (editingSiteVisitId ? 'Failed to update site visit' : 'Failed to schedule site visit'))
    }
  }

  const handleCompleteSiteVisit = async () => {
    if (!completingForLeadId) return
    try {
      setCompletingVisit(true)
      await api.put(`/leads/${completingForLeadId}/site-visit/complete`, visitCompletionData)
      toast.success('Site visit marked as completed')
      setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
      setShowCompleteVisitModal(false)
      setCompletingForLeadId(null)
      await fetchUserInquiries()
      await fetchUserSiteVisits()
    } catch (error) {
      console.error('Error completing site visit:', error)
      toast.error(error.response?.data?.message || 'Failed to complete site visit')
    } finally {
      setCompletingVisit(false)
    }
  }

  const handleDeleteSiteVisit = async (visitId, leadId) => {
    if (!confirm('Are you sure you want to delete this site visit?')) return
    if (!leadId) {
      toast.error('Lead ID not found')
      return
    }
    try {
      setDeletingSiteVisit(true)
      await api.delete(`/leads/${leadId}/site-visit/${visitId}`)
      toast.success('Site visit deleted successfully')
      setViewCompletedVisit(null)
      setEditingCompletedVisit(null)
      await fetchUserInquiries()
      await fetchUserSiteVisits()
    } catch (error) {
      console.error('Error deleting site visit:', error)
      toast.error('Failed to delete site visit')
    } finally {
      setDeletingSiteVisit(false)
    }
  }

  const handleUpdateCompletionRemarks = async () => {
    if (!editingCompletedVisit) return
    const leadId = editingCompletedVisit._leadId
    const visitId = editingCompletedVisit._id
    try {
      setUpdatingCompletion(true)
      await api.put(`/leads/${leadId}/site-visit/${visitId}/completion`, visitCompletionData)
      toast.success('Completion remarks updated')
      setEditingCompletedVisit(null)
      setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
      await fetchUserInquiries()
      await fetchUserSiteVisits()
    } catch (error) {
      console.error('Error updating completion remarks:', error)
      toast.error(error.response?.data?.message || 'Failed to update remarks')
    } finally {
      setUpdatingCompletion(false)
    }
  }

  const handleUploadDocuments = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select files')
      return
    }
    if (!uploadTargetLead) {
      toast.error('Please select a property')
      return
    }

    // Limit to 2 PDFs as per requirement
    const pdfFiles = Array.from(selectedFiles).filter(file => file.type === 'application/pdf')
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
      formData.append('leadId', uploadTargetLead)

      const response = await api.post('/upload/lead-documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.documents && response.data.documents.length > 0) {
        // Get the target lead to add documents to
        const leadResponse = await api.get(`/leads/${uploadTargetLead}`)
        const targetLead = leadResponse.data.lead
        
        const currentDocuments = targetLead.documents || []
        const newDocuments = response.data.documents.map(doc => ({
          ...doc,
          uploadedBy: currentUser._id,
          uploadedAt: new Date()
        }))
        const updatedDocuments = [...currentDocuments, ...newDocuments]

        // Update target lead with new documents
        await api.put(`/leads/${uploadTargetLead}`, { documents: updatedDocuments })
        toast.success(`${response.data.documents.length} document(s) uploaded and sent to customer's email`)

        // Refresh inquiries and confirmed-properties documents
        await fetchUserInquiries()
        await fetchConfirmedProperties()

        // Close modal and reset
        setShowDocUploadModal(false)
        setSelectedFiles([])
        setUploadTargetLead('')
      }
    } catch (error) {
      console.error('Error uploading documents:', error)
      toast.error(error.response?.data?.message || 'Failed to upload documents')
    } finally {
      setUploadingDocuments(false)
    }
  }

  const handleDeleteDocument = async (leadId, document) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return

    const documentId = document?._id
    const filename = document?.filename

    if (!documentId) {
      toast.error('Invalid document selected')
      return
    }

    try {
      setDeletingDocument(documentId)

      // Get the target lead
      const leadResponse = await api.get(`/leads/${leadId}`)
      const targetLead = leadResponse.data.lead

      // Filter out the document to delete
      const updatedDocuments = (targetLead.documents || []).filter(doc => doc._id !== documentId)

      await api.put(`/leads/${leadId}`, { documents: updatedDocuments })

      // Also delete the underlying file from the server, if we have filename
      if (filename) {
        try {
          await api.delete(`/upload/${encodeURIComponent(filename)}?type=lead`)
        } catch (fileErr) {
          console.error('Error deleting document file:', fileErr)
          // Do not block UI on file delete failure
        }
      }

      toast.success('Document deleted successfully')
      await fetchUserInquiries()
      await fetchConfirmedProperties()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    } finally {
      setDeletingDocument(null)
    }
  }

  const handleDownloadDocument = (document) => {
    const url = document.url
    if (url) {
      window.open(url, '_blank')
    } else {
      toast.error('Document URL not available')
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      await api.post(`/users/${params.id}/notes`, { note: newNote })
      toast.success('Note added successfully')
      setNewNote('')
      await fetchUser()
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error(error.response?.data?.message || 'Failed to add note')
    }
  }

  const handleUpdateNote = async (noteId) => {
    if (!editingNoteText.trim()) return
    try {
      setUpdatingNote(true)
      // Get current user data
      const userResponse = await api.get(`/users/${params.id}`)
      const user = userResponse.data
      
      // Find and update the note
      const noteIndex = user.notes.findIndex(n => (n._id?.toString?.() || n._id) === noteId)
      if (noteIndex === -1) {
        toast.error('Note not found')
        return
      }
      
      // Update the note in the array
      const updatedNotes = [...user.notes]
      updatedNotes[noteIndex] = {
        ...updatedNotes[noteIndex],
        note: editingNoteText.trim()
      }
      
      // Update user with new notes array
      await api.put(`/users/${params.id}`, { notes: updatedNotes })
      toast.success('Note updated successfully')
      setEditingNoteId(null)
      setEditingNoteText('')
      await fetchUser()
    } catch (error) {
      console.error('Error updating note:', error)
      toast.error(error.response?.data?.message || 'Failed to update note')
    } finally {
      setUpdatingNote(false)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    try {
      setDeletingNoteId(noteId)
      // Get current user data
      const userResponse = await api.get(`/users/${params.id}`)
      const user = userResponse.data
      
      // Filter out the note to delete
      const updatedNotes = user.notes.filter(n => (n._id?.toString?.() || n._id) !== noteId)
      
      // Update user with new notes array
      await api.put(`/users/${params.id}`, { notes: updatedNotes })
      toast.success('Note deleted successfully')
      await fetchUser()
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error(error.response?.data?.message || 'Failed to delete note')
    } finally {
      setDeletingNoteId(null)
    }
  }

  const handleConfirmProperty = async (property) => {
    // Find the lead associated with this property
    const associatedInquiry = userInquiries.find(inq => 
      (inq.property?._id || inq.property) === (property._id || property)
    )
    if (!associatedInquiry) {
      toast.error('No lead found for this property')
      return
    }
    const leadId = associatedInquiry.realLeadId || associatedInquiry._id
    
    setBookingData({
      amount: '',
      type: 'sale',
      transactionDate: new Date().toISOString().split('T')[0],
      unitNumber: '',
      paymentMethod: 'bank_transfer',
      notes: '',
      commissionPercentage: '2',
      propertyId: property._id || property,
      leadId: leadId
    })
    setSelectedTransaction(null)
    setShowBookingModal(true)
  }

  const handleFinalizeBooking = (transaction) => {
    if (!transaction.customerConfirmed) {
      toast.error('Customer has not confirmed this booking yet')
      return
    }
    // Set the transaction and calculate initial values
    const totalAmount = Number(transaction.amount || 0)
    setFinalizingTransaction(transaction)
    setFinalizationData({
      amountPaid: '',
      dueAmount: totalAmount.toString(),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: transaction.paymentMethod || 'bank_transfer',
      transactionReference: '',
      notes: transaction.notes || ''
    })
    setShowFinalizeModal(true)
  }

  const handleSubmitFinalization = async () => {
    if (!finalizingTransaction) return

    // Validation
    if (!finalizationData.amountPaid || !finalizationData.paymentDate) {
      toast.error('Please fill in amount paid and payment date')
      return
    }

    const amountPaid = Number(finalizationData.amountPaid)
    const dueAmount = Number(finalizationData.dueAmount || 0)
    const totalAmount = Number(finalizingTransaction.amount || 0)

    // Validate amounts
    if (amountPaid <= 0) {
      toast.error('Amount paid must be greater than 0')
      return
    }

    if (amountPaid + dueAmount !== totalAmount) {
      toast.error(`Amount paid (₹${amountPaid.toLocaleString()}) + Due amount (₹${dueAmount.toLocaleString()}) must equal total amount (₹${totalAmount.toLocaleString()})`)
      return
    }

    try {
      setCreatingBooking(true)
      await api.put(`/transactions/${finalizingTransaction._id}`, {
        status: 'completed',
        paymentDetails: {
          amountPaid: amountPaid,
          dueAmount: dueAmount,
          paymentDate: finalizationData.paymentDate,
          paymentMethod: finalizationData.paymentMethod,
          transactionReference: finalizationData.transactionReference || undefined
        },
        notes: finalizationData.notes || finalizingTransaction.notes || undefined
      })
      toast.success('Booking finalized and invoice generated!')
      setShowFinalizeModal(false)
      setFinalizingTransaction(null)
      setFinalizationData({
        amountPaid: '',
        dueAmount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        transactionReference: '',
        notes: ''
      })
      await fetchUserTransactions()
      await fetchUserInquiries()
    } catch (error) {
      console.error('Error finalizing booking:', error)
      toast.error(error.response?.data?.message || 'Failed to finalize booking')
    } finally {
      setCreatingBooking(false)
    }
  }

  const handleCreateBooking = async () => {
    if (!bookingData.amount || !bookingData.transactionDate) {
      toast.error('Please fill in amount and date')
      return
    }
    if (!bookingData.propertyId) {
      toast.error('Please select a property')
      return
    }
    if (!bookingData.leadId) {
      toast.error('Lead ID not found')
      return
    }

    try {
      setCreatingBooking(true)
      if (selectedTransaction) {
        // Update existing transaction to completed (Finalize)
        await api.put(`/transactions/${selectedTransaction._id}`, {
          ...bookingData,
          status: 'completed',
          property: bookingData.propertyId,
          lead: bookingData.leadId
        })
        toast.success('Booking finalized and invoice generated!')
      } else {
        // Create new pending transaction
        // First, get the lead to find the assigned agent
        const leadResponse = await api.get(`/leads/${bookingData.leadId}`)
        const lead = leadResponse.data.lead
        
        await api.post('/transactions', {
          property: bookingData.propertyId,
          lead: bookingData.leadId,
          type: bookingData.type,
          amount: Number(bookingData.amount),
          transactionDate: bookingData.transactionDate,
          paymentMethod: bookingData.paymentMethod,
          notes: bookingData.notes,
          status: 'pending',
          agent: lead.assignedAgent?._id || lead.assignedAgent || currentUser._id,
          commission: {
            percentage: Number(bookingData.commissionPercentage)
          },
          erpSync: {
            unitNumber: bookingData.unitNumber
          }
        })
        toast.success('Booking request created. Waiting for customer confirmation.')
      }
      setShowBookingModal(false)
      setSelectedTransaction(null)
      setBookingData({
        amount: '',
        type: 'sale',
        transactionDate: new Date().toISOString().split('T')[0],
        unitNumber: '',
        paymentMethod: 'bank_transfer',
        notes: '',
        commissionPercentage: '2',
        propertyId: '',
        leadId: ''
      })
      await fetchUserTransactions()
      await fetchUserInquiries()
    } catch (error) {
      console.error('Error creating booking:', error)
      toast.error(error.response?.data?.message || 'Failed to create booking')
    } finally {
      setCreatingBooking(false)
    }
  }

  const getStatusBadge = (status) => {
    if (!status) return null
    const statusColors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      site_visit_scheduled: 'bg-purple-100 text-purple-800',
      site_visit_completed: 'bg-indigo-100 text-indigo-800',
      negotiation: 'bg-orange-100 text-orange-800',
      booked: 'bg-pink-100 text-pink-800',
      lost: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
      junk: 'bg-gray-100 text-gray-800'
    }
    const colorClass = statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>
        {status?.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    if (!priority) return null
    const colors = {
      hot: 'bg-red-50 text-red-600',
      warm: 'bg-[#FEF3C7] text-[#D97706]',
      cold: 'bg-blue-50 text-blue-600',
      not_interested: 'bg-gray-50 text-gray-600'
    }
    const p = String(priority).toLowerCase()
    const colorClass = colors[p] || colors.warm
    return (
      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
        {priority?.toString().toUpperCase() || 'WARM'}
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

  if (!userData) {
    return null
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'contacts', label: 'Contacts', icon: User },
    { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
    { id: 'activities', label: 'Activities', icon: MessageSquare },
    { id: 'siteVisit', label: 'Site Visit', icon: Calendar },
    { id: 'completedVisits', label: 'Completed Visits', icon: CheckCircle },
    { id: 'booking', label: 'Booking', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'notes', label: 'Notes', icon: FileText }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Redesigned Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <Link href="/admin/users" className="text-gray-400 hover:text-gray-700 mt-1 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {userData.firstName} {userData.lastName}
                  </h1>
                  <div className="flex items-center gap-2">
                    {userData.isActive ? (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span>{userData.email}</span>
                  </div>
                  {userData.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{userData.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="bg-gray-50 px-2 py-0.5 rounded text-xs text-gray-500 border border-gray-200">
                      USER-{String(userData._id || userData.id).slice(-6)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-start flex-wrap">
              {canEditUser && (
                <Link
                  href={`/admin/users/${params.id}/edit`}
                  className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Link>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
                      ? 'bg-[#700E08] text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
        <div className="space-y-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <UserDetailOverview
              user={userData}
              userInquiries={userInquiries}
              transactions={transactions}
            />
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
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
                    <p className="text-lg font-semibold text-gray-900">{userData.firstName} {userData.lastName}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 transition-all hover:border-[#700E08]/20 group">
                    <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 block group-hover:text-[#700E08] transition-colors">Email Address</label>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg">
                        <Mail className="h-4 w-4 text-[#700E08]" />
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{userData.email}</p>
                    </div>
                  </div>
                  {userData.phone && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 transition-all hover:border-[#700E08]/20 group">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 block group-hover:text-[#700E08] transition-colors">Phone Number</label>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg">
                          <Phone className="h-4 w-4 text-[#700E08]" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{userData.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
                {userData.address && (userData.address.street || userData.address.city) ? (
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 flex flex-col justify-center">
                    <div className="mb-4">
                      <div className="p-2 bg-[#700E08]/10 rounded-lg w-fit mb-3">
                        <MapPin className="h-6 w-6 text-[#700E08]" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Physical Address</label>
                      <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                        {[
                          userData.address.street,
                          userData.address.city,
                          userData.address.state,
                          userData.address.country,
                          userData.address.zipCode
                        ].filter(Boolean).join(', ') || 'N/A'}
                      </p>
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
          )}

          {/* Inquiries Tab */}
          {activeTab === 'inquiries' && (
            <div className='px-7'>
              {loadingInquiries ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-100 border-t-[#700E08]"></div>
                  <p className="text-sm font-bold text-gray-400 animate-pulse uppercase tracking-widest">Fetching Inquiries...</p>
                </div>
              ) : userInquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <div className="mb-6 p-6 bg-white rounded-3xl shadow-soft">
                    <MessageSquare className="h-16 w-16 text-gray-300" />
                  </div>
                  <p className="text-xl font-extrabold text-gray-400">No inquiries found for this user</p>
                  <p className="text-sm text-gray-400 mt-2 max-w-xs">Once the user inquires about properties, they will appear here in chronological order.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-8 rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {userInquiries.map((inquiry, index) => {
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
                          <tr
                            key={inquiry._id || inquiry.id || index}
                            className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors group align-middle"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 align-middle">
                              {String(index + 1).padStart(2, '0')}
                            </td>
                            <td className="px-6 py-4 align-middle">
                              <div className="flex items-center gap-3 min-h-[48px]">
                                <div className="h-11 w-11 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                  {displayProperty?.images && displayProperty.images.length > 0 ? (
                                    <img
                                      src={typeof displayProperty.images[0] === 'string'
                                        ? displayProperty.images[0]
                                        : displayProperty.images[0]?.url || '/placeholder-property.jpg'}
                                      alt={displayProperty?.title || 'Property'}
                                      className="h-full w-full object-cover"
                                      onError={(e) => { e.target.src = '/placeholder-property.jpg' }}
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-300">
                                      <Building className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {displayProperty?.title || displayProperty?.slug || '—'}
                                  </p>
                                  {displayProperty?.location && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3" />
                                      {displayProperty.location.city || displayProperty.location.address || 'Location'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                              {getStatusBadge(inquiry.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                              {getPriorityBadge(inquiry.priority)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-middle">
                              {inquiry.createdAt
                                ? new Date(inquiry.createdAt).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 align-middle">
                              {propertyPrice}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                              {inquiry.realLeadId ? (
                                <Link
                                  href={`/admin/leads/${inquiry.realLeadId}`}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Lead
                                </Link>
                              ) : (
                                <Link
                                  href={`/admin/leads/${inquiry._id}`}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Lead
                                </Link>
                              )}
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
            <div className="space-y-8">
              {/* Tasks Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                  <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <CheckSquare className="h-6 w-6 text-blue-600" />
                    </div>
                    Task Pipeline
                  </h3>
                  {canEditUser && (
                    <button
                      onClick={() => {
                        setEditingTask(null)
                        setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', taskType: 'other' })
                        setShowTaskModal(true)
                      }}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-200/50 transition-all active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      New Task
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto -mx-8">
                  {allTasks && allTasks.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Task Details</th>
                          <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Deadline</th>
                          <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority</th>
                          <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {allTasks.map((task) => {
                          const dueDate = task.dueDate ? new Date(task.dueDate) : null
                          const isOverdue = dueDate && !task.completedAt && dueDate < new Date()
                          return (
                            <tr key={task._id} className={`${task.status === 'completed' ? 'bg-gray-50/50 opacity-60' : isOverdue ? 'bg-red-50/30' : 'hover:bg-gray-50/80 transition-colors group'}`}>
                              <td className="px-8 py-6">
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${task.status === 'completed' ? 'bg-green-500' : isOverdue ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                                  <div>
                                    <p className={`text-base font-extrabold ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 group-hover:text-blue-600 transition-colors'}`}>
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-sm text-gray-500 mt-1 max-w-md font-medium">{task.description}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                {dueDate ? (
                                  <div className={`flex items-center gap-2 text-sm font-bold ${isOverdue && task.status !== 'completed' ? 'text-red-600' : 'text-gray-900'}`}>
                                    <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`} />
                                    {dueDate.toLocaleDateString()}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400 font-bold italic">No deadline</span>
                                )}
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${task.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                  task.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                      'bg-gray-100 text-gray-600'
                                  }`}>
                                  {task.priority || 'Medium'}
                                </span>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${task.status === 'completed' ? 'bg-green-100 text-green-600' :
                                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                  {task.status?.replace('_', ' ') || 'Pending'}
                                </span>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {canEditUser && (
                                    <button
                                      onClick={() => handleCompleteTask(task)}
                                      className={`p-2 rounded-xl transition-all ${task.status === 'completed'
                                        ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                        : 'bg-green-50 text-green-600 hover:bg-green-100 shadow-sm'
                                        }`}
                                      title={task.status === 'completed' ? 'Revert to Pending' : 'Mark as Complete'}
                                    >
                                      {task.status === 'completed' ? <RotateCcw className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                    </button>
                                  )}
                                  {canEditUser && (
                                    <button
                                      onClick={() => {
                                        setEditingTask(task)
                                        setNewTask({
                                          title: task.title,
                                          description: task.description || '',
                                          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
                                          priority: task.priority || 'medium',
                                          taskType: task.taskType || 'other'
                                        })
                                        setShowTaskModal(true)
                                      }}
                                      className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm"
                                      title="Edit Task"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                  )}
                                  {canEditUser && (
                                    <button
                                      onClick={() => handleDeleteTask(task)}
                                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all shadow-sm"
                                      title="Delete Task"
                                    >
                                      <Trash2 className="h-4 w-4" />
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
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="p-6 bg-gray-50 rounded-3xl mb-4">
                        <CheckSquare className="h-12 w-12 text-gray-200" />
                      </div>
                      <p className="text-xl font-extrabold text-gray-400">Zero Pending Tasks</p>
                      <p className="text-sm text-gray-400 mt-1 max-w-xs font-medium">Create a new task to start tracking activities for this user.</p>
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
                  {canEditUser && (
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
                  {allReminders && allReminders.length > 0 ? (
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
                        {allReminders.map((reminder) => {
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
                                  {canEditUser && (
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
                                  {canEditUser && (
                                    <button
                                      onClick={() => {
                                        setEditingReminder(reminder)
                                        const reminderDate = new Date(reminder.reminderDate)
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
                                  {canEditUser && (
                                    <button
                                      onClick={() => handleDeleteReminder(reminder)}
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
                {canEditUser && (
                  <button
                    onClick={() => {
                      setSchedulingForLeadId(null)
                      setEditingSiteVisitId(null)
                      setSiteVisitData({ scheduledDate: '', scheduledTime: '', propertyId: '', leadId: '' })
                      setShowSiteVisitModal(true)
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule Visit
                  </button>
                )}
              </div>
              {loadingInquiries ? (
                <div className="py-8 text-center text-gray-500">Loading inquiries…</div>
              ) : (
                <>
                  {(() => {
                    const scheduledVisits = allSiteVisits.filter(v => v.status !== 'completed')
                    return scheduledVisits.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700">Scheduled Visits</h3>
                      {scheduledVisits.map((visit) => {
                        const propName = visit._property?.title || visit._property?.slug || visit.property?.title || visit.property?.slug || 'Property'
                        const visitDate = visit.scheduledDate ? new Date(visit.scheduledDate).toLocaleDateString() : ''
                        const visitTime = visit.scheduledTime || ''
                        const isOverdue = visit.status === 'scheduled' && visit.scheduledDate && new Date(visit.scheduledDate) < new Date()
                        return (
                          <div
                            key={visit._id || `${visit._leadId}-${visit.scheduledDate}`}
                            className={`p-5 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-white'} shadow-sm`}
                          >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900 text-lg">{propName}</h4>
                                  {visit.status && (
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      visit.status === 'no_show' ? 'bg-red-100 text-red-800' :
                                        visit.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                          'bg-blue-100 text-blue-800'
                                      }`}>
                                      {visit.status.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>{visitDate}</span>
                                  </div>
                                  {visitTime && (
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      <span>{visitTime}</span>
                                    </div>
                                  )}
                                </div>
                                {visit.feedback && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Feedback</label>
                                    <p className="text-sm text-gray-900">{visit.feedback}</p>
                                    {visit.interestLevel && (
                                      <p className="text-xs text-gray-600 mt-1">
                                        Interest Level: <span className="font-medium capitalize">{visit.interestLevel.replace('_', ' ')}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              {canEditUser && visit.status === 'scheduled' && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => {
                                      setSchedulingForLeadId(visit._leadId)
                                      setEditingSiteVisitId(visit._id)
                                      const d = visit.scheduledDate ? new Date(visit.scheduledDate) : null
                                      setSiteVisitData({
                                        scheduledDate: d ? d.toISOString().split('T')[0] : '',
                                        scheduledTime: visit.scheduledTime || '',
                                        propertyId: visit._property?._id || visit.property?._id || visit.property || '',
                                        leadId: visit._leadId
                                      })
                                      setShowSiteVisitModal(true)
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium transition-colors"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Update
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSiteVisit(visit._id, visit._leadId)}
                                    disabled={deletingSiteVisit}
                                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCompletingForLeadId(visit._leadId)
                                      setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
                                      setShowCompleteVisitModal(true)
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Complete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium mb-1">No site visits scheduled</p>
                      <p className="text-sm text-gray-500">Click "Schedule Visit" to schedule a new site visit for this user.</p>
                    </div>
                  )
                  })()}
                </>
              )}
            </div>
          )}

          {/* Completed Visits Tab */}
          {activeTab === 'completedVisits' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Completed Visits
              </h2>
              {loadingInquiries ? (
                <div className="py-8 text-center text-gray-500">Loading…</div>
              ) : (
                <>
                  {(() => {
                    const completedVisits = allSiteVisits.filter(v => v.status === 'completed')
                    return completedVisits.length > 0 ? (
                      <div className="space-y-4">
                        {completedVisits.map((visit) => {
                          const propName = visit._property?.title || visit._property?.slug || visit.property?.title || visit.property?.slug || 'Property'
                          const visitDate = visit.scheduledDate ? new Date(visit.scheduledDate).toLocaleDateString() : ''
                          const completedDate = visit.completedDate ? new Date(visit.completedDate).toLocaleString() : ''
                          return (
                            <div
                              key={visit._id || `${visit._leadId}-${visit.scheduledDate}`}
                              className="p-5 rounded-lg border border-gray-200 bg-white shadow-sm"
                            >
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-gray-900 text-lg">{propName}</h4>
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">COMPLETED</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span>Visited: {visitDate}</span>
                                    </div>
                                    {completedDate && (
                                      <div className="flex items-center gap-1.5 text-gray-500">
                                        <CheckCircle className="h-4 w-4 text-gray-400" />
                                        <span>Completed: {completedDate}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {canEditUser && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={() => setViewCompletedVisit(visit)}
                                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium transition-colors"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingCompletedVisit(visit)
                                        setVisitCompletionData({
                                          feedback: visit.feedback || '',
                                          interestLevel: visit.interestLevel || 'medium',
                                          nextAction: visit.nextAction || ''
                                        })
                                      }}
                                      className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 flex items-center gap-1.5 text-sm font-medium transition-colors"
                                    >
                                      <Edit className="h-4 w-4" />
                                      Update
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSiteVisit(visit._id, visit._leadId)}
                                      disabled={deletingSiteVisit}
                                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-16 px-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                          <CheckCircle className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium mb-1">No completed visits</p>
                        <p className="text-sm text-gray-500">Completed site visits will appear here.</p>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}

          {/* Booking Tab */}
          {activeTab === 'booking' && (() => {
            // Get ONLY completed transactions for the Booked section
            const bookedProperties = transactions.filter(t => t.status === 'completed')

            // Get pending transactions to show in Interested section
            const pendingTransactions = transactions.filter(t => t.status === 'pending')

            // Get interested/inquired properties from userInquiries
            const interestedProperties = []
            userInquiries.forEach(inq => {
              if (inq.property && (inq.property.title || inq.property.slug || inq.property._id)) {
                // Check if it's already in interestedProperties
                const propId = inq.property._id || inq.property
                if (!interestedProperties.some(ip => (ip.property?._id || ip.property) === propId)) {
                  interestedProperties.push({
                    property: inq.property,
                    date: inq.createdAt,
                    leadId: inq.realLeadId || inq._id
                  })
                }
              }
            })

            // Filter out properties that are already finalized
            const filteredInterested = interestedProperties.filter(ip =>
              !bookedProperties.some(t => (t.property?._id || t.property) === (ip.property?._id || ip.property))
            )

            const PropertyCard = ({ property, transaction, interaction, type }) => {
              if (!property) return null

              return (
                <div className="group transition-all">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Property Image */}
                    <div className="w-full md:w-56 h-36 flex-shrink-0 bg-gray-100 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow relative">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={typeof property.images[0] === 'string'
                            ? property.images[0]
                            : property.images[0]?.url || '/placeholder-property.jpg'}
                          alt={property.title || 'Property'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => { e.target.src = '/placeholder-property.jpg' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                          <Building className="h-10 w-10 text-gray-200" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${type === 'booked' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                          {type === 'booked' ? 'Finalized' : 'Interested'}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="font-black text-xl text-gray-900 truncate">
                            {property.title || property.slug || 'Property Name'}
                          </h4>
                          {property.location && (
                            <p className="text-sm font-bold text-gray-400 flex items-center gap-1.5 mt-2">
                              <MapPin className="h-4 w-4 text-gray-300" />
                              {property.location.city || property.location.address || 'Location'}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 group-hover:bg-white group-hover:border-[#700E08]/20 transition-all">
                            <p className="text-xl font-black text-gray-900 leading-none">
                              {property.price
                                ? (typeof property.price === 'object'
                                  ? (property.price.sale
                                    ? `₹${Number(property.price.sale).toLocaleString()}`
                                    : property.price.rent?.amount
                                      ? `₹${Number(property.price.rent.amount).toLocaleString()}`
                                      : 'N/A')
                                  : `₹${Number(property.price).toLocaleString()}`)
                                : 'N/A'}
                            </p>
                            {property.price?.rent?.amount && <p className="text-[10px] font-bold text-gray-400 text-right mt-1">/ month</p>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-[11px] font-black text-gray-500 uppercase tracking-tight">
                            {new Date(transaction?.transactionDate || interaction?.date || userData.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${(transaction?.status || interaction?.action) === 'completed' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'
                          }`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${(transaction?.status || interaction?.action) === 'completed' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                          <span className="text-[11px] font-black uppercase tracking-tight">
                            {transaction ? transaction.status : (interaction?.action || 'Initial Inquiry')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details if available */}
                  {transaction && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 block text-xs">Transaction Amount</span>
                        <span className="font-medium">₹{Number(transaction.amount || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Method</span>
                        <span className="capitalize">{transaction.paymentMethod?.replace('_', ' ') || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Transaction ID</span>
                        <span className="font-mono text-[10px]">{transaction.transactionId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Property Type</span>
                        <span className="capitalize">{property.type || '-'}</span>
                      </div>
                    </div>
                  )}

                  {/* Finalize Button for Admin */}
                  {type === 'booked' && transaction && transaction.status === 'pending' && (
                    <div className={`mt-4 p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${transaction.customerConfirmed ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${transaction.customerConfirmed ? 'bg-green-100' : 'bg-blue-100'}`}>
                          {transaction.customerConfirmed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${transaction.customerConfirmed ? 'text-green-800' : 'text-blue-800'}`}>
                            {transaction.customerConfirmed ? 'Confirmed by Customer' : 'Awaiting Customer Confirmation'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {transaction.customerConfirmed
                              ? 'The customer has accepted this booking. You can now finalize it.'
                              : 'The customer needs to confirm this booking from their dashboard.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFinalizeBooking(transaction)}
                        disabled={!transaction.customerConfirmed}
                        className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-extrabold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <DollarSign className="h-4 w-4" />
                        Finalize & Invoice
                      </button>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div className="space-y-8">
                {/* Interested Properties Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-8">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                    <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Building className="h-6 w-6 text-blue-600" />
                      </div>
                      Interested Properties
                    </h2>
                  </div>
                  <div className="space-y-6">
                    {filteredInterested.length > 0 ? (
                      <div className="grid grid-cols-1 gap-6">
                        {filteredInterested.map((ip, idx) => {
                          const pendingTx = pendingTransactions.find(t => (t.property?._id || t.property) === (ip.property?._id || ip.property))
                          return (
                            <div key={ip.property?._id || idx} className="bg-gray-50/30 p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md">
                              <div className="flex-1 w-full">
                                <PropertyCard
                                  property={ip.property}
                                  transaction={pendingTx}
                                  interaction={ip}
                                  type={pendingTx ? "booked" : "interested"}
                                />
                              </div>
                              {!pendingTx && canEditUser && (
                                <button
                                  onClick={() => handleConfirmProperty(ip.property)}
                                  className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-black transition-all shadow-lg shadow-green-200/50 active:scale-95 whitespace-nowrap"
                                >
                                  <CheckCircle className="h-5 w-5" />
                                  Initiate Booking
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="p-6 bg-gray-50 rounded-3xl mb-4">
                          <Building className="h-12 w-12 text-gray-200" />
                        </div>
                        <p className="text-xl font-extrabold text-gray-400">No Potential Properties</p>
                        <p className="text-sm text-gray-400 mt-1 max-w-xs font-medium">This customer has not expressed interest in any properties yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booked Properties Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-8">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                    <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      Success Pipeline
                    </h2>
                  </div>
                  <div className="space-y-6">
                    {bookedProperties.length > 0 ? (
                      <div className="grid grid-cols-1 gap-6">
                        {bookedProperties.map((t, idx) => (
                          <div key={t._id || idx} className="bg-green-50/10 p-6 rounded-2xl border border-green-100/50 shadow-sm">
                            <PropertyCard
                              property={t.property}
                              transaction={t}
                              type="booked"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="p-6 bg-gray-50 rounded-3xl mb-4">
                          <DollarSign className="h-12 w-12 text-gray-200" />
                        </div>
                        <p className="text-xl font-extrabold text-gray-400">No Finalized Bookings</p>
                        <p className="text-sm text-gray-400 mt-1 max-w-xs font-medium">Once a sale or lease is finalized, it will appear in the success pipeline.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Documents Tab - only documents for properties the customer has confirmed (completed transactions) */}
          {activeTab === 'documents' && (() => {
            const formatPropertyLocation = (loc) => {
              if (!loc) return ''
              if (typeof loc === 'string') return loc
              return [loc.city, loc.state, loc.address].filter(Boolean).join(', ') || ''
            }

            // Use confirmed properties (customer has completed transaction for that property)
            const groups = (confirmedProperties || []).map((g) => ({
              propertyKey: g.propertyKey || (g.property?._id || g.property)?.toString() || '',
              propertyTitle: g.property?.title || g.property?.slug || 'Property',
              propertyLocation: formatPropertyLocation(g.property?.location),
              primaryLeadId: g.primaryLeadId,
              documents: g.documents || []
            }))

            if (loadingConfirmedProperties) {
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Loading documents…</p>
                </div>
              )
            }

            if (groups.length === 0) {
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-400 mb-4">
                    <FileText className="h-7 w-7" />
                  </div>
                  <p className="text-gray-600 font-medium">No documents yet</p>
                  <p className="text-sm text-gray-500 mt-1">Documents appear here only for properties the customer has confirmed (completed bookings).</p>
                </div>
              )
            }

            return (
              <div className="space-y-8">
                {groups.map((group) => (
                  <div key={group.propertyKey} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          {group.propertyTitle}
                        </h3>
                        {group.propertyLocation && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {group.propertyLocation}
                          </p>
                        )}
                      </div>
                      {canEditUser && group.primaryLeadId && (
                        <button
                          onClick={() => {
                            setUploadTargetLead(group.primaryLeadId)
                            setSelectedFiles([])
                            setShowDocUploadModal(true)
                          }}
                          className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-2 font-medium shadow-sm transition-colors"
                        >
                          <Upload className="h-4 w-4 text-primary-600" />
                          Upload Document
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      {group.documents && group.documents.length > 0 ? (
                        <table className="w-full">
                          <thead className="bg-white border-b border-gray-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Document Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded By</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.documents.map(({ leadId, doc }, index) => (
                              <tr key={doc._id || `${leadId}-${index}`} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-50 rounded-lg">
                                      <FileText className="h-5 w-5 text-red-500" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{doc.name || 'Document'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {doc.size ? `${(doc.size / 1024).toFixed(2)} KB` : '-'}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {doc.uploadedBy && typeof doc.uploadedBy === 'object'
                                    ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
                                    : 'N/A'}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleDownloadDocument(doc)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Download"
                                    >
                                      <Download className="h-4 w-4" />
                                    </button>
                                    {canEditUser && (
                                      <button
                                        onClick={() => handleDeleteDocument(leadId, doc)}
                                        disabled={deletingDocument === doc._id}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                        title="Delete"
                                      >
                                        {deletingDocument === doc._id ? (
                                          <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="py-8 text-center bg-gray-50/50">
                          <p className="text-sm text-gray-500">No documents uploaded yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Document Upload Modal */}
                {showDocUploadModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
                      <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
                          <p className="text-sm text-gray-500 mt-1">Add files to selected property</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowDocUploadModal(false)
                            setSelectedFiles([])
                            setUploadTargetLead('')
                          }}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <XCircle className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                        </button>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Property Info Read-only */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">
                            Target Property
                          </label>
                          <div className="flex items-center gap-2 text-blue-900 font-medium">
                            <Building className="h-4 w-4" />
                            {groups.find(g => g.primaryLeadId === uploadTargetLead)?.propertyTitle || 'Selected Property'}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select PDF Files *
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary-500 transition-colors bg-gray-50 hover:bg-gray-100 text-center cursor-pointer relative">
                            <input
                              type="file"
                              accept="application/pdf"
                              multiple
                              onChange={(e) => setSelectedFiles(e.target.files)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 font-medium">Click to upload or drag and drop</p>
                            <p className="text-xs text-gray-500 mt-1">PDF files only (Max 2 files)</p>
                          </div>
                          {selectedFiles && selectedFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {Array.from(selectedFiles).map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                                  <span className="truncate max-w-[200px]">{file.name}</span>
                                  <span className="text-gray-500 text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                        <button
                          onClick={() => {
                            setShowDocUploadModal(false)
                            setSelectedFiles([])
                            setUploadTargetLead('')
                          }}
                          className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUploadDocuments}
                          disabled={uploadingDocuments || !selectedFiles || selectedFiles.length === 0}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                        >
                          {uploadingDocuments ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload Documents
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

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
                {userData?.notes && userData.notes.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Note</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date & Time</th>
                        {canEditUser && (
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userData.notes.map((note, index) => (
                        <tr key={note._id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            {editingNoteId === (note._id?.toString?.() || note._id) ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateNote(note._id?.toString?.() || note._id)}
                                    disabled={updatingNote || !editingNoteText.trim()}
                                    className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                                  >
                                    {updatingNote ? 'Saving…' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => { setEditingNoteId(null); setEditingNoteText('') }}
                                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-900">{note.note}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {new Date(note.createdAt).toLocaleString()}
                            </div>
                          </td>
                          {canEditUser && (
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {editingNoteId === (note._id?.toString?.() || note._id) ? null : (note._id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(note._id?.toString?.() || note._id)
                                      setEditingNoteText(note.note || '')
                                    }}
                                    className="px-2 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                                    title="Update note"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Update
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note._id?.toString?.() || note._id)}
                                    disabled={deletingNoteId === (note._id?.toString?.() || note._id)}
                                    className="px-2 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1 disabled:opacity-50"
                                    title="Delete note"
                                  >
                                    {deletingNoteId === (note._id?.toString?.() || note._id) ? (
                                      <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    Delete
                                  </button>
                                </div>
                              ) : null)}
                            </td>
                          )}
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
              {canEditUser && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNote()
                        }
                      }}
                      placeholder="Add a note..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={handleAddNote}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Add Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTask ? 'Edit Task' : 'New Task'}
                </h2>
                <button
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                    setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', taskType: 'other' })
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
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Enter task description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Type
                  </label>
                  <select
                    value={newTask.taskType || 'other'}
                    onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowTaskModal(false)
                    setEditingTask(null)
                    setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', taskType: 'other' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingTask) {
                      handleUpdateTask(editingTask)
                    } else {
                      handleAddTask()
                    }
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingTask ? 'Update' : 'Add'} Task
                </button>
              </div>
            </div>
          </div>
        )}

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
                  onClick={() => {
                    if (editingReminder) {
                      handleUpdateReminder(editingReminder)
                    } else {
                      handleAddReminder()
                    }
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingReminder ? 'Update' : 'Add'} Reminder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Site Visit Modal */}
        {showSiteVisitModal && (() => {
          // Get unique properties from user inquiries
          const uniqueProperties = []
          const seenPropertyIds = new Set()
          
          userInquiries.forEach(inq => {
            if (inq.property) {
              const propId = inq.property._id || inq.property
              if (propId && !seenPropertyIds.has(propId.toString())) {
                seenPropertyIds.add(propId.toString())
                uniqueProperties.push({
                  property: inq.property,
                  leadId: inq.realLeadId || inq._id,
                  inquiry: inq
                })
              }
            }
          })

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingSiteVisitId ? 'Update Site Visit' : 'Schedule Site Visit'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSiteVisitModal(false)
                      setEditingSiteVisitId(null)
                      setSchedulingForLeadId(null)
                      setSiteVisitData({ scheduledDate: '', scheduledTime: '', propertyId: '', leadId: '' })
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Property *
                    </label>
                    {uniqueProperties.length === 0 ? (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          No properties found for this user. Please ensure the user has made inquiries about properties.
                        </p>
                      </div>
                    ) : (
                      <select
                        value={siteVisitData.propertyId || ''}
                        onChange={(e) => {
                          const selectedProperty = uniqueProperties.find(p => 
                            (p.property._id || p.property) === e.target.value
                          )
                          if (selectedProperty) {
                            setSiteVisitData({
                              ...siteVisitData,
                              propertyId: e.target.value,
                              leadId: selectedProperty.leadId
                            })
                            setSchedulingForLeadId(selectedProperty.leadId)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      >
                        <option value="">Select a property...</option>
                        {uniqueProperties.map((item, idx) => {
                          const propName = item.property?.title || item.property?.slug || 'Property'
                          const propLocation = item.property?.location?.city || item.property?.location?.address || ''
                          const displayText = propLocation ? `${propName} - ${propLocation}` : propName
                          return (
                            <option key={item.property._id || item.property || idx} value={item.property._id || item.property}>
                              {displayText}
                            </option>
                          )
                        })}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Date *
                    </label>
                    <input
                      type="date"
                      value={siteVisitData.scheduledDate}
                      onChange={(e) => setSiteVisitData({ ...siteVisitData, scheduledDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Time *
                    </label>
                    <input
                      type="time"
                      value={siteVisitData.scheduledTime}
                      onChange={(e) => setSiteVisitData({ ...siteVisitData, scheduledTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-6 border-t">
                  <button
                    onClick={() => {
                      setShowSiteVisitModal(false)
                      setEditingSiteVisitId(null)
                      setSchedulingForLeadId(null)
                      setSiteVisitData({ scheduledDate: '', scheduledTime: '', propertyId: '', leadId: '' })
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScheduleSiteVisit}
                    disabled={!siteVisitData.propertyId || !siteVisitData.scheduledDate || !siteVisitData.scheduledTime}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingSiteVisitId ? 'Update' : 'Schedule'} Visit
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Complete Site Visit Modal */}
        {showCompleteVisitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Complete Site Visit</h2>
                <button
                  onClick={() => {
                    setShowCompleteVisitModal(false)
                    setCompletingForLeadId(null)
                    setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback
                  </label>
                  <textarea
                    value={visitCompletionData.feedback}
                    onChange={(e) => setVisitCompletionData({ ...visitCompletionData, feedback: e.target.value })}
                    placeholder="Enter feedback about the site visit"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interest Level
                  </label>
                  <select
                    value={visitCompletionData.interestLevel}
                    onChange={(e) => setVisitCompletionData({ ...visitCompletionData, interestLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Action
                  </label>
                  <input
                    type="text"
                    value={visitCompletionData.nextAction}
                    onChange={(e) => setVisitCompletionData({ ...visitCompletionData, nextAction: e.target.value })}
                    placeholder="What's the next step?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowCompleteVisitModal(false)
                    setCompletingForLeadId(null)
                    setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteSiteVisit}
                  disabled={completingVisit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {completingVisit ? 'Completing...' : 'Mark as Completed'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Completed Visit (Remarks) Modal */}
        {viewCompletedVisit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Visit Remarks</h2>
                <button
                  onClick={() => setViewCompletedVisit(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Property</p>
                  <p className="text-gray-900">
                    {viewCompletedVisit._property?.title || viewCompletedVisit._property?.slug || viewCompletedVisit.property?.title || viewCompletedVisit.property?.slug || '—'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewCompletedVisit.feedback || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Level</label>
                  <p className="text-gray-900 capitalize">{viewCompletedVisit.interestLevel ? viewCompletedVisit.interestLevel.replace('_', ' ') : '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
                  <p className="text-gray-900">{viewCompletedVisit.nextAction || '—'}</p>
                </div>
              </div>
              <div className="flex justify-end p-6 border-t">
                <button
                  onClick={() => setViewCompletedVisit(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Completion Remarks Modal */}
        {editingCompletedVisit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Update Completion Remarks</h2>
                <button
                  onClick={() => {
                    setEditingCompletedVisit(null)
                    setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                  <textarea
                    value={visitCompletionData.feedback}
                    onChange={(e) => setVisitCompletionData({ ...visitCompletionData, feedback: e.target.value })}
                    placeholder="Enter feedback about the site visit"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Level</label>
                  <select
                    value={visitCompletionData.interestLevel}
                    onChange={(e) => setVisitCompletionData({ ...visitCompletionData, interestLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
                  <input
                    type="text"
                    value={visitCompletionData.nextAction}
                    onChange={(e) => setVisitCompletionData({ ...visitCompletionData, nextAction: e.target.value })}
                    placeholder="What's the next step?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setEditingCompletedVisit(null)
                    setVisitCompletionData({ feedback: '', interestLevel: 'medium', nextAction: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCompletionRemarks}
                  disabled={updatingCompletion}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {updatingCompletion ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedTransaction ? 'Finalize Booking' : 'Initiate Booking'}
                </h2>
                <button
                  onClick={() => {
                    setShowBookingModal(false)
                    setSelectedTransaction(null)
                    setBookingData({
                      amount: '',
                      type: 'sale',
                      transactionDate: new Date().toISOString().split('T')[0],
                      unitNumber: '',
                      paymentMethod: 'bank_transfer',
                      notes: '',
                      commissionPercentage: '2',
                      propertyId: '',
                      leadId: ''
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Type *
                    </label>
                    <select
                      value={bookingData.type}
                      onChange={(e) => setBookingData({ ...bookingData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="sale">Sale</option>
                      <option value="rent">Rent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      value={bookingData.amount}
                      onChange={(e) => setBookingData({ ...bookingData, amount: e.target.value })}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Date *
                    </label>
                    <input
                      type="date"
                      value={bookingData.transactionDate}
                      onChange={(e) => setBookingData({ ...bookingData, transactionDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={bookingData.paymentMethod}
                      onChange={(e) => setBookingData({ ...bookingData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online Payment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Number
                    </label>
                    <input
                      type="text"
                      value={bookingData.unitNumber}
                      onChange={(e) => setBookingData({ ...bookingData, unitNumber: e.target.value })}
                      placeholder="Enter unit number (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Commission Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={bookingData.commissionPercentage}
                      onChange={(e) => setBookingData({ ...bookingData, commissionPercentage: e.target.value })}
                      placeholder="2"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    placeholder="Additional notes (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => {
                    setShowBookingModal(false)
                    setSelectedTransaction(null)
                    setBookingData({
                      amount: '',
                      type: 'sale',
                      transactionDate: new Date().toISOString().split('T')[0],
                      unitNumber: '',
                      paymentMethod: 'bank_transfer',
                      notes: '',
                      commissionPercentage: '2',
                      propertyId: '',
                      leadId: ''
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBooking}
                  disabled={creatingBooking}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {creatingBooking ? 'Processing...' : (selectedTransaction ? 'Finalize' : 'Create Booking')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Finalize Booking Modal */}
        {showFinalizeModal && finalizingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Finalize Booking & Generate Invoice</h2>
                  <p className="text-sm text-gray-500 mt-1">Enter payment details to complete the transaction</p>
                </div>
                <button
                  onClick={() => {
                    setShowFinalizeModal(false)
                    setFinalizingTransaction(null)
                    setFinalizationData({
                      amountPaid: '',
                      dueAmount: '',
                      paymentDate: new Date().toISOString().split('T')[0],
                      paymentMethod: 'bank_transfer',
                      transactionReference: '',
                      notes: ''
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Transaction Summary */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">Transaction Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">Total Amount:</span>
                      <span className="ml-2 text-blue-900 font-bold">
                        ₹{Number(finalizingTransaction.amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Transaction Type:</span>
                      <span className="ml-2 text-blue-900 font-medium capitalize">
                        {finalizingTransaction.type || 'sale'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Details Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount Paid (₹) *
                      </label>
                      <input
                        type="number"
                        value={finalizationData.amountPaid}
                        onChange={(e) => {
                          const paid = e.target.value
                          const total = Number(finalizingTransaction.amount || 0)
                          const due = total - Number(paid || 0)
                          setFinalizationData({
                            ...finalizationData,
                            amountPaid: paid,
                            dueAmount: due >= 0 ? due.toString() : '0'
                          })
                        }}
                        placeholder="Enter amount paid"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500 mt-1">Amount customer has paid</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Amount (₹) *
                      </label>
                      <input
                        type="number"
                        value={finalizationData.dueAmount}
                        onChange={(e) => {
                          const due = e.target.value
                          const total = Number(finalizingTransaction.amount || 0)
                          const paid = total - Number(due || 0)
                          setFinalizationData({
                            ...finalizationData,
                            dueAmount: due,
                            amountPaid: paid >= 0 ? paid.toString() : '0'
                          })
                        }}
                        placeholder="Remaining amount"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-50"
                        required
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500 mt-1">Remaining amount to be paid</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        value={finalizationData.paymentDate}
                        onChange={(e) => setFinalizationData({ ...finalizationData, paymentDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={finalizationData.paymentMethod}
                        onChange={(e) => setFinalizationData({ ...finalizationData, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="online">Online Payment</option>
                        <option value="upi">UPI</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="debit_card">Debit Card</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Reference / Receipt Number
                    </label>
                    <input
                      type="text"
                      value={finalizationData.transactionReference}
                      onChange={(e) => setFinalizationData({ ...finalizationData, transactionReference: e.target.value })}
                      placeholder="Enter transaction ID, receipt number, etc. (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Reference number for this payment</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={finalizationData.notes}
                      onChange={(e) => setFinalizationData({ ...finalizationData, notes: e.target.value })}
                      placeholder="Any additional notes about this payment (optional)"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Amount Validation Display */}
                  {finalizationData.amountPaid && finalizationData.dueAmount && (
                    <div className={`p-3 rounded-lg border ${
                      Number(finalizationData.amountPaid || 0) + Number(finalizationData.dueAmount || 0) === Number(finalizingTransaction.amount || 0)
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 text-sm">
                        {Number(finalizationData.amountPaid || 0) + Number(finalizationData.dueAmount || 0) === Number(finalizingTransaction.amount || 0) ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={Number(finalizationData.amountPaid || 0) + Number(finalizationData.dueAmount || 0) === Number(finalizingTransaction.amount || 0) ? 'text-green-800' : 'text-red-800'}>
                          Amount Paid (₹{Number(finalizationData.amountPaid || 0).toLocaleString()}) + 
                          Due Amount (₹{Number(finalizationData.dueAmount || 0).toLocaleString()}) = 
                          ₹{(Number(finalizationData.amountPaid || 0) + Number(finalizationData.dueAmount || 0)).toLocaleString()} 
                          {Number(finalizationData.amountPaid || 0) + Number(finalizationData.dueAmount || 0) !== Number(finalizingTransaction.amount || 0) && 
                            ` (Should be ₹${Number(finalizingTransaction.amount || 0).toLocaleString()})`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowFinalizeModal(false)
                    setFinalizingTransaction(null)
                    setFinalizationData({
                      amountPaid: '',
                      dueAmount: '',
                      paymentDate: new Date().toISOString().split('T')[0],
                      paymentMethod: 'bank_transfer',
                      transactionReference: '',
                      notes: ''
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFinalization}
                  disabled={creatingBooking || !finalizationData.amountPaid || !finalizationData.paymentDate}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                >
                  {creatingBooking ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      Finalize & Generate Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  )
}
