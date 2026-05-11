'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Generic details popup for list tables.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title: string
 * - subtitle?: string
 * - avatar?: ReactNode  (image / initials shown next to title)
 * - sections: Array<{
 *     title?: string,
 *     items: Array<{ label: string, value: ReactNode }>
 *   }>
 * - actions?: ReactNode  (rendered in the footer)
 */
export default function DetailsModal({
  isOpen,
  onClose,
  title,
  subtitle,
  avatar,
  sections = [],
  actions,
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
          <div className="flex items-center gap-4 min-w-0">
            {avatar ? <div className="flex-shrink-0">{avatar}</div> : null}
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {title}
              </h2>
              {subtitle ? (
                <p className="text-sm text-gray-500 truncate mt-0.5">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {sections
            .filter((s) => s && (s.items?.length || s.content))
            .map((section, idx) => (
              <div key={idx}>
                {section.title ? (
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-900 bg-primary-50 border-l-4 border-primary-600 px-3 py-2 rounded-r-md mb-3">
                    {section.title}
                  </h3>
                ) : null}
                {section.content ? (
                  section.content
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {section.items.map((item, i) => (
                      <div key={i} className="min-w-0">
                        <dt className="text-xs font-bold text-gray-800 mb-1">
                          {item.label}
                        </dt>
                        <dd className="text-sm text-gray-900 break-words">
                          {item.value === null ||
                          item.value === undefined ||
                          item.value === ''
                            ? '—'
                            : item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
        </div>

        {actions ? (
          <div className="border-t border-gray-100 p-4 flex items-center justify-end gap-2 bg-gray-50 rounded-b-2xl">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
