'use client'

import { ChevronDown } from 'lucide-react'

/** Filter chip button — matches /properties toolbar filters. */
export default function PropertiesFilterChipButton({
  active = false,
  open = false,
  onClick,
  icon: Icon,
  label,
  badge,
  className = ''
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-medium flex items-center gap-2 ${active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 bg-white text-gray-800'} ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="bg-primary-600 text-white rounded-full px-2 py-0.5 text-xs shrink-0">
          {badge}
        </span>
      ) : null}
      <ChevronDown
        className={`h-4 w-4 shrink-0 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  )
}
