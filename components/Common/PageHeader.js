'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ 
  title, 
  subtitle, 
  backUrl, 
  actions = [],
  showBackButton = true 
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && backUrl && (
            <Link 
              href={backUrl} 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        {actions.length > 0 && (
          <div className="flex items-center gap-3">
            {actions.map((action, index) => (
              <div key={index}>{action}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

