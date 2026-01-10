'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { CheckCircle, XCircle, Eye, Clock, MapPin, User, Building } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AdminPendingPropertiesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)

  useEffect(() => {
    fetchPendingProperties()
  }, [])

  const fetchPendingProperties = async () => {
    try {
      setLoading(true)
      const response = await api.get('/properties?status=pending')
      setProperties(response.data.properties || [])
    } catch (error) {
      console.error('Error fetching pending properties:', error)
      toast.error('Failed to load pending properties')
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (propertyId, status, reason = '') => {
    setApproving(propertyId)
    try {
      await api.put(`/properties/${propertyId}/approve`, { 
        status: status === 'active' ? 'active' : 'inactive',
        rejectionReason: reason 
      })
      toast.success(`Property ${status === 'active' ? 'approved' : 'rejected'} successfully`)
      fetchPendingProperties()
      setShowRejectModal(false)
      setSelectedProperty(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error approving property:', error)
      toast.error(error.response?.data?.message || 'Failed to update property status')
    } finally {
      setApproving(null)
    }
  }

  const handleRejectClick = (property) => {
    setSelectedProperty(property)
    setShowRejectModal(true)
  }

  const formatPrice = (property) => {
    if (!property.price) return 'Price on request'
    if (property.listingType === 'sale' && property.price.sale) {
      return `$${Number(property.price.sale).toLocaleString()}`
    }
    if (property.listingType === 'rent' && property.price.rent) {
      return `$${Number(property.price.rent.amount).toLocaleString()}/${property.price.rent.period || 'month'}`
    }
    return 'Price on request'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Properties</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve properties submitted by agents
            </p>
          </div>
          <Link href="/admin/properties" className="btn btn-secondary">
            View All Properties
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No pending properties</p>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <div
                key={property._id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="md:flex">
                  {/* Image */}
                  <div className="md:w-64 h-48 md:h-auto bg-gray-200 flex-shrink-0">
                    {property.images && property.images.length > 0 ? (
                      <img
                        src={typeof property.images[0] === 'string' ? property.images[0] : (property.images[0]?.url || property.images[0])}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {property.location?.address}, {property.location?.city}, {property.location?.state}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {property.agent && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>
                                {property.agent.firstName} {property.agent.lastName}
                              </span>
                            </div>
                          )}
                          {property.agency && (
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              <span>
                                {typeof property.agency === 'object' ? property.agency.name : 'Agency'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Price</p>
                        <p className="text-lg font-semibold text-primary-600">
                          {formatPrice(property)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Type</p>
                        <p className="text-sm font-medium">{property.propertyType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Bedrooms</p>
                        <p className="text-sm font-medium">{property.specifications?.bedrooms || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Bathrooms</p>
                        <p className="text-sm font-medium">{property.specifications?.bathrooms || 0}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Link
                        href={`/properties/${property.slug || property._id}`}
                        target="_blank"
                        className="btn btn-secondary btn-sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                      <button
                        onClick={() => handleApproval(property._id, 'active')}
                        disabled={approving === property._id}
                        className="btn btn-primary btn-sm"
                      >
                        {approving === property._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectClick(property)}
                        disabled={approving === property._id}
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectModal && selectedProperty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-semibold mb-4">Reject Property</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to reject <strong>{selectedProperty.title}</strong>?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Please provide a reason for rejection..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedProperty(null)
                    setRejectionReason('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproval(selectedProperty._id, 'inactive', rejectionReason)}
                  disabled={approving === selectedProperty._id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {approving === selectedProperty._id ? 'Rejecting...' : 'Reject Property'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

