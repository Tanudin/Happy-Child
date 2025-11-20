import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface FriendProfile {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

export default function ChatConversationScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName: string }>();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId && friendId) {
      loadMessages();
      markMessagesAsRead();

      // Set up real-time subscription for new messages
      // Subscribe to ALL messages in this conversation (both directions)
      const channel = supabase
        .channel(`messages_${currentUserId}_${friendId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            // Listen to messages FROM friend TO me
            filter: `sender_id=eq.${friendId},receiver_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log('📩 Received message from friend:', payload.new);
            // Only add if not already in the list (prevent duplicates)
            const newMessage = payload.new as Message;
            setMessages((current) => {
              const exists = current.some((m) => m.id === newMessage.id);
              if (exists) return current;
              return [...current, newMessage];
            });
            markMessagesAsRead();
            // Scroll to bottom when new message arrives
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            // Listen to messages FROM me TO friend (for real-time sync across devices)
            filter: `sender_id=eq.${currentUserId},receiver_id=eq.${friendId}`,
          },
          (payload) => {
            console.log('📤 Sent message confirmed:', payload.new);
            // Only add if not already in the list (prevent duplicates from optimistic update)
            const newMessage = payload.new as Message;
            setMessages((current) => {
              const exists = current.some((m) => m.id === newMessage.id);
              if (exists) return current;
              return [...current, newMessage];
            });
            // Scroll to bottom when new message arrives
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            console.log('🗑️ Message deleted:', payload.old);
            setMessages((current) => current.filter((m) => m.id !== payload.old.id));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            console.log('✏️ Message updated:', payload.new);
            setMessages((current) =>
              current.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
            );
          }
        )
        .subscribe((status) => {
          console.log('🔌 Realtime subscription status:', status);
        });

      return () => {
        console.log('👋 Unsubscribing from messages channel');
        channel.unsubscribe();
      };
    }
  }, [currentUserId, friendId]);

  const loadCurrentUser = async () => {
    try {
      const { data: userData, error } = await supabase.auth.getUser();
      if (error || !userData?.user?.id) {
        console.error('Error fetching user:', error);
        Alert.alert('Error', 'Failed to load user');
        return;
      }
      setCurrentUserId(userData.user.id);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadMessages = async () => {
    if (!currentUserId || !friendId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        Alert.alert('Error', 'Failed to load messages');
        return;
      }

      setMessages(data || []);
      
      // Scroll to bottom after loading
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!currentUserId || !friendId) return;

    try {
      // Mark all unread messages from this friend as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', friendId)
        .eq('receiver_id', currentUserId)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !friendId || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: friendId,
          content: messageContent,
          read: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message');
        setNewMessage(messageContent); // Restore message on error
        return;
      }

      // Add to local messages immediately for better UX (optimistic update)
      setMessages((current) => {
        // Check if message already exists to prevent duplicates
        const exists = current.some((m) => m.id === data.id);
        if (exists) return current;
        return [...current, data];
      });
      
      // Scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === currentUserId;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage
              ? { backgroundColor: Colors[colorScheme ?? 'light'].tint }
              : { backgroundColor: Colors[colorScheme ?? 'light'].tabIconDefault + '20' },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isMyMessage ? 'white' : Colors[colorScheme ?? 'light'].text },
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              { color: isMyMessage ? 'rgba(255,255,255,0.7)' : Colors[colorScheme ?? 'light'].tabIconDefault },
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <View style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{friendName || 'Chat'}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ color: Colors[colorScheme ?? 'light'].text }}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friendName || 'Chat'}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />

      {/* Message Input */}
      <View style={[styles.inputContainer, { borderTopColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme ?? 'light'].background,
              color: Colors[colorScheme ?? 'light'].text,
              borderColor: Colors[colorScheme ?? 'light'].tabIconDefault,
            },
          ]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { 
              backgroundColor: Colors[colorScheme ?? 'light'].tint,
              opacity: (!newMessage.trim() || sending) ? 0.5 : 1,
            },
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '75%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
