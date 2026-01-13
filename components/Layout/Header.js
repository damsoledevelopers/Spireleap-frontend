'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../../contexts/AuthContext'
import { Menu, X, User, ChevronDown, Search, Heart } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [buyDropdownOpen, setBuyDropdownOpen] = useState(false)
  const [rentDropdownOpen, setRentDropdownOpen] = useState(false)
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false)
  const pathname = usePathname()
  const buyRef = useRef(null)
  const rentRef = useRef(null)
  const servicesRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (buyRef.current && !buyRef.current.contains(event.target)) {
        setBuyDropdownOpen(false)
      }
      if (rentRef.current && !rentRef.current.contains(event.target)) {
        setRentDropdownOpen(false)
      }
      if (servicesRef.current && !servicesRef.current.contains(event.target)) {
        setServicesDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Hide header for logged-in admin/agent/staff users on public pages
  // They should use DashboardLayout instead
  if (user && ['super_admin', 'agency_admin', 'agent', 'staff'].includes(user.role)) {
    return null
  }

  const buyMenuItems = [
    { href: '/properties?listingType=sale&propertyType=apartment', label: 'Apartments' },
    { href: '/properties?listingType=sale&propertyType=villa', label: 'Villas' },
    { href: '/properties?listingType=sale&propertyType=house', label: 'Houses' },
    { href: '/properties?listingType=sale&propertyType=townhouse', label: 'Townhouses' },
    { href: '/properties?listingType=sale&propertyType=commercial', label: 'Commercial' },
  ]

  const rentMenuItems = [
    { href: '/properties?listingType=rent&propertyType=apartment', label: 'Apartments' },
    { href: '/properties?listingType=rent&propertyType=villa', label: 'Villas' },
    { href: '/properties?listingType=rent&propertyType=house', label: 'Houses' },
    { href: '/properties?listingType=rent&propertyType=townhouse', label: 'Townhouses' },
    { href: '/properties?listingType=rent&propertyType=commercial', label: 'Commercial' },
  ]

  const servicesMenuItems = [
    { href: '/services', label: 'Property Management' },
    { href: '/services', label: 'Property Valuation' },
    { href: '/services', label: 'Investment Consulting' },
    { href: '/services', label: 'Legal Services' },
  ]

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Navigation */}
        <div className="flex items-center justify-between h-20">
          <Link href="/home" className="flex items-center space-x-3 group">
            <div className="h-12 w-12 flex items-center justify-center transition-transform group-hover:scale-110">
              <Image 
                src="/NovaKeys.png" 
                alt="NOVA KEYS Real Estate" 
                width={48} 
                height={48} 
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                NOVA KEYS
              </span>
              <p className="text-xs text-gray-500 -mt-1">Real Estate</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <Link 
              href="/home" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/home' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              Home
            </Link>

            {/* Buy Dropdown */}
            <div className="relative" ref={buyRef}>
              <button
                onClick={() => {
                  setBuyDropdownOpen(!buyDropdownOpen)
                  setRentDropdownOpen(false)
                  setServicesDropdownOpen(false)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  buyDropdownOpen
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                Buy
                <ChevronDown className={`h-4 w-4 transition-transform ${buyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {buyDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50">
                  {buyMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                      onClick={() => setBuyDropdownOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Rent Dropdown */}
            <div className="relative" ref={rentRef}>
              <button
                onClick={() => {
                  setRentDropdownOpen(!rentDropdownOpen)
                  setBuyDropdownOpen(false)
                  setServicesDropdownOpen(false)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  rentDropdownOpen
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                Rent
                <ChevronDown className={`h-4 w-4 transition-transform ${rentDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {rentDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50">
                  {rentMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                      onClick={() => setRentDropdownOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link 
              href="/properties" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/properties' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              Properties
            </Link>

            {/* Services Dropdown */}
            <div className="relative" ref={servicesRef}>
              <button
                onClick={() => {
                  setServicesDropdownOpen(!servicesDropdownOpen)
                  setBuyDropdownOpen(false)
                  setRentDropdownOpen(false)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  servicesDropdownOpen
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                Services
                <ChevronDown className={`h-4 w-4 transition-transform ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {servicesDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50">
                  {servicesMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                      onClick={() => setServicesDropdownOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link 
              href="/about" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/about' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              About
            </Link>
            <Link 
              href="/blog" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/blog' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              Blog
            </Link>
            <Link 
              href="/contact" 
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                pathname === '/contact' 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              Contact
            </Link>
            
            {/* Login and Register Buttons */}
            {!user && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-all"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-5 py-2 rounded-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Register
                </Link>
              </div>
            )}
            
            {user && (
              <Link
                href={
                  user.role === 'super_admin' ? '/admin/dashboard' :
                  user.role === 'agency_admin' ? '/agency/dashboard' :
                  user.role === 'agent' ? '/agent/dashboard' :
                  user.role === 'staff' ? '/staff/dashboard' :
                  '/properties'
                }
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-all ml-4"
              >
                <User className="h-5 w-5" />
                <span className="font-medium">{user.firstName}</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-all"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-6 border-t border-gray-100">
            <div className="flex flex-col space-y-1 pt-4">
              <Link 
                href="/home" 
                className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/properties?listingType=sale" 
                className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Buy Properties
              </Link>
              <Link 
                href="/properties?listingType=rent" 
                className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Rent Properties
              </Link>
              <Link 
                href="/properties" 
                className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                All Properties
              </Link>
              <Link 
                href="/services" 
                className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Services
              </Link>
              <Link 
                href="/about" 
                className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                href="/blog" 
                className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link 
                href="/contact" 
                className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              {user ? (
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    href="/auth/login" 
                    className="px-4 py-3 text-primary-600 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="mx-4 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg font-medium text-center shadow-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
