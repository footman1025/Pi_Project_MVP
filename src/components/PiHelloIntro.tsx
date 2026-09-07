import { useEffect, useRef, useState } from 'react'
import { playConnectSound, unlockConnectSound } from '../lib/connectSound'

const STORAGE_KEY = 'pi_hello_v3'
const ENTER_MS = 600
const HOLD_MS = 2400
const EXIT_MS = 800

type Phase = 'enter' | 'hello' | 'exit' | 'done'

type Props = {
  onFinished: () => void
}

/**
 * First-paint Pi intro: full mascot says Hello + alien ring, then fades into the app.
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

  return (
    <div
      role="dialog"
      aria-label="Meet Pi"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        // Match the mascot plate so the art doesn’t sit in a visible “box”
        background: '#0a1a1f',
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
        <img
          src="/pi-hello.jpg"
          alt="Pi"
          width={1024}
          height={1024}
          className="select-none pointer-events-none"
          style={{
            width: 'min(88vw, 72vh, 520px)',
            height: 'auto',
            aspectRatio: '1 / 1',
            objectFit: 'contain',
            display: 'block',
            animation: phase === 'hello' ? 'piHelloBob 1.8s ease-in-out infinite' : undefined,
          }}
          draggable={false}
        />

        <p
          className="mt-5 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white text-center"
          style={{
            opacity: showCopy ? 1 : 0,
            transform: showCopy ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
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
