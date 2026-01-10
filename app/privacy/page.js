'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'
import { Download, Trash2, Shield, CheckCircle } from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout'

export default function PrivacyPage() {
  const { user } = useAuth()
  const [consent, setConsent] = useState({ given: false, date: null, version: null })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchConsent()
  }, [])

  const fetchConsent = async () => {
    try {
      const response = await api.get('/privacy/consent')
      setConsent(response.data)
    } catch (error) {
      console.error('Error fetching consent:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setExporting(true)
      const response = await api.get('/privacy/export-data')
      
      // Create and download JSON file
      const dataStr = JSON.stringify(response.data.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteData = async () => {
    const confirmText = prompt('Type "DELETE" to confirm permanent deletion of your data:')
    if (confirmText !== 'DELETE') {
      toast.error('Deletion cancelled')
      return
    }

    try {
      setDeleting(true)
      await api.delete('/privacy/delete-data', {
        data: { confirm: 'DELETE' }
      })
      toast.success('Your data has been deleted. You will be logged out.')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
    } catch (error) {
      console.error('Error deleting data:', error)
      toast.error('Failed to delete data')
    } finally {
      setDeleting(false)
    }
  }

  const handleUpdateConsent = async (given) => {
    try {
      await api.post('/privacy/consent', { given, version: '1.0' })
      setConsent({ ...consent, given, date: new Date() })
      toast.success('Consent updated successfully')
    } catch (error) {
      console.error('Error updating consent:', error)
      toast.error('Failed to update consent')
    }
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Please log in to access privacy settings</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Privacy & Data Management</h1>
              <p className="text-sm text-gray-500">Manage your data and privacy preferences (GDPR Compliant)</p>
            </div>
          </div>

          {/* Privacy Consent */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy Consent</h3>
            <p className="text-sm text-gray-600 mb-4">
              We respect your privacy. Please review and update your consent preferences.
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.given}
                  onChange={(e) => handleUpdateConsent(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">I consent to data processing</span>
              </label>
              {consent.date && (
                <span className="text-xs text-gray-500">
                  Last updated: {new Date(consent.date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Data Export */}
          <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Your Data</h3>
                <p className="text-sm text-gray-600">
                  Download all your personal data in JSON format (GDPR Right to Data Portability)
                </p>
              </div>
              <Download className="h-6 w-6 text-gray-400" />
            </div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export My Data'}
            </button>
          </div>

          {/* Data Deletion */}
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Delete Your Data</h3>
                <p className="text-sm text-red-700">
                  Permanently delete all your personal data from our system (GDPR Right to be Forgotten)
                </p>
                <p className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ Warning: This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <button
              onClick={handleDeleteData}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete My Data'}
            </button>
          </div>

          {/* Privacy Policy Link */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              For more information, please review our{' '}
              <a href="/privacy-policy" className="text-primary-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

