/**
 * User Profile Service
 * 
 * Centralized functions for managing user profiles in Supabase
 */

import { supabase } from './supabase'

export interface UserProfile {
  user_id: string
  email: string
  display_name: string | null
  first_name: string
  last_name: string
  birth_date: string
  age: number
  phone_number: string | null
  is_searchable: boolean
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface CreateProfileData {
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber?: string
  email: string
  isSearchable?: boolean
}

/**
 * Calculate age from birth date string
 */
export function calculateAge(birthDateString: string): number {
  const today = new Date()
  const birthDate = new Date(birthDateString)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

/**
 * Create a user profile after successful signup
 * This should be called immediately after supabase.auth.signUp()
 */
export async function createUserProfile(
  userId: string,
  profileData: CreateProfileData
): Promise<{ data: UserProfile | null; error: any }> {
  const displayName = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`
  const calculatedAge = calculateAge(profileData.birthDate)
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        email: profileData.email,
        display_name: displayName,
        first_name: profileData.firstName.trim(),
        last_name: profileData.lastName.trim(),
        birth_date: profileData.birthDate,
        age: calculatedAge,
        phone_number: profileData.phoneNumber?.trim() || null,
        is_searchable: profileData.isSearchable ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      return { data: null, error }
    }

    console.log('User profile created successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error creating profile:', error)
    return { data: null, error }
  }
}

/**
 * Get the current user's profile
 */
export async function getCurrentUserProfile(): Promise<{
  data: UserProfile | null
  error: any
}> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { data: null, error: userError || new Error('No user found') }
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching profile:', error)
    return { data: null, error }
  }
}

/**
 * Get a user profile by user ID
 * Will only work if the profile is searchable or it's the current user
 */
export async function getUserProfileById(
  userId: string
): Promise<{ data: UserProfile | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching profile:', error)
    return { data: null, error }
  }
}

/**
 * Update the current user's profile
 */
export async function updateCurrentUserProfile(
  updates: Partial<Omit<UserProfile, 'user_id' | 'email' | 'created_at' | 'updated_at'>>
): Promise<{ data: UserProfile | null; error: any }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { data: null, error: userError || new Error('No user found') }
    }

    // If birth_date is being updated, recalculate age
    if (updates.birth_date) {
      updates.age = calculateAge(updates.birth_date)
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return { data: null, error }
    }

    console.log('Profile updated successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error updating profile:', error)
    return { data: null, error }
  }
}

/**
 * Search for users by display name
 * Only returns searchable profiles
 */
export async function searchUsersByName(
  searchTerm: string
): Promise<{ data: UserProfile[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_searchable', true)
      .ilike('display_name', `%${searchTerm}%`)
      .order('display_name')

    if (error) {
      console.error('Error searching users:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error searching users:', error)
    return { data: null, error }
  }
}

/**
 * Check if the current user has a profile
 * Returns true if profile exists, false otherwise
 */
export async function currentUserHasProfile(): Promise<boolean> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return false
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    return !error && data !== null
  } catch (error) {
    console.error('Error checking profile:', error)
    return false
  }
}

/**
 * Delete the current user's profile
 * Note: This only deletes the profile, not the auth user
 * To delete the auth user completely, use supabase.auth.admin.deleteUser()
 */
export async function deleteCurrentUserProfile(): Promise<{ error: any }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: userError || new Error('No user found') }
    }

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting profile:', error)
      return { error }
    }

    console.log('Profile deleted successfully')
    return { error: null }
  } catch (error) {
    console.error('Unexpected error deleting profile:', error)
    return { error }
  }
}

/**
 * Get searchable profiles (for friend discovery, etc.)
 * Excludes the current user
 */
export async function getSearchableProfiles(
  limit = 50
): Promise<{ data: UserProfile[] | null; error: any }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let query = supabase
      .from('user_profiles')
      .select('*')
      .eq('is_searchable', true)
      .limit(limit)
      .order('created_at', { ascending: false })

    // Exclude current user if authenticated
    if (user) {
      query = query.neq('user_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching searchable profiles:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching searchable profiles:', error)
    return { data: null, error }
  }
}

/**
 * Update profile searchability
 */
export async function updateProfileSearchability(
  isSearchable: boolean
): Promise<{ data: UserProfile | null; error: any }> {
  return updateCurrentUserProfile({ is_searchable: isSearchable })
}

/**
 * Update profile avatar
 */
export async function updateProfileAvatar(
  avatarUrl: string
): Promise<{ data: UserProfile | null; error: any }> {
  return updateCurrentUserProfile({ avatar_url: avatarUrl })
}

/**
 * Update profile bio
 */
export async function updateProfileBio(
  bio: string
): Promise<{ data: UserProfile | null; error: any }> {
  return updateCurrentUserProfile({ bio })
}
