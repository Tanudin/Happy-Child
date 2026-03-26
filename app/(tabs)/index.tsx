import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ChildMenu from "../../components/ChildMenu";
import IOSAlert from "../../components/IOSAlert";
import { useIOSAlert } from "../../hooks/useIOSAlert";
import { supabase } from "../../lib/supabase";
import Activities from "../child/activities";
import Calendar from "../child/calendar";
import ChildSettings from "../child/child-settings";
import Economics from "../child/economics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
}

type CurrentView =
  | "home"
  | "childMenu"
  | "calendar"
  | "economics"
  | "settings"
  | "activities";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { showAlert, alertProps } = useIOSAlert();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildBirthdate, setNewChildBirthdate] = useState("");
  const [currentView, setCurrentView] = useState<CurrentView>("home");
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error("No user is currently logged in.");
      }
      const userId = userData.user.id;
      const { data, error } = await supabase
        .from("user_children")
        .select(
          `
          child_id,
          children (
            id,
            name,
            date_of_birth
          )
        `,
        )
        .eq("user_id", userId);
      if (error) {
        throw new Error(`Error fetching children: ${error.message}`);
      }

      const childrenData =
        data
          ?.map((item) => item.children)
          .filter((child) => child !== null)
          .flat() || [];
      return childrenData;
    },
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const addChildMutation = useMutation({
    mutationFn: async ({
      name,
      dateOfBirth,
    }: {
      name: string;
      dateOfBirth: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error("No user is currently logged in.");
      }

      const userId = userData.user.id;

      const { data: childData, error: childError } = await supabase
        .from("children")
        .insert([{ name, date_of_birth: dateOfBirth }])
        .select();

      if (childError) {
        throw new Error(`Failed to add child: ${childError.message}`);
      }

      const childId = childData[0].id;

      const { error: linkError } = await supabase
        .from("user_children")
        .insert([{ user_id: userId, child_id: childId }]);

      if (linkError) {
        await supabase.from("children").delete().eq("id", childId);
        throw new Error(`Failed to link child to user: ${linkError.message}`);
      }

      return childData[0];
    },
    onSuccess: (newChild) => {
      queryClient.setQueryData(["children"], (old: Child[] = []) => [
        ...old,
        newChild,
      ]);
      showAlert({
        message: `${newChild.name} added successfully!`,
        type: "success",
        duration: 3000,
      });
      setNewChildName("");
      setNewChildBirthdate("");
      setModalVisible(false);
    },
    onError: (error: Error) => {
      showAlert({
        message: error.message,
        type: "error",
      });
    },
  });

  const handleAddNewChild = () => {
    if (newChildName.trim()) {
      addChildMutation.mutate({
        name: newChildName.trim(),
        dateOfBirth: newChildBirthdate,
      });
    } else {
      showAlert({
        message: "Please enter a name for the child.",
        type: "warning",
      });
    }
  };

  // Updated to show child menu instead of calendar directly
  const handleChildPress = (child: Child) => {
    setSelectedChild(child);
    setCurrentView("childMenu");
  };

  // Navigation handlers for child menu
  const handleBackToHome = () => {
    setCurrentView("home");
    setSelectedChild(null);
  };

  const handleOpenCalendar = () => {
    setCurrentView("calendar");
  };

  const handleOpenEconomics = () => {
    setCurrentView("economics");
  };

  const handleOpenSettings = () => {
    setCurrentView("settings");
  };

  const handleOpenActivities = () => {
    setCurrentView("activities");
  };

  const handleCalendarConfirm = async (selectedDates: Date[]) => {
    if (!selectedChild) return;

    showAlert({
      message: `Calendar events saved for ${selectedChild.name}!`,
      type: "success",
    });
    setCurrentView("childMenu");
  };

  const handleCalendarCancel = () => {
    setCurrentView("childMenu");
  };

  const handleEconomicsBack = () => {
    setCurrentView("childMenu");
  };

  const handleSettingsBack = () => {
    setCurrentView("childMenu");
  };

  const handleActivitiesBack = () => {
    setCurrentView("childMenu");
  };

  const handleChildUpdated = () => {
    if (selectedChild) {
      queryClient.invalidateQueries({ queryKey: ["children"] });
    }
  };

  // Render different views based on current state
  if (currentView === "childMenu" && selectedChild) {
    return (
      <ChildMenu
        child={selectedChild}
        onBack={handleBackToHome}
        onCalendar={handleOpenCalendar}
        onEconomics={handleOpenEconomics}
        onSettings={handleOpenSettings}
        onActivities={handleOpenActivities}
      />
    );
  }

  if (currentView === "calendar" && selectedChild) {
    return (
      <Calendar
        childName={selectedChild.name}
        childId={selectedChild.id}
        onConfirm={handleCalendarConfirm}
        onCancel={handleCalendarCancel}
      />
    );
  }

  if (currentView === "economics" && selectedChild) {
    return (
      <Economics
        childName={selectedChild.name}
        childId={selectedChild.id}
        onBack={handleEconomicsBack}
      />
    );
  }

  if (currentView === "settings" && selectedChild) {
    return (
      <ChildSettings
        childName={selectedChild.name}
        childId={selectedChild.id}
        onBack={handleSettingsBack}
        onChildUpdated={handleChildUpdated}
      />
    );
  }

  if (currentView === "activities" && selectedChild) {
    return (
      <Activities
        childName={selectedChild.name}
        childId={selectedChild.id}
        onBack={handleActivitiesBack}
      />
    );
  }

  // Home view (default)
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.buttonContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text
              style={[
                styles.errorText,
                { color: Colors[colorScheme ?? "light"].text },
              ]}
            >
              Error loading children: {error.message}
            </Text>
            <TouchableOpacity
              style={[
                styles.retryButton,
                { backgroundColor: Colors[colorScheme ?? "light"].primary },
              ]}
              onPress={() =>
                queryClient.invalidateQueries({ queryKey: ["children"] })
              }
            >
              <Text
                style={[
                  styles.retryButtonText,
                  { color: Colors[colorScheme ?? "light"].buttonText },
                ]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={Colors[colorScheme ?? "light"].primary}
            />
            <Text
              style={[
                styles.loadingText,
                { color: Colors[colorScheme ?? "light"].textSecondary },
              ]}
            >
              Loading children...
            </Text>
          </View>
        ) : items.length > 0 ? (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.button,
                { backgroundColor: Colors[colorScheme ?? "light"].primary },
              ]}
              onPress={() => handleChildPress(item)}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: Colors[colorScheme ?? "light"].buttonText },
                ]}
              >
                {item.name || "Unknown Item"}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text
            style={[
              styles.noItemsText,
              { color: Colors[colorScheme ?? "light"].textSecondary },
            ]}
          >
            No children found. Add your first child to get started!
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.addButton,
            { borderColor: Colors[colorScheme ?? "light"].primary },
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Text
            style={[
              styles.addButtonText,
              { color: Colors[colorScheme ?? "light"].primary },
            ]}
          >
            Add Child
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: Colors[colorScheme ?? "light"].cardBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: Colors[colorScheme ?? "light"].text },
              ]}
            >
              Add New Child
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].inputBackground,
                  borderColor: Colors[colorScheme ?? "light"].border,
                  color: Colors[colorScheme ?? "light"].text,
                },
              ]}
              placeholder="Child's Name"
              placeholderTextColor={
                Colors[colorScheme ?? "light"].textSecondary
              }
              value={newChildName}
              onChangeText={setNewChildName}
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].inputBackground,
                  borderColor: Colors[colorScheme ?? "light"].border,
                  color: Colors[colorScheme ?? "light"].text,
                },
              ]}
              placeholder="Child's Birthdate (YYYY-MM-DD)"
              placeholderTextColor={
                Colors[colorScheme ?? "light"].textSecondary
              }
              value={newChildBirthdate}
              onChangeText={setNewChildBirthdate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].textSecondary,
                  },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: Colors[colorScheme ?? "light"].cardBackground },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].primary,
                    opacity: addChildMutation.isPending ? 0.7 : 1,
                  },
                ]}
                onPress={handleAddNewChild}
                disabled={addChildMutation.isPending}
              >
                {addChildMutation.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors[colorScheme ?? "light"].buttonText}
                  />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonText,
                      { color: Colors[colorScheme ?? "light"].buttonText },
                    ]}
                  >
                    Add
                  </Text>
                )}
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
    alignItems: "center",
    padding: 20,
    paddingTop: 60, // Add top padding to account for removed header
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
  },
  addButton: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
    borderWidth: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  noItemsText: {
    fontSize: 16,
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
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
    fontWeight: "bold",
  },
  errorContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
