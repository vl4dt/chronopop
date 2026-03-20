/**
 * NotificationService.ts
 * 
 * Handles requesting permissions and scheduling/cancelling native local
 * notifications via expo-notifications. These fire even when the app is
 * in the background or fully killed on both iOS and Android (with a
 * custom development build -- they are mocked in Expo Go).
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Global handler (call once at app startup) ────────────────────────────────
export const configureNotifications = () => {
  // How to present notifications when the app IS in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // On iOS, this makes it show as a banner even when the app is open
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

// ─── Permission request ───────────────────────────────────────────────────────
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: true, // Lets alarms bypass Do Not Disturb
    },
  });
  return status === 'granted';
};

// ─── Schedule a single alarm notification ────────────────────────────────────
export interface AlarmScheduleOptions {
  id: string;         // Your own identifier (stored in data payload)
  title: string;
  body: string;
  fireDate: Date;     // Exact Date when the alarm should ring
  repeatsDaily?: boolean;
  soundName?: string; // Optional custom sound (must be in app bundle)
}

export const scheduleAlarmNotification = async (opts: AlarmScheduleOptions): Promise<string | null> => {
  const granted = await requestNotificationPermissions();
  if (!granted) {
    console.warn('[NotificationService] Permission not granted – alarm not scheduled');
    return null;
  }

  // Cancel any existing notification for this alarm id first
  await cancelAlarmNotification(opts.id);

  const trigger: Notifications.NotificationTriggerInput = opts.repeatsDaily
    ? {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: opts.fireDate.getHours(),
        minute: opts.fireDate.getMinutes(),
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: opts.fireDate,
      };

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      sound: opts.soundName ?? 'alarm.mp3',
      // Passes back your alarm id so you can handle dismissal
      data: { alarmId: opts.id },
      // iOS: show even when app is in foreground
      interruptionLevel: 'timeSensitive',
      // Android-specific channel
      categoryIdentifier: 'alarm',
    },
    trigger,
  });

  return notifId;
};

// ─── Cancel a scheduled notification by your alarm id ────────────────────────
// We store the mapping of alarmId → notifId in a simple in-memory map
// (you can persist this to AsyncStorage for durability across restarts).
const notifIdMap: Record<string, string> = {};

export const cancelAlarmNotification = async (alarmId: string): Promise<void> => {
  const notifId = notifIdMap[alarmId];
  if (notifId) {
    await Notifications.cancelScheduledNotificationAsync(notifId);
    delete notifIdMap[alarmId];
  }
};

export const cancelAllAlarmNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  Object.keys(notifIdMap).forEach(k => delete notifIdMap[k]);
};

// ─── Register the notifId returned by scheduleAlarmNotification ───────────────
export const registerNotifId = (alarmId: string, notifId: string) => {
  notifIdMap[alarmId] = notifId;
};

// ─── Android notification channel (call once at startup) ─────────────────────
export const setupAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('alarm', {
    name: 'Alarms',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'alarm.mp3',
    vibrationPattern: [0, 500, 200, 500],
    enableVibrate: true,
    bypassDnd: true, // Bypasses Do Not Disturb on Android
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};
