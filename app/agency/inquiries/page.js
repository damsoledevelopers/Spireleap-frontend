'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Search, Phone, Mail, User, MessageSquare, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function InquiriesPage() {
  const { user, loading: authLoading } = useAuth()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: ''
  })
  const [approving, setApproving] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })

  useEffect(() => {
    if (user && !authLoading) {
      fetchInquiries()
    }
  }, [filters, pagination.page, user, authLoading])

  const fetchInquiries = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })
      
      const response = await api.get(`/leads?${params}`)
      // Filter inquiries for this agency
      const allInquiries = response.data.leads || []
      const agencyInquiries = allInquiries.filter(inquiry => {
        const inquiryAgencyId = inquiry.agency?._id || inquiry.agency?.toString() || inquiry.agency
        const userAgencyId = user.agency?._id || user.agency?.toString() || user.agency
        return inquiryAgencyId?.toString() === userAgencyId?.toString()
      })
      
      setInquiries(agencyInquiries)
      setPagination({
        ...response.data.pagination,
        total: agencyInquiries.length,
        pages: Math.ceil(agencyInquiries.length / pagination.limit)
      })
    } catch (error) {
      console.error('Error fetching inquiries:', error)
      toast.error('Failed to load inquiries')
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (inquiryId, inquiry) => {
    setApproving(inquiryId)
    try {
      // Ensure the inquiry is assigned to the agent when approved
      const updateData = {
        isApproved: true,
        assignedAgent: inquiry.assignedAgent?._id || inquiry.assignedAgent || inquiry.property?.agent?._id || inquiry.property?.agent
      }
      
      await api.put(`/leads/${inquiryId}`, updateData)
      toast.success('Inquiry approved and assigned to agent')
      fetchInquiries()
    } catch (error) {
      console.error('Error updating approval:', error)
      toast.error('Failed to update approval status')
    } finally {
      setApproving(null)
    }
  }


  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all inquiries sent by users for your agency properties
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {filters.search && (
              <button
                onClick={() => setFilters({ search: '' })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Inquiries Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No inquiries found</p>
            <p className="text-gray-400 text-sm mt-2">
              {filters.search 
                ? 'Try adjusting your search' 
                : 'No inquiries have been submitted yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approval
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inquiries
                    .filter(inquiry => {
                      if (filters.search) {
                        const searchLower = filters.search.toLowerCase()
                        const name = `${inquiry.contact?.firstName || ''} ${inquiry.contact?.lastName || ''}`.toLowerCase()
                        const email = inquiry.contact?.email?.toLowerCase() || ''
                        const phone = inquiry.contact?.phone?.toLowerCase() || ''
                        if (!name.includes(searchLower) && !email.includes(searchLower) && !phone.includes(searchLower)) {
                          return false
                        }
                      }
                      return true
                    })
                    .map((inquiry) => (
                    <tr key={inquiry._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {inquiry.contact?.firstName} {inquiry.contact?.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {inquiry.property ? (
                          <div className="text-sm text-gray-900">
                            {inquiry.property.title || 'Unknown Property'}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No property</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {inquiry.contact?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {inquiry.contact?.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inquiry.assignedAgent ? (
                          <div className="text-sm text-gray-900">
                            {inquiry.assignedAgent.firstName} {inquiry.assignedAgent.lastName}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inquiry.isApproved ? (
                          <div className="flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApproval(inquiry._id, inquiry)}
                            disabled={approving === inquiry._id || !inquiry.assignedAgent}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!inquiry.assignedAgent ? 'Please assign an agent first' : 'Click to approve'}
                          >
                            {approving === inquiry._id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-800"></div>
                                <span className="text-sm font-medium">Processing...</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-medium">Pending</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

