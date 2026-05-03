'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
        <p className="text-sm font-semibold text-primary-600">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-3 text-gray-600 text-sm">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
          >
            Go home
          </Link>
          <Link
            href="/properties"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Browse properties
          </Link>
        </div>
      </div>
    </div>
  )
}

