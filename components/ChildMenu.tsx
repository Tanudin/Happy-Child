import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
}

interface MenuOption {
  id: string;
  title: string;
  icon: string;
  onPress: () => void;
}

interface ChildMenuProps {
  child: Child;
  onBack: () => void;
  onCalendar: () => void;
  onEconomics: () => void;
  // Add more function props as needed for future features
}

export default function ChildMenu({ child, onBack, onCalendar, onEconomics }: ChildMenuProps) {
  const colorScheme = useColorScheme();

  // Template for menu options - easy to add more icons/functions
  const menuOptions: MenuOption[] = [
    {
      id: 'calendar',
      title: 'Calendar',
      icon: '📅',
      onPress: onCalendar,
    },
    {
      id: 'economics',
      title: 'Economics & Expenses',
      icon: '💰',
      onPress: onEconomics,
    },
    // Template for adding more options:
    // {
    //   id: 'health',
    //   title: 'Health',
    //   icon: '🏥',
    //   onPress: onHealth,
    // },
    // {
    //   id: 'education',
    //   title: 'Education',
    //   icon: '📚',
    //   onPress: onEducation,
    // },
    // {
    //   id: 'activities',
    //   title: 'Activities',
    //   icon: '🎨',
    //   onPress: onActivities,
    // },
    // {
    //   id: 'photos',
    //   title: 'Photos',
    //   icon: '📸',
    //   onPress: onPhotos,
    // },
  ];

  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return '';
    
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age > 0 ? `${age} years old` : 'Less than 1 year old';
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: Colors[colorScheme ?? 'light'].primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>
      </View>

      {/* Child profile section */}
      <View style={styles.profileSection}>
        {/* Child's picture with fixed size and cropping */}
        <View style={styles.profileImageContainer}>
          <Image
            source={require('../assets/images/child_placeholder.png')}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
        
        <Text style={[styles.childName, { color: Colors[colorScheme ?? 'light'].text }]}>
          {child.name}
        </Text>
        
        {child.date_of_birth && (
          <Text style={[styles.childAge, { color: Colors[colorScheme ?? 'light'].text }]}>
            {calculateAge(child.date_of_birth)}
          </Text>
        )}
      </View>

      {/* Menu options grid */}
      <View style={styles.menuGrid}>
        {menuOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.menuButton, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
            onPress={option.onPress}
          >
            <View style={[styles.menuButtonContent, { borderColor: Colors[colorScheme ?? 'light'].tint }]}>
              <Text style={styles.menuIcon}>{option.icon}</Text>
              <Text style={[styles.menuTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                {option.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {/* Template placeholder buttons for future features */}
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
          onPress={() => {/* Add your function here */}}
        >
          <View style={[styles.menuButtonContent, { borderColor: Colors[colorScheme ?? 'light'].tint, opacity: 0.5 }]}>
            <Text style={styles.menuIcon}>🏥</Text>
            <Text style={[styles.menuTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Health
            </Text>
            <Text style={[styles.comingSoon, { color: Colors[colorScheme ?? 'light'].text }]}>
              Coming Soon
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
          onPress={() => {/* Add your function here */}}
        >
          <View style={[styles.menuButtonContent, { borderColor: Colors[colorScheme ?? 'light'].tint, opacity: 0.5 }]}>
            <Text style={styles.menuIcon}>📚</Text>
            <Text style={[styles.menuTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Education
            </Text>
            <Text style={[styles.comingSoon, { color: Colors[colorScheme ?? 'light'].text }]}>
              Coming Soon
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  childName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  childAge: {
    fontSize: 16,
    opacity: 0.7,
  },
  menuGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: '48%',
    marginBottom: 15,
  },
  menuButtonContent: {
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 5,
    fontStyle: 'italic',
  },
});
