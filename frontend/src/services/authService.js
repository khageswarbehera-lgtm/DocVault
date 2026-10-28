import { api, TOKEN_STORAGE_KEY } from './api'

export const authEndpoints = {
  login: '/auth/login',
  register: '/auth/register',
  me: '/auth/me',
  logout: '/auth/logout',
}

const saveSession = (response) => {
  const session = response.data.data
  localStorage.setItem(TOKEN_STORAGE_KEY, session.token)
  return session
}

export const register = async ({ name, email, password }) => saveSession(
  await api.post(authEndpoints.register, { name, email, password }),
)

export const login = async ({ email, password }) => saveSession(
  await api.post(authEndpoints.login, { email, password }),
)

export const getCurrentUser = async () => {
  const response = await api.get(authEndpoints.me)
  return response.data.data.user
}

export const logout = () => api.post(authEndpoints.logout)

export const clearSession = () => localStorage.removeItem(TOKEN_STORAGE_KEY)

export const hasStoredToken = () => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))
