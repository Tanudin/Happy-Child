import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Friend {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  friendship_id: string;
  conversation_id?: string;
  last_message_at?: string;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  sender_name: string;
  timestamp: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
}

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCurrentUserAndFriends();
  }, []);

  useEffect(() => {
    if (selectedFriend?.conversation_id) {
      loadMessages();
      
      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel(`chat_messages_${selectedFriend.conversation_id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedFriend.conversation_id}` },
          (payload) => {
            const newMessage = payload.new as ChatMessage;
            // Get sender name for the new message
            loadSenderName(newMessage).then(messageWithSender => {
              setMessages(prev => [messageWithSender, ...prev]);
            });
            // Auto-scroll to bottom when new message arrives
            setTimeout(() => {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedFriend]);

  const loadSenderName = async (message: any): Promise<ChatMessage> => {
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', message.sender_id)
        .single();

      return {
        ...message,
        sender_name: profileData?.display_name || 'Unknown'
      };
    } catch (error) {
      return {
        ...message,
        sender_name: 'Unknown'
      };
    }
  };

  const loadCurrentUserAndFriends = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        console.error('Error fetching user:', userError);
        return;
      }
      
      setCurrentUser(userData.user);

      // Check if user profile exists, create one if it doesn't
      await ensureUserProfileExists(userData.user);
      
      await loadFriends(userData.user.id);
      await loadFriendRequests(userData.user.id);
    } catch (error) {
      console.error('Error loading user and friends:', error);
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const ensureUserProfileExists = async (user: any) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // If profile doesn't exist, create one
      if (checkError && checkError.code === 'PGRST116') { // No rows returned
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: user.email?.split('@')[0] || 'User',
            email: user.email || '',
            is_searchable: true
          });

        if (createError) {
          console.error('Error creating user profile:', createError);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile exists:', error);
    }
  };

  const loadFriends = async (userId: string) => {
    try {
      // Get accepted friendships
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (friendshipsError) {
        console.error('Error loading friendships:', friendshipsError);
        return;
      }

      // Process friendships to get friend data
      const friendsData: Friend[] = [];
      
      for (const friendship of friendshipsData || []) {
        // Determine which user is the friend (not the current user)
        const friendUserId = friendship.requester_id === userId 
          ? friendship.addressee_id 
          : friendship.requester_id;

        try {
          // Ensure friend has a profile (create one if needed)
          const { data: profileData, error: profileError } = await supabase
            .rpc('ensure_user_profile_exists', { target_user_id: friendUserId });

          if (!profileError && profileData) {
            // Get or create conversation between users
            const { data: conversationData, error: conversationError } = await supabase
              .rpc('get_or_create_direct_conversation', {
                user1_id: userId,
                user2_id: friendUserId
              });

            let conversationId = null;
            if (!conversationError && conversationData) {
              conversationId = conversationData;
            }

            friendsData.push({
              id: profileData.user_id,
              display_name: profileData.display_name,
              email: profileData.email,
              avatar_url: profileData.avatar_url,
              friendship_id: friendship.id,
              conversation_id: conversationId,
              last_message_at: undefined
            });
          } else {
            console.error(`Error ensuring profile for friend ${friendUserId}:`, profileError);
          }
        } catch (error) {
          console.error(`Error processing friend ${friendUserId}:`, error);
        }
      }

      setFriends(friendsData);
      
      // Auto-select first friend if available
      if (friendsData.length > 0) {
        setSelectedFriend(friendsData[0]);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async (userId: string) => {
    try {
      // Get pending friend requests where current user is the addressee
      const { data: requestsData, error: requestsError } = await supabase
        .from('friendships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', userId)
        .eq('status', 'pending');

      if (requestsError) {
        console.error('Error loading friend requests:', requestsError);
        return;
      }

      // Get profile data for each requester
      const requestsWithProfiles: FriendRequest[] = [];
      
      for (const request of requestsData || []) {
        try {
          // Ensure requester has a profile (create one if needed)
          const { data: profileData, error: profileError } = await supabase
            .rpc('ensure_user_profile_exists', { target_user_id: request.requester_id });

          if (!profileError && profileData) {
            requestsWithProfiles.push({
              id: request.id,
              requester_id: request.requester_id,
              display_name: profileData.display_name,
              email: profileData.email,
              avatar_url: profileData.avatar_url,
              created_at: request.created_at
            });
          } else {
            console.error(`Error ensuring profile for requester ${request.requester_id}:`, profileError);
          }
        } catch (error) {
          console.error(`Error processing friend request ${request.id}:`, error);
        }
      }

      setFriendRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedFriend?.conversation_id) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, message, sender_id, timestamp, created_at, is_edited, is_deleted')
        .eq('conversation_id', selectedFriend.conversation_id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading messages:', error);
        Alert.alert('Error', 'Failed to load chat messages');
        return;
      }

      // Load sender names for all messages
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (msg) => await loadSenderName(msg))
      );

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load chat messages');
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sending || !selectedFriend?.conversation_id || !currentUser) return;

    try {
      setSending(true);
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedFriend.conversation_id,
          sender_id: currentUser.id,
          message: messageText.trim(),
          message_type: 'text',
          timestamp: now,
        });

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message');
        return;
      }

      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // Use the server-side function to search for users and create profiles if needed
      const { data, error } = await supabase
        .rpc('search_users_by_email', {
          search_email: searchQuery.trim(),
          current_user_id: currentUser?.id
        });

      if (error) {
        console.error('Error searching users:', error);
        Alert.alert('Error', 'Failed to search users');
        return;
      }

      const results: UserProfile[] = (data || []).map((user: any) => ({
        id: user.user_id,
        display_name: user.display_name,
        email: user.email,
        avatar_url: user.avatar_url
      }));

      setSearchResults(results);

      if (results.length === 0) {
        console.log('No users found with that email');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: currentUser.id,
          addressee_id: targetUserId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          Alert.alert('Info', 'Friend request already exists');
        } else {
          console.error('Error sending friend request:', error);
          Alert.alert('Error', 'Failed to send friend request');
        }
        return;
      }

      Alert.alert('Success', 'Friend request sent!');
      setSearchModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const acceptFriendRequest = async (requestId: string, requesterId: string) => {
    try {
      // Update friendship status to accepted
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) {
        console.error('Error accepting friend request:', error);
        Alert.alert('Error', 'Failed to accept friend request');
        return;
      }

      Alert.alert('Success', 'Friend request accepted!');
      
      // Reload friends and friend requests
      if (currentUser) {
        await loadFriends(currentUser.id);
        await loadFriendRequests(currentUser.id);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const denyFriendRequest = async (requestId: string) => {
    try {
      // Delete the friendship request
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) {
        console.error('Error denying friend request:', error);
        Alert.alert('Error', 'Failed to deny friend request');
        return;
      }

      Alert.alert('Success', 'Friend request denied');
      
      // Reload friend requests
      if (currentUser) {
        await loadFriendRequests(currentUser.id);
      }
    } catch (error) {
      console.error('Error denying friend request:', error);
      Alert.alert('Error', 'Failed to deny friend request');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
             ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.sender_id === currentUser?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.sentBubble : styles.receivedBubble,
          { backgroundColor: isCurrentUser ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].background }
        ]}>
          {!isCurrentUser && (
            <Text style={[styles.senderName, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {item.sender_name}
            </Text>
          )}
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? 'white' : Colors[colorScheme ?? 'light'].text }
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.timestamp,
            { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : Colors[colorScheme ?? 'light'].tabIconDefault }
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderSearchResult = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity 
      style={[styles.searchResultItem, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
      onPress={() => sendFriendRequest(item.id)}
    >
      <View style={styles.searchResultInfo}>
        <Text style={[styles.searchResultName, { color: Colors[colorScheme ?? 'light'].text }]}>
          {item.display_name}
        </Text>
        <Text style={[styles.searchResultEmail, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {item.email}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.addFriendButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
        onPress={() => sendFriendRequest(item.id)}
      >
        <Text style={styles.addFriendButtonText}>Add</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.friendRequestItem, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
      <View style={styles.friendRequestInfo}>
        <Text style={[styles.friendRequestName, { color: Colors[colorScheme ?? 'light'].text }]}>
          {item.display_name}
        </Text>
        <Text style={[styles.friendRequestEmail, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {item.email}
        </Text>
        <Text style={[styles.friendRequestTime, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.friendRequestActions}>
        <TouchableOpacity 
          style={[styles.acceptButton, { backgroundColor: '#22c55e' }]}
          onPress={() => acceptFriendRequest(item.id, item.requester_id)}
        >
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.denyButton, { backgroundColor: '#ef4444' }]}
          onPress={() => denyFriendRequest(item.id)}
        >
          <Text style={styles.actionButtonText}>Deny</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <View style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
          <Text style={styles.headerTitle}>Friends Chat</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ color: Colors[colorScheme ?? 'light'].text }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
        <Text style={styles.headerTitle}>Friends Chat</Text>
        <TouchableOpacity 
          style={styles.addFriendHeaderButton}
          onPress={() => setSearchModalVisible(true)}
        >
          <Text style={styles.addFriendHeaderButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Friends Selector */}
      <View style={[styles.friendsSelector, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
        {friends.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendsScrollContent}
          >
            {friends.map((friend) => (
              <TouchableOpacity
                key={friend.id}
                style={[
                  styles.friendTab,
                  selectedFriend?.id === friend.id && { backgroundColor: Colors[colorScheme ?? 'light'].tint },
                  { borderColor: Colors[colorScheme ?? 'light'].tint }
                ]}
                onPress={() => setSelectedFriend(friend)}
              >
                <Text style={[
                  styles.friendTabText,
                  { color: selectedFriend?.id === friend.id ? 'white' : Colors[colorScheme ?? 'light'].tint }
                ]}>
                  {friend.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noFriendsContainer}>
            <Text style={[styles.noFriendsText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              No friends yet. Tap + to add friends!
            </Text>
          </View>
        )}
      </View>

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <View style={[styles.friendRequestsSection, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          <Text style={[styles.friendRequestsTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
            Friend Requests ({friendRequests.length})
          </Text>
          <FlatList
            data={friendRequests}
            renderItem={renderFriendRequest}
            keyExtractor={(item) => item.id}
            style={styles.friendRequestsList}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Messages */}
      {selectedFriend && (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            inverted
            showsVerticalScrollIndicator={false}
          />

          {/* Input */}
          <View style={[styles.inputContainer, { borderTopColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <TextInput
              style={[
                styles.textInput,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].background,
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].tabIconDefault
                }
              ]}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={`Message ${selectedFriend.display_name}...`}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: Colors[colorScheme ?? 'light'].tint },
                (!messageText.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!messageText.trim() || sending}
            >
              <Text style={styles.sendButtonText}>
                {sending ? '...' : '→'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <TouchableOpacity
              onPress={() => {
                setSearchModalVisible(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Text style={[styles.modalCancelText, { color: Colors[colorScheme ?? 'light'].tint }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>Add Friends</Text>
            <View style={styles.modalHeaderPlaceholder} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].background,
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].tabIconDefault
                }
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by email..."
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
              onSubmitEditing={searchUsers}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={searchUsers}
              disabled={searching}
            >
              <Text style={styles.searchButtonText}>
                {searching ? '...' : 'Search'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            style={styles.searchResultsList}
            contentContainerStyle={styles.searchResultsContent}
          />
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  addFriendHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendHeaderButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  friendsSelector: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  friendsScrollContent: {
    paddingHorizontal: 16,
  },
  friendTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  friendTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noFriendsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noFriendsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sentBubble: {
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalHeaderPlaceholder: {
    width: 60,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultsContent: {
    padding: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  searchResultEmail: {
    fontSize: 14,
  },
  addFriendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addFriendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  friendRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  friendRequestInfo: {
    flex: 1,
  },
  friendRequestName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  friendRequestEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  friendRequestTime: {
    fontSize: 12,
  },
  friendRequestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  denyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  friendRequestsSection: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  friendRequestsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  friendRequestsList: {
    maxHeight: 200,
  },
});
