import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EconomicsProps {
  childName: string;
  childId: string;
  onBack: () => void;
}

export default function Economics({ childName, childId, onBack }: EconomicsProps) {
  const colorScheme = useColorScheme();

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

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
          Economics & Expenses
        </Text>
        
        <Text style={[styles.subtitle, { color: Colors[colorScheme ?? 'light'].text }]}>
          for {childName}
        </Text>

        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderIcon}>💰</Text>
          <Text style={[styles.placeholderText, { color: Colors[colorScheme ?? 'light'].text }]}>
            Economics and expense tracking feature coming soon!
          </Text>
          <Text style={[styles.placeholderSubtext, { color: Colors[colorScheme ?? 'light'].text }]}>
            This will include:
          </Text>
          <View style={styles.featureList}>
            <Text style={[styles.featureItem, { color: Colors[colorScheme ?? 'light'].text }]}>
              • Monthly expense tracking
            </Text>
            <Text style={[styles.featureItem, { color: Colors[colorScheme ?? 'light'].text }]}>
              • Budget planning
            </Text>
            <Text style={[styles.featureItem, { color: Colors[colorScheme ?? 'light'].text }]}>
              • Savings goals
            </Text>
            <Text style={[styles.featureItem, { color: Colors[colorScheme ?? 'light'].text }]}>
              • Expense categories
            </Text>
            <Text style={[styles.featureItem, { color: Colors[colorScheme ?? 'light'].text }]}>
              • Financial reports
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.7,
  },
  placeholderContainer: {
    alignItems: 'center',
    padding: 30,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  placeholderSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'left',
  },
});
