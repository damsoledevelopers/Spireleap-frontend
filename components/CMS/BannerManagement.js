'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, Search, Image, Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BannerManagement() {
  const { checkPermission } = useAuth()
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    link: '',
    position: 'homepage',
    order: 0,
    isActive: true,
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/banners')
      setBanners(response.data.banners || [])
    } catch (error) {
      console.error('Error fetching banners:', error)
      toast.error('Failed to load banners')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    try {
      setUploading(true)
      const response = await api.post('/upload?folder=cms', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const imageUrl = response.data.url
      setFormData(prev => ({
        ...prev,
        image: imageUrl
      }))
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingBanner) {
        await api.put(`/cms/banners/${editingBanner._id}`, formData)
        toast.success('Banner updated successfully')
      } else {
        await api.post('/cms/banners', formData)
        toast.success('Banner created successfully')
      }
      setShowModal(false)
      setEditingBanner(null)
      resetForm()
      fetchBanners()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save banner')
    }
  }

  const handleEdit = (banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title || '',
      image: banner.image || '',
      link: banner.link || '',
      position: banner.position || 'homepage',
      order: banner.order || 0,
      isActive: banner.isActive !== false,
      startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '',
      endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return
    try {
      await api.delete(`/cms/banners/${id}`)
      toast.success('Banner deleted successfully')
      fetchBanners()
    } catch (error) {
      toast.error('Failed to delete banner')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      image: '',
      link: '',
      position: 'homepage',
      order: 0,
      isActive: true,
      startDate: '',
      endDate: ''
    })
  }

  const filteredBanners = banners.filter(banner =>
    banner.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search banners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        {checkPermission('cms', 'create') && (
          <button
            onClick={() => {
              resetForm()
              setEditingBanner(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            New Banner
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-500">
            <Image className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No banners found</p>
            <p className="text-sm mt-1">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first banner'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBanners.map((banner) => (
            <div key={banner._id} className="bg-white rounded-lg shadow overflow-hidden">
              {banner.image && (
                <img src={banner.image} alt={banner.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{banner.title}</h3>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded-full ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-2">
                    {checkPermission('cms', 'edit') && (
                      <button onClick={() => handleEdit(banner)} className="text-primary-600 hover:text-primary-900">
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                    {checkPermission('cms', 'delete') && (
                      <button onClick={() => handleDelete(banner._id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
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
              <h2 className="text-2xl font-bold mb-4">{editingBanner ? 'Edit Banner' : 'Create New Banner'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image *</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        required
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Image URL"
                      />
                    </div>
                    <label className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  {formData.image && (
                    <div className="mt-2 relative inline-block">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="h-24 w-full object-cover rounded-lg border border-gray-200"
                        style={{ minWidth: '200px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 shadow-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="homepage">Homepage</option>
                      <option value="properties">Properties Page</option>
                      <option value="all">All Pages</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
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
                      setEditingBanner(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {editingBanner ? 'Update' : 'Create'} Banner
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

