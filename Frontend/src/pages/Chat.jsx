import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import UploadMeeting from '../components/UploadMeeting'
import api from '../lib/api'


export default function Chat() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [activeMeeting, setActiveMeeting] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [fetchError, setFetchError] = useState('')


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
      id: data.meeting_id,
      title: data.title,
      status: data.status,
      created_at: new Date().toISOString(),
      summary: data.summary,
      action_items: data.action_items
    }

    // Add to top of sidebar list
    setMeetings(prev => [newMeeting, ...prev])

    // Auto-select the new meeting
    setActiveMeeting(newMeeting)

    // Hide upload panel, show chat
    setShowUpload(false)
  }


  // ── Delete meeting ─────────────────────────────────────────────────────
  const handleDeleteMeeting = async (meetingId) => {
    setFetchError('')
    try {
      await api.delete(`/meetings/${meetingId}`)

      // Remove from list
      setMeetings(prev => prev.filter(m => m.id !== meetingId))

      // Clear active meeting if it was the deleted one
      if (activeMeeting?.id === meetingId) {
        setActiveMeeting(null)
      }
    } catch (err) {
      console.error(err)
      setFetchError('Failed to delete meeting.')
    }
  }


  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
      <main className="flex-1 flex flex-col overflow-hidden relative bg-background">
        {showUpload ? (
          /* ── Upload Panel ──────────────────────────────────────────── */
          <div className="flex-1 flex flex-col overflow-y-auto w-full animate-fade-in">
            {/* Upload panel header */}
            <div className="px-8 py-5 border-b border-slate-800 flex items-center gap-4 shrink-0 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
              <button
                onClick={() => setShowUpload(false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                &larr; Back
              </button>
              <h2 className="text-lg font-semibold text-white">
                Upload Meeting Recording
              </h2>
            </div>

            {/* Upload panel body */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
              {/* Title */}
              <div className="text-center mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <h3 className="text-2xl font-bold text-white mb-3">
                  New Meeting
                </h3>
                <p className="text-slate-400 text-sm max-w-[420px] mx-auto leading-relaxed">
                  Upload any recording and AI will transcribe, summarize,
                  extract action items, and make it fully searchable.
                </p>
              </div>

              {/* Upload component */}
              <div className="w-full max-w-2xl animate-slide-up" style={{ animationDelay: '200ms' }}>
                <UploadMeeting onUploadComplete={handleUploadComplete} />
              </div>

              {/* Processing pipeline info card */}
              <div className="w-full max-w-[480px] mt-12 p-6 glass-card rounded-2xl animate-slide-up" style={{ animationDelay: '300ms' }}>
                <p className="text-xs font-semibold text-slate-500 mb-5 uppercase tracking-widest">
                  What happens after upload
                </p>

                {[
                  { icon: '🎵', label: 'Audio extraction', sub: 'ffmpeg strips audio from video' },
                  { icon: '🗣️', label: 'Transcription', sub: 'Whisper converts speech to text' },
                  { icon: '🤖', label: 'Summary & action items', sub: 'Groq Llama3 analyzes the transcript' },
                  { icon: '🔍', label: 'Semantic search index', sub: 'ChromaDB stores embeddings locally' },
                ].map(({ icon, label, sub }, i, arr) => (
                  <div key={i} className={`flex items-start gap-4 ${i < arr.length - 1 ? 'mb-4 pb-4 border-b border-slate-800/50' : ''}`}>
                    <span className="text-2xl shrink-0">{icon}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-200 mb-0.5">{label}</div>
                      <div className="text-xs text-slate-500">{sub}</div>
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
            onDeleteMeeting={handleDeleteMeeting}
          />
        )}

        {/* Global fetch error toast */}
        {fetchError && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 text-red-400 text-sm flex items-center gap-3 z-[100] shadow-lg shadow-red-500/5 animate-slide-up">
            <span>⚠️</span>
            <span>{fetchError}</span>
            <button
              onClick={fetchMeetings}
              className="ml-2 text-red-400 hover:text-red-300 underline font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
