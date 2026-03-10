import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'


export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const inputRefs = useRef([])
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
      setOtp(['', '', '', '', '', '', '', ''])
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
      setOtp(['', '', '', '', '', '', '', ''])
      setCountdown(30)  // 30 second cooldown before resend again
      inputRefs.current[0]?.focus()
      setTimeout(() => setResent(false), 3000)
    } catch {
      setError('Failed to resend code. Please try again.')
    }
  }


  const filledCount = otp.filter(d => d !== '').length


  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Background glow orbs */}
      <div className="absolute top-[25%] right-[15%] w-[450px] h-[450px] rounded-full bg-indigo-600/20 blur-[100px] pointer-events-none animate-blob mix-blend-screen" />
      <div className="absolute bottom-[20%] left-[10%] w-[350px] h-[350px] rounded-full bg-teal-500/20 blur-[100px] pointer-events-none animate-blob mix-blend-screen" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[40%] left-[40%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none animate-blob mix-blend-screen" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="inline-flex items-center gap-3 mb-4 animate-bounce-subtle">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(99,102,241,0.5)] border border-white/10">
              🧠
            </div>
            <span className="font-mono text-3xl font-bold text-white tracking-tight drop-shadow-md">MeetMind</span>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 sm:p-10 animate-slide-up relative overflow-hidden group/card shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-slate-700/50" style={{ animationDelay: '200ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />
          {/* Email icon */}
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl mb-6 shadow-inner">
            ✉️
          </div>

          <h2 className="text-2xl font-semibold text-white mb-2">
            Check your email
          </h2>
          <p className="text-slate-400 text-sm mb-1">
            We sent an 8-digit code to
          </p>
          <p className="text-indigo-400 text-sm font-medium font-mono mb-8">
            {email}
          </p>

          {/* 8 individual digit boxes */}
          <div className="flex gap-2 justify-center mb-6">
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
                className={`w-10 h-12 sm:w-11 sm:h-14 text-center text-xl font-bold font-mono rounded-xl outline-none transition-all duration-200 cursor-text text-white
                ${digit ? 'bg-indigo-500/10' : 'bg-slate-800/50'}
                ${error ? 'border-2 border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : digit ? 'border-2 border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]' : 'border-2 border-slate-700 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'}
                `}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(filledCount / 8) * 100}%` }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-400 text-sm animate-fade-in mb-5">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Resent success message */}
          {resent && (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 flex items-center gap-3 text-teal-400 text-sm animate-fade-in mb-5">
              <span>✓</span>
              <span>New code sent to your email</span>
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={() => handleVerify(otp.join(''))}
            disabled={loading || filledCount < 8}
            className={`w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-300 flex items-center justify-center gap-2 mb-6 relative overflow-hidden group/btn font-sans
              ${loading || filledCount < 8
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_8px_25px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 border border-indigo-500/50'
              }`}
          >
            {/* Shimmer effect */}
            {!loading && filledCount === 8 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
            )}

            {loading ? (
              <div className="flex items-center gap-1.5 h-5 relative z-10">
                <span className="typing-dot bg-white/80" />
                <span className="typing-dot bg-white/80" />
                <span className="typing-dot bg-white/80" />
              </div>
            ) : (
              <span className="relative z-10 flex items-center gap-2">
                Verify & Sign in <span className="group-hover/btn:translate-x-1 transition-transform duration-300">&rarr;</span>
              </span>
            )}
          </button>

          {/* Resend + change email links */}
          <div className="flex justify-center items-center gap-4 text-xs">
            <button
              onClick={handleResend}
              disabled={countdown > 0}
              className={`font-medium underline transition-colors ${countdown > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 hover:text-white cursor-pointer'}`}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
            <span className="text-slate-600">&middot;</span>
            <button
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-white font-medium underline transition-colors cursor-pointer"
            >
              Change email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}