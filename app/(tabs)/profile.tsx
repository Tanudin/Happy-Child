import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  findNodeHandle,
  Image,
  Keyboard,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "../../lib/userProfileService";

interface UserProfile {
  display_name: string | null;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  age: number;
  phone_number: string | null;
  avatar_url: string | null;
  is_searchable: boolean;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const scrollOffsetRef = React.useRef(0);
  const pendingFocusNodeRef = React.useRef<number | null>(null);

  const getAvatarFileExtension = (asset: ImagePicker.ImagePickerAsset) => {
    const extensionFromName = asset.fileName?.split(".").pop()?.toLowerCase();
    if (extensionFromName) {
      return extensionFromName;
    }

    const extensionFromMime = asset.mimeType?.split("/").pop()?.toLowerCase();
    if (extensionFromMime) {
      return extensionFromMime;
    }

    return "jpg";
  };

  const scrollNodeToTarget = (nodeHandle: number) => {
    const windowHeight = Dimensions.get("window").height;
    const keyboardTop =
      keyboardHeight > 0 ? windowHeight - keyboardHeight : windowHeight;
    const targetY = Math.min(windowHeight * 0.34, keyboardTop * 0.52);

    UIManager.measure(nodeHandle, (_x, _y, _width, _height, _px, py) => {
      const delta = py - targetY;
      if (delta > 4) {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, scrollOffsetRef.current + delta),
          animated: true,
        });
      }
    });
  };

  const handleInputFocus = (
    event: NativeSyntheticEvent<TextInputFocusEventData>,
  ) => {
    const nodeHandle = findNodeHandle(event.target);
    if (!nodeHandle) {
      return;
    }

    if (keyboardHeight > 0) {
      setTimeout(() => scrollNodeToTarget(nodeHandle), 20);
      return;
    }

    pendingFocusNodeRef.current = nodeHandle;
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const nextHeight = Math.max(0, event.endCoordinates.height);
      setKeyboardHeight(nextHeight);
      if (pendingFocusNodeRef.current) {
        const nodeHandle = pendingFocusNodeRef.current;
        pendingFocusNodeRef.current = null;
        setTimeout(() => scrollNodeToTarget(nodeHandle), 20);
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      pendingFocusNodeRef.current = null;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData?.user?.email) {
      Alert.alert("Error", "Failed to get user information.");
      setLoading(false);
      return;
    }

    // Fetch actual profile data from user_profiles table
    const { data: profileData, error: profileError } =
      await getCurrentUserProfile();

    if (profileError || !profileData) {
      Alert.alert("Error", "Failed to load profile data.");
      setLoading(false);
      return;
    }

    setProfile(profileData);
    setLoading(false);
  };

  const handleSettingsPress = () => {
    router.push("/settings");
  };

  const handlePickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Allow photo library access to update your profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const selectedAsset = result.assets[0];
    if (!selectedAsset.uri) {
      Alert.alert("Error", "Could not read selected image.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError || new Error("No user session found.");
      }

      const response = await fetch(selectedAsset.uri);
      const fileBody = await response.arrayBuffer();
      const fileExtension = getAvatarFileExtension(selectedAsset);
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, fileBody, {
          contentType: selectedAsset.mimeType || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Could not generate profile image URL.");
      }

      const { data: updatedProfile, error: updateError } =
        await updateCurrentUserProfile({
          avatar_url: publicUrlData.publicUrl,
        });

      if (updateError || !updatedProfile) {
        throw updateError || new Error("Failed to save profile image.");
      }

      setProfile(updatedProfile);
      setEditedProfile(updatedProfile);
      Alert.alert("Success", "Profile picture updated.");
    } catch (error) {
      console.error("Error updating profile picture:", error);
      Alert.alert(
        "Error",
        "Failed to update profile picture. Make sure your 'avatars' bucket exists in Supabase Storage.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleEditPress = async () => {
    if (editMode && editedProfile) {
      // Save changes to database
      setLoading(true);
      const { data, error } = await updateCurrentUserProfile({
        display_name: editedProfile.display_name,
        first_name: editedProfile.first_name,
        last_name: editedProfile.last_name,
        phone_number: editedProfile.phone_number,
      });

      setLoading(false);

      if (error) {
        Alert.alert("Error", "Failed to update profile. Please try again.");
        return;
      }

      if (data) {
        setProfile(data);
        Alert.alert("Success", "Profile updated successfully!");
      }
    } else if (profile) {
      setEditedProfile(profile);
    }
    setEditMode(!editMode);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>No profile data found</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={handleSettingsPress}
      >
        <Ionicons
          name="settings"
          size={24}
          color={Colors[colorScheme ?? "light"].text}
        />
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: Colors[colorScheme ?? "light"].text },
              ]}
            >
              My Profile
            </Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={
                  (editMode ? editedProfile?.avatar_url : profile.avatar_url)
                    ? {
                        uri: editMode
                          ? editedProfile?.avatar_url || undefined
                          : profile.avatar_url || undefined,
                      }
                    : require("../../assets/images/mother_placeholder.jpg")
                }
                style={styles.avatar}
              />
              {editMode && (
                <TouchableOpacity
                  style={[
                    styles.avatarEditButton,
                    uploadingAvatar && styles.avatarEditButtonDisabled,
                  ]}
                  onPress={handlePickProfileImage}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={[
                styles.displayName,
                { color: Colors[colorScheme ?? "light"].text },
              ]}
            >
              {profile.display_name ||
                `${profile.first_name} ${profile.last_name}`}
            </Text>
            <Text
              style={[
                styles.lastSeen,
                { color: Colors[colorScheme ?? "light"].text },
              ]}
            >
              {profile.email}
            </Text>
          </View>

          {/* Profile Information */}
          <View style={styles.infoSection}>
            <Text
              style={[
                styles.sectionTitle,
                { color: Colors[colorScheme ?? "light"].text },
              ]}
            >
              Personal Information
            </Text>

            {/* Display Name */}
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.label,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                Display Name
              </Text>
              {editMode && editedProfile ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: Colors[colorScheme ?? "light"].text,
                      borderColor: Colors[colorScheme ?? "light"].text,
                    },
                  ]}
                  value={editedProfile.display_name || ""}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, display_name: text })
                  }
                  onFocus={handleInputFocus}
                  placeholder="Enter display name"
                />
              ) : (
                <Text
                  style={[
                    styles.value,
                    { color: Colors[colorScheme ?? "light"].text },
                  ]}
                >
                  {profile.display_name}
                </Text>
              )}
            </View>

            {/* First Name */}
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.label,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                First Name
              </Text>
              {editMode && editedProfile ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: Colors[colorScheme ?? "light"].text,
                      borderColor: Colors[colorScheme ?? "light"].text,
                    },
                  ]}
                  value={editedProfile.first_name}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, first_name: text })
                  }
                  onFocus={handleInputFocus}
                  placeholder="Enter first name"
                />
              ) : (
                <Text
                  style={[
                    styles.value,
                    { color: Colors[colorScheme ?? "light"].text },
                  ]}
                >
                  {profile.first_name}
                </Text>
              )}
            </View>

            {/* Last Name */}
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.label,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                Last Name
              </Text>
              {editMode && editedProfile ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: Colors[colorScheme ?? "light"].text,
                      borderColor: Colors[colorScheme ?? "light"].text,
                    },
                  ]}
                  value={editedProfile.last_name}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, last_name: text })
                  }
                  onFocus={handleInputFocus}
                  placeholder="Enter last name"
                />
              ) : (
                <Text
                  style={[
                    styles.value,
                    { color: Colors[colorScheme ?? "light"].text },
                  ]}
                >
                  {profile.last_name}
                </Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.label,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                Email
              </Text>
              <Text
                style={[
                  styles.value,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {profile.email}
              </Text>
              <Text
                style={[
                  styles.note,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                Email cannot be changed here
              </Text>
            </View>

            {/* Phone Number */}
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.label,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                Phone Number
              </Text>
              {editMode && editedProfile ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: Colors[colorScheme ?? "light"].text,
                      borderColor: Colors[colorScheme ?? "light"].text,
                    },
                  ]}
                  value={editedProfile.phone_number || ""}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, phone_number: text })
                  }
                  onFocus={handleInputFocus}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text
                  style={[
                    styles.value,
                    { color: Colors[colorScheme ?? "light"].text },
                  ]}
                >
                  {profile.phone_number || "Not provided"}
                </Text>
              )}
            </View>

            {/* Birth Date */}
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.label,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                Birth Date
              </Text>
              <Text
                style={[
                  styles.value,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                {formatDate(profile.birth_date)}
              </Text>
              <Text
                style={[
                  styles.note,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
              >
                Age: {profile.age} years old
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.editButton,
                {
                  backgroundColor: editMode
                    ? "#4CAF50"
                    : Colors[colorScheme ?? "light"].primary,
                },
              ]}
              onPress={handleEditPress}
            >
              <Ionicons
                name={editMode ? "checkmark" : "pencil"}
                size={20}
                color="#fff"
              />
              <Text style={styles.editButtonText}>
                {editMode ? "Save Changes" : "Edit Profile"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsButton: {
    position: "absolute",
    top: 50,
    right: 24,
    padding: 8,
    borderRadius: 20,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 12,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarEditButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#007AFF",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarEditButtonDisabled: {
    opacity: 0.7,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  lastSeen: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
  infoSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: "italic",
  },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  actionSection: {
    gap: 16,
    paddingTop: 16,
  },
});
