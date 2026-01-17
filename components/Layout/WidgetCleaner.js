'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function WidgetCleaner() {
    const pathname = usePathname()

    useEffect(() => {
        // Only cleanup if we are NOT on the home page
        if (pathname !== '/') {
            // Aggressive Cleanup of Body artifacts (Widgets usually append here)
            const safelistedIds = ['app-content-wrapper', '__next']
            const safelistedTags = ['SCRIPT', 'LINK', 'STYLE', 'META', 'HEAD']

            const children = Array.from(document.body.children)

            children.forEach(child => {
                // Skip safelisted elements
                if (safelistedIds.includes(child.id)) return
                if (safelistedTags.includes(child.tagName)) return

                // Remove everything else (Divs, Iframes, Anchors, etc.)
                try {
                    if (child.parentNode === document.body) {
                        document.body.removeChild(child)
                    }
                } catch (e) {
                    console.error('WidgetCleaner error:', e)
                }
            })
        }
    }, [pathname])

    return null
}
