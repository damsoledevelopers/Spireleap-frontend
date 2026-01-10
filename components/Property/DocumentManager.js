'use client'

import { useState } from 'react'
import { FileText, Upload, Download, Trash2, X } from 'lucide-react'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'

export default function DocumentManager({ propertyId, documents = [], onUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const handleUpload = async (event) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      setUploading(true)
      const formData = new FormData()
      Array.from(files).forEach(file => {
        formData.append('documents', file)
      })

      const response = await api.post('/upload/property-documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.documents && response.data.documents.length > 0) {
        const currentDocuments = documents || []
        const newDocuments = response.data.documents.map(doc => ({
          ...doc,
          uploadedAt: new Date()
        }))
        const updatedDocuments = [...currentDocuments, ...newDocuments]

        // Update property with new documents
        await api.put(`/properties/${propertyId}`, { documents: updatedDocuments })
        toast.success(`${response.data.documents.length} document(s) uploaded successfully`)
        if (onUpdate) onUpdate()
      }
    } catch (error) {
      console.error('Error uploading documents:', error)
      toast.error(error.response?.data?.message || 'Failed to upload documents')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return

    try {
      setDeleting(index)
      const updatedDocuments = documents.filter((_, i) => i !== index)
      await api.put(`/properties/${propertyId}`, { documents: updatedDocuments })
      toast.success('Document deleted successfully')
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = (document) => {
    if (document.url) {
      window.open(document.url, '_blank')
    } else {
      toast.error('Document URL not available')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Property Documents</h3>
        <label className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 cursor-pointer text-sm">
          <Upload className="h-4 w-4" />
          Upload Documents
          <input
            type="file"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {uploading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-600">Uploading documents...</p>
        </div>
      )}

      {documents && documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 flex-1">
                <FileText className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{doc.name || 'Document'}</p>
                  <p className="text-xs text-gray-500">
                    {doc.type?.toUpperCase()} • {doc.size ? `${(doc.size / 1024).toFixed(2)} KB` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  disabled={deleting === index}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  title="Delete"
                >
                  {deleting === index ? (
                    <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-500">No documents uploaded</p>
        </div>
      )}
    </div>
  )
}

