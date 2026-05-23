const BACKEND_ORIGIN = (() => {
  const prod = 'https://spireleap-backend.onrender.com'
  const dev = 'http://localhost:5000'
  const api =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
      ? String(process.env.NEXT_PUBLIC_API_URL).replace(/\/api\/?$/, '')
      : process.env.NODE_ENV === 'development'
        ? dev
        : prod
  return api.replace(/\/+$/, '')
})()

/** Resolve property/CMS image paths to absolute URLs. */
export function resolveMediaUrl(raw) {
  if (!raw) return ''

  const candidate =
    typeof raw === 'string'
      ? raw
      : raw.url || raw.path || raw.secure_url || raw.imageUrl || raw.location || ''

  if (!candidate) return ''
  if (/^https?:\/\//i.test(candidate)) return candidate
  if (candidate.startsWith('/')) return `${BACKEND_ORIGIN}${candidate}`
  if (candidate.startsWith('uploads/')) return `${BACKEND_ORIGIN}/${candidate}`
  return `${BACKEND_ORIGIN}/uploads/${candidate}`
}
