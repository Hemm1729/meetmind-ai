import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'


export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()


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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Background glow orbs */}
      <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[100px] pointer-events-none animate-blob mix-blend-screen" />
      <div className="absolute top-[10%] right-[15%] w-[400px] h-[400px] rounded-full bg-teal-500/20 blur-[100px] pointer-events-none animate-blob mix-blend-screen" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-[20%] left-[30%] w-[600px] h-[600px] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none animate-blob mix-blend-screen" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="inline-flex items-center gap-3 mb-4 animate-bounce-subtle">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(99,102,241,0.5)] border border-white/10">
              🧠
            </div>
            <span className="font-mono text-3xl font-bold text-white tracking-tight drop-shadow-md">MeetMind</span>
          </div>
          <p className="text-slate-300 text-sm font-medium tracking-wide">
            Your AI-powered meeting intelligence
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 sm:p-10 animate-slide-up relative overflow-hidden group/card shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-slate-700/50" style={{ animationDelay: '200ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Welcome back
          </h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Enter your email and we'll send you a one-time sign-in code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="group/input">
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest transition-colors group-focus-within/input:text-indigo-400">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 shadow-inner"
                />
                <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-focus-within/input:border-indigo-500/50 transition-colors duration-300" />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-400 text-sm animate-fade-in-up">
                <span className="text-base drop-shadow-sm">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className={`w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group/btn font-sans
                ${loading || !email.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_8px_25px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 border border-indigo-500/50'
                }`}
            >
              {/* Shimmer effect */}
              {!loading && email.trim() && (
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
                  Send code <span className="group-hover/btn:translate-x-1 transition-transform duration-300">&rarr;</span>
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 text-xs animate-slide-up font-medium tracking-wide" style={{ animationDelay: '300ms' }}>
          No password needed &middot; New users are registered automatically
        </p>
      </div>
    </div>
  )
}