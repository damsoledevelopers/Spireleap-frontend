import axios from 'axios'
import { getToken, removeToken, setTokenPreserveStorage } from './tokenStorage'

const DEV_API_FALLBACK = 'http://localhost:5000/api'
const PROD_API_FALLBACK = 'https://spireleap-backend.onrender.com/api'

const isLocalNetworkUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return false
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/i.test(raw)
}

const resolveApiSeed = () => {
  const envUrl = String(process.env.NEXT_PUBLIC_API_URL || '').trim()
  const defaultUrl = process.env.NODE_ENV === 'development' ? DEV_API_FALLBACK : PROD_API_FALLBACK
  if (!envUrl) return defaultUrl
  if (process.env.NODE_ENV !== 'development' && isLocalNetworkUrl(envUrl)) {
    console.warn('[api] Ignoring local/private NEXT_PUBLIC_API_URL in production; using public API URL instead.')
    return PROD_API_FALLBACK
  }
  return envUrl
}

// Single canonical base: `http://host:port/api` (no trailing slash, no `/api/api`)
const normalizeApiUrl = (url) => {
  const fallback = process.env.NODE_ENV === 'development' ? DEV_API_FALLBACK : PROD_API_FALLBACK
  if (!url) return fallback
  let u = String(url).trim().replace(/\/+$/, '')
  while (u.includes('/api/api')) {
    u = u.replace(/\/api\/api/g, '/api')
  }
  if (/\/api$/i.test(u)) return u
  return `${u}/api`
}

// Prefer explicit env var (see `.env.example`).
let API_URL = normalizeApiUrl(resolveApiSeed())

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // If you see 404s on every call, confirm this matches your running backend (GET {baseURL}/health → 200).
  console.info('[api] baseURL:', API_URL)
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
    const requestUrl = originalRequest?.url || ''
    const isPublicAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/resend-login-otp') ||
      requestUrl.includes('/auth/verify-login-otp') ||
      requestUrl.includes('/auth/verify-reset-otp')

    // For login/OTP/public auth flows, let page-level handlers show errors (no forced redirect).
    if (error.response?.status === 401 && isPublicAuthEndpoint) {
      return Promise.reject(error)
    }

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

      const currentToken = getToken()
      if (!currentToken) {
        processQueue(error, null)
        isRefreshing = false
        removeToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
        return Promise.reject(error)
      }

      try {
        // Attempt to refresh the token (send current token in header; backend accepts expired)
        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {},
          {
            withCredentials: true,
            headers: { Authorization: `Bearer ${currentToken}` }
          }
        )

        if (response.data.token) {
          const newToken = response.data.token
          // Store new token in localStorage
          setTokenPreserveStorage(newToken)
          
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
        
        if (typeof window !== 'undefined') {
          window.location.href = '/'
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
        
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
