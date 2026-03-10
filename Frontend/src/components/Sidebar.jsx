import { useState } from 'react'


export default function Sidebar({
  meetings,
  activeMeeting,
  onSelectMeeting,
  onNewMeeting,
  onLiveAssistant,
  user,
  onLogout,
  loading
}) {
  const [collapsed, setCollapsed] = useState(false)


  // ── Format meeting date for sidebar ───────────────────────────────────
  const formatDate = (iso) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d  // ms difference

    if (diff < 3600000) return 'Just now'
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }


  // ── Status dot color ──────────────────────────────────────────────────
  const statusColor = (status) => {
    if (status === 'ready') return 'var(--green)'
    if (status === 'processing') return 'var(--amber)'
    if (status === 'failed') return '#f87171'
    return 'var(--text-muted)'
  }


  // ── Status label ──────────────────────────────────────────────────────
  const statusLabel = (status) => {
    if (status === 'ready') return 'Ready'
    if (status === 'processing') return 'Processing...'
    if (status === 'failed') return 'Failed'
    return ''
  }


  return (
    <aside className={`h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out shrink-0 ${collapsed ? 'w-[64px]' : 'w-[264px]'} z-20`}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className={`p-4 border-b border-slate-800 flex items-center shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 animate-bounce-subtle">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center text-sm shadow-[0_2px_10px_rgba(99,102,241,0.5)] border border-white/10 shrink-0">
              🧠
            </div>
            <span className="font-mono text-[17px] font-bold text-white tracking-tight whitespace-nowrap drop-shadow-md">
              MeetMind
            </span>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md bg-slate-800/50 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-400 text-xs flex items-center justify-center shrink-0 transition-colors"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* ── New Meeting button ────────────────────────────────────────── */}
      <div className="p-3 shrink-0 flex flex-col gap-2">
        <button
          onClick={onNewMeeting}
          title="Upload new meeting"
          className={`w-full p-2.5 bg-transparent border border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-indigo-400 hover:border-indigo-500 hover:bg-indigo-500/10 text-sm font-medium flex items-center gap-2 transition-all duration-300 relative overflow-hidden group ${collapsed ? 'justify-center' : 'justify-start'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
          <span className="text-lg leading-none group-hover:scale-125 transition-transform duration-300">+</span>
          {!collapsed && <span className="group-hover:translate-x-1 transition-transform duration-300">New Meeting</span>}
        </button>

        <button
          onClick={onLiveAssistant}
          title="Live AI Assistant (Google Meet)"
          className={`w-full p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500 shadow-sm text-sm font-medium flex items-center gap-2 transition-all duration-300 relative overflow-hidden group ${collapsed ? 'justify-center' : 'justify-start'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
          <span className="text-lg leading-none transition-transform duration-300">🎙️</span>
          {!collapsed && <span className="group-hover:translate-x-1 transition-transform duration-300">Live Assistant</span>}
        </button>
      </div>

      {/* ── Meetings list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        {!collapsed && (
          <div className="px-2 pt-2 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Meetings
          </div>
        )}

        {loading && !collapsed && (
          [1, 2, 3].map(i => (
            <div key={i} className="p-2.5 mb-1 rounded-xl flex items-center gap-3 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
              <div className="flex-1">
                <div className="h-3 rounded bg-slate-700 mb-2" style={{ width: `${60 + i * 15}%` }} />
                <div className="h-2.5 rounded bg-slate-800 w-2/5" />
              </div>
            </div>
          ))
        )}

        {!loading && meetings.length === 0 && !collapsed && (
          <div className="px-2 py-8 text-center animate-fade-in">
            <div className="text-3xl mb-3 opacity-80">🎙️</div>
            <p className="text-slate-500 text-xs leading-relaxed">
              No meetings yet.<br />
              Upload your recording.
            </p>
          </div>
        )}

        {meetings.map((m, index) => {
          const isActive = activeMeeting?.id === m.id

          return (
            <button
              // ensure uniqueness using fallback index
              key={`${m.id}-${index}`}
              onClick={() => onSelectMeeting(m)}
              title={collapsed ? m.title : undefined}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`w-full p-2.5 rounded-xl text-left mb-1 flex items-center gap-3 transition-all duration-300 relative overflow-hidden group animate-fade-in-up hover:scale-[1.02]
                ${isActive
                  ? 'bg-slate-800 border-slate-700 shadow-sm border shadow-indigo-500/10'
                  : 'bg-transparent border-transparent hover:bg-slate-800/60 hover:border-slate-700/50 border'
                } ${collapsed ? 'justify-center' : 'justify-start'}`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${m.status === 'ready' ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]' :
                m.status === 'processing' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse' :
                  m.status === 'failed' ? 'bg-red-500' : 'bg-slate-500'
                }`} />

              {!collapsed && (
                <div className="overflow-hidden flex-1">
                  <div className={`text-[13px] truncate mb-0.5 transition-colors ${isActive ? 'font-semibold text-white' : 'font-medium text-slate-300 group-hover:text-white'}`}>
                    {m.title}
                  </div>
                  <div className={`text-[11px] flex items-center gap-1.5 ${m.status !== 'ready' ? (m.status === 'processing' ? 'text-amber-400' : 'text-red-400') : 'text-slate-500'}`}>
                    {m.status !== 'ready' ? statusLabel(m.status) : formatDate(m.created_at)}
                  </div>
                </div>
              )}

              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[60%] bg-indigo-500 rounded-r-md" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── User footer ───────────────────────────────────────────────── */}
      <div className={`p-3 border-t border-slate-800 flex items-center gap-3 shrink-0 ${collapsed ? 'justify-center' : 'justify-start'}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0">
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {user?.email}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Free plan
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center text-lg"
            >
              &crarr;
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
