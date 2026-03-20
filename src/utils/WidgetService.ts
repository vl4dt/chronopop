import { Platform } from 'react-native';

// ─── Live Activity for Pomodoro ─────────────────────────────────────────────
export interface PomodoroProps {
  endTime: number; // Date as timestamp
  isPaused: boolean;
  sessionType: 'Work' | 'Break';
}

// The name "PomodoroLiveActivity" must match the Swift widget class name
let pomoActivity: any = null;
let pomoFactory: any = null;

if (Platform.OS === 'ios') {
  try {
    const { LiveActivityFactory } = require('expo-widgets');
    pomoFactory = new LiveActivityFactory('PomodoroLiveActivity', 'PomodoroLiveActivity');
  } catch (e) {
    console.warn('[WidgetService] expo-widgets not available', e);
  }
}

export const startPomodoroActivity = async (endTime: Date, type: 'Work' | 'Break') => {
  if (Platform.OS !== 'ios' || !pomoFactory) return;
  
  try {
    // If one is already running, end it first
    if (pomoActivity) {
      await pomoActivity.end();
    }
    
    pomoActivity = await pomoFactory.start({
      endTime: endTime.getTime(),
      isPaused: false,
      sessionType: type
    });
  } catch (e) {
    console.warn('[WidgetService] Failed to start Live Activity', e);
  }
};

export const updatePomodoroActivity = async (isPaused: boolean, type?: 'Work' | 'Break', newEndTime?: Date) => {
  if (!pomoActivity) return;
  try {
    await pomoActivity.update({
      isPaused,
      sessionType: type ?? 'Work',
      endTime: newEndTime?.getTime() ?? Date.now()
    });
  } catch (e) {
    console.warn('[WidgetService] Failed to update Live Activity', e);
  }
};

export const endPomodoroActivity = async () => {
  if (!pomoActivity) return;
  try {
    await pomoActivity.end();
    pomoActivity = null;
  } catch (e) {
    console.warn('[WidgetService] Failed to end Live Activity', e);
  }
};

// ─── Static Widget for Routines ──────────────────────────────────────────────
// In Expo 55, widgets are often updated via snapshots
export const updateRoutinesWidget = async (nextTitle: string, nextTime: string, remainingCount: number) => {
  if (Platform.OS !== 'ios') return;
  
  // expo-widgets provides a way to update snapshots of static widgets
  // We'll use the name from our Swift file: "RoutinesWidget"
  try {
    // Note: The specific API to update a static widget snapshot in 55.x 
    // depends on the native bridge.
    console.log('[WidgetService] Updating Routines Widget:', { nextTitle, nextTime, remainingCount });
  } catch (e) {
    console.warn('[WidgetService] Failed to update widget', e);
  }
};
