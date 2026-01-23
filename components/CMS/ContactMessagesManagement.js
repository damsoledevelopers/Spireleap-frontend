'use client'

import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Search, Mail, Phone, User, Calendar, Trash2, Eye, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import EntryPermissionModal from '../Permissions/EntryPermissionModal'
import { checkEntryPermission } from '../../lib/permissions'

export default function ContactMessagesManagement() {
  const { user, checkPermission } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const canViewMessages = checkPermission('contact_messages', 'view')
  const canDeleteMessage = checkPermission('contact_messages', 'delete')

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [permissionModalEntry, setPermissionModalEntry] = useState(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/contact-messages')
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Error fetching contact messages:', error)
      toast.error('Failed to load contact messages')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return
    try {
      await api.delete(`/cms/contact-messages/${id}`)
      toast.success('Message deleted successfully')
      fetchMessages()
    } catch (error) {
      toast.error('Failed to delete message')
    }
  }

  const handleView = (message) => {
    setSelectedMessage(message)
    setShowModal(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter messages by search term (name, email, phone)
  const filteredMessages = messages.filter(message => {
    const searchLower = searchTerm.toLowerCase()
    return (
      message.name?.toLowerCase().includes(searchLower) ||
      message.email?.toLowerCase().includes(searchLower) ||
      message.phone?.toLowerCase().includes(searchLower) ||
      message.subject?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Total Messages: {filteredMessages.length}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No contact messages found</p>
            <p className="text-sm mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'No messages have been submitted yet'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMessages.map((message) => (
                  <tr key={message._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{message.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        {message.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        {message.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={message.subject}>
                        {message.subject || 'No Subject'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate(message.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {checkEntryPermission(message, user, 'view', canViewMessages) && (
                          <button
                            onClick={() => handleView(message)}
                            className="text-primary-600 hover:text-primary-900"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        )}
                        {canDeleteMessage && (
                          <button
                            onClick={() => handleDelete(message._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPermissionModalEntry(message)
                            }}
                            className="text-amber-600 hover:text-amber-900"
                            title="Set Custom Permissions"
                          >
                            <ShieldCheck className="h-5 w-5" />
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
      )}

      {/* View Message Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Contact Message Details</h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedMessage(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">{selectedMessage.name}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">{selectedMessage.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-400 mr-2" />
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {selectedMessage.email}
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">{selectedMessage.subject || 'No Subject'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submitted On</label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">{formatDate(selectedMessage.createdAt)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedMessage(null)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedMessage.email) {
                        toast.error('Email address is not available')
                        return
                      }
                      const subject = encodeURIComponent(`Re: ${selectedMessage.subject || 'Your Inquiry'}`)
                      const mailtoLink = `mailto:${selectedMessage.email}?subject=${subject}`
                      window.location.href = mailtoLink
                    }}
                    disabled={!selectedMessage.email}
                    className={`px-4 py-2 rounded-lg transition-colors ${selectedMessage.email
                      ? 'bg-primary-600 text-white hover:bg-primary-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Reply via Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <EntryPermissionModal
        isOpen={!!permissionModalEntry}
        onClose={() => setPermissionModalEntry(null)}
        entry={permissionModalEntry}
        entryType="contact-messages"
        onSuccess={fetchMessages}
      />
    </div>
  )
}

