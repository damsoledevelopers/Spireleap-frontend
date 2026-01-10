'use client'

import { useState, useEffect } from 'react'
import { Activity, Filter, Search, Download, RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'

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

export default function ActivityFeed({ entityType, entityId, limit = 50 }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: '', date: '', search: '' })

  useEffect(() => {
    fetchActivities()
  }, [entityType, entityId, filter])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (entityType) queryParams.append('entityType', entityType)
      if (entityId) queryParams.append('entityId', entityId)
      if (filter.type) queryParams.append('type', filter.type)
      if (filter.date) queryParams.append('date', filter.date)
      if (limit) queryParams.append('limit', limit)

      const response = await api.get(`/activities?${queryParams.toString()}`)
      setActivities(response.data.activities || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter(activity => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      if (!activity.title?.toLowerCase().includes(searchLower) && 
          !activity.description?.toLowerCase().includes(searchLower)) return false
    }
    return true
  })

  const getActivityIcon = (type) => {
    switch (type) {
      case 'lead_created':
      case 'lead_updated':
        return '📋'
      case 'property_created':
      case 'property_updated':
        return '🏠'
      case 'payment_received':
        return '💰'
      case 'task_completed':
        return '✅'
      default:
        return '📝'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
            <option value="lead_created">Lead Created</option>
            <option value="lead_updated">Lead Updated</option>
            <option value="property_created">Property Created</option>
            <option value="property_updated">Property Updated</option>
            <option value="payment_received">Payment Received</option>
            <option value="task_completed">Task Completed</option>
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
              placeholder="Search activities..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={fetchActivities}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No activities found</p>
          </div>
        ) : (
          filteredActivities.map((activity, index) => (
            <div
              key={activity._id || index}
              className="relative pl-8 pb-4 border-l-2 border-gray-300"
            >
              <div className="absolute left-0 top-0 -ml-1.5">
                <div className="h-3 w-3 rounded-full bg-primary-600 border-2 border-white" />
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getActivityIcon(activity.type)}</span>
                    <span className="text-sm font-semibold text-gray-900">{activity.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatTimeAgo(activity.createdAt)}</span>
                </div>
                {activity.description && (
                  <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                )}
                {activity.performedBy && typeof activity.performedBy === 'object' && (
                  <p className="text-xs text-gray-500">
                    By: {activity.performedBy.firstName} {activity.performedBy.lastName}
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

