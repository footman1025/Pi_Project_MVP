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
 * CRITICAL: onAuthStateChange callback must be synchronous.
 * Awaiting supabase.auth.* inside it holds the auth lock → every query hangs
 * ("Loading…") and then the session dies → automatic logout.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const intentionalSignOut = useRef(false)
  const profileFetchFor = useRef<string | null>(null)

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

  const applySession = (next: Session | null, source: string) => {
    setSession(next)
    setUser(next?.user ?? null)
    setAuthBridge({
      userId: next?.user?.id ?? null,
      accessToken: next?.access_token ?? null,
    })

    if (next?.user) {
      const uid = next.user.id
      if (profileFetchFor.current !== uid) {
        profileFetchFor.current = uid
        // Must be outside the auth callback tick
        queueMicrotask(() => {
          void fetchProfile(uid)
        })
      }
    } else {
      profileFetchFor.current = null
      setProfile(null)
      setProfileError(null)
    }

    console.info('[auth]', source, next?.user?.id ? 'in' : 'out')
  }

  useEffect(() => {
    let mounted = true

    // SYNC callback only — never async/await supabase.auth here
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        if (intentionalSignOut.current) {
          intentionalSignOut.current = false
          applySession(null, 'SIGNED_OUT')
          setLoading(false)
          return
        }
        // Unexpected SIGNED_OUT (refresh 429 / invalid refresh token).
        // Do NOT call setSession/getSession here — that deadlocks the auth lock.
        console.warn('[auth] SIGNED_OUT from Supabase client (usually refresh token 429/invalid)')
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
              'Supabase rate limit (429) on auth. Wait 15 minutes, close other Pi tabs, then log in once.',
            ),
          }
        }
        throw error
      }
      // Apply immediately so UI doesn't wait on the listener
      if (data.session) applySession(data.session, 'signIn')
      setLoading(false)
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/rate limit|too many requests|429/i.test(msg)) {
        return {
          error: new Error(
            'Supabase rate limit (429) on auth. Wait 15 minutes, close other Pi tabs, then log in once.',
          ),
        }
      }
      return { error: toError(err, 'Sign in failed') }
    }
  }

  const signOut = async () => {
    intentionalSignOut.current = true
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
