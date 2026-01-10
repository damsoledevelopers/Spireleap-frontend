'use client'

import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, Search, Star } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TestimonialManagement() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    content: '',
    rating: 5,
    image: '',
    isFeatured: false,
    isActive: true,
    order: 0
  })

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const fetchTestimonials = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/testimonials')
      setTestimonials(response.data.testimonials || [])
    } catch (error) {
      console.error('Error fetching testimonials:', error)
      toast.error('Failed to load testimonials')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTestimonial) {
        await api.put(`/cms/testimonials/${editingTestimonial._id}`, formData)
        toast.success('Testimonial updated successfully')
      } else {
        await api.post('/cms/testimonials', formData)
        toast.success('Testimonial created successfully')
      }
      setShowModal(false)
      setEditingTestimonial(null)
      resetForm()
      fetchTestimonials()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save testimonial')
    }
  }

  const handleEdit = (testimonial) => {
    setEditingTestimonial(testimonial)
    setFormData({
      name: testimonial.name || '',
      role: testimonial.role || '',
      content: testimonial.content || '',
      rating: testimonial.rating || 5,
      image: testimonial.image || '',
      isFeatured: testimonial.isFeatured || false,
      isActive: testimonial.isActive !== false,
      order: testimonial.order || 0
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this testimonial?')) return
    try {
      await api.delete(`/cms/testimonials/${id}`)
      toast.success('Testimonial deleted successfully')
      fetchTestimonials()
    } catch (error) {
      toast.error('Failed to delete testimonial')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      content: '',
      rating: 5,
      image: '',
      isFeatured: false,
      isActive: true,
      order: 0
    })
  }

  const filteredTestimonials = testimonials.filter(testimonial =>
    testimonial.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    testimonial.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search testimonials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingTestimonial(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          New Testimonial
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredTestimonials.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-500">
            <Star className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No testimonials found</p>
            <p className="text-sm mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first testimonial'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTestimonials.map((testimonial) => (
            <div key={testimonial._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic line-clamp-3">"{testimonial.content}"</p>
              <div className="mb-4">
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.role}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  testimonial.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {testimonial.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(testimonial)} className="text-primary-600 hover:text-primary-900">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(testimonial._id)} className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingTestimonial ? 'Edit Testimonial' : 'Create New Testimonial'}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating *</label>
                  <select
                    required
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={1}>1 Star</option>
                    <option value={2}>2 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={5}>5 Stars</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </label>
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
                      setEditingTestimonial(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {editingTestimonial ? 'Update' : 'Create'} Testimonial
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

