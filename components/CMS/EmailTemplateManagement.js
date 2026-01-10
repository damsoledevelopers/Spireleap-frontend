'use client'

import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Mail, Code } from 'lucide-react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

// Dynamically import react-quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function EmailTemplateManagement() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    category: 'other',
    variables: [],
    isActive: true
  })

  const availableVariables = {
    lead: [
      { name: '{{lead.firstName}}', description: 'Lead first name', example: 'John' },
      { name: '{{lead.lastName}}', description: 'Lead last name', example: 'Doe' },
      { name: '{{lead.email}}', description: 'Lead email', example: 'john@example.com' },
      { name: '{{lead.phone}}', description: 'Lead phone', example: '+1234567890' },
      { name: '{{property.title}}', description: 'Property title', example: 'Luxury Villa' },
      { name: '{{property.price}}', description: 'Property price', example: '$500,000' }
    ],
    property: [
      { name: '{{property.title}}', description: 'Property title', example: 'Luxury Villa' },
      { name: '{{property.price}}', description: 'Property price', example: '$500,000' },
      { name: '{{property.address}}', description: 'Property address', example: '123 Main St' },
      { name: '{{agent.firstName}}', description: 'Agent first name', example: 'Jane' },
      { name: '{{agent.lastName}}', description: 'Agent last name', example: 'Smith' }
    ],
    user: [
      { name: '{{user.firstName}}', description: 'User first name', example: 'John' },
      { name: '{{user.lastName}}', description: 'User last name', example: 'Doe' },
      { name: '{{user.email}}', description: 'User email', example: 'john@example.com' }
    ],
    system: [
      { name: '{{siteName}}', description: 'Site name', example: 'SPIRELEAP Real Estate' },
      { name: '{{siteUrl}}', description: 'Site URL', example: 'https://spireleap.com' },
      { name: '{{currentDate}}', description: 'Current date', example: '2025-01-18' }
    ]
  }

  useEffect(() => {
    fetchTemplates()
  }, [categoryFilter])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = categoryFilter ? `?category=${categoryFilter}` : ''
      const response = await api.get(`/email-templates${params}`)
      setTemplates(response.data.templates || [])
    } catch (error) {
      console.error('Error fetching email templates:', error)
      toast.error('Failed to load email templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Client-side validation
    if (!formData.name || !formData.name.trim()) {
      toast.error('Template name is required')
      return
    }
    
    if (!formData.subject || !formData.subject.trim()) {
      toast.error('Email subject is required')
      return
    }
    
    // Check if HTML content has actual text (not just empty tags)
    const htmlContent = formData.htmlContent || ''
    const textContent = htmlContent.replace(/<[^>]*>/g, '').trim()
    if (!htmlContent || textContent.length === 0) {
      toast.error('HTML content is required and cannot be empty')
      return
    }
    
    try {
      const payload = {
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        htmlContent: htmlContent,
        textContent: formData.textContent?.trim() || '',
        category: formData.category || 'other',
        variables: formData.variables || [],
        isActive: formData.isActive !== undefined ? formData.isActive : true
      }
      
      console.log('Submitting email template:', {
        name: payload.name,
        subject: payload.subject,
        htmlContentLength: payload.htmlContent?.length || 0,
        category: payload.category
      })
      
      if (editingTemplate) {
        await api.put(`/email-templates/${editingTemplate._id}`, payload)
        toast.success('Email template updated successfully')
      } else {
        await api.post('/email-templates', payload)
        toast.success('Email template created successfully')
      }

      setShowModal(false)
      setEditingTemplate(null)
      resetForm()
      fetchTemplates()
    } catch (error) {
      console.error('Error saving email template:', error)
      console.error('Error response:', error.response?.data)
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const errorMessages = validationErrors.map(err => {
          const field = err.param || err.path || 'field'
          const msg = err.msg || err.message || 'Invalid value'
          return `${field}: ${msg}`
        }).join('\n')
        toast.error(`Validation errors:\n${errorMessages}`, { duration: 6000 })
      } else {
        toast.error(error.response?.data?.message || 'Failed to save email template')
      }
    }
  }

  const handleEdit = (template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name || '',
      subject: template.subject || '',
      htmlContent: template.htmlContent || '',
      textContent: template.textContent || '',
      category: template.category || 'other',
      variables: template.variables || [],
      isActive: template.isActive !== undefined ? template.isActive : true
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this email template?')) return

    try {
      await api.delete(`/email-templates/${id}`)
      toast.success('Email template deleted successfully')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting email template:', error)
      toast.error('Failed to delete email template')
    }
  }

  const toggleActive = async (template) => {
    try {
      await api.put(`/email-templates/${template._id}`, {
        isActive: !template.isActive
      })
      toast.success(`Template ${!template.isActive ? 'activated' : 'deactivated'} successfully`)
      fetchTemplates()
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('Failed to update template')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      htmlContent: '',
      textContent: '',
      category: 'other',
      variables: [],
      isActive: true
    })
  }

  const addVariable = (variable) => {
    const currentContent = formData.htmlContent || ''
    setFormData({
      ...formData,
      htmlContent: currentContent + variable.name
    })
  }

  const filteredTemplates = templates.filter(template =>
    template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const previewContent = formData.htmlContent
    .replace(/\{\{lead\.firstName\}\}/g, 'John')
    .replace(/\{\{lead\.lastName\}\}/g, 'Doe')
    .replace(/\{\{lead\.email\}\}/g, 'john@example.com')
    .replace(/\{\{lead\.phone\}\}/g, '+1234567890')
    .replace(/\{\{property\.title\}\}/g, 'Luxury Villa')
    .replace(/\{\{property\.price\}\}/g, '$500,000')
    .replace(/\{\{property\.address\}\}/g, '123 Main St')
    .replace(/\{\{agent\.firstName\}\}/g, 'Jane')
    .replace(/\{\{agent\.lastName\}\}/g, 'Smith')
    .replace(/\{\{user\.firstName\}\}/g, 'John')
    .replace(/\{\{user\.lastName\}\}/g, 'Doe')
    .replace(/\{\{user\.email\}\}/g, 'john@example.com')
    .replace(/\{\{siteName\}\}/g, 'SPIRELEAP Real Estate')
    .replace(/\{\{siteUrl\}\}/g, 'https://spireleap.com')
    .replace(/\{\{currentDate\}\}/g, new Date().toLocaleDateString())

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            <option value="lead">Lead</option>
            <option value="property">Property</option>
            <option value="user">User</option>
            <option value="system">System</option>
            <option value="notification">Notification</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            New Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No email templates found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTemplates.map((template) => (
                <tr key={template._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{template.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{template.subject}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {template.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(template)}
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        template.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {template.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(template._id)}
                        className="text-red-600 hover:text-red-900"
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="lead">Lead</option>
                    <option value="property">Property</option>
                    <option value="user">User</option>
                    <option value="system">System</option>
                    <option value="notification">Notification</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Welcome to SPIRELEAP Real Estate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Variables
                </label>
                <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {(availableVariables[formData.category] || availableVariables.system).map((variable, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => addVariable(variable)}
                        className="text-left px-3 py-2 bg-white rounded border hover:bg-gray-50 text-sm"
                        title={variable.description}
                      >
                        <code className="text-primary-600">{variable.name}</code>
                        <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    HTML Content *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    {showPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPreview ? 'Show Code' : 'Preview'}
                  </button>
                </div>
                {showPreview ? (
                  <div
                    className="border border-gray-300 rounded-lg p-4 bg-white min-h-[300px]"
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                  />
                ) : (
                  <ReactQuill
                    theme="snow"
                    value={formData.htmlContent}
                    onChange={(value) => setFormData({ ...formData, htmlContent: value })}
                    className="min-h-[300px]"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plain Text Content (Optional)
                </label>
                <textarea
                  value={formData.textContent}
                  onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Plain text version of the email"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingTemplate(null)
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
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

