import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface CalendarEvent {
  id: string;
  start_time: string;
  end_time: string;
  event_type: string;
  notes: string;
  activity_name: string;
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
  const [selectedActivity, setSelectedActivity] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalActivity, setModalActivity] = useState<{date: Date, activity: string} | null>(null);
  const [editingActivity, setEditingActivity] = useState(false);
  const [editActivityValue, setEditActivityValue] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);
  const [createActivityValue, setCreateActivityValue] = useState('');

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
    return selectedDates.has(date.toISOString().split('T')[0]);
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
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>← Back</Text>
        </TouchableOpacity>
      </View>
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
          {days.map((date, index) => {
            const dateKey = date ? date.toISOString().split('T')[0] : '';
            const selectedInfo = date ? selectedDates.get(dateKey) : null;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  date && selectedInfo && [
                    styles.selectedDay,
                    {
                      backgroundColor: Colors[colorScheme ?? 'light'].tint,
                      borderColor: Colors[colorScheme ?? 'light'].tint,
                      borderWidth: 1
                    }
                  ],
                  !date && styles.emptyDay
                ]}
                onPress={() => date && handleShowActivityModal(date)}
                disabled={!date}
              >
                {date && (
                  <View style={styles.dayCellContent}>
                    <Text
                      style={[
                        styles.dayText,
                        selectedInfo
                          ? { color: Colors[colorScheme ?? 'light'].calendarSelectedText, fontWeight: 'bold' }
                          : { color: Colors[colorScheme ?? 'light'].text }
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    {selectedInfo?.activity && (
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
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedDates.size > 0 && (
          <View style={styles.selectedDatesContainer}>
            <Text style={[styles.selectedDatesTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Selected Activities:
            </Text>
            <View style={styles.selectedDatesList}>
              {Array.from(selectedDates.values()).map((item, index) => (
                <Text key={index} style={[styles.selectedDateText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                  {item.date.toLocaleDateString()} - {item.activity}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
    height: 55,  // Increased height to accommodate activity name
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 10,  // Changed to rounded rectangle for more space
    padding: 2,
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
  dayCellContent: {
    alignItems: 'center',
    width: '100%',
  },
  activityText: {
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  selectedActivityText: {
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
});
