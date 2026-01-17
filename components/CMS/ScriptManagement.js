'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, Search, Code, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ScriptManagement() {
    const { checkPermission } = useAuth()
    const [scripts, setScripts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingScript, setEditingScript] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        code: '',
        placement: 'head',
        isActive: true
    })

    useEffect(() => {
        fetchScripts()
    }, [])

    const fetchScripts = async () => {
        try {
            setLoading(true)
            const response = await api.get('/cms/scripts')
            setScripts(response.data.scripts || [])
        } catch (error) {
            console.error('Error fetching scripts:', error)
            toast.error('Failed to load scripts')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingScript) {
                await api.put(`/cms/scripts/${editingScript._id}`, formData)
                toast.success('Script updated successfully')
            } else {
                await api.post('/cms/scripts', formData)
                toast.success('Script created successfully')
            }
            setShowModal(false)
            setEditingScript(null)
            resetForm()
            fetchScripts()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save script')
        }
    }

    const handleEdit = (script) => {
        setEditingScript(script)
        setFormData({
            name: script.name || '',
            description: script.description || '',
            code: script.code || '',
            placement: script.placement || 'head',
            isActive: script.isActive !== false
        })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this script?')) return
        try {
            await api.delete(`/cms/scripts/${id}`)
            toast.success('Script deleted successfully')
            fetchScripts()
        } catch (error) {
            toast.error('Failed to delete script')
        }
    }

    const toggleActive = async (script) => {
        if (!checkPermission('cms', 'edit')) {
            toast.error('You do not have permission to edit scripts')
            return
        }

        try {
            const updatedScript = { ...script, isActive: !script.isActive }
            await api.put(`/cms/scripts/${script._id}`, updatedScript)
            toast.success(`Script ${updatedScript.isActive ? 'activated' : 'deactivated'} successfully`)
            fetchScripts()
        } catch (error) {
            console.error('Error toggling script status:', error)
            toast.error('Failed to update script status')
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            code: '',
            placement: 'head',
            isActive: true
        })
    }

    const filteredScripts = scripts.filter(script =>
        script.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Search scripts..."
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
                            setEditingScript(null)
                            setShowModal(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-md"
                    >
                        <Plus className="h-5 w-5" />
                        Add Script
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredScripts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <Code className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-900">No scripts found</p>
                    <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                        {searchTerm ? 'Try adjusting your search terms' : 'Add custom scripts like chat widgets, analytics, and more to your website.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredScripts.map((script) => (
                        <div key={script._id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden flex flex-col">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-primary-50 p-2 rounded-lg">
                                        <Code className="h-5 w-5 text-primary-600" />
                                    </div>
                                    <button
                                        onClick={() => toggleActive(script)}
                                        disabled={!checkPermission('cms', 'edit')}
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all duration-200 ${script.isActive
                                            ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer'
                                            } ${!checkPermission('cms', 'edit') && 'opacity-50 cursor-not-allowed'}`}
                                        title={checkPermission('cms', 'edit') ? `Click to ${script.isActive ? 'deactivate' : 'activate'}` : 'Permission required to edit'}
                                    >
                                        {script.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        {script.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{script.name}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{script.description || 'No description'}</p>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">Placement:</span>
                                        <span className="font-medium text-gray-700 uppercase">{script.placement === 'head' ? 'Header' : script.placement.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                                {checkPermission('cms', 'edit') && (
                                    <button onClick={() => handleEdit(script)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                        <Edit className="h-5 w-5" />
                                    </button>
                                )}
                                {checkPermission('cms', 'delete') && (
                                    <button onClick={() => handleDelete(script._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">{editingScript ? 'Edit Script' : 'Add New Script'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <Plus className="h-6 w-6 rotate-45" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Script Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="e.g., Google Analytics"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="Brief description of what this script does"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Placement</label>
                                        <select
                                            value={formData.placement}
                                            onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        >
                                            <option value="head">Header (&lt;head&gt;)</option>
                                            <option value="body_start">Body Start (&lt;body&gt;)</option>
                                            <option value="body_end">Body End (Before &lt;/body&gt;)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end pb-3">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                            />
                                            <span className="ml-2 text-sm font-semibold text-gray-700">Active</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Script Code *</label>
                                    <textarea
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        rows={8}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm bg-gray-900 text-gray-100"
                                        placeholder="Paste your script code here (HTML/JS)..."
                                    />
                                    <p className="text-xs text-gray-500 mt-2 italic">Be careful! Incorrect scripts can break your website.</p>
                                </div>
                                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false)
                                            setEditingScript(null)
                                            resetForm()
                                        }}
                                        className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-8 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold shadow-lg shadow-primary-200 transition-all active:scale-95">
                                        {editingScript ? 'Update' : 'Save'} Script
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
