'use client'

import { useEffect, useState } from 'react'
import { getDropdownOptions } from '../../lib/dropdownsApi'

export default function SpokenLanguagesPicker({ value = [], onChange, label = 'Spoken Languages' }) {
  const [options, setOptions] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getDropdownOptions()
        const list = (data?.spokenLanguages || data?.languages || []).map((item) =>
          typeof item === 'string' ? item : item.label || item.value
        )
        if (!cancelled) setOptions(list.filter(Boolean))
      } catch {
        if (!cancelled) setOptions(['English', 'Arabic', 'Hindi'])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selected = Array.isArray(value) ? value : []

  const toggle = (lang) => {
    const name = String(lang)
    if (selected.includes(name)) {
      onChange?.(selected.filter((l) => l !== name))
    } else {
      onChange?.([...selected, name])
    }
  }

  return (
    <div>
      <label className="block text-sm font-bold text-gray-900 mb-2">{label}</label>
      {options.length === 0 ? (
        <p className="text-sm text-gray-500">Add languages in Settings → General → Spoken languages list.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((lang) => {
            const active = selected.includes(lang)
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggle(lang)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                }`}
              >
                {lang}
              </button>
            )
          })}
        </div>
      )}
      {selected.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">Selected: {selected.join(', ')}</p>
      )}
    </div>
  )
}
