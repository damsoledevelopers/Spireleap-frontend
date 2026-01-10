'use client'

import { useState, useEffect } from 'react'
import { Clock, AlertCircle, CheckCircle, Calendar } from 'lucide-react'
import { api } from '../../lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function FollowUpWidget({ limit = 10 }) {
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFollowUps()
  }, [])

  const fetchFollowUps = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/leads?followUpDate=${new Date().toISOString().split('T')[0]}&limit=${limit}`)
      const leads = response.data.leads || []
      
      // Get leads with upcoming follow-ups
      const upcomingFollowUps = leads
        .filter(lead => lead.followUpDate)
        .map(lead => ({
          ...lead,
          followUpDate: new Date(lead.followUpDate),
          isOverdue: new Date(lead.followUpDate) < new Date(),
          isToday: new Date(lead.followUpDate).toDateString() === new Date().toDateString()
        }))
        .sort((a, b) => a.followUpDate - b.followUpDate)
        .slice(0, limit)

      setFollowUps(upcomingFollowUps)
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkComplete = async (leadId) => {
    try {
      await api.put(`/leads/${leadId}`, { followUpDate: null })
      toast.success('Follow-up marked as complete')
      fetchFollowUps()
    } catch (error) {
      console.error('Error marking follow-up complete:', error)
      toast.error('Failed to update follow-up')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-yellow-600 to-yellow-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Upcoming Follow-ups
        </h3>
      </div>
      <div className="divide-y divide-gray-200">
        {followUps.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No upcoming follow-ups</p>
          </div>
        ) : (
          followUps.map((lead) => (
            <div
              key={lead._id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                lead.isOverdue ? 'bg-red-50' : lead.isToday ? 'bg-yellow-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {lead.isOverdue ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : lead.isToday ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Calendar className="h-4 w-4 text-blue-500" />
                    )}
                    <Link
                      href={`/admin/leads/${lead._id}`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600"
                    >
                      {lead.leadId || `LEAD-${String(lead._id).slice(-6)}`}
                    </Link>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      lead.isOverdue ? 'bg-red-100 text-red-800' :
                      lead.isToday ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {lead.isOverdue ? 'Overdue' : lead.isToday ? 'Today' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {lead.contact?.firstName} {lead.contact?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {lead.followUpDate.toLocaleDateString()} at {lead.followUpDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleMarkComplete(lead._id)}
                  className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  Complete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {followUps.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <Link
            href="/admin/leads?filter=followUp"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all follow-ups →
          </Link>
        </div>
      )}
    </div>
  )
}

