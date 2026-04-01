import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const EVENT_ALERTS_STORAGE_KEY = "@calendar_event_alerts_v1";

type EventAlertMap = Record<
  string,
  {
    notificationId: string;
    minutesBefore: number;
  }
>;

export type EventAlertOption = {
  label: string;
  minutesBefore: number | null;
};

export const EVENT_ALERT_OPTIONS: EventAlertOption[] = [
  { label: "None", minutesBefore: null },
  { label: "At time of event", minutesBefore: 0 },
  { label: "5 minutes before", minutesBefore: 5 },
  { label: "10 minutes before", minutesBefore: 10 },
  { label: "15 minutes before", minutesBefore: 15 },
  { label: "30 minutes before", minutesBefore: 30 },
  { label: "1 hour before", minutesBefore: 60 },
  { label: "2 hours before", minutesBefore: 120 },
  { label: "1 day before", minutesBefore: 1440 },
  { label: "2 days before", minutesBefore: 2880 },
  { label: "1 week before", minutesBefore: 10080 },
];

let didInitNotificationConfig = false;

const loadEventAlertMap = async (): Promise<EventAlertMap> => {
  try {
    const stored = await AsyncStorage.getItem(EVENT_ALERTS_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as EventAlertMap;
  } catch {
    return {};
  }
};

const saveEventAlertMap = async (map: EventAlertMap) => {
  try {
    await AsyncStorage.setItem(EVENT_ALERTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Best-effort persistence; scheduling still works even if storage write fails.
  }
};

const ensureNotificationPermission = async () => {
  if (Platform.OS === "web") return false;

  if (!didInitNotificationConfig) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("event-alerts", {
        name: "Event alerts",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    didInitNotificationConfig = true;
  }

  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
};

export const getEventAlertPreference = async (eventId: string) => {
  if (!eventId) return null;
  const map = await loadEventAlertMap();
  return map[eventId]?.minutesBefore ?? null;
};

export const cancelEventAlert = async (eventId: string) => {
  if (!eventId || Platform.OS === "web") return;

  const map = await loadEventAlertMap();
  const existing = map[eventId];
  if (existing?.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        existing.notificationId,
      );
    } catch {
      // Notification might already have fired or been removed.
    }
  }

  delete map[eventId];
  await saveEventAlertMap(map);
};

export const scheduleEventAlert = async ({
  eventId,
  title,
  startTimeISO,
  childName,
  minutesBefore,
}: {
  eventId: string;
  title: string;
  startTimeISO: string;
  childName: string;
  minutesBefore: number | null;
}) => {
  if (!eventId) return;

  if (minutesBefore === null) {
    await cancelEventAlert(eventId);
    return;
  }

  if (!(await ensureNotificationPermission())) return;

  const eventStartMs = new Date(startTimeISO).getTime();
  if (Number.isNaN(eventStartMs)) return;

  const triggerMs = eventStartMs - minutesBefore * 60 * 1000;
  if (triggerMs <= Date.now()) {
    await cancelEventAlert(eventId);
    return;
  }

  const map = await loadEventAlertMap();
  const existing = map[eventId];
  if (existing?.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        existing.notificationId,
      );
    } catch {
      // Notification might already have fired or been removed.
    }
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Upcoming event for ${childName}`,
      body: title,
      sound: true,
      data: { eventId, startTimeISO },
    },
    trigger: {
      ...(Platform.OS === "android" ? { channelId: "event-alerts" } : {}),
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(triggerMs),
    } as Notifications.DateTriggerInput,
  });

  map[eventId] = { notificationId, minutesBefore };
  await saveEventAlertMap(map);
};

export const rescheduleEventAlertFromPreference = async ({
  eventId,
  title,
  startTimeISO,
  childName,
}: {
  eventId: string;
  title: string;
  startTimeISO: string;
  childName: string;
}) => {
  if (!eventId) return;
  const map = await loadEventAlertMap();
  const preference = map[eventId];
  if (!preference) return;

  await scheduleEventAlert({
    eventId,
    title,
    startTimeISO,
    childName,
    minutesBefore: preference.minutesBefore,
  });
};
