import AsyncStorage from '@react-native-async-storage/async-storage'
import { isBrowser } from './platformUtils'

/**
 * Custom storage adapter for Supabase that safely handles different environments
 * This prevents the "window is not defined" error when running in a Node.js environment
 */
export const createStorageAdapter = () => {
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        // Only attempt to use AsyncStorage in a browser/native environment
        if (isBrowser()) {
          return await AsyncStorage.getItem(key)
        }
        return null
      } catch (error) {
        console.error('Storage adapter getItem error:', error)
        return null
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        if (isBrowser()) {
          await AsyncStorage.setItem(key, value)
        }
      } catch (error) {
        console.error('Storage adapter setItem error:', error)
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        if (isBrowser()) {
          await AsyncStorage.removeItem(key)
        }
      } catch (error) {
        console.error('Storage adapter removeItem error:', error)
      }
    }
  }
}
