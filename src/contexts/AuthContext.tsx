import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'
import { setAuthBridge } from '../lib/authBridge'
import { friendlyNetworkError, isOnline } from '../lib/messagingReliability'

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

/**
 * Console proved the failure mode:
 *   SIGNED_IN → TOKEN_REFRESHED × dozens → 429 refresh_token → SIGNED_OUT
 * Fix: disable client autoRefreshToken; refresh once on a timer with a mutex;
 * never re-render the whole app on every TOKEN_REFRESHED.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const intentionalSignOut = useRef(false)
  const profileFetchFor = useRef<string | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshing = useRef(false)

  const fetchProfile = async (userId: string): Promise<string | null> => {
    try {
      const { data: row, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      setProfileError(null)
      if (row) setProfile(row)
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

  const clearRefreshTimer = () => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current)
      refreshTimer.current = null
    }
  }

  const scheduleManualRefresh = (s: Session | null) => {
    clearRefreshTimer()
    if (!s?.expires_at || intentionalSignOut.current) return

    // Refresh ~2 minutes before expiry (JWT is 3600s). Never spam.
    const delayMs = Math.max(30_000, s.expires_at * 1000 - Date.now() - 120_000)
    refreshTimer.current = setTimeout(() => {
      void runManualRefresh()
    }, delayMs)
  }

  const runManualRefresh = async () => {
    if (refreshing.current || intentionalSignOut.current) return
    const current = sessionRef.current
    if (!current?.refresh_token) return

    refreshing.current = true
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: current.refresh_token,
      })
      if (error) {
        console.warn('[auth] manual refresh failed', error.message)
        // On 429 keep the existing access token; retry in 5 minutes if still valid
        const stillValid = current.expires_at && current.expires_at * 1000 > Date.now() + 60_000
        if (/429|rate limit|too many/i.test(error.message) && stillValid) {
          refreshTimer.current = setTimeout(() => {
            void runManualRefresh()
          }, 5 * 60_000)
          return
        }
        // Only hard-logout if access token is actually dead
        if (!stillValid) {
          applySession(null, 'refresh-expired')
        }
        return
      }
      if (data.session) {
        applySession(data.session, 'manual-refresh')
      }
    } catch (err) {
      console.warn('[auth] manual refresh threw', err)
    } finally {
      refreshing.current = false
    }
  }

  const applySession = (next: Session | null, source: string) => {
    const prev = sessionRef.current

    // Ignore no-op / spammy TOKEN_REFRESHED with identical token
    if (
      next &&
      prev &&
      next.access_token === prev.access_token &&
      next.user?.id === prev.user?.id
    ) {
      return
    }

    sessionRef.current = next
    setAuthBridge({
      userId: next?.user?.id ?? null,
      accessToken: next?.access_token ?? null,
    })

    setSession(next)
    // Keep stable user object reference when same id — stops page reloads on refresh
    setUser(prevUser => {
      if (!next?.user) return null
      if (prevUser?.id === next.user.id) return prevUser
      return next.user
    })

    if (next?.user) {
      const uid = next.user.id
      if (profileFetchFor.current !== uid) {
        profileFetchFor.current = uid
        queueMicrotask(() => {
          void fetchProfile(uid)
        })
      }
      scheduleManualRefresh(next)
    } else {
      profileFetchFor.current = null
      setProfile(null)
      setProfileError(null)
      clearRefreshTimer()
    }

    if (source !== 'TOKEN_REFRESHED') {
      console.info('[auth]', source, next?.user?.id ? 'in' : 'out')
    }
  }

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') {
        // Update token quietly — do not treat as a full re-login
        if (next) applySession(next, 'TOKEN_REFRESHED')
        setLoading(false)
        return
      }

      if (event === 'SIGNED_OUT') {
        if (intentionalSignOut.current) {
          intentionalSignOut.current = false
          applySession(null, 'SIGNED_OUT')
          setLoading(false)
          return
        }
        console.warn('[auth] SIGNED_OUT (refresh storm/429). Wait, clear sb-* storage, one tab, login once.')
        applySession(null, 'SIGNED_OUT')
        setLoading(false)
        return
      }

      if (next) {
        if (event === 'SIGNED_IN') intentionalSignOut.current = false
        applySession(next, event)
      } else if (event === 'INITIAL_SESSION') {
        applySession(null, event)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearRefreshTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isOnline()) {
      return { error: new Error('You’re offline. Reconnect, then try again.') }
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
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
      intentionalSignOut.current = false
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (/rate limit|too many requests|429/i.test(error.message || '')) {
          return {
            error: new Error(
              'Auth rate-limited (429). Wait 15 minutes, one tab only, then sign in once.',
            ),
          }
        }
        throw error
      }
      if (data.session) applySession(data.session, 'signIn')
      setLoading(false)
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/rate limit|too many requests|429/i.test(msg)) {
        return {
          error: new Error(
            'Auth rate-limited (429). Wait 15 minutes, one tab only, then sign in once.',
          ),
        }
      }
      return { error: toError(err, 'Sign in failed') }
    }
  }

  const signOut = async () => {
    intentionalSignOut.current = true
    clearRefreshTimer()
    try {
      const { error } = await supabase.auth.signOut()
      applySession(null, 'signOut')
      if (error) return { error: toError(error, 'Sign out failed') }
      return { error: null }
    } catch (err) {
      applySession(null, 'signOut-catch')
      return { error: toError(err, 'Sign out failed') }
    }
  }

  const resetPassword = async (email: string) => {
    if (!isOnline()) {
      return { error: new Error('You’re offline. Reconnect, then try again.') }
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
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
