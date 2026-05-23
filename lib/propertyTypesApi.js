/** Fetch property types from settings API for dropdowns. */
export async function fetchPropertyTypeOptions(api) {
  const res = await api.get('/settings/property-types')
  const rows = res.data?.propertyTypes || []
  return rows
    .filter((t) => t.isActive !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)))
    .map((t) => ({
      value: t.slug,
      label: t.name || t.slug
    }))
}

export function slugToLabel(slug) {
  if (!slug) return ''
  return String(slug)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
