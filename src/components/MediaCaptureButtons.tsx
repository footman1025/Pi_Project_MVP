import { useEffect, useRef, useState } from 'react'
import { Mic, Video, Square, Loader2, X } from 'lucide-react'

type Mode = 'audio' | 'video' | null

type Props = {
  disabled?: boolean
  onCaptured: (file: File) => void | Promise<void>
  onError?: (message: string) => void
}

function pickMime(kind: 'audio' | 'video') {
  const candidates =
    kind === 'audio'
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

export default function MediaCaptureButtons({ disabled, onCaptured, onError }: Props) {
  const [mode, setMode] = useState<Mode>(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [sending, setSending] = useState(false)
  const mediaRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const previewRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxRef = useRef(60)
  const stopRef = useRef<() => void>(() => {})

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recorderRef.current = null
    chunksRef.current = []
    mediaRef.current?.getTracks().forEach(t => t.stop())
    mediaRef.current = null
    if (previewRef.current) previewRef.current.srcObject = null
    setRecording(false)
    setSeconds(0)
    setMode(null)
  }

  useEffect(() => () => cleanup(), [])

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      setRecording(false)
      rec.stop()
    } else {
      cleanup()
    }
  }
  stopRef.current = stop

  const start = async (next: 'audio' | 'video') => {
    if (disabled || sending) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError?.('Recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        next === 'audio'
          ? { audio: true }
          : { audio: true, video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } } },
      )
      mediaRef.current = stream
      maxRef.current = next === 'video' ? 20 : 60
      setMode(next)
      setSeconds(0)

      if (next === 'video') {
        requestAnimationFrame(() => {
          if (previewRef.current) {
            previewRef.current.srcObject = stream
            void previewRef.current.play().catch(() => {})
          }
        })
      }

      const mime = pickMime(next)
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const type = recorder.mimeType || (next === 'audio' ? 'audio/webm' : 'video/webm')
        const blob = new Blob(chunksRef.current, { type })
        const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'
        const file = new File(
          [blob],
          next === 'audio' ? `voice-${Date.now()}.${ext}` : `video-${Date.now()}.${ext}`,
          { type },
        )
        mediaRef.current?.getTracks().forEach(t => t.stop())
        mediaRef.current = null
        setSending(true)
        try {
          await onCaptured(file)
        } catch (err: unknown) {
          onError?.(err instanceof Error ? err.message : 'Failed to send recording')
        } finally {
          setSending(false)
          cleanup()
        }
      }
      recorderRef.current = recorder
      recorder.start(250)
      setRecording(true)
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          const n = s + 1
          if (n >= maxRef.current) stopRef.current()
          return n
        })
      }, 1000)
    } catch {
      cleanup()
      onError?.(
        next === 'audio'
          ? 'Microphone permission is required for voice messages.'
          : 'Camera & microphone permission is required for video messages.',
      )
    }
  }

  const cancel = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.ondataavailable = null
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      }
    } catch { /* ignore */ }
    cleanup()
  }

  const maxSeconds = mode === 'video' ? 20 : 60

  return (
    <>
      <button
        type="button"
        disabled={disabled || sending || !!mode}
        onClick={() => start('audio')}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
        title="Voice message"
        aria-label="Record voice message"
      >
        <Mic size={18} />
      </button>
      <button
        type="button"
        disabled={disabled || sending || !!mode}
        onClick={() => start('video')}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
        title="Video message"
        aria-label="Record video message"
      >
        <Video size={18} />
      </button>

      {(mode || sending) && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(160deg, #12182b, #0a0f1c)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-white text-sm font-semibold">
                {sending ? 'Sending…' : mode === 'video' ? 'Recording video' : 'Recording voice'}
              </p>
              {!sending && (
                <button type="button" onClick={cancel} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                  <X size={16} />
                </button>
              )}
            </div>

            {mode === 'video' && (
              <video
                ref={previewRef}
                muted
                playsInline
                autoPlay
                className="w-full aspect-square object-cover bg-black"
              />
            )}

            {mode === 'audio' && (
              <div className="px-6 py-10 flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${recording ? 'bg-rose-500/20 animate-pulse' : 'bg-white/5'}`}>
                  <Mic size={28} className={recording ? 'text-rose-400' : 'text-slate-400'} />
                </div>
                <p className="text-slate-400 text-xs">Speak now — tap stop when done</p>
              </div>
            )}

            <div className="px-4 py-4 flex items-center justify-between gap-3 border-t border-white/10">
              <p className="text-teal-300 text-sm font-mono tabular-nums">
                {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
                <span className="text-slate-500"> / {String(Math.floor(maxSeconds / 60)).padStart(2, '0')}:{String(maxSeconds % 60).padStart(2, '0')}</span>
              </p>
              {sending ? (
                <Loader2 size={20} className="animate-spin text-teal-400" />
              ) : (
                <button
                  type="button"
                  onClick={stop}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-400 transition-colors"
                >
                  <Square size={14} fill="currentColor" />
                  Stop & send
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
