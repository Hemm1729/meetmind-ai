import { useState, useRef } from 'react'
import api from '../lib/api'


const ACCEPTED_EXTENSIONS = ['.mp4', '.mp3', '.wav', '.mkv', '.avi', '.mov', '.webm', '.m4a']
const MAX_SIZE_MB = 500
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024


export default function UploadMeeting({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stage, setStage] = useState('')     // current processing stage label
  const [progress, setProgress] = useState(0)      // upload % (0-100)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

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
        { label: 'Extracting audio with ffmpeg...', duration: 1500 },
        { label: 'Transcribing with Whisper...', duration: 3000 },
        { label: 'Generating summary & actions...', duration: 1500 },
        { label: 'Building search index...', duration: 1000 },
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
    <div className="px-8 max-w-[560px] mx-auto w-full">

      {/* ── Drop zone ─────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`rounded-2xl px-8 py-12 text-center relative overflow-hidden transition-all duration-200 border-2 border-dashed ${uploading ? 'cursor-default bg-slate-800/80 border-slate-700/80' : 'cursor-pointer'
          } ${dragging ? 'bg-indigo-500/10 border-indigo-500 scale-[1.02]' :
            error ? 'border-red-500/40 bg-slate-800' :
              !uploading ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/80' : ''
          }`}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={onInputChange}
        />

        {/* ── Uploading state ──────────────────────────────────────── */}
        {uploading ? (
          <div className="animate-fade-in-up">
            {/* Animated spinner */}
            <div className="w-14 h-14 border-4 border-slate-700 border-t-indigo-500 rounded-full mx-auto mb-5 animate-spin" />

            {/* File name */}
            <p className="text-slate-400 text-xs mb-2.5 font-mono truncate max-w-[300px] mx-auto">
              {fileName}
            </p>

            {/* Stage label */}
            <p className="text-white text-[15px] font-medium mb-5">
              {stage}
            </p>

            {/* Progress bar — only during actual upload (progress < 100) */}
            {progress < 100 && (
              <div className="w-full max-w-[320px] h-1.5 bg-slate-700 rounded-full mx-auto mb-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Estimated time note */}
            <p className="text-slate-500 text-xs mt-2">
              Please keep this tab open while processing
            </p>
          </div>
        ) : (
          /* ── Idle / drop state ───────────────────────────────────── */
          <div className="animate-fade-in">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl transition-all duration-200 ${dragging ? 'bg-indigo-500/15 border border-indigo-500/50 scale-110 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-slate-700/50 border border-slate-600 shadow-sm'
              }`}>
              {dragging ? '📂' : '🎙️'}
            </div>

            {/* Heading */}
            <p className="text-white text-base font-semibold mb-2">
              {dragging ? 'Drop it here!' : 'Drop your meeting recording here'}
            </p>

            {/* Sub text */}
            <p className="text-slate-400 text-[13px] mb-5">
              or <span className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer transition-colors">click to browse</span>
            </p>

            {/* Accepted formats */}
            <div className="flex flex-wrap justify-center gap-1.5 mb-4">
              {ACCEPTED_EXTENSIONS.map(ext => (
                <span key={ext} className="px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[11px] text-slate-500 font-mono shadow-sm">
                  {ext}
                </span>
              ))}
            </div>

            {/* Max size note */}
            <p className="text-slate-500 text-[11px]">
              Maximum file size: {MAX_SIZE_MB}MB
            </p>
          </div>
        )}
      </div>

      {/* ── Error message ─────────────────────────────────────────────── */}
      {error && (
        <div className="mt-3.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-2.5 animate-fade-in-up">
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-red-400 text-[13px] mb-1.5 leading-snug">
              {error}
            </p>
            <button
              onClick={() => {
                setError('')
                inputRef.current?.click()
              }}
              className="bg-transparent border-none text-red-500 hover:text-red-400 text-xs cursor-pointer p-0 underline font-sans transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Tips card ─────────────────────────────────────────────────── */}
      {!uploading && !error && (
        <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700/80 rounded-xl flex items-start gap-3 animate-fade-in shadow-sm">
          <span className="text-base shrink-0 mt-[1px]">💡</span>
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-1.5">
              Tips for best results
            </p>
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
              {[
                'Clear audio with minimal background noise works best',
                'MP3 or WAV files process faster than video formats',
                'Longer recordings (1hr+) may take 10–15 minutes',
                'Keep this tab open during processing',
              ].map((tip, i) => (
                <li key={i} className="text-[11px] text-slate-400 flex gap-1.5 items-start leading-snug">
                  <span className="text-indigo-400 shrink-0 font-bold">·</span>
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
