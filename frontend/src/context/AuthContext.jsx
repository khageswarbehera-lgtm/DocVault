import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import {
  AUTH_EXPIRED_EVENT,
} from '../services/api'
import {
  clearSession,
  getCurrentUser,
  hasStoredToken,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../services/authService'
import { uploadAvatar as uploadAvatarRequest } from '../services/userService'

const withInitials = (user) => ({
  ...user,
  initials: user.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '',
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      if (!hasStoredToken()) {
        if (active) setIsLoading(false)
        return
      }

      try {
        const currentUser = await getCurrentUser()
        if (active) setUser(withInitials(currentUser))
      } catch (error) {
        if (error.response?.status === 401) clearSession()
        if (active) setUser(null)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    const handleExpiredSession = () => {
      clearSession()
      setUser(null)
      setIsLoading(false)
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
    restoreSession()
    return () => {
      active = false
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
    }
  }, [])

  const signIn = async (email, password) => {
    const session = await loginRequest({ email, password })
    const nextUser = withInitials(session.user)
    setUser(nextUser)
    return nextUser
  }

  const signUp = async (name, email, password) => {
    const session = await registerRequest({ name, email, password })
    const nextUser = withInitials(session.user)
    setUser(nextUser)
    return nextUser
  }

  const refreshCurrentUser = async () => {
    const currentUser = withInitials(await getCurrentUser())
    setUser(currentUser)
    return currentUser
  }

  const updateAvatar = async (file, onUploadProgress) => {
    const updatedUser = withInitials(await uploadAvatarRequest(file, onUploadProgress))
    setUser(updatedUser)
    return updatedUser
  }

  const signOut = async () => {
    try {
      if (hasStoredToken()) await logoutRequest()
    } catch {
      // Clear the local session even when the server cannot be reached.
    } finally {
      clearSession()
      setUser(null)
    }
  }

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    signIn,
    signUp,
    signOut,
    updateAvatar,
    refreshCurrentUser,
  }), [user, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
