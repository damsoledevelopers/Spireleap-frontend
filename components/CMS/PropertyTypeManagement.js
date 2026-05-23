'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, Search, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '../Common/useConfirmDialog'
import SearchableSelect from '../Common/SearchableSelect'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
]

export default function PropertyTypeManagement() {
  const { checkPermission } = useAuth()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [propertyTypes, setPropertyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    status: 'active'
  })

  const canCreate = checkPermission('settings', 'create')
  const canEdit = checkPermission('settings', 'edit')
  const canDelete = checkPermission('settings', 'delete')

  useEffect(() => {
    fetchPropertyTypes()
  }, [])

  const fetchPropertyTypes = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings/property-types')
      setPropertyTypes(response.data.propertyTypes || [])
    } catch (error) {
      console.error('Error fetching property types:', error)
      toast.error('Failed to load property types')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', status: 'active' })
  }

  const payloadFromForm = () => ({
    name: formData.name.trim(),
    isActive: formData.status === 'active'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = payloadFromForm()
      if (editing) {
        await api.put(`/settings/property-types/${editing._id}`, payload)
        toast.success('Property type updated')
      } else {
        await api.post('/settings/property-types', payload)
        toast.success('Property type created')
      }
      setShowModal(false)
      setEditing(null)
      resetForm()
      fetchPropertyTypes()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save property type')
    }
  }

  const handleEdit = (row) => {
    setEditing(row)
    setFormData({
      name: row.name || '',
      status: row.isActive !== false ? 'active' : 'inactive'
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Property Type',
      message: 'Delete this property type? Existing properties using it will keep their stored value.',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) return
    try {
      await api.delete(`/settings/property-types/${id}`)
      toast.success('Property type deleted')
      fetchPropertyTypes()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete property type')
    }
  }

  const filtered = propertyTypes.filter((t) =>
    String(t.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <ConfirmDialog />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search property types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              resetForm()
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Property Type
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading property types...</p>
      ) : (
        <div className="table-scroll border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.map((t) => (
                <tr key={t._id}>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <Home className="h-4 w-4 text-gray-400 shrink-0" />
                      {t.name}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        t.isActive !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {canEdit && (
                      <button type="button" onClick={() => handleEdit(t)} className="text-primary-600 hover:text-primary-800">
                        <Edit className="h-4 w-4 inline" />
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" onClick={() => handleDelete(t._id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No property types found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editing ? 'Edit Property Type' : 'Add Property Type'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Apartment, Villa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <SearchableSelect
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                  searchable={false}
                  buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditing(null)
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
