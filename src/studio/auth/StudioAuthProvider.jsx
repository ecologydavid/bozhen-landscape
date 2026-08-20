import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const StudioAuthContext = createContext(null)

export default function StudioAuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    status: 'loading',
    user: null,
  })

  useEffect(() => {
    let active = true
    let latestRequest = 0

    async function classifySession(session, requestId) {
      if (!active || requestId !== latestRequest) return

      const user = session?.user ?? null
      if (!user) {
        setAuthState({ status: 'anonymous', user: null })
        return
      }

      setAuthState({ status: 'loading', user: null })

      try {
        const { data, error } = await supabase
          .from('studio_admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!active || requestId !== latestRequest) return

        if (error) {
          setAuthState({ status: 'error', user: null })
          return
        }

        setAuthState({
          status: data ? 'admin' : 'forbidden',
          user,
        })
      } catch {
        if (active && requestId === latestRequest) {
          setAuthState({ status: 'error', user: null })
        }
      }
    }

    const initialRequest = ++latestRequest
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || initialRequest !== latestRequest) return

        if (error) {
          setAuthState({ status: 'error', user: null })
          return
        }

        return classifySession(data.session, initialRequest)
      })
      .catch(() => {
        if (active && initialRequest === latestRequest) {
          setAuthState({ status: 'error', user: null })
        }
      })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const requestId = ++latestRequest
      void classifySession(session, requestId)
    })

    return () => {
      active = false
      latestRequest += 1
      data.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setAuthState({ status: 'anonymous', user: null })
  }

  return (
    <StudioAuthContext.Provider value={{ ...authState, signIn, signOut }}>
      {children}
    </StudioAuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudioAuth() {
  const context = useContext(StudioAuthContext)

  if (!context) {
    throw new Error('useStudioAuth must be used inside StudioAuthProvider')
  }

  return context
}
