import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { track } from '../lib/analytics'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Prompts users to Install Pi as an app.
 * Installed PWAs can show notifications as "Pi" instead of "Google Chrome".
 */
export default function InstallPiBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    try {
      if (localStorage.getItem('pi_install_banner_dismissed') === '1') setHidden(true)
    } catch { /* ignore */ }

    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (isStandalone || hidden || !deferred) return null

  const dismiss = () => {
    setHidden(true)
    try { localStorage.setItem('pi_install_banner_dismissed', '1') } catch { /* ignore */ }
  }

  const install = async () => {
    track('pwa_install_click')
    await deferred.prompt()
    const choice = await deferred.userChoice
    track('pwa_install_result', { outcome: choice.outcome })
    setDeferred(null)
    if (choice.outcome === 'accepted') setHidden(true)
  }

  return (
    <div
      className="mb-4 p-4 rounded-2xl border border-teal-500/25 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ background: 'rgba(20,184,166,0.1)' }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <img src="/pi_logo.png" alt="Pi" className="w-10 h-10 rounded-xl shrink-0 object-contain bg-white" />
        <div className="min-w-0">
          <p className="text-white text-sm font-bold">Install Pi as an app</p>
          <p className="text-slate-400 text-xs leading-relaxed mt-0.5">
            In the browser, alerts are labeled “Google Chrome”. After you install Pi, notifications can show as <span className="text-teal-300 font-semibold">Pi</span> with our logo.
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={dismiss}
          className="p-2 rounded-xl text-slate-500 hover:text-white border border-white/10"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
        <button
          type="button"
          onClick={() => void install()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          <Download size={14} /> Install Pi
        </button>
      </div>
    </div>
  )
}
