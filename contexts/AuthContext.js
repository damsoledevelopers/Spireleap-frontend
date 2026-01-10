'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { api } from '../lib/api'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('token')
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      const userData = response.data.user
      setUser(userData)
      
      // Log user data for debugging
      console.log('User data fetched:', {
        email: userData.email,
        role: userData.role,
        agency: userData.agency ? 'Has agency' : 'No agency'
      })
    } catch (error) {
      console.error('Failed to fetch user:', error)
      Cookies.remove('token')
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
      
      // Set cookie with proper attributes for cross-origin support
      Cookies.set('token', token, { 
        expires: 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', // Only secure in production (HTTPS)
        path: '/' // Ensure cookie is accessible from all paths
      })
      
      // Fetch fresh user data from /auth/me to ensure we have latest data including agency
      try {
        const meResponse = await api.get('/auth/me')
        setUser(meResponse.data.user)
        console.log('User data after login:', {
          email: meResponse.data.user.email,
          role: meResponse.data.user.role,
          agency: meResponse.data.user.agency ? 'Has agency' : 'No agency'
        })
      } catch (meError) {
        // Fallback to login response data if /auth/me fails
        console.warn('Failed to fetch user from /auth/me, using login response data:', meError)
        setUser(userData)
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
      
      // Use window.location for reliable navigation
      if (typeof window !== 'undefined') {
        window.location.href = redirectPath
      } else {
        router.push(redirectPath)
      }
      
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
      
      // Set cookie with proper attributes for cross-origin support
      Cookies.set('token', token, { 
        expires: 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', // Only secure in production (HTTPS)
        path: '/' // Ensure cookie is accessible from all paths
      })
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
      
      // Use window.location for reliable navigation
      if (typeof window !== 'undefined') {
        window.location.href = redirectPath
      } else {
        router.push(redirectPath)
      }
      
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
    Cookies.remove('token')
    setUser(null)
    router.push('/auth/login')
  }

  const updateUser = (userData) => {
    setUser(prev => prev ? { ...prev, ...userData } : null)
  }

  const refreshUser = async () => {
    const token = Cookies.get('token')
    if (token) {
      await fetchUser()
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
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
