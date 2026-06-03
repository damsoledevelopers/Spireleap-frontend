'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import FilterRangePopover from './FilterRangePopover'
import { getFilterRangePopoverFixedStyle } from '../../lib/filterPopoverPosition'

/**
 * Range popover in a portal — fixed position, flips above/below on scroll.
 */
export default function AnchoredFilterRangePopover({
  open,
  anchorRef,
  panelWidth = 288,
  gap = 8,
  panelHeight = 200,
  ...popoverProps
}) {
  const [style, setStyle] = useState({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || !anchorRef?.current) return undefined

    const update = () => {
      const el = anchorRef.current
      if (!el) return
      setStyle(getFilterRangePopoverFixedStyle(el, panelWidth, gap, panelHeight))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef, panelWidth, gap, panelHeight])

  if (!open || !mounted) return null

  return createPortal(
    <FilterRangePopover
      {...popoverProps}
      className="shadow-xl"
      style={style}
    />,
    document.body
  )
}
