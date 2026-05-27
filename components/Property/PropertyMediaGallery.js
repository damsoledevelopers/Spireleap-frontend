'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  LayoutGrid,
  Mail,
  Phone,
  Play
} from 'lucide-react'
import toast from 'react-hot-toast'
import { resolveMediaUrl } from '../../lib/mediaUrl'
import { getPropertyYoutubeVideos } from '../../lib/youtube'
import {
  openGmailCompose,
  openPhoneCall,
  buildCustomerToAgentEmail
} from '../../lib/agentContact'

function resolveUrl(img) {
  if (!img) return ''
  if (typeof img === 'string') return resolveMediaUrl(img)
  return resolveMediaUrl(img.url || img)
}

function orderImages(images) {
  const list = Array.isArray(images) ? images.filter(Boolean) : []
  if (list.length <= 1) return list
  const primaryIndex = list.findIndex((img) => img?.isPrimary)
  if (primaryIndex <= 0) return list
  return [list[primaryIndex], ...list.filter((_, i) => i !== primaryIndex)]
}

export default function PropertyMediaGallery({
  title = 'Property',
  images = [],
  floorPlanImages = [],
  videos = [],
  agent = null,
  propertyLocation = '',
  customerName = '',
  className = ''
}) {
  const photos = useMemo(() => orderImages(images), [images])
  const floorPlans = useMemo(
    () => (Array.isArray(floorPlanImages) ? floorPlanImages.filter(Boolean) : []),
    [floorPlanImages]
  )
  const videoList = useMemo(() => getPropertyYoutubeVideos(videos), [videos])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState('photos')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('photos')
  const [galleryGridOnly, setGalleryGridOnly] = useState(false)
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)

  useEffect(() => {
    setPreviewIndex(0)
    setPreviewOpen(false)
    setModalOpen(false)
    setActiveVideoIndex(0)
  }, [photos.length, floorPlans.length, videoList.length])

  const photoCount = photos.length
  const floorCount = floorPlans.length
  const videoCount = videoList.length
  const mosaicSlots = photos.slice(0, 3)
  const hasMorePhotos = photoCount > 3
  const hasVideo = videoCount > 0

  const openPhotoPreview = (index) => {
    setPreviewMode('photos')
    setPreviewIndex(index)
    setPreviewOpen(true)
  }

  const openFloorPlanPreview = (index) => {
    setPreviewMode('floorplans')
    setPreviewIndex(index)
    setPreviewOpen(true)
  }

  const previewItems = previewMode === 'floorplans' ? floorPlans : photos
  const previewCount = previewItems.length

  const openGalleryModal = (tab = 'photos') => {
    setGalleryGridOnly(tab === 'photos' && hasMorePhotos)
    setActiveTab(tab)
    if (tab === 'video') setActiveVideoIndex(0)
    setModalOpen(true)
  }

  const overlayPill =
    'inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-sm hover:bg-black/85 transition-colors'

  const mosaicCell = (img, idx, { spanMain = false, spanTall = false, showCountBadge = false } = {}) => {
    const url = resolveUrl(img) || '/placeholder-property.jpg'
    return (
      <div
        key={`${url}-${idx}`}
        className={`relative overflow-hidden rounded-xl bg-gray-200 ${
          spanMain
            ? 'col-span-1 row-span-1 h-52 sm:h-64 md:col-span-2 md:row-span-2 md:h-full min-h-[220px]'
            : spanTall
              ? 'h-36 sm:h-44 md:col-span-1 md:row-span-2 md:h-full min-h-[120px]'
              : 'h-36 sm:h-44 md:h-full min-h-[120px]'
        }`}
      >
        <button
          type="button"
          onClick={() => openPhotoPreview(idx)}
          className="block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          aria-label={`Preview photo ${idx + 1}`}
        >
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.01]"
          />
        </button>
        {showCountBadge && photoCount > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (hasMorePhotos) openGalleryModal('photos')
              else openPhotoPreview(idx)
            }}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black/90"
            aria-label={hasMorePhotos ? `View all ${photoCount} photos` : `Photo ${photoCount}`}
          >
            <Camera className="h-4 w-4" />
            {photoCount}
          </button>
        )}
      </div>
    )
  }

  const renderOverlayActions = () => (
    <>
      {floorCount > 0 && (
        <button type="button" className={overlayPill} onClick={() => openGalleryModal('floorplans')}>
          <LayoutGrid className="h-3.5 w-3.5" />
          Floor plans
        </button>
      )}
      {hasVideo && (
        <button type="button" className={overlayPill} onClick={() => openGalleryModal('video')}>
          <Play className="h-3.5 w-3.5" />
          {videoCount > 1 ? `Videos (${videoCount})` : 'Video'}
        </button>
      )}
    </>
  )

  const renderMosaic = () => {
    if (photoCount === 0) {
      return (
        <div className="relative h-64 sm:h-80 md:h-[480px] rounded-xl overflow-hidden bg-gray-200">
          <img src="/placeholder-property.jpg" alt="" className="h-full w-full object-cover" />
        </div>
      )
    }

    if (photoCount === 1) {
      return (
        <div className="relative h-64 sm:h-80 md:h-[480px] rounded-xl overflow-hidden">
          <button type="button" onClick={() => openPhotoPreview(0)} className="block h-full w-full">
            <img src={resolveUrl(photos[0])} alt="" className="h-full w-full object-cover" />
          </button>
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-10">{renderOverlayActions()}</div>
          <button
            type="button"
            onClick={() => openPhotoPreview(0)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-sm font-semibold text-white"
          >
            <Camera className="h-4 w-4" />
            {photoCount}
          </button>
        </div>
      )
    }

    if (photoCount === 2) {
      return (
        <div className="relative grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-3 h-auto md:h-[480px]">
          {mosaicCell(photos[0], 0, { spanMain: true })}
          {mosaicCell(photos[1], 1, { spanTall: true, showCountBadge: true })}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-10 pointer-events-auto">
            {renderOverlayActions()}
          </div>
        </div>
      )
    }

    return (
      <div className="relative grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-3 h-auto md:h-[480px]">
        <div className="relative md:col-span-2 md:row-span-2">
          {mosaicCell(mosaicSlots[0], 0, { spanMain: true })}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-10 pointer-events-auto">
            {renderOverlayActions()}
          </div>
        </div>
        {mosaicCell(mosaicSlots[1], 1)}
        {mosaicCell(mosaicSlots[2], 2, { showCountBadge: true })}
      </div>
    )
  }

  const prevPreview = () => setPreviewIndex((i) => (i - 1 + previewCount) % previewCount)
  const nextPreview = () => setPreviewIndex((i) => (i + 1) % previewCount)

  const agentName = agent
    ? [agent.firstName, agent.lastName].filter(Boolean).join(' ').trim()
    : ''

  const agentEmail = agent?.email?.trim() || ''
  const agentPhone = agent?.phone?.trim() || ''

  const handleAgentEmail = (e) => {
    e?.stopPropagation?.()
    const { subject, bodyLines } = buildCustomerToAgentEmail({
      agentName: agentName,
      propertyTitle: title,
      propertyLocation,
      customerName
    })
    const result = openGmailCompose({ to: agentEmail, subject, bodyLines })
    if (!result.ok) toast.error(result.error || 'Email is not available')
  }

  const handleAgentCall = (e) => {
    e?.stopPropagation?.()
    const result = openPhoneCall(agentPhone)
    if (!result.ok) toast.error(result.error || 'Phone number is not available')
  }

  const activeVideo = videoList[activeVideoIndex]

  return (
    <div className={className}>
      {renderMosaic()}

      {previewOpen && previewCount > 0 && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={previewMode === 'floorplans' ? 'Floor plan preview' : 'Photo preview'}
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>

          {previewMode === 'floorplans' && (
            <span className="absolute top-4 left-4 z-10 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white uppercase tracking-wide">
              Floor plan
            </span>
          )}

          <div className="relative max-h-[90vh] max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={resolveUrl(previewItems[previewIndex])}
              alt=""
              className="mx-auto max-h-[85vh] w-full object-contain"
            />
            {previewCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPreview}
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 sm:left-2"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  onClick={nextPreview}
                  className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 sm:right-2"
                  aria-label="Next"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                  {previewIndex + 1} / {previewCount}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Property media"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 pt-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('photos')
                  setGalleryGridOnly(hasMorePhotos)
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'photos'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Camera className="h-4 w-4" />
                Photos ({photoCount})
              </button>

              {floorCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('floorplans')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'floorplans'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Floor plans ({floorCount})
                </button>
              )}

              {hasVideo && (
                <button
                  type="button"
                  onClick={() => setActiveTab('video')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'video'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Play className="h-4 w-4" />
                  {videoCount > 1 ? `Videos (${videoCount})` : 'Video'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="ml-auto rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-[280px] max-h-[60vh]">
              {activeTab === 'photos' && (
                <>
                  {photoCount === 0 ? (
                    <p className="text-center text-gray-500 py-12">No photos available</p>
                  ) : galleryGridOnly || photoCount > 1 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setModalOpen(false)
                            openPhotoPreview(idx)
                          }}
                          className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 hover:opacity-95"
                        >
                          <img src={resolveUrl(img)} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <img
                      src={resolveUrl(photos[0])}
                      alt=""
                      className="w-full max-h-[50vh] object-contain rounded-lg mx-auto"
                    />
                  )}
                </>
              )}

              {activeTab === 'floorplans' && floorCount > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {floorPlans.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setModalOpen(false)
                        openFloorPlanPreview(idx)
                      }}
                      className="relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:opacity-95"
                    >
                      <img src={resolveUrl(img)} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'video' && hasVideo && activeVideo && (
                <div className="space-y-4">
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                    <iframe
                      title={`Property video ${activeVideoIndex + 1}`}
                      src={activeVideo.embedUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  {videoCount > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {videoList.map((v, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveVideoIndex(idx)}
                          className={`rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                            idx === activeVideoIndex
                              ? 'border-primary-600 bg-primary-50 text-primary-800'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Video {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {agent && (agentEmail || agentPhone) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 bg-gray-50">
                <p className="text-sm text-gray-700">
                  Listing by <span className="font-semibold text-gray-900">{agentName || 'Agent'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {agentEmail && (
                    <button
                      type="button"
                      onClick={handleAgentEmail}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </button>
                  )}
                  {agentPhone && (
                    <button
                      type="button"
                      onClick={handleAgentCall}
                      className="inline-flex md:hidden items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
