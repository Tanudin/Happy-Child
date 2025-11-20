/**
 * Admin Script: Create Missing Profiles
 * 
 * Run this script to create profiles for all users who don't have one.
 * This is useful for migrating legacy users who were created before
 * the profile system was implemented.
 * 
 * Usage:
 *   1. Make sure you're logged in as an admin user
 *   2. Import and call this function from your app
 *   3. Or run it as a standalone script
 */

import { adminCreateMissingProfiles } from '../lib/createMissingProfiles'

/**
 * Main function - creates profiles for all users without them
 */
export async function runMigration() {
  console.log('=' .repeat(60))
  console.log('PROFILE MIGRATION SCRIPT')
  console.log('Creating profiles for legacy users')
  console.log('=' .repeat(60))
  console.log('')

  try {
    await adminCreateMissingProfiles()
    
    console.log('')
    console.log('=' .repeat(60))
    console.log('MIGRATION COMPLETE')
    console.log('=' .repeat(60))
    
    return { success: true }
  } catch (error) {
    console.error('')
    console.error('=' .repeat(60))
    console.error('MIGRATION FAILED')
    console.error('=' .repeat(60))
    console.error('Error:', error)
    
    return { success: false, error }
  }
}

// If you want to run this as a standalone script, uncomment:
// runMigration()

/**
 * Alternative: Create profile on login if missing
 * Add this to your login flow or app initialization
 */
export { ensureCurrentUserHasProfile } from '../lib/createMissingProfiles'

/**
 * Alternative: Manual creation for specific users
 * Use this if you want more control
 */
export {
    createMissingProfiles, createPlaceholderProfile, findUsersWithoutProfiles
} from '../lib/createMissingProfiles'

