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
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function StaffLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [newCommunication, setNewCommunication] = useState({ type: 'call', message: '' })
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium' })

  useEffect(() => {
    fetchLead()
  }, [params.id])

  const fetchLead = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/leads/${params.id}`)
      setLead(response.data.lead)
    } catch (error) {
      console.error('Error fetching lead:', error)
      toast.error('Failed to load lead details')
      router.push('/staff/leads')
    } finally {
      setLoading(false)
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
    const safePriority = (priority || 'medium').toString()
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[safePriority] || colors.medium}`}>
        {safePriority.toUpperCase()}
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
            <Link href="/staff/leads" className="text-gray-600 hover:text-gray-900">
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
            {getStatusBadge(lead.status)}
            {getPriorityBadge(lead.priority)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{lead.contact.firstName} {lead.contact.lastName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{lead.contact.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{lead.contact.phone}</p>
                  </div>
                </div>
                {lead.contact.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">
                        {lead.contact.address.street}, {lead.contact.address.city}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inquiry Details */}
            {lead.inquiry && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Inquiry Details</h2>
                {lead.inquiry.message && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Message</p>
                    <p className="text-gray-900">{lead.inquiry.message}</p>
                  </div>
                )}
                {lead.inquiry.budget && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Budget Range</p>
                      <p className="font-medium">
                        ${lead.inquiry.budget.min?.toLocaleString()} - ${lead.inquiry.budget.max?.toLocaleString()}
                      </p>
                    </div>
                    {lead.inquiry.timeline && (
                      <div>
                        <p className="text-sm text-gray-500">Timeline</p>
                        <p className="font-medium capitalize">{lead.inquiry.timeline.replace('_', ' ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <div className="space-y-3 mb-4">
                {lead.notes?.map((note, index) => (
                  <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                    <p className="text-sm text-gray-900">{note.note}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button onClick={handleAddNote} className="btn btn-primary">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Communications */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Communications</h2>
              <div className="space-y-3 mb-4">
                {lead.communications?.map((comm, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{comm.type}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comm.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">{comm.message}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <select
                  value={newCommunication.type}
                  onChange={(e) => setNewCommunication({ ...newCommunication, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCommunication.message}
                    onChange={(e) => setNewCommunication({ ...newCommunication, message: e.target.value })}
                    placeholder="Communication details..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <button onClick={handleAddCommunication} className="btn btn-primary">
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>
              <div className="space-y-3 mb-4">
                {lead.tasks?.map((task, index) => (
                  <div key={index} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
                      {task.dueDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(task.priority)}
                      {task.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <button onClick={handleAddTask} className="btn btn-primary w-full">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Task
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Source</p>
                  <p className="font-medium capitalize">{lead.source?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assigned Agent</p>
                  {lead.assignedAgent ? (
                    <p className="font-medium">
                      {lead.assignedAgent.firstName} {lead.assignedAgent.lastName}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Unassigned</p>
                  )}
                </div>
                {lead.property && (
                  <div>
                    <p className="text-sm text-gray-500">Property</p>
                    <Link
                      href={`/properties/${lead.property.slug || lead.property._id}`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      {lead.property.title}
                    </Link>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

