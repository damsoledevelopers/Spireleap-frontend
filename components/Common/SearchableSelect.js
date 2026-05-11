'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

function toOption(option) {
  if (option && typeof option === 'object') {
    return {
      value: option.value ?? '',
      label: option.label ?? String(option.value ?? '')
    }
  }
  return { value: option ?? '', label: String(option ?? '') }
}

export default function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  required = false,
  disabled = false,
  /** When true, Backspace/Delete on the closed trigger clears the current value (useful for city pickers). */
  clearOnBackspace = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  searchPlaceholder = 'Search...',
  /** Show the search box. `true`/`false` to force, `'auto'` (default) shows it only when options exceed `searchThreshold`. */
  searchable = 'auto',
  /** When `searchable === 'auto'`, only show the search input when option count is greater than this. */
  searchThreshold = 5
}) {
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const optionRefs = useRef([])
  const reactId = useId()
  const baseId = id || `ssel-${reactId.replace(/:/g, '')}`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const normalizedOptions = useMemo(() => options.map(toOption), [options])

  const showSearch =
    searchable === true ||
    (searchable === 'auto' && normalizedOptions.length > searchThreshold)

  const selected = useMemo(() => {
    const v = value ?? ''
    return normalizedOptions.find(o => String(o.value) === String(v)) || null
  }, [normalizedOptions, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return normalizedOptions
    return normalizedOptions.filter(o => String(o.label).toLowerCase().includes(q))
  }, [normalizedOptions, query])

  // Keep highlight in sync when menu opens, search changes, or list shrinks
  useEffect(() => {
    if (!open) {
      setHighlightIndex(-1)
      return
    }
    if (filtered.length === 0) {
      setHighlightIndex(-1)
      return
    }
    if (!query.trim()) {
      const idx = filtered.findIndex(o => String(o.value) === String(value ?? ''))
      const next = idx >= 0 ? idx : 0
      setHighlightIndex(Math.min(next, filtered.length - 1))
      return
    }
    setHighlightIndex(0)
  }, [open, query, filtered, value])

  useEffect(() => {
    if (!open || highlightIndex < 0) return
    const el = optionRefs.current[highlightIndex]
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [open, highlightIndex, filtered.length])

  useEffect(() => {
    if (!open) return

    const onDocMouseDown = (e) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(e.target)) return
      setOpen(false)
      setQuery('')
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setTimeout(() => {
      if (showSearch) {
        inputRef.current?.focus()
      } else {
        listRef.current?.focus()
      }
    }, 0)
  }, [open, showSearch])

  const emitChange = useCallback(
    (newValue) => {
      if (disabled) return
      if (typeof onChange === 'function') {
        onChange({ target: { name, id: id ?? baseId, value: newValue } })
      }
    },
    [disabled, onChange, name, id, baseId]
  )

  const selectHighlighted = useCallback(() => {
    if (highlightIndex < 0 || highlightIndex >= filtered.length) return
    const opt = filtered[highlightIndex]
    emitChange(opt.value)
    setOpen(false)
    setQuery('')
  }, [emitChange, filtered, highlightIndex])

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length === 0) return
      setHighlightIndex((i) => {
        const base = i < 0 ? -1 : i
        return Math.min(filtered.length - 1, base + 1)
      })
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length === 0) return
      setHighlightIndex((i) => {
        const base = i < 0 ? 0 : i
        return Math.max(0, base - 1)
      })
      return
    }
    if (e.key === 'Enter') {
      if (filtered.length > 0 && highlightIndex >= 0) {
        e.preventDefault()
        selectHighlighted()
      }
      return
    }
  }

  const handleButtonKeyDown = (e) => {
    if (disabled) return

    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setOpen(true)
      setQuery('')
      return
    }

    if (!clearOnBackspace || open) return
    if (e.key !== 'Backspace' && e.key !== 'Delete') return
    const v = value ?? ''
    if (v === '' || v == null) return
    e.preventDefault()
    emitChange('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value ?? ''} required={required} />}

      <button
        id={baseId}
        name={name}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={handleButtonKeyDown}
        onClick={() => {
          if (disabled) return
          setOpen(o => !o)
          setQuery('')
        }}
        className={`${buttonClassName || 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500'} ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        } flex items-center justify-between gap-3`}
      >
        <span className={`truncate text-left ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden ${menuClassName}`}
          role="listbox"
          aria-activedescendant={highlightIndex >= 0 ? `${baseId}-option-${highlightIndex}` : undefined}
        >
          {showSearch && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  aria-controls={`${baseId}-listbox`}
                />
              </div>
            </div>
          )}

          <div
            ref={listRef}
            id={`${baseId}-listbox`}
            className="max-h-64 overflow-auto py-1"
            tabIndex={showSearch ? -1 : 0}
            onKeyDown={showSearch ? undefined : handleSearchKeyDown}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No results</div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = String(opt.value) === String(value ?? '')
                const isHighlighted = i === highlightIndex
                return (
                  <button
                    key={String(opt.value)}
                    id={`${baseId}-option-${i}`}
                    ref={(el) => {
                      optionRefs.current[i] = el
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      isHighlighted ? 'bg-gray-100 ring-1 ring-inset ring-primary-300' : ''
                    } ${isSelected ? 'text-primary-800 font-medium' : 'text-gray-700'}`}
                    onMouseEnter={() => setHighlightIndex(i)}
                    onClick={() => {
                      emitChange(opt.value)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
