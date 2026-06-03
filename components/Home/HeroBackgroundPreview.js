'use client'

import { HERO_IMAGE_GRADIENT_OVERLAY } from '../../lib/heroBackground'

/**
 * Mirrors how the homepage hero displays a background image (overlay + sample content).
 */
export default function HeroBackgroundPreview({
  imageUrl,
  heroTitle = 'Find Your Dream',
  heroSubtitle = '',
  heroDescription = 'Discover premium homes, luxury apartments, and prime commercial properties.',
  titleColor = '',
  subtitleColor = '#ffffff',
  descriptionColor = '#f3f4f6',
  textAlign = 'center',
  showSearchMock = true,
  label,
  frameClassName = ''
}) {
  if (!imageUrl) return null

  const alignClass =
    textAlign === 'left' ? 'text-left items-start' : textAlign === 'right' ? 'text-right items-end' : 'text-center items-center'

  return (
    <div className={frameClassName}>
      {label ? (
        <p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>
      ) : null}
      <div
        className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-[#0a213e] shadow-inner"
        style={{ aspectRatio: '16 / 9' }}
      >
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: HERO_IMAGE_GRADIENT_OVERLAY }}
          aria-hidden
        />
        <div className={`relative z-10 flex h-full flex-col justify-center px-4 py-6 sm:px-8 sm:py-8 ${alignClass}`}>
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 mb-2 backdrop-blur-md">
            <span className="text-[10px] font-semibold tracking-wide text-white/95 sm:text-xs">
              Find properties across the UAE
            </span>
          </div>
          <h3
            className="text-lg font-extrabold leading-snug text-white sm:text-2xl"
            style={{ textAlign, color: titleColor || undefined }}
          >
            <span
              className={titleColor ? '' : 'bg-gradient-to-r from-gold-400 via-gold-300 to-gold-200 bg-clip-text text-transparent'}
              style={titleColor ? { color: titleColor } : undefined}
            >
              {heroTitle || 'Find Your Dream'}
            </span>
            {heroSubtitle ? (
              <>
                <br />
                <span className="text-base font-bold sm:text-xl" style={{ color: subtitleColor }}>
                  {heroSubtitle}
                </span>
              </>
            ) : null}
          </h3>
          <p
            className="mt-1 max-w-md text-[10px] leading-snug text-gray-100/90 sm:text-xs"
            style={{ color: descriptionColor, textAlign }}
          >
            {heroDescription}
          </p>
          {showSearchMock ? (
            <div
              className="mt-3 w-full max-w-lg rounded-xl border border-white/20 bg-white/95 p-2 shadow-lg sm:mt-4 sm:p-3"
              style={{ marginLeft: textAlign === 'center' ? 'auto' : undefined, marginRight: textAlign === 'center' ? 'auto' : undefined }}
            >
              <div className="flex gap-2">
                <div className="h-7 w-14 rounded-md bg-primary-700/90" />
                <div className="h-7 flex-1 rounded-md bg-gray-100" />
                <div className="h-7 w-16 rounded-md bg-primary-700/90" />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-5 rounded bg-gray-100" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Narrow frame approximating mobile hero crop (same image, taller viewport). */
export function HeroBackgroundMobilePreview({ imageUrl, label }) {
  if (!imageUrl) return null

  return (
    <div className="mx-auto w-full max-w-[200px]">
      {label ? (
        <p className="text-xs font-medium text-gray-600 mb-1.5 text-center">{label}</p>
      ) : null}
      <div
        className="relative overflow-hidden rounded-xl border border-gray-200 bg-[#0a213e] shadow-inner"
        style={{ aspectRatio: '9 / 16' }}
      >
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: HERO_IMAGE_GRADIENT_OVERLAY }}
          aria-hidden
        />
        <div className="relative z-10 flex h-full flex-col justify-end px-3 pb-4 pt-8">
          <div className="h-2 w-20 rounded bg-white/20 mb-2" />
          <div className="h-3 w-full max-w-[140px] rounded bg-white/30 mb-1" />
          <div className="h-2 w-[75%] rounded bg-white/15 mb-3" />
          <div className="rounded-lg bg-white/90 p-2">
            <div className="h-4 rounded bg-gray-200" />
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <div className="h-3 rounded bg-gray-100" />
              <div className="h-3 rounded bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
