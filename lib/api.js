import axios from 'axios'

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

// Helper to get token from localStorage (persists across browser sessions)
const getToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

// Helper to set token in localStorage
const setToken = (token) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('token', token)
}

// Helper to remove token from localStorage
const removeToken = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken()

    // Add cache buster to GET requests to prevent stale data
    if (config.method === 'get') {
      config.params = config.params || {};
      config.params._t = Date.now();
    }

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

// Response interceptor to handle auth errors and token refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to refresh the token
        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        )

        if (response.data.token) {
          const newToken = response.data.token
          // Store new token in localStorage
          setToken(newToken)
          
          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          
          // Retry the original request
          processQueue(null, newToken)
          isRefreshing = false
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Token refresh failed - clear token and redirect to login
        processQueue(refreshError, null)
        isRefreshing = false
        removeToken()
        
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login?session=expired'
        }
        return Promise.reject(refreshError)
      }
    }

    // Handle other auth errors
    if (error.response?.status === 401) {
      const token = getToken()
      const errorMessage = error.response?.data?.message || ''

      // Only logout and redirect for actual authentication failures
      const isAuthError = errorMessage.includes('token') ||
        errorMessage.includes('authorization') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('Token is not valid') ||
        errorMessage.includes('No token')

      // Only redirect if we have a token and it's an actual auth error
      if (token && isAuthError && !error.config?.url?.includes('/auth/login')) {
        // Token expired or invalid - clear it and redirect to login
        removeToken()
        
        // Only redirect if we're not already on the login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login?error=unauthorized'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
