import { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Auth from '../components/Auth'
import { isBrowser } from '../lib/platformUtils'
import { supabase } from '../lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    // Check for password recovery URL first
    const checkPasswordRecovery = async () => {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl && (initialUrl.includes('type=recovery') || initialUrl.includes('password_recovery') || initialUrl.includes('access_token'))) {
        console.log('Password recovery URL detected in main layout')
        setIsPasswordRecovery(true)
      }
    }
    
    checkPasswordRecovery()

    if (!isBrowser()) {
      setLoading(false)
      return
    }

    supabase.auth.getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setSession(session)
        setLoading(false)
      })
      .catch((error: unknown) => {
        console.error('Error getting session:', error)
        setLoading(false)
      })
 
    try {
      const { data: subscription } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
        console.log('Main layout - Auth state change:', event, session)
        setSession(session)
        
        // Clear password recovery flag on successful password update
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          // Don't clear immediately, let Auth component handle it
        } else if (event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false)
        }
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
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    )
  }

  if (!session || isPasswordRecovery) {
    return (
      <SafeAreaProvider>
        <Auth forceShow={isPasswordRecovery} onPasswordRecoveryComplete={() => setIsPasswordRecovery(false)} />
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <Stack 
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            headerTitle: '',
            header: () => null,
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  )
}
