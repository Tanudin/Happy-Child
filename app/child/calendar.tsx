import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

interface CalendarEvent {
  id: string;
  start_time: string;
  end_time: string;
  activity_name: string;
  child_id: string;
  notes?: string;
  location?: string;
  color?: string;
  isRecurring?: boolean;
}

interface CustodySchedule {
  id: string;
  days_of_week: number[];
  parent_name: string;
  color: string;
  user_id: string;
}

interface RecurringActivity {
  id: string;
  activity_name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  color: string;
  child_id: string;
}

interface CalendarProps {
  childName: string;
  childId: string;
  onConfirm: (selectedDates: Date[]) => void;
  onCancel: () => void;
}

export default function Calendar({ childName, childId, onConfirm, onCancel }: CalendarProps) {
  const colorScheme = useColorScheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [custodySchedules, setCustodySchedules] = useState<CustodySchedule[]>([]);
  const [recurringActivities, setRecurringActivities] = useState<RecurringActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEventModalVisible, setAddEventModalVisible] = useState(false);
  const [dayViewModalVisible, setDayViewModalVisible] = useState(false);
  const [editEventModalVisible, setEditEventModalVisible] = useState(false);
  const [custodyModalVisible, setCustodyModalVisible] = useState(false);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [newEventName, setNewEventName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [dateInputText, setDateInputText] = useState('');
  const [editDateInputText, setEditDateInputText] = useState('');
  const [parents, setParents] = useState<{id: string, name: string, color: string}[]>([]);

  useEffect(() => {
    loadData();
  }, [childId, currentMonth]);

  const loadData = async () => {
    await Promise.all([fetchEvents(), fetchCustodySchedules(), fetchRecurringActivities(), fetchParents()]);
    setLoading(false);
  };

  const fetchParents = async () => {
    try {
      // First, fetch all user_children links for this child
      const { data: userChildrenData, error: userChildrenError } = await supabase
        .from('user_children')
        .select('user_id')
        .eq('child_id', childId);

      if (userChildrenError) {
        console.error('Error fetching user_children:', userChildrenError);
        return;
      }

      if (!userChildrenData || userChildrenData.length === 0) {
        console.log('No parents found for child:', childId);
        setParents([]);
        return;
      }

      // Get the user IDs
      const userIds = userChildrenData.map(uc => uc.user_id);

      // Fetch user profiles for those user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, display_name, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      console.log('Found profiles:', profilesData);

      // Get current user to add "(You)" indicator
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create parent list with colors
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F3A683', '#786FA6', '#F8B500'];
      const parentList = (profilesData || []).map((profile: any, index: number) => {
        // Get name from profile - prefer display_name
        let name = '';
        if (profile.display_name) {
          name = profile.display_name;
        } else if (profile.first_name && profile.last_name) {
          name = `${profile.first_name} ${profile.last_name}`;
        } else if (profile.email) {
          name = profile.email;
        } else {
          name = `Guardian ${index + 1}`;
        }
        
        // If this is the current user, add "(You)" indicator
        if (user && profile.user_id === user.id) {
          name = `${name} (You)`;
        }
        
        return {
          id: profile.user_id,
          name: name,
          color: colors[index % colors.length]
        };
      });

      console.log('Parent list created:', parentList);
      setParents(parentList);
    } catch (error) {
      console.error('Error fetching parents:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, start_time, end_time, activity_name, child_id, notes, location')
        .eq('child_id', childId)
        .gte('start_time', firstDay.toISOString())
        .lte('start_time', lastDay.toISOString());

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchCustodySchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('custody_schedules')
        .select('id, days_of_week, color, user_id')
        .eq('child_id', childId);

      if (error) {
        console.error('Error fetching custody schedules:', error);
        return;
      }

      // Map the data to include parent_name for backward compatibility
      const schedulesWithNames = data?.map((schedule, index) => ({
        ...schedule,
        parent_name: `Parent ${index + 1}` // Simple name since we don't have profile table
      })) || [];

      setCustodySchedules(schedulesWithNames);
    } catch (error) {
      console.error('Error fetching custody schedules:', error);
    }
  };

  const fetchRecurringActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_activities')
        .select('id, activity_name, days_of_week, start_time, end_time, color, child_id')
        .eq('child_id', childId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching recurring activities:', error);
        return;
      }

      setRecurringActivities(data || []);
    } catch (error) {
      console.error('Error fetching recurring activities:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Add previous month's days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = prevMonthDays; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i + 1),
        isCurrentMonth: false
      });
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Add next month's days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    
    // Get regular events
    const regularEvents = events.filter(event => {
      const eventDate = new Date(event.start_time).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
    
    // Get recurring activities for this day of week
    const recurringEvents = recurringActivities
      .filter(activity => activity.days_of_week.includes(dayOfWeek))
      .map(activity => ({
        id: `recurring-${activity.id}-${dateStr}`,
        start_time: activity.start_time,
        end_time: activity.end_time,
        activity_name: activity.activity_name,
        child_id: childId,
        isRecurring: true,
        color: activity.color
      }));
    
    return [...regularEvents, ...recurringEvents];
  };

  const getCustodyForDate = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    return custodySchedules.find(schedule => 
      schedule.days_of_week.includes(dayOfWeek)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEventName.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      // Parse time strings (HH:MM format)
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          child_id: childId,
          user_id: userData.user.id,
          start_time: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), startHour, startMinute).toISOString(),
          end_time: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), endHour, endMinute).toISOString(),
          event_type: 'scheduled',
          activity_name: newEventName,
          location: '',
          notes: ''
        });

      if (error) {
        console.error('Error adding event:', error);
        Alert.alert('Error', 'Failed to add event');
        return;
      }

      setAddEventModalVisible(false);
      setNewEventName('');
      setStartTime('09:00');
      setEndTime('17:00');
      setSelectedDate(null);
      await fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to add event');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors[colorScheme ?? 'light'].border }]}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setCurrentMonth(new Date())} 
          style={[styles.todayButton, { 
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
            opacity: currentMonth.getMonth() === new Date().getMonth() && 
                     currentMonth.getFullYear() === new Date().getFullYear() ? 0.5 : 1
          }]}
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
        <View style={styles.monthControls}>
          <TouchableOpacity 
            onPress={() => navigateMonth('prev')} 
            style={[styles.navButton, { 
              backgroundColor: `${Colors[colorScheme ?? 'light'].tint}15`,
              borderColor: `${Colors[colorScheme ?? 'light'].tint}40`
            }]}
          >
            <Text style={[styles.navButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: Colors[colorScheme ?? 'light'].text }]}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity 
            onPress={() => navigateMonth('next')} 
            style={[styles.navButton, { 
              backgroundColor: `${Colors[colorScheme ?? 'light'].tint}15`,
              borderColor: `${Colors[colorScheme ?? 'light'].tint}40`
            }]}
          >
            <Text style={[styles.navButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarWrapper}>
        {/* Day Names */}
        <View style={[styles.dayNamesRow, { borderBottomColor: Colors[colorScheme ?? 'light'].border }]}>
          {dayNames.map(day => (
            <View key={day} style={styles.dayNameCell}>
              <Text style={[styles.dayNameText, { color: Colors[colorScheme ?? 'light'].text }]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Days */}
        <ScrollView style={styles.calendarScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.calendarGrid}>
            {Array.from({ length: 6 }).map((_, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((dayObj, dayIndex) => {
                  const dayEvents = getEventsForDate(dayObj.date);
                  const custody = getCustodyForDate(dayObj.date);
                  const isToday = dayObj.date.toDateString() === new Date().toDateString();

                  return (
                    <TouchableOpacity
                      key={`${weekIndex}-${dayIndex}`}
                      style={[
                        styles.dayCell,
                        { borderColor: Colors[colorScheme ?? 'light'].border },
                        !dayObj.isCurrentMonth && styles.otherMonthDay
                      ]}
                      onPress={() => {
                        setSelectedDate(dayObj.date);
                        setDayViewModalVisible(true);
                      }}
                    >
                      {/* Custody Bar */}
                      {custody && (
                        <View style={[styles.custodyBar, { backgroundColor: custody.color }]} />
                      )}

                      {/* Date Number */}
                      <View style={[
                        styles.dateNumberContainer,
                        isToday && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
                      ]}>
                        <Text style={[
                          styles.dateNumber,
                          { color: dayObj.isCurrentMonth ? Colors[colorScheme ?? 'light'].text : Colors[colorScheme ?? 'light'].textLight },
                          isToday && styles.todayText
                        ]}>
                          {dayObj.date.getDate()}
                        </Text>
                      </View>

                      {/* Events */}
                      <View style={styles.eventsContainer}>
                        {dayEvents.slice(0, 3).map((event) => {
                          const isRecurring = 'isRecurring' in event && event.isRecurring;
                          const eventColor: string = isRecurring && 'color' in event 
                            ? event.color
                            : Colors[colorScheme ?? 'light'].tint;
                          
                          return (
                            <View
                              key={event.id}
                              style={[styles.eventDot, { backgroundColor: eventColor }]}
                            >
                              <Text style={styles.eventText} numberOfLines={1}>
                                {event.activity_name}
                              </Text>
                            </View>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <Text style={[styles.moreEvents, { color: Colors[colorScheme ?? 'light'].textLight }]}>
                            +{dayEvents.length - 3} more
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <View style={styles.fabContainer}>
          {fabMenuVisible && (
            <View style={styles.fabMenu}>
              <TouchableOpacity
                style={[styles.fabMenuItem, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}
                onPress={() => {
                  setFabMenuVisible(false);
                  setSelectedDate(new Date());
                  setAddEventModalVisible(true);
                }}
              >
                <Text style={[styles.fabMenuText, { color: Colors[colorScheme ?? 'light'].text }]}>Add Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fabMenuItem, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}
                onPress={() => {
                  setFabMenuVisible(false);
                  setCustodyModalVisible(true);
                }}
              >
                <Text style={[styles.fabMenuText, { color: Colors[colorScheme ?? 'light'].text }]}>Custody Schedule</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={() => setFabMenuVisible(!fabMenuVisible)}
          >
            <Text style={styles.fabText}>{fabMenuVisible ? '×' : '+'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Day View Modal */}
      <Modal
        visible={dayViewModalVisible}
        animationType="slide"
        transparent={false}
      >
        <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <View style={[styles.dayViewHeader, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setDayViewModalVisible(false)}
            >
              <Text style={[styles.backButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.dayViewTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
            </Text>
            <TouchableOpacity
              style={[styles.addEventButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={() => {
                setDayViewModalVisible(false);
                setAddEventModalVisible(true);
              }}
            >
              <Text style={styles.addEventButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.dayViewContent}>
            {Array.from({ length: 24 }, (_, i) => {
              const hour = i;
              const hourString = hour.toString().padStart(2, '0') + ':00';
              const dayEvents = selectedDate ? getEventsForDate(selectedDate) : [];
              const eventsAtThisHour = dayEvents.filter(event => {
                // Extract time from full timestamp or time string (HH:MM or YYYY-MM-DDTHH:MM)
                const timeStr = event.start_time.includes('T') 
                  ? event.start_time.split('T')[1] 
                  : event.start_time;
                const eventHour = Number.parseInt(timeStr.split(':')[0], 10);
                return eventHour === hour;
              });

              return (
                <View key={hour} style={styles.hourRow}>
                  <View style={styles.hourLabelContainer}>
                    <Text style={[styles.hourLabel, { color: Colors[colorScheme ?? 'light'].textLight }]}>
                      {hourString}
                    </Text>
                  </View>
                  <View style={[styles.hourContent, { borderColor: Colors[colorScheme ?? 'light'].border }]}>
                    {eventsAtThisHour.map((event, idx) => {
                      // Extract time from full timestamp or time string
                      const startTimeStr = event.start_time.includes('T') 
                        ? event.start_time.split('T')[1].split('.')[0] // Remove milliseconds if present
                        : event.start_time;
                      const endTimeStr = event.end_time.includes('T')
                        ? event.end_time.split('T')[1].split('.')[0]
                        : event.end_time;
                      
                      // Calculate event duration and position
                      const [startHour, startMin] = startTimeStr.split(':').map(Number);
                      const [endHour, endMin] = endTimeStr.split(':').map(Number);
                      const startMinutes = startHour * 60 + startMin;
                      const endMinutes = endHour * 60 + endMin;
                      const durationMinutes = endMinutes - startMinutes;
                      const heightPerMinute = 1; // 60px per hour, so 1px per minute
                      const eventHeight = durationMinutes * heightPerMinute;
                      const topOffset = startMin * heightPerMinute;

                      return (
                        <TouchableOpacity
                          key={event.id}
                          style={[
                            styles.dayEventBlock,
                            {
                              backgroundColor: event.color ? event.color : Colors[colorScheme ?? 'light'].tint,
                              height: eventHeight,
                              top: topOffset,
                            }
                          ]}
                          onPress={() => {
                            // Check if this is a recurring activity
                            if (event.isRecurring || event.id?.toString().startsWith('recurring-')) {
                              Alert.alert(
                                'Recurring Activity',
                                'This is a recurring activity. To edit it, please go to the "Recurring Activities" menu.',
                                [{ text: 'OK' }]
                              );
                              return;
                            }
                            setSelectedEvent(event);
                            setDayViewModalVisible(false);
                            setEditEventModalVisible(true);
                          }}
                        >
                          <Text style={styles.dayEventName} numberOfLines={1}>{event.activity_name}</Text>
                          <Text style={styles.dayEventTime} numberOfLines={1}>
                            {startTimeStr.substring(0, 5)} - {endTimeStr.substring(0, 5)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Add Event Modal */}
      <Modal
        visible={addEventModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddEventModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
            <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Add Event
            </Text>
            
            {/* Date Input - Full Width */}
            <View style={styles.dateFieldContainer}>
              <Text style={[styles.timeLabel, { color: Colors[colorScheme ?? 'light'].text }]}>Date</Text>
              <TextInput
                style={[styles.modalInput, {
                  backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].border
                }]}
                value={dateInputText || selectedDate?.toISOString().split('T')[0] || ''}
                onChangeText={(text) => {
                  setDateInputText(text);
                  // Only update the date if it's a valid complete date (10 characters: YYYY-MM-DD)
                  if (text.length === 10) {
                    const newDate = new Date(text);
                    if (!Number.isNaN(newDate.getTime())) {
                      setSelectedDate(newDate);
                    }
                  }
                }}
                onFocus={() => {
                  // Set the text field to current date when focused
                  if (selectedDate) {
                    setDateInputText(selectedDate.toISOString().split('T')[0]);
                  }
                }}
                onBlur={() => {
                  // Clear the text input on blur, it will show the formatted date
                  setDateInputText('');
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
              />
            </View>

            {/* Event Name */}
            <TextInput
              style={[styles.modalInput, {
                backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                color: Colors[colorScheme ?? 'light'].text,
                borderColor: Colors[colorScheme ?? 'light'].border
              }]}
              value={newEventName}
              onChangeText={setNewEventName}
              placeholder="Event name"
              placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
            />
            <View style={styles.timeInputsRow}>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeLabel, { color: Colors[colorScheme ?? 'light'].text }]}>Start Time</Text>
                <TextInput
                  style={[styles.timeInput, {
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
                />
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeLabel, { color: Colors[colorScheme ?? 'light'].text }]}>End Time</Text>
                <TextInput
                  style={[styles.timeInput, {
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="17:00"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
                />
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: Colors[colorScheme ?? 'light'].border }]}
                onPress={() => {
                  setAddEventModalVisible(false);
                  setNewEventName('');
                  setStartTime('09:00');
                  setEndTime('17:00');
                }}
              >
                <Text style={[styles.modalButtonText, { color: Colors[colorScheme ?? 'light'].text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                onPress={handleAddEvent}
              >
                <Text style={[styles.modalButtonText, styles.addButtonText]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={editEventModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
            <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>Edit Event</Text>
            
            {/* Date Input - Full Width */}
            <View style={styles.dateFieldContainer}>
              <Text style={[styles.timeLabel, { color: Colors[colorScheme ?? 'light'].text }]}>Date</Text>
              <TextInput
                style={[styles.modalInput, {
                  backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].border
                }]}
                value={editDateInputText || (selectedEvent?.start_time ? new Date(selectedEvent.start_time).toISOString().split('T')[0] : '')}
                onChangeText={(text) => {
                  setEditDateInputText(text);
                  // Only update the date if it's a valid complete date (10 characters: YYYY-MM-DD)
                  if (text.length === 10 && selectedEvent) {
                    const newDate = new Date(text);
                    if (!Number.isNaN(newDate.getTime())) {
                      // Extract time from current start_time
                      const timeStr = selectedEvent.start_time.includes('T') 
                        ? selectedEvent.start_time.split('T')[1]
                        : selectedEvent.start_time;
                      const endTimeStr = selectedEvent.end_time.includes('T')
                        ? selectedEvent.end_time.split('T')[1]
                        : selectedEvent.end_time;
                      
                      setSelectedEvent({
                        ...selectedEvent,
                        start_time: `${text}T${timeStr}`,
                        end_time: `${text}T${endTimeStr}`
                      });
                    }
                  }
                }}
                onFocus={() => {
                  // Set the text field to current date when focused
                  if (selectedEvent?.start_time) {
                    setEditDateInputText(new Date(selectedEvent.start_time).toISOString().split('T')[0]);
                  }
                }}
                onBlur={() => {
                  // Clear the text input on blur
                  setEditDateInputText('');
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
              />
            </View>

            {/* Event Name */}
            <TextInput
              style={[styles.modalInput, {
                backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                color: Colors[colorScheme ?? 'light'].text,
                borderColor: Colors[colorScheme ?? 'light'].border
              }]}
              value={selectedEvent?.activity_name}
              onChangeText={(text) => setSelectedEvent((prev: CalendarEvent | null) => prev ? { ...prev, activity_name: text } : null)}
              placeholder="Event name"
              placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
            />
            <View style={styles.timeInputsRow}>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeLabel, { color: Colors[colorScheme ?? 'light'].text }]}>Start Time</Text>
                <TextInput
                  style={[styles.timeInput, {
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  value={selectedEvent?.start_time ? (
                    selectedEvent.start_time.includes('T') 
                      ? selectedEvent.start_time.split('T')[1].substring(0, 5)
                      : selectedEvent.start_time
                  ) : ''}
                  onChangeText={(text) => {
                    if (!selectedEvent) return;
                    const dateStr = selectedEvent.start_time.includes('T')
                      ? selectedEvent.start_time.split('T')[0]
                      : new Date().toISOString().split('T')[0];
                    setSelectedEvent({
                      ...selectedEvent,
                      start_time: `${dateStr}T${text}:00`
                    });
                  }}
                  placeholder="09:00"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
                />
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeLabel, { color: Colors[colorScheme ?? 'light'].text }]}>End Time</Text>
                <TextInput
                  style={[styles.timeInput, {
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  value={selectedEvent?.end_time ? (
                    selectedEvent.end_time.includes('T')
                      ? selectedEvent.end_time.split('T')[1].substring(0, 5)
                      : selectedEvent.end_time
                  ) : ''}
                  onChangeText={(text) => {
                    if (!selectedEvent) return;
                    const dateStr = selectedEvent.end_time.includes('T')
                      ? selectedEvent.end_time.split('T')[0]
                      : new Date().toISOString().split('T')[0];
                    setSelectedEvent({
                      ...selectedEvent,
                      end_time: `${dateStr}T${text}:00`
                    });
                  }}
                  placeholder="17:00"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
                />
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton, { backgroundColor: '#FF3B30' }]}
                onPress={async () => {
                  if (!selectedEvent) return;
                  try {
                    const { error } = await supabase
                      .from('calendar_events')
                      .delete()
                      .eq('id', selectedEvent.id);
                    if (error) throw error;
                    setEditEventModalVisible(false);
                    setSelectedEvent(null);
                    fetchEvents();
                  } catch (error) {
                    console.error('Error deleting event:', error);
                  }
                }}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: Colors[colorScheme ?? 'light'].border }]}
                onPress={() => {
                  setEditEventModalVisible(false);
                  setSelectedEvent(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: Colors[colorScheme ?? 'light'].text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                onPress={async () => {
                  if (!selectedEvent) return;
                  try {
                    // The start_time and end_time in selectedEvent should already be full timestamps
                    // because we update them when the date or time is changed
                    const { error } = await supabase
                      .from('calendar_events')
                      .update({
                        activity_name: selectedEvent.activity_name,
                        start_time: selectedEvent.start_time,
                        end_time: selectedEvent.end_time,
                      })
                      .eq('id', selectedEvent.id);
                    if (error) throw error;
                    setEditEventModalVisible(false);
                    setSelectedEvent(null);
                    fetchEvents();
                  } catch (error) {
                    console.error('Error updating event:', error);
                  }
                }}
              >
                <Text style={[styles.modalButtonText, styles.addButtonText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custody Schedule Modal */}
      <Modal
        visible={custodyModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.custodyModalContent, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
            <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>Custody Schedule</Text>
            <Text style={[styles.custodySubtitle, { color: Colors[colorScheme ?? 'light'].textLight }]}>
              {parents.length === 0 
                ? 'No guardians found for this child' 
                : `Assign days for ${parents.length} guardian${parents.length > 1 ? 's' : ''}`}
            </Text>

            {parents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: Colors[colorScheme ?? 'light'].textLight }]}>
                  Add guardians to this child in the profile settings to manage custody schedules.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.parentsContainer}>
              {parents.map((parent) => {
                const existingSchedule = custodySchedules.find(s => s.user_id === parent.id);
                const selectedDays = existingSchedule?.days_of_week || [];

                return (
                  <View key={parent.id} style={styles.parentSection}>
                    <View style={styles.parentHeader}>
                      <View style={[styles.parentColorDot, { backgroundColor: parent.color }]} />
                      <Text style={[styles.parentName, { color: Colors[colorScheme ?? 'light'].text }]}>
                        {parent.name}
                      </Text>
                    </View>
                    <View style={styles.daysGrid}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                        const isSelected = selectedDays.includes(index);
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayButton,
                              {
                                backgroundColor: isSelected ? parent.color : Colors[colorScheme ?? 'light'].inputBackground,
                                borderColor: parent.color,
                              }
                            ]}
                            onPress={async () => {
                              let newDays: number[];
                              if (isSelected) {
                                newDays = selectedDays.filter(d => d !== index);
                              } else {
                                newDays = [...selectedDays, index];
                              }

                              try {
                                if (existingSchedule) {
                                  // Update existing schedule
                                  const { error } = await supabase
                                    .from('custody_schedules')
                                    .update({ days_of_week: newDays })
                                    .eq('id', existingSchedule.id);
                                  if (error) throw error;
                                } else {
                                  // Create new schedule
                                  const { error } = await supabase
                                    .from('custody_schedules')
                                    .insert({
                                      user_id: parent.id,
                                      child_id: childId,
                                      color: parent.color,
                                      days_of_week: newDays
                                    });
                                  if (error) throw error;
                                }
                                await fetchCustodySchedules();
                              } catch (error) {
                                console.error('Error updating custody schedule:', error);
                              }
                            }}
                          >
                            <View style={styles.dayLetters}>
                              {day.split('').map((letter, i) => (
                                <Text
                                  key={i}
                                  style={[
                                    styles.dayButtonText,
                                    { color: isSelected ? '#fff' : Colors[colorScheme ?? 'light'].text }
                                  ]}
                                >
                                  {letter}
                                </Text>
                              ))}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={() => setCustodyModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingTop: 50,
    borderBottomWidth: 1,
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 6,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 130,
    textAlign: 'center',
  },
  calendarWrapper: {
    flex: 1,
    paddingHorizontal: 8,
  },
  dayNamesRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarScroll: {
    flex: 1,
  },
  calendarGrid: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    height: 100,
  },
  dayCell: {
    flex: 1,
    borderWidth: 0.5,
    padding: 4,
    position: 'relative',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  custodyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  dateNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dateNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  todayText: {
    color: '#fff',
  },
  eventsContainer: {
    flex: 1,
    gap: 2,
  },
  eventDot: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  eventText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  moreEvents: {
    fontSize: 9,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateFieldContainer: {
    marginBottom: 16,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  addButton: {
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonText: {
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  // Day View Styles
  dayViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dayViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addEventButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addEventButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  dayViewContent: {
    flex: 1,
  },
  hourRow: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  hourLabelContainer: {
    width: 60,
    paddingTop: 4,
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  hourLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  hourContent: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
  },
  dayEventBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 4,
    padding: 4,
    justifyContent: 'center',
    opacity: 0.9,
  },
  dayEventName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dayEventTime: {
    color: '#fff',
    fontSize: 10,
  },
  // FAB Styles
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  fabMenu: {
    marginBottom: 10,
    gap: 8,
  },
  fabMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
  fabMenuText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
  // Custody Modal Styles
  custodyModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  custodySubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  parentsContainer: {
    maxHeight: 500,
  },
  parentSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  parentColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  parentName: {
    fontSize: 18,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  dayButton: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    flex: 1,
    maxWidth: 48,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLetters: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  doneButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
