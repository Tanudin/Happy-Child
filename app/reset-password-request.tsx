import { Button, Input } from '@rneui/themed'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { supabase } from '../lib/supabase'

export default function ResetPasswordRequest() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function requestPasswordReset() {
    if (!email) {
      Alert.alert('Please enter your email address to reset your password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'child-tracking://reset-password-change', 
    })

    if (error) {
      Alert.alert('Error sending reset email: ' + error.message)
    } else {
      Alert.alert('Check your email for a password reset link!')
      router.back() 
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          leftIcon={{ type: 'font-awesome', name: 'envelope' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button title="Request Password Reset" disabled={loading} onPress={() => requestPasswordReset()} />
      </View>
      <View style={styles.verticallySpaced}>
        <Button title="Back to Login" disabled={loading} onPress={() => router.back()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
})
