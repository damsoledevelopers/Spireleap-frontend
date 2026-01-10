import axios from 'axios'
import Cookies from 'js-cookie'

// Ensure API_URL always ends with /api
let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
if (!API_URL.endsWith('/api')) {
  // Remove trailing slash if present, then add /api
  API_URL = API_URL.replace(/\/$/, '') + '/api'
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Ensure cookies are sent with cross-origin requests
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      const logData = {
        method: config.method?.toUpperCase() || 'GET',
        url: config.url || 'unknown',
        hasToken: !!token,
        tokenLength: token?.length || 0
      }
      
      // Add request data if it exists (for POST, PUT, PATCH)
      if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
        // For FormData, just log that it exists
        if (config.data instanceof FormData) {
          logData.dataType = 'FormData'
          logData.dataSize = 'N/A (FormData)'
        } else {
          logData.data = config.data
          logData.dataKeys = Object.keys(config.data || {})
        }
      }
      
      console.log('API Request:', logData)
      
      // Log payload for property creation
      if (config.url === '/properties' && config.method === 'post' && config.data) {
        console.log('=== API Interceptor - Property Creation Payload ===')
        console.log('Payload keys:', Object.keys(config.data))
        console.log('Payload agency:', config.data.agency, 'Type:', typeof config.data.agency)
        console.log('Payload agent:', config.data.agent, 'Type:', typeof config.data.agent)
        console.log('Full payload:', JSON.stringify(config.data, null, 2))
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      // Log warning if no token for protected routes
      if (process.env.NODE_ENV === 'development' && !config.url?.includes('/auth/')) {
        console.warn('No token found for request:', config.url)
      }
    }
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const token = Cookies.get('token')
      const errorMessage = error.response?.data?.message || ''
      
      // Only logout and redirect for actual authentication failures
      // Don't logout for validation errors or other 401s that might be recoverable
      const isAuthError = errorMessage.includes('token') || 
                         errorMessage.includes('authorization') || 
                         errorMessage.includes('authentication') ||
                         errorMessage.includes('Token is not valid') ||
                         errorMessage.includes('No token')
      
      // Only redirect if we have a token and it's an actual auth error
      // Don't redirect for login attempts (no token yet)
      if (token && isAuthError && !error.config?.url?.includes('/auth/login')) {
        // Token expired or invalid - clear it and redirect to login
        Cookies.remove('token')
        // Only redirect if we're not already on the login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
