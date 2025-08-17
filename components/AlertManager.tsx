import React, { createContext, useCallback, useContext, useState } from 'react'
import IOSAlert, { IOSAlertProps } from './IOSAlert'

interface Alert extends Omit<IOSAlertProps, 'visible' | 'onHide'> {
  id: string
  stackIndex: number
}

interface AlertContextType {
  showAlert: (alert: Omit<Alert, 'id' | 'stackIndex'>) => void
  hideAlert: (id: string) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}

interface AlertProviderProps {
  children: React.ReactNode
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const MAX_ALERTS = 3

  const hideAlert = useCallback((id: string) => {
    setAlerts(prev => {
      const alertIndex = prev.findIndex(alert => alert.id === id)
      if (alertIndex === -1) return prev
      
      const newAlerts = prev.filter(alert => alert.id !== id)
      
      // Reindex remaining alerts to move them up
      return newAlerts.map((alert, index) => ({
        ...alert,
        stackIndex: index
      }))
    })
  }, [])

  const showAlert = useCallback((alertData: Omit<Alert, 'id' | 'stackIndex'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    
    setAlerts(prev => {
      // New alert goes to the top (index 0), push existing alerts down
      let updatedAlerts = prev.map((alert) => ({
        ...alert,
        stackIndex: alert.stackIndex + 1
      }))
      
      // If we already have MAX_ALERTS, remove the oldest one (highest stackIndex)
      if (updatedAlerts.length >= MAX_ALERTS) {
        updatedAlerts = updatedAlerts.slice(0, MAX_ALERTS - 1)
        // Reindex after removal
        updatedAlerts = updatedAlerts.map((alert, index) => ({
          ...alert,
          stackIndex: index + 1
        }))
      }
      
      const newAlert: Alert = {
        ...alertData,
        id,
        stackIndex: 0 // Always place new alerts at the top
      }
      
      return [newAlert, ...updatedAlerts]
    })

    // Auto-hide after duration
    const duration = alertData.duration || 3000
    setTimeout(() => {
      hideAlert(id)
    }, duration + 400) // Add animation duration to total time
  }, [hideAlert])

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alerts.map((alert) => (
        <IOSAlert
          key={alert.id}
          message={alert.message}
          type={alert.type}
          visible={true}
          onHide={() => hideAlert(alert.id)}
          duration={alert.duration}
          stackIndex={alert.stackIndex}
        />
      ))}
    </AlertContext.Provider>
  )
}
