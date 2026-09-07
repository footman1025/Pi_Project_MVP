import { useEffect, useRef, useState } from 'react'
import { playConnectSound, unlockConnectSound } from '../lib/connectSound'

const STORAGE_KEY = 'pi_hello_v4'
const ENTER_MS = 600
const HOLD_MS = 2400
const EXIT_MS = 800

/** Matches the mascot plate so square photo edges dissolve into the page. */
const PLATE = '#0a1a1f'

type Phase = 'enter' | 'hello' | 'exit' | 'done'

type Props = {
  onFinished: () => void
}

/**
 * First-paint Pi intro: mascot says Hello + alien ring, then fades into the app.
 * Soft-blends the photo cornice into the background with a light futuristic halo.
 */
export default function PiHelloIntro({ onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>('enter')
  const [needsTap, setNeedsTap] = useState(false)
  const sounded = useRef(false)
  const finished = useRef(false)

  const finish = () => {
    if (finished.current) return
    finished.current = true
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setPhase('done')
    onFinished()
  }

  const playHello = async () => {
    if (sounded.current) return true
    await unlockConnectSound()
    const ok = await playConnectSound()
    if (ok) {
      sounded.current = true
      setNeedsTap(false)
    } else {
      setNeedsTap(true)
    }
    return ok
  }

  useEffect(() => {
    let t1: number | undefined
    let t2: number | undefined
    let t3: number | undefined
    let tapHint: number | undefined

    void playHello().then(ok => {
      if (!ok) {
        tapHint = window.setTimeout(() => {
          if (!sounded.current) setNeedsTap(true)
        }, 350)
      }
    })

    t1 = window.setTimeout(() => setPhase('hello'), ENTER_MS)
    t2 = window.setTimeout(() => setPhase('exit'), ENTER_MS + HOLD_MS)
    t3 = window.setTimeout(() => finish(), ENTER_MS + HOLD_MS + EXIT_MS)

    return () => {
      if (t1) clearTimeout(t1)
      if (t2) clearTimeout(t2)
      if (t3) clearTimeout(t3)
      if (tapHint) clearTimeout(tapHint)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'done') return null

  const exiting = phase === 'exit'
  const showCopy = phase === 'hello' || phase === 'exit'
  const active = phase === 'hello'

  return (
    <div
      role="dialog"
      aria-label="Meet Pi"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 42%, #123038 0%, ${PLATE} 55%, #050d10 100%)`,
        transition: `opacity ${EXIT_MS}ms ease`,
        opacity: exiting ? 0 : 1,
        pointerEvents: exiting ? 'none' : 'auto',
      }}
      onPointerDown={() => {
        void playHello()
      }}
    >
      <div
        className="flex flex-col items-center justify-center w-full h-full px-4 py-8"
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'scale(0.94)' : 'scale(1)',
          transition: 'opacity 0.55s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Stage: soft-blend photo + subtle alien orbit (not a picture frame) */}
        <div
          className="relative"
          style={{
            width: 'min(88vw, 72vh, 520px)',
            aspectRatio: '1 / 1',
            animation: active ? 'piHelloBob 1.8s ease-in-out infinite' : undefined,
          }}
        >
          {/* Soft ambient bloom */}
          <div
            aria-hidden
            className="absolute inset-[-8%] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 48%, rgba(45,212,191,0.18) 0%, rgba(56,189,248,0.06) 42%, transparent 68%)',
              opacity: active ? 1 : 0.65,
              transition: 'opacity 0.5s ease',
              filter: 'blur(2px)',
            }}
          />

          {/* Thin orbital ring — futuristic / AI cue, not a cornice */}
          <svg
            aria-hidden
            className="absolute inset-[-6%] w-[112%] h-[112%] pointer-events-none"
            viewBox="0 0 100 100"
            style={{
              opacity: active ? 0.9 : 0.55,
              transition: 'opacity 0.5s ease',
              animation: active ? 'piOrbitSpin 18s linear infinite' : undefined,
            }}
          >
            <defs>
              <linearGradient id="piOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(45,212,191,0)" />
                <stop offset="35%" stopColor="rgba(45,212,191,0.55)" />
                <stop offset="55%" stopColor="rgba(125,211,252,0.35)" />
                <stop offset="100%" stopColor="rgba(45,212,191,0)" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke="url(#piOrbitGrad)"
              strokeWidth="0.35"
              strokeDasharray="8 14 3 22"
              strokeLinecap="round"
            />
            {/* Small node accents */}
            <circle cx="50" cy="3" r="0.9" fill="rgba(45,212,191,0.85)" />
            <circle cx="97" cy="50" r="0.7" fill="rgba(125,211,252,0.7)" />
            <circle cx="50" cy="97" r="0.6" fill="rgba(45,212,191,0.55)" />
          </svg>

          {/* Inner soft vignette plate — kills hard square edge */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 72% 72% at 50% 48%, #000 58%, rgba(0,0,0,0.55) 72%, transparent 88%)',
              maskImage:
                'radial-gradient(ellipse 72% 72% at 50% 48%, #000 58%, rgba(0,0,0,0.55) 72%, transparent 88%)',
            }}
          >
            <img
              src="/pi-hello.jpg"
              alt="Pi"
              width={1024}
              height={1024}
              className="select-none pointer-events-none w-full h-full"
              style={{
                objectFit: 'cover',
                objectPosition: 'center 42%',
                display: 'block',
                // Feather remaining hard corners into plate color
                filter: 'contrast(1.02) saturate(1.05)',
              }}
              draggable={false}
            />
            {/* Edge tint matching page so leftover plate melts away */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `
                  radial-gradient(ellipse 80% 80% at 50% 48%, transparent 50%, ${PLATE} 92%),
                  linear-gradient(to bottom, ${PLATE}00 70%, ${PLATE}cc 100%)
                `,
              }}
            />
          </div>
        </div>

        <p
          className="mt-6 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white text-center"
          style={{
            opacity: showCopy ? 1 : 0,
            transform: showCopy ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
            textShadow: '0 0 28px rgba(45,212,191,0.35)',
          }}
        >
          Hello
        </p>
        <p
          className="mt-2 text-base sm:text-lg text-teal-200/85 font-medium text-center"
          style={{
            opacity: showCopy ? 1 : 0,
            transition: 'opacity 0.45s ease 0.25s',
          }}
        >
          Let me introduce you to Pi
        </p>

        {needsTap && !exiting && (
          <button
            type="button"
            className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 hover:text-teal-200 transition-colors"
            onClick={e => {
              e.stopPropagation()
              void playHello()
            }}
          >
            Tap for hello sound
          </button>
        )}
      </div>

      <style>{`
        @keyframes piHelloBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes piOrbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/** True if this browser session already saw the Pi hello intro. */
export function hasSeenPiHello(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}
