'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect based on user role
        switch (user.role) {
          case 'super_admin':
            router.push('/admin/dashboard')
            break
          case 'agency_admin':
            router.push('/agency/dashboard')
            break
          case 'agent':
            router.push('/agent/dashboard')
            break
          case 'staff':
            router.push('/staff/dashboard')
            break
          case 'user':
            router.push('/customer/dashboard')
            break
          default:
            router.push('/home')
        }
      } else {
        router.push('/home')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return null
}
