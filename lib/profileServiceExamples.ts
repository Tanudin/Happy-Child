/**
 * EXAMPLE: Refactored Signup Function
 * 
 * This shows how to use the userProfileService in your login.tsx
 * You can replace your current signUpWithEmail function with this
 */

import { supabase } from '@/lib/supabase'
import { calculateAge, createUserProfile } from '@/lib/userProfileService'
import { Alert } from 'react-native'

async function signUpWithEmail() {
  setLoading(true)
  
  // ============================================
  // VALIDATION (same as before)
  // ============================================
  if (!firstName.trim() || !lastName.trim()) {
    Alert.alert('Please enter your first and last name')
    setLoading(false)
    return
  }
  
  if (!email.trim() || !password.trim()) {
    Alert.alert('Please enter your email and password')
    setLoading(false)
    return
  }
  
  if (password !== confirmPassword) {
    Alert.alert('Passwords do not match')
    setLoading(false)
    return
  }
  
  if (password.length < 6) {
    Alert.alert('Password must be at least 6 characters long')
    setLoading(false)
    return
  }
  
  if (!birthDate.trim()) {
    Alert.alert('Please enter your birth date')
    setLoading(false)
    return
  }
  
  // Validate birthdate format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(birthDate)) {
    Alert.alert('Please enter birth date in YYYY-MM-DD format')
    setLoading(false)
    return
  }
  
  // Validate that it's a valid date
  const dateObj = new Date(birthDate)
  if (isNaN(dateObj.getTime()) || dateObj > new Date()) {
    Alert.alert('Please enter a valid birth date')
    setLoading(false)
    return
  }
  
  // Calculate and validate age
  const calculatedAge = calculateAge(birthDate)
  if (calculatedAge < 1 || calculatedAge > 120) {
    Alert.alert('Please enter a valid birth date (age must be between 1 and 120)')
    setLoading(false)
    return
  }
  
  // ============================================
  // CREATE AUTH USER
  // ============================================
  const {
    data: { session, user },
    error: authError,
  } = await supabase.auth.signUp({
    email: email.trim(),
    password: password,
  })

  if (authError) {
    console.error('Signup auth error:', authError)
    Alert.alert('Signup Error', `Failed to create account: ${authError.message}`)
    setLoading(false)
    return
  }
  
  // Get the user (from session or directly)
  const userToUse = session?.user || user
  
  if (!userToUse) {
    console.error('No user returned from signup')
    Alert.alert('Signup Issue', 'Account creation failed. Please try again.')
    setLoading(false)
    return
  }
  
  // ============================================
  // CREATE USER PROFILE (using service)
  // ============================================
  const { data: profile, error: profileError } = await createUserProfile(
    userToUse.id,
    {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate,
      email: email.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      isSearchable: true,
    }
  )

  if (profileError) {
    console.error('Profile creation failed:', profileError)
    Alert.alert(
      'Profile Creation Error',
      `Account created but profile setup failed: ${profileError.message || 'Unknown error'}\n\nPlease contact support.`
    )
    setLoading(false)
    return
  }
  
  // ============================================
  // SUCCESS!
  // ============================================
  console.log('User profile created successfully:', profile)
  Alert.alert('Success!', 'Account created successfully!')
  
  setLoading(false)
}

/**
 * ALTERNATIVE: Even simpler version with less error handling
 */
async function signUpWithEmailSimple() {
  setLoading(true)
  
  try {
    // Validate (your existing validation code here)
    // ...
    
    // Create auth user
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    })
    
    if (authError) throw authError
    if (!user) throw new Error('No user returned')
    
    // Create profile using service
    const { error: profileError } = await createUserProfile(user.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate,
      email: email.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      isSearchable: true,
    })
    
    if (profileError) throw profileError
    
    Alert.alert('Success!', 'Account created successfully!')
    
  } catch (error: any) {
    console.error('Signup error:', error)
    Alert.alert('Error', error.message || 'Failed to create account')
  } finally {
    setLoading(false)
  }
}

/**
 * EXAMPLE: Using other profile service functions
 */

// Get current user's profile (for profile screen)
async function loadUserProfile() {
  const { data: profile, error } = await getCurrentUserProfile()
  
  if (error) {
    console.error('Failed to load profile:', error)
    return
  }
  
  if (profile) {
    console.log('User:', profile.display_name)
    console.log('Age:', profile.age)
    console.log('Searchable:', profile.is_searchable)
  }
}

// Update profile (for edit profile screen)
async function updateBio(newBio: string) {
  const { data, error } = await updateCurrentUserProfile({
    bio: newBio,
  })
  
  if (error) {
    Alert.alert('Error', 'Failed to update bio')
    return
  }
  
  Alert.alert('Success', 'Bio updated!')
}

// Search for users (for friend search)
async function searchForFriends(searchTerm: string) {
  const { data: users, error } = await searchUsersByName(searchTerm)
  
  if (error) {
    console.error('Search failed:', error)
    return []
  }
  
  return users || []
}

// Get all searchable users (for discover screen)
async function loadDiscoverUsers() {
  const { data: users, error } = await getSearchableProfiles(20)
  
  if (error) {
    console.error('Failed to load users:', error)
    return []
  }
  
  return users || []
}

// Toggle profile privacy
async function toggleProfilePrivacy(isPrivate: boolean) {
  const { error } = await updateProfileSearchability(!isPrivate)
  
  if (error) {
    Alert.alert('Error', 'Failed to update privacy settings')
    return
  }
  
  Alert.alert('Success', isPrivate ? 'Profile is now private' : 'Profile is now public')
}

export {
    loadDiscoverUsers, loadUserProfile, searchForFriends, signUpWithEmail,
    signUpWithEmailSimple, toggleProfilePrivacy, updateBio
}

