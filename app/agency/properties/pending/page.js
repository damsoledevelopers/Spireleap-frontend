'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { CheckCircle, XCircle, Eye, Clock, MapPin, User } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function PendingPropertiesPage() {
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
      // Close modal after successful approval/rejection
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
    if (property.listingType === 'sale' && property.price?.sale) {
      return `$${property.price.sale.toLocaleString()}`
    } else if (property.listingType === 'rent' && property.price?.rent?.amount) {
      return `$${property.price.rent.amount.toLocaleString()}/${property.price.rent.period || 'month'}`
    }
    return 'Price not set'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Properties</h1>
          <p className="mt-1 text-sm text-gray-500">Review and approve property listings from agents</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No pending properties</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {properties.map((property) => (
              <div key={property._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image */}
                  <div className="md:w-64 flex-shrink-0">
                    {property.images?.[0]?.url ? (
                      <img
                        src={property.images[0].url}
                        alt={property.title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{property.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {property.location?.city}, {property.location?.state}
                          </span>
                          <span className="font-semibold text-primary-600">{formatPrice(property)}</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 font-medium capitalize">{property.propertyType}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Bedrooms:</span>
                        <span className="ml-2 font-medium">{property.specifications?.bedrooms || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Bathrooms:</span>
                        <span className="ml-2 font-medium">{property.specifications?.bathrooms || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Area:</span>
                        <span className="ml-2 font-medium">
                          {property.specifications?.area?.value} {property.specifications?.area?.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>
                        Agent: {property.agent?.firstName} {property.agent?.lastName}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{property.description}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/properties/${property.slug}`}
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
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // Close modal when clicking outside
              if (e.target === e.currentTarget) {
                setShowRejectModal(false)
                setSelectedProperty(null)
                setRejectionReason('')
              }
            }}
          >
            <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Reject Property</h2>
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedProperty(null)
                    setRejectionReason('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
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

