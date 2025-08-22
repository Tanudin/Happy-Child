import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

interface CalendarEvent {
  id: string;
  start_time: string;
  end_time: string;
  event_type: string;
  notes: string;
  activity_name: string;
}

interface RecurringEvent {
  id: string;
  days_of_week: number[]; // Array of days [0,1,2] for Mon,Tue,Wed
  parent_name: string; // "Mom" or "Dad" 
  parent_type: 'mom' | 'dad';
  color: string;
}

interface CalendarProps {
  childName: string;
  childId: string;
  onConfirm: (selectedDates: Date[]) => void;
  onCancel: () => void;
}

export default function Calendar({ childName, childId, onConfirm, onCancel }: CalendarProps) {
  const colorScheme = useColorScheme();
  const [selectedDates, setSelectedDates] = useState<Map<string, { date: Date; activity: string }>>(new Map());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recurringEvents, setRecurringEvents] = useState<RecurringEvent[]>([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalActivity, setModalActivity] = useState<{date: Date, activity: string} | null>(null);
  const [editingActivity, setEditingActivity] = useState(false);
  const [editActivityValue, setEditActivityValue] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);
  const [createActivityValue, setCreateActivityValue] = useState('');
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [newRecurringEvent, setNewRecurringEvent] = useState({
    days_of_week: [] as number[],
    parent_name: '',
    parent_type: 'mom' as 'mom' | 'dad',
    color: '#4285f4'
  });

  useEffect(() => {
    fetchExistingEvents();
    fetchRecurringEvents();
  }, [childId]);

  useEffect(() => {
    fetchExistingEvents();
  }, [currentMonth]);

  const fetchRecurringEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('custody_schedules')
        .select('*')
        .eq('child_id', childId);

      if (error) {
        console.error('Error fetching custody schedules:', error);
        return;
      }

      setRecurringEvents(data || []);
    } catch (error) {
      console.error('Error fetching custody schedules:', error);
    }
  };

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
        .select('*')
        .eq('child_id', childId)
        .gte('start_time', firstDay.toISOString())
        .lte('start_time', lastDay.toISOString());

      if (error) {
        console.error('Error fetching calendar events:', error);
        return;
      }

      setEvents(data);
      
      const newSelectedDates = new Map<string, { date: Date; activity: string }>();
      data.forEach(event => {
        const eventDate = new Date(event.start_time);
        const dateKey = eventDate.toISOString().split('T')[0];
        newSelectedDates.set(dateKey, {
          date: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()),
          activity: event.activity_name || ''
        });
      });

      setSelectedDates(newSelectedDates);
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
    
    // Adjust for Monday start (0 = Sunday, 1 = Monday, etc.)
    // Convert Sunday (0) to 6, Monday (1) to 0, etc.
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    const endingDayOfWeek = (lastDay.getDay() + 6) % 7;

    const weeks = [];
    let currentWeek = [];
    
    // Add days from previous month only if needed (not a full week)
    if (startingDayOfWeek > 0) {
      const prevMonth = new Date(year, month - 1, 0);
      const prevMonthDays = prevMonth.getDate();
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const prevDate = new Date(year, month - 1, prevMonthDays - i);
        currentWeek.push({ date: prevDate, isCurrentMonth: false });
      }
    }
    
    // Add all days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      currentWeek.push({ date: currentDate, isCurrentMonth: true });
      
      // If we've completed a week (7 days), push it to weeks array
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Add days from next month only if needed to complete the last week
    if (currentWeek.length > 0) {
      let nextMonthDay = 1;
      while (currentWeek.length < 7) {
        const nextDate = new Date(year, month + 1, nextMonthDay);
        currentWeek.push({ date: nextDate, isCurrentMonth: false });
        nextMonthDay++;
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getRecurringEventForDate = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday = 0
    return recurringEvents.find(event => event.days_of_week.includes(dayOfWeek));
  };

  const getCustodyBarStyle = (date: Date, recurringEvent: RecurringEvent | undefined) => {
    if (!recurringEvent) return null;

    const dayOfWeek = (date.getDay() + 6) % 7;
    const sortedDays = [...recurringEvent.days_of_week].sort();
    const currentDayIndex = sortedDays.indexOf(dayOfWeek);
    
    if (currentDayIndex === -1) return null;

    // Check if this day is part of a consecutive sequence
    const isFirstInSequence = currentDayIndex === 0 || sortedDays[currentDayIndex - 1] !== dayOfWeek - 1;
    const isLastInSequence = currentDayIndex === sortedDays.length - 1 || sortedDays[currentDayIndex + 1] !== dayOfWeek + 1;
    
    let borderRadius = 6; // Default radius
    let marginHorizontal = 2; // Default margin

    // Adjust for connected bars
    if (!isFirstInSequence && !isLastInSequence) {
      // Middle of sequence - no radius, no margin
      borderRadius = 0;
      marginHorizontal = 0;
    } else if (!isFirstInSequence) {
      // Last in sequence - round right only, no left margin
      borderRadius = 0;
      marginHorizontal = 0;
    } else if (!isLastInSequence) {
      // First in sequence - round left only, no right margin
      borderRadius = 0;
      marginHorizontal = 0;
    }

    return {
      borderRadius: isFirstInSequence && isLastInSequence ? 6 : 
                   isFirstInSequence ? 6 : 
                   isLastInSequence ? 6 : 0,
      marginLeft: isFirstInSequence ? 2 : 0,
      marginRight: isLastInSequence ? 2 : 0,
      borderTopLeftRadius: isFirstInSequence ? 6 : 0,
      borderBottomLeftRadius: isFirstInSequence ? 6 : 0,
      borderTopRightRadius: isLastInSequence ? 6 : 0,
      borderBottomRightRadius: isLastInSequence ? 6 : 0,
    };
  };

  const saveRecurringEvent = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) return;

      if (newRecurringEvent.days_of_week.length === 0 || !newRecurringEvent.parent_name.trim()) {
        Alert.alert('Error', 'Please select at least one day and enter parent name.');
        return;
      }

      const { error } = await supabase
        .from('custody_schedules')
        .insert({
          child_id: childId,
          user_id: userData.user.id,
          days_of_week: newRecurringEvent.days_of_week,
          parent_name: newRecurringEvent.parent_name,
          parent_type: newRecurringEvent.parent_type,
          color: newRecurringEvent.color
        });

      if (error) {
        console.error('Error saving custody schedule:', error);
        return;
      }

      await fetchRecurringEvents();
      setRecurringModalVisible(false);
      setNewRecurringEvent({
        days_of_week: [],
        parent_name: '',
        parent_type: 'mom',
        color: '#4285f4'
      });
    } catch (error) {
      console.error('Error saving custody schedule:', error);
    }
  };

  const isDateSelected = (dateObj: { date: Date; isCurrentMonth: boolean } | null) => {
    if (!dateObj) return false;
    return selectedDates.has(dateObj.date.toISOString().split('T')[0]);
  };

  // Add event directly when selecting a date
  const toggleDateSelection = (date: Date | null) => {
    if (!date) return;
    const dateKey = date.toISOString().split('T')[0];
    const isSelected = selectedDates.has(dateKey);
    if (isSelected) {
      // Remove event from database and UI
      setSelectedDates(prev => {
        const newSelected = new Map(prev);
        newSelected.delete(dateKey);
        return newSelected;
      });
      // Remove from database
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      supabase
        .from('calendar_events')
        .delete()
        .eq('child_id', childId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());
    } else {
      Alert.prompt(
        'Activity Name',
        'Enter a name for this activity:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: async (activityName) => {
              setSelectedDates(prev => {
                const newSelected = new Map(prev);
                newSelected.set(dateKey, { date, activity: activityName || '' });
                return newSelected;
              });
              // Add to database immediately
              const { data: userData, error: userError } = await supabase.auth.getUser();
              if (userError || !userData?.user?.id) return;
              const userId = userData.user.id;
              await supabase.from('calendar_events').insert({
                child_id: childId,
                user_id: userId,
                start_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0).toISOString(),
                end_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0).toISOString(),
                event_type: 'scheduled',
                activity_name: activityName,
                location: '',
                notes: `${activityName} scheduled for ${childName}`
              });
            }
          }
        ],
        'plain-text',
        '',
        'default'
      );
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
    if (selectedDates.size === 0) {
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

      const dateStrings = Array.from(selectedDates.values()).map(({ date }) => {
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

      const events = Array.from(selectedDates.values()).map(({ date, activity }) => ({
        child_id: childId,
        user_id: userId,
        start_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0).toISOString(),
        end_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0).toISOString(),
        event_type: 'scheduled',
        activity_name: activity,
        location: '',
        notes: `${activity} scheduled for ${childName}`
      }));

      const { error } = await supabase
        .from('calendar_events')
        .insert(events);

      if (error) {
        console.error('Error saving calendar events:', error);
        Alert.alert('Error', 'Failed to save calendar events.');
        return;
      }

      onConfirm(Array.from(selectedDates.values()).map(item => item.date));
    } catch (error) {
      console.error('Error saving calendar events:', error);
      Alert.alert('Error', 'Failed to save calendar events.');
    }
  };

  // Save edited activity
  async function handleSaveActivityEdit() {
    if (!modalActivity) return;
    // Update in DB
    const startOfDay = new Date(modalActivity.date.getFullYear(), modalActivity.date.getMonth(), modalActivity.date.getDate(), 0, 0, 0);
    const endOfDay = new Date(modalActivity.date.getFullYear(), modalActivity.date.getMonth(), modalActivity.date.getDate(), 23, 59, 59);
    const { error } = await supabase
      .from('calendar_events')
      .update({ activity_name: editActivityValue, notes: `${editActivityValue} scheduled for ${childName}` })
      .eq('child_id', childId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());
    if (!error) {
      setSelectedDates(prev => {
        const newSelected = new Map(prev);
        const dateKey = modalActivity.date.toISOString().split('T')[0];
        if (newSelected.has(dateKey)) {
          newSelected.set(dateKey, { date: modalActivity.date, activity: editActivityValue });
        }
        return newSelected;
      });
      setModalActivity({ ...modalActivity, activity: editActivityValue });
      setEditingActivity(false);
    }
  }

  // Remove event from DB and UI
  async function handleRemoveActivity() {
    if (!modalActivity) return;
    const startOfDay = new Date(modalActivity.date.getFullYear(), modalActivity.date.getMonth(), modalActivity.date.getDate(), 0, 0, 0);
    const endOfDay = new Date(modalActivity.date.getFullYear(), modalActivity.date.getMonth(), modalActivity.date.getDate(), 23, 59, 59);
    await supabase
      .from('calendar_events')
      .delete()
      .eq('child_id', childId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());
    setSelectedDates(prev => {
      const newSelected = new Map(prev);
      const dateKey = modalActivity.date.toISOString().split('T')[0];
      newSelected.delete(dateKey);
      return newSelected;
    });
    setModalVisible(false);
    setEditingActivity(false);
  }

  // Show modal with activity info when pressing a selected date
  const handleShowActivityModal = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const selectedInfo = selectedDates.get(dateKey);
    if (selectedInfo) {
      setModalActivity(selectedInfo);
      setModalVisible(true);
    } else {
      setCreateModalDate(date);
      setCreateActivityValue('');
      setCreateModalVisible(true);
    }
  };

  // Save new activity from create modal
  async function handleSaveCreateActivity() {
    if (!createModalDate || !createActivityValue.trim()) return;
    const date = createModalDate;
    const dateKey = date.toISOString().split('T')[0];
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) return;
    const userId = userData.user.id;
    await supabase.from('calendar_events').insert({
      child_id: childId,
      user_id: userId,
      start_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0).toISOString(),
      end_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0).toISOString(),
      event_type: 'scheduled',
      activity_name: createActivityValue,
      location: '',
      notes: `${createActivityValue} scheduled for ${childName}`
    });
    setSelectedDates(prev => {
      const newSelected = new Map(prev);
      newSelected.set(dateKey, { date, activity: createActivityValue });
      return newSelected;
    });
    setCreateModalVisible(false);
    setCreateModalDate(null);
    setCreateActivityValue('');
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

  const weeks = getDaysInMonth(currentMonth);

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
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.childName, { color: Colors[colorScheme ?? 'light'].text }]}>
          {childName}
        </Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.calendarSection}>
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

          <View style={styles.calendarContainer}>
            <View style={styles.dayNamesRow}>
              <View style={styles.weekNumberContainer}>
                <Text style={[styles.weekNumber, { color: 'transparent' }]}>W</Text>
              </View>
              {dayNames.map(dayName => (
                <Text key={dayName} style={[styles.dayName, { color: Colors[colorScheme ?? 'light'].text }]}>
                  {dayName}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.weekRow}>
                  <View style={styles.weekNumberContainer}>
                    <Text style={[styles.weekNumber, { color: Colors[colorScheme ?? 'light'].tint }]}>
                      {getWeekNumber(week[0].date)}
                    </Text>
                  </View>
                  {week.map((dateObj, dayIndex) => {
                    const dateKey = dateObj.date.toISOString().split('T')[0];
                    const selectedInfo = selectedDates.get(dateKey);
                    const isCurrentMonth = dateObj.isCurrentMonth;
                    const recurringEvent = getRecurringEventForDate(dateObj.date);
                    const custodyBarStyle = getCustodyBarStyle(dateObj.date, recurringEvent);
                    
                    return (
                      <TouchableOpacity
                        key={dayIndex}
                        style={[
                          styles.dayCell,
                          !isCurrentMonth && styles.otherMonthDay,
                          selectedInfo && [
                            styles.selectedDay,
                            {
                              backgroundColor: Colors[colorScheme ?? 'light'].tint,
                              borderColor: Colors[colorScheme ?? 'light'].tint,
                              borderWidth: 2
                            }
                          ]
                        ]}
                        onPress={() => isCurrentMonth && handleShowActivityModal(dateObj.date)}
                        disabled={!isCurrentMonth}
                      >
                        <View style={styles.dayCellContent}>
                          {recurringEvent && isCurrentMonth && (
                            <View style={[
                              styles.recurringIndicator, 
                              { backgroundColor: recurringEvent.color },
                              custodyBarStyle
                            ]}>
                              <Text style={styles.recurringText} numberOfLines={1}>
                                {recurringEvent.parent_name}
                              </Text>
                            </View>
                          )}
                          <Text
                            style={[
                              styles.dayText,
                              !isCurrentMonth && styles.otherMonthText,
                              selectedInfo
                                ? { color: Colors[colorScheme ?? 'light'].calendarSelectedText, fontWeight: 'bold' }
                                : { color: Colors[colorScheme ?? 'light'].text },
                              recurringEvent && { marginTop: 2 } // Add margin when recurring event is present
                            ]}
                          >
                            {dateObj.date.getDate()}
                          </Text>
                          {selectedInfo?.activity && isCurrentMonth && (
                            <Text
                              style={[
                                styles.activityText,
                                selectedInfo
                                  ? { color: Colors[colorScheme ?? 'light'].calendarSelectedText, fontWeight: 'bold' }
                                  : { color: Colors[colorScheme ?? 'light'].text }
                              ]}
                              numberOfLines={1}
                            >
                              {selectedInfo.activity}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.todoSection}>
          <Text style={[styles.todoTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
            Upcoming Events
          </Text>
          <ScrollView style={styles.todoList} showsVerticalScrollIndicator={false}>
            {Array.from(selectedDates.values())
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 10) // Show next 10 events
              .map((item, index) => (
                <View key={index} style={[styles.todoItem, { borderColor: Colors[colorScheme ?? 'light'].border }]}>
                  <View style={styles.todoDate}>
                    <Text style={[styles.todoDateText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                      {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.todoActivity, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {item.activity}
                  </Text>
                </View>
              ))}
            {selectedDates.size === 0 && (
              <Text style={[styles.noEventsText, { color: Colors[colorScheme ?? 'light'].text }]}>
                No upcoming events scheduled
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
      
      {/* Activity Info Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setModalVisible(false); setEditingActivity(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <Text style={styles.modalTitle}>Activity Details</Text>
            {modalActivity && (
              <>
                <Text style={styles.modalLabel}>Date:</Text>
                <Text style={styles.modalValue}>{modalActivity.date.toLocaleDateString()}</Text>
                <Text style={styles.modalLabel}>Activity:</Text>
                {editingActivity ? (
                  <TextInput
                    style={styles.modalInput}
                    value={editActivityValue}
                    onChangeText={setEditActivityValue}
                    // Do not autoFocus to avoid keyboard/cursor issues on iPhone
                    autoFocus={false}
                  />
                ) : (
                  <Text style={styles.modalValue}>{modalActivity.activity}</Text>
                )}
              </>
            )}
            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'center', alignItems: 'center' }}>
              {editingActivity ? (
                <>
                  <TouchableOpacity style={[styles.modalActionButton, {
                    backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground,
                    borderColor: Colors[colorScheme ?? 'light'].tint,
                    borderWidth: 2,
                    shadowColor: Colors[colorScheme ?? 'light'].tint,
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 2
                  }]} onPress={handleSaveActivityEdit}>
                    <Text style={[styles.modalActionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionButton, {
                    backgroundColor: '#ff4d4d',
                    marginLeft: 10,
                    borderColor: '#b30000',
                    borderWidth: 2,
                    shadowColor: '#b30000',
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 2
                  }]} onPress={handleRemoveActivity}>
                    <Text style={[styles.modalActionButtonText, { color: '#fff' }]}>Remove</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.modalCloseButton, {
                  backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground,
                  borderColor: Colors[colorScheme ?? 'light'].tint,
                  borderWidth: 2,
                  shadowColor: Colors[colorScheme ?? 'light'].tint,
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2
                }]} onPress={() => {
                  setEditingActivity(true);
                  setEditActivityValue(modalActivity?.activity || '');
                }}>
                  <Text style={[styles.modalActionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>Edit</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.modalCloseButton, {
                marginLeft: 10,
                backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground,
                borderColor: Colors[colorScheme ?? 'light'].tint,
                borderWidth: 2,
                shadowColor: Colors[colorScheme ?? 'light'].tint,
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2
              }]} onPress={() => { setModalVisible(false); setEditingActivity(false); }}>
                <Text style={[styles.modalActionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Create Activity Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <Text style={styles.modalTitle}>Create Activity</Text>
            <Text style={styles.modalLabel}>Date:</Text>
            <Text style={styles.modalValue}>{createModalDate?.toLocaleDateString()}</Text>
            <Text style={styles.modalLabel}>Activity Name:</Text>
            <TextInput
              style={styles.modalInput}
              value={createActivityValue}
              onChangeText={setCreateActivityValue}
              placeholder="Enter activity name"
              // Do not autoFocus to avoid keyboard/cursor issues on iPhone
              autoFocus={false}
            />
            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity style={[styles.modalActionButton, {
                backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground,
                borderColor: Colors[colorScheme ?? 'light'].tint,
                borderWidth: 2,
                shadowColor: Colors[colorScheme ?? 'light'].tint,
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2
              }]} onPress={handleSaveCreateActivity}>
                <Text style={[styles.modalActionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCloseButton, {
                marginLeft: 10,
                backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground,
                borderColor: Colors[colorScheme ?? 'light'].tint,
                borderWidth: 2,
                shadowColor: Colors[colorScheme ?? 'light'].tint,
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2
              }]} onPress={() => setCreateModalVisible(false)}>
                <Text style={[styles.modalActionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Custody Schedule Modal */}
      <Modal
        visible={recurringModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRecurringModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <Text style={styles.modalTitle}>Set Custody Schedule</Text>
            
            <Text style={styles.modalLabel}>Select Days with this Parent:</Text>
            <View style={styles.dayPickerRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayPickerButton,
                    newRecurringEvent.days_of_week.includes(index) && styles.dayPickerButtonSelected
                  ]}
                  onPress={() => {
                    const updatedDays = newRecurringEvent.days_of_week.includes(index)
                      ? newRecurringEvent.days_of_week.filter(d => d !== index)
                      : [...newRecurringEvent.days_of_week, index];
                    setNewRecurringEvent(prev => ({ ...prev, days_of_week: updatedDays }));
                  }}
                >
                  <Text style={[
                    styles.dayPickerText,
                    newRecurringEvent.days_of_week.includes(index) && styles.dayPickerTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Parent Type:</Text>
            <View style={styles.parentTypeRow}>
              <TouchableOpacity
                style={[
                  styles.parentTypeButton,
                  newRecurringEvent.parent_type === 'mom' && styles.parentTypeButtonSelected
                ]}
                onPress={() => setNewRecurringEvent(prev => ({ 
                  ...prev, 
                  parent_type: 'mom',
                  parent_name: 'Mom',
                  color: '#ea4335' // Red for mom
                }))}
              >
                <Text style={[
                  styles.parentTypeText,
                  newRecurringEvent.parent_type === 'mom' && styles.parentTypeTextSelected
                ]}>
                  Mom
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.parentTypeButton,
                  newRecurringEvent.parent_type === 'dad' && styles.parentTypeButtonSelected
                ]}
                onPress={() => setNewRecurringEvent(prev => ({ 
                  ...prev, 
                  parent_type: 'dad',
                  parent_name: 'Dad',
                  color: '#4285f4' // Blue for dad
                }))}
              >
                <Text style={[
                  styles.parentTypeText,
                  newRecurringEvent.parent_type === 'dad' && styles.parentTypeTextSelected
                ]}>
                  Dad
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Parent Name (Optional):</Text>
            <TextInput
              style={styles.modalInput}
              value={newRecurringEvent.parent_name}
              onChangeText={(text) => setNewRecurringEvent(prev => ({ ...prev, parent_name: text }))}
              placeholder={newRecurringEvent.parent_type === 'mom' ? 'Mom' : 'Dad'}
              autoFocus={false}
            />

            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity style={[styles.modalActionButton, {
                backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground,
                borderColor: Colors[colorScheme ?? 'light'].tint,
                borderWidth: 2,
                shadowColor: Colors[colorScheme ?? 'light'].tint,
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2
              }]} onPress={saveRecurringEvent}>
                <Text style={[styles.modalActionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCloseButton, {
                marginLeft: 10,
                backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground,
                borderColor: Colors[colorScheme ?? 'light'].tint,
                borderWidth: 2,
                shadowColor: Colors[colorScheme ?? 'light'].tint,
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2
              }]} onPress={() => setRecurringModalVisible(false)}>
                <Text style={[styles.modalActionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
        onPress={() => setFabMenuVisible(!fabMenuVisible)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* FAB Menu Overlay */}
      {fabMenuVisible && (
        <TouchableOpacity 
          style={styles.fabMenuOverlay}
          onPress={() => setFabMenuVisible(false)}
          activeOpacity={1}
        />
      )}

      {/* FAB Menu */}
      {fabMenuVisible && (
        <View style={[styles.fabMenu, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <TouchableOpacity 
            style={[styles.fabMenuItem, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]}
            onPress={() => {
              setFabMenuVisible(false);
              setRecurringModalVisible(true);
            }}
          >
            <Text style={[styles.fabMenuItemText, { color: Colors[colorScheme ?? 'light'].text }]}>New Custody Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.fabMenuItem, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]}
            onPress={() => {
              setFabMenuVisible(false);
              // Add functionality for editing existing schedules
              Alert.alert('Edit Schedules', 'Feature coming soon!');
            }}
          >
            <Text style={[styles.fabMenuItemText, { color: Colors[colorScheme ?? 'light'].text }]}>Edit Schedules</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.fabMenuItem, { backgroundColor: Colors[colorScheme ?? 'light'].buttonBackground }]}
            onPress={() => {
              setFabMenuVisible(false);
              // Add functionality for deleting schedules
              Alert.alert('Delete Schedules', 'Feature coming soon!');
            }}
          >
            <Text style={[styles.fabMenuItemText, { color: Colors[colorScheme ?? 'light'].text }]}>Delete Schedules</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0, // Remove padding for full screen
    paddingTop: 60, // Keep top padding for status bar
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center', // Center the calendar content vertically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  calendarSection: {
    flex: 1, // Take up most of the screen like in the image
    marginBottom: 10,
  },
  todoSection: {
    height: 150, // Fixed height for the bottom section
    paddingTop: 10,
    paddingHorizontal: 20, // Add horizontal padding to todo section
  },
  todoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  todoList: {
    flex: 1,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  todoDate: {
    marginRight: 15,
    minWidth: 50,
  },
  todoDateText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  todoActivity: {
    fontSize: 14,
    flex: 1,
  },
  noEventsText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.6,
    marginTop: 20,
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
    marginBottom: 20,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 20, // Add horizontal padding back to header
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 60, // Match backButton width for centering
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20, // Add horizontal padding
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
    marginBottom: 0, // Remove margin for tight spacing
    paddingHorizontal: 0, // Remove horizontal padding for full width
    paddingVertical: 8, // Reduced vertical padding
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 50, // Reduced height
  },
  weekNumberContainer: {
    width: 30, // Reduced from 40 to 30
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10, // Reduced padding
    backgroundColor: '#f1f3f4',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  weekNumber: {
    fontSize: 10, // Reduced from 12 to 10
    fontWeight: 'bold',
  },
  dayName: {
    fontSize: 12, // Reduced from 14 to 12
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1, // Use flex instead of fixed width
    paddingVertical: 6, // Reduced padding
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 0, // Remove rounded corners for full-screen look
    padding: 0, // Remove padding for full-screen
    margin: 0, // Remove margins for full-screen
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    flex: 1, // Take up all available space
  },
  calendarGrid: {
    flexDirection: 'column', // Changed to column to stack weeks
    flex: 1,
  },
  dayCell: {
    flex: 1, // Use flex for equal distribution
    aspectRatio: 1, // Keep cells square
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    backgroundColor: '#ffffff',
    minHeight: 50, // Reduced minimum height
    paddingVertical: 4, // Add small padding
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  selectedDay: {
    borderRadius: 0, // Remove border radius for clean look
    borderWidth: 0, // Remove border, use background color only
  },
  dayText: {
    fontSize: 14, // Reduced from 16 for smaller appearance
  },
  otherMonthDay: {
    backgroundColor: '#f8f9fa',
    borderWidth: 0,
    opacity: 0.6,
  },
  otherMonthText: {
    color: '#999999',
    opacity: 0.6,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayCellContent: {
    alignItems: 'center',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  recurringIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
    zIndex: 1, // Ensure it appears above other elements
  },
  recurringText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  activityText: {
    fontSize: 9, // Reduced from 10 to keep proportional
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  selectedActivityText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  modalValue: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalCloseButton: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  modalActionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  modalActionButtonText: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    marginBottom: 8,
    width: 200,
    textAlign: 'center',
  },
  dayPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  dayPickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f9fa',
  },
  dayPickerButtonSelected: {
    backgroundColor: '#4285f4',
    borderColor: '#4285f4',
  },
  dayPickerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  dayPickerTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeInput: {
    width: 80,
    textAlign: 'center',
  },
  timeToText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  colorPickerButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorPickerButtonSelected: {
    borderColor: '#333',
    borderWidth: 3,
  },
  parentTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    width: '100%',
  },
  parentTypeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f8f9fa',
    flex: 0.45,
  },
  parentTypeButtonSelected: {
    backgroundColor: '#4285f4',
    borderColor: '#4285f4',
  },
  parentTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  parentTypeTextSelected: {
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  fabMenu: {
    position: 'absolute',
    bottom: 85,
    right: 20,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    paddingVertical: 8,
    minWidth: 200,
    zIndex: 999,
  },
  fabMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 2,
    marginHorizontal: 8,
  },
  fabMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  fabMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
});
