'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'
import { getCroppedImageBlob, getCroppedImagePreviewUrl } from '../../lib/cropImage'
import HeroBackgroundPreview, { HeroBackgroundMobilePreview } from '../Home/HeroBackgroundPreview'

export default function ImageCropModal({
  open,
  imageSrc,
  onClose,
  onConfirm,
  aspect = 16 / 9,
  title = 'Crop image',
  hint = 'Drag to reposition. Use the slider to zoom in or out.',
  maxOutputDimension = 1920,
  previewHeroTitle,
  previewHeroSubtitle,
  previewHeroDescription,
  previewTitleColor,
  previewSubtitleColor,
  previewDescriptionColor,
  previewTextAlign
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewUrlRef = useRef(null)
  const previewTimerRef = useRef(null)

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setSubmitting(false)
      setPreviewUrl(null)
    }
  }, [open, imageSrc])

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
  }

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
      revokePreviewUrl()
    }
  }, [])

  const onCropComplete = useCallback((_croppedArea, croppedAreaPx) => {
    setCroppedAreaPixels(croppedAreaPx)
  }, [])

  useEffect(() => {
    if (!open || !imageSrc || !croppedAreaPixels) return

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(async () => {
      try {
        setPreviewLoading(true)
        const url = await getCroppedImagePreviewUrl(imageSrc, croppedAreaPixels, 960)
        revokePreviewUrl()
        previewUrlRef.current = url
        setPreviewUrl(url)
      } catch (err) {
        console.error('Preview generation failed:', err)
      } finally {
        setPreviewLoading(false)
      }
    }, 280)

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [open, imageSrc, croppedAreaPixels, crop, zoom])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    try {
      setSubmitting(true)
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, maxOutputDimension)
      await onConfirm(blob)
      onClose()
    } catch (err) {
      console.error('Crop failed:', err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !imageSrc) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-crop-title"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h2 id="image-crop-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="relative w-full bg-gray-900" style={{ height: 'min(40vh, 320px)' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              showGrid
            />
          </div>

          <div className="px-4 py-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
              <input
                type="range"
                min={1}
                max={4}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 accent-primary-600 cursor-pointer"
                aria-label="Zoom"
              />
              <ZoomIn className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Drag to reposition · zoom 1×–4× · crop frame is 16∶9 (same as the live homepage hero)
            </p>
          </div>

          <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/80">
            <p className="text-xs font-semibold text-gray-700 py-3">Live preview — how it will look on the site</p>
            {previewLoading && !previewUrl ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating preview…
              </div>
            ) : previewUrl ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
                <HeroBackgroundPreview
                  imageUrl={previewUrl}
                  heroTitle={previewHeroTitle}
                  heroSubtitle={previewHeroSubtitle}
                  heroDescription={previewHeroDescription}
                  titleColor={previewTitleColor}
                  subtitleColor={previewSubtitleColor}
                  descriptionColor={previewDescriptionColor}
                  textAlign={previewTextAlign}
                  label="Desktop / tablet"
                />
                <HeroBackgroundMobilePreview imageUrl={previewUrl} label="Mobile" />
              </div>
            ) : (
              <p className="text-xs text-gray-500 pb-4 text-center">Move or zoom the image to generate a preview.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !croppedAreaPixels}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Uploading…' : 'Apply & upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
