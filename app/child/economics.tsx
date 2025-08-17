import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  payer: string;
  created_at: string;
}

interface EconomicsProps {
  childName: string;
  childId: string;
  onBack: () => void;
}

export default function Economics({ childName, childId, onBack }: EconomicsProps) {
  const colorScheme = useColorScheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [payer, setPayer] = useState('');

  useEffect(() => {
    loadExpenses();
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, [childId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('child_id', childId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error loading expenses:', error);
        Alert.alert('Error', 'Failed to load expenses');
        return;
      }

      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    setPayer('');
    setEditingExpense(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (expense: Expense) => {
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setDate(expense.date);
    setPayer(expense.payer);
    setEditingExpense(expense);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!description.trim() || !amount.trim() || !date.trim() || !payer.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        Alert.alert('Error', 'Failed to get user information');
        return;
      }

      const userId = userData.user.id;
      const expenseData = {
        child_id: childId,
        user_id: userId,
        description: description.trim(),
        amount: numericAmount,
        date: date,
        payer: payer.trim(),
      };

      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) {
          console.error('Error updating expense:', error);
          Alert.alert('Error', 'Failed to update expense');
          return;
        }
      } else {
        // Create new expense
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) {
          console.error('Error creating expense:', error);
          Alert.alert('Error', 'Failed to create expense');
          return;
        }
      }

      setModalVisible(false);
      resetForm();
      loadExpenses(); // Reload the list
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense');
    }
  };

  const handleDelete = async (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId);

              if (error) {
                console.error('Error deleting expense:', error);
                Alert.alert('Error', 'Failed to delete expense');
                return;
              }

              loadExpenses(); // Reload the list
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <View style={[styles.expenseItem, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
      <View style={styles.expenseContent}>
        <View style={styles.expenseHeader}>
          <Text style={[styles.expenseDescription, { color: Colors[colorScheme ?? 'light'].text }]}>
            {item.description}
          </Text>
          <Text style={[styles.expenseAmount, { color: Colors[colorScheme ?? 'light'].tint }]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View style={styles.expenseDetails}>
          <Text style={[styles.expenseDate, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            {formatDate(item.date)}
          </Text>
          <Text style={[styles.expensePayer, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            Paid by: {item.payer}
          </Text>
        </View>
      </View>
      <View style={styles.expenseActions}>
        <TouchableOpacity 
          onPress={() => openEditModal(item)}
          style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
        >
          <Text style={[styles.actionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDelete(item.id)}
          style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].accent }]}
        >
          <Text style={[styles.actionButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].text }]}>
            Loading expenses...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>‹ Back</Text>
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

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
          <Text style={[styles.summaryTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
            Total Expenses
          </Text>
          <Text style={[styles.summaryAmount, { color: Colors[colorScheme ?? 'light'].tint }]}>
            {formatCurrency(getTotalExpenses())}
          </Text>
          <Text style={[styles.summaryCount, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
          </Text>
        </View>

        {/* Add Expense Button */}
        <TouchableOpacity 
          onPress={openAddModal}
          style={[styles.addButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
        >
          <Text style={[styles.addButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>
            Add New Expense
          </Text>
        </TouchableOpacity>

        {/* Expenses List */}
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          style={styles.expensesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={[styles.emptyText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
                No expenses yet
              </Text>
              <Text style={[styles.emptySubtext, { color: Colors[colorScheme ?? 'light'].textLight }]}>
                Tap "Add New Expense" to get started
              </Text>
            </View>
          }
        />
      </View>

      {/* Add/Edit Expense Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                  Description
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What was this expense for?"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                  Amount
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                  Date
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                  Who Paid?
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  value={payer}
                  onChangeText={setPayer}
                  placeholder="Mom, Dad, Child, etc."
                  placeholderTextColor={Colors[colorScheme ?? 'light'].textLight}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={[styles.modalButton, styles.cancelButton, { 
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                >
                  <Text style={[styles.modalButtonText, { color: Colors[colorScheme ?? 'light'].text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSave}
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                >
                  <Text style={[styles.modalButtonText, { color: Colors[colorScheme ?? 'light'].buttonText }]}>
                    {editingExpense ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 14,
  },
  addButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  expensesList: {
    flex: 1,
  },
  expenseItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  expenseContent: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expenseDate: {
    fontSize: 14,
  },
  expensePayer: {
    fontSize: 14,
  },
  expenseActions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    // Additional styling if needed
  },
  saveButton: {
    // Additional styling if needed
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
