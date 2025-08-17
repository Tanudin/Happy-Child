import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '../../constants/Colors'
import { useColorScheme } from '../../hooks/useColorScheme'

interface WelcomeScreenProps {
  onEmailSignUp: () => void
  onLogin: () => void
}

export default function WelcomeScreen({ onEmailSignUp, onLogin }: WelcomeScreenProps) {
  const colorScheme = useColorScheme()

  // Placeholder functions for social logins
  function signInWithGoogle() {
    Alert.alert('Google Sign In', 'Google authentication coming soon!')
  }

  function signInWithApple() {
    Alert.alert('Apple Sign In', 'Apple authentication coming soon!')
  }

  function signInWithFacebook() {
    Alert.alert('Facebook Sign In', 'Facebook authentication coming soon!')
  }

  return (
    <SafeAreaView style={[styles.welcomeContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.centerSection}>
        <Image
          source={require('../../assets/images/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={[styles.appName, { color: Colors[colorScheme ?? 'light'].text }]}>CoPlan</Text>
        
        <Text style={[styles.tagline, { color: Colors[colorScheme ?? 'light'].text }]}>
          Ready to get your family{'\n'}organized?
        </Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={[styles.googleButton, { backgroundColor: Colors[colorScheme ?? 'light'].googleButton, borderColor: Colors[colorScheme ?? 'light'].border }]} 
          onPress={signInWithGoogle}
        >
          <Ionicons name="logo-google" size={20} color={Colors[colorScheme ?? 'light'].textSecondary} />
          <Text style={[styles.socialButtonText, { color: Colors[colorScheme ?? 'light'].text }]}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.appleButton, { backgroundColor: Colors[colorScheme ?? 'light'].appleButton }]} 
          onPress={signInWithApple}
        >
          <Ionicons name="logo-apple" size={20} color="#fff" />
          <Text style={styles.appleSocialButtonText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.facebookButton, { backgroundColor: Colors[colorScheme ?? 'light'].facebookButton }]} 
          onPress={signInWithFacebook}
        >
          <Ionicons name="logo-facebook" size={20} color="#fff" />
          <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        <Text style={[styles.orText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>or</Text>

        <TouchableOpacity 
          style={[styles.emailButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]} 
          onPress={onEmailSignUp}
        >
          <Text style={styles.emailButtonText}>Sign up with email</Text>
        </TouchableOpacity>

        <View style={styles.loginLinkContainer}>
          <Text style={[styles.loginText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>Already have an account? </Text>
          <TouchableOpacity onPress={onLogin}>
            <Text style={[styles.loginLinkText, { color: Colors[colorScheme ?? 'light'].accent }]}>Log in here</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.termsText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
          By clicking continue, you agree to our{' '}
          <Text style={styles.linkText}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Add some top padding to move content down slightly
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 24,
  },
  buttonSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 15,
    marginBottom: 10,
    borderWidth: 1,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 15,
    marginBottom: 10,
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 15,
    marginBottom: 15,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  appleSocialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  facebookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  orText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 15,
  },
  emailButton: {
    borderRadius: 8,
    paddingVertical: 15,
    marginBottom: 15,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginText: {
    fontSize: 14,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
})
