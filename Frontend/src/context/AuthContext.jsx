import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)


export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true)  // true until we've checked localStorage


  // ── On first mount: restore session from localStorage ──────────────────
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('mm_token')
      const storedUser  = localStorage.getItem('mm_user')

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch (err) {
      // Corrupted localStorage — clear it
      localStorage.removeItem('mm_token')
      localStorage.removeItem('mm_user')
      localStorage.removeItem('mm_refresh')
    } finally {
      // Always stop loading — even if nothing was found
      setLoading(false)
    }
  }, [])


  // ── Called after successful OTP verification ───────────────────────────
  const login = (userData, accessToken, refreshToken) => {
    // Save to state
    setUser(userData)
    setToken(accessToken)

    // Persist to localStorage so session survives page refresh
    localStorage.setItem('mm_token',   accessToken)
    localStorage.setItem('mm_refresh', refreshToken)
    localStorage.setItem('mm_user',    JSON.stringify(userData))
  }


  // ── Called when user clicks Sign Out ───────────────────────────────────
  const logout = () => {
    // Clear state
    setUser(null)
    setToken(null)

    // Clear localStorage
    localStorage.removeItem('mm_token')
    localStorage.removeItem('mm_refresh')
    localStorage.removeItem('mm_user')
  }


  // ── Expose everything components need ──────────────────────────────────
  const value = {
    user,      // { id, email } or null
    token,     // JWT access token string or null
    loading,   // true while restoring session on refresh
    login,     // fn(userData, accessToken, refreshToken)
    logout,    // fn()
    isLoggedIn: !!user,  // convenience boolean
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


// ── Custom hook — use this everywhere instead of useContext directly ──────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth() must be used inside <AuthProvider>')
  }
  return context
}
