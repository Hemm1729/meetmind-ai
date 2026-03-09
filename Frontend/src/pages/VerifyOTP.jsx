import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'


export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [resent, setResent]     = useState(false)
  const [countdown, setCountdown] = useState(0)

  const inputRefs = useRef([])
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Email passed from Login page via router state
  const email = location.state?.email || ''

  // If someone lands here directly without email → send back to login
  useEffect(() => {
    if (!email) navigate('/login', { replace: true })
  }, [email])


  // ── Countdown timer for resend button ──────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])


  // ── Auto-submit when all 6 digits are filled ───────────────────────────
  useEffect(() => {
    const full = otp.join('')
    if (full.length === 8) handleVerify(full)
  }, [otp])


  // ── Handle individual digit input ──────────────────────────────────────
  const handleChange = (index, value) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1)

    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setError('')

    // Auto-focus next input after typing
    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }
  }


  // ── Handle backspace — move focus to previous input ────────────────────
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        // Clear current
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      } else if (index > 0) {
        // Move to previous if current already empty
        inputRefs.current[index - 1]?.focus()
        const newOtp = [...otp]
        newOtp[index - 1] = ''
        setOtp(newOtp)
      }
    }

    // Allow pasting via Ctrl+V / Cmd+V
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') return
  }


  // ── Handle paste — fill all 6 boxes at once ────────────────────────────
  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 8)

    if (pasted.length === 8) {
      setOtp(pasted.split(''))
      inputRefs.current[7]?.focus()
    }
  }


  // ── Verify OTP against backend ─────────────────────────────────────────
  const handleVerify = async (code) => {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        token: code
      })

      // Save session to context + localStorage
      login(res.data.user, res.data.access_token, res.data.refresh_token)

      // Go to main app
      navigate('/chat', { replace: true })

    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Please try again.')
      // Clear all boxes on error so user can re-enter
      setOtp(['', '', '', '', '', '','', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }


  // ── Resend OTP ─────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return
    try {
      await api.post('/auth/send-otp', { email })
      setResent(true)
      setError('')
      setOtp(['', '', '', '', '', '','', ''])
      setCountdown(30)  // 30 second cooldown before resend again
      inputRefs.current[0]?.focus()
      setTimeout(() => setResent(false), 3000)
    } catch {
      setError('Failed to resend code. Please try again.')
    }
  }


  const filledCount = otp.filter(d => d !== '').length


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
        top: '25%', right: '15%',
        width: 450, height: 450,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%', left: '10%',
        width: 350, height: 350,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,160,0.05) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />


      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            gap: 12, marginBottom: 14
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #22d3a0)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 20,
              boxShadow: '0 0 24px rgba(99,102,241,0.3)'
            }}>🧠</div>
            <span style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 24, fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>MeetMind</span>
          </div>
        </div>


        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="glass-card" style={{ borderRadius: 18, padding: 36 }}>

          {/* Email icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24, marginBottom: 20
          }}>✉️</div>

          <h2 style={{
            fontSize: 22, fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: 6
          }}>
            Check your email
          </h2>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 13, marginBottom: 4
          }}>
            We sent a 8-digit code to
          </p>
          <p style={{
            color: 'var(--accent)',
            fontSize: 14, fontWeight: 500,
            fontFamily: 'Space Mono, monospace',
            marginBottom: 32
          }}>
            {email}
          </p>


          {/* ── 6 individual digit boxes ─────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 10,
            justifyContent: 'center',
            marginBottom: 24
          }}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={handlePaste}
                autoFocus={index === 0}
                style={{
                  width: 48, height: 56,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: 'Space Mono, monospace',
                  background: digit
                    ? 'rgba(99,102,241,0.1)'
                    : 'var(--bg-secondary)',
                  border: `2px solid ${
                    error
                      ? 'rgba(239,68,68,0.5)'
                      : digit
                      ? 'var(--accent)'
                      : 'var(--border-bright)'
                  }`,
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 0.15s',
                  cursor: 'text'
                }}
                onFocus={e => {
                  if (!error) {
                    e.target.style.borderColor = 'var(--accent)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'
                  }
                }}
                onBlur={e => {
                  e.target.style.boxShadow = 'none'
                  if (!digit && !error) {
                    e.target.style.borderColor = 'var(--border-bright)'
                  }
                }}
              />
            ))}
          </div>


          {/* Progress bar */}
          <div style={{
            height: 2,
            background: 'var(--border)',
            borderRadius: 1,
            marginBottom: 24,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(filledCount / 8) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #22d3a0)',
              borderRadius: 1,
              transition: 'width 0.2s ease'
            }} />
          </div>


          {/* Error message */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '10px 14px',
              marginBottom: 20, color: '#f87171',
              fontSize: 13, display: 'flex',
              alignItems: 'center', gap: 8
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Resent success message */}
          {resent && (
            <div style={{
              background: 'rgba(34,211,160,0.08)',
              border: '1px solid rgba(34,211,160,0.2)',
              borderRadius: 10, padding: '10px 14px',
              marginBottom: 20, color: 'var(--green)',
              fontSize: 13, display: 'flex',
              alignItems: 'center', gap: 8
            }}>
              <span>✓</span>
              <span>New code sent to your email</span>
            </div>
          )}


          {/* Verify button */}
          <button
            onClick={() => handleVerify(otp.join(''))}
            disabled={loading || filledCount < 8
            }
            style={{
              width: '100%', padding: '13px',
              background: loading || filledCount < 8
                ? 'var(--bg-hover)'
                : 'linear-gradient(135deg, #6366f1, #4f52cc)',
              border: 'none', borderRadius: 12,
              color: loading || filledCount < 8
                ? 'var(--text-muted)'
                : '#fff',
              fontSize: 14, fontWeight: 600,
              cursor: loading || filledCount < 8
                ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'DM Sans, sans-serif',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              boxShadow: loading || filledCount < 8
                ? 'none'
                : '0 4px 14px rgba(99,102,241,0.3)',
              marginBottom: 20
            }}
          >
            {loading ? (
              <>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </>
            ) : (
              <>Verify & Sign in →</>
            )}
          </button>


          {/* Resend + change email links */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16
          }}>
            <button
              onClick={handleResend}
              disabled={countdown > 0}
              style={{
                background: 'none', border: 'none',
                color: countdown > 0
                  ? 'var(--text-muted)'
                  : 'var(--text-secondary)',
                fontSize: 12, cursor: countdown > 0
                  ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                fontFamily: 'DM Sans'
              }}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>

            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>·</span>

            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'DM Sans'
              }}
            >
              Change email
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}