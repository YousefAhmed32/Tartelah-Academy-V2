import { useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore.js'
import { authService } from '../services/auth.service.js'
import { API_URL } from '../config/constants.js'

/**
 * Runs once on app mount. Strategy:
 *   1. Call /auth/refresh (uses httpOnly cookie, no access token needed) via raw axios
 *      so the interceptor in api.js never interferes.
 *   2. Store the returned access token.
 *   3. Call /auth/me with the new token to hydrate the user in Zustand.
 *   4. On any failure → logout (clears Zustand, sets isLoading: false).
 *
 * This avoids the "no token on first call" problem because Zustand is not
 * persisted to localStorage and resets on every page reload.
 */
export function useInitAuth() {
  const { setAuth, logout, setAccessToken } = useAuthStore()

  useEffect(() => {
    let cancelled = false

    axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((refreshRes) => {
        const { accessToken } = refreshRes.data.data
        // Put the new token in the store so the api.js interceptor attaches it
        setAccessToken(accessToken)
        return authService.me()
      })
      .then((meRes) => {
        if (!cancelled) {
          // /auth/me returns { success, data: <user> } — user IS data, not data.user
          const user = meRes.data.data
          const token = useAuthStore.getState().accessToken
          setAuth(user, token)
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout()
        }
      })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function usePermission(role) {
  const { getRole } = useAuthStore()
  return getRole() === role
}
