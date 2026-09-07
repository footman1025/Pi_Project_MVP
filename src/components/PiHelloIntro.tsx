import { useEffect, useRef, useState } from 'react'
import { playConnectSound, unlockConnectSound } from '../lib/connectSound'

const STORAGE_KEY = 'pi_hello_v5'
const ENTER_MS = 600
const HOLD_MS = 2400
const EXIT_MS = 800

/** Near-black sampled from the mascot plate (top / sides). */
const SCENE = '#01060c'

type Phase = 'enter' | 'hello' | 'exit' | 'done'

type Props = {
  onFinished: () => void
}

/**
 * First-paint Pi intro: soft-edged mascot + alien orbit, then fade into the app.
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
        background: SCENE,
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
        <div
          className="relative"
          style={{
            width: 'min(90vw, 74vh, 540px)',
            aspectRatio: '1 / 1',
            animation: active ? 'piHelloBob 1.8s ease-in-out infinite' : undefined,
          }}
        >
          {/* Soft ambient bloom behind character */}
          <div
            aria-hidden
            className="absolute inset-[-10%] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 48%, rgba(45,212,191,0.16) 0%, rgba(56,189,248,0.05) 40%, transparent 65%)',
              opacity: active ? 1 : 0.7,
              transition: 'opacity 0.5s ease',
            }}
          />

          {/* Futuristic orbit — outside the soft edge, not a photo frame */}
          <svg
            aria-hidden
            className="absolute inset-[-7%] w-[114%] h-[114%] pointer-events-none"
            viewBox="0 0 100 100"
            style={{
              opacity: active ? 0.95 : 0.6,
              transition: 'opacity 0.5s ease',
              animation: active ? 'piOrbitSpin 18s linear infinite' : undefined,
            }}
          >
            <defs>
              <linearGradient id="piOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(45,212,191,0)" />
                <stop offset="35%" stopColor="rgba(45,212,191,0.6)" />
                <stop offset="55%" stopColor="rgba(125,211,252,0.4)" />
                <stop offset="100%" stopColor="rgba(45,212,191,0)" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="47.5"
              fill="none"
              stroke="url(#piOrbitGrad)"
              strokeWidth="0.32"
              strokeDasharray="7 16 2 24"
              strokeLinecap="round"
            />
            <circle cx="50" cy="2.5" r="0.85" fill="rgba(45,212,191,0.9)" />
            <circle cx="97.5" cy="50" r="0.65" fill="rgba(125,211,252,0.75)" />
            <circle cx="50" cy="97.5" r="0.55" fill="rgba(45,212,191,0.55)" />
          </svg>

          {/* Pre-feathered PNG — no square cornice */}
          <img
            src="/pi-hello-soft.png"
            alt="Pi"
            width={1024}
            height={1024}
            className="relative z-[1] select-none pointer-events-none w-full h-full"
            style={{ objectFit: 'contain', display: 'block' }}
            draggable={false}
          />
        </div>

        <p
          className="mt-5 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white text-center"
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
