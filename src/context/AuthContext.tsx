import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getLocalSession,
  setSupabaseOwnerId,
  signInLocal,
  signOutLocal,
  signUpLocal,
} from '../lib/localAuth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type Researcher = {
  id: string
  email: string
}

type AuthContextValue = {
  researcher: Researcher | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [researcher, setResearcher] = useState<Researcher | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession()
          const user = data.session?.user
          if (!cancelled) {
            setSupabaseOwnerId(user?.id ?? null)
            setResearcher(
              user?.email ? { id: user.id, email: user.email } : null,
            )
          }
          return
        }
        if (!cancelled) setResearcher(getLocalSession())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void hydrate()

    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user
        setSupabaseOwnerId(user?.id ?? null)
        setResearcher(user?.email ? { id: user.id, email: user.email } : null)
      })
      return () => {
        cancelled = true
        data.subscription.unsubscribe()
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      researcher,
      loading,
      async signIn(email, password) {
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
          if (error) throw error
          const user = data.user
          if (!user?.email) throw new Error('Sign-in failed.')
          setSupabaseOwnerId(user.id)
          setResearcher({ id: user.id, email: user.email })
          return
        }
        setResearcher(await signInLocal(email, password))
      },
      async signUp(email, password) {
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          })
          if (error) throw error
          const user = data.user
          if (!user?.email) {
            throw new Error(
              'Check your email to confirm the account, then sign in.',
            )
          }
          if (data.session) {
            setSupabaseOwnerId(user.id)
            setResearcher({ id: user.id, email: user.email })
          }
          return
        }
        setResearcher(await signUpLocal(email, password))
      },
      async signOut() {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut()
          setSupabaseOwnerId(null)
          setResearcher(null)
          return
        }
        signOutLocal()
        setResearcher(null)
      },
    }),
    [researcher, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
