/**
 * Utility functions for platform detection and environment-specific behavior
 */

/**
 * Checks if the code is running in a browser environment
 * @returns boolean indicating if window is defined (browser environment)
 */
export const isBrowser = () => typeof window !== 'undefined'

/**
 * Checks if the code is running in a server environment (Node.js)
 * @returns boolean indicating if window is not defined (server environment)
 */
export const isServer = () => typeof window === 'undefined'

/**
 * Safely executes a function only in a browser environment
 * @param fn Function to execute in browser environment
 * @param fallback Optional fallback value to return in server environment
 * @returns Result of fn() in browser, fallback in server
 */
export const runInBrowser = <T>(fn: () => T, fallback?: T): T => {
  if (isBrowser()) {
    return fn()
  }
  return fallback as T
}
