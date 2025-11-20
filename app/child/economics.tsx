import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
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

interface Parent {
  user_id: string;
  email: string;
  display_name: string | null;
  first_name: string;
  last_name: string;
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
  const [parents, setParents] = useState<Parent[]>([]);
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'total'>('total');
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [payer, setPayer] = useState('');

  useEffect(() => {
    loadExpenses();
    fetchParents();
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, [childId]);

  const fetchParents = async () => {
    try {
      // Fetch all user_children links for this child
      const { data: userChildrenData, error: userChildrenError } = await supabase
        .from('user_children')
        .select('user_id')
        .eq('child_id', childId);

      if (userChildrenError) {
        console.error('Error fetching user_children:', userChildrenError);
        return;
      }

      if (!userChildrenData || userChildrenData.length === 0) {
        setParents([]);
        return;
      }

      // Get the user IDs
      const userIds = userChildrenData.map(uc => uc.user_id);

      // Fetch user profiles for those user IDs
      const { data: profilesData, error: profilesError} = await supabase
        .from('user_profiles')
        .select('user_id, email, display_name, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        setParents(profilesData || []);
      }
    } catch (error) {
      console.error('Error fetching parents:', error);
    }
  };

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

  const getParentDisplayName = (parent: Parent) => {
    if (parent.display_name) {
      return parent.display_name;
    }
    return `${parent.first_name} ${parent.last_name}`.trim() || parent.email;
  };

  const getTotalExpenses = () => {
    const now = new Date();
    let filteredExpenses = expenses;

    if (timeFilter === 'week') {
      // Get expenses from the last 7 days
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredExpenses = expenses.filter(expense => new Date(expense.date) >= weekAgo);
    } else if (timeFilter === 'month') {
      // Get expenses from the current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredExpenses = expenses.filter(expense => new Date(expense.date) >= startOfMonth);
    }

    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getFilterLabel = () => {
    if (timeFilter === 'week') return 'This Week';
    if (timeFilter === 'month') return 'This Month';
    return 'Total';
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors[colorScheme ?? 'light'].text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
          Expenses - {childName}
        </Text>
      </View>
      
      {/* Content */}
      <View style={styles.content}>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: Colors[colorScheme ?? 'light'].cardBackground }]}>
          <Text style={[styles.summaryTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
            Total Expenses - {getFilterLabel()}
          </Text>

          {/* Time Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                timeFilter === 'week' && styles.filterButtonActive,
                { 
                  backgroundColor: timeFilter === 'week' 
                    ? Colors[colorScheme ?? 'light'].tint 
                    : Colors[colorScheme ?? 'light'].inputBackground,
                  borderColor: Colors[colorScheme ?? 'light'].border
                }
              ]}
              onPress={() => setTimeFilter('week')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: timeFilter === 'week' 
                  ? Colors[colorScheme ?? 'light'].buttonText 
                  : Colors[colorScheme ?? 'light'].text 
                }
              ]}>
                Week
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                timeFilter === 'month' && styles.filterButtonActive,
                { 
                  backgroundColor: timeFilter === 'month' 
                    ? Colors[colorScheme ?? 'light'].tint 
                    : Colors[colorScheme ?? 'light'].inputBackground,
                  borderColor: Colors[colorScheme ?? 'light'].border
                }
              ]}
              onPress={() => setTimeFilter('month')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: timeFilter === 'month' 
                  ? Colors[colorScheme ?? 'light'].buttonText 
                  : Colors[colorScheme ?? 'light'].text 
                }
              ]}>
                Month
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                timeFilter === 'total' && styles.filterButtonActive,
                { 
                  backgroundColor: timeFilter === 'total' 
                    ? Colors[colorScheme ?? 'light'].tint 
                    : Colors[colorScheme ?? 'light'].inputBackground,
                  borderColor: Colors[colorScheme ?? 'light'].border
                }
              ]}
              onPress={() => setTimeFilter('total')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: timeFilter === 'total' 
                  ? Colors[colorScheme ?? 'light'].buttonText 
                  : Colors[colorScheme ?? 'light'].text 
                }
              ]}>
                Total
              </Text>
            </TouchableOpacity>
          </View>

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
                <TouchableOpacity
                  style={[styles.dropdownButton, { 
                    backgroundColor: Colors[colorScheme ?? 'light'].inputBackground,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}
                  onPress={() => setShowPayerDropdown(!showPayerDropdown)}
                >
                  <Text style={[styles.dropdownButtonText, { 
                    color: payer ? Colors[colorScheme ?? 'light'].text : Colors[colorScheme ?? 'light'].textLight
                  }]}>
                    {payer || 'Select who paid'}
                  </Text>
                  <Text style={[styles.dropdownArrow, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {showPayerDropdown ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {showPayerDropdown && (
                  <View style={[styles.dropdownList, { 
                    backgroundColor: Colors[colorScheme ?? 'light'].cardBackground,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }]}>
                    {parents.length > 0 ? (
                      parents.map((parent) => (
                        <TouchableOpacity
                          key={parent.user_id}
                          style={[styles.dropdownItem, {
                            backgroundColor: payer === getParentDisplayName(parent)
                              ? `${Colors[colorScheme ?? 'light'].tint}20`
                              : 'transparent'
                          }]}
                          onPress={() => {
                            setPayer(getParentDisplayName(parent));
                            setShowPayerDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: Colors[colorScheme ?? 'light'].text }]}>
                            {getParentDisplayName(parent)}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.dropdownItem}>
                        <Text style={[styles.dropdownItemText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
                          No parents found
                        </Text>
                      </View>
                    )}
                  </View>
                )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  filterContainer: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 16,
    justifyContent: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonActive: {
    // Active state styling is handled by backgroundColor in the component
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownItemText: {
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
