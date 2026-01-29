'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Building,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
  UserCircle,
  Briefcase,
  Shield
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  {
    name: 'Users',
    href: '/admin/users',
    icon: UserCheck,
    module: 'users',
    submenu: [
      { name: 'Agencies', href: '/admin/users?tab=agencies', icon: Building, module: 'agencies' },
      { name: 'Agents', href: '/admin/users?tab=agents', icon: UserCircle, module: 'agents' },
      { name: 'Staff', href: '/admin/users?tab=staff', icon: Briefcase, module: 'staff' },
      { name: 'Users', href: '/admin/users?tab=users', icon: UserCheck, module: 'users' },
    ]
  },
  { name: 'Properties', href: '/admin/properties', icon: Package, module: 'properties' },
  { name: 'Leads', href: '/admin/leads', icon: Users, module: 'leads' },
  { name: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare, module: 'inquiries' },
  { name: 'Contact Messages', href: '/admin/contact-messages', icon: Mail, module: 'contact_messages' },
  { name: 'Reports', href: '/admin/reports', icon: TrendingUp, module: 'analytics' },
  { name: 'Permissions', href: '/admin/permissions', icon: Shield, module: 'permissions' },
  { name: 'CMS', href: '/admin/cms', icon: FileText, module: 'cms' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, module: 'settings' },
  { name: 'Profile', href: '/admin/profile', icon: UserCircle }
]

export default function Sidebar({ isOpen = false, onClose, isCollapsed = false, onToggleCollapse }) {
  const { user, logout, checkPermission, permissionsLoaded } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [openDropdowns, setOpenDropdowns] = useState({})

  const userNavigation = navigation.reduce((acc, item) => {
    // Agent panel: hide entire Users menu
    if (user?.role === 'agent' && item.module === 'users') return acc

    // Check main permissions - only filter if permissions are loaded
    if (permissionsLoaded && item.module && !checkPermission(item.module, 'view')) return acc

    // Handle submenu filtering
    if (item.submenu) {
      let filteredSubmenu = item.submenu.filter(subItem => {
        if (!subItem.module) return true
        if (!permissionsLoaded) return true
        // Agents & Staff use 'users' permission (no separate module in backend)
        const moduleToCheck = (subItem.module === 'agents' || subItem.module === 'staff') ? 'users' : subItem.module
        return checkPermission(moduleToCheck, 'view')
      })
      // Agency admin: only Agents and Users (no Agencies, Staff)
      if (user?.role === 'agency_admin') {
        filteredSubmenu = filteredSubmenu.filter(subItem =>
          subItem.module === 'agents' || subItem.module === 'users'
        )
      }
      // Agent panel: hide Users section
      if (user?.role === 'agent') {
        filteredSubmenu = filteredSubmenu.filter(subItem => subItem.module !== 'users')
      }

      // If submenu has items or parent has no module restriction (implied access), include it
      if (filteredSubmenu.length > 0) {
        acc.push({ ...item, submenu: filteredSubmenu })
      } else if (!item.submenu.length) {
        // If original submenu was empty (unlikely)
        acc.push(item)
      } else if (user?.role === 'agent') {
        // Agent: hide Users section entirely when no submenu items left
      }
      // If all subitems filtered out, do we show parent? 
      // If parent has its own functioning HREF (like /admin/users), yes.
      // But if parent behavior depends on submenu (e.g. dropdown only), maybe not?
      // For now, if subitems exist after filter, show. If filtered to 0, check if parent is valid standalone.
      // 'Users' href is /admin/users. If they have permission 'users', they can go there.
      // So we push it even if submenu empty?
      // Let's push it with empty submenu if filteredSubmenu is empty but parent allowed.
      else {
        acc.push({ ...item, submenu: [] })
      }
    } else {
      acc.push(item)
    }
    return acc
  }, [])

  // Auto-open dropdown if submenu item is active and keep it open
  useEffect(() => {
    const tabParam = searchParams.get('tab')

    userNavigation.forEach((item) => {
      if (item.submenu) {
        const hasActiveSubmenu = item.submenu.some(subItem => {
          const subPath = subItem.href.split('?')[0]
          const subQuery = subItem.href.split('?')[1]

          // Check if current page matches any of the submenu pages
          // For agencies, agents, staff pages
          if (pathname === '/admin/agencies' || pathname === '/admin/agents' || pathname === '/admin/staff' || pathname === '/admin/users') {
            // Check if this submenu item matches the current page
            if (subQuery) {
              const params = new URLSearchParams(subQuery)
              const subTabParam = params.get('tab')
              if (subTabParam && tabParam) {
                return subTabParam === tabParam && pathname === subPath
              }
              // If no tab param but pathname matches one of the user pages
              if (pathname === '/admin/agencies' && subItem.href.includes('agencies')) return true
              if (pathname === '/admin/agents' && subItem.href.includes('agents')) return true
              if (pathname === '/admin/staff' && subItem.href.includes('staff')) return true
              if (pathname === '/admin/users' && subItem.href.includes('users') && !subItem.href.includes('agencies') && !subItem.href.includes('agents') && !subItem.href.includes('staff')) return true
            }
            // Direct pathname match
            if (pathname === '/admin/agencies' && subItem.href.includes('agencies')) return true
            if (pathname === '/admin/agents' && subItem.href.includes('agents')) return true
            if (pathname === '/admin/staff' && subItem.href.includes('staff')) return true
            if (pathname === '/admin/users' && subItem.href.includes('users') && !subItem.href.includes('agencies') && !subItem.href.includes('agents') && !subItem.href.includes('staff')) return true
          }
          return pathname === subPath || pathname.includes(subPath)
        })
        // Keep dropdown open if submenu item is active
        if (hasActiveSubmenu) {
          setOpenDropdowns(prev => ({ ...prev, [item.name]: true }))
        }
      }
    })
  }, [pathname, searchParams])

  const toggleDropdown = (itemName) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }))
  }

  // Check if any submenu item is active
  const isSubmenuActive = (item) => {
    if (!item.submenu) return false
    return item.submenu.some(subItem => {
      // Check if we're on any of the user-related pages
      if (pathname === '/admin/agencies' || pathname === '/admin/agents' || pathname === '/admin/staff' || pathname === '/admin/users') {
        // Match based on page path
        if (pathname === '/admin/agencies' && subItem.href.includes('agencies')) return true
        if (pathname === '/admin/agents' && subItem.href.includes('agents')) return true
        if (pathname === '/admin/staff' && subItem.href.includes('staff')) return true
        if (pathname === '/admin/users' && subItem.href.includes('users') && !subItem.href.includes('agencies') && !subItem.href.includes('agents') && !subItem.href.includes('staff')) return true
      }

      if (subItem.href.includes('?')) {
        const [path, query] = subItem.href.split('?')
        const params = new URLSearchParams(query)
        const tabParam = params.get('tab')
        if (tabParam) {
          const currentTabParam = searchParams.get('tab')
          return currentTabParam === tabParam && pathname === path
        }
        return pathname === path || pathname.includes(path)
      }
      return pathname === subItem.href
    })
  }

  // Check if parent menu should be highlighted
  const isParentActive = (item) => {
    if (item.submenu) {
      return isSubmenuActive(item)
    }
    return pathname === item.href
  }

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-logo-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={onClose}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="h-8 w-8 flex items-center justify-center">
                <Image
                  src="/NovaKeys.png"
                  alt="NOVA KEYS Real Estate"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">NOVA KEYS</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {userNavigation.map((item) => {
                const isActive = isParentActive(item)
                const isDropdownOpen = openDropdowns[item.name]

                if (item.submenu) {
                  return (
                    <div key={item.name}>
                      <button
                        onClick={() => toggleDropdown(item.name)}
                        className={`${isActive
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-logo-beige hover:text-gray-900'
                          } group w-full flex items-center justify-between px-2 py-2 text-base font-medium rounded-md`}
                      >
                        <div className="flex items-center">
                          <item.icon
                            className={`${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                              } mr-4 flex-shrink-0 h-6 w-6`}
                          />
                          {item.name}
                        </div>
                        {isDropdownOpen ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      {isDropdownOpen && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.submenu.map((subItem) => {
                            const subPath = subItem.href.split('?')[0]
                            const subQuery = subItem.href.split('?')[1]
                            let subIsActive = false
                            if (subQuery) {
                              const params = new URLSearchParams(subQuery)
                              const tabParam = params.get('tab')
                              if (tabParam) {
                                subIsActive = searchParams.get('tab') === tabParam && pathname === subPath
                              }
                            } else {
                              subIsActive = pathname === subPath || pathname.includes(subPath)
                            }
                            return (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Keep dropdown open, only close mobile sidebar if needed
                                  if (onClose) {
                                    onClose()
                                  }
                                }}
                                className={`${subIsActive
                                  ? 'bg-primary-100 text-primary-900'
                                  : 'text-gray-600 hover:bg-logo-beige hover:text-gray-900'
                                  } flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                              >
                                <subItem.icon
                                  className={`${subIsActive ? 'text-primary-500' : 'text-gray-400'
                                    } mr-3 flex-shrink-0 h-5 w-5`}
                                />
                                {subItem.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`${isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-logo-beige hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                  >
                    <item.icon
                      className={`${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-4 flex-shrink-0 h-6 w-6`}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={`${user?.firstName} ${user?.lastName}`}
                    className="h-8 w-8 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                  {user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="ml-3 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-logo-white relative">
            {/* Close/Expand Button */}
            <button
              onClick={onToggleCollapse}
              className="absolute -right-3 top-5 z-10 bg-white border-2 border-gray-200 rounded-full p-1.5 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-200"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              )}
            </button>

            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className={`flex items-center flex-shrink-0 px-4 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="h-8 w-8 flex items-center justify-center">
                  <Image
                    src="/NovaKeys.png"
                    alt="NOVA KEYS Real Estate"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                {!isCollapsed && (
                  <span className="ml-2 text-lg font-semibold text-gray-900">NOVA KEYS</span>
                )}
              </div>

              {!isCollapsed && (
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  {userNavigation.map((item) => {
                    const isActive = isParentActive(item)
                    const isDropdownOpen = openDropdowns[item.name]

                    if (item.submenu) {
                      return (
                        <div key={item.name}>
                          <button
                            onClick={() => toggleDropdown(item.name)}
                            className={`${isActive
                              ? 'bg-primary-100 text-primary-900'
                              : 'text-gray-600 hover:bg-logo-beige hover:text-gray-900'
                              } group w-full flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md`}
                          >
                            <div className="flex items-center">
                              <item.icon
                                className={`${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                                  } mr-3 flex-shrink-0 h-6 w-6`}
                              />
                              {item.name}
                            </div>
                            {isDropdownOpen ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          {isDropdownOpen && (
                            <div className="ml-8 mt-1 space-y-1">
                              {item.submenu.map((subItem) => {
                                const subPath = subItem.href.split('?')[0]
                                const subQuery = subItem.href.split('?')[1]
                                let subIsActive = false
                                if (subQuery) {
                                  const params = new URLSearchParams(subQuery)
                                  const tabParam = params.get('tab')
                                  if (tabParam) {
                                    subIsActive = searchParams.get('tab') === tabParam && pathname === subPath
                                  }
                                } else {
                                  subIsActive = pathname === subPath || pathname.includes(subPath)
                                }
                                return (
                                  <Link
                                    key={subItem.name}
                                    href={subItem.href}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // Keep dropdown open - don't close it
                                    }}
                                    className={`${subIsActive
                                      ? 'bg-primary-100 text-primary-900'
                                      : 'text-gray-600 hover:bg-logo-beige hover:text-gray-900'
                                      } flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                                  >
                                    <subItem.icon
                                      className={`${subIsActive ? 'text-primary-500' : 'text-gray-400'
                                        } mr-3 flex-shrink-0 h-5 w-5`}
                                    />
                                    {subItem.name}
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`${isActive
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-logo-beige hover:text-gray-900'
                          } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                      >
                        <item.icon
                          className={`${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                            } mr-3 flex-shrink-0 h-6 w-6`}
                        />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
              )}

              {/* Collapsed Navigation - Only Icons */}
              {isCollapsed && (
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  {userNavigation.map((item) => {
                    const isActive = isParentActive(item)
                    if (item.submenu) {
                      // For collapsed sidebar, show main icon and tooltip with submenu info
                      return (
                        <div key={item.name} className="relative group">
                          <Link
                            href={item.href}
                            title={item.name}
                            className={`${isActive
                              ? 'bg-primary-100 text-primary-900'
                              : 'text-gray-600 hover:bg-logo-beige hover:text-gray-900'
                              } flex items-center justify-center px-2 py-2 text-sm font-medium rounded-md`}
                          >
                            <item.icon
                              className={`${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                                } flex-shrink-0 h-6 w-6`}
                            />
                          </Link>
                          {/* Tooltip with submenu */}
                          <div className="absolute left-full ml-2 top-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px]">
                              {item.submenu.map((subItem) => (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                                >
                                  <subItem.icon className="mr-2 h-4 w-4" />
                                  {subItem.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        title={item.name}
                        className={`${isActive
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-logo-beige hover:text-gray-900'
                          } group flex items-center justify-center px-2 py-2 text-sm font-medium rounded-md`}
                      >
                        <item.icon
                          className={`${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                            } flex-shrink-0 h-6 w-6`}
                        />
                      </Link>
                    )
                  })}
                </nav>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <div className="flex items-center w-full">
                  <div className="flex-shrink-0">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={`${user?.firstName} ${user?.lastName}`}
                        className="h-8 w-8 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs font-medium text-gray-500">
                      {user?.role}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="ml-3 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Collapsed User Profile - Only Avatar */}
            {isCollapsed && (
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4 justify-center items-center flex-col gap-2">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={`${user?.firstName} ${user?.lastName}`}
                    className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                    title={`${user?.firstName} ${user?.lastName}`}
                  />
                ) : (
                  <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </span>
                  </div>
                )}
                <button
                  onClick={logout}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
