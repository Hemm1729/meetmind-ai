import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import UploadMeeting from '../components/UploadMeeting'
import api from '../lib/api'


export default function Chat() {
  const { user, logout }                        = useAuth()
  const navigate                                = useNavigate()
  const [meetings, setMeetings]                 = useState([])
  const [activeMeeting, setActiveMeeting]       = useState(null)
  const [showUpload, setShowUpload]             = useState(false)
  const [loadingMeetings, setLoadingMeetings]   = useState(true)
  const [fetchError, setFetchError]             = useState('')


  // ── Fetch meetings list on mount ───────────────────────────────────────
  useEffect(() => {
    fetchMeetings()
  }, [])


  const fetchMeetings = async () => {
    setLoadingMeetings(true)
    setFetchError('')
    try {
      const res = await api.get('/meetings/list')
      setMeetings(res.data.meetings || [])
    } catch (err) {
      if (err.response?.status === 401) {
        // Token invalid — log out
        handleLogout()
      } else {
        setFetchError('Failed to load meetings.')
      }
    } finally {
      setLoadingMeetings(false)
    }
  }


  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }


  // ── Select a meeting from sidebar ──────────────────────────────────────
  const handleSelectMeeting = async (m) => {
    setShowUpload(false)

    // If still processing, just show it without fetching full details
    if (m.status !== 'ready') {
      setActiveMeeting(m)
      return
    }

    try {
      // Fetch full details: summary, action items, transcript
      const res = await api.get(`/meetings/${m.id}`)
      setActiveMeeting(res.data)
    } catch {
      // Fallback to basic meeting data
      setActiveMeeting(m)
    }
  }


  // ── Open upload panel ──────────────────────────────────────────────────
  const handleNewMeeting = () => {
    setActiveMeeting(null)
    setShowUpload(true)
  }


  // ── Called when upload + processing finishes ───────────────────────────
  const handleUploadComplete = (data) => {
    // Build meeting object from upload response
    const newMeeting = {
      id:           data.meeting_id,
      title:        data.title,
      status:       data.status,
      created_at:   new Date().toISOString(),
      summary:      data.summary,
      action_items: data.action_items
    }

    // Add to top of sidebar list
    setMeetings(prev => [newMeeting, ...prev])

    // Auto-select the new meeting
    setActiveMeeting(newMeeting)

    // Hide upload panel, show chat
    setShowUpload(false)
  }


  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-primary)'
    }}>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <Sidebar
        meetings={meetings}
        activeMeeting={activeMeeting}
        onSelectMeeting={handleSelectMeeting}
        onNewMeeting={handleNewMeeting}
        user={user}
        onLogout={handleLogout}
        loading={loadingMeetings}
      />


      {/* ── Main content area ─────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>

        {showUpload ? (

          /* ── Upload Panel ──────────────────────────────────────────── */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto'
          }}>

            {/* Upload panel header */}
            <div style={{
              padding: '16px 28px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexShrink: 0
            }}>
              <button
                onClick={() => setShowUpload(false)}
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-bright)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  padding: '6px 12px',
                  fontFamily: 'DM Sans',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                ← Back
              </button>
              <h2 style={{
                fontSize: 16, fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                Upload Meeting Recording
              </h2>
            </div>

            {/* Upload panel body */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '40px 28px'
            }}>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <h3 style={{
                  fontSize: 20, fontWeight: 600,
                  color: 'var(--text-primary)', marginBottom: 8
                }}>
                  New Meeting
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: 13, maxWidth: 420, margin: '0 auto'
                }}>
                  Upload any recording and AI will transcribe, summarize,
                  extract action items, and make it fully searchable.
                </p>
              </div>

              {/* Upload component */}
              <UploadMeeting onUploadComplete={handleUploadComplete} />

              {/* Processing pipeline info card */}
              <div style={{
                maxWidth: 480,
                margin: '36px auto 0',
                padding: '20px 24px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 14
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 14,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  What happens after upload
                </p>

                {[
                  { icon: '🎵', label: 'Audio extraction',        sub: 'ffmpeg strips audio from video' },
                  { icon: '🗣️', label: 'Transcription',           sub: 'Whisper converts speech to text' },
                  { icon: '🤖', label: 'Summary & action items',  sub: 'Groq Llama3 analyzes the transcript' },
                  { icon: '🔍', label: 'Semantic search index',   sub: 'ChromaDB stores embeddings locally' },
                ].map(({ icon, label, sub }, i, arr) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    marginBottom: i < arr.length - 1 ? 14 : 0,
                    paddingBottom: i < arr.length - 1 ? 14 : 0,
                    borderBottom: i < arr.length - 1
                      ? '1px solid var(--border)'
                      : 'none'
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        color: 'var(--text-primary)',
                        marginBottom: 2
                      }}>{label}</div>
                      <div style={{
                        fontSize: 11,
                        color: 'var(--text-muted)'
                      }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        ) : (

          /* ── Chat Window ───────────────────────────────────────────── */
          <ChatWindow
            meeting={activeMeeting}
            onShowUpload={handleNewMeeting}
          />

        )}


        {/* Global fetch error toast */}
        {fetchError && (
          <div style={{
            position: 'absolute',
            bottom: 24, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10,
            padding: '10px 18px',
            color: '#f87171',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 100
          }}>
            <span>⚠️</span>
            <span>{fetchError}</span>
            <button
              onClick={fetchMeetings}
              style={{
                background: 'none', border: 'none',
                color: '#f87171', cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 13, fontFamily: 'DM Sans'
              }}
            >
              Retry
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
