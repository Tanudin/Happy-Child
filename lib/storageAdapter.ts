import AsyncStorage from "@react-native-async-storage/async-storage";
import { isBrowser } from "./platformUtils";

const SUPABASE_AUTH_KEY = "supabase.auth.token";

/**
 * Clear all Supabase auth data from storage
 * Useful when dealing with corrupted or invalid tokens
 */
export const clearSupabaseStorage = async (): Promise<void> => {
  try {
    if (isBrowser()) {
      const keys = await AsyncStorage.getAllKeys();
      const supabaseKeys = keys.filter((key) =>
        key.startsWith("supabase.auth"),
      );
      if (supabaseKeys.length > 0) {
        await AsyncStorage.multiRemove(supabaseKeys);
        console.log("Cleared Supabase auth storage:", supabaseKeys);
      }
    }
  } catch (error) {
    console.error("Error clearing Supabase storage:", error);
  }
};

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
          const value = await AsyncStorage.getItem(key);
          // Validate that the stored data is valid JSON for auth tokens
          if (value && key.includes("supabase.auth")) {
            try {
              JSON.parse(value);
            } catch (e) {
              console.error("Invalid JSON in storage for key:", key);
              await AsyncStorage.removeItem(key);
              return null;
            }
          }
          return value;
        }
        return null;
      } catch (error) {
        console.error("Storage adapter getItem error:", error);
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        if (isBrowser()) {
          await AsyncStorage.setItem(key, value);
        }
      } catch (error) {
        console.error("Storage adapter setItem error:", error);
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        if (isBrowser()) {
          await AsyncStorage.removeItem(key);
        }
      } catch (error) {
        console.error("Storage adapter removeItem error:", error);
      }
    },
  };
};
