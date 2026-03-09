import { useState, useRef, useEffect } from 'react'
import api from '../lib/api'


// ── Single message bubble ──────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 10,
        marginBottom: 20
      }}
    >

      {/* AI avatar — only on left side */}
      {!isUser && (
        <div style={{
          width: 30, height: 30,
          borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #22d3a0)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 14,
          marginBottom: 2,
          boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
        }}>🧠</div>
      )}

      <div style={{ maxWidth: '72%' }}>

        {/* Message bubble */}
        <div style={{
          padding: '11px 16px',
          background: isUser
            ? 'linear-gradient(135deg, #6366f1, #4f52cc)'
            : 'var(--bg-card)',
          border: isUser
            ? 'none'
            : '1px solid var(--border)',
          borderRadius: isUser
            ? '18px 18px 4px 18px'
            : '18px 18px 18px 4px',
          color: isUser ? '#fff' : 'var(--text-primary)',
          fontSize: 14,
          lineHeight: 1.65,
          boxShadow: isUser
            ? '0 4px 12px rgba(99,102,241,0.25)'
            : 'none'
        }}>
          {msg.content}
        </div>

        {/* Sources — collapsible, only on AI messages */}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
              listStyle: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 0'
            }}>
              <span style={{
                width: 14, height: 14,
                borderRadius: '50%',
                border: '1px solid var(--border-bright)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9
              }}>i</span>
              View {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''} from transcript
            </summary>

            {msg.sources.map((chunk, i) => (
              <div key={i} style={{
                marginTop: 6,
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--text-secondary)',
                fontFamily: 'Space Mono, monospace',
                lineHeight: 1.6,
                maxHeight: 80,
                overflow: 'hidden',
                position: 'relative'
              }}>
                "{chunk.slice(0, 220)}..."
              </div>
            ))}
          </details>
        )}

      </div>

      {/* User avatar — only on right side */}
      {isUser && (
        <div style={{
          width: 30, height: 30,
          borderRadius: 9, flexShrink: 0,
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-bright)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13,
          marginBottom: 2
        }}>👤</div>
      )}

    </div>
  )
}


// ── Typing indicator (3 animated dots) ────────────────────────────────
function TypingIndicator() {
  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        marginBottom: 20
      }}
    >
      <div style={{
        width: 30, height: 30,
        borderRadius: 9,
        background: 'linear-gradient(135deg, #6366f1, #22d3a0)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 14,
        boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
      }}>🧠</div>

      <div style={{
        padding: '14px 18px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '18px 18px 18px 4px',
        display: 'flex',
        gap: 5,
        alignItems: 'center'
      }}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}


// ── Empty state — no meeting selected ─────────────────────────────────
function EmptyState({ onShowUpload }) {
  const suggestions = [
    { icon: '🔍', text: 'What were the key decisions made?' },
    { icon: '✅', text: 'Who was assigned the backend task?' },
    { icon: '⚠️', text: 'Were there any blockers mentioned?' },
    { icon: '📋', text: 'Summarize the action items' },
  ]

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
      textAlign: 'center'
    }}>

      {/* Logo mark */}
      <div style={{
        width: 64, height: 64,
        borderRadius: 18,
        background: 'linear-gradient(135deg, #6366f1, #22d3a0)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 30,
        marginBottom: 24,
        boxShadow: '0 8px 32px rgba(99,102,241,0.25)'
      }}>🧠</div>

      <h2 style={{
        fontSize: 24, fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 10,
        letterSpacing: '-0.3px'
      }}>
        Welcome to MeetMind
      </h2>

      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 14,
        maxWidth: 380,
        lineHeight: 1.7,
        marginBottom: 32
      }}>
        Upload a meeting recording and chat with it like an AI assistant.
        Ask questions, get summaries, and find action items in seconds.
      </p>

      {/* CTA button */}
      <button
        onClick={onShowUpload}
        style={{
          padding: '13px 28px',
          background: 'linear-gradient(135deg, #6366f1, #4f52cc)',
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 14,
          fontWeight: 600, cursor: 'pointer',
          fontFamily: 'DM Sans',
          boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          marginBottom: 52,
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform  = 'translateY(-2px)'
          e.currentTarget.style.boxShadow  = '0 8px 24px rgba(99,102,241,0.45)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform  = 'translateY(0)'
          e.currentTarget.style.boxShadow  = '0 4px 14px rgba(99,102,241,0.35)'
        }}
      >
        Upload Meeting Recording →
      </button>

      {/* Example questions */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <p style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 14
        }}>
          Example questions you can ask
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8
        }}>
          {suggestions.map((s, i) => (
            <div key={i} style={{
              padding: '12px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              textAlign: 'left'
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
              <span style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.5
              }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}


// ── Main ChatWindow component ──────────────────────────────────────────
export default function ChatWindow({ meeting, onShowUpload }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const bottomRef               = useRef()
  const textareaRef             = useRef()


  // ── Load initial AI greeting when meeting changes ──────────────────
  useEffect(() => {
    if (!meeting) {
      setMessages([])
      return
    }

    // Build greeting message with summary
    const greeting = meeting.summary
      ? `I've analyzed **${meeting.title}**.\n\n**Summary:** ${meeting.summary}\n\nAsk me anything about this meeting!`
      : `I've loaded **${meeting.title}**. Ask me anything about this meeting!`

    setMessages([{
      role:    'assistant',
      content: greeting
    }])
    setError('')
  }, [meeting?.id])


  // ── Auto scroll to bottom on new messages ─────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])


  // ── Auto resize textarea as user types ────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])


  // ── Send message ───────────────────────────────────────────────────
  const send = async () => {
    const question = input.trim()
    if (!question || loading || !meeting) return

    setInput('')
    setError('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await api.post('/chat/ask', {
        meeting_id: meeting.id,
        question
      })

      setMessages(prev => [...prev, {
        role:    'assistant',
        content: res.data.answer,
        sources: res.data.sources
      }])

    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: `⚠️ ${msg}`
      }])
      setError(msg)
    } finally {
      setLoading(false)
    }
  }


  // ── Enter to send, Shift+Enter for newline ─────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }


  // ── No meeting selected ────────────────────────────────────────────
  if (!meeting) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmptyState onShowUpload={onShowUpload} />
      </div>
    )
  }


  // ── Meeting still processing ───────────────────────────────────────
  if (meeting.status === 'processing') {
    return (
      <div style={{
        flex: 1, display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16
      }}>
        <div style={{
          width: 52, height: 52,
          border: '3px solid var(--border-bright)',
          borderTop: '3px solid var(--accent)',
          borderRadius: '50%'
        }} className="spin-slow" />
        <p style={{
          color: 'var(--text-primary)',
          fontSize: 15, fontWeight: 500
        }}>
          Processing your meeting...
        </p>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: 13, textAlign: 'center',
          maxWidth: 320
        }}>
          Whisper is transcribing the audio.<br />
          This may take a few minutes.
        </p>
      </div>
    )
  }


  // ── Meeting failed ─────────────────────────────────────────────────
  if (meeting.status === 'failed') {
    return (
      <div style={{
        flex: 1, display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <p style={{ color: '#f87171', fontSize: 15, fontWeight: 500 }}>
          Processing failed
        </p>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: 13, textAlign: 'center'
        }}>
          Something went wrong while processing this meeting.<br />
          Try uploading the recording again.
        </p>
        <button
          onClick={onShowUpload}
          style={{
            marginTop: 8,
            padding: '10px 20px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-bright)',
            borderRadius: 10,
            color: 'var(--text-secondary)',
            fontSize: 13, cursor: 'pointer',
            fontFamily: 'DM Sans'
          }}
        >
          Upload Again
        </button>
      </div>
    )
  }


  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>

      {/* ── Meeting header bar ──────────────────────────────────────── */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0
      }}>
        <div style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: 'var(--green)',
          boxShadow: '0 0 6px rgba(34,211,160,0.5)',
          flexShrink: 0
        }} />

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            fontWeight: 600, fontSize: 14,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {meeting.title}
          </div>
          {meeting.action_items?.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {meeting.action_items.length} action item{meeting.action_items.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <button
          onClick={onShowUpload}
          style={{
            padding: '7px 14px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-bright)',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color       = 'var(--accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-bright)'
            e.currentTarget.style.color       = 'var(--text-secondary)'
          }}
        >
          + Upload New
        </button>
      </div>


      {/* ── Action items strip ──────────────────────────────────────── */}
      {meeting.action_items?.length > 0 && (
        <div style={{
          padding: '10px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          flexShrink: 0
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            Actions:
          </span>

          {meeting.action_items.map((item, i) => (
            <div key={i} style={{
              padding: '4px 12px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
              borderRadius: 20,
              fontSize: 12,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{
                width: 5, height: 5,
                borderRadius: '50%',
                background: 'var(--accent)',
                flexShrink: 0
              }} />
              {item.task?.slice(0, 45) || 'Task'}
              {item.assignee && item.assignee !== 'Unassigned' && (
                <span style={{
                  color: 'var(--text-muted)',
                  fontSize: 10
                }}>
                  · {item.assignee}
                </span>
              )}
            </div>
          ))}
        </div>
      )}


      {/* ── Messages area ───────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 24px 12px'
      }}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>


      {/* ── Input area ──────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 24px 22px',
        flexShrink: 0
      }}>

        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-bright)',
          borderRadius: 16,
          padding: '10px 10px 10px 18px',
          transition: 'border-color 0.2s, box-shadow 0.2s'
        }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(99,102,241,0.08)'
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = 'var(--border-bright)'
            e.currentTarget.style.boxShadow   = 'none'
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this meeting..."
            rows={1}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.6,
              maxHeight: 120,
              overflowY: 'auto',
              padding: '3px 0'
            }}
          />

          {/* Send button */}
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 38, height: 38,
              borderRadius: 10, flexShrink: 0,
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #6366f1, #4f52cc)'
                : 'var(--bg-hover)',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              boxShadow: input.trim() && !loading
                ? '0 2px 8px rgba(99,102,241,0.3)'
                : 'none'
            }}
            onMouseEnter={e => {
              if (input.trim() && !loading) {
                e.currentTarget.style.transform = 'scale(1.05)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            ↑
          </button>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 8
        }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>

    </div>
  )
}