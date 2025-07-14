import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Calendar from '../../components/Calendar';
import { supabase } from '../../lib/supabase';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [items, setItems] = useState<Child[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirthdate, setNewChildBirthdate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        const { data, error } = await supabase
          .from('children') 
          .select('*');
        if (error) {
          console.error('Error fetching items:', error);
        } else {
          setItems(data || []);
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
          Alert.alert('Error', 'Failed to fetch user information.');
          return;
        }
        
        if (!userData?.user?.id) {
          Alert.alert('Error', 'No user is currently logged in.');
          return;
        }
        
        const userId = userData.user.id;
        
        const { data: childData, error: childError } = await supabase
          .from('children')
          .insert([{ name: newChildName, date_of_birth: newChildBirthdate }])
          .select();
          
        if (childError) {
          console.error('Error adding child:', childError);
          Alert.alert('Error', 'Failed to add child.');
          return;
        }
        
        const childId = childData[0].id;
        
        const { error: linkError } = await supabase
          .from('user_children')
          .insert([{ user_id: userId, child_id: childId }]);
          
        if (linkError) {
          console.error('Error linking child to user:', linkError);
          Alert.alert('Error', 'Failed to link child to user.');
          await supabase.from('children').delete().eq('id', childId);
          return;
        }
        
        setItems([...items, ...(childData || [])]);
        Alert.alert('Success', 'Child added successfully!');
        setNewChildName('');
        setNewChildBirthdate('');
        setModalVisible(false);
      } catch (error) {
        console.error('Error adding child:', error);
        Alert.alert('Error', 'Failed to add child.');
      }
    } else {
      Alert.alert('Error', 'Please enter a name for the child.');
    }
  };

  const handleChildPress = (child: Child) => {
    setSelectedChild(child);
    setShowCalendar(true);
  };

  const handleCalendarConfirm = async (selectedDates: Date[]) => {
    if (!selectedChild) return;
    
    Alert.alert('Success', `Calendar events saved for ${selectedChild.name}!`);
    setShowCalendar(false);
    setSelectedChild(null);
  };

  const handleCalendarCancel = () => {
    setShowCalendar(false);
    setSelectedChild(null);
  };

  if (showCalendar && selectedChild) {
    return (
      <Calendar
        childName={selectedChild.name}
        childId={selectedChild.id}
        onConfirm={handleCalendarConfirm}
        onCancel={handleCalendarCancel}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <Image
        source={require('../../assets/images/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.buttonContainer}>
        {items.length > 0 ? (
          items.slice(0, 2).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={() => handleChildPress(item)}
            >
              <Text style={styles.buttonText}>{item.name || 'Unknown Item'}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noItemsText}>No items found in database</Text>
        )}
        <TouchableOpacity
          style={[styles.addButton, { borderColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.addButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>Add New Item</Text>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Child</Text>
            <TextInput
              style={styles.input}
              placeholder="Child's Name"
              value={newChildName}
              onChangeText={setNewChildName}
            />
            <TextInput
              style={styles.input}
              placeholder="Child's Birthdate (YYYY-MM-DD)"
              value={newChildBirthdate}
              onChangeText={setNewChildBirthdate}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <Button title="Add" onPress={handleAddNewChild} />
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
    color: '#888',
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
    backgroundColor: 'white',
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
    borderColor: '#ccc',
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
});
