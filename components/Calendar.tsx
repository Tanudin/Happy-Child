import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface CalendarProps {
  childName: string;
  childId: string;
  onConfirm: (selectedDates: Date[]) => void;
  onCancel: () => void;
}

export default function Calendar({ childName, childId, onConfirm, onCancel }: CalendarProps) {
  const colorScheme = useColorScheme();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExistingEvents();
  }, [childId]);

  useEffect(() => {
    fetchExistingEvents();
  }, [currentMonth]);

  const fetchExistingEvents = async () => {
    try {
      setLoading(true);
      
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      firstDay.setHours(0, 0, 0, 0);
      lastDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('start_time')
        .eq('child_id', childId)
        .gte('start_time', firstDay.toISOString())
        .lte('start_time', lastDay.toISOString());

      if (error) {
        console.error('Error fetching calendar events:', error);
        return;
      }

      const existingDates = data.map(event => {
        const eventDate = new Date(event.start_time);
        return new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      });

      setSelectedDates(existingDates);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateSelected = (date: Date | null) => {
    if (!date) return false;
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const toggleDateSelection = (date: Date | null) => {
    if (!date) return;
    
    const isSelected = isDateSelected(date);
    if (isSelected) {
      setSelectedDates(selectedDates.filter(selectedDate => 
        selectedDate.toDateString() !== date.toDateString()
      ));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleConfirm = async () => {
    if (selectedDates.length === 0) {
      Alert.alert('No dates selected', 'Please select at least one date before confirming.');
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        Alert.alert('Error', 'Failed to get user information.');
        return;
      }

      const userId = userData.user.id;

      const dateStrings = selectedDates.map(date => {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        return { start: startOfDay.toISOString(), end: endOfDay.toISOString() };
      });

      for (const dateRange of dateStrings) {
        await supabase
          .from('calendar_events')
          .delete()
          .eq('child_id', childId)
          .gte('start_time', dateRange.start)
          .lte('start_time', dateRange.end);
      }

      const events = selectedDates.map(date => ({
        child_id: childId,
        user_id: userId,
        start_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0).toISOString(),
        end_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0).toISOString(),
        event_type: 'scheduled',
        location: '',
        notes: `Scheduled day for ${childName}`
      }));

      const { error } = await supabase
        .from('calendar_events')
        .insert(events);

      if (error) {
        console.error('Error saving calendar events:', error);
        Alert.alert('Error', 'Failed to save calendar events.');
        return;
      }

      onConfirm(selectedDates);
    } catch (error) {
      console.error('Error saving calendar events:', error);
      Alert.alert('Error', 'Failed to save calendar events.');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentMonth);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].text }]}>
            Loading calendar...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.childName, { color: Colors[colorScheme ?? 'light'].text }]}>
          {childName}
        </Text>

        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
            <Text style={[styles.navButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>‹</Text>
          </TouchableOpacity>
          
          <Text style={[styles.monthText, { color: Colors[colorScheme ?? 'light'].text }]}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
            <Text style={[styles.navButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dayNamesRow}>
          {dayNames.map(dayName => (
            <Text key={dayName} style={[styles.dayName, { color: Colors[colorScheme ?? 'light'].text }]}>
              {dayName}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {days.map((date, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                date && isDateSelected(date) && [styles.selectedDay, { backgroundColor: Colors[colorScheme ?? 'light'].tint }],
                !date && styles.emptyDay
              ]}
              onPress={() => toggleDateSelection(date)}
              disabled={!date}
            >
              {date && (
                <Text style={[
                  styles.dayText,
                  { color: Colors[colorScheme ?? 'light'].text },
                  isDateSelected(date) && styles.selectedDayText
                ]}>
                  {date.getDate()}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {selectedDates.length > 0 && (
          <View style={styles.selectedDatesContainer}>
            <Text style={[styles.selectedDatesTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Selected Dates:
            </Text>
            <View style={styles.selectedDatesList}>
              {selectedDates.map((date, index) => (
                <Text key={index} style={[styles.selectedDateText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                  {date.toLocaleDateString()}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: Colors[colorScheme ?? 'light'].text }]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelButtonText, { color: Colors[colorScheme ?? 'light'].text }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  childName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 10,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 40,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 20,
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  selectedDay: {
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedDatesContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  selectedDatesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedDateText: {
    fontSize: 14,
    marginRight: 15,
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
