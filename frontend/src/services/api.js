import axios from 'axios'

export const TOKEN_STORAGE_KEY = 'docvault-auth-token'
export const AUTH_EXPIRED_EVENT = 'docvault:auth-expired'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const isPublicAuthRequest = /\/auth\/(login|register)\/?(?:\?|$)/.test(config.url || '')
  const token = !isPublicAuthRequest ? localStorage.getItem(TOKEN_STORAGE_KEY) : null

  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublicAuthRequest = /\/auth\/(login|register)\/?(?:\?|$)/.test(error.config?.url || '')
    if (error.response?.status === 401 && !isPublicAuthRequest) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)

export const getApiErrorMessage = (error, fallback = 'The request could not be completed.') => {
  const status = error.response?.status
  if (status >= 500) return 'The service is temporarily unavailable. Please try again.'

  const message = error.response?.data?.message
  const details = error.response?.data?.error
  if (Array.isArray(details) && details.length) {
    const validationMessages = details
      .map((item) => item.field && item.message ? `${item.field}: ${item.message}` : item.message)
      .filter(Boolean)
    if (validationMessages.length) return validationMessages.join('. ')
  }
  if (typeof message === 'string' && message.trim()) return message
  return error.message === 'Network Error'
    ? 'Could not reach DocVault. Check that the backend is running.'
    : fallback
}
