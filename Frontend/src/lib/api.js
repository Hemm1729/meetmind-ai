import axios from 'axios'

// Base URL from .env — falls back to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'


// ── Create axios instance with base config ─────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  timeout: 600000,  // 10 min — needed for large file uploads + Whisper processing
})


// ── Request interceptor: attach JWT token to every request ─────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mm_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)


// ── Response interceptor: handle token expiry globally ─────────────────
api.interceptors.response.use(
  // Success — just pass through
  (response) => response,

  // Error — check if token expired (401)
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('mm_refresh')

        if (!refreshToken) {
          // No refresh token — force logout
          redirectToLogin()
          return Promise.reject(error)
        }

        // Try to get a new access token
        const res = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken
        })

        const newToken = res.data.access_token
        const newRefresh = res.data.refresh_token

        // Save new tokens
        localStorage.setItem('mm_token', newToken)
        localStorage.setItem('mm_refresh', newRefresh)

        // Retry the original failed request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)

      } catch (refreshError) {
        // Refresh also failed — session is dead, force logout
        redirectToLogin()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)


// ── Helper: clear session and redirect to login ────────────────────────
function redirectToLogin() {
  localStorage.removeItem('mm_token')
  localStorage.removeItem('mm_refresh')
  localStorage.removeItem('mm_user')
  window.location.href = '/login'
}


export default api