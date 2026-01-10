'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import { Search, MapPin, DollarSign, Eye } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function StaffPropertiesPage() {
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })

  useEffect(() => {
    fetchProperties()
  }, [filters])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })
      
      const response = await api.get(`/properties?${params}`)
      setProperties(response.data.properties || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      sold: { color: 'bg-blue-100 text-blue-800', label: 'Sold' },
      rented: { color: 'bg-purple-100 text-purple-800', label: 'Rented' }
    }
    const badge = badges[status] || badges.draft
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const formatPrice = (property) => {
    if (property.listingType === 'sale' && property.price?.sale) {
      return `$${property.price.sale.toLocaleString()}`
    } else if (property.listingType === 'rent' && property.price?.rent?.amount) {
      return `$${property.price.rent.amount.toLocaleString()}/${property.price.rent.period || 'month'}`
    }
    return 'Price on request'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="mt-1 text-sm text-gray-500">View all properties</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
            </select>
            <button
              onClick={() => setFilters({ status: '', search: '' })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No properties found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div key={property._id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-gray-200">
                  {property.images && property.images.length > 0 ? (
                    <img
                      src={property.images[0].url || property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(property.status)}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                    {property.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.location?.city}, {property.location?.state}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-primary-600">
                      {formatPrice(property)}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {property.propertyType}
                    </span>
                  </div>
                  <Link
                    href={`/properties/${property.slug || property._id}`}
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}



