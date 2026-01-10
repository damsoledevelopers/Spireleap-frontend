'use client'

import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, Search, Home } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AmenityManagement() {
  const [amenities, setAmenities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAmenity, setEditingAmenity] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    category: 'other',
    order: 0,
    isActive: true
  })

  useEffect(() => {
    fetchAmenities()
  }, [])

  const fetchAmenities = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/amenities')
      setAmenities(response.data.amenities || [])
    } catch (error) {
      console.error('Error fetching amenities:', error)
      toast.error('Failed to load amenities')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Clean up form data before sending
      const validCategories = ['interior', 'exterior', 'community', 'security', 'other']
      const categoryValue = formData.category && formData.category.trim() && validCategories.includes(formData.category.trim())
        ? formData.category.trim()
        : 'other'
      
      const submitData = {
        name: formData.name.trim(),
        icon: formData.icon?.trim() || undefined,
        category: categoryValue,
        order: parseInt(formData.order) || 0,
        isActive: formData.isActive !== undefined ? formData.isActive : true
      }

      // Remove icon if it's a base64 image (too long or starts with data:)
      if (submitData.icon && (submitData.icon.startsWith('data:') || submitData.icon.length > 500)) {
        submitData.icon = undefined
        toast.error('Base64 images are not supported for icons. Please use an emoji or icon identifier.')
        return
      }

      if (editingAmenity) {
        await api.put(`/cms/amenities/${editingAmenity._id}`, submitData)
        toast.success('Amenity updated successfully')
      } else {
        await api.post('/cms/amenities', submitData)
        toast.success('Amenity created successfully')
      }
      setShowModal(false)
      setEditingAmenity(null)
      resetForm()
      fetchAmenities()
    } catch (error) {
      console.error('Error saving amenity:', error)
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.join(', ') || 
                          'Failed to save amenity'
      toast.error(errorMessage)
    }
  }

  const handleEdit = (amenity) => {
    setEditingAmenity(amenity)
    setFormData({
      name: amenity.name || '',
      icon: amenity.icon || '',
      category: amenity.category || 'other',
      order: amenity.order || 0,
      isActive: amenity.isActive !== false
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this amenity?')) return
    try {
      await api.delete(`/cms/amenities/${id}`)
      toast.success('Amenity deleted successfully')
      fetchAmenities()
    } catch (error) {
      toast.error('Failed to delete amenity')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '',
      category: 'other',
      order: 0,
      isActive: true
    })
  }

  const filteredAmenities = amenities.filter(amenity =>
    amenity.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search amenities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingAmenity(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          New Amenity
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAmenities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No amenities found</p>
                      <p className="text-sm mt-1">
                        {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first amenity'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAmenities.map((amenity) => (
                  <tr key={amenity._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {amenity.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {amenity.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        amenity.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {amenity.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(amenity)} className="text-primary-600 hover:text-primary-900">
                          <Edit className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDelete(amenity._id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingAmenity ? 'Edit Amenity' : 'Create New Amenity'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Icon name (e.g., '🏠', '🚗') or emoji/icon identifier"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter an emoji or icon identifier. Base64 images are not supported.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category || 'other'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="other">Other</option>
                    <option value="interior">Interior</option>
                    <option value="exterior">Exterior</option>
                    <option value="community">Community</option>
                    <option value="security">Security</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingAmenity(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {editingAmenity ? 'Update' : 'Create'} Amenity
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

