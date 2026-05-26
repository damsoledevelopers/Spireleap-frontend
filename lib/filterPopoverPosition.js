/**
 * Position a filter popover below its trigger (absolute, relative to offset parent).
 */
export function getFilterPopoverStyle(triggerEl, panelWidth = 600) {
  if (!triggerEl || typeof window === 'undefined') {
    return {}
  }

  const rect = triggerEl.getBoundingClientRect()
  const parent = triggerEl.offsetParent
  const parentRect = parent?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth }
  const margin = 16
  const width = Math.min(panelWidth, window.innerWidth - margin * 2)

  let left = rect.left - parentRect.left

  if (rect.left + width > window.innerWidth - margin) {
    left = rect.right - parentRect.left - width
  }

  const absoluteLeft = parentRect.left + left
  if (absoluteLeft < margin) {
    left = margin - parentRect.left
  }

  const maxLeft = parentRect.width - width
  if (maxLeft >= 0 && left > maxLeft) {
    left = maxLeft
  }

  return {
    left: `${Math.round(left)}px`,
    right: 'auto',
    width: `${Math.round(width)}px`
  }
}

const DEFAULT_PANEL_HEIGHT = 280

/**
 * Fixed positioning — fits in viewport (flips above if needed), stays above page content.
 */
export function getFilterPopoverFixedStyle(
  triggerEl,
  panelWidth = 600,
  gap = 4,
  panelHeight = DEFAULT_PANEL_HEIGHT
) {
  if (!triggerEl || typeof window === 'undefined') {
    return {}
  }

  const rect = triggerEl.getBoundingClientRect()
  const margin = 16
  const width = Math.min(panelWidth, window.innerWidth - margin * 2)
  const height = Math.max(180, Math.min(panelHeight, 420))

  let left = rect.left
  if (left + width > window.innerWidth - margin) {
    left = rect.right - width
  }
  if (left < margin) {
    left = margin
  }

  const spaceBelow = window.innerHeight - rect.bottom - gap - margin
  const spaceAbove = rect.top - gap - margin
  const minComfortable = Math.min(height, 240)
  const openBelow = spaceBelow >= minComfortable || (spaceBelow >= spaceAbove && spaceBelow >= 160)

  if (openBelow) {
    const maxHeight = Math.max(160, Math.min(height, spaceBelow))
    return {
      position: 'fixed',
      top: `${Math.round(rect.bottom + gap)}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(width)}px`,
      maxHeight: `${Math.round(maxHeight)}px`,
      zIndex: 200,
      overflowY: 'auto'
    }
  }

  const maxHeight = Math.max(160, Math.min(height, spaceAbove))
  const top = Math.max(margin, rect.top - gap - maxHeight)

  return {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
    zIndex: 200,
    overflowY: 'auto'
  }
}
