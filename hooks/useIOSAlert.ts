import { useCallback, useState } from 'react'

export interface AlertOptions {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export interface UseIOSAlertReturn {
  showAlert: (options: AlertOptions) => void
  hideAlert: () => void
  alertProps: {
    visible: boolean
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration: number
    onHide: () => void
  }
}

export function useIOSAlert(): UseIOSAlertReturn {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [duration, setDuration] = useState(3000)

  const showAlert = useCallback((options: AlertOptions) => {
    setMessage(options.message)
    setType(options.type || 'info')
    setDuration(options.duration || 3000)
    setVisible(true)
  }, [])

  const hideAlert = useCallback(() => {
    setVisible(false)
  }, [])

  return {
    showAlert,
    hideAlert,
    alertProps: {
      visible,
      message,
      type,
      duration,
      onHide: hideAlert,
    },
  }
}
