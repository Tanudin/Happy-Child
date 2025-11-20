import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile, updateCurrentUserProfile } from '../../lib/userProfileService';

interface UserProfile {
  display_name: string | null;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  age: number;
  phone_number: string | null;
  avatar_url: string | null;
  is_searchable: boolean;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData?.user?.email) {
      Alert.alert('Error', 'Failed to get user information.');
      setLoading(false);
      return;
    }
    
    // Fetch actual profile data from user_profiles table
    const { data: profileData, error: profileError } = await getCurrentUserProfile();
    
    if (profileError || !profileData) {
      Alert.alert('Error', 'Failed to load profile data.');
      setLoading(false);
      return;
    }
    
    setProfile(profileData);
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const handleSettingsPress = () => {
    router.push('/child/settings');
  };

  const handleEditPress = async () => {
    if (editMode && editedProfile) {
      // Save changes to database
      setLoading(true);
      const { data, error } = await updateCurrentUserProfile({
        display_name: editedProfile.display_name,
        first_name: editedProfile.first_name,
        last_name: editedProfile.last_name,
        phone_number: editedProfile.phone_number,
      });
      
      setLoading(false);
      
      if (error) {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
        return;
      }
      
      if (data) {
        setProfile(data);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } else if (profile) {
      setEditedProfile(profile);
    }
    setEditMode(!editMode);
  };

  const handleResetPassword = () => {
    if (!profile) return;
    
    Alert.alert(
      'Reset Password',
      'Are you sure you want to request a password reset email?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: () => {
            supabase.auth.resetPasswordForEmail(profile.email).then(({ error }) => {
              if (error) {
                Alert.alert('Error', 'Failed to send reset email. Please try again.');
              } else {
                Alert.alert('Success', 'Password reset email sent! Check your inbox.');
              }
            });
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>No profile data found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}> 
      <TouchableOpacity 
        style={styles.settingsButton} 
        onPress={handleSettingsPress}
      >
        <Ionicons 
          name="settings" 
          size={24} 
          color={Colors[colorScheme ?? 'light'].text} 
        />
      </TouchableOpacity>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>My Profile</Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image 
                source={profile.avatar_url ? { uri: profile.avatar_url } : require('../../assets/images/mother_placeholder.jpg')} 
                style={styles.avatar}
              />
              {editMode && (
                <TouchableOpacity style={styles.avatarEditButton}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.displayName, { color: Colors[colorScheme ?? 'light'].text }]}>
              {profile.display_name || `${profile.first_name} ${profile.last_name}`}
            </Text>
            <Text style={[styles.lastSeen, { color: Colors[colorScheme ?? 'light'].text }]}>
              {profile.email}
            </Text>
          </View>

          {/* Profile Information */}
          <View style={styles.infoSection}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>Personal Information</Text>
            
            {/* Display Name */}
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>Display Name</Text>
              {editMode && editedProfile ? (
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].text }]}
                  value={editedProfile.display_name || ''}
                  onChangeText={(text) => setEditedProfile({...editedProfile, display_name: text})}
                  placeholder="Enter display name"
                />
              ) : (
                <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>{profile.display_name}</Text>
              )}
            </View>

            {/* First Name */}
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>First Name</Text>
              {editMode && editedProfile ? (
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].text }]}
                  value={editedProfile.first_name}
                  onChangeText={(text) => setEditedProfile({...editedProfile, first_name: text})}
                  placeholder="Enter first name"
                />
              ) : (
                <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>{profile.first_name}</Text>
              )}
            </View>

            {/* Last Name */}
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>Last Name</Text>
              {editMode && editedProfile ? (
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].text }]}
                  value={editedProfile.last_name}
                  onChangeText={(text) => setEditedProfile({...editedProfile, last_name: text})}
                  placeholder="Enter last name"
                />
              ) : (
                <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>{profile.last_name}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>Email</Text>
              <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>{profile.email}</Text>
              <Text style={[styles.note, { color: Colors[colorScheme ?? 'light'].text }]}>Email cannot be changed here</Text>
            </View>

            {/* Phone Number */}
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>Phone Number</Text>
              {editMode && editedProfile ? (
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].text }]}
                  value={editedProfile.phone_number || ''}
                  onChangeText={(text) => setEditedProfile({...editedProfile, phone_number: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>{profile.phone_number || 'Not provided'}</Text>
              )}
            </View>

            {/* Birth Date */}
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>Birth Date</Text>
              <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>{formatDate(profile.birth_date)}</Text>
              <Text style={[styles.note, { color: Colors[colorScheme ?? 'light'].text }]}>Age: {profile.age} years old</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: editMode ? '#4CAF50' : Colors[colorScheme ?? 'light'].primary }]} 
              onPress={handleEditPress}
            >
              <Ionicons 
                name={editMode ? "checkmark" : "pencil"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.editButtonText}>
                {editMode ? 'Save Changes' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.resetPasswordButton, { borderColor: Colors[colorScheme ?? 'light'].primary }]} 
              onPress={handleResetPassword}
            >
              <Ionicons name="mail" size={20} color={Colors[colorScheme ?? 'light'].primary} />
              <Text style={[styles.resetPasswordText, { color: Colors[colorScheme ?? 'light'].primary }]}>
                Request Password Reset Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: '#ff4444' }]} 
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    padding: 8,
    borderRadius: 20,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  lastSeen: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  infoSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  actionSection: {
    gap: 16,
    paddingTop: 16,
  },
  resetPasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  resetPasswordText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
