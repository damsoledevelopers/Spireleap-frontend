'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../Common/NotificationBell'

// Maps the current route to a page title (and optional subtitle) shown in the navbar.
// Dynamic id segments are matched with [^/]+ so URLs like /admin/users/123/edit resolve
// to "Edit User" rather than the role-based dashboard fallback.
const ROUTE_TITLES = [
  [/^\/agencies\/add\/?$/, { title: 'Add Agency', subtitle: 'Create a new real estate agency' }],
  [/^\/agencies\/[^/]+\/edit\/?$/, { title: 'Edit Agency' }],
  [/^\/agencies\/?$/, { title: 'Agencies', subtitle: 'Manage all real estate agencies' }],

  [/^\/agents\/add\/?$/, { title: 'Add Agent', subtitle: 'Create a new agent' }],
  [/^\/agents\/[^/]+\/edit\/?$/, { title: 'Edit Agent' }],
  [/^\/agents\/?$/, { title: 'Agents', subtitle: 'Manage all real estate agents' }],

  [/^\/staff\/add\/?$/, { title: 'Add Staff', subtitle: 'Create a new staff member' }],
  [/^\/staff\/[^/]+\/edit\/?$/, { title: 'Edit Staff' }],
  [/^\/staff\/?$/, { title: 'Staff', subtitle: 'Manage all staff members' }],

  [/^\/users\/[^/]+\/edit\/?$/, { title: 'Edit User' }],
  [/^\/users\/[^/]+\/?$/, { title: 'User Details' }],
  [/^\/users\/?$/, { title: 'Users', subtitle: 'Manage all regular users' }],

  [/^\/properties\/add\/?$/, { title: 'Add Property', subtitle: 'List a new property' }],
  [/^\/properties\/pending\/?$/, { title: 'Pending Properties', subtitle: 'Review and approve submissions' }],
  [/^\/properties\/[^/]+\/edit\/?$/, { title: 'Edit Property' }],
  [/^\/properties\/[^/]+\/?$/, { title: 'Property Details' }],
  [/^\/properties\/?$/, { title: 'Properties', subtitle: 'Manage all properties' }],

  [/^\/leads\/new\/?$/, { title: 'New Lead', subtitle: 'Create a new lead' }],
  [/^\/leads\/[^/]+\/edit\/?$/, { title: 'Edit Lead' }],
  [/^\/leads\/[^/]+\/?$/, { title: 'Lead Details' }],
  [/^\/leads\/?$/, { title: 'Leads', subtitle: 'Manage all leads' }],

  [/^\/reports\/revenue\/?$/, { title: 'Revenue Report' }],
  [/^\/reports\/?$/, { title: 'Reports', subtitle: 'Analytics and insights' }],

  [/^\/billing\/subscriptions\/?$/, { title: 'Subscriptions', subtitle: 'Manage active subscriptions' }],
  [/^\/billing\/plans\/?$/, { title: 'Plans', subtitle: 'Manage subscription plans' }],

  [/^\/transactions\/?$/, { title: 'Transactions' }],
  [/^\/inquiries\/?$/, { title: 'Inquiries', subtitle: 'Customer inquiries' }],
  [/^\/contact-messages\/?$/, { title: 'Contact Messages' }],
  [/^\/activities\/?$/, { title: 'Activities' }],
  [/^\/permissions\/?$/, { title: 'Permissions', subtitle: 'Manage role permissions' }],
  [/^\/cms\/?$/, { title: 'CMS', subtitle: 'Content management' }],
  [/^\/settings\/?$/, { title: 'Settings' }],
  [/^\/profile\/?$/, { title: 'Profile' }],
]

function getRoleDashboardTitle(role) {
  switch (role) {
    case 'super_admin': return 'Super Admin Dashboard'
    case 'agency_admin': return 'Agency Admin Dashboard'
    case 'agent': return 'Agent Dashboard'
    case 'staff': return 'Staff Dashboard'
    case 'user': return 'Customer Portal'
    default: return 'Dashboard'
  }
}

function resolvePageMeta(pathname, role) {
  if (!pathname) return { title: getRoleDashboardTitle(role) }
  const stripped = pathname.replace(/^\/(admin|agency|agent|staff|customer)/, '') || '/'
  if (stripped === '/' || /^\/dashboard\/?$/.test(stripped)) {
    return { title: getRoleDashboardTitle(role) }
  }
  for (const [pattern, meta] of ROUTE_TITLES) {
    if (pattern.test(stripped)) return meta
  }
  return { title: getRoleDashboardTitle(role) }
}

export default function DashboardHeader({ onMenuClick }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const { title, subtitle } = resolvePageMeta(pathname, user?.role)

  return (
    <header className="bg-logo-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center min-w-0">
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-logo-beige focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 lg:ml-0 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 truncate hidden sm:block">{subtitle}</p>
            )}
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

