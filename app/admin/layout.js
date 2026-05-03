'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return null
  }

  return children
}

