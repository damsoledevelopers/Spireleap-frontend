/** Extract YouTube video ID from common URL formats. */
export function getYoutubeVideoId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  ]
  for (const re of patterns) {
    const m = trimmed.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

export function getYoutubeEmbedUrl(url) {
  const id = getYoutubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

/** Normalized list of embeddable YouTube videos from property or videos array. */
export function getPropertyYoutubeVideos(propertyOrVideos) {
  const list = Array.isArray(propertyOrVideos)
    ? propertyOrVideos
    : propertyOrVideos?.videos
  if (!Array.isArray(list)) return []

  return list
    .map((v) => {
      const url = String(v?.url || '').trim()
      if (!url) return null
      const embedUrl = getYoutubeEmbedUrl(url)
      if (!embedUrl) return null
      return { url, embedUrl, type: v?.type || 'youtube' }
    })
    .filter(Boolean)
}
