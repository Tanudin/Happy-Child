import React from 'react'
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '../constants/Colors'
import { useColorScheme } from '../hooks/useColorScheme'
import { useIOSAlert } from '../hooks/useIOSAlert'
import IOSAlert from './IOSAlert'

export default function AlertExample() {
  const colorScheme = useColorScheme()
  const { showAlert, alertProps } = useIOSAlert()
  const colors = Colors[colorScheme ?? 'light']

  console.log('AlertExample render - alertProps:', alertProps)

  const handleShowSuccess = () => {
    console.log('Success button pressed')
    showAlert({
      message: 'Success! Your action was completed successfully.',
      type: 'success',
      duration: 3000,
    })
    console.log('showAlert called with success type')
  }

  const handleShowError = () => {
    console.log('Error button pressed')
    showAlert({
      message: 'Error! Something went wrong. Please try again.',
      type: 'error',
      duration: 4000,
    })
    console.log('showAlert called with error type')
  }

  const handleShowWarning = () => {
    console.log('Warning button pressed')
    showAlert({
      message: 'Warning! Please check your input and try again.',
      type: 'warning',
      duration: 3500,
    })
    console.log('showAlert called with warning type')
  }

  const handleShowInfo = () => {
    console.log('Info button pressed')
    showAlert({
      message: 'Here is some important information for you.',
      type: 'info',
      duration: 2500,
    })
    console.log('showAlert called with info type')
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>iOS Alert Examples</Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleShowSuccess}
        >
          <Text style={styles.buttonText}>Show Success Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleShowError}
        >
          <Text style={styles.buttonText}>Show Error Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#FF9500' }]}
          onPress={handleShowWarning}
        >
          <Text style={styles.buttonText}>Show Warning Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.textSecondary }]}
          onPress={handleShowInfo}
        >
          <Text style={styles.buttonText}>Show Info Alert</Text>
        </TouchableOpacity>
      </View>

      {/* The IOSAlert component */}
      <IOSAlert {...alertProps} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
