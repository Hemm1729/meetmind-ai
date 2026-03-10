import { useState, useRef, useEffect } from 'react'
import api from '../lib/api'


// ── Single message bubble ──────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div
      className={`animate-fade-in-up flex items-end gap-2.5 mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* AI avatar — only on left side */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl shrink-0 bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center text-sm mb-0.5 shadow-[0_2px_12px_rgba(99,102,241,0.4)] border border-white/10 animate-bounce-subtle">
          🧠
        </div>
      )}

      <div className="max-w-[72%]">
        {/* Message bubble */}
        <div className={`px-4 py-3 text-[14px] leading-relaxed shadow-sm ${isUser
          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-[18px_18px_4px_18px] shadow-[0_4px_12px_rgba(99,102,241,0.25)]'
          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-[18px_18px_18px_4px]'
          }`}>
          {msg.content}
        </div>

        {/* Sources — collapsible, only on AI messages */}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <details className="mt-2 group">
            <summary className="text-[11px] text-slate-500 cursor-pointer select-none list-none flex items-center gap-1.5 py-1 hover:text-slate-400 transition-colors">
              <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-flex items-center justify-center text-[9px] group-hover:border-slate-500 transition-colors">i</span>
              View {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''} from transcript
            </summary>

            {msg.sources.map((chunk, i) => (
              <div key={i} className="mt-1.5 px-3 py-2.5 bg-black/25 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-mono leading-relaxed max-h-20 overflow-hidden relative">
                "{chunk.slice(0, 220)}..."
              </div>
            ))}
          </details>
        )}
      </div>

      {/* User avatar — only on right side */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl shrink-0 bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xs mb-0.5 shadow-sm">
          👤
        </div>
      )}
    </div>
  )
}


function TypingIndicator() {
  return (
    <div className="animate-fade-in-up flex items-end gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center text-sm shadow-[0_2px_12px_rgba(99,102,241,0.4)] border border-white/10 animate-bounce-subtle">
        🧠
      </div>

      <div className="px-5 py-4 bg-slate-800 border border-slate-700 rounded-[18px_18px_18px_4px] flex gap-2 items-center shadow-sm">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}


function EmptyState({ onShowUpload }) {
  const suggestions = [
    { icon: '🔍', text: 'What were the key decisions made?' },
    { icon: '✅', text: 'Who was assigned the backend task?' },
    { icon: '⚠️', text: 'Were there any blockers mentioned?' },
    { icon: '📋', text: 'Summarize the action items' },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-10 text-center animate-fade-in">
      {/* Logo mark */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center text-3xl mb-6 shadow-[0_8px_32px_rgba(99,102,241,0.4)] border border-white/10 animate-float">
        🧠
      </div>

      <h2 className="text-2xl font-bold text-white mb-2.5 tracking-tight">
        Welcome to MeetMind
      </h2>

      <p className="text-slate-400 text-sm max-w-[380px] leading-relaxed mb-8">
        Upload a meeting recording and chat with it like an AI assistant.
        Ask questions, get summaries, and find action items in seconds.
      </p>

      {/* CTA button */}
      <button
        onClick={onShowUpload}
        className="px-8 py-3.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(99,102,241,0.5)] transition-all duration-300 mb-12 font-sans relative overflow-hidden group/btn"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer pointer-events-none" />
        <span className="relative z-10 flex items-center gap-2">
          Upload Meeting Recording <span className="group-hover/btn:translate-x-1 transition-transform duration-300">→</span>
        </span>
      </button>

      {/* Example questions */}
      <div className="w-full max-w-[480px]">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Example questions you can ask
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {suggestions.map((s, i) => (
            <div key={i} className="p-3.5 bg-slate-800/50 border border-slate-700/80 rounded-xl flex items-start gap-3 text-left hover:bg-slate-800 transition-colors shadow-sm">
              <span className="text-lg shrink-0 w-6 text-center">{s.icon}</span>
              <span className="text-xs text-slate-300 leading-relaxed pt-0.5">{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ── Main ChatWindow component ──────────────────────────────────────────
export default function ChatWindow({ meeting, onShowUpload, onDeleteMeeting }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef()
  const textareaRef = useRef()


  // ── Load initial AI greeting when meeting changes ──────────────────
  useEffect(() => {
    if (!meeting) {
      setMessages([])
      return
    }

    // Build greeting message with summary
    const greeting = meeting.summary
      ? `I've analyzed **${meeting.title}**, including spoken words and any visible slide text.\n\n**Summary:** ${meeting.summary}\n\nAsk me anything about this meeting!`
      : `I've loaded **${meeting.title}**. Ask me anything about this meeting, including what was shown on the slides!`

    setMessages([{
      role: 'assistant',
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
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources
      }])

    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setMessages(prev => [...prev, {
        role: 'assistant',
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
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 border-l border-slate-800">
        <EmptyState onShowUpload={onShowUpload} />
      </div>
    )
  }

  // ── Meeting still processing ───────────────────────────────────────
  if (meeting.status === 'processing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-900 animate-fade-in border-l border-slate-800">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-white text-[15px] font-medium">
          Processing your meeting...
        </p>
        <p className="text-slate-400 text-[13px] text-center max-w-[320px] leading-relaxed">
          Whisper is transcribing the audio.<br />
          This may take a few minutes.
        </p>
      </div>
    )
  }

  // ── Meeting failed ─────────────────────────────────────────────────
  if (meeting.status === 'failed') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-slate-900 animate-fade-in border-l border-slate-800">
        <div className="text-[40px] mb-2">⚠️</div>
        <p className="text-red-400 text-[15px] font-medium">
          Processing failed
        </p>
        <p className="text-slate-400 text-[13px] text-center leading-relaxed">
          Something went wrong while processing this meeting.<br />
          Try uploading the recording again.
        </p>
        <button
          onClick={onShowUpload}
          className="mt-4 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-[13px] transition-colors shadow-sm font-sans"
        >
          Upload Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 border-l border-slate-800">

      {/* ── Meeting header bar ──────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3 shrink-0 bg-slate-900/95 backdrop-blur z-10 sticky top-0 shadow-sm">
        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)] shrink-0" />

        <div className="flex-1 overflow-hidden">
          <div className="font-semibold text-[15px] text-white whitespace-nowrap overflow-hidden text-ellipsis">
            {meeting.title}
          </div>
          {(meeting.action_items?.length > 0 || meeting.decisions?.length > 0) && (
            <div className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5 flex gap-2">
              {meeting.action_items?.length > 0 && <span>{meeting.action_items.length} action item{meeting.action_items.length !== 1 ? 's' : ''}</span>}
              {meeting.action_items?.length > 0 && meeting.decisions?.length > 0 && <span>·</span>}
              {meeting.decisions?.length > 0 && <span>{meeting.decisions.length} decision{meeting.decisions.length !== 1 ? 's' : ''}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onDeleteMeeting && (
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete this meeting?')) {
                  await onDeleteMeeting(meeting.id)
                }
              }}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-red-500/10 border border-slate-700 hover:border-red-500 rounded-lg text-slate-300 hover:text-red-400 text-[13px] transition-all whitespace-nowrap shadow-sm group flex items-center gap-1.5 font-medium relative overflow-hidden"
              title="Delete Meeting"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
              <span className="relative z-10 text-red-400 group-hover:text-red-300 transition-colors">Delete</span>
            </button>
          )}

          <button
            onClick={onShowUpload}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-indigo-500/10 border border-slate-700 hover:border-indigo-500 rounded-lg text-slate-300 hover:text-indigo-400 text-[13px] transition-all whitespace-nowrap shadow-sm group flex items-center gap-1.5 font-medium relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
            <span className="text-base leading-none transform group-hover:scale-110 transition-transform -mt-0.5 relative z-10 text-indigo-400 group-hover:text-indigo-300">+</span>
            <span className="relative z-10">Upload New</span>
          </button>
        </div>
      </div>

      {/* ── Action items strip ──────────────────────────────────────── */}
      {meeting.action_items?.length > 0 && (
        <div className="px-6 py-3 border-b border-slate-800/50 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 bg-slate-900/50">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap shrink-0 mr-1">
            Actions:
          </span>

          {meeting.action_items.map((item, i) => (
            <div key={i} className="px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-2.5 hover:bg-indigo-500/20 transition-colors shadow-sm animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              {item.task?.slice(0, 45) || 'Task'}
              {item.assignee && item.assignee !== 'Unassigned' && (
                <span className="text-[10px] text-indigo-400 font-medium">
                  · {item.assignee}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Decisions strip ─────────────────────────────────────────── */}
      {meeting.decisions?.length > 0 && (
        <div className="px-6 py-3 border-b border-slate-800/50 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 bg-slate-900/50">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap shrink-0 mr-1">
            Decisions:
          </span>

          {meeting.decisions.map((decision, i) => (
            <div key={i} className="px-3.5 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-xs text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-2.5 hover:bg-teal-500/20 transition-colors shadow-sm animate-fade-in" style={{ animationDelay: `${(i + (meeting.action_items?.length || 0)) * 50}ms` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/80 shrink-0" />
              {decision.slice(0, 60)}...
            </div>
          ))}
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4 custom-scrollbar scroll-smooth">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────── */}
      <div className="px-6 pt-3 pb-6 shrink-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent relative z-10">
        <div className="flex gap-2 items-end bg-slate-800 border border-slate-700/80 rounded-2xl p-2.5 pl-5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-lg hover:border-slate-600">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this meeting..."
            rows={1}
            className="flex-1 bg-transparent border-none text-white text-[15px] resize-none outline-none font-sans leading-relaxed max-h-[120px] overflow-y-auto py-1.5 placeholder-slate-500 custom-scrollbar"
          />

          {/* Send button */}
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className={`w-[42px] h-[42px] rounded-xl shrink-0 flex items-center justify-center text-lg transition-all
              ${input.trim() && !loading
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }`}
          >
            ↑
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-3 font-medium tracking-wide">
          Enter to send · Shift+Enter for newline
        </p>
      </div>

    </div>
  )
}