'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
    Shield,
    Save,
    RotateCcw,
    Lock,
    Building,
    Users,
    Layout,
    Home,
    BarChart3,
    Settings,
    Search,
    CheckCircle2,
    AlertCircle,
    MessageSquare,
    Mail
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PermissionsPage() {
    const { user, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedRole, setSelectedRole] = useState('agent')
    const [permissions, setPermissions] = useState({})
    const [initialPermissions, setInitialPermissions] = useState({})

    const roles = [
        { id: 'agency_admin', name: 'Agency Admin', icon: <Building className="h-4 w-4" /> },
        { id: 'agent', name: 'Agent', icon: <Users className="h-4 w-4" /> },
        { id: 'staff', name: 'Staff', icon: <Lock className="h-4 w-4" /> },
    ]

    const modules = [
        { id: 'leads', name: 'Leads Management', icon: <Search className="h-5 w-5" /> },
        { id: 'properties', name: 'Properties', icon: <Home className="h-5 w-5" /> },
        { id: 'inquiries', name: 'Inquiries', icon: <MessageSquare className="h-5 w-5" /> },
        { id: 'contact_messages', name: 'Contact Message', icon: <Mail className="h-5 w-5" /> }
    ]

    const defaultActions = ['view', 'create', 'edit', 'delete']

    useEffect(() => {
        if (user?.role === 'super_admin') {
            fetchPermissions(selectedRole)
        }
    }, [selectedRole, user])

    const fetchPermissions = async (role) => {
        try {
            setLoading(true)
            const response = await api.get(`/permissions/${role}`)
            const permsData = response.data.permissions || {}
            setPermissions(JSON.parse(JSON.stringify(permsData)))
            setInitialPermissions(JSON.parse(JSON.stringify(permsData)))
        } catch (error) {
            console.error('Error fetching permissions:', error)
            toast.error('Failed to load permissions')
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = (moduleId, action) => {
        console.log(`Manual Toggle: ${moduleId}.${action}`);
        setPermissions(prev => {
            const currentModulePerms = prev[moduleId] || {}
            const newValue = !currentModulePerms[action]

            const newState = {
                ...prev,
                [moduleId]: {
                    ...currentModulePerms,
                    [action]: newValue
                }
            }
            return newState
        })
    }

    const handleToggleAll = (moduleId, value) => {
        setPermissions(prev => {
            const moduleMeta = modules.find(m => m.id === moduleId)
            const actions = moduleMeta?.actions || defaultActions

            const updatedModule = { ...(prev[moduleId] || {}) }
            actions.forEach(action => {
                updatedModule[action] = value
            })

            return {
                ...prev,
                [moduleId]: updatedModule
            }
        })
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            await api.put(`/permissions/${selectedRole}`, { permissions })
            setInitialPermissions(JSON.parse(JSON.stringify(permissions)))
            toast.success(`Permissions updated for ${selectedRole.replace('_', ' ')}`)
        } catch (error) {
            console.error('Error saving permissions:', error)
            toast.error('Failed to save permissions')
        } finally {
            setSaving(false)
        }
    }

    const handleReset = () => {
        setPermissions(JSON.parse(JSON.stringify(initialPermissions)))
        toast.success('Changes reset')
    }

    if (authLoading || (loading && Object.keys(permissions).length === 0)) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        )
    }

    if (user?.role !== 'super_admin') {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Lock className="h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
                    <p className="text-gray-500">Only Super Admins can manage role permissions.</p>
                </div>
            </DashboardLayout>
        )
    }

    const hasChanges = JSON.stringify(permissions) !== JSON.stringify(initialPermissions)

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-6xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary-600" />
                            Role Permissions
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Configure access levels for each module.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReset}
                            disabled={!hasChanges || saving}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 shadow-sm"
                        >
                            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Changes
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Role Sidebar */}
                    <div className="lg:col-span-1 space-y-2">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => setSelectedRole(role.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedRole === role.id ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {role.icon} {role.name}
                                </div>
                                {selectedRole === role.id && <CheckCircle2 className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>

                    {/* Matrix */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Module</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase">View</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase">Create</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase">Edit</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase">Delete</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Master</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {modules.map((module) => {
                                        const modulePerms = permissions[module.id] || {}
                                        const actions = module.actions || defaultActions
                                        const allEnabled = actions.every(a => modulePerms[a])

                                        return (
                                            <tr key={module.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500">{module.icon}</span>
                                                        <span className="text-sm font-medium text-gray-900">{module.name}</span>
                                                    </div>
                                                </td>
                                                {['view', 'create', 'edit', 'delete'].map((action) => (
                                                    <td key={action} className="px-4 py-4 text-center">
                                                        {actions.includes(action) ? (
                                                            <div
                                                                onClick={() => handleToggle(module.id, action)}
                                                                className={`mx-auto relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors duration-300 focus:outline-none ${modulePerms[action] ? 'bg-primary-600' : 'bg-gray-200'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${modulePerms[action] ? 'translate-x-6' : 'translate-x-1'
                                                                        }`}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAll(module.id, !allEnabled)}
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${allEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                            }`}
                                                    >
                                                        {allEnabled ? 'ALL' : 'OFF'}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
