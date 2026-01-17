'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import toast from 'react-hot-toast'
import ContactMessagesManagement from '../../../components/CMS/ContactMessagesManagement'

export function ContactMessagesPageContent() {
  const { user, checkPermission } = useAuth()
  const router = useRouter()

  // Dynamic Permission Flags
  const canViewMessages = checkPermission('contact_messages', 'view')

  // Page access check
  useEffect(() => {
    if (user && !canViewMessages) {
      toast.error('You do not have permission to access contact messages')
      router.push('/admin/dashboard')
    }
  }, [user, canViewMessages, router])

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
          <p className="text-gray-600 mt-2">View and manage all contact form submissions from your website</p>
        </div>
        <ContactMessagesManagement />
      </div>
    </DashboardLayout>
  )
}

export default function ContactMessagesPage() {
  return <ContactMessagesPageContent />
}


