'use client'

import { Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../Common/NotificationBell'

export default function DashboardHeader({ onMenuClick }) {
  const { user } = useAuth()

  return (
    <header className="bg-logo-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-logo-beige focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 lg:ml-0">
            <h1 className="text-xl font-semibold text-gray-900">
              {user?.role === 'super_admin' ? 'Super Admin Dashboard' :
                user?.role === 'agency_admin' ? 'Agency Admin Dashboard' :
                  user?.role === 'agent' ? 'Agent Dashboard' :
                    user?.role === 'staff' ? 'Staff Dashboard' :
                      user?.role === 'user' ? 'Customer Portal' :
                        'Dashboard'}
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <div className="flex items-center space-x-2">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={`${user?.firstName} ${user?.lastName}`}
                className="h-8 w-8 rounded-full object-cover border-2 border-primary-200"
              />
            ) : (
              <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

