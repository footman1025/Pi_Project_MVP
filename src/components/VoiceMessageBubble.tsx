import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { formatFileSize } from '../lib/messageFiles'

type Props = {
  url: string
  size: number
  isMe?: boolean
}

function hashSeed(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Stable pseudo-waveform from message URL (looks natural, no decode needed). */
function buildWaveform(seedStr: string, bars = 32) {
  let seed = hashSeed(seedStr) || 1
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0xffffffff
  }
  return Array.from({ length: bars }, (_, i) => {
    const envelope = 0.35 + 0.65 * Math.sin((i / bars) * Math.PI)
    return Math.max(0.18, Math.min(1, envelope * (0.45 + rand() * 0.7)))
  })
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function VoiceMessageBubble({ url, size, isMe = false }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const bars = useMemo(() => buildWaveform(url), [url])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setCurrent(el.currentTime || 0)
    const onMeta = () => setDuration(el.duration || 0)
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('durationchange', onMeta)
    el.addEventListener('ended', onEnded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('durationchange', onMeta)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [url])

  const toggle = async () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      try {
        await el.play()
      } catch { /* autoplay / gesture */ }
    } else {
      el.pause()
    }
  }

  const seek = (index: number) => {
    const el = audioRef.current
    if (!el || !duration) return
    const t = (index / Math.max(1, bars.length - 1)) * duration
    el.currentTime = t
    setCurrent(t)
  }

  const progress = duration > 0 ? current / duration : 0
  const displayTime = playing || current > 0 ? formatTime(current) : formatTime(duration)

  return (
    <div
      className={`flex items-center gap-2.5 px-2.5 py-2.5 min-w-[220px] max-w-[280px] rounded-2xl ${
        isMe ? 'rounded-br-md' : 'rounded-bl-md border border-white/10'
      }`}
      style={
        isMe
          ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }
          : { background: 'rgba(255,255,255,0.06)' }
      }
    >
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={toggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
          isMe ? 'bg-white text-teal-700' : 'bg-teal-500 text-white'
        }`}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="flex items-end gap-[2px] h-7 cursor-pointer select-none"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const idx = Math.floor((x / rect.width) * bars.length)
            seek(Math.max(0, Math.min(bars.length - 1, idx)))
          }}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(current)}
          aria-label="Voice message progress"
        >
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress
            return (
              <span
                key={i}
                className="flex-1 rounded-full min-w-[2px] max-w-[3px]"
                style={{
                  height: `${Math.round(h * 100)}%`,
                  background: isMe
                    ? filled
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.35)'
                    : filled
                      ? '#2dd4bf'
                      : 'rgba(148,163,184,0.45)',
                }}
              />
            )
          })}
        </div>
        <div className={`mt-1 flex items-center gap-1.5 text-[11px] tabular-nums ${isMe ? 'text-white/75' : 'text-slate-500'}`}>
          <span>{displayTime}</span>
          <span className={isMe ? 'text-white/50' : 'text-slate-600'}>·</span>
          <span>{formatFileSize(size)}</span>
          {playing && (
            <span className={`ml-0.5 w-1.5 h-1.5 rounded-full ${isMe ? 'bg-white' : 'bg-teal-400'} animate-pulse`} />
          )}
        </div>
      </div>
    </div>
  )
}
