import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'


export default function Login() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate              = useNavigate()


  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      await api.post('/auth/send-otp', { email })
      // Pass email to verify page via router state
      navigate('/verify-otp', { state: { email } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Background glow orbs */}
      <div style={{
        position: 'absolute',
        top: '20%', left: '15%',
        width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%', right: '10%',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,160,0.05) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />


      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14
          }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #22d3a0)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 0 24px rgba(99,102,241,0.3)'
            }}>🧠</div>
            <span style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 24, fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>MeetMind</span>
          </div>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 14
          }}>
            Your AI-powered meeting intelligence
          </p>
        </div>


        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="glass-card" style={{ borderRadius: 18, padding: 36 }}>

          <h2 style={{
            fontSize: 22, fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 6
          }}>
            Welcome back
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 13,
            marginBottom: 32
          }}>
            Enter your email and we'll send you a one-time sign-in code.
          </p>


          <form onSubmit={handleSubmit}>

            {/* Email input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 11, fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-bright)',
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box'
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--accent)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-bright)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>


            {/* Error message */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 20,
                color: '#f87171',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}


            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                width: '100%',
                padding: '13px',
                background: loading || !email.trim()
                  ? 'var(--bg-hover)'
                  : 'linear-gradient(135deg, #6366f1, #4f52cc)',
                border: 'none',
                borderRadius: 12,
                color: loading || !email.trim()
                  ? 'var(--text-muted)'
                  : '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'DM Sans, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: loading || !email.trim()
                  ? 'none'
                  : '0 4px 14px rgba(99,102,241,0.3)'
              }}
              onMouseEnter={e => {
                if (!loading && email.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = loading || !email.trim()
                  ? 'none'
                  : '0 4px 14px rgba(99,102,241,0.3)'
              }}
            >
              {loading ? (
                <>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </>
              ) : (
                <>Send code →</>
              )}
            </button>

          </form>
        </div>


        {/* Footer note */}
        <p style={{
          textAlign: 'center',
          marginTop: 20,
          color: 'var(--text-muted)',
          fontSize: 12
        }}>
          No password needed · New users are registered automatically
        </p>

      </div>
    </div>
  )
}