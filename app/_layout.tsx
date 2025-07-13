import { Session } from '@supabase/supabase-js'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import Auth from '../components/Auth'
import { isBrowser } from '../lib/platformUtils'
import { supabase } from '../lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip authentication setup on server-side rendering
    if (!isBrowser()) {
      setLoading(false)
      return
    }

    // Add error handling for getSession
    supabase.auth.getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setSession(session)
        setLoading(false)
      })
      .catch((error: unknown) => {
        console.error('Error getting session:', error)
        setLoading(false)
      })
 
    // Set up auth state change listener with error handling
    try {
      const { data: subscription } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        setSession(session)
      })

      return () => {
        subscription?.subscription?.unsubscribe()
      }
    } catch (error) {
      console.error('Error setting up auth state change listener:', error)
      return () => {}
    }
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!session) {
    return <Auth />
  }

  return <Stack />
}
