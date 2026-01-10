'use client'

import { useState } from 'react'
import { Video, ExternalLink, Upload } from 'lucide-react'

export default function VirtualTourViewer({ virtualTourUrl, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(virtualTourUrl || '')

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate(url)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Virtual Tour URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/virtual-tour or YouTube/Vimeo embed URL"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter a URL for 360° tour, YouTube/Vimeo video, or Matterport link
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Save
          </button>
          <button
            onClick={() => {
              setUrl(virtualTourUrl || '')
              setEditing(false)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!virtualTourUrl) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
        <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-500 mb-4">No virtual tour available</p>
        {onUpdate && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 mx-auto"
          >
            <Upload className="h-4 w-4" />
            Add Virtual Tour
          </button>
        )}
      </div>
    )
  }

  // Check if it's an embed URL (YouTube, Vimeo, Matterport)
  const isEmbedUrl = virtualTourUrl.includes('youtube.com') || 
                     virtualTourUrl.includes('youtu.be') ||
                     virtualTourUrl.includes('vimeo.com') ||
                     virtualTourUrl.includes('matterport.com')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Virtual Tour</h3>
        {onUpdate && (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Edit
          </button>
        )}
      </div>

      {isEmbedUrl ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={virtualTourUrl.includes('youtube.com') || virtualTourUrl.includes('youtu.be')
              ? `https://www.youtube.com/embed/${virtualTourUrl.split('/').pop().split('?')[0]}`
              : virtualTourUrl}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allow="fullscreen"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-4">Virtual Tour Available</p>
          <a
            href={virtualTourUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <ExternalLink className="h-4 w-4" />
            Open Virtual Tour
          </a>
        </div>
      )}
    </div>
  )
}

