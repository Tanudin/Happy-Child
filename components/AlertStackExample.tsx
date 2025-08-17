import React from 'react'
import { Button, StyleSheet, View } from 'react-native'
import { AlertProvider, useAlert } from '../components/AlertManager'

function AlertTestScreen() {
  const { showAlert } = useAlert()

  const showSuccessAlert = () => {
    showAlert({
      message: 'Success! Operation completed successfully.',
      type: 'success',
      duration: 3000
    })
  }

  const showErrorAlert = () => {
    showAlert({
      message: 'Error! Something went wrong.',
      type: 'error',
      duration: 4000
    })
  }

  const showWarningAlert = () => {
    showAlert({
      message: 'Warning! Please check your input.',
      type: 'warning',
      duration: 3500
    })
  }

  const showInfoAlert = () => {
    showAlert({
      message: 'Info: This is an informational message.',
      type: 'info',
      duration: 2500
    })
  }

  const showMultipleAlerts = () => {
    showAlert({
      message: 'First alert',
      type: 'success',
      duration: 5000
    })
    
    setTimeout(() => {
      showAlert({
        message: 'Second alert',
        type: 'warning',
        duration: 4000
      })
    }, 500)
    
    setTimeout(() => {
      showAlert({
        message: 'Third alert',
        type: 'error',
        duration: 3000
      })
    }, 1000)
  }

  const showQuickAlerts = () => {
    showAlert({
      message: 'Quick alert 1',
      type: 'info',
      duration: 3000
    })
    showAlert({
      message: 'Quick alert 2',
      type: 'success',
      duration: 3000
    })
    showAlert({
      message: 'Quick alert 3',
      type: 'warning',
      duration: 3000
    })
  }

  const testMaxLimit = () => {
    showAlert({
      message: 'Alert 1 - Should be pushed out',
      type: 'info',
      duration: 8000
    })
    setTimeout(() => {
      showAlert({
        message: 'Alert 2 - Should stay',
        type: 'success',
        duration: 8000
      })
    }, 500)
    setTimeout(() => {
      showAlert({
        message: 'Alert 3 - Should stay',
        type: 'warning',
        duration: 8000
      })
    }, 1000)
    setTimeout(() => {
      showAlert({
        message: 'Alert 4 - Should push out Alert 1',
        type: 'error',
        duration: 8000
      })
    }, 1500)
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Show Success Alert" onPress={showSuccessAlert} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Show Error Alert" onPress={showErrorAlert} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Show Warning Alert" onPress={showWarningAlert} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Show Info Alert" onPress={showInfoAlert} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Show Multiple Alerts" onPress={showMultipleAlerts} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Show Quick Stack" onPress={showQuickAlerts} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Test Max Limit (4 alerts)" onPress={testMaxLimit} />
      </View>
    </View>
  )
}

export default function AlertStackExample() {
  return (
    <AlertProvider>
      <AlertTestScreen />
    </AlertProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  buttonContainer: {
    marginVertical: 10
  }
})
