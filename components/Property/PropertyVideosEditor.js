'use client'

import { Plus, Trash2 } from 'lucide-react'
import { getYoutubeVideoId } from '../../lib/youtube'

export default function PropertyVideosEditor({ videos = [], onChange }) {
  const list = Array.isArray(videos) ? videos : []

  const updateAt = (index, url) => {
    const next = list.map((v, i) => (i === index ? { ...v, url, type: 'youtube' } : v))
    onChange(next)
  }

  const addRow = () => {
    onChange([...list, { url: '', type: 'youtube' }])
  }

  const removeAt = (index) => {
    onChange(list.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-gray-500">No videos added. Click below to add a YouTube link.</p>
      )}
      {list.map((video, index) => {
        const url = video?.url || ''
        const valid = !url.trim() || !!getYoutubeVideoId(url)
        return (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                type="url"
                value={url}
                onChange={(e) => updateAt(index, e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm ${
                  valid ? 'border-gray-300' : 'border-red-400'
                }`}
              />
              {!valid && (
                <p className="text-xs text-red-600 mt-1">Enter a valid YouTube URL</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
              aria-label={`Remove video ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50"
      >
        <Plus className="h-4 w-4" />
        Add video
      </button>
    </div>
  )
}

/** Prepare videos for API submit (valid YouTube URLs only). */
export function normalizeVideosForSubmit(videos) {
  if (!Array.isArray(videos)) return []
  return videos
    .map((v) => ({
      url: String(v?.url || '').trim(),
      type: 'youtube'
    }))
    .filter((v) => v.url && getYoutubeVideoId(v.url))
}
