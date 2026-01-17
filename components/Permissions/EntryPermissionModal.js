'use client'

import { useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'

export default function EntryPermissionModal({
    isOpen,
    onClose,
    entry,
    entryType, // 'leads', 'properties', 'contact-messages'
    onSuccess
}) {
    const [permissions, setPermissions] = useState(
        entry?.entryPermissions || {
            agency_admin: { view: true, edit: true, delete: false },
            agent: { view: true, edit: true, delete: false },
            staff: { view: true, edit: true, delete: false }
        }
    )
    const [isUpdating, setIsUpdating] = useState(false)

    const handleTogglePermission = (role, action) => {
        setPermissions(prev => {
            const newPerms = JSON.parse(JSON.stringify(prev))
            newPerms[role][action] = !newPerms[role][action]
            return newPerms
        })
    }

    const handleSave = async () => {
        try {
            setIsUpdating(true)

            let endpoint = ''
            if (entryType === 'leads' || entryType === 'inquiries') {
                endpoint = `/leads/${entry._id}/entry-permissions`
            } else if (entryType === 'properties') {
                endpoint = `/properties/${entry._id}/entry-permissions`
            } else if (entryType === 'contact-messages') {
                endpoint = `/cms/contact-messages/${entry._id}/entry-permissions`
            }

            await api.put(endpoint, { entryPermissions: permissions })
            toast.success('Entry permissions updated successfully')
            onClose()
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error('Update entry permissions error:', error)
            toast.error('Failed to update entry permissions')
        } finally {
            setIsUpdating(false)
        }
    }

    if (!isOpen) return null

    const entryLabel = entry?.leadId || entry?.title || entry?.name || 'Entry'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-primary-600 text-white">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6" />
                        <div>
                            <h2 className="text-xl font-bold">Entry Access Management</h2>
                            <p className="text-xs text-primary-100">Managing restrictions for {entryLabel}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-primary-700 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-6">
                        <p className="text-sm text-gray-600">
                            Override global role permissions for this specific entry. Toggling these will grant or restrict access regardless of global settings.
                        </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-sm font-semibold text-gray-900">Module / Role</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">View</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Edit</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {['agency_admin', 'agent', 'staff'].map((role) => (
                                    <tr key={role} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900 capitalize">
                                                {role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        {['view', 'edit', 'delete'].map((action) => (
                                            <td key={action} className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => handleTogglePermission(role, action)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-2 focus:ring-2 focus:ring-primary-500 ${permissions[role]?.[action]
                                                        ? 'bg-primary-600'
                                                        : 'bg-gray-200'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permissions[role]?.[action]
                                                            ? 'translate-x-6'
                                                            : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isUpdating}
                        className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isUpdating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="h-4 w-4" />
                                Update Permissions
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
