'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Compare } from 'lucide-react'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function PropertyComparison({ propertyIds = [], onClose }) {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    if (propertyIds.length > 0) {
      fetchProperties()
    } else {
      setLoading(false)
    }
  }, [propertyIds])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const response = await api.post('/properties/compare', { propertyIds })
      setProperties(response.data.properties || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    try {
      const response = await api.get(`/properties?search=${encodeURIComponent(searchQuery)}&limit=10`)
      setSearchResults(response.data.properties || [])
    } catch (error) {
      console.error('Error searching properties:', error)
    }
  }

  const handleAddProperty = (property) => {
    if (properties.length >= 5) {
      toast.error('Maximum 5 properties can be compared')
      return
    }
    if (properties.find(p => p._id === property._id)) {
      toast.error('Property already added')
      return
    }
    setProperties([...properties, property])
    setSearchQuery('')
    setSearchResults([])
  }

  const handleRemoveProperty = (propertyId) => {
    setProperties(properties.filter(p => p._id !== propertyId))
  }

  const getPrimaryImage = (images) => {
    if (!images || images.length === 0) return null
    // Support both array of URLs and array of { url } objects, but backend currently sends objects
    const primary = images.find(img => img.isPrimary) || images[0]
    return typeof primary === 'string' ? primary : primary.url
  }

  const formatPrice = (property) => {
    if (!property || !property.price) return 'N/A'

    // Sale price
    if (property.listingType === 'sale' && typeof property.price.sale === 'number') {
      return property.price.sale.toLocaleString()
    }

    // Rent price
    if (
      property.listingType === 'rent' &&
      property.price.rent &&
      typeof property.price.rent.amount === 'number'
    ) {
      return `${property.price.rent.amount.toLocaleString()}/${property.price.rent.period || 'month'}`
    }

    // Fallback: try sale amount, then rent amount
    if (typeof property.price.sale === 'number') {
      return property.price.sale.toLocaleString()
    }
    if (property.price.rent && typeof property.price.rent.amount === 'number') {
      return property.price.rent.amount.toLocaleString()
    }

    return 'N/A'
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Compare className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Compare Properties</h2>
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              {properties.length} / 5
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Add Property Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search properties to add..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {searchResults.map(property => (
                <div
                  key={property._id}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-center justify-between"
                  onClick={() => handleAddProperty(property)}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{property.title}</p>
                    <p className="text-xs text-gray-500">
                      {property.location?.city}
                      {formatPrice(property) !== 'N/A' && ` • $${formatPrice(property)}`}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-primary-600" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto p-6">
          {properties.length === 0 ? (
            <div className="text-center py-12">
              <Compare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No properties selected for comparison</p>
              <p className="text-sm text-gray-400 mt-2">Search and add properties above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                    {properties.map((property, index) => (
                      <th key={property._id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase relative">
                        <button
                          onClick={() => handleRemoveProperty(property._id)}
                          className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="pr-6">
                          <p className="font-semibold text-gray-900 truncate max-w-[150px]">{property.title}</p>
                          <Link href={`/properties/${property.slug || property._id}`} className="text-xs text-primary-600 hover:underline">
                            View Details
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Image</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3">
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={getPrimaryImage(property.images) || '/placeholder-property.jpg'}
                            alt={property.title}
                            className="h-24 w-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="h-24 w-32 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-400">No Image</span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Price</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3 text-sm text-gray-900">
                        {formatPrice(property) !== 'N/A' ? `$${formatPrice(property)}` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Type</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3 text-sm text-gray-900 capitalize">
                        {property.propertyType || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Listing Type</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3 text-sm text-gray-900 capitalize">
                        {property.listingType || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Location</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3 text-sm text-gray-900">
                        {property.location?.city || 'N/A'}
                        {property.location?.state && `, ${property.location.state}`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Area</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3 text-sm text-gray-900">
                        {property.specifications?.area?.value
                          ? `${property.specifications.area.value} ${property.specifications.area.unit || 'sqft'}`
                          : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Bedrooms</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3 text-sm text-gray-900">
                        {property.specifications?.bedrooms ?? 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Bathrooms</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3 text-sm text-gray-900">
                        {property.specifications?.bathrooms ?? 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Status</td>
                    {properties.map(property => (
                      <td key={property._id} className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          property.status === 'active' ? 'bg-green-100 text-green-800' :
                          property.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                          property.status === 'rented' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {property.status || 'N/A'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

