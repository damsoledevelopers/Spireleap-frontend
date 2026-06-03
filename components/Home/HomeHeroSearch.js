'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  RENT_PERIOD_FILTER_OPTIONS,
  PROPERTY_SEGMENT_OPTIONS,
  getHandoverQuarterOptions,
  HOME_BATHROOM_FILTER_OPTIONS
} from '../../lib/homeSearchFilters'
import { BEDROOM_FILTER_OPTIONS } from '../../lib/propertyOptions'
import AnchoredFilterRangePopover from '../Common/AnchoredFilterRangePopover'

const CONTROL_H = 'h-10'
const FIELD =
  'w-full px-3 pr-8 border rounded-lg text-sm font-medium transition-all appearance-none cursor-pointer'

function fieldClass(active) {
  return active
    ? `${FIELD} ${CONTROL_H} border-primary-500 bg-primary-50 text-primary-900`
    : `${FIELD} ${CONTROL_H} border-gray-200 text-gray-700 bg-white hover:border-primary-300`
}

function FilterSelect({ value, onChange, active, disabled = false, children }) {
  return (
    <div className="relative min-w-0">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${fieldClass(active)} disabled:cursor-default disabled:opacity-40`}
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
      >
        {children}
      </select>
      {!disabled && (
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      )}
    </div>
  )
}

/** Dropdown-style trigger (no icon) — matches other hero filter fields. */
function RangeFilterButton({ active, open, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${fieldClass(active)} text-left relative w-full`}
    >
      <span className="block truncate pr-6">{children}</span>
      <ChevronDown
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-transform ${open ? 'rotate-180 text-primary-600' : 'text-gray-400'
          }`}
      />
    </button>
  )
}

export default function HomeHeroSearch({
  draftFilters,
  onChange,
  onSearch,
  searching = false,
  propertyTypeOptions = [],
  completionStatusOptions = []
}) {
  const isRent = draftFilters.listingType === 'rent'
  const isSale = !isRent
  const showHandover = isSale && draftFilters.completionStatus === 'off_plan'
  const handoverOptions = getHandoverQuarterOptions()

  const [openPanel, setOpenPanel] = useState(null)
  const [priceDraft, setPriceDraft] = useState({ min: '', max: '' })
  const [areaDraft, setAreaDraft] = useState({ min: '', max: '' })

  const priceWrapRef = useRef(null)
  const areaWrapRef = useRef(null)

  const update = (patch) => onChange((prev) => ({ ...prev, ...patch }))

  const completionOptions = useMemo(
    () => [
      { value: '', label: 'All' },
      ...completionStatusOptions.map((o) => ({
        value: o.value,
        label: o.label || String(o.value).replace(/_/g, ' ')
      }))
    ],
    [completionStatusOptions]
  )

  const typeOptions = useMemo(
    () => [
      { value: '', label: 'Property Type' },
      ...propertyTypeOptions.map((o) => ({ value: o.value, label: o.label }))
    ],
    [propertyTypeOptions]
  )

  const priceLabel = (() => {
    const { minPrice, maxPrice } = draftFilters
    if (minPrice && maxPrice) return `${minPrice} – ${maxPrice}`
    if (minPrice) return `${minPrice}+`
    if (maxPrice) return `Up to ${maxPrice}`
    return 'Price'
  })()

  const areaLabel = (() => {
    const { minArea, maxArea } = draftFilters
    if (minArea && maxArea) return `${minArea} – ${maxArea} sqft`
    if (minArea) return `${minArea}+ sqft`
    if (maxArea) return `Up to ${maxArea} sqft`
    return 'Area (sqft)'
  })()

  const segmentActive = draftFilters.propertySegment && draftFilters.propertySegment !== 'all'

  useEffect(() => {
    const onDocClick = (e) => {
      if (e.target.closest('[data-filter-range-popover]')) return
      if (openPanel === 'price' && priceWrapRef.current && !priceWrapRef.current.contains(e.target)) {
        setOpenPanel(null)
      }
      if (openPanel === 'area' && areaWrapRef.current && !areaWrapRef.current.contains(e.target)) {
        setOpenPanel(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openPanel])

  const openPrice = () => {
    setPriceDraft({ min: draftFilters.minPrice || '', max: draftFilters.maxPrice || '' })
    setOpenPanel('price')
  }

  const openArea = () => {
    setAreaDraft({ min: draftFilters.minArea || '', max: draftFilters.maxArea || '' })
    setOpenPanel('area')
  }

  return (
    <form
      className="w-full max-w-[42rem] mx-auto px-1"
      onSubmit={(e) => {
        e.preventDefault()
        setOpenPanel(null)
        onSearch?.()
      }}
    >
      <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-visible">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          <div className={`inline-flex ${CONTROL_H} rounded-lg border border-gray-200 bg-gray-50 shrink-0 overflow-hidden`}>
            <button
              type="button"
              onClick={() =>
                update({
                  listingType: 'sale',
                  rentPeriod: '',
                  handoverQuarter:
                    draftFilters.completionStatus === 'off_plan' ? draftFilters.handoverQuarter : ''
                })
              }
              className={`${CONTROL_H} px-4 text-sm font-bold transition-colors ${isSale
                ? 'bg-primary-600 text-white'
                : 'bg-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() =>
                update({
                  listingType: 'rent',
                  completionStatus: '',
                  handoverQuarter: ''
                })
              }
              className={`${CONTROL_H} px-4 text-sm font-bold transition-colors border-l border-gray-200 ${isRent
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Rent
            </button>
          </div>

          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={draftFilters.search || ''}
              onChange={(e) => update({ search: e.target.value })}
              placeholder="Search property, city, area…"
              className={`w-full ${CONTROL_H} pl-9 pr-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500`}
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={searching}
            className={`inline-flex items-center justify-center gap-1.5 shrink-0 ${CONTROL_H} px-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-60`}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{searching ? '…' : 'Search'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 pt-2.5 pb-2">
          <FilterSelect
            value={isRent ? draftFilters.rentPeriod : draftFilters.completionStatus}
            onChange={(e) => {
              const v = e.target.value
              if (isRent) {
                update({ rentPeriod: v, completionStatus: '', handoverQuarter: '' })
              } else {
                update({
                  completionStatus: v,
                  rentPeriod: '',
                  handoverQuarter: v === 'off_plan' ? draftFilters.handoverQuarter : ''
                })
              }
            }}
            active={isRent ? !!draftFilters.rentPeriod : !!draftFilters.completionStatus}
          >
            {isRent ? (
              RENT_PERIOD_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'rent-all'} value={o.value}>
                  {o.value === '' ? 'All' : o.label}
                </option>
              ))
            ) : (
              completionOptions.map((o) => (
                <option key={o.value || 'completion-all'} value={o.value}>
                  {o.value === '' ? 'All' : o.label}
                </option>
              ))
            )}
          </FilterSelect>

          <FilterSelect
            value={draftFilters.propertySegment}
            onChange={(e) => update({ propertySegment: e.target.value, propertyType: '' })}
            active={segmentActive}
          >
            {PROPERTY_SEGMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={draftFilters.propertyType}
            onChange={(e) => update({ propertyType: e.target.value })}
            active={!!draftFilters.propertyType}
          >
            {typeOptions.map((o) => (
              <option key={o.value || 'any-type'} value={o.value}>
                {o.label}
              </option>
            ))}
          </FilterSelect>

          <div className="relative min-w-0" ref={areaWrapRef}>
            <RangeFilterButton
              active={draftFilters.minArea || draftFilters.maxArea}
              open={openPanel === 'area'}
              onClick={() => (openPanel === 'area' ? setOpenPanel(null) : openArea())}
            >
              {areaLabel}
            </RangeFilterButton>
            <AnchoredFilterRangePopover
              open={openPanel === 'area'}
              anchorRef={areaWrapRef}
              title="Area Range"
              minValue={areaDraft.min}
              maxValue={areaDraft.max}
              onMinChange={(v) => setAreaDraft((d) => ({ ...d, min: v }))}
              onMaxChange={(v) => setAreaDraft((d) => ({ ...d, max: v }))}
              onApply={() => {
                update({ minArea: areaDraft.min, maxArea: areaDraft.max })
                setOpenPanel(null)
              }}
              minPlaceholder="Min"
              maxPlaceholder="Max"
            />
          </div>
        </div>

        <div
          className={`grid grid-cols-2 gap-2 px-3 pb-3 ${showHandover ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}
        >
          {showHandover && (
            <FilterSelect
              value={draftFilters.handoverQuarter || ''}
              onChange={(e) => update({ handoverQuarter: e.target.value })}
              active={!!draftFilters.handoverQuarter}
            >
              {handoverOptions.map((o) => (
                <option key={o.value || 'handover-all'} value={o.value}>
                  {o.value === '' ? 'All' : o.label}
                </option>
              ))}
            </FilterSelect>
          )}

          <div className="relative min-w-0" ref={priceWrapRef}>
            <RangeFilterButton
              active={draftFilters.minPrice || draftFilters.maxPrice}
              open={openPanel === 'price'}
              onClick={() => (openPanel === 'price' ? setOpenPanel(null) : openPrice())}
            >
              {priceLabel}
            </RangeFilterButton>
            <AnchoredFilterRangePopover
              open={openPanel === 'price'}
              anchorRef={priceWrapRef}
              title="Price Range"
              minValue={priceDraft.min}
              maxValue={priceDraft.max}
              onMinChange={(v) => setPriceDraft((d) => ({ ...d, min: v }))}
              onMaxChange={(v) => setPriceDraft((d) => ({ ...d, max: v }))}
              onApply={() => {
                update({ minPrice: priceDraft.min, maxPrice: priceDraft.max })
                setOpenPanel(null)
              }}
              minPlaceholder="Min"
              maxPlaceholder="Max"
            />
          </div>

          <FilterSelect
            value={draftFilters.bedrooms}
            onChange={(e) => update({ bedrooms: e.target.value })}
            active={!!draftFilters.bedrooms}
          >
            {BEDROOM_FILTER_OPTIONS.map((o) => (
              <option key={o.value || 'any-bed'} value={o.value}>
                {o.value === '' ? 'Bedrooms' : o.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={draftFilters.bathrooms}
            onChange={(e) => update({ bathrooms: e.target.value })}
            active={!!draftFilters.bathrooms}
          >
            {HOME_BATHROOM_FILTER_OPTIONS.map((o) => (
              <option key={o.value || 'any-bath'} value={o.value}>
                {o.label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>
    </form>
  )
}
