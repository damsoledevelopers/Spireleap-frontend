'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  DollarSign
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AgencyPropertiesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    propertyType: '',
    listingType: '',
    search: ''
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    fetchProperties()
  }, [filters, pagination.page])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })
      
      const response = await api.get(`/properties?${params}`)
      setProperties(response.data.properties || [])
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }))
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return
    
    try {
      await api.delete(`/properties/${id}`)
      toast.success('Property deleted successfully')
      fetchProperties()
    } catch (error) {
      console.error('Error deleting property:', error)
      toast.error('Failed to delete property')
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/properties/${id}/status`, { status: newStatus })
      toast.success('Property status updated successfully')
      fetchProperties()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      draft: { color: 'bg-gray-100 text-gray-800', icon: Edit },
      sold: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      rented: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    const badge = badges[status] || badges.draft
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatPrice = (property) => {
    if (property.listingType === 'sale' && property.price?.sale) {
      return `$${property.price.sale.toLocaleString()}`
    } else if (property.listingType === 'rent' && property.price?.rent?.amount) {
      return `$${property.price.rent.amount.toLocaleString()}/${property.price.rent.period || 'month'}`
    } else if (property.listingType === 'both') {
      const parts = []
      if (property.price?.sale) parts.push(`Sale: $${property.price.sale.toLocaleString()}`)
      if (property.price?.rent?.amount) parts.push(`Rent: $${property.price.rent.amount.toLocaleString()}/${property.price.rent.period || 'month'}`)
      return parts.join(' | ')
    }
    return 'Price not set'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your agency's property listings
            </p>
          </div>
          <Link
            href="/agency/properties/add"
            className="btn btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Property
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select
                value={filters.propertyType}
                onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="condo">Condo</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
              <select
                value={filters.listingType}
                onChange={(e) => setFilters({ ...filters, listingType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Listings</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No properties found</p>
              <Link href="/agency/properties/add" className="btn btn-primary mt-4">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Property
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.map((property) => (
                    <tr key={property._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {property.images?.[0]?.url ? (
                            <img
                              src={property.images[0].url}
                              alt={property.title}
                              className="h-12 w-12 rounded-lg object-cover mr-3"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{property.title}</div>
                            <div className="text-sm text-gray-500">{property.propertyType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{property.listingType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{property.location?.city}, {property.location?.state}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {property.location?.address}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatPrice(property)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {property.agent?.firstName} {property.agent?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={property.status}
                          onChange={(e) => handleStatusChange(property._id, e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="draft">Draft</option>
                          <option value="pending">Pending</option>
                          <option value="active">Available</option>
                          <option value="sold">Sold</option>
                          <option value="rented">Rented</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/agency/properties/${property._id}`}
                            className="text-primary-600 hover:text-primary-900"
                            title="View"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          <Link
                            href={`/agency/properties/${property._id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </Link>
                          {property.status === 'pending' && (user?.role === 'agency_admin' || user?.role === 'super_admin') && (
                            <Link
                              href={`/agency/properties/pending`}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Approve"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(property._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.pages}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

