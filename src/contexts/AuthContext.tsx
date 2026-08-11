import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  /** Bumps on every real auth update so a slow getSession cannot wipe a newer login. */
  const authEpoch = useRef(0)

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
    setSession(next)
    setUser(next?.user ?? null)
    if (next?.user) {
      // Never clear session if profile fails
      void fetchProfile(next.user.id)
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

    // Source of truth: auth state changes (SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED / INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return
      // Only clear UI session on explicit sign-out / no session from auth — never from profile errors
      applySession(next, event)
      setLoading(false)
    })

    // Fallback for older clients that don't emit INITIAL_SESSION quickly.
    // Must not overwrite a login that already happened while this was in flight.
    const bootEpoch = authEpoch.current
    void supabase.auth.getSession().then(({ data: { session: next }, error }) => {
      if (!mounted) return
      if (error) console.warn('[auth] getSession', error.message)
      // If onAuthStateChange already advanced epoch (e.g. SIGNED_IN), ignore this stale result
      if (authEpoch.current !== bootEpoch) return
      applySession(next, 'getSession')
      setLoading(false)
    }).catch(err => {
      if (!mounted) return
      console.warn('[auth] session boot failed', friendlyNetworkError(err, 'Session load failed'))
      // Do NOT force logout here — leave whatever onAuthStateChange already set
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
      // Single attempt — retrying password login can race refresh tokens / sessions
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { error: null }
    } catch (err) {
      return { error: toError(err, 'Sign in failed') }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) return { error: toError(error, 'Sign out failed') }
      setProfile(null)
      setProfileError(null)
      return { error: null }
    } catch (err) {
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
