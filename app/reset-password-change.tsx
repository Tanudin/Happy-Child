import { Button, Input } from '@rneui/themed'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { supabase } from '../lib/supabase'

export default function ResetPasswordChange() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useLocalSearchParams()
  const accessToken = params.access_token as string | undefined
  const refreshToken = params.refresh_token as string | undefined

  useEffect(() => {
    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    }
  }, [accessToken, refreshToken])

  async function changePassword() {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Please enter and confirm your new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      Alert.alert('Error updating password: ' + error.message)
    } else {
      Alert.alert('Password updated successfully! Please log in with your new password.')
      router.replace('/') 
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="New Password"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setNewPassword(text)}
          value={newPassword}
          secureTextEntry={true}
          placeholder="New Password"
          autoCapitalize={'none'}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Confirm New Password"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setConfirmPassword(text)}
          value={confirmPassword}
          secureTextEntry={true}
          placeholder="Confirm New Password"
          autoCapitalize={'none'}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button title="Change Password" disabled={loading} onPress={() => changePassword()} />
      </View>
      <View style={styles.verticallySpaced}>
        <Button title="Back to Login" disabled={loading} onPress={() => router.replace('/')} />
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
