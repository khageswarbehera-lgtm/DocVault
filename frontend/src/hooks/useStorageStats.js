import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { getApiErrorMessage } from '../services/api'
import { getStorage } from '../services/userService'

const fallbackError = 'Could not load your storage usage.'

// Reads the real storage accounting endpoint. Callers that need the numbers to
// stay fresh across workspace routes can pass a `watch` value (for example the
// current pathname) to trigger a refresh whenever it changes.
export function useStorageStats({ watch } = {}) {
  const { user, isAuthenticated } = useAuth()
  const [stats, setStats] = useState(null)
  const [completedRequestKey, setCompletedRequestKey] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const requestKey = JSON.stringify([user?.id ?? null, watch ?? null])
  const isLoading = isAuthenticated && (completedRequestKey !== requestKey || isRefreshing)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      return null
    }

    setIsRefreshing(true)
    try {
      const summary = await getStorage()
      setStats(summary)
      setError('')
      setCompletedRequestKey(requestKey)
      return summary
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, fallbackError))
      setCompletedRequestKey(requestKey)
      return null
    } finally {
      setIsRefreshing(false)
    }
  }, [isAuthenticated, requestKey])

  useEffect(() => {
    let active = true

    if (!isAuthenticated) return () => { active = false }

    getStorage()
      .then((summary) => {
        if (!active) return
        setStats(summary)
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, fallbackError))
      })
      .finally(() => {
        if (active) setCompletedRequestKey(requestKey)
      })

    return () => { active = false }
  }, [isAuthenticated, requestKey])

  return { stats: isAuthenticated ? stats : null, isLoading, error, refresh }
}
