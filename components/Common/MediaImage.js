'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { resolveMediaUrl } from '../../lib/mediaUrl'

/**
 * Shows images fully visible inside their box (object-contain), any aspect ratio.
 */
export default function MediaImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  fallbackClassName = '',
  fallbackIcon: FallbackIcon = ImageIcon
}) {
  const [failed, setFailed] = useState(false)
  const url = resolveMediaUrl(src)

  if (!url || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${fallbackClassName || className}`}
        aria-hidden={!alt}
      >
        <FallbackIcon className="h-6 w-6 shrink-0 opacity-60" />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-gray-50 flex items-center justify-center ${className}`}>
      <img
        src={url}
        alt={alt}
        className={`max-w-full max-h-full w-auto h-auto object-contain ${imgClassName}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
