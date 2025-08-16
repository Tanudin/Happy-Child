import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Calendar from '../../components/Calendar';
import ChildMenu from '../../components/ChildMenu';
import Economics from '../../components/Economics';
import IOSAlert from '../../components/IOSAlert';
import { useIOSAlert } from '../../hooks/useIOSAlert';
import { supabase } from '../../lib/supabase';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
}

type CurrentView = 'home' | 'childMenu' | 'calendar' | 'economics';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { showAlert, alertProps } = useIOSAlert();
  const [items, setItems] = useState<Child[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirthdate, setNewChildBirthdate] = useState('');
  const [currentView, setCurrentView] = useState<CurrentView>('home');
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        // First get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error fetching user:', userError);
          return;
        }
        
        if (!userData?.user?.id) {
          console.log('No user is currently logged in.');
          return;
        }
        
        const userId = userData.user.id;
        
        // Fetch children that belong to the current user through the user_children junction table
        const { data, error } = await supabase
          .from('user_children')
          .select(`
            child_id,
            children (
              id,
              name,
              date_of_birth
            )
          `)
          .eq('user_id', userId);
          
        if (error) {
          console.error('Error fetching items:', error);
        } else {
          // Extract the children data from the joined result
          const childrenData = data?.map(item => item.children).filter(child => child !== null).flat() || [];
          setItems(childrenData);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    }
    fetchItems();
  }, []);

  const handleAddNewChild = async () => {
    if (newChildName) {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error fetching user:', userError);
          showAlert({
            message: 'Failed to fetch user information.',
            type: 'error'
          });
          return;
        }
        
        if (!userData?.user?.id) {
          showAlert({
            message: 'No user is currently logged in.',
            type: 'error'
          });
          return;
        }
        
        const userId = userData.user.id;
        
        const { data: childData, error: childError } = await supabase
          .from('children')
          .insert([{ name: newChildName, date_of_birth: newChildBirthdate }])
          .select();
          
        if (childError) {
          console.error('Error adding child:', childError);
          showAlert({
            message: 'Failed to add child.',
            type: 'error'
          });
          return;
        }
        
        const childId = childData[0].id;
        
        const { error: linkError } = await supabase
          .from('user_children')
          .insert([{ user_id: userId, child_id: childId }]);
          
        if (linkError) {
          console.error('Error linking child to user:', linkError);
          showAlert({
            message: 'Failed to link child to user.',
            type: 'error'
          });
          await supabase.from('children').delete().eq('id', childId);
          return;
        }
        
        setItems([...items, ...(childData || [])]);
        showAlert({
          message: `${newChildName} added successfully!`,
          type: 'success',
          duration: 3000
        });
        setNewChildName('');
        setNewChildBirthdate('');
        setModalVisible(false);
      } catch (error) {
        console.error('Error adding child:', error);
        showAlert({
          message: 'Failed to add child.',
          type: 'error'
        });
      }
    } else {
      showAlert({
        message: 'Please enter a name for the child.',
        type: 'warning'
      });
    }
  };

  // Updated to show child menu instead of calendar directly
  const handleChildPress = (child: Child) => {
    setSelectedChild(child);
    setCurrentView('childMenu');
  };

  // Navigation handlers for child menu
  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedChild(null);
  };

  const handleOpenCalendar = () => {
    setCurrentView('calendar');
  };

  const handleOpenEconomics = () => {
    setCurrentView('economics');
  };

  const handleCalendarConfirm = async (selectedDates: Date[]) => {
    if (!selectedChild) return;
    
    showAlert({
      message: `Calendar events saved for ${selectedChild.name}!`,
      type: 'success'
    });
    setCurrentView('childMenu');
  };

  const handleCalendarCancel = () => {
    setCurrentView('childMenu');
  };

  const handleEconomicsBack = () => {
    setCurrentView('childMenu');
  };

  // Render different views based on current state
  if (currentView === 'childMenu' && selectedChild) {
    return (
      <ChildMenu
        child={selectedChild}
        onBack={handleBackToHome}
        onCalendar={handleOpenCalendar}
        onEconomics={handleOpenEconomics}
      />
    );
  }

  if (currentView === 'calendar' && selectedChild) {
    return (
      <Calendar
        childName={selectedChild.name}
        childId={selectedChild.id}
        onConfirm={handleCalendarConfirm}
        onCancel={handleCalendarCancel}
      />
    );
  }

  if (currentView === 'economics' && selectedChild) {
    return (
      <Economics
        childName={selectedChild.name}
        childId={selectedChild.id}
        onBack={handleEconomicsBack}
      />
    );
  }

  // Home view (default)
  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <Image
        source={require('../../assets/images/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.buttonContainer}>
        {items.length > 0 ? (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
              onPress={() => handleChildPress(item)}
            >
              <Text style={[styles.buttonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>{item.name || 'Unknown Item'}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.noItemsText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>No items found in database</Text>
        )}
        <TouchableOpacity
          style={[styles.addButton, { borderColor: Colors[colorScheme ?? 'light'].primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.addButtonText, { color: Colors[colorScheme ?? 'light'].primary }]}>Add New Item</Text>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
            <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>Add New Child</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                borderColor: Colors[colorScheme ?? 'light'].border,
                color: Colors[colorScheme ?? 'light'].text
              }]}
              placeholder="Child's Name"
              placeholderTextColor={Colors[colorScheme ?? 'light'].textSecondary}
              value={newChildName}
              onChangeText={setNewChildName}
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                borderColor: Colors[colorScheme ?? 'light'].border,
                color: Colors[colorScheme ?? 'light'].text
              }]}
              placeholder="Child's Birthdate (YYYY-MM-DD)"
              placeholderTextColor={Colors[colorScheme ?? 'light'].textSecondary}
              value={newChildBirthdate}
              onChangeText={setNewChildBirthdate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: Colors[colorScheme ?? 'light'].textSecondary }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: Colors[colorScheme ?? 'light'].cardBackground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                onPress={handleAddNewChild}
              >
                <Text style={[styles.modalButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* iOS Alert Component */}
      <IOSAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  addButton: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noItemsText: {
    fontSize: 16,
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
