// Centralized token storage.
// Default: sessionStorage (clears when browser closes).
// Optional: localStorage when rememberMe is true.

const TOKEN_KEY = 'token'

const hasWindow = () => typeof window !== 'undefined'

export const getToken = () => {
  if (!hasWindow()) return null
  return window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY)
}

export const getTokenStorage = () => {
  if (!hasWindow()) return null
  if (window.sessionStorage.getItem(TOKEN_KEY)) return 'session'
  if (window.localStorage.getItem(TOKEN_KEY)) return 'local'
  return null
}

export const setToken = (token, { rememberMe = false } = {}) => {
  if (!hasWindow()) return
  // Ensure we don't keep stale tokens in the other storage.
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(TOKEN_KEY)

  if (rememberMe) {
    window.localStorage.setItem(TOKEN_KEY, token)
  } else {
    window.sessionStorage.setItem(TOKEN_KEY, token)
  }
}

// Refresh flows should keep the token in the same storage the user chose.
export const setTokenPreserveStorage = (token) => {
  if (!hasWindow()) return
  const storage = getTokenStorage() || 'session'
  setToken(token, { rememberMe: storage === 'local' })
}

export const removeToken = () => {
  if (!hasWindow()) return
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(TOKEN_KEY)
}

