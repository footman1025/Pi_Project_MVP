import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { SUPABASE_AUTH_STORAGE_KEY, supabase, Profile } from '../lib/supabase'
import { friendlyNetworkError, isOnline, withRetry } from '../lib/messagingReliability'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  profileError: string | null
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function toError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return new Error(friendlyNetworkError(err, err.message || fallback))
  return new Error(friendlyNetworkError(err, fallback))
}

/** Clear corrupt auth storage without calling the network. */
function clearLocalAuthStorage() {
  try {
    localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY)
    // Legacy / alternate keys sometimes left by older clients
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.includes('auth-token')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const authEpoch = useRef(0)
  const lastSignedInAt = useRef(0)
  const sessionRef = useRef<Session | null>(null)

  const fetchProfile = async (userId: string): Promise<string | null> => {
    try {
      const data = await withRetry(async () => {
        const { data: row, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        return row
      }, { attempts: 3, baseMs: 400, label: 'Could not load profile' })

      setProfileError(null)
      if (data) setProfile(data)
      return null
    } catch (err) {
      const msg = friendlyNetworkError(err, 'Could not load profile')
      console.warn('[auth] profile fetch failed', msg)
      setProfileError(msg)
      return msg
    }
  }

  const refreshProfile = async () => {
    if (!user) return {}
    const error = await fetchProfile(user.id)
    return error ? { error } : {}
  }

  const applySession = (next: Session | null, source: string) => {
    authEpoch.current += 1
    sessionRef.current = next
    setSession(next)
    setUser(next?.user ?? null)
    if (next?.user) {
      // Defer DB calls — never call Supabase from inside onAuthStateChange synchronously
      const uid = next.user.id
      window.setTimeout(() => {
        void fetchProfile(uid)
      }, 0)
    } else {
      setProfile(null)
      setProfileError(null)
    }
    if (import.meta.env.DEV) {
      console.debug('[auth]', source, next?.user?.id ? 'signed-in' : 'signed-out')
    }
  }

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_IN') lastSignedInAt.current = Date.now()
        if (next) applySession(next, event)
        setLoading(false)
        return
      }

      if (event === 'SIGNED_OUT') {
        // Guard against spurious SIGNED_OUT right after a successful password login
        // (known refresh-token race in supabase-js / multi-tab).
        const msSinceSignIn = Date.now() - lastSignedInAt.current
        if (msSinceSignIn >= 0 && msSinceSignIn < 4000 && sessionRef.current?.user) {
          console.warn('[auth] Ignoring SIGNED_OUT shortly after SIGNED_IN — recovering session')
          void supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return
            if (data.session) applySession(data.session, 'recover-after-spurious-signout')
          })
          setLoading(false)
          return
        }
        applySession(null, event)
        setLoading(false)
        return
      }

      if (event === 'INITIAL_SESSION') {
        applySession(next, event)
        setLoading(false)
        return
      }

      // Other events: only apply a non-null session; never wipe on ambiguous null
      if (next) applySession(next, event)
      setLoading(false)
    })

    const bootEpoch = authEpoch.current
    void supabase.auth.getSession().then(({ data: { session: next }, error }) => {
      if (!mounted) return
      if (error) {
        console.warn('[auth] getSession', error.message)
        // Corrupt / reused refresh token — wipe local only so next login is clean
        if (/refresh token|session/i.test(error.message)) {
          clearLocalAuthStorage()
        }
      }
      if (authEpoch.current !== bootEpoch) return
      if (next) applySession(next, 'getSession')
      setLoading(false)
    }).catch(err => {
      if (!mounted) return
      console.warn('[auth] session boot failed', friendlyNetworkError(err, 'Session load failed'))
      if (authEpoch.current === bootEpoch) setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onOnline = () => {
      if (user) void fetchProfile(user.id)
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isOnline()) {
      return { error: new Error('You’re offline. Reconnect, then try again.') }
    }
    try {
      await withRetry(async () => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
      }, { attempts: 2, baseMs: 400, label: 'Sign up failed' })
      return { error: null }
    } catch (err) {
      return { error: toError(err, 'Sign up failed') }
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isOnline()) {
      return { error: new Error('You’re offline. Reconnect, then try again.') }
    }
    try {
      // Drop stale local session first so a dead refresh token can’t race the new login
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        clearLocalAuthStorage()
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.session) {
        lastSignedInAt.current = Date.now()
        applySession(data.session, 'signIn')
      }
      return { error: null }
    } catch (err) {
      return { error: toError(err, 'Sign in failed') }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        // Still clear local UI/session if network signOut fails
        clearLocalAuthStorage()
        applySession(null, 'signOut-local')
        return { error: toError(error, 'Sign out failed') }
      }
      applySession(null, 'signOut')
      return { error: null }
    } catch (err) {
      clearLocalAuthStorage()
      applySession(null, 'signOut-catch')
      return { error: toError(err, 'Sign out failed') }
    }
  }

  const resetPassword = async (email: string) => {
    if (!isOnline()) {
      return { error: new Error('You’re offline. Reconnect, then try again.') }
    }
    try {
      await withRetry(async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
      }, { attempts: 2, baseMs: 400, label: 'Reset email failed' })
      return { error: null }
    } catch (err) {
      return { error: toError(err, 'Could not send reset email') }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        profileError,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
