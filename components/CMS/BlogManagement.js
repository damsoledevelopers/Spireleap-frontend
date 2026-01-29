'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, Eye, EyeOff, Search, FileText, Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

// Dynamically import react-quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function BlogManagement() {
  const { checkPermission } = useAuth()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBlog, setEditingBlog] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    tags: '',
    status: 'draft',
    isFeatured: false,
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: ''
    }
  })

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
        featuredImage: imageUrl
      }))
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/cms/blogs')
      setBlogs(response.data.blogs || [])
    } catch (error) {
      console.error('Error fetching blogs:', error)
      toast.error('Failed to load blogs')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t)
      const keywordsArray = formData.seo.keywords.split(',').map(k => k.trim()).filter(k => k)

      const blogData = {
        ...formData,
        tags: tagsArray,
        seo: {
          ...formData.seo,
          keywords: keywordsArray
        }
      }

      if (editingBlog) {
        await api.put(`/cms/blogs/${editingBlog._id}`, blogData)
        toast.success('Blog updated successfully')
      } else {
        await api.post('/cms/blogs', blogData)
        toast.success('Blog created successfully')
      }

      setShowModal(false)
      setEditingBlog(null)
      resetForm()
      fetchBlogs()
    } catch (error) {
      console.error('Error saving blog:', error)
      toast.error(error.response?.data?.message || 'Failed to save blog')
    }
  }

  const handleEdit = (blog) => {
    setEditingBlog(blog)
    setFormData({
      title: blog.title || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      featuredImage: blog.featuredImage || '',
      tags: blog.tags?.join(', ') || '',
      status: blog.status || 'draft',
      isFeatured: blog.isFeatured || false,
      seo: {
        metaTitle: blog.seo?.metaTitle || '',
        metaDescription: blog.seo?.metaDescription || '',
        keywords: blog.seo?.keywords?.join(', ') || ''
      }
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return

    try {
      await api.delete(`/cms/blogs/${id}`)
      toast.success('Blog deleted successfully')
      fetchBlogs()
    } catch (error) {
      console.error('Error deleting blog:', error)
      toast.error('Failed to delete blog')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      tags: '',
      status: 'draft',
      isFeatured: false,
      seo: {
        metaTitle: '',
        metaDescription: '',
        keywords: ''
      }
    })
  }

  const filteredBlogs = blogs.filter(blog =>
    blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search blogs..."
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
              setEditingBlog(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            New Blog
          </button>
        )}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBlogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No blogs found</p>
                      <p className="text-sm mt-1">
                        {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first blog post'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBlogs.map((blog) => (
                  <tr key={blog._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                      {blog.excerpt && (
                        <div className="text-sm text-gray-500 line-clamp-1">{blog.excerpt}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${blog.status === 'published' ? 'bg-green-100 text-green-800' :
                        blog.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {blog.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {blog.author?.firstName} {blog.author?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {checkPermission('cms', 'edit') && (
                          <button
                            onClick={() => handleEdit(blog)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        )}
                        {checkPermission('cms', 'delete') && (
                          <button
                            onClick={() => handleDelete(blog._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingBlog ? 'Edit Blog' : 'Create New Blog'}
              </h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                  {typeof window !== 'undefined' && (
                    <ReactQuill
                      theme="snow"
                      value={formData.content}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      className="bg-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="url"
                        value={formData.featuredImage}
                        onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
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
                  {formData.featuredImage && (
                    <div className="mt-2 relative inline-block">
                      <img
                        src={formData.featuredImage}
                        alt="Preview"
                        className="h-20 w-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, featuredImage: '' })}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 shadow-sm"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Featured</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">SEO Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                      <input
                        type="text"
                        value={formData.seo.metaTitle}
                        onChange={(e) => setFormData({
                          ...formData,
                          seo: { ...formData.seo, metaTitle: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                      <textarea
                        value={formData.seo.metaDescription}
                        onChange={(e) => setFormData({
                          ...formData,
                          seo: { ...formData.seo, metaDescription: e.target.value }
                        })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.seo.keywords}
                        onChange={(e) => setFormData({
                          ...formData,
                          seo: { ...formData.seo, keywords: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingBlog(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {editingBlog ? 'Update' : 'Create'} Blog
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
