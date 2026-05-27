/** True when lat/lng are set to a real point (not empty or 0,0 placeholder). */
export function hasValidMapCoordinates(coordinates) {
  if (!coordinates || typeof coordinates !== 'object') return false
  const lat = Number(coordinates.lat)
  const lng = Number(coordinates.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  return true
}

export function getGoogleMapsPlaceUrl(coordinates) {
  if (!hasValidMapCoordinates(coordinates)) return ''
  return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
}

export function getGoogleMapsEmbedUrl(coordinates, apiKey) {
  if (!hasValidMapCoordinates(coordinates) || !apiKey) return ''
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${coordinates.lat},${coordinates.lng}`
}
