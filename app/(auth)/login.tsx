import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Colors } from '../../constants/Colors'
import { useColorScheme } from '../../hooks/useColorScheme'
import { supabase } from '../../lib/supabase'

interface AuthFormProps {
  initialTab?: 'login' | 'signup'
  onBack: () => void
  onForgotPassword: () => void
}

export default function AuthForm({ initialTab = 'signup', onBack, onForgotPassword }: AuthFormProps) {
  const colorScheme = useColorScheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>(initialTab)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  return (
    <SafeAreaView style={[styles.authContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={[styles.formContainer, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'signup' && { borderBottomColor: Colors[colorScheme ?? 'light'].secondary }]}
            onPress={() => setActiveTab('signup')}
          >
            <Text style={[styles.tabText, { color: Colors[colorScheme ?? 'light'].textLight }, activeTab === 'signup' && { color: Colors[colorScheme ?? 'light'].text }]}>
              SIGN UP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'login' && { borderBottomColor: Colors[colorScheme ?? 'light'].secondary }]}
            onPress={() => setActiveTab('login')}
          >
            <Text style={[styles.tabText, { color: Colors[colorScheme ?? 'light'].textLight }, activeTab === 'login' && { color: Colors[colorScheme ?? 'light'].text }]}>
              LOG IN
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.formTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
          {activeTab === 'login' ? 'Log in' : 'Sign up'}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>Email</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: Colors[colorScheme ?? 'light'].inputBackground, color: Colors[colorScheme ?? 'light'].text }]}
            value={email}
            onChangeText={setEmail}
            placeholder=""
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.textInput, styles.passwordInput, { backgroundColor: Colors[colorScheme ?? 'light'].inputBackground, color: Colors[colorScheme ?? 'light'].text }]}
              value={password}
              onChangeText={setPassword}
              placeholder=""
              secureTextEntry={true}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeIcon}>
              <Ionicons name="eye-off" size={20} color={Colors[colorScheme ?? 'light'].textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, { backgroundColor: Colors[colorScheme ?? 'light'].secondary }]} 
          onPress={activeTab === 'login' ? signInWithEmail : signUpWithEmail}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {activeTab === 'login' ? 'Log in' : 'Sign up'}
          </Text>
        </TouchableOpacity>

        {activeTab === 'login' && (
          <TouchableOpacity onPress={onForgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: Colors[colorScheme ?? 'light'].accent }]}>Forgot password?</Text>
          </TouchableOpacity>
        )}
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
  authContainer: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    marginHorizontal: -10,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    margin: 20,
    marginTop: 60,
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
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
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
  forgotPasswordText: {
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
})
