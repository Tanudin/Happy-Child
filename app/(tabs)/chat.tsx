import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Friend {
  friendship_id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  status: string;
  created_at: string;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
}

interface FriendRequest {
  friendship_id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

interface SearchResult {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

export default function FriendshipsScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadCurrentUserAndFriends();
    
    // Set up real-time subscription for friendship changes
    const friendshipSubscription = supabase
      .channel('friendships_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          if (currentUser) {
            loadFriends(currentUser.id);
            loadFriendRequests(currentUser.id);
            loadSentRequests(currentUser.id);
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for message changes
    const messageSubscription = supabase
      .channel('messages_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          if (currentUser) {
            loadFriends(currentUser.id);
          }
        }
      )
      .subscribe();

    return () => {
      friendshipSubscription.unsubscribe();
      messageSubscription.unsubscribe();
    };
  }, []);

  const loadCurrentUserAndFriends = async () => {
    try {
      setLoading(true);
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        console.error('Error fetching user:', userError);
        return;
      }
      
      setCurrentUser(userData.user);
      
      await Promise.all([
        loadFriends(userData.user.id),
        loadFriendRequests(userData.user.id),
        loadSentRequests(userData.user.id)
      ]);
    } catch (error) {
      console.error('Error loading user and friends:', error);
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!currentUser) return;
    
    setRefreshing(true);
    await Promise.all([
      loadFriends(currentUser.id),
      loadFriendRequests(currentUser.id),
      loadSentRequests(currentUser.id)
    ]);
    setRefreshing(false);
  };

  const loadFriends = async (userId: string) => {
    try {
      // Get accepted friendships where current user is either user_id or friend_id
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at
        `)
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      // Get profile data for each friend and their message info
      const friendsData: Friend[] = [];
      
      for (const friendship of data || []) {
        const friendUserId = friendship.user_id === userId 
          ? friendship.friend_id 
          : friendship.user_id;

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, email, avatar_url')
          .eq('user_id', friendUserId)
          .single();

        if (profileData) {
          // Get unread message count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', friendUserId)
            .eq('receiver_id', userId)
            .eq('read', false);

          // Get last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at')
            .or(
              `and(sender_id.eq.${userId},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${userId})`
            )
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          friendsData.push({
            friendship_id: friendship.id,
            user_id: profileData.user_id,
            display_name: profileData.display_name,
            email: profileData.email,
            avatar_url: profileData.avatar_url,
            status: friendship.status,
            created_at: friendship.created_at,
            unread_count: unreadCount || 0,
            last_message: lastMessageData?.content,
            last_message_time: lastMessageData?.created_at,
          });
        }
      }

      // Sort by last message time (most recent first)
      friendsData.sort((a, b) => {
        if (!a.last_message_time && !b.last_message_time) return 0;
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async (userId: string) => {
    try {
      // Get pending friendships where current user is the friend_id (recipient)
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, created_at')
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error loading friend requests:', error);
        return;
      }

      // Get profile data for each requester
      const requestsData: FriendRequest[] = [];
      
      for (const request of data || []) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, email, avatar_url')
          .eq('user_id', request.user_id)
          .single();

        if (profileData) {
          requestsData.push({
            friendship_id: request.id,
            user_id: profileData.user_id,
            display_name: profileData.display_name,
            email: profileData.email,
            avatar_url: profileData.avatar_url,
            created_at: request.created_at
          });
        }
      }

      setFriendRequests(requestsData);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const loadSentRequests = async (userId: string) => {
    try {
      // Get pending friendships where current user is the user_id (sender)
      const { data, error } = await supabase
        .from('friendships')
        .select('id, friend_id, created_at')
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error loading sent requests:', error);
        return;
      }

      // Get profile data for each recipient
      const sentData: FriendRequest[] = [];
      
      for (const request of data || []) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, email, avatar_url')
          .eq('user_id', request.friend_id)
          .single();

        if (profileData) {
          sentData.push({
            friendship_id: request.id,
            user_id: profileData.user_id,
            display_name: profileData.display_name,
            email: profileData.email,
            avatar_url: profileData.avatar_url,
            created_at: request.created_at
          });
        }
      }

      setSentRequests(sentData);
    } catch (error) {
      console.error('Error loading sent requests:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // Search for users by email
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, email, avatar_url')
        .ilike('email', `%${searchQuery.trim()}%`)
        .neq('user_id', currentUser.id) // Exclude current user
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        Alert.alert('Error', 'Failed to search users');
        return;
      }

      setSearchResults(data || []);

      if (!data || data.length === 0) {
        Alert.alert('No Results', 'No users found with that email');
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
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUser.id})`)
        .single();

      if (existing) {
        Alert.alert('Info', `You already have a ${existing.status} friendship with this user`);
        return;
      }

      // Create new friendship
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUser.id,
          friend_id: targetUserId,
          status: 'pending'
        });

      if (error) {
        console.error('Error sending friend request:', error);
        Alert.alert('Error', 'Failed to send friend request');
        return;
      }

      Alert.alert('Success', 'Friend request sent!');
      setSearchModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // Reload sent requests
      await loadSentRequests(currentUser.id);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) {
        console.error('Error accepting friend request:', error);
        Alert.alert('Error', 'Failed to accept friend request');
        return;
      }

      Alert.alert('Success', 'Friend request accepted!');
      
      if (currentUser) {
        await Promise.all([
          loadFriends(currentUser.id),
          loadFriendRequests(currentUser.id)
        ]);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const denyFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        console.error('Error denying friend request:', error);
        Alert.alert('Error', 'Failed to deny friend request');
        return;
      }

      if (currentUser) {
        await loadFriendRequests(currentUser.id);
      }
    } catch (error) {
      console.error('Error denying friend request:', error);
      Alert.alert('Error', 'Failed to deny friend request');
    }
  };

  const cancelSentRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        console.error('Error canceling friend request:', error);
        Alert.alert('Error', 'Failed to cancel friend request');
        return;
      }

      if (currentUser) {
        await loadSentRequests(currentUser.id);
      }
    } catch (error) {
      console.error('Error canceling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request');
    }
  };

  const removeFriend = async (friendshipId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('friendships')
                .delete()
                .eq('id', friendshipId);

              if (error) {
                console.error('Error removing friend:', error);
                Alert.alert('Error', 'Failed to remove friend');
                return;
              }

              if (currentUser) {
                await loadFriends(currentUser.id);
              }
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          }
        }
      ]
    );
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity 
      style={[styles.friendItem, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
      onPress={() => router.push({
        pathname: '/chat/[friendId]',
        params: { friendId: item.user_id, friendName: item.display_name }
      })}
    >
      <View style={styles.friendInfo}>
        <View style={styles.friendHeader}>
          <Text style={[styles.friendName, { color: Colors[colorScheme ?? 'light'].text }]}>
            {item.display_name}
          </Text>
          {item.unread_count !== undefined && item.unread_count > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
              <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
        {item.last_message ? (
          <Text 
            style={[styles.lastMessage, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}
            numberOfLines={1}
          >
            {item.last_message}
          </Text>
        ) : (
          <Text style={[styles.noMessages, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            No messages yet - Tap to chat!
          </Text>
        )}
        {item.last_message_time && (
          <Text style={[styles.messageTime, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            {new Date(item.last_message_time).toLocaleString()}
          </Text>
        )}
      </View>
      <Text style={[styles.chevron, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>›</Text>
    </TouchableOpacity>
  );

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.requestItem, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
      <View style={styles.requestInfo}>
        <Text style={[styles.requestName, { color: Colors[colorScheme ?? 'light'].text }]}>
          {item.display_name}
        </Text>
        <Text style={[styles.requestEmail, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {item.email}
        </Text>
        <Text style={[styles.requestTime, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={[styles.acceptButton, { backgroundColor: '#22c55e' }]}
          onPress={() => acceptFriendRequest(item.friendship_id)}
        >
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.denyButton, { backgroundColor: '#ef4444' }]}
          onPress={() => denyFriendRequest(item.friendship_id)}
        >
          <Text style={styles.actionButtonText}>Deny</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequest = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.requestItem, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
      <View style={styles.requestInfo}>
        <Text style={[styles.requestName, { color: Colors[colorScheme ?? 'light'].text }]}>
          {item.display_name}
        </Text>
        <Text style={[styles.requestEmail, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {item.email}
        </Text>
        <Text style={[styles.requestTime, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          Sent {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.cancelButton, { backgroundColor: '#6b7280' }]}
        onPress={() => cancelSentRequest(item.friendship_id)}
      >
        <Text style={styles.actionButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={[styles.searchResultItem, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
      onPress={() => sendFriendRequest(item.user_id)}
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
        style={[styles.addButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
        onPress={() => sendFriendRequest(item.user_id)}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <View style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
          <Text style={styles.headerTitle}>Friends</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ color: Colors[colorScheme ?? 'light'].text }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity 
          style={styles.addFriendButton}
          onPress={() => setSearchModalVisible(true)}
        >
          <Text style={styles.addFriendButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {/* Friend Requests Section */}
            {friendRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                  Friend Requests ({friendRequests.length})
                </Text>
                {friendRequests.map(request => (
                  <View key={request.friendship_id}>
                    {renderFriendRequest({ item: request })}
                  </View>
                ))}
              </View>
            )}

            {/* Sent Requests Section */}
            {sentRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                  Sent Requests ({sentRequests.length})
                </Text>
                {sentRequests.map(request => (
                  <View key={request.friendship_id}>
                    {renderSentRequest({ item: request })}
                  </View>
                ))}
              </View>
            )}

            {/* Friends Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                Conversations ({friends.length})
              </Text>
              {friends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                    No friends yet. Tap + to add friends and start chatting!
                  </Text>
                </View>
              ) : (
                friends.map(friend => (
                  <View key={friend.friendship_id}>
                    {renderFriend({ item: friend })}
                  </View>
                ))
              )}
            </View>
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors[colorScheme ?? 'light'].tint}
          />
        }
      />

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
            keyExtractor={(item) => item.user_id}
            style={styles.searchResultsList}
            contentContainerStyle={styles.searchResultsContent}
          />
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
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  addFriendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  friendInfo: {
    flex: 1,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  noMessages: {
    fontSize: 14,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 24,
    marginLeft: 8,
  },
  friendEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  friendSince: {
    fontSize: 12,
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  requestEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
  },
  requestActions: {
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
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
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
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
