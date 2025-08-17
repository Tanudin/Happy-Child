import { Ionicons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import React, { useEffect, useState } from 'react'
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Colors } from '../../constants/Colors'
import { useColorScheme } from '../../hooks/useColorScheme'
import { supabase } from '../../lib/supabase'

interface NewPasswordProps {
  onSuccess: () => void
  onBack: () => void
}

export default function NewPassword({ onSuccess, onBack }: NewPasswordProps) {
  const colorScheme = useColorScheme()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')

  useEffect(() => {
    // Check if we have a valid recovery session or handle recovery URL
    const checkRecoverySession = async () => {
      try {
        // First check if we're coming from a password reset link
        let accessToken: string | null = null
        let refreshToken: string | null = null
        
        // Check initial URL for tokens
        const initialUrl = await Linking.getInitialURL()
        if (initialUrl) {
          const parsedUrl = Linking.parse(initialUrl)
          
          // Extract tokens from URL fragments or query parameters
          if (parsedUrl.queryParams) {
            accessToken = parsedUrl.queryParams.access_token as string || null
            refreshToken = parsedUrl.queryParams.refresh_token as string || null
          }
          
          // Also check the URL hash fragment (common for OAuth flows)
          const hashParams = new URLSearchParams(initialUrl.split('#')[1] || '')
          if (!accessToken && hashParams.get('access_token')) {
            accessToken = hashParams.get('access_token')
            refreshToken = hashParams.get('refresh_token')
          }
        }
        
        if (accessToken && refreshToken) {
          // Set the session using the tokens from the recovery URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            Alert.alert(
              'Session Error', 
              'Failed to establish recovery session. Please try the password reset link again.',
              [{ text: 'OK', onPress: onBack }]
            )
            return
          }
        } else {
          // Check for existing session
          const { data: { session } } = await supabase.auth.getSession()
          
          // If no session and no recovery tokens, this might be an error
          // But we'll let the user try anyway since the main app now controls when this component is shown
        }
      } catch (error) {
        Alert.alert(
          'Error', 
          'Failed to process recovery session. Please try again.',
          [{ text: 'OK', onPress: onBack }]
        )
      }
    }

    checkRecoverySession()

    // Listen for auth state changes to detect when user comes from reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // No logging needed here
    })

    return () => subscription.unsubscribe()
  }, [])

  const validatePassword = () => {
    setPasswordError('')
    setConfirmPasswordError('')
    
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long')
      return false
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
      return false
    }
    
    return true
  }

  const handleUpdatePassword = async () => {
    if (!validatePassword()) {
      return
    }

    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) {
        // Handle specific error types
        if (error.message?.toLowerCase().includes('password')) {
          setPasswordError(error.message)
        } else {
          Alert.alert('Error', error.message)
        }
      } else {
        Alert.alert(
          'Success',
          'Your password has been updated successfully!',
          [{ text: 'OK', onPress: onSuccess }]
        )
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={[styles.formContainer, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
        <View style={styles.headerContainer}>
          <Ionicons name="lock-closed" size={40} color={Colors[colorScheme ?? 'light'].accent} />
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
            Create New Password
          </Text>
          <Text style={[styles.subtitle, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            Your new password must be different from your previous password.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.textInput, styles.passwordInput, { backgroundColor: Colors[colorScheme ?? 'light'].inputBackground, color: Colors[colorScheme ?? 'light'].text }]}
              value={password}
              onChangeText={(text) => {
                setPassword(text)
                if (passwordError) setPasswordError('') // Clear error when user starts typing
              }}
              placeholder="Enter new password"
              placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye" : "eye-off"} 
                size={20} 
                color={Colors[colorScheme ?? 'light'].textLight} 
              />
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <Text style={[styles.errorText, { color: '#ff4444' }]}>
              {passwordError}
            </Text>
          ) : (
            <Text style={[styles.passwordHint, { color: Colors[colorScheme ?? 'light'].textLight }]}>
              Must be at least 6 characters long
            </Text>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.textInput, styles.passwordInput, { backgroundColor: Colors[colorScheme ?? 'light'].inputBackground, color: Colors[colorScheme ?? 'light'].text }]}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text)
                if (confirmPasswordError) setConfirmPasswordError('') // Clear error when user starts typing
              }}
              placeholder="Confirm new password"
              placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye" : "eye-off"} 
                size={20} 
                color={Colors[colorScheme ?? 'light'].textLight} 
              />
            </TouchableOpacity>
          </View>
          {confirmPasswordError && (
            <Text style={[styles.errorText, { color: '#ff4444' }]}>
              {confirmPasswordError}
            </Text>
          )}
        </View>

        <TouchableOpacity 
          style={[
            styles.submitButton, 
            { backgroundColor: Colors[colorScheme ?? 'light'].secondary },
            (loading || !password || !confirmPassword) && { opacity: 0.6 }
          ]} 
          onPress={handleUpdatePassword}
          disabled={loading || !password || !confirmPassword}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Updating...' : 'Update Password'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelContainer}
          onPress={onBack}
        >
          <Text style={[styles.cancelText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={onBack}
      >
        <Ionicons name="arrow-back" size={24} color={Colors[colorScheme ?? 'light'].textSecondary} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    margin: 20,
    marginTop: 80,
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  passwordHint: {
    fontSize: 12,
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelContainer: {
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
})
