'use client'

/** Responsive placement — matches /properties filter dropdown. */
export const FILTER_RANGE_POPOVER_CLASS =
  'absolute top-full left-0 right-0 mt-2 z-[100] w-full max-w-[calc(100vw-2rem)] sm:left-auto sm:right-0 sm:w-72'

/**
 * Min/max range popover — identical markup to /properties price filter dropdown.
 */
export default function FilterRangePopover({
  title,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  onApply,
  style,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
  className = FILTER_RANGE_POPOVER_CLASS
}) {
  return (
    <div
      data-filter-range-popover
      className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}
      style={style}
      role="dialog"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder={minPlaceholder}
            value={minValue}
            onChange={(e) => onMinChange(e.target.value)}
            className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder={maxPlaceholder}
            value={maxValue}
            onChange={(e) => onMaxChange(e.target.value)}
            className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button type="button" onClick={onApply} className="w-full btn btn-primary py-2 text-sm">
          Apply
        </button>
      </div>
    </div>
  )
}
