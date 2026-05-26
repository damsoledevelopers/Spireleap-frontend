import { resolveMediaUrl } from './mediaUrl'

/** Primary listing image as an absolute URL for <Image> / <img>. */
export function getPropertyPrimaryImageUrl(images, fallback = '/placeholder-property.jpg') {
  if (!images?.length) return fallback

  const primary = images.find((img) => img?.isPrimary) || images[0]
  const resolved = resolveMediaUrl(primary)

  return resolved || fallback
}
