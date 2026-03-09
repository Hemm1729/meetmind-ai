import { useState } from 'react'


export default function Sidebar({
  meetings,
  activeMeeting,
  onSelectMeeting,
  onNewMeeting,
  user,
  onLogout,
  loading
}) {
  const [collapsed, setCollapsed] = useState(false)


  // ── Format meeting date for sidebar ───────────────────────────────────
  const formatDate = (iso) => {
    const d    = new Date(iso)
    const now  = new Date()
    const diff = now - d  // ms difference

    if (diff < 3600000)   return 'Just now'
    if (diff < 86400000)  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }


  // ── Status dot color ──────────────────────────────────────────────────
  const statusColor = (status) => {
    if (status === 'ready')      return 'var(--green)'
    if (status === 'processing') return 'var(--amber)'
    if (status === 'failed')     return '#f87171'
    return 'var(--text-muted)'
  }


  // ── Status label ──────────────────────────────────────────────────────
  const statusLabel = (status) => {
    if (status === 'ready')      return 'Ready'
    if (status === 'processing') return 'Processing...'
    if (status === 'failed')     return 'Failed'
    return ''
  }


  return (
    <aside style={{
      width:    collapsed ? 60 : 264,
      minWidth: collapsed ? 60 : 264,
      height: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease, min-width 0.25s ease',
      overflow: 'hidden',
      flexShrink: 0
    }}>


      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '18px 14px' : '18px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        flexShrink: 0
      }}>

        {/* Logo — hidden when collapsed */}
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #22d3a0)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 15,
              flexShrink: 0
            }}>🧠</div>
            <span style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 16, fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
              whiteSpace: 'nowrap'
            }}>MeetMind</span>
          </div>
        )}

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-bright)',
            borderRadius: 7,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 13,
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>


      {/* ── New Meeting button ────────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '12px 10px' : '12px 12px',
        flexShrink: 0
      }}>
        <button
          onClick={onNewMeeting}
          title="Upload new meeting"
          style={{
            width: '100%',
            padding: collapsed ? '10px' : '10px 14px',
            background: 'transparent',
            border: '1px dashed var(--border-bright)',
            borderRadius: 10,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.15s',
            fontFamily: 'DM Sans'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color       = 'var(--accent)'
            e.currentTarget.style.background  = 'var(--accent-glow)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-bright)'
            e.currentTarget.style.color       = 'var(--text-secondary)'
            e.currentTarget.style.background  = 'transparent'
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          {!collapsed && <span>New Meeting</span>}
        </button>
      </div>


      {/* ── Meetings list ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 8px'
      }}>

        {/* Section label */}
        {!collapsed && (
          <div style={{
            padding: '6px 8px 8px',
            fontSize: 10, fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            Meetings
          </div>
        )}


        {/* Loading skeletons */}
        {loading && !collapsed && (
          [1, 2, 3].map(i => (
            <div key={i} style={{
              padding: '10px 10px',
              marginBottom: 4,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--border-bright)',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 12, borderRadius: 4,
                  background: 'var(--border-bright)',
                  marginBottom: 6,
                  width: `${60 + i * 15}%`
                }} />
                <div style={{
                  height: 10, borderRadius: 4,
                  background: 'var(--border)',
                  width: '40%'
                }} />
              </div>
            </div>
          ))
        )}


        {/* Empty state */}
        {!loading && meetings.length === 0 && !collapsed && (
          <div style={{
            padding: '24px 8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🎙️</div>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              lineHeight: 1.6
            }}>
              No meetings yet.<br />
              Upload your first recording.
            </p>
          </div>
        )}


        {/* Meeting items */}
        {meetings.map(m => {
          const isActive = activeMeeting?.id === m.id

          return (
            <button
              key={m.id}
              onClick={() => onSelectMeeting(m)}
              title={collapsed ? m.title : undefined}
              style={{
                width: '100%',
                padding: collapsed ? '10px' : '10px 10px',
                background: isActive
                  ? 'var(--bg-hover)'
                  : 'transparent',
                border: isActive
                  ? '1px solid var(--border-bright)'
                  : '1px solid transparent',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'all 0.12s',
                position: 'relative'
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background  = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              {/* Status dot */}
              <div style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: statusColor(m.status),
                flexShrink: 0,
                boxShadow: m.status === 'ready'
                  ? '0 0 6px rgba(34,211,160,0.4)'
                  : m.status === 'processing'
                  ? '0 0 6px rgba(251,191,36,0.4)'
                  : 'none'
              }} />

              {/* Title + date — hidden when collapsed */}
              {!collapsed && (
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: 2
                  }}>
                    {m.title}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: m.status !== 'ready'
                      ? statusColor(m.status)
                      : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {m.status !== 'ready'
                      ? statusLabel(m.status)
                      : formatDate(m.created_at)
                    }
                  </div>
                </div>
              )}

              {/* Active indicator bar */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0, top: '20%',
                  width: 3, height: '60%',
                  background: 'var(--accent)',
                  borderRadius: '0 2px 2px 0'
                }} />
              )}

            </button>
          )
        })}

      </div>


      {/* ── User footer ───────────────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '12px 10px' : '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        flexShrink: 0
      }}>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32,
          borderRadius: 9,
          background: 'linear-gradient(135deg, #6366f1, #22d3a0)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
          color: '#fff', flexShrink: 0
        }}>
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>

        {/* Email + logout — hidden when collapsed */}
        {!collapsed && (
          <>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.email}
              </div>
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)'
              }}>
                Free plan
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Sign out"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 16,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 6,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color      = '#f87171'
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color      = 'var(--text-muted)'
                e.currentTarget.style.background = 'none'
              }}
            >
              ↩
            </button>
          </>
        )}

      </div>

    </aside>
  )
}
