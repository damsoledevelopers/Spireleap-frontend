'use client'

import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import ContactMessagesManagement from '../../../components/CMS/ContactMessagesManagement'

export default function ContactMessagesPage() {
  const { user } = useAuth()

  if (!user || (user.role !== 'super_admin' && user.role !== 'agency_admin')) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">You don't have permission to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

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


