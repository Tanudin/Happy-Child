import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { Button, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    async function fetchItems() {
      try {
        const { data, error } = await supabase
          .from('children') // Placeholder table name, adjust as needed
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

  const [modalVisible, setModalVisible] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirthdate, setNewChildBirthdate] = useState('');

  const handleAddNewChild = async () => {
    if (newChildName) {
      try {
        // Get the current user from Supabase auth
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error fetching user:', userError);
          alert('Failed to fetch user information.');
          return;
        }
        
        if (!userData?.user?.id) {
          alert('No user is currently logged in.');
          return;
        }
        
        const userId = userData.user.id;
        
        // Insert the new child into the children table
        const { data: childData, error: childError } = await supabase
          .from('children')
          .insert([{ name: newChildName, date_of_birth: newChildBirthdate }])
          .select();
          
        if (childError) {
          console.error('Error adding child:', childError);
          alert('Failed to add child.');
          return;
        }
        
        const childId = childData[0].id;
        
        // Link the child to the user in the user_children table
        const { error: linkError } = await supabase
          .from('user_children')
          .insert([{ user_id: userId, child_id: childId }]);
          
        if (linkError) {
          console.error('Error linking child to user:', linkError);
          alert('Failed to link child to user.');
          // Optionally, rollback the child insertion if linking fails
          await supabase.from('children').delete().eq('id', childId);
          return;
        }
        
        setItems([...items, ...(childData || [])]);
        alert('Child added successfully!');
        setNewChildName('');
        setNewChildBirthdate('');
        setModalVisible(false);
      } catch (error) {
        console.error('Error adding child:', error);
        alert('Failed to add child.');
      }
    } else {
      alert('Please enter a name for the child.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <Image
        source={require('../../assets/images/logo.png')} // Adjust path to your logo
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.buttonContainer}>
        {items.length > 0 ? (
          items.slice(0, 2).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={() => {
                // Navigation or action logic for each item can be added here
                console.log(`Navigating to ${item.name || 'item'}`);
              }}
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
