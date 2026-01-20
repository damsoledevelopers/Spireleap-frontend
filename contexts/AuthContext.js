'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../lib/api'

const AuthContext = createContext(undefined)

// Helper functions for session storage (browser-specific, not shared)
const getSessionToken = () => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('token')
}

const setSessionToken = (token) => {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('token', token)
}

const removeSessionToken = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('token')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [permissionsLoaded, setPermissionsLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = getSessionToken()
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchPermissions = async (role) => {
    try {
      // Super Admin bypass for permissions check on frontend (full access)
      if (role === 'super_admin') {
        const fullPerms = {
          leads: { view: true, create: true, edit: true, delete: true },
          properties: { view: true, create: true, edit: true, delete: true },
          inquiries: { view: true, create: true, edit: true, delete: true },
          contact_messages: { view: true, create: true, edit: true, delete: true }
        }
        setPermissions(fullPerms)
        setPermissionsLoaded(true)
        return
      }

      const response = await api.get(`/permissions/${role}`)
      setPermissions(response.data.permissions || {})
      setPermissionsLoaded(true)
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      setPermissions({})
      setPermissionsLoaded(true)
    }
  }

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      const userData = response.data.user
      setUser(userData)

      if (userData.role) {
        await fetchPermissions(userData.role)
      }

      // Log user data for debugging
      console.log('User data fetched:', {
        email: userData.email,
        role: userData.role,
        agency: userData.agency ? 'Has agency' : 'No agency'
      })
    } catch (error) {
      setPermissionsLoaded(true)
      console.error('Failed to fetch user:', error)
      removeSessionToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user: userData } = response.data

      if (!userData || !userData.role) {
        console.error('Login response missing user data or role:', response.data)
        throw new Error('Invalid login response')
      }

      // Store token in sessionStorage (browser-specific, not shared across browsers)
      setSessionToken(token)

      // Fetch fresh user data from /auth/me to ensure we have latest data including agency
      try {
        const meResponse = await api.get('/auth/me')
        setUser(meResponse.data.user)
        
        // Fetch permissions after setting user
        if (meResponse.data.user.role) {
          await fetchPermissions(meResponse.data.user.role)
        }
        
        console.log('User data after login:', {
          email: meResponse.data.user.email,
          role: meResponse.data.user.role,
          agency: meResponse.data.user.agency ? 'Has agency' : 'No agency'
        })
      } catch (meError) {
        // Fallback to login response data if /auth/me fails
        console.warn('Failed to fetch user from /auth/me, using login response data:', meError)
        setUser(userData)
        
        // Still fetch permissions from userData
        if (userData.role) {
          await fetchPermissions(userData.role)
        }
      }

      // Determine redirect path based on role
      let redirectPath = '/home'
      switch (userData.role) {
        case 'super_admin':
          redirectPath = '/admin/dashboard'
          break
        case 'agency_admin':
          redirectPath = '/agency/dashboard'
          break
        case 'agent':
          redirectPath = '/agent/dashboard'
          break
        case 'staff':
          redirectPath = '/staff/dashboard'
          break
        case 'user':
          redirectPath = '/home'
          break
        default:
          console.warn('Unknown role:', userData.role)
          redirectPath = '/home'
      }

      console.log('Login successful, redirecting to:', redirectPath, 'for role:', userData.role)

      // Use router for smooth client-side navigation
      router.push(redirectPath)

      return userData
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'
      throw new Error(errorMessage)
    }
  }

  const register = async (userData) => {
    try {
      // Clean up userData - remove fields not needed by backend
      const cleanedData = { ...userData }
      // Remove confirmPassword as it's only for frontend validation
      delete cleanedData.confirmPassword
      // Remove empty agency field if not needed
      if (!cleanedData.agency || (typeof cleanedData.agency === 'string' && cleanedData.agency.trim() === '')) {
        delete cleanedData.agency
      }

      const response = await api.post('/auth/register', cleanedData)
      const { token, user: newUser, message } = response.data

      // Store token in sessionStorage (browser-specific, not shared across browsers)
      setSessionToken(token)
      setUser(newUser)

      // Determine redirect path
      let redirectPath = '/home'

      // If user is not active (pending approval), redirect to home
      if (!newUser.isActive) {
        redirectPath = '/home'
      } else {
        // Redirect based on role
        switch (newUser.role) {
          case 'super_admin':
            redirectPath = '/admin/dashboard'
            break
          case 'agency_admin':
            redirectPath = '/agency/dashboard'
            break
          case 'agent':
            redirectPath = '/agent/dashboard'
            break
          case 'staff':
            redirectPath = '/staff/dashboard'
            break
          case 'user':
            redirectPath = '/home'
            break
          default:
            redirectPath = '/home'
        }
      }

      // Use router for smooth client-side navigation
      router.push(redirectPath)

      return message || 'Registration successful!'
    } catch (error) {
      // Handle validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.msg || err.message).join(', ')
        throw new Error(errorMessages || 'Validation failed')
      }
      // Handle single error message
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed'
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    removeSessionToken()
    setUser(null)
    router.push('/auth/login')
  }

  const updateUser = (userData) => {
    setUser(prev => prev ? { ...prev, ...userData } : null)
  }

  const refreshUser = async () => {
    const token = getSessionToken()
    if (token) {
      await fetchUser()
    }
  }

  // Helper to check permissions easily
  const checkPermission = (moduleName, action) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;

    const modulePerms = permissions[moduleName];
    return !!(modulePerms && modulePerms[action]);
  }

  return (
    <AuthContext.Provider value={{ user, permissions, loading, permissionsLoaded, login, register, logout, updateUser, refreshUser, checkPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
