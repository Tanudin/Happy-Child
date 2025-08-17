import React, { useEffect } from 'react'
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../constants/Colors'
import { useColorScheme } from '../hooks/useColorScheme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const ALERT_WIDTH = SCREEN_WIDTH - 40
const ALERT_HEIGHT = 60  // Made thinner - reduced from 80 to 60
const ALERT_SPACING = 10  // Space between stacked alerts
const ANIMATION_DURATION = 400  // Slightly longer for smoother animation
const DISPLAY_DURATION = 3000 // 3 seconds

export interface IOSAlertProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  visible: boolean
  onHide: () => void
  duration?: number
  stackIndex?: number
}

export default function IOSAlert({ 
  message, 
  type = 'info', 
  visible, 
  onHide, 
  duration = DISPLAY_DURATION,
  stackIndex = 0
}: IOSAlertProps) {
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()
  
  // Calculate the target position based on stack index
  const targetPosition = stackIndex * (ALERT_HEIGHT + ALERT_SPACING)
  
  // Start with a larger negative value to ensure it's completely off-screen
  const translateY = useSharedValue(-150)
  const opacity = useSharedValue(0)
  const progressWidth = useSharedValue(0)

  const hideAlert = () => {
    onHide()
  }

  useEffect(() => {
    console.log('IOSAlert useEffect triggered - visible:', visible, 'message:', message, 'stackIndex:', stackIndex)
    if (visible) {
      console.log('Showing alert with animation at position:', targetPosition)
      
      // Animate in from off-screen position to the correct stack position
      translateY.value = withTiming(targetPosition, { 
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic)
      })
      opacity.value = withTiming(1, { 
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic)
      })
      
      // Start progress bar animation after the ease-in completes
      setTimeout(() => {
        progressWidth.value = withTiming(100, { 
          duration: duration - ANIMATION_DURATION,
          easing: Easing.linear
        })
      }, ANIMATION_DURATION)
      
      // Hide animation after duration
      setTimeout(() => {
        translateY.value = withTiming(-150, { 
          duration: ANIMATION_DURATION,
          easing: Easing.in(Easing.cubic)
        }, () => {
          runOnJS(hideAlert)()
        })
        opacity.value = withTiming(0, { 
          duration: ANIMATION_DURATION,
          easing: Easing.in(Easing.cubic)
        })
      }, duration)
      
    } else {
      console.log('Resetting alert values')
      // Reset values
      translateY.value = -150
      opacity.value = 0
      progressWidth.value = 0
    }
  }, [visible, duration, targetPosition])

  // Handle stack position changes when alerts are removed
  useEffect(() => {
    if (visible) {
      // Animate to new position when stack index changes
      translateY.value = withTiming(targetPosition, { 
        duration: ANIMATION_DURATION / 2, // Faster animation for repositioning
        easing: Easing.out(Easing.cubic)
      })
    }
  }, [targetPosition, visible])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    }
  })

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    }
  })

  const getAlertColors = () => {
    const colors = Colors[colorScheme ?? 'light']
    
    switch (type) {
      case 'success':
        return {
          background: '#28A745', // More vibrant green
          text: '#fff',
          progress: 'rgba(255, 255, 255, 0.4)'
        }
      case 'error':
        return {
          background: '#DC3545', // More vibrant red
          text: '#fff',
          progress: 'rgba(255, 255, 255, 0.4)'
        }
      case 'warning':
        return {
          background: '#FF9500',
          text: '#fff',
          progress: 'rgba(255, 255, 255, 0.4)'
        }
      case 'info':
      default:
        return {
          background: colorScheme === 'dark' ? '#2C2C2E' : '#F8F9FA',
          text: colorScheme === 'dark' ? '#fff' : '#333',
          progress: colors.primary
        }
    }
  }

  const alertColors = getAlertColors()

  console.log('IOSAlert render - visible:', visible, 'message:', message, 'alertColors:', alertColors)

  if (!visible) {
    console.log('IOSAlert not visible, returning null')
    return null
  }

  console.log('IOSAlert rendering with insets.top:', insets.top)

  return (
    <View style={[styles.container, { top: insets.top + 5 }]}>
      {/* Show immediately for testing, then animate */}
      {visible && (
        <Animated.View 
          style={[
            styles.alert, 
            { backgroundColor: alertColors.background },
            animatedStyle
          ]}
        >
          <View style={styles.content}>
            <Text 
              style={[
                styles.message, 
                { color: alertColors.text }
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
            
            {/* Close button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={hideAlert}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeButtonText, { color: alertColors.text, opacity: 0.6 }]}>×</Text>
            </TouchableOpacity>
          </View>
          
          {/* Progress bar container */}
          <View style={styles.progressContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                { backgroundColor: alertColors.progress },
                progressStyle
              ]} 
            />
          </View>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    paddingHorizontal: 16,
    elevation: 999,
  },
  alert: {
    width: '100%',
    minHeight: ALERT_HEIGHT,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'left',
    lineHeight: 18,
    flex: 1,
    paddingRight: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 20,
    textAlign: 'center',
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
})
