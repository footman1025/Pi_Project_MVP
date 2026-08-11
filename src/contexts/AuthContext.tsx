import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'
import { setAuthBridge } from '../lib/authBridge'
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

function sessionStillValid(s: Session | null | undefined): s is Session {
  if (!s?.access_token || !s.refresh_token) return false
  if (!s.expires_at) return true
  // still valid for at least 30s
  return s.expires_at * 1000 > Date.now() + 30_000
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const sessionRef = useRef<Session | null>(null)
  const lastSignedInAt = useRef(0)
  const restoringRef = useRef(false)
  const intentionalSignOut = useRef(false)

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
      }, { attempts: 2, baseMs: 400, label: 'Could not load profile' })

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
    sessionRef.current = next
    setSession(next)
    setUser(next?.user ?? null)
    setAuthBridge({
      userId: next?.user?.id ?? null,
      accessToken: next?.access_token ?? null,
    })
    if (next?.user) {
      const uid = next.user.id
      // Never call Supabase from inside onAuthStateChange synchronously
      window.setTimeout(() => {
        void fetchProfile(uid)
      }, 0)
    } else {
      setProfile(null)
      setProfileError(null)
    }
    console.info('[auth]', source, next?.user?.id ? 'in' : 'out')
  }

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, next) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (event === 'SIGNED_IN') {
          lastSignedInAt.current = Date.now()
          intentionalSignOut.current = false
        }
        if (next) applySession(next, event)
        setLoading(false)
        return
      }

      if (event === 'INITIAL_SESSION') {
        if (next) applySession(next, event)
        else applySession(null, event)
        setLoading(false)
        return
      }

      if (event === 'SIGNED_OUT') {
        if (intentionalSignOut.current) {
          applySession(null, event)
          setLoading(false)
          return
        }

        // Spurious SIGNED_OUT after login / refresh race / 429:
        // React-only ignore is not enough — storage was cleared. Restore into the client.
        const held = sessionRef.current
        const recentLogin = Date.now() - lastSignedInAt.current < 60_000
        if (!restoringRef.current && recentLogin && sessionStillValid(held)) {
          restoringRef.current = true
          console.warn('[auth] Unexpected SIGNED_OUT — restoring session into Supabase client')
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: held.access_token,
              refresh_token: held.refresh_token,
            })
            if (!error && data.session) {
              applySession(data.session, 'restored')
              setLoading(false)
              restoringRef.current = false
              return
            }
            console.warn('[auth] restore failed', error?.message)
          } catch (err) {
            console.warn('[auth] restore threw', err)
          }
          restoringRef.current = false
        }

        applySession(null, event)
        setLoading(false)
        return
      }

      if (next) applySession(next, event)
      setLoading(false)
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
      // Do NOT wipe localStorage before login — that desyncs the client and causes SIGNED_OUT seconds later.
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        const msg = error.message || ''
        if (/rate limit|too many requests|429/i.test(msg)) {
          return {
            error: new Error(
              'Auth rate limit (429). Wait 10 minutes, use one tab only, then try a single login.',
            ),
          }
        }
        throw error
      }

      if (data.session) {
        lastSignedInAt.current = Date.now()
        applySession(data.session, 'signIn')
      }
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/rate limit|too many requests|429/i.test(msg)) {
        return {
          error: new Error(
            'Auth rate limit (429). Wait 10 minutes, use one tab only, then try a single login.',
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
