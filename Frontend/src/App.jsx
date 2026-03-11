import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import VerifyOTP from './pages/VerifyOTP'
import Chat from './pages/Chat'


function Protected({ children }) {
  const { user, loading } = useAuth()

  // Show loading dots while checking auth state on page refresh
  if (loading) return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6
    }}>
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  )

  // Not logged in → redirect to login
  return user ? children : <Navigate to="/login" replace />
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Public routes */}
          <Route path="/login"      element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />

          {/* Protected route — requires login */}
          <Route
            path="/chat"
            element={
              <Protected>
                <Chat />
              </Protected>
            }
          />

          {/* Default → go to chat (Protected will redirect to login if needed) */}
          <Route path="/" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
