const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

/**
 * Returns a JPEG blob from a source image and crop area (pixels).
 * Optionally scales down so the longest side does not exceed maxDimension.
 */
export async function getCroppedImageBlob(imageSrc, pixelCrop, maxDimension = 1920) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  let { width, height } = pixelCrop
  if (maxDimension > 0 && Math.max(width, height) > maxDimension) {
    const scale = maxDimension / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  canvas.width = width
  canvas.height = height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create image blob'))
      },
      'image/jpeg',
      0.92
    )
  })
}

/** Lightweight preview URL for crop UI (revoke with URL.revokeObjectURL when done). */
export async function getCroppedImagePreviewUrl(imageSrc, pixelCrop, maxDimension = 960) {
  const blob = await getCroppedImageBlob(imageSrc, pixelCrop, maxDimension)
  return URL.createObjectURL(blob)
}
