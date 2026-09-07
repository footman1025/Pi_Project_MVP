import { useEffect, useRef, useState } from 'react'
import { playConnectSound, unlockConnectSound } from '../lib/connectSound'

const STORAGE_KEY = 'pi_hello_v2'
const ENTER_MS = 700
const HOLD_MS = 2200
const EXIT_MS = 900

type Phase = 'enter' | 'hello' | 'exit' | 'done'

type Props = {
  onFinished: () => void
}

/**
 * First-paint Pi intro: mascot says Hello + alien ring, then disappears into the app.
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

  const onTap = () => {
    void playHello()
  }

  if (phase === 'done') return null

  const visible = phase === 'enter' || phase === 'hello'
  const exiting = phase === 'exit'

  return (
    <div
      role="dialog"
      aria-label="Meet Pi"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 45%, #0f3d4a 0%, #061018 55%, #03060c 100%)',
        transition: `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.08)' : 'scale(1)',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
      onPointerDown={onTap}
    >
      <div
        className="relative flex flex-col items-center px-6"
        style={{
          opacity: visible || exiting ? 1 : 0,
          transform: phase === 'enter' ? 'translateY(28px) scale(0.92)' : 'translateY(0) scale(1)',
          transition: 'opacity 0.65s ease, transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            filter: phase === 'hello' ? 'drop-shadow(0 0 40px rgba(45,212,191,0.35))' : 'drop-shadow(0 0 24px rgba(20,184,166,0.2))',
            transition: 'filter 0.5s ease',
            animation: phase === 'hello' ? 'piHelloBob 1.6s ease-in-out infinite' : undefined,
          }}
        >
          <img
            src="/pi-hello.png"
            alt="Pi"
            width={806}
            height={410}
            className="select-none object-contain"
            style={{
              width: 'auto',
              height: 'auto',
              maxHeight: 'min(52vh, 380px)',
              maxWidth: 'min(92vw, 720px)',
              // Soften the asset’s hard rectangular frame into the intro background
              WebkitMaskImage:
                'radial-gradient(ellipse 78% 88% at 50% 48%, #000 52%, transparent 78%)',
              maskImage:
                'radial-gradient(ellipse 78% 88% at 50% 48%, #000 52%, transparent 78%)',
            }}
            draggable={false}
          />
        </div>

        <p
          className="mt-8 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white"
          style={{
            opacity: phase === 'hello' || phase === 'exit' ? 1 : 0,
            transform: phase === 'hello' || phase === 'exit' ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.45s ease 0.15s, transform 0.45s ease 0.15s',
            textShadow: '0 0 24px rgba(45,212,191,0.45)',
          }}
        >
          Hello
        </p>
        <p
          className="mt-2 text-sm sm:text-base text-teal-200/80 font-medium"
          style={{
            opacity: phase === 'hello' || phase === 'exit' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.35s',
          }}
        >
          Let me introduce you to Pi
        </p>

        {needsTap && phase !== 'exit' && (
          <button
            type="button"
            className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 hover:text-teal-200 transition-colors"
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
          50% { transform: translateY(-8px); }
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
