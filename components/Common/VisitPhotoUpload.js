'use client'

import { useRef } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'

/**
 * Styled visit photo picker (hidden native input).
 * @param {File|null} file - newly selected file
 * @param {string|null} previewUrl - blob URL or remote URL for preview
 * @param {string|null} existingPhotoUrl - current saved photo (edit mode)
 * @param {(file: File|null) => void} onFileChange
 * @param {() => void} [onClearExisting] - clear saved photo without new file (edit)
 * @param {boolean} [showRemoveExisting]
 */
export default function VisitPhotoUpload({
  file,
  previewUrl,
  existingPhotoUrl,
  onFileChange,
  onClearExisting,
  showRemoveExisting = false,
  onPreviewClick,
  label = 'Visit Photo',
  optional = true
}) {
  const inputRef = useRef(null)
  const displayUrl = previewUrl || (!file && existingPhotoUrl) || null
  const hasImage = !!displayUrl

  const handlePick = (e) => {
    const picked = e.target.files?.[0] || null
    onFileChange(picked)
    e.target.value = ''
  }

  return (
    <div>
      <label className="block text-sm font-bold text-gray-900 mb-2">
        {label}
      </label>
      <div className="flex items-stretch gap-3">
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handlePick}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-primary-50 hover:border-primary-400 transition-colors text-center"
          >
            <Upload className="h-6 w-6 text-primary-600" />
            <span className="text-sm font-medium text-gray-800">
              {file ? 'Change photo' : hasImage ? 'Replace photo' : 'Click to upload photo'}
            </span>
          </button>
          {file && (
            <p className="text-xs text-gray-600 mt-2 truncate" title={file.name}>
              Selected: {file.name}
            </p>
          )}
          {showRemoveExisting && existingPhotoUrl && !file && (
            <button
              type="button"
              onClick={onClearExisting}
              className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Remove current photo
            </button>
          )}
        </div>
        {hasImage && (
          <div className="relative shrink-0">
            <button
              type="button"
              title="Preview"
              onClick={() => onPreviewClick?.(displayUrl)}
              className="block rounded-xl border border-gray-200 overflow-hidden hover:ring-2 hover:ring-primary-500 transition-shadow bg-white"
            >
              <img src={displayUrl} alt="Visit" className="h-24 w-24 object-cover" />
            </button>
            {file && (
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                aria-label="Remove selected photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {!hasImage && (
          <div className="shrink-0 h-24 w-24 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-300" />
          </div>
        )}
      </div>
    </div>
  )
}
