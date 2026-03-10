import { useState, useRef, useEffect } from 'react'
import api from '../lib/api'

export default function LiveAssistant({ user }) {
    const [sessionId, setSessionId] = useState(null)
    const [transcript, setTranscript] = useState([])
    const [ocrContent, setOcrContent] = useState([])
    const [messages, setMessages] = useState([]) // Q&A thread
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const bottomRef = useRef()

    // 1. Poll the backend every 3 seconds for new transcript data 
    // ONLY if we have a session ID
    useEffect(() => {
        if (!sessionId) return

        const fetchTranscript = async () => {
            try {
                const res = await api.get(`/live-transcript/${sessionId}`)
                if (res.data) {
                    setTranscript(res.data.transcript || [])
                    setOcrContent(res.data.ocr || [])
                }
            } catch (err) {
                console.error("Live fetch error", err)
            }
        }

        // Fetch immediately upon connection
        fetchTranscript()

        const interval = setInterval(fetchTranscript, 3000)

        return () => clearInterval(interval)
    }, [sessionId])


    // Scroll to bottom when new transcripts or messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript, messages, loading])


    // Send a question to the live RAG endpoint
    const askQuestion = async () => {
        const question = input.trim()
        if (!question || loading || !sessionId) return

        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: question }])
        setLoading(true)

        try {
            const res = await api.post('/ask-live', {
                session_id: sessionId,
                question
            })

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.answer,
                sources: res.data.sources
            }])
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Failed to get answer." }])
        } finally {
            setLoading(false)
        }
    }


    // Auto-detect active session
    useEffect(() => {
        if (sessionId) return

        const checkActiveSession = async () => {
            try {
                const res = await api.get('/active-live-session')
                if (res.data && res.data.session_id) {
                    setSessionId(res.data.session_id)
                    setMessages([{ role: 'assistant', content: 'Auto-connected to live session! I am listening to your meeting right now. Ask me any questions.' }])
                }
            } catch (err) {
                console.error("Failed to check active sessions", err)
            }
        }

        // Check immediately
        checkActiveSession()

        // Poll every 3 seconds to auto-connect if they start the extension while this page is open
        const interval = setInterval(checkActiveSession, 3000)

        return () => clearInterval(interval)
    }, [sessionId])

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95 backdrop-blur z-10 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)] shrink-0 ${sessionId ? 'bg-teal-500 animate-pulse' : 'bg-slate-500'}`} />
                    <div className="font-semibold text-[15px] text-white">
                        Live Meeting Assistant
                    </div>
                </div>

                {sessionId && (
                    <button
                        onClick={() => {
                            setSessionId(null)
                            setTranscript([])
                            setOcrContent([])
                            setMessages([])
                        }}
                        className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-sm font-medium rounded-lg transition-colors"
                    >
                        Disconnect
                    </button>
                )}
            </div>

            {!sessionId ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl mb-6 shadow-inner border border-indigo-500/20">
                        🎙️
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Waiting for Capture...</h2>
                    <p className="text-slate-400 text-sm max-w-sm flex items-center gap-2 justify-center">
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="ml-2">Please start the MeetMind Live Chrome extension during your Google Meet. We'll connect automatically.</span>
                    </p>
                </div>
            ) : (

                <div className="flex-1 flex overflow-hidden">

                    {/* Left Panel: Live Transcript & OCR */}
                    <div className="w-1/2 flex flex-col border-r border-slate-800 bg-slate-900/50">
                        <div className="p-3 bg-slate-800/80 border-b border-slate-700/50 text-xs font-semibold text-slate-300 uppercase tracking-wider flex justify-between">
                            <span>Live Transcript</span>
                            <span className="text-teal-400 animate-pulse flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span> Listening
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar font-mono text-sm text-slate-300 space-y-4">
                            {transcript.length === 0 ? (
                                <p className="text-slate-500 italic">Waiting for speech...</p>
                            ) : (
                                transcript.map((text, i) => (
                                    <div key={i} className="animate-fade-in-up">
                                        <span className="text-indigo-400 mr-2 opacity-50 block text-[10px] mb-1">{(new Date()).toLocaleTimeString()}</span>
                                        {text}
                                    </div>
                                ))
                            )}

                            {ocrContent.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-slate-800 border-dashed">
                                    <p className="text-xs font-semibold text-amber-500 mb-3 uppercase">Slide Content Detected</p>
                                    {ocrContent.map((text, i) => (
                                        <div key={i} className="p-3 bg-slate-800 rounded mb-3 text-xs text-slate-400 border border-slate-700">
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>
                    </div>


                    {/* Right Panel: Q&A Chat */}
                    <div className="w-1/2 flex flex-col bg-slate-900">
                        <div className="p-3 bg-slate-800/80 border-b border-slate-700/50 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Live Q&A
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col mb-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                    <div className={`p-3 rounded-2xl text-[14px] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'}`}>
                                        {msg.content}
                                    </div>

                                    {msg.sources && msg.sources.length > 0 && (
                                        <details className="mt-1">
                                            <summary className="text-[10px] text-slate-500 cursor-pointer">View source context</summary>
                                            <div className="mt-1 p-2 bg-black/30 rounded text-[10px] text-slate-400 font-mono">
                                                {msg.sources[0].slice(0, 150)}...
                                            </div>
                                        </details>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm p-3 mr-auto w-16 flex justify-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input area */}
                        <div className="p-4 bg-slate-900 border-t border-slate-800">
                            <div className="flex gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1.5 focus-within:border-indigo-500 transition-colors">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && askQuestion()}
                                    placeholder="Ask a question about the current meeting..."
                                    className="flex-1 bg-transparent border-none text-white text-sm px-3 focus:outline-none"
                                />
                                <button
                                    onClick={askQuestion}
                                    disabled={!input.trim() || loading}
                                    className="p-2 bg-indigo-600 rounded-lg text-white disabled:opacity-50 disabled:bg-slate-700"
                                >
                                    ↑
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
