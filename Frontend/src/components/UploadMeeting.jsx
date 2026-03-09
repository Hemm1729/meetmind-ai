import { useState, useRef } from 'react'
import api from '../lib/api'


const ACCEPTED_EXTENSIONS = ['.mp4', '.mp3', '.wav', '.mkv', '.avi', '.mov', '.webm', '.m4a']
const MAX_SIZE_MB          = 500
const MAX_SIZE_BYTES       = MAX_SIZE_MB * 1024 * 1024


export default function UploadMeeting({ onUploadComplete }) {
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stage, setStage]         = useState('')     // current processing stage label
  const [progress, setProgress]   = useState(0)      // upload % (0-100)
  const [error, setError]         = useState('')
  const [fileName, setFileName]   = useState('')

  const inputRef = useRef()


  // ── Validate file before uploading ────────────────────────────────────
  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase()

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `File type "${ext}" is not supported. Please upload: ${ACCEPTED_EXTENSIONS.join(', ')}`
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Maximum size is ${MAX_SIZE_MB}MB.`
    }
    return null  // valid
  }


  // ── Format bytes into readable size ───────────────────────────────────
  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }


  // ── Main upload + processing handler ──────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return

    // Validate
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setFileName(file.name)
    setUploading(true)
    setError('')
    setProgress(0)
    setStage('Preparing upload...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      // ── Stage 1: Upload file ─────────────────────────────────────────
      setStage('Uploading to server...')

      const res = await api.post('/meetings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 100)
          setProgress(pct)

          if (pct < 100) {
            setStage(`Uploading... ${pct}%`)
          } else {
            // Upload done — now server is processing
            setStage('Extracting audio...')
            setProgress(100)
          }
        }
      })

      // ── Stage labels shown while server processes ────────────────────
      // These are just UX estimates — the real work is server-side
      await simulateStages([
        { label: 'Extracting audio with ffmpeg...',  duration: 1500 },
        { label: 'Transcribing with Whisper...',     duration: 3000 },
        { label: 'Generating summary & actions...',  duration: 1500 },
        { label: 'Building search index...',         duration: 1000 },
      ])

      setStage('✓ Meeting is ready!')

      // Small delay so user sees the success state
      await sleep(700)

      // Hand result back to Chat.jsx
      onUploadComplete(res.data)

    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setUploading(false)
      setStage('')
      setProgress(0)
    }
  }


  // ── Simulate progress stage labels during server processing ───────────
  const simulateStages = async (stages) => {
    for (const s of stages) {
      setStage(s.label)
      await sleep(s.duration)
    }
  }

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))


  // ── Drag and drop handlers ─────────────────────────────────────────────
  const onDragOver = (e) => {
    e.preventDefault()
    if (!uploading) setDragging(true)
  }

  const onDragLeave = (e) => {
    e.preventDefault()
    setDragging(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (uploading) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }


  return (
    <div style={{ padding: '0 32px', maxWidth: 560, margin: '0 auto', width: '100%' }}>

      {/* ── Drop zone ─────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${
            dragging   ? 'var(--accent)'        :
            uploading  ? 'var(--border)'         :
            error      ? 'rgba(239,68,68,0.4)'   :
                         'var(--border-bright)'
          }`,
          borderRadius: 18,
          padding: '48px 32px',
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          background: dragging
            ? 'var(--accent-glow)'
            : uploading
            ? 'var(--bg-card)'
            : 'var(--bg-card)',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={onInputChange}
        />


        {/* ── Uploading state ──────────────────────────────────────── */}
        {uploading ? (
          <div>

            {/* Animated spinner */}
            <div style={{
              width: 56, height: 56,
              border: '3px solid var(--border)',
              borderTop: `3px solid var(--accent)`,
              borderRadius: '50%',
              margin: '0 auto 20px',
            }} className="spin-slow" />

            {/* File name */}
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: 12,
              marginBottom: 10,
              fontFamily: 'Space Mono',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 300,
              margin: '0 auto 10px'
            }}>
              {fileName}
            </p>

            {/* Stage label */}
            <p style={{
              color: 'var(--text-primary)',
              fontSize: 15,
              fontWeight: 500,
              marginBottom: 20
            }}>
              {stage}
            </p>

            {/* Progress bar — only during actual upload (progress < 100) */}
            {progress < 100 && (
              <div style={{
                width: '100%',
                maxWidth: 320,
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                margin: '0 auto 12px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #6366f1, #22d3a0)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}

            {/* Estimated time note */}
            <p style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              marginTop: 8
            }}>
              Please keep this tab open while processing
            </p>

          </div>

        ) : (

          /* ── Idle / drop state ───────────────────────────────────── */
          <div>

            {/* Icon */}
            <div style={{
              width: 64, height: 64,
              borderRadius: 18,
              background: dragging
                ? 'rgba(99,102,241,0.15)'
                : 'var(--bg-hover)',
              border: `1px solid ${dragging ? 'var(--accent)' : 'var(--border-bright)'}`,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 20px',
              transition: 'all 0.2s'
            }}>
              {dragging ? '📂' : '🎙️'}
            </div>

            {/* Heading */}
            <p style={{
              color: 'var(--text-primary)',
              fontSize: 16, fontWeight: 600,
              marginBottom: 8
            }}>
              {dragging
                ? 'Drop it here!'
                : 'Drop your meeting recording here'
              }
            </p>

            {/* Sub text */}
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: 13,
              marginBottom: 20
            }}>
              or{' '}
              <span style={{
                color: 'var(--accent)',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}>
                click to browse
              </span>
            </p>

            {/* Accepted formats */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              justifyContent: 'center',
              marginBottom: 16
            }}>
              {ACCEPTED_EXTENSIONS.map(ext => (
                <span key={ext} style={{
                  padding: '3px 10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontFamily: 'Space Mono'
                }}>
                  {ext}
                </span>
              ))}
            </div>

            {/* Max size note */}
            <p style={{
              color: 'var(--text-muted)',
              fontSize: 11
            }}>
              Maximum file size: {MAX_SIZE_MB}MB
            </p>

          </div>
        )}

      </div>


      {/* ── Error message ─────────────────────────────────────────────── */}
      {error && (
        <div style={{
          marginTop: 14,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{
              color: '#f87171',
              fontSize: 13,
              marginBottom: 6
            }}>
              {error}
            </p>
            <button
              onClick={() => {
                setError('')
                inputRef.current?.click()
              }}
              style={{
                background: 'none', border: 'none',
                color: '#f87171', fontSize: 12,
                cursor: 'pointer', padding: 0,
                textDecoration: 'underline',
                fontFamily: 'DM Sans'
              }}
            >
              Try again
            </button>
          </div>
        </div>
      )}


      {/* ── Tips card ─────────────────────────────────────────────────── */}
      {!uploading && !error && (
        <div style={{
          marginTop: 16,
          padding: '14px 18px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
          <div>
            <p style={{
              fontSize: 12, fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 4
            }}>
              Tips for best results
            </p>
            <ul style={{
              margin: 0, padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}>
              {[
                'Clear audio with minimal background noise works best',
                'MP3 or WAV files process faster than video formats',
                'Longer recordings (1hr+) may take 10–15 minutes',
                'Keep this tab open during processing',
              ].map((tip, i) => (
                <li key={i} style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-start'
                }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  )
}
