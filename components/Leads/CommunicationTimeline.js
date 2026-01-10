'use client'

import { useState } from 'react'
import { Phone, Mail, MessageSquare, Calendar, Clock, Filter, Search, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const formatTimeAgo = (date) => {
  const now = new Date()
  const diff = now - new Date(date)
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

export default function CommunicationTimeline({ communications = [], onExport }) {
  const [filter, setFilter] = useState({ type: '', date: '', search: '' })

  const filteredCommunications = communications.filter(comm => {
    if (filter.type && comm.type !== filter.type) return false
    if (filter.date) {
      const commDate = new Date(comm.createdAt).toISOString().split('T')[0]
      if (commDate !== filter.date) return false
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      if (!comm.message?.toLowerCase().includes(searchLower) && 
          !comm.subject?.toLowerCase().includes(searchLower)) return false
    }
    return true
  })

  const getCommunicationIcon = (type) => {
    switch (type) {
      case 'call':
        return <Phone className="h-5 w-5 text-blue-600" />
      case 'email':
        return <Mail className="h-5 w-5 text-green-600" />
      case 'sms':
        return <MessageSquare className="h-5 w-5 text-purple-600" />
      case 'meeting':
        return <Calendar className="h-5 w-5 text-orange-600" />
      default:
        return <MessageSquare className="h-5 w-5 text-gray-600" />
    }
  }

  const getCommunicationColor = (type) => {
    switch (type) {
      case 'call':
        return 'bg-blue-100 border-blue-300'
      case 'email':
        return 'bg-green-100 border-green-300'
      case 'sms':
        return 'bg-purple-100 border-purple-300'
      case 'meeting':
        return 'bg-orange-100 border-orange-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  const stats = {
    total: communications.length,
    byType: communications.reduce((acc, comm) => {
      acc[comm.type] = (acc[comm.type] || 0) + 1
      return acc
    }, {})
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        {Object.entries(stats.byType).map(([type, count]) => (
          <div key={type} className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1 capitalize">{type}</p>
            <p className="text-2xl font-bold text-gray-900">{count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
          </select>
          <input
            type="date"
            value={filter.date}
            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              placeholder="Search communications..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {onExport && (
            <button
              onClick={() => onExport(filteredCommunications)}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredCommunications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No communications found</p>
          </div>
        ) : (
          filteredCommunications
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((comm, index) => (
              <div
                key={index}
                className={`relative pl-8 pb-4 border-l-2 ${getCommunicationColor(comm.type)}`}
              >
                <div className="absolute left-0 top-0 -ml-1.5">
                  <div className={`h-3 w-3 rounded-full border-2 border-white ${getCommunicationColor(comm.type).replace('bg-', 'bg-').split(' ')[0]}`} />
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCommunicationIcon(comm.type)}
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {comm.type} {comm.direction && `(${comm.direction})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(comm.createdAt)}
                    </div>
                  </div>
                  {comm.subject && (
                    <p className="text-sm font-medium text-gray-900 mb-1">{comm.subject}</p>
                  )}
                  {comm.message && (
                    <p className="text-sm text-gray-600">{comm.message}</p>
                  )}
                  {comm.createdBy && typeof comm.createdBy === 'object' && (
                    <p className="text-xs text-gray-500 mt-2">
                      By: {comm.createdBy.firstName} {comm.createdBy.lastName}
                    </p>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}

